import { describe, it, expect } from 'vitest'
import creatures from '../data/creatures.json'

interface Attack {
  name: string
  type: string
  bonus: number
  damage: string
}

interface SpecialAbility {
  name: string
  actions: string | number | null | undefined
  description: string
}

interface Creature {
  id: string
  name: string
  level: number
  source: string
  hp: number
  ac: number
  attacks: Attack[]
  specialAbilities: SpecialAbility[]
}

const data = creatures as unknown as Creature[]

// Common stock abilities that the parser MUST always populate descriptions for.
// If any of these end up empty, the stock-ability lookup or its trigger logic
// regressed. Add new entries here as they're added to STOCK_ABILITIES.
const STOCK_ABILITY_NAMES = new Set([
  'Reactive Strike',
  'Shield Block',
  'Four-Armed',
  'Exigency',
  'Attack of Opportunity',
  'Ferocity',
])

describe('creature data invariants — full scan of every creature', () => {
  it('has at least 270 creatures', () => {
    expect(data.length).toBeGreaterThanOrEqual(270)
  })

  it('no special ability description starts with malformed punctuation', () => {
    // Was 143 broken cases before fix; baseline must stay 0.
    const issues: string[] = []
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (a.description && /^[)\],;]/.test(a.description)) {
          issues.push(`${c.name} :: ${a.name}: "${a.description.slice(0, 60)}"`)
        }
      }
    }
    expect(issues, `Malformed descriptions found:\n${issues.join('\n')}`).toEqual([])
  })

  it('no special ability description starts with another ability name leaking in', () => {
    // The Four-Armed bug: "**Shield Block** Custom block effect" appearing as
    // Four-Armed's description means the parser ate the next ability's content.
    // Sub-section markers like **Trigger**, **Effect**, **Frequency**,
    // **Requirements**, **Critical Success**, etc. are legitimate parts of an
    // ability description and not leakage.
    const validSubSections = new Set([
      'trigger', 'effect', 'frequency', 'requirements', 'requirement',
      'critical success', 'success', 'failure', 'critical failure',
      'special', 'note',
    ])
    const issues: string[] = []
    for (const c of data) {
      const abilityNamesLower = new Set(c.specialAbilities.map(a => a.name.toLowerCase()))
      for (const a of c.specialAbilities) {
        if (!a.description) continue
        const boldStart = a.description.match(/^\*\*([^*]+)\*\*/)
        if (boldStart) {
          const bolded = boldStart[1].toLowerCase().trim()
          // It's leakage if the bolded thing at the start matches another
          // ability's name in this same creature.
          if (abilityNamesLower.has(bolded) && bolded !== a.name.toLowerCase()) {
            issues.push(`${c.name} :: ${a.name}: leaks "${boldStart[1]}"`)
          }
          // Also flag if it's not a recognized sub-section (suggests something else odd)
          else if (!validSubSections.has(bolded) && !abilityNamesLower.has(bolded)) {
            // Don't fail — sub-sections vary. Just flag for awareness.
          }
        }
        if (/^\[[^\]]+\]\(/.test(a.description)) {
          issues.push(`${c.name} :: ${a.name}: starts with raw markdown link`)
        }
      }
    }
    expect(issues, `Description leakage:\n${issues.join('\n')}`).toEqual([])
  })

  it('no attack name also appears as a special ability (case-insensitive)', () => {
    // creature_ability often lists attack names; parser should drop them.
    const issues: string[] = []
    for (const c of data) {
      const attackNames = new Set(c.attacks.map(a => a.name.toLowerCase()))
      for (const a of c.specialAbilities) {
        if (attackNames.has(a.name.toLowerCase())) {
          issues.push(`${c.name} :: "${a.name}" is both attack and ability`)
        }
      }
    }
    expect(issues, `Attack/ability collisions:\n${issues.join('\n')}`).toEqual([])
  })

  it('no special ability description is degenerately short', () => {
    // Anything under 5 chars (and non-empty) suggests a parser failure.
    const issues: string[] = []
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (a.description && a.description.length > 0 && a.description.length < 5) {
          issues.push(`${c.name} :: ${a.name}: "${a.description}"`)
        }
      }
    }
    expect(issues, `Suspiciously short descriptions:\n${issues.join('\n')}`).toEqual([])
  })

  it('all listed stock abilities have non-empty descriptions', () => {
    const issues: string[] = []
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (STOCK_ABILITY_NAMES.has(a.name) && !a.description) {
          issues.push(`${c.name} :: ${a.name} (stock ability with empty description)`)
        }
      }
    }
    expect(issues, `Stock abilities missing descriptions:\n${issues.join('\n')}`).toEqual([])
  })

  it('special ability descriptions never contain raw HTML tags', () => {
    const issues: string[] = []
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (a.description && /<[a-z][^>]*>/i.test(a.description)) {
          issues.push(`${c.name} :: ${a.name}: contains HTML "${a.description.match(/<[a-z][^>]*>/i)?.[0]}"`)
        }
      }
    }
    expect(issues, `HTML tags in descriptions:\n${issues.join('\n')}`).toEqual([])
  })

  it('all special ability descriptions are 500 chars or fewer (parser truncates)', () => {
    for (const c of data) {
      for (const a of c.specialAbilities) {
        expect(a.description.length, `${c.name} :: ${a.name}`).toBeLessThanOrEqual(500)
      }
    }
  })

  it('every Area Fire attack has type "area" and bonus 0', () => {
    for (const c of data) {
      for (const a of c.attacks) {
        if (a.type === 'area') {
          expect(a.bonus, `${c.name} :: ${a.name}`).toBe(0)
        }
      }
    }
  })

  it('at least 10 creatures have area attacks (regression guard for Area Fire support)', () => {
    const withArea = data.filter(c => c.attacks.some(a => a.type === 'area'))
    expect(withArea.length).toBeGreaterThan(10)
  })

  it('every attack has all required fields (name, type, bonus, damage)', () => {
    for (const c of data) {
      for (const a of c.attacks) {
        expect(typeof a.name, `${c.name}`).toBe('string')
        expect(a.name.length, `${c.name}`).toBeGreaterThan(0)
        expect(['melee', 'ranged', 'area'], `${c.name} :: ${a.name}`).toContain(a.type)
        expect(typeof a.bonus, `${c.name} :: ${a.name}`).toBe('number')
        expect(typeof a.damage, `${c.name} :: ${a.name}`).toBe('string')
      }
    }
  })

  it('every creature has valid level, hp, ac, and source', () => {
    for (const c of data) {
      expect(typeof c.level, c.name).toBe('number')
      expect(typeof c.hp, c.name).toBe('number')
      expect(c.hp, c.name).toBeGreaterThan(0)
      expect(typeof c.ac, c.name).toBe('number')
      expect(typeof c.source, c.name).toBe('string')
      expect(c.source.length, c.name).toBeGreaterThan(0)
    }
  })

  it('special ability names are non-empty and reasonably sized', () => {
    for (const c of data) {
      for (const a of c.specialAbilities) {
        expect(a.name, c.name).toBeTruthy()
        expect(a.name.length, c.name).toBeGreaterThan(0)
        expect(a.name.length, c.name).toBeLessThanOrEqual(80)
      }
    }
  })

  it('no special ability has both empty description AND no actions', () => {
    // Such entries are noise — the parser is supposed to drop them.
    const issues: string[] = []
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (!a.description && a.actions === undefined) {
          issues.push(`${c.name} :: ${a.name} (no description, no actions)`)
        }
      }
    }
    expect(issues, `Useless empty ability entries:\n${issues.join('\n')}`).toEqual([])
  })

  it('Aeon Guard Trooper variants are both preserved with correct demarcation', () => {
    // Bug 5: when multiple AoN entries share a name, both are kept; non-Alien-Core
    // ones get the source name appended.
    const variants = data.filter(c => /aeon guard trooper/i.test(c.name))
    expect(variants.length).toBeGreaterThanOrEqual(2)

    const alienCore = variants.find(c => c.source === 'Alien Core')
    const others = variants.filter(c => c.source !== 'Alien Core')

    expect(alienCore, 'Alien Core variant should exist').toBeDefined()
    expect(alienCore!.name, 'Alien Core variant keeps the plain name').toBe('Aeon Guard Trooper')
    for (const v of others) {
      expect(v.name, `Non-Alien-Core variant must include source: ${v.source}`).toContain(`(${v.source})`)
    }
  })

  it('regression: empty descriptions count stays at most 5 across all creatures', () => {
    // Was 75 before the parser fix. Setting a generous ceiling so future creature
    // additions don't fail this; lowering the bar would catch obvious regressions.
    let emptyCount = 0
    for (const c of data) {
      for (const a of c.specialAbilities) {
        if (!a.description) emptyCount++
      }
    }
    expect(emptyCount).toBeLessThanOrEqual(5)
  })
})
