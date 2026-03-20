import { describe, it, expect } from 'vitest'
import {
  getCreatureXP,
  getAdjustedBudget,
  getDifficulty,
  calculateEncounterXP,
} from '../types/encounter'
import { makeCreature, makeHazard } from './fixtures'

describe('getCreatureXP', () => {
  it.each([
    [-4, 10],
    [-3, 15],
    [-2, 20],
    [-1, 30],
    [0, 40],
    [1, 60],
    [2, 80],
    [3, 120],
    [4, 160],
  ])('returns %i XP for level diff %i', (diff, expected) => {
    expect(getCreatureXP(diff)).toBe(expected)
  })

  it('clamps -5 to -4 (returns 10)', () => {
    expect(getCreatureXP(-5)).toBe(10)
  })

  it('clamps +5 to +4 (returns 160)', () => {
    expect(getCreatureXP(5)).toBe(160)
  })

  it('clamps extreme negative values', () => {
    expect(getCreatureXP(-10)).toBe(10)
  })
})

describe('getAdjustedBudget', () => {
  it('returns base budget for party of 4', () => {
    expect(getAdjustedBudget(4, 80)).toBe(80)
  })

  it('adds 40 for party of 6', () => {
    expect(getAdjustedBudget(6, 80)).toBe(120)
  })

  it('subtracts 20 for party of 3', () => {
    expect(getAdjustedBudget(3, 80)).toBe(60)
  })

  it('adds 20 per player above 4', () => {
    expect(getAdjustedBudget(5, 80)).toBe(100)
  })
})

describe('getDifficulty', () => {
  it('returns trivial for 0 XP', () => {
    expect(getDifficulty(0, 4)).toBe('trivial')
  })

  it('returns trivial for exactly 40 XP', () => {
    expect(getDifficulty(40, 4)).toBe('trivial')
  })

  it('returns low for 60 XP', () => {
    expect(getDifficulty(60, 4)).toBe('low')
  })

  it('returns moderate for 80 XP', () => {
    expect(getDifficulty(80, 4)).toBe('moderate')
  })

  it('returns severe for 120 XP', () => {
    expect(getDifficulty(120, 4)).toBe('severe')
  })

  it('returns extreme for 160 XP', () => {
    expect(getDifficulty(160, 4)).toBe('extreme')
  })

  it('adjusts thresholds for party of 6', () => {
    // Moderate threshold for 6 players: 80 + 2*20 = 120
    // So 100 XP should be low for party of 6
    expect(getDifficulty(100, 6)).toBe('low')
  })
})

describe('calculateEncounterXP', () => {
  it('returns 0 XP for empty encounter', () => {
    const result = calculateEncounterXP([], 5, 4)
    expect(result.totalXP).toBe(0)
    expect(result.creatureXP).toBe(0)
    expect(result.hazardXP).toBe(0)
  })

  it('returns 40 XP for creature at party level', () => {
    const creature = makeCreature({ level: 5 })
    const result = calculateEncounterXP(
      [{ creature, count: 1, adjustment: 'normal' }],
      5, 4
    )
    expect(result.totalXP).toBe(40)
    expect(result.difficulty).toBe('trivial')
  })

  it('doubles XP for 2 creatures', () => {
    const creature = makeCreature({ level: 5 })
    const result = calculateEncounterXP(
      [{ creature, count: 2, adjustment: 'normal' }],
      5, 4
    )
    expect(result.totalXP).toBe(80)
  })

  it('applies elite adjustment (+1 level)', () => {
    const creature = makeCreature({ level: 5 })
    const result = calculateEncounterXP(
      [{ creature, count: 1, adjustment: 'elite' }],
      5, 4
    )
    // Elite +1 level → diff = 1 → 60 XP
    expect(result.totalXP).toBe(60)
    expect(result.creatureBreakdown[0].effectiveLevel).toBe(6)
  })

  it('applies weak adjustment (-1 level)', () => {
    const creature = makeCreature({ level: 5 })
    const result = calculateEncounterXP(
      [{ creature, count: 1, adjustment: 'weak' }],
      5, 4
    )
    // Weak -1 level → diff = -1 → 30 XP
    expect(result.totalXP).toBe(30)
  })

  it('combines creature and hazard XP', () => {
    const creature = makeCreature({ level: 5 })
    const hazard = makeHazard({ level: 5, complexity: 'simple' })
    const result = calculateEncounterXP(
      [{ creature, count: 1, adjustment: 'normal' }],
      5, 4,
      [{ hazard, count: 1 }]
    )
    // Creature: 40 XP, Simple hazard at level: 8 XP
    expect(result.creatureXP).toBe(40)
    expect(result.hazardXP).toBe(8)
    expect(result.totalXP).toBe(48)
  })

  it('includes breakdown for each creature entry', () => {
    const c1 = makeCreature({ level: 3, name: 'Goblin' })
    const c2 = makeCreature({ level: 7, name: 'Dragon' })
    const result = calculateEncounterXP(
      [
        { creature: c1, count: 2, adjustment: 'normal' },
        { creature: c2, count: 1, adjustment: 'normal' },
      ],
      5, 4
    )
    expect(result.creatureBreakdown).toHaveLength(2)
    expect(result.creatureBreakdown[0].count).toBe(2)
    expect(result.creatureBreakdown[1].count).toBe(1)
  })
})
