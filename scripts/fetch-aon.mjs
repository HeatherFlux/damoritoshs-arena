/**
 * Fetch creatures from AoN Elasticsearch and save to bundled JSON
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

/**
 * Parse skills from AoN `skill_markdown` ("[Computers](/skills/4-computers) +8, [Corpse Fleet Lore](/skills/9-lore) +15").
 * The structured `skill_mod` field omits Computers, Piloting and every Lore skill,
 * so the markdown is the only complete source. Falls back to `skill_mod`.
 */
export function parseSkillsFromMarkdown(skillMarkdown, skillMod) {
  const result = {};
  if (typeof skillMarkdown === 'string' && skillMarkdown.trim()) {
    for (const m of skillMarkdown.matchAll(/\[([^\]]+)\]\([^)]+\)\s*([+-]?\d+)/g)) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
      const value = parseInt(m[2], 10);
      if (key && !Number.isNaN(value) && !(key in result)) result[key] = value;
    }
  }
  return Object.keys(result).length ? result : ensureSkills(skillMod);
}

/** Strip links (incl. the AoN "[Grab](/url)Grab" duplication artifact) and bold from a damage/effect line */
function cleanDamageText(text) {
  return fixDiceNotation(
    text
      .replace(/(\d)[\u2013\u2212](\d)/g, '$1-$2')   // "1d4–1" en dash / minus sign → ASCII minus so dice parse
      .replace(/\[([^\]]+)\]\([^)]+\)\1\b/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*/g, '')
      .trim()
  );
}

/**
 * Clean an ability description: flatten spell-rank lists ("- **1st**\n[A], [B]" → "; 1st: A, B"),
 * strip links/HTML, collapse whitespace. Spell/ritual blocks get a larger cap so full
 * spell lists survive; everything else keeps the 500-char cap.
 */
function cleanAbilityDescription(text, name) {
  // Longest real ability on AoN is ~930 chars; anything past 1500 is bleed, not content.
  const cap = 1500;
  void name;
  return (text || '')
    .replace(/\{\{traits \d+ "([^"]+)"\}\}/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/(?:^|\s*\n)- \*\*([^*]+)\*\*\r?\n?/g, '; $1: ')
    .replace(/\*\*(Cantrips[^*]*|\d+(?:st|nd|rd|th)|Constant)\*\*\s*/g, '$1: ')   // inline rank headers (dragons)
    .replace(/_([^_\n]+)_/g, '$1')   // italic spell names
    .replace(/,\s*((?:Cantrips[^:]*|\d+(?:st|nd|rd|th)|Constant[^:]*):)/g, '; $1')   // "…, 2nd:" → "…; 2nd:"
    .replace(/\*\*/g, '')   // no component renders markdown in descriptions; drop literal bold markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s;,)]+/, '')   // strip leading punctuation artifacts
    .trim()
    .slice(0, cap);
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
export function normalizeBoldedLinks(markdown) {
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
  'no breath': {
    actions: undefined,
    description: 'The creature doesn\'t need to breathe and is immune to effects that require breathing, such as inhaled poisons.'
  },
  'light blindness': {
    actions: undefined,
    description: 'When first exposed to bright light, the creature is blinded until the end of its next turn. After this exposure, light doesn\'t blind the creature again until after it spends 1 hour in darkness. However, as long as the creature is in an area of bright light, it\'s dazzled.'
  },
  'all-around vision': {
    actions: undefined,
    description: 'The creature can see in all directions simultaneously and therefore can\'t be flanked.'
  },
  'frightful presence': {
    actions: undefined,
    description: 'A creature that first enters the aura must attempt a Will save. Regardless of the result, the creature is temporarily immune to this creature\'s Frightful Presence for 1 minute. Critical Success The creature is unaffected. Success The creature is frightened 1. Failure The creature is frightened 2. Critical Failure The creature is frightened 4.'
  },
  'engulf': {
    actions: 2,
    description: 'The creature Strides up to double its Speed and can move through the spaces of any creatures in its path. Each creature of the listed size or smaller whose space it moves through must succeed at a Reflex save or be engulfed: grabbed, slowed 1, and unable to breathe, taking the listed damage at the end of each of its turns. It can attempt to Escape, and cutting through the engulfing creature (Rupture) also frees it.'
  },
  'throw rock': {
    actions: 1,
    description: 'The creature picks up a nearby rock and throws it, making a ranged Strike with the listed range increment and damage.'
  },
  'rend': {
    actions: 1,
    description: 'Requirements The creature hit the same enemy with two consecutive Strikes with the listed weapon in the same round; Effect The creature automatically deals that Strike\'s damage again to the enemy.'
  },
  'lifesense': {
    actions: undefined,
    description: 'The creature senses the vital essence of living and undead creatures within the listed range.'
  },
};

export function lookupStockAbility(name) {
  return STOCK_ABILITIES[name.toLowerCase().trim()] || null;
}

export { STOCK_ABILITIES };

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

export function parseAttacksFromMarkdown(markdown) {
  const attacks = [];
  if (!markdown) return attacks;

  const lines = markdown.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('**Melee**') || line.includes('**Ranged**') || line.includes('**Area Fire**') || line.includes('**Auto-Fire**')) {
      // Area Fire and Auto-Fire are save-based (no attack roll); both map to type 'area'
      const areaLabel = line.includes('**Area Fire**') ? 'Area Fire' : line.includes('**Auto-Fire**') ? 'Auto-Fire' : undefined;
      const attackType = line.includes('**Ranged**') ? 'ranged' : areaLabel ? 'area' : 'melee';
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
        // Area Fire / Auto-Fire attacks have no attack bonus — just a name (typically followed by a comma)
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
            damage = cleanDamageText(damageMatch[1]);
          }
          i++;
          break;
        }

        if (damageLine.match(/^\d+d\d+/)) {
          damage = cleanDamageText(damageLine);
          i++;
          break;
        }

        if (damageLine.match(/^\*\*[A-Z]/)) {
          break;
        }

        // Effect-only attacks have no dice: "magnet trap", "dazzled ... (DC 27 Fortitude save)"
        const trimmedLine = damageLine.trim();
        if (trimmedLine && !trimmedLine.startsWith('**') && !trimmedLine.startsWith('<')) {
          damage = cleanDamageText(trimmedLine);
          i++;
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
          range,
          area: areaLabel
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
    if (/^[A-Z]\d+$/.test(name.trim())) return false; // map-area labels like "B4"
    return true;
  });
}

/** Stat-block section labels and sub-section markers that are never ability names */
const SECTION_NAMES = new Set([
  'melee', 'ranged', 'area fire', 'auto-fire', 'damage', 'speed', 'ac', 'hp', 'perception',
  'str', 'dex', 'con', 'int', 'wis', 'cha', 'languages', 'skills',
  'items', 'immunities', 'resistances', 'weaknesses', 'saving throws',
  'fort', 'ref', 'will', 'hardness', 'frequency', 'trigger', 'effect',
  'requirements', 'critical success', 'success', 'failure', 'critical failure',
  'special', 'prerequisite', 'prerequisites', 'description', 'source',
]);

/** Bold markers that appear inside an ability's text rather than starting a new ability */
const SUBSECTION_WORDS = 'Trigger|Effect|Frequency|Requirements?|Critical Success|Critical Failure|Success|Failure|Saving Throw|Onset|Maximum Duration|Stage \\d+|Cantrips[^*]*|\\d+(?:st|nd|rd|th)';

/**
 * AoN sidebars sometimes hold one section per age/variant, e.g. a "Host Dragon Spellcasters"
 * aside with `<title level="3">Young Host Dragon</title>…<title level="3">Adult Host Dragon</title>…`.
 * Keep only the section titled with this creature's name so an adult dragon doesn't get the
 * young dragon's spell list. Markdown without a matching section is returned untouched.
 */
export function pruneSiblingSections(markdown, creatureName) {
  if (!markdown || !creatureName) return markdown;
  const titleRe = /<title level="3"[^>]*>([^<]*)<\/title>/g;
  const titles = [...markdown.matchAll(titleRe)];
  const target = creatureName.trim().toLowerCase();
  if (!titles.some(m => m[1].trim().toLowerCase() === target)) return markdown;
  let out = '';
  let cursor = 0;
  for (let i = 0; i < titles.length; i++) {
    const m = titles[i];
    out += markdown.slice(cursor, m.index);
    const next = i + 1 < titles.length ? titles[i + 1].index : markdown.length;
    const asideEnd = markdown.indexOf('</aside>', m.index);
    const end = asideEnd !== -1 && asideEnd < next ? asideEnd : next;
    if (m[1].trim().toLowerCase() === target) out += markdown.slice(m.index, end);
    cursor = end;
  }
  return out + markdown.slice(cursor);
}

export function parseAbilitiesFromMarkdown(markdown, abilityNames, creatureName, attacks = []) {
  const abilities = [];
  if (!markdown) return abilities;

  markdown = pruneSiblingSections(markdown, creatureName);

  // Bug 7: normalize **[Name](/url)** → **Name** so per-ability regex matches
  markdown = normalizeBoldedLinks(markdown);

  // Bug 9: missing opening bold on a linked name before an actions tag: `<br />[Reactive Strike](/url)** <actions`
  markdown = markdown.replace(/(^|\n|<br\s*\/?>)\s*\[([^\]]+)\]\([^)]+\)\*\*(\s*<actions)/g, '$1**$2**$3');

  // Bug 8: unclosed bold before an actions tag: `**Name <actions .../> **Trigger**` → `**Name** <actions .../> **Trigger**`
  markdown = markdown.replace(/\*\*([A-Z][^*<\n]*?)\s+(<actions string="[^"]+"\s*\/>)\s*\*\*/g, '**$1** $2 **');

  // Bug 3: filter out creature_ability entries that are actually attacks
  const attackNames = new Set(attacks.map(a => a.name.toLowerCase()));
  const filteredNames = abilityNames.filter(raw => {
    const { name } = parseAbilityName(raw);
    const lower = name.toLowerCase();
    // AoN sometimes lists stat-block section names (Immunities, Weaknesses…) as abilities
    return !attackNames.has(lower) && !SECTION_NAMES.has(lower);
  });

  // Build a set of all ability names for boundary detection
  const escapedNames = filteredNames.map(raw => {
    const { name } = parseAbilityName(raw);
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  // Lookahead pattern: stop at the next ability name, section header, or end.
  // AoN uses both newlines and <br /> to separate abilities.
  // Abilities are separated by newlines, <br />, or a closing tag butted straight against the next bold name
  const sep = '(?:\\r?\\n|<br\\s*\\/?>|<\\/[a-z]+>)\\s*';
  // Bug 1: paren-balanced trait group (one level of nesting handles markdown links inside parens)
  const traitGroup = '(?:\\((?:[^()]|\\([^()]*\\))*\\))?';
  // Any bold name directly followed by an actions tag is an ability header even when it is
  // missing from creature_ability (e.g. a bare "**Reactive Strike** <actions .../>"), so stop there too.
  const headerWithActions = `${sep}\\*\\*[A-Z][^*\\n]{1,40}\\*\\*\\s*(?:${traitGroup}\\s*)?<actions`;
  const sectionHeader = `${sep}\\*\\*(?:Melee|Ranged|Area Fire|Auto-Fire|Speed|Damage|Items|Immunities|Resistances|Weaknesses|AC|HP|Perception|Languages|Skills|Str|Source)\\*\\*`;
  // AoN's creature_ability list is incomplete, so any bold capitalized name on its own line is treated
  // as the next ability header — except sub-section markers that legitimately sit inside a description.
  const anyHeader = `${sep}\\*\\*(?!(?:${SUBSECTION_WORDS})\\*\\*)[A-Z][^*\\n]{1,40}\\*\\*`;
  const nextAbilityBoundary = escapedNames.length > 1
    ? `(?=${sep}\\*\\*(?:${escapedNames.join('|')})\\*\\*|${sectionHeader}|${headerWithActions}|${anyHeader}|\\r?\\n---|\\r?\\n<(?:hr|table|aside|title|document|\\/)|$)`
    : `(?=${sectionHeader}|${headerWithActions}|${anyHeader}|\\r?\\n---|\\r?\\n<(?:hr|table|aside|title|document|\\/)|$)`;


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
      `(?:\\*\\*)?${escapedSearchName}\\*\\*\\s*${traitGroup}\\s*(?:<actions string="([^"]+)"[^>]*>)?\\s*${traitGroup}\\s*(.*?)${nextAbilityBoundary}`,
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
      description = cleanAbilityDescription(match[2], displayName);
    }

    // Bug 6: stock-ability fallback when description is empty, or is only a bare
    // range/DC line such as Frightful Presence's "90 feet, DC 25"
    const stock = lookupStockAbility(displayName);
    if (stock && description.length < 40) {
      if (!actions && stock.actions !== undefined) actions = stock.actions;
      description = description ? `${description.replace(/[.;]\s*$/, '')}. ${stock.description}` : stock.description;
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
  const skipNames = SECTION_NAMES;

  // Boundary: next bold line, a rule, a blank line (unless a spell-rank list "- **1st**" follows),
  // a closing tag, or end of text. No `m` flag: with it `$` matched every line end and truncated
  // multi-line abilities — every spellcaster lost its spell list after the "DC X, attack +Y" line.
  const abilityPattern = /\*\*([A-Z][A-Za-z\s'-]+?)(?:\s*\([^)*]*\))?\*\*\s*(?:\((?:[^()]|\([^()]*\))*\))?\s*(?:<actions string="([^"]+)"[^>]*>)?\s*(?:\((?:[^()]|\([^()]*\))*\))?\s*((?:(?:[A-Z]|- \*\*)[^]*?)?)(?=(?:\n|<br\s*\/?>|<\/[a-z]+>)\s*\*\*(?!(?:Trigger|Effect|Frequency|Requirements?|Critical Success|Critical Failure|Success|Failure|Saving Throw|Onset|Maximum Duration|Stage \d+)\*\*)[A-Z]|\n---|\n<hr|\n\s*\n(?!- \*\*)|\n<\/|$)/g;
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

    const desc = cleanAbilityDescription(fallbackMatch[3], name);

    if (desc.length > 10) {
      abilities.push({ name, actions: fallbackActions, description: desc });
      knownLower.add(name.toLowerCase());
    } else if (fallbackActions !== undefined) {
      // Bare "**Name** <actions .../>" with no text: keep it, with stock text when we know the ability
      const stock = lookupStockAbility(name);
      abilities.push({ name, actions: stock?.actions ?? fallbackActions, description: stock?.description ?? '' });
      knownLower.add(name.toLowerCase());
    }
  }

  return abilities;
}

// ---------------------------------------------------------------------------
// Rendered-page parsing. The ES index omits the third stat-block column (offensive
// abilities, breath weapons, afflictions) and attack traits; both live only in the
// server-rendered HTML as <div class="creature-attack"> blocks. See fetch-aon-pages.mjs.
// ---------------------------------------------------------------------------

const STRIKE_LABELS = new Set(['melee', 'ranged', 'area fire', 'auto-fire']);

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Strip AoN template tags: {{stat "37"}} → 37, {{conditions 13 "enfeebled 1"}} → enfeebled 1 */
function stripTemplates(text) {
  return text
    .replace(/\{\{\w+(?:\s+\d+)?\s+"([^"]*)"\}\}/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '');
}

function htmlToText(html) {
  // Tags first, then entities (template tags arrive as {{stat &quot;37&quot;}}), then templates
  return stripTemplates(decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )).replace(/\s+/g, ' ').trim();
}

function actionsFromTitle(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('reaction')) return 'reaction';
  if (t.includes('free')) return 'free';
  if (t.includes('three')) return 3;
  if (t.includes('two')) return 2;
  if (t.includes('one') || t.includes('single')) return 1;
  return undefined;
}

/**
 * Parse every <div class="creature-attack"> block on a rendered AoN creature page.
 * Returns { attacks, abilities }. Strikes carry traits (agile, reach…) that the ES
 * markdown lacks; the rest are the offensive abilities the ES index drops entirely.
 */
export function parsePageBlocks(html) {
  const attacks = [];
  const abilities = [];
  if (!html) return { attacks, abilities };

  const blockRe = /<div class="creature-attack">([^]*?)<\/div>/g;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1];
    // The label is the bold run at the very start of the block; a block that opens with
    // plain text is an archive formatting slip and would yield a paragraph-long "name".
    const labelMatch = block.match(/^\s*<b>([^]*?)<\/b>/);
    if (!labelMatch) continue;
    const label = htmlToText(labelMatch[1].replace(/<span class="action"[^]*?<\/span>/g, ''));
    if (label.length > 80) {
      // Archive slip: a whole paragraph bolded as the "name", following an ability left without text
      const prev = abilities[abilities.length - 1];
      if (prev && !prev.description) prev.description = label.slice(0, 1500);
      continue;
    }
    const actionTitle = block.match(/class="action" title="([^"]+)"/)?.[1];
    const actions = actionsFromTitle(actionTitle);
    const traitsMatch = block.match(/<span class="traits-parenthetical[^"]*">\(([^]*?)\)<\/span>/);
    // Traits are <u> links; a parenthetical without them is mis-filed description text
    // (e.g. Swallow Whole's "(dc 37 basic fortitude save…)") and stays in the body.
    const traits = traitsMatch
      ? [...traitsMatch[1].matchAll(/<u>([^<]*)<\/u>/g)].map(t => htmlToText(t[1]).toLowerCase())
      : [];
    // Everything after the label, minus the action icon and the traits parenthetical
    let body = block.slice(labelMatch.index + labelMatch[0].length)
      .replace(/<span><span class="action"[^]*?<\/span><\/span>/g, ' ')
      .replace(/<span class="action"[^]*?<\/span>/g, ' ');
    if (traitsMatch && traits.length) body = body.replace(traitsMatch[0], ' ');

    if (STRIKE_LABELS.has(label.toLowerCase())) {
      const isArea = label.toLowerCase() !== 'melee' && label.toLowerCase() !== 'ranged';
      const [head, ...rest] = body.split(/<b>Damage<\/b>/i);
      const headText = htmlToText(head).replace(/,\s*$/, '');
      const nameMatch = headText.match(/^([a-zA-Z][a-zA-Z\s'-]*?)\s*(?:\+?(\d+))?\s*$/);
      if (!nameMatch) continue;
      const name = nameMatch[1].trim();
      const bonus = nameMatch[2] ? parseInt(nameMatch[2], 10) : 0;
      const damage = rest.length ? cleanDamageText(htmlToText(rest.join(' '))) : '';
      const rangeTrait = traits.find(t => /^range(?: increment)? \d+ feet$/.test(t));
      attacks.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        type: isArea ? 'area' : label.toLowerCase(),
        bonus: isArea ? 0 : bonus,
        damage: damage || '1d6',
        traits: traits.filter(t => !/^range(?: increment)? \d+ feet$/.test(t)),
        actions: typeof actions === 'number' ? actions : 1,
        range: rangeTrait ? rangeTrait.replace(/^range(?: increment)? /, '') : undefined,
        area: isArea ? label : undefined
      });
    } else {
      let description = htmlToText(body).replace(/^[\s;,)]+/, '').slice(0, 1500);
      let abilityActions = actions;
      // Linked generic abilities carry no text on the page (Engulf, Throw Rock…) or only a
      // parameter ("Rend claw"); fill in the stock rules text.
      const stock = lookupStockAbility(label);
      if (stock && description.length < 40) {
        description = description ? `${description.replace(/[.;]\s*$/, '')}. ${stock.description}` : stock.description;
        if (abilityActions === undefined) abilityActions = stock.actions;
      }
      if (!label || (!description && abilityActions === undefined)) continue;
      abilities.push({ name: label, actions: abilityActions, traits: traits.length ? traits : undefined, description });
    }
  }
  return { attacks, abilities };
}

/** Merge rendered-page strikes/abilities into a creature adapted from the ES index. */
export function mergePageBlocks(creature, page) {
  if (!page) return creature;
  const attacks = creature.attacks.map(a => ({ ...a }));
  for (const pa of page.attacks) {
    const existing = attacks.find(a => a.name.toLowerCase() === pa.name.toLowerCase() && a.type === pa.type && a.bonus === pa.bonus);
    if (existing) {
      if (!existing.traits.length && pa.traits.length) existing.traits = pa.traits;
      if (!existing.range && pa.range) existing.range = pa.range;
      if (!existing.area && pa.area) existing.area = pa.area;
      if (existing.damage === '1d6' && pa.damage !== '1d6') existing.damage = pa.damage;
    } else {
      attacks.push(pa);
    }
  }
  const known = new Set(creature.specialAbilities.map(a => a.name.toLowerCase()));
  const attackNames = new Set(attacks.map(a => a.name.toLowerCase()));
  const specialAbilities = [...creature.specialAbilities];
  for (const ab of page.abilities) {
    const key = ab.name.toLowerCase();
    if (known.has(key) || attackNames.has(key)) continue;
    known.add(key);
    specialAbilities.push(ab);
  }
  return { ...creature, attacks, specialAbilities };
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
    skills: parseSkillsFromMarkdown(src.skill_markdown, src.skill_mod),
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

// Main — only run when this file is invoked directly, not when imported by tests
const isMainScript = import.meta.url === `file://${process.argv[1]}`
  || (process.argv[1] || '').endsWith('fetch-aon.mjs');

if (isMainScript) {
const raw = JSON.parse(readFileSync('/tmp/aon_creatures_raw.json', 'utf-8'));
const hits = raw.hits?.hits || [];

// Bug 5: Keep all creature variants. When multiple entries share the same name,
// the Alien Core variant keeps the plain name; others get "(Source)" appended.
// If no Alien Core variant exists, the first (by AoN ID) keeps the plain name.
const PAGES_DIR = process.env.AON_PAGES_DIR || '/tmp/aon_pages';
let pagesUsed = 0;
const adapted = hits.map(hit => {
  const creature = adaptAoNCreature(hit);
  const pageFile = join(PAGES_DIR, `${hit._id}.html`);
  if (!existsSync(pageFile)) return creature;
  pagesUsed++;
  return mergePageBlocks(creature, parsePageBlocks(readFileSync(pageFile, 'utf-8')));
}).filter(c => c !== null);
if (pagesUsed < hits.length) {
  console.warn(`Rendered pages found for ${pagesUsed}/${hits.length} creatures in ${PAGES_DIR} — run scripts/fetch-aon-pages.mjs for full offensive abilities.`);
}

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
}
