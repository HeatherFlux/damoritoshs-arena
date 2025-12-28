/**
 * Dice rolling utilities for Starfinder 2e
 * With comprehensive roll history and export support
 */

export type RollType = 'd20' | 'damage' | 'flat'

export interface RollResult {
  id: string
  timestamp: Date

  // Roll details
  type: RollType
  name: string           // What was rolled (e.g., "Perception", "Kukri")
  source: string         // Who rolled (creature name)

  // d20 roll details
  roll: number           // The raw die roll(s)
  modifier: number       // Total modifier
  total: number          // Final result

  // Special outcomes
  isNat20: boolean
  isNat1: boolean
  isCriticalSuccess?: boolean
  isCriticalFailure?: boolean
  isCriticalHit?: boolean    // For damage rolls - was this a crit?

  // Damage-specific
  diceExpression?: string    // e.g., "2d6+4"
  damageType?: string        // e.g., "slashing", "fire"
  individualRolls?: number[] // Each die result

  // For display breakdown
  breakdown: string      // Human-readable breakdown like "1d20 (15) + 8"
}

let rollHistory: RollResult[] = []
let rollListeners: Array<(result: RollResult) => void> = []

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

/**
 * Roll a d20 with modifier
 */
export function rollD20(
  modifier: number,
  name: string,
  source: string = 'Unknown'
): RollResult {
  const roll = Math.floor(Math.random() * 20) + 1
  const total = roll + modifier

  const result: RollResult = {
    id: generateId(),
    timestamp: new Date(),
    type: 'd20',
    name,
    source,
    roll,
    modifier,
    total,
    isNat20: roll === 20,
    isNat1: roll === 1,
    breakdown: `1d20 (${roll}) ${modifier >= 0 ? '+' : ''}${modifier} = ${total}`,
  }

  addToHistory(result)
  return result
}

/**
 * Roll damage dice (e.g., "2d6+4 fire")
 * @param critical - If true, doubles dice count and modifier (PF2e crit rules)
 */
export function rollDamage(
  expression: string,
  name: string,
  source: string = 'Unknown',
  critical: boolean = false
): RollResult {
  // Parse expression like "2d6+4" or "1d8+2 fire" or "2d6+4 slashing"
  // Clean up any weird parsing artifacts
  const cleanExpr = expression.replace(/[^\dd+\-\s\w]/g, ' ').trim()
  const match = cleanExpr.match(/(\d+)d(\d+)([+-]\d+)?(?:\s+(.+))?/)

  if (!match) {
    // Fallback for unparseable expressions
    return {
      id: generateId(),
      timestamp: new Date(),
      type: 'damage',
      name: `${name} Damage`,
      source,
      roll: 0,
      modifier: 0,
      total: 0,
      isNat20: false,
      isNat1: false,
      isCriticalHit: critical,
      diceExpression: expression,
      breakdown: `Could not parse: ${expression}`,
    }
  }

  // Base values from parsing
  const baseNumDice = parseInt(match[1])
  const dieSize = parseInt(match[2])
  const baseModifier = match[3] ? parseInt(match[3]) : 0
  const damageType = match[4]?.trim() || ''

  // Double dice and modifier for crits
  const numDice = critical ? baseNumDice * 2 : baseNumDice
  const modifier = critical ? baseModifier * 2 : baseModifier

  const individualRolls: number[] = []
  let diceTotal = 0

  for (let i = 0; i < numDice; i++) {
    const roll = Math.floor(Math.random() * dieSize) + 1
    individualRolls.push(roll)
    diceTotal += roll
  }

  const total = diceTotal + modifier
  const diceStr = `${numDice}d${dieSize}`
  const rollsStr = individualRolls.length > 1
    ? `(${individualRolls.join('+')})`
    : `(${individualRolls[0]})`

  const result: RollResult = {
    id: generateId(),
    timestamp: new Date(),
    type: 'damage',
    name: critical ? `${name} CRIT` : `${name} Damage`,
    source,
    roll: diceTotal,
    modifier,
    total,
    isNat20: false,
    isNat1: false,
    isCriticalHit: critical,
    diceExpression: `${diceStr}${modifier >= 0 ? '+' : ''}${modifier}`,
    damageType,
    individualRolls,
    breakdown: `${diceStr} ${rollsStr} ${modifier !== 0 ? (modifier >= 0 ? '+' : '') + modifier : ''} = ${total}${damageType ? ' ' + damageType : ''}`,
  }

  addToHistory(result)
  return result
}

/**
 * Roll a flat check (d20, no modifier)
 */
export function rollFlat(dc: number, name: string, source: string = 'Unknown'): RollResult {
  const roll = Math.floor(Math.random() * 20) + 1

  const result: RollResult = {
    id: generateId(),
    timestamp: new Date(),
    type: 'flat',
    name,
    source,
    roll,
    modifier: 0,
    total: roll,
    isNat20: roll === 20,
    isNat1: roll === 1,
    isCriticalSuccess: roll >= dc + 10 || roll === 20,
    isCriticalFailure: roll <= dc - 10 || roll === 1,
    breakdown: `1d20 (${roll}) vs DC ${dc}`,
  }

  addToHistory(result)
  return result
}

function addToHistory(result: RollResult) {
  rollHistory.unshift(result)
  if (rollHistory.length > 100) {
    rollHistory = rollHistory.slice(0, 100)
  }
  rollListeners.forEach(listener => listener(result))
}

/**
 * Subscribe to roll events
 */
export function onRoll(listener: (result: RollResult) => void): () => void {
  rollListeners.push(listener)
  return () => {
    rollListeners = rollListeners.filter(l => l !== listener)
  }
}

/**
 * Get roll history
 */
export function getRollHistory(): RollResult[] {
  return [...rollHistory]
}

/**
 * Clear roll history
 */
export function clearRollHistory(): void {
  rollHistory = []
}

/**
 * Delete a specific roll from history
 */
export function deleteRoll(id: string): void {
  rollHistory = rollHistory.filter(r => r.id !== id)
}

/**
 * Format modifier for display
 */
export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

// ============================================
// EXPORT FORMATS
// ============================================

/**
 * Export roll to Discord format (markdown)
 */
export function exportToDiscord(roll: RollResult): string {
  const emoji = roll.isNat20 ? '🎉' : roll.isNat1 ? '💀' : '🎲'

  if (roll.type === 'damage') {
    return `${emoji} **${roll.source}** · ${roll.name}\n\`${roll.diceExpression}\` → **${roll.total}**${roll.damageType ? ` ${roll.damageType}` : ''} damage\n${roll.breakdown}`
  }

  let result = `${emoji} **${roll.source}** · ${roll.name}\n\`d20${roll.modifier >= 0 ? '+' : ''}${roll.modifier}\` → **${roll.total}**`

  if (roll.isNat20) result += ' 🎯 **NAT 20!**'
  if (roll.isNat1) result += ' 💥 **NAT 1!**'

  result += `\n${roll.breakdown}`

  return result
}

/**
 * Export roll to Foundry VTT chat format
 * Uses Foundry's chat message format for /r command
 */
export function exportToFoundry(roll: RollResult): string {
  if (roll.type === 'damage') {
    // Foundry inline roll format
    return `/r ${roll.diceExpression} # ${roll.source}: ${roll.name}${roll.damageType ? ` (${roll.damageType})` : ''}`
  }

  return `/r 1d20${roll.modifier >= 0 ? '+' : ''}${roll.modifier} # ${roll.source}: ${roll.name}`
}

/**
 * Export roll as JSON (for APIs/webhooks)
 */
export function exportToJSON(roll: RollResult): string {
  return JSON.stringify({
    source: roll.source,
    roll_type: roll.type,
    name: roll.name,
    dice: roll.type === 'damage' ? roll.diceExpression : `1d20${formatModifier(roll.modifier)}`,
    result: roll.total,
    breakdown: roll.breakdown,
    natural_20: roll.isNat20,
    natural_1: roll.isNat1,
    damage_type: roll.damageType || null,
    timestamp: roll.timestamp.toISOString(),
  }, null, 2)
}

/**
 * Export roll as plain text
 */
export function exportToPlainText(roll: RollResult): string {
  let text = `${roll.source} - ${roll.name}: ${roll.total}`

  if (roll.type === 'damage' && roll.damageType) {
    text += ` ${roll.damageType} damage`
  }

  text += ` (${roll.breakdown})`

  if (roll.isNat20) text += ' - NATURAL 20!'
  if (roll.isNat1) text += ' - NATURAL 1!'

  return text
}

/**
 * Copy roll to clipboard in specified format
 */
export async function copyRollToClipboard(
  roll: RollResult,
  format: 'discord' | 'foundry' | 'json' | 'text' = 'discord'
): Promise<boolean> {
  let text: string

  switch (format) {
    case 'discord':
      text = exportToDiscord(roll)
      break
    case 'foundry':
      text = exportToFoundry(roll)
      break
    case 'json':
      text = exportToJSON(roll)
      break
    case 'text':
    default:
      text = exportToPlainText(roll)
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    console.error('Failed to copy to clipboard')
    return false
  }
}

// ============================================
// RECALL KNOWLEDGE
// ============================================

/**
 * Calculate Recall Knowledge DCs based on creature level
 */
export function getRecallKnowledgeDCs(level: number, rarity: string = 'common'): {
  standard: number
  unspecific: number
  specific: number
} {
  const baseDC = 14 + level

  let rarityAdjust = 0
  if (rarity.toLowerCase() === 'uncommon') rarityAdjust = 2
  else if (rarity.toLowerCase() === 'rare') rarityAdjust = 5
  else if (rarity.toLowerCase() === 'unique') rarityAdjust = 10

  return {
    standard: baseDC + rarityAdjust,
    unspecific: baseDC + rarityAdjust - 2,
    specific: baseDC + rarityAdjust - 5,
  }
}

/**
 * Get appropriate skill for Recall Knowledge based on creature traits
 */
export function getRecallKnowledgeSkill(traits: string[]): string {
  const traitLower = traits.map(t => t.toLowerCase())

  if (traitLower.includes('aberration')) return 'Occultism'
  if (traitLower.includes('animal') || traitLower.includes('beast')) return 'Nature'
  if (traitLower.includes('astral') || traitLower.includes('celestial') || traitLower.includes('fiend') || traitLower.includes('monitor')) return 'Religion'
  if (traitLower.includes('construct') || traitLower.includes('tech')) return 'Crafting'
  if (traitLower.includes('dragon')) return 'Arcana'
  if (traitLower.includes('elemental')) return 'Arcana/Nature'
  if (traitLower.includes('fey') || traitLower.includes('plant')) return 'Nature'
  if (traitLower.includes('fungus')) return 'Nature'
  if (traitLower.includes('humanoid')) return 'Society'
  if (traitLower.includes('ooze')) return 'Occultism'
  if (traitLower.includes('undead')) return 'Religion'
  if (traitLower.includes('cosmic') || traitLower.includes('void')) return 'Occultism'

  return 'Arcana'
}
