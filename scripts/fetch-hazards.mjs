/**
 * Fetch hazards from AoN Elasticsearch and save to bundled JSON
 */
import { readFileSync, writeFileSync } from 'fs';

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}

function parseStealthDC(stealth) {
  if (!stealth) return null;
  const match = stealth.match(/\+?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function determineHazardType(traits) {
  const lowerTraits = traits.map(t => t.toLowerCase());
  if (lowerTraits.includes('haunt')) return 'haunt';
  if (lowerTraits.includes('environmental')) return 'environmental';
  return 'trap';
}

function parseActionsFromMarkdown(markdown) {
  const actions = [];
  if (!markdown) return actions;

  // Match reaction/action blocks: **Name** <actions string="X" /> **Trigger** ... **Effect** ...
  const actionRegex = /\*\*([^*]+)\*\*\s*<actions string="([^"]+)"[^>]*>\s*(?:\*\*Trigger\*\*\s*([^;*]+)[;.]?)?\s*(?:\*\*Effect\*\*\s*)?([^<\r\n]+(?:\r?\n(?!---|<|\*\*[A-Z]).[^\r\n]*)*)/gi;

  let match;
  while ((match = actionRegex.exec(markdown)) !== null) {
    const [, name, actionType, trigger, effect] = match;

    // Skip if this is a routine section or other non-action
    if (name.toLowerCase().includes('routine') || name.toLowerCase().includes('reset')) continue;

    let parsedActionType;
    const actionStr = actionType.toLowerCase();
    if (actionStr.includes('reaction')) parsedActionType = 'reaction';
    else if (actionStr.includes('free')) parsedActionType = 'free';
    else if (actionStr.includes('three') || actionStr === '3') parsedActionType = 3;
    else if (actionStr.includes('two') || actionStr === '2') parsedActionType = 2;
    else parsedActionType = 1;

    const cleanEffect = (effect || '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    actions.push({
      name: name.trim(),
      actionType: parsedActionType,
      trigger: trigger ? trigger.trim() : undefined,
      effect: cleanEffect
    });
  }

  return actions;
}

function parseRoutineFromMarkdown(markdown) {
  if (!markdown) return { routine: undefined, attackBonus: undefined, damage: undefined };

  const routineMatch = markdown.match(/\*\*Routine\*\*\s*\((\d+)\s*actions?\)/i);
  const actionsPerRound = routineMatch ? parseInt(routineMatch[1], 10) : undefined;

  // Extract attack info: **Ranged** laser +9 ... **Damage** 1d6+3 fire
  const attackMatch = markdown.match(/\*\*(Melee|Ranged)\*\*\s*[^+]*\+(\d+)[^,]*,\s*\*\*Damage\*\*\s*([^\r\n<]+)/i);
  let attackBonus, damage;
  if (attackMatch) {
    attackBonus = parseInt(attackMatch[2], 10);
    damage = attackMatch[3]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  // Get routine description
  const routineDescMatch = markdown.match(/\*\*Routine\*\*\s*\([^)]+\)\s*([^<\r\n]+(?:\r?\n(?!---|<br>|\*\*Reset).[^\r\n]*)*)/i);
  const routine = routineDescMatch
    ? routineDescMatch[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : undefined;

  return { routine, actionsPerRound, attackBonus, damage };
}

function adaptAoNHazard(hit) {
  const src = hit._source;
  const markdown = src.markdown || src.text || '';
  const traits = ensureArray(src.trait_raw || src.trait);
  const isComplex = (src.complexity || '').toLowerCase() === 'complex';

  const actions = parseActionsFromMarkdown(markdown);
  const { routine, actionsPerRound, attackBonus, damage } = parseRoutineFromMarkdown(markdown);

  // Parse immunities from markdown
  const immunitiesMatch = markdown.match(/\*\*Immunities\*\*\s*([^\r\n<]+)/i);
  const immunities = immunitiesMatch
    ? immunitiesMatch[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  // Parse hardness
  const hardnessMatch = markdown.match(/\*\*Hardness\*\*\s*(\d+)/i);
  const hardness = hardnessMatch ? parseInt(hardnessMatch[1], 10) : undefined;

  // Parse BT (Broken Threshold)
  const btMatch = markdown.match(/BT\s*(\d+)/i);
  const bt = btMatch ? parseInt(btMatch[1], 10) : undefined;

  // Clean description
  const description = (src.summary || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/…$/, '')
    .trim();

  return {
    id: `aon-${hit._id}`,
    name: src.name || 'Unknown Hazard',
    level: typeof src.level === 'number' ? src.level : 0,
    complexity: isComplex ? 'complex' : 'simple',
    type: determineHazardType(traits),
    traits: traits.filter(t => !['simple', 'complex'].includes(t.toLowerCase())),
    source: src.primary_source || 'Archives of Nethys',
    description,

    stealth: src.stealth || undefined,
    stealthDC: parseStealthDC(src.stealth),
    disable: src.disable || undefined,
    reset: src.reset || undefined,

    ac: typeof src.ac === 'number' ? src.ac : undefined,
    saves: {
      fortitude: src.fortitude_save || undefined,
      reflex: src.reflex_save || undefined,
      will: src.will_save || undefined
    },
    hardness,
    hp: typeof src.hp === 'number' ? src.hp : undefined,
    bt,
    immunities: immunities.length > 0 ? immunities : undefined,

    attackBonus,
    damage,
    actions,
    routine,
    actionsPerRound,

    rawText: src.text || ''
  };
}

// Main
const raw = JSON.parse(readFileSync('/tmp/aon_hazards_raw.json', 'utf-8'));
const hits = raw.hits?.hits || [];

// Deduplicate by name (keep first occurrence, which should be latest)
const seen = new Set();
const hazards = hits
  .map(hit => adaptAoNHazard(hit))
  .filter(h => {
    if (h === null) return false;
    const key = h.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

writeFileSync('./src/data/hazards.json', JSON.stringify(hazards, null, 2));
console.log('Saved', hazards.length, 'hazards to src/data/hazards.json');
