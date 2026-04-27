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

/** Strip markdown links: [text](/path) → text */
function stripMarkdownLinks(value) {
  if (typeof value === 'string') return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return value;
}

/** ensureArray + strip markdown links from each element */
function ensureCleanArray(value) {
  return ensureArray(value).map(s => stripMarkdownLinks(s));
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

/**
 * Pre-process markdown to normalize bolded names that wrap their text in a
 * markdown link, e.g. `**[Shield Block](/url)**` → `**Shield Block**`. Without
 * this, per-ability regexes that look for `**Name**` literal miss those entries.
 */
function normalizeBoldedLinks(markdown) {
  return markdown.replace(
    /\*\*\[([^\]]+)\]\([^)]+\)\*\*/g,
    '**$1**'
  );
}

/**
 * Stock-ability lookup for abilities that appear in AoN markdown without a
 * description because they're well-known SF2e/PF2e mechanics. Used as a
 * fallback when the parser finds the name but extracts no description.
 * Names matched case-insensitively.
 */
const STOCK_ABILITIES = {
  'reactive strike': {
    actions: 'reaction',
    description: 'Trigger A creature within reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it\'s using. Effect The creature makes a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the action is disrupted.'
  },
  'shield block': {
    actions: 'reaction',
    description: 'Trigger While the creature has a shield raised, it would take damage from a physical attack. Effect The shield prevents damage up to its Hardness; the creature and shield each take any remaining damage.'
  },
  'four-armed': {
    actions: undefined,
    description: 'The creature has four arms. As long as at least three arms are free, it can wield a two-handed weapon and another one-handed weapon at the same time, but can\'t attack with both in the same round.'
  },
  'exigency': {
    actions: 'reaction',
    description: 'Trigger The creature is reduced to 0 HP. Effect The creature attempts emergency repairs, healing for an amount based on its level.'
  },
  'attack of opportunity': {
    actions: 'reaction',
    description: 'Trigger A creature within reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it\'s using. Effect The creature makes a melee Strike against the triggering creature.'
  },
  'ferocity': {
    actions: 'reaction',
    description: 'Trigger The creature is reduced to 0 HP. Effect The creature avoids being knocked out and remains at 1 HP, but its wounded condition increases by 1. When this condition makes it wounded 4, it can no longer use this ability.'
  },
};

function lookupStockAbility(name) {
  return STOCK_ABILITIES[name.toLowerCase().trim()] || null;
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

    if (line.includes('**Melee**') || line.includes('**Ranged**') || line.includes('**Area Fire**')) {
      const attackType = line.includes('**Ranged**')
        ? 'ranged'
        : line.includes('**Area Fire**')
          ? 'area'
          : 'melee';
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

      let attackName = '';
      let bonus = 0;

      if (attackType === 'area') {
        // Area Fire attacks have no attack bonus — just a name (typically followed by a comma)
        const areaMatch = attackLine.match(/^([a-zA-Z][a-zA-Z\s'-]*?)\s*,/);
        if (!areaMatch) {
          // fall back to next line if name was on a different line
          i++;
          continue;
        }
        attackName = areaMatch[1].trim();
        bonus = 0;
      } else {
        const attackMatch = attackLine.match(/^([a-zA-Z][a-zA-Z\s'-]*?)\s*\+?(\d+)/);
        if (!attackMatch) {
          i++;
          continue;
        }
        attackName = attackMatch[1].trim();
        bonus = parseInt(attackMatch[2], 10);
      }

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

      // Area Fire attacks legitimately have bonus=0; only require a bonus for melee/ranged
      if (attackName && (attackType === 'area' || bonus)) {
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

function parseAbilitiesFromMarkdown(markdown, abilityNames, creatureName, attacks = []) {
  const abilities = [];
  if (!markdown) return abilities;

  // Bug 7: normalize **[Name](/url)** → **Name** so per-ability regex matches
  markdown = normalizeBoldedLinks(markdown);

  // Bug 3: filter out creature_ability entries that are actually attacks
  const attackNames = new Set(attacks.map(a => a.name.toLowerCase()));
  const filteredNames = abilityNames.filter(raw => {
    const { name } = parseAbilityName(raw);
    return !attackNames.has(name.toLowerCase());
  });

  // Build a set of all ability names for boundary detection
  const escapedNames = filteredNames.map(raw => {
    const { name } = parseAbilityName(raw);
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  // Lookahead pattern: stop at the next ability name, section header, or end.
  // AoN uses both newlines and <br /> to separate abilities.
  const sep = '(?:\\r?\\n|<br\\s*\\/?>)';
  const nextAbilityBoundary = escapedNames.length > 1
    ? `(?=${sep}\\*\\*(?:${escapedNames.join('|')})\\*\\*|${sep}\\*\\*(?:Melee|Ranged|Area Fire|Speed|Damage)\\*\\*|\\r?\\n---|\\r?\\n<hr|$)`
    : `(?=${sep}\\*\\*(?:Melee|Ranged|Area Fire|Speed|Damage)\\*\\*|\\r?\\n---|\\r?\\n<hr|$)`;

  // Bug 1: paren-balanced trait group (one level of nesting handles markdown links inside parens)
  const traitGroup = '(?:\\((?:[^()]|\\([^()]*\\))*\\))?';

  for (const rawName of filteredNames) {
    let { name: parsedName, actions: nameActions } = parseAbilityName(rawName);

    const searchName = parsedName;
    let displayName = parsedName;
    if (creatureName && parsedName.endsWith(creatureName)) {
      displayName = parsedName.slice(0, -creatureName.length).trim();
    }

    const escapedSearchName = searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use .*? (allow empty) so abilities with no description body don't greedily
    // consume the next ability's content (e.g. Four-Armed → Shield Block).
    const regex = new RegExp(
      `(?:\\*\\*)?${escapedSearchName}\\*\\*\\s*(?:<actions string="([^"]+)"[^>]*>)?\\s*${traitGroup}\\s*(.*?)${nextAbilityBoundary}`,
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
        .replace(/^[\s;,)]+/, '')   // strip leading punctuation artifacts
        .trim()
        .slice(0, 500);
    }

    // Bug 6: stock-ability fallback when description is empty
    if (!description) {
      const stock = lookupStockAbility(displayName);
      if (stock) {
        if (!actions && stock.actions !== undefined) actions = stock.actions;
        description = stock.description;
      }
    }

    // Drop entries with neither description nor actions — usually attack-name noise
    if (!description && actions === undefined) {
      continue;
    }

    abilities.push({
      name: displayName,
      actions,
      description
    });
  }

  const knownLower = new Set(abilities.map(a => a.name.toLowerCase()));

  // Bug 4: plain-text "Name [reaction]" or "Name [free-action]" — no bold formatting
  const plainReactionRegex = /(?:^|\n|<br\s*\/?>)\s*([A-Z][A-Za-z\s'-]+?)\s*\[(reaction|free-action)\]/g;
  let plainMatch;
  while ((plainMatch = plainReactionRegex.exec(markdown)) !== null) {
    const name = plainMatch[1].trim();
    const lower = name.toLowerCase();
    if (knownLower.has(lower) || attackNames.has(lower)) continue;
    if (name.length < 3 || name.length > 40) continue;

    const actionType = plainMatch[2].toLowerCase().includes('free') ? 'free' : 'reaction';
    const stock = lookupStockAbility(name);
    abilities.push({
      name,
      actions: stock?.actions ?? actionType,
      description: stock?.description ?? ''
    });
    knownLower.add(lower);
  }

  // Existing fallback: scan markdown for **Name** abilities not in creature_ability
  const skipNames = new Set([
    'melee', 'ranged', 'area fire', 'damage', 'speed', 'ac', 'hp', 'perception',
    'str', 'dex', 'con', 'int', 'wis', 'cha', 'languages', 'skills',
    'items', 'immunities', 'resistances', 'weaknesses', 'saving throws',
    'fort', 'ref', 'will', 'hardness', 'frequency', 'trigger', 'effect',
    'requirements', 'critical success', 'success', 'failure', 'critical failure',
    'special', 'prerequisite', 'prerequisites', 'description', 'source',
  ]);

  const abilityPattern = /\*\*([A-Z][A-Za-z\s'-]+?)\*\*\s*(?:<actions string="([^"]+)"[^>]*>)?\s*(?:\((?:[^()]|\([^()]*\))*\))?\s*([A-Z][^]*?)(?=(?:\n|<br\s*\/?>)\*\*[A-Z]|\n---|\n<hr|$)/gm;
  let fallbackMatch;
  while ((fallbackMatch = abilityPattern.exec(markdown)) !== null) {
    const name = fallbackMatch[1].trim();
    if (knownLower.has(name.toLowerCase())) continue;
    if (skipNames.has(name.toLowerCase())) continue;
    if (attackNames.has(name.toLowerCase())) continue;
    if (/^\d/.test(name)) continue;
    if (name.length > 40) continue; // Probably not an ability name

    let fallbackActions;
    if (fallbackMatch[2]) {
      const actionStr = fallbackMatch[2].toLowerCase();
      if (actionStr.includes('reaction')) fallbackActions = 'reaction';
      else if (actionStr.includes('free')) fallbackActions = 'free';
      else if (actionStr.includes('three') || actionStr.includes('3')) fallbackActions = 3;
      else if (actionStr.includes('two') || actionStr.includes('2')) fallbackActions = 2;
      else if (actionStr.includes('single') || actionStr.includes('1')) fallbackActions = 1;
    }

    const desc = (fallbackMatch[3] || '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    if (desc.length > 10) {
      abilities.push({ name, actions: fallbackActions, description: desc });
      knownLower.add(name.toLowerCase());
    }
  }

  return abilities;
}

function adaptAoNCreature(hit) {
  const src = hit._source;
  const markdown = (src.markdown || src.text || '');
  const abilityNames = filterAbilityNames(ensureArray(src.creature_ability));
  const creatureName = src.name || 'Unknown Creature';
  const attacks = parseAttacksFromMarkdown(markdown);

  return {
    id: `aon-${hit._id}`,
    name: creatureName,
    level: typeof src.level === 'number' ? src.level : 0,
    traits: ensureArray(src.trait_raw || src.trait),
    size: normalizeSize(src.size),
    source: src.primary_source || 'Archives of Nethys',
    perception: typeof src.perception === 'number' ? src.perception : 0,
    senses: ensureCleanArray(src.sense_markdown || src.sense),
    languages: ensureCleanArray(src.language),
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
    immunities: ensureCleanArray(src.immunity),
    resistances: ensureCleanArray(src.resistance_raw),
    weaknesses: ensureCleanArray(src.weakness_raw),
    speed: stripMarkdownLinks(src.speed_raw || src.speed_markdown || '30 feet'),
    attacks,
    specialAbilities: parseAbilitiesFromMarkdown(markdown, abilityNames, creatureName, attacks),
    description: src.summary || '',
    rawText: src.text || ''
  };
}

// Main
const raw = JSON.parse(readFileSync('/tmp/aon_creatures_raw.json', 'utf-8'));
const hits = raw.hits?.hits || [];

// Bug 5: Keep all creature variants. When multiple entries share the same name,
// the Alien Core variant keeps the plain name; others get "(Source)" appended.
// If no Alien Core variant exists, the first (by AoN ID) keeps the plain name.
const adapted = hits.map(hit => adaptAoNCreature(hit)).filter(c => c !== null);

const byName = new Map();
for (const c of adapted) {
  const key = c.name.toLowerCase();
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(c);
}

const creatures = [];
for (const [, variants] of byName) {
  if (variants.length === 1) {
    creatures.push(variants[0]);
    continue;
  }

  // Pick primary: Alien Core if present, otherwise first by AoN ID
  const alienCoreIdx = variants.findIndex(v => v.source === 'Alien Core');
  const primaryIdx = alienCoreIdx !== -1 ? alienCoreIdx : 0;

  variants.forEach((v, i) => {
    if (i === primaryIdx) {
      creatures.push(v);
    } else {
      // Append source suffix for non-primary variants
      creatures.push({ ...v, name: `${v.name} (${v.source})` });
    }
  });
}

creatures.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

writeFileSync('./src/data/creatures.json', JSON.stringify(creatures, null, 2));
console.log('Saved', creatures.length, 'creatures to src/data/creatures.json');
