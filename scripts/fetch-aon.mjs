/**
 * Fetch creatures from AoN Elasticsearch and save to bundled JSON
 */
import { readFileSync, writeFileSync } from 'fs';

// Import the adapter (we'll inline the logic since ESM imports are tricky)
function normalizeSize(size) {
  const sizeStr = (Array.isArray(size) ? size[0] : size || 'medium').toString().toLowerCase();
  const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
  return validSizes.includes(sizeStr) ? sizeStr : 'medium';
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}

function ensureSkills(value) {
  if (!value || typeof value !== 'object') return {};
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'number') result[key] = val;
  }
  return result;
}

function fixDiceNotation(damage) {
  return damage.replace(/(\d+d)(100|20|12|10|8|6|4)(\d+)/g, (match, prefix, die, modifier) => {
    const mod = parseInt(modifier, 10);
    if (mod > 0 && mod < 100) {
      return `${prefix}${die}+${modifier}`;
    }
    return match;
  });
}

function parseActions(actionStr) {
  if (actionStr.includes('Three') || actionStr.includes('3')) return 3;
  if (actionStr.includes('Two') || actionStr.includes('2')) return 2;
  return 1;
}

function extractTraits(traitStr) {
  const traits = [];
  const linkMatches = traitStr.match(/\[([^\]]+)\]\([^)]+\)/g);
  if (linkMatches) {
    for (const m of linkMatches) {
      const match = m.match(/\[([^\]]+)\]/);
      if (match) {
        const trait = match[1].toLowerCase();
        if (!trait.includes('feet') && !trait.includes('reach')) {
          traits.push(trait);
        }
      }
    }
  }
  if (traits.length === 0) {
    const parts = traitStr.split(',').map(s => s.trim().toLowerCase());
    for (const part of parts) {
      if (part && !part.includes('feet') && !part.includes('reach') && !part.includes('range')) {
        traits.push(part);
      }
    }
  }
  return traits;
}

function parseAttacksFromMarkdown(markdown) {
  const attacks = [];
  if (!markdown) return attacks;

  const lines = markdown.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('**Melee**') || line.includes('**Ranged**')) {
      const attackType = line.includes('**Ranged**') ? 'ranged' : 'melee';
      i++;
      if (i >= lines.length) break;

      let actionsLine = lines[i];
      let actions = 1;

      const actionMatch = actionsLine.match(/<actions string="([^"]+)"/);
      if (actionMatch) {
        actions = parseActions(actionMatch[1]);
        i++;
        if (i >= lines.length) break;
      }

      let attackLine = lines[i];
      if (!attackLine.match(/\+?\d+/) && actionsLine.match(/\+?\d+/)) {
        attackLine = actionsLine;
      }

      const attackMatch = attackLine.match(/^([a-zA-Z][a-zA-Z\s'-]*?)\s*\+?(\d+)/);
      if (!attackMatch) {
        i++;
        continue;
      }

      const attackName = attackMatch[1].trim();
      const bonus = parseInt(attackMatch[2], 10);

      const traitsMatch = attackLine.match(/\((\[[^\]]+\]\([^)]+\)(?:,\s*\[[^\]]+\]\([^)]+\))*)\)/);
      const traits = traitsMatch ? extractTraits(traitsMatch[1]) : [];

      let range;
      const rangeMatch = attackLine.match(/range(?:\s+increment)?\s+(\d+\s*feet)/i);
      if (rangeMatch) {
        range = rangeMatch[1];
      }

      i++;
      let damage = '';

      while (i < lines.length) {
        const damageLine = lines[i];

        if (damageLine.includes('**Damage**')) {
          const damageMatch = damageLine.match(/\*\*Damage\*\*\s*(.+)/);
          if (damageMatch) {
            damage = fixDiceNotation(
              damageMatch[1]
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/\*\*/g, '')
                .trim()
            );
          }
          i++;
          break;
        }

        if (damageLine.match(/^\d+d\d+/)) {
          damage = fixDiceNotation(
            damageLine
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/\*\*/g, '')
              .trim()
          );
          i++;
          break;
        }

        if (damageLine.match(/^\*\*[A-Z]/)) {
          break;
        }
        i++;
      }

      if (attackName && bonus) {
        const attack = {
          name: attackName.charAt(0).toUpperCase() + attackName.slice(1),
          type: attackType,
          bonus,
          damage: damage || '1d6',
          traits,
          actions,
          range
        };

        const isDupe = attacks.some(a =>
          a.name === attack.name &&
          a.type === attack.type &&
          a.bonus === attack.bonus &&
          a.damage === attack.damage
        );
        if (!isDupe) {
          attacks.push(attack);
        }
      }
    } else {
      i++;
    }
  }

  return attacks;
}

function parseAbilityName(rawName) {
  let name = rawName.trim();
  let actions;

  const actionMatch = name.match(/\{\{(reaction|free|1|2|3)\}\}/i);
  if (actionMatch) {
    const actionStr = actionMatch[1].toLowerCase();
    if (actionStr === 'reaction') actions = 'reaction';
    else if (actionStr === 'free') actions = 'free';
    else if (actionStr === '1') actions = 1;
    else if (actionStr === '2') actions = 2;
    else if (actionStr === '3') actions = 3;
    name = name.replace(/\s*\{\{(reaction|free|1|2|3)\}\}\s*/gi, '').trim();
  }

  return { name, actions };
}

function filterAbilityNames(names) {
  return names.filter(name => {
    if (/\+\d+$/.test(name.trim())) return false;
    if (/\s+\d+$/.test(name.trim())) return false;
    return true;
  });
}

function parseAbilitiesFromMarkdown(markdown, abilityNames, creatureName) {
  const abilities = [];
  if (!markdown || !abilityNames.length) return abilities;

  for (const rawName of abilityNames) {
    let { name: parsedName, actions: nameActions } = parseAbilityName(rawName);

    const searchName = parsedName;
    let displayName = parsedName;
    if (creatureName && parsedName.endsWith(creatureName)) {
      displayName = parsedName.slice(0, -creatureName.length).trim();
    }

    const regex = new RegExp(
      `(?:\\*\\*)?${searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*\\s*(?:<actions string="([^"]+)"[^>]*>)?\\s*(?:\\([^)]+\\))?\\s*(.+?)(?=\\r?\\n\\r?\\n|\\r?\\n---|\\r?\\n<|$)`,
      'is'
    );
    const match = markdown.match(regex);

    let actions = nameActions;
    let description = '';

    if (match) {
      if (match[1]) {
        const actionStr = match[1].toLowerCase();
        if (actionStr.includes('reaction')) actions = 'reaction';
        else if (actionStr.includes('free')) actions = 'free';
        else if (actionStr.includes('three') || actionStr.includes('3')) actions = 3;
        else if (actionStr.includes('two') || actionStr.includes('2')) actions = 2;
        else if (actionStr.includes('single') || actionStr.includes('1')) actions = 1;
      }
      description = (match[2] || '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    }

    abilities.push({
      name: displayName,
      actions,
      description
    });
  }

  return abilities;
}

function adaptAoNCreature(hit) {
  const src = hit._source;
  const markdown = (src.markdown || src.text || '');
  const abilityNames = filterAbilityNames(ensureArray(src.creature_ability));
  const creatureName = src.name || 'Unknown Creature';

  return {
    id: `aon-${hit._id}`,
    name: creatureName,
    level: typeof src.level === 'number' ? src.level : 0,
    traits: ensureArray(src.trait_raw || src.trait),
    size: normalizeSize(src.size),
    source: src.primary_source || 'Archives of Nethys',
    perception: typeof src.perception === 'number' ? src.perception : 0,
    senses: ensureArray(src.sense_markdown || src.sense),
    languages: ensureArray(src.language),
    skills: ensureSkills(src.skill_mod),
    abilities: {
      str: src.strength ?? 0,
      dex: src.dexterity ?? 0,
      con: src.constitution ?? 0,
      int: src.intelligence ?? 0,
      wis: src.wisdom ?? 0,
      cha: src.charisma ?? 0
    },
    items: ensureArray(src.item),
    ac: typeof src.ac === 'number' ? src.ac : 10,
    saves: {
      fort: src.fortitude_save ?? 0,
      ref: src.reflex_save ?? 0,
      will: src.will_save ?? 0
    },
    hp: typeof src.hp === 'number' ? src.hp : 10,
    immunities: ensureArray(src.immunity),
    resistances: ensureArray(src.resistance_raw),
    weaknesses: ensureArray(src.weakness_raw),
    speed: src.speed_raw || src.speed_markdown || '30 feet',
    attacks: parseAttacksFromMarkdown(markdown),
    specialAbilities: parseAbilitiesFromMarkdown(markdown, abilityNames, creatureName),
    description: src.summary || '',
    rawText: src.text || ''
  };
}

// Main
const raw = JSON.parse(readFileSync('/tmp/aon_creatures_raw.json', 'utf-8'));
const hits = raw.hits?.hits || [];

const creatures = hits
  .map(hit => adaptAoNCreature(hit))
  .filter(c => c !== null)
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

writeFileSync('./src/data/creatures.json', JSON.stringify(creatures, null, 2));
console.log('Saved', creatures.length, 'creatures to src/data/creatures.json');
