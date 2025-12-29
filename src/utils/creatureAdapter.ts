/**
 * Creature Adapter - Converts AoN Elasticsearch data to our Creature format
 */

import type { Creature, Attack } from '../types/creature'

/**
 * Normalize size string to valid Creature size
 */
function normalizeSize(size: unknown): Creature['size'] {
  const sizeStr = (Array.isArray(size) ? size[0] : size || 'medium').toString().toLowerCase()
  const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']
  return validSizes.includes(sizeStr) ? sizeStr as Creature['size'] : 'medium'
}

/**
 * Ensure value is an array of strings
 */
function ensureArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value ? [value] : []
  return []
}

/**
 * Ensure object field for skills
 */
function ensureSkills(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, number> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'number') result[key] = val
  }
  return result
}

/**
 * Parse action count from AoN action string
 */
function parseActions(actionStr: string): 1 | 2 | 3 {
  if (actionStr.includes('Three') || actionStr.includes('3')) return 3
  if (actionStr.includes('Two') || actionStr.includes('2')) return 2
  return 1
}

/**
 * Fix malformed dice notation from AoN SF2e data
 * AoN strips '+' from damage, so "1d6+2" becomes "1d62"
 * This detects patterns like "1d62" and converts to "1d6+2"
 */
function fixDiceNotation(damage: string): string {
  // Pattern: XdY followed by more digits where Y is a valid die size
  // Order matters: longest first (100 before 10, 20 before 2)
  // "1d62" -> "1d6+2", "4d420" -> "4d4+20", "2d1015" -> "2d10+15"
  return damage.replace(/(\d+d)(100|20|12|10|8|6|4)(\d+)/g, (match, prefix, die, modifier) => {
    // Only fix if modifier is reasonable (1-99)
    const mod = parseInt(modifier, 10)
    if (mod > 0 && mod < 100) {
      return `${prefix}${die}+${modifier}`
    }
    return match
  })
}

/**
 * Extract traits from a string like "[Fire](/Traits.aspx?ID=72), [Magical](/Traits.aspx?ID=103)"
 * or "Agile, Magical, reach 10 feet"
 */
function extractTraits(traitStr: string): string[] {
  const traits: string[] = []

  // Try markdown link format first: [Trait](/Traits.aspx?ID=XX)
  const linkMatches = traitStr.match(/\[([^\]]+)\]\([^)]+\)/g)
  if (linkMatches) {
    for (const m of linkMatches) {
      const match = m.match(/\[([^\]]+)\]/)
      if (match) {
        const trait = match[1].toLowerCase()
        // Filter out reach notation and other non-traits
        if (!trait.includes('feet') && !trait.includes('reach')) {
          traits.push(trait)
        }
      }
    }
  }

  // Also try plain text traits (for some formats)
  if (traits.length === 0) {
    const parts = traitStr.split(',').map(s => s.trim().toLowerCase())
    for (const part of parts) {
      // Skip reach/range notations
      if (part && !part.includes('feet') && !part.includes('reach') && !part.includes('range')) {
        traits.push(part)
      }
    }
  }

  return traits
}

/**
 * Parse attacks from AoN markdown
 * Format:
 * **Melee**
 * <actions string="Single Action" />
 * jaws +29 ([Fire], [Magical], [reach 15 feet]),
 * **Damage** 3d12+15 piercing plus 2d6 fire
 */
function parseAttacksFromMarkdown(markdown: string): Attack[] {
  const attacks: Attack[] = []
  if (!markdown) return attacks

  // Split into lines and process
  const lines = markdown.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Look for **Melee** or **Ranged**
    if (line.includes('**Melee**') || line.includes('**Ranged**')) {
      const attackType: 'melee' | 'ranged' = line.includes('**Ranged**') ? 'ranged' : 'melee'

      // Next line should have actions
      i++
      if (i >= lines.length) break

      let actionsLine = lines[i]
      let actions: 1 | 2 | 3 = 1

      // Check for action string
      const actionMatch = actionsLine.match(/<actions string="([^"]+)"/)
      if (actionMatch) {
        actions = parseActions(actionMatch[1])
        i++
        if (i >= lines.length) break
      }

      // Now we should have the attack line: "jaws +29 ([traits]),"
      let attackLine = lines[i]

      // Sometimes the attack is on the same line as actions, check previous
      if (!attackLine.match(/\+\d+/) && actionsLine.match(/\+\d+/)) {
        attackLine = actionsLine
      }

      // Parse attack name and bonus
      // PF2e format: "name +bonus ([traits]),"
      // SF2e format: "name bonus," (no + sign)
      const attackMatch = attackLine.match(/^([a-zA-Z][a-zA-Z\s'-]*?)\s*\+?(\d+)/)
      if (!attackMatch) {
        i++
        continue
      }

      const attackName = attackMatch[1].trim()
      const bonus = parseInt(attackMatch[2], 10)

      // Extract traits from the line - look for parentheses containing traits
      // Format: ([Fire](/Traits.aspx?ID=72), [Magical](/Traits.aspx?ID=103), [reach 15 feet](/Traits.aspx?ID=192))
      const traitsMatch = attackLine.match(/\((\[[^\]]+\]\([^)]+\)(?:,\s*\[[^\]]+\]\([^)]+\))*)\)/)
      const traits = traitsMatch ? extractTraits(traitsMatch[1]) : []

      // Check for range in ranged attacks
      let range: string | undefined
      const rangeMatch = attackLine.match(/range(?:\s+increment)?\s+(\d+\s*feet)/i)
      if (rangeMatch) {
        range = rangeMatch[1]
      }

      // Look for damage on next line or same line
      i++
      let damage = ''

      while (i < lines.length) {
        const damageLine = lines[i]

        // PF2e format: **Damage** 3d12+15 piercing
        if (damageLine.includes('**Damage**')) {
          const damageMatch = damageLine.match(/\*\*Damage\*\*\s*(.+)/)
          if (damageMatch) {
            damage = fixDiceNotation(
              damageMatch[1]
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
                .replace(/\*\*/g, '') // Remove bold
                .trim()
            )
          }
          i++
          break
        }

        // SF2e format: damage is on the line after attack, no **Damage** prefix
        // Look for dice notation like "1d6" or "2d8+4"
        if (damageLine.match(/^\d+d\d+/)) {
          damage = fixDiceNotation(
            damageLine
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
              .replace(/\*\*/g, '') // Remove bold
              .trim()
          )
          i++
          break
        }

        // If we hit another section header, stop looking
        if (damageLine.match(/^\*\*[A-Z]/)) {
          break
        }
        i++
      }

      if (attackName && bonus) {
        const attack: Attack = {
          name: attackName.charAt(0).toUpperCase() + attackName.slice(1),
          type: attackType,
          bonus,
          damage: damage || '1d6',
          traits,
          actions,
          range
        }

        // Dedupe - check if we already have this exact attack
        const isDupe = attacks.some(a =>
          a.name === attack.name &&
          a.type === attack.type &&
          a.bonus === attack.bonus &&
          a.damage === attack.damage
        )
        if (!isDupe) {
          attacks.push(attack)
        }
      }
    } else {
      i++
    }
  }

  return attacks
}

/**
 * Parse special abilities from markdown
 */
function parseAbilitiesFromMarkdown(markdown: string, abilityNames: string[], creatureName: string): Creature['specialAbilities'] {
  const abilities: Creature['specialAbilities'] = []
  if (!markdown || !abilityNames.length) return abilities

  for (const rawName of abilityNames) {
    // Parse the ability name - extract action type from {{reaction}} etc.
    let { name: parsedName, actions: nameActions } = parseAbilityName(rawName)

    // AoN sometimes includes creature name in ability name (e.g., "Media Lore Zo!")
    // We use the full name for searching markdown but display the cleaned name
    const searchName = parsedName
    let displayName = parsedName
    if (creatureName && parsedName.endsWith(creatureName)) {
      displayName = parsedName.slice(0, -creatureName.length).trim()
    }

    // Try to find the ability description in markdown
    // Format: **Ability Name** description or **Ability Name** <actions> description
    // Note: AoN sometimes has malformed markdown like "Name**" instead of "**Name**"
    // The description continues until we hit a paragraph break (double newline) or new section
    // NOT just any bold text (since **Trigger** and **Effect** are part of descriptions)
    const regex = new RegExp(
      `(?:\\*\\*)?${searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*\\s*(?:<actions string="([^"]+)"[^>]*>)?\\s*(?:\\([^)]+\\))?\\s*(.+?)(?=\\r?\\n\\r?\\n|\\r?\\n---|\\r?\\n<|$)`,
      'is'
    )
    const match = markdown.match(regex)

    let actions: 0 | 1 | 2 | 3 | 'reaction' | 'free' | undefined = nameActions
    let description = ''

    if (match) {
      // Actions from markdown override name-based actions
      if (match[1]) {
        const actionStr = match[1].toLowerCase()
        if (actionStr.includes('reaction')) actions = 'reaction'
        else if (actionStr.includes('free')) actions = 'free'
        else if (actionStr.includes('three') || actionStr.includes('3')) actions = 3
        else if (actionStr.includes('two') || actionStr.includes('2')) actions = 2
        else if (actionStr.includes('single') || actionStr.includes('1')) actions = 1
      }
      description = (match[2] || '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
        .replace(/<br\s*\/?>/gi, ' ')            // Remove <br> tags
        .replace(/<[^>]+>/g, '')                 // Remove any other HTML tags
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500) // Truncate long descriptions
    }

    abilities.push({
      name: displayName,
      actions,
      description
    })
  }

  return abilities
}

/**
 * Filter out attack entries from ability names
 * AoN sometimes includes attacks in the creature_ability array
 */
function filterAbilityNames(names: string[]): string[] {
  return names.filter(name => {
    // Filter out entries that look like attacks (e.g., "sting +5", "laser ray +5")
    if (/\+\d+$/.test(name.trim())) return false
    if (/\s+\d+$/.test(name.trim())) return false // SF2e format without +
    return true
  })
}

/**
 * Parse ability name and extract action type from template placeholders
 * AoN uses {{reaction}}, {{free}}, {{1}}, {{2}}, {{3}} in ability names
 */
function parseAbilityName(rawName: string): { name: string; actions?: 0 | 1 | 2 | 3 | 'reaction' | 'free' } {
  let name = rawName.trim()
  let actions: 0 | 1 | 2 | 3 | 'reaction' | 'free' | undefined

  // Check for action placeholders
  const actionMatch = name.match(/\{\{(reaction|free|1|2|3)\}\}/i)
  if (actionMatch) {
    const actionStr = actionMatch[1].toLowerCase()
    if (actionStr === 'reaction') actions = 'reaction'
    else if (actionStr === 'free') actions = 'free'
    else if (actionStr === '1') actions = 1
    else if (actionStr === '2') actions = 2
    else if (actionStr === '3') actions = 3

    // Remove the placeholder from the name
    name = name.replace(/\s*\{\{(reaction|free|1|2|3)\}\}\s*/gi, '').trim()
  }

  return { name, actions }
}

/**
 * Adapt AoN Elasticsearch creature hit to our Creature format
 */
export function adaptAoNCreature(hit: { _id: string; _source: Record<string, unknown> }): Creature {
  const src = hit._source as Record<string, any>
  const markdown = (src.markdown || src.text || '') as string
  const abilityNames = filterAbilityNames(ensureArray(src.creature_ability))
  const creatureName = src.name || 'Unknown Creature'

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
  }
}
