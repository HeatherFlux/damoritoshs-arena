/**
 * Hazard Stat Block Renderer
 * Renders hazards in canonical PF2e/SF2e stat block format
 */

import type { Hazard, HazardComplexity, DisableMethod, HazardAction, HazardComponent } from '../types/hazard'

/**
 * Parse a dice expression and return the average
 * e.g., "2d6+3" => 10, "4d8+10" => 28
 */
export function parseDiceAverage(dice: string): number {
  if (!dice) return 0

  // Match patterns like "2d6+3", "4d8", "1d10-2"
  const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) {
    // Maybe it's just a number
    const num = parseInt(dice)
    return isNaN(num) ? 0 : num
  }

  const [, count, sides, modifier] = match
  const avg = parseInt(count) * (parseInt(sides) + 1) / 2
  const mod = modifier ? parseInt(modifier) : 0
  return Math.floor(avg + mod)
}

/**
 * Format complexity for display
 */
function formatComplexity(complexity: HazardComplexity): string {
  return complexity === 'simple' ? 'Simple' : 'Complex'
}

/**
 * Format proficiency for display
 */
function formatProficiency(prof: string): string {
  return prof.charAt(0).toUpperCase() + prof.slice(1)
}

/**
 * Format action cost
 */
function formatActionCost(actionType: 'reaction' | 'free' | number | undefined): string {
  if (actionType === 'reaction') return '[reaction]'
  if (actionType === 'free') return '[free-action]'
  if (typeof actionType === 'number') {
    if (actionType === 1) return '[one-action]'
    if (actionType === 2) return '[two-actions]'
    if (actionType === 3) return '[three-actions]'
  }
  return ''
}

/**
 * Get trait-driven rule hints
 */
export function getTraitHints(hazard: Partial<Hazard>): string[] {
  const hints: string[] = []
  const traits = hazard.traits || []
  const subtypes = hazard.trapSubtypes || []

  // Magical traps
  if (subtypes.includes('magical') || traits.includes('magical')) {
    hints.push('Can be counteracted by *dispel magic* (counteract level = hazard level / 2).')
  }

  // Tech traps (SF2e)
  if (subtypes.includes('tech') || traits.includes('tech')) {
    hints.push('Can be glitched with Computers (reduced effect for 1 round).')
  }

  // Haunts
  if (hazard.type === 'haunt') {
    hints.push('Haunts are triggered by living creatures and reset automatically after being triggered.')
    if (!traits.includes('incorporeal')) {
      hints.push('Consider adding the incorporeal trait if the haunt has no physical form.')
    }
  }

  // Environmental
  if (hazard.type === 'environmental') {
    hints.push('Environmental hazards are natural phenomena, not intentional traps.')
  }

  // Incapacitation
  if (traits.includes('incapacitation')) {
    hints.push('Incapacitation effects are less effective against higher-level creatures.')
  }

  // Complex hazards
  if (hazard.complexity === 'complex') {
    hints.push('Complex hazards act on their initiative and have routines each round.')
  }

  return hints
}

/**
 * Render a hazard as a Markdown stat block
 */
export function renderHazardMarkdown(hazard: Partial<Hazard>): string {
  const lines: string[] = []

  // Header
  const level = hazard.level ?? 0
  const levelSign = level >= 0 ? '' : ''
  lines.push(`# ${hazard.name || 'Unnamed Hazard'}`)
  lines.push(`**${formatComplexity(hazard.complexity || 'simple')} Hazard ${levelSign}${level}**`)
  lines.push('')

  // Traits
  const allTraits: string[] = []
  if (hazard.type) allTraits.push(hazard.type)
  if (hazard.trapSubtypes?.length) {
    allTraits.push(...hazard.trapSubtypes)
  }
  if (hazard.traits?.length) {
    allTraits.push(...hazard.traits)
  }
  if (allTraits.length) {
    lines.push(`**Traits** ${allTraits.join(', ')}`)
  }

  // Source
  if (hazard.source) {
    lines.push(`**Source** ${hazard.source}`)
  }
  lines.push('')

  // Description
  if (hazard.description) {
    lines.push(hazard.description)
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // Stealth
  if (!hazard.isObvious) {
    const stealthMod = hazard.stealthDC ? hazard.stealthDC - 10 : null
    let stealthLine = `**Stealth** DC ${hazard.stealthDC || '??'}`
    if (stealthMod !== null) {
      stealthLine += ` (+${stealthMod})`
    }
    if (hazard.stealthProficiency && hazard.stealthProficiency !== 'untrained') {
      stealthLine += ` (${formatProficiency(hazard.stealthProficiency)} to find)`
    }
    lines.push(stealthLine)
  } else {
    lines.push('**Stealth** Obvious')
  }

  // Disable
  if (hazard.disableMethods?.length) {
    const methods = hazard.disableMethods.map((m: DisableMethod) => {
      const dc = m.dcOverride || (hazard.stealthDC || 15) // Fallback
      let method = `${m.skill} DC ${dc}`
      if (m.proficiency !== 'untrained') {
        method += ` (${formatProficiency(m.proficiency)})`
      }
      if (m.notes) {
        method += ` ${m.notes}`
      }
      if (m.isSecondary) {
        method += ' (secondary)'
      }
      return method
    })
    lines.push(`**Disable** ${methods.join('; ')}`)
  } else if (hazard.disable) {
    lines.push(`**Disable** ${hazard.disable}`)
  }
  lines.push('')

  // Defenses (if physical)
  if (hazard.hasPhysicalComponent) {
    const defLines: string[] = []
    if (hazard.ac) defLines.push(`AC ${hazard.ac}`)
    if (hazard.saves?.fortitude) defLines.push(`Fort +${hazard.saves.fortitude}`)
    if (hazard.saves?.reflex) defLines.push(`Ref +${hazard.saves.reflex}`)
    if (hazard.saves?.will) defLines.push(`Will +${hazard.saves.will}`)
    if (defLines.length) {
      lines.push(`**${defLines.join('; ')}**`)
    }

    const hpLine: string[] = []
    if (hazard.hardness) hpLine.push(`Hardness ${hazard.hardness}`)
    if (hazard.hp) {
      const bt = hazard.bt || Math.floor(hazard.hp / 2)
      hpLine.push(`HP ${hazard.hp} (BT ${bt})`)
    }
    if (hpLine.length) {
      lines.push(`**${hpLine.join('; ')}**`)
    }

    // Immunities, Weaknesses, Resistances
    if (hazard.immunities?.length) {
      lines.push(`**Immunities** ${hazard.immunities.join(', ')}`)
    }
    if (hazard.weaknesses?.length) {
      const weak = hazard.weaknesses.map(w => `${w.type} ${w.value}`).join(', ')
      lines.push(`**Weaknesses** ${weak}`)
    }
    if (hazard.resistances?.length) {
      const resist = hazard.resistances.map(r => `${r.type} ${r.value}`).join(', ')
      lines.push(`**Resistances** ${resist}`)
    }
    lines.push('')

    // Components (for complex hazards)
    if (hazard.components?.length) {
      lines.push('**Components**')
      hazard.components.forEach((comp: HazardComponent) => {
        const compParts: string[] = [`**${comp.name}**`]
        if (comp.ac) compParts.push(`AC ${comp.ac}`)
        if (comp.hardness) compParts.push(`Hardness ${comp.hardness}`)
        const compBt = comp.bt || Math.floor(comp.hp / 2)
        compParts.push(`HP ${comp.hp} (BT ${compBt})`)
        if (comp.position) compParts.push(`(${comp.position})`)
        lines.push(`- ${compParts.join('; ')}`)
      })
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')

  // Simple hazard: Trigger, Effect, Reset
  if (hazard.complexity === 'simple') {
    if (hazard.trigger) {
      lines.push(`**Trigger** ${hazard.trigger}`)
      lines.push('')
    }

    if (hazard.effect) {
      lines.push(`**Effect** ${hazard.effect}`)

      // Add damage info if present
      if (hazard.damage) {
        const avg = parseDiceAverage(hazard.damage)
        let dmgLine = `The hazard deals ${hazard.damage}`
        if (hazard.damageType) dmgLine += ` ${hazard.damageType}`
        dmgLine += ` damage`
        if (avg) dmgLine += ` (average ${avg})`

        if (hazard.usesAttackRoll && hazard.attackBonus) {
          dmgLine += ` (attack +${hazard.attackBonus})`
        } else if (hazard.saveDC) {
          const saveType = hazard.saveType ? hazard.saveType.charAt(0).toUpperCase() + hazard.saveType.slice(1) : 'Basic'
          dmgLine += ` (DC ${hazard.saveDC} ${saveType})`
        }
        lines.push(dmgLine + '.')
      }
      lines.push('')
    }

    if (hazard.reset) {
      lines.push(`**Reset** ${hazard.reset}`)
      lines.push('')
    }
  }

  // Complex hazard: Routine and Actions
  if (hazard.complexity === 'complex') {
    if (hazard.routine) {
      const actions = hazard.actionsPerRound || 1
      lines.push(`**Routine** (${actions} action${actions > 1 ? 's' : ''}) ${hazard.routine}`)
      lines.push('')
    }

    // Actions
    if (hazard.actions?.length) {
      hazard.actions.forEach((action: HazardAction) => {
        const actionCost = formatActionCost(action.actionType)
        let actionLine = `**${action.name}** ${actionCost}`

        if (action.traits?.length) {
          actionLine += ` (${action.traits.join(', ')})`
        }

        if (action.trigger) {
          actionLine += ` **Trigger** ${action.trigger};`
        }

        actionLine += ` **Effect** ${action.effect}`

        if (action.damage) {
          const avg = parseDiceAverage(action.damage)
          let dmgPart = ` Deals ${action.damage}`
          if (action.damageType) dmgPart += ` ${action.damageType}`
          dmgPart += ` damage`
          if (avg) dmgPart += ` (average ${avg})`

          if (action.attackBonus) {
            dmgPart += ` (+${action.attackBonus} attack)`
          } else if (action.dc) {
            const saveType = action.save ? action.save.charAt(0).toUpperCase() + action.save.slice(1) : 'Basic'
            dmgPart += ` (DC ${action.dc} ${saveType})`
          }
          actionLine += dmgPart + '.'
        }

        lines.push(actionLine)
        lines.push('')
      })
    }
  }

  return lines.join('\n').trim()
}

/**
 * Export hazard as JSON
 */
export function exportHazardJSON(hazard: Partial<Hazard>): string {
  // Clean up undefined values
  const clean = JSON.parse(JSON.stringify(hazard))
  return JSON.stringify(clean, null, 2)
}

/**
 * Calculate derived values
 */
export function calculateDerivedValues(hazard: Partial<Hazard>): {
  stealthModifier: number | null
  brokenThreshold: number | null
  damageAverage: number | null
} {
  return {
    stealthModifier: hazard.stealthDC ? hazard.stealthDC - 10 : null,
    brokenThreshold: hazard.hp ? Math.floor(hazard.hp / 2) : null,
    damageAverage: hazard.damage ? parseDiceAverage(hazard.damage) : null
  }
}
