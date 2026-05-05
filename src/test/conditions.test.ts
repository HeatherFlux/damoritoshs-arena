import { describe, it, expect } from 'vitest'
import {
  conditionHasValue,
  COMBAT_CONDITIONS,
  CONDITIONS,
  getCondition,
  calculateConditionEffects,
} from '../data/conditions'

describe('conditionHasValue', () => {
  it('returns true for frightened', () => {
    expect(conditionHasValue('frightened')).toBe(true)
  })

  it('returns true for sickened', () => {
    expect(conditionHasValue('sickened')).toBe(true)
  })

  it('returns false for blinded', () => {
    expect(conditionHasValue('blinded')).toBe(false)
  })

  it('returns false for unknown condition', () => {
    expect(conditionHasValue('nonexistent')).toBe(false)
  })

  it('returns true for valued SF2e conditions', () => {
    expect(conditionHasValue('glitching')).toBe(true)
  })
})

describe('COMBAT_CONDITIONS', () => {
  it('is a non-empty array', () => {
    expect(COMBAT_CONDITIONS.length).toBeGreaterThan(0)
  })

  it('includes common conditions', () => {
    expect(COMBAT_CONDITIONS).toContain('frightened')
    expect(COMBAT_CONDITIONS).toContain('prone')
    expect(COMBAT_CONDITIONS).toContain('off-guard')
  })

  it('is alphabetically sorted', () => {
    const sorted = [...COMBAT_CONDITIONS].sort()
    expect([...COMBAT_CONDITIONS]).toEqual(sorted)
  })
})

describe('CONDITIONS', () => {
  it('has expected structure for each entry', () => {
    for (const [_key, def] of Object.entries(CONDITIONS)) {
      expect(def.name).toBeTruthy()
      expect(typeof def.hasValue).toBe('boolean')
      expect(typeof def.description).toBe('string')
      expect(typeof def.shortDescription).toBe('string')
      expect(def.effects).toBeDefined()
    }
  })
})

describe('getCondition', () => {
  it('looks up by lowercase name', () => {
    const cond = getCondition('frightened')
    expect(cond?.name).toBe('Frightened')
    expect(cond?.hasValue).toBe(true)
  })

  it('returns undefined for unknown', () => {
    expect(getCondition('fake-condition')).toBeUndefined()
  })
})

describe('calculateConditionEffects', () => {
  it('returns zeros for empty conditions', () => {
    const result = calculateConditionEffects([])
    expect(result.ac).toBe(0)
    expect(result.perception).toBe(0)
    expect(result.skillChecks).toBe(0)
    expect(result.isOffGuard).toBe(false)
  })

  it('applies off-guard -2 AC', () => {
    const result = calculateConditionEffects([{ name: 'off-guard' }])
    expect(result.isOffGuard).toBe(true)
    expect(result.ac).toBe(-2)
  })

  it('applies frightened value to all checks and AC', () => {
    const result = calculateConditionEffects([{ name: 'frightened', value: 2 }])
    // frightened: allChecksPerValue(-1) applies to AC, perception, attacks, saves, skills
    // AC = -1 * 2 = -2
    expect(result.ac).toBe(-2)
    expect(result.perception).toBe(-2)
    expect(result.attackRolls).toBe(-2)
    expect(result.skillChecks).toBe(-2)
    expect(result.fortitude).toBe(-2)
    expect(result.reflex).toBe(-2)
    expect(result.will).toBe(-2)
  })

  it('stacks multiple conditions', () => {
    const result = calculateConditionEffects([
      { name: 'off-guard' },
      { name: 'frightened', value: 1 },
    ])
    // off-guard: -2 AC (circumstance)
    // frightened 1: allChecksPerValue(-1)*1 = -1 AC
    // Total: -3
    expect(result.ac).toBe(-3)
  })

  it('does not apply off-guard to skillChecks', () => {
    const result = calculateConditionEffects([{ name: 'off-guard' }])
    expect(result.skillChecks).toBe(0)
    expect(result.ac).toBe(-2)
  })

  it('applies sickened to skillChecks', () => {
    const result = calculateConditionEffects([{ name: 'sickened', value: 3 }])
    // sickened has allChecksPerValue(-1), so skillChecks = -3
    expect(result.skillChecks).toBe(-3)
  })

  it('fascinated applies -2 to perception and skills but NOT attacks or saves', () => {
    const result = calculateConditionEffects([{ name: 'fascinated' }])
    expect(result.perception).toBe(-2)
    expect(result.skillChecks).toBe(-2)
    // Should NOT affect these:
    expect(result.attackRolls).toBe(0)
    expect(result.fortitude).toBe(0)
    expect(result.reflex).toBe(0)
    expect(result.will).toBe(0)
    expect(result.ac).toBe(0)
  })

  it('dying does not double-count unconscious penalties', () => {
    // Dying alone should only set cannotAct, not the AC/Perc/Reflex penalties
    const result = calculateConditionEffects([{ name: 'dying', value: 1 }])
    expect(result.cannotAct).toBe(true)
    expect(result.ac).toBe(0) // No AC penalty from dying itself
    expect(result.perception).toBe(0)
    expect(result.reflex).toBe(0)
    expect(result.isOffGuard).toBe(false)
  })

  it('dying + unconscious gives correct combined penalties', () => {
    const result = calculateConditionEffects([
      { name: 'dying', value: 1 },
      { name: 'unconscious' },
    ])
    // Unconscious: -4 AC, -4 Perception, -4 Reflex, off-guard (-2 AC)
    expect(result.ac).toBe(-6) // -4 from unconscious + -2 from off-guard
    expect(result.perception).toBe(-4)
    expect(result.reflex).toBe(-4)
    expect(result.isOffGuard).toBe(true)
    expect(result.cannotAct).toBe(true) // from both
  })

  it('suppressed gives -1 attacks and no off-guard', () => {
    const result = calculateConditionEffects([{ name: 'suppressed' }])
    expect(result.attackRolls).toBe(-1)
    expect(result.isOffGuard).toBe(false)
    expect(result.ac).toBe(0)
  })

  it('encumbered gives flat -1 AC and -1 Reflex (not per-value)', () => {
    const result = calculateConditionEffects([{ name: 'encumbered' }])
    expect(result.ac).toBe(-1)
    expect(result.reflex).toBe(-1)
  })

  it('status-penalty applies to all checks per value', () => {
    const result = calculateConditionEffects([{ name: 'status-penalty', value: 2 }])
    expect(result.ac).toBe(-2)
    expect(result.attackRolls).toBe(-2)
    expect(result.perception).toBe(-2)
    expect(result.skillChecks).toBe(-2)
    expect(result.fortitude).toBe(-2)
  })

  it('circumstance-penalty applies to all checks per value', () => {
    const result = calculateConditionEffects([{ name: 'circumstance-penalty', value: 1 }])
    expect(result.ac).toBe(-1)
    expect(result.attackRolls).toBe(-1)
    expect(result.skillChecks).toBe(-1)
  })

  it('stupefied does not double-count perception', () => {
    const result = calculateConditionEffects([{ name: 'stupefied', value: 2 }])
    // wisChecksPerValue applies to perception and will
    // Should be -2, not -4
    expect(result.perception).toBe(-2)
    expect(result.will).toBe(-2)
  })

  it('clumsy does not double-count AC or Reflex (regression)', () => {
    // Bug: clumsy 1 was applying -2 to AC and Reflex because both
    // acPerValue/reflexPerValue AND dexChecksPerValue were being summed
    // into the same fields. Should be -1 each per value.
    const v1 = calculateConditionEffects([{ name: 'clumsy', value: 1 }])
    expect(v1.ac).toBe(-1)
    expect(v1.reflex).toBe(-1)
    expect(v1.skillChecks).toBe(-1)

    const v3 = calculateConditionEffects([{ name: 'clumsy', value: 3 }])
    expect(v3.ac).toBe(-3)
    expect(v3.reflex).toBe(-3)
    expect(v3.skillChecks).toBe(-3)
  })

  it('drained does not double-count Fortitude (regression)', () => {
    // Same family of bug as clumsy: fortitudePerValue + conChecksPerValue
    // both wrote into result.fortitude.
    const v2 = calculateConditionEffects([{ name: 'drained', value: 2 }])
    expect(v2.fortitude).toBe(-2)
  })
})
