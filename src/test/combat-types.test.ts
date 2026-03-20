import { describe, it, expect } from 'vitest'
import {
  getAdjustedHP,
  getAdjustedAC,
  getAdjustedAttack,
  getAdjustedDamage,
} from '../types/combat'

describe('getAdjustedHP', () => {
  it('returns base HP for normal adjustment', () => {
    expect(getAdjustedHP(45, 'normal', 5)).toBe(45)
  })

  it('adds 10 HP for elite at level 1', () => {
    expect(getAdjustedHP(20, 'elite', 1)).toBe(30)
  })

  it('adds 10 HP for elite at level 0', () => {
    expect(getAdjustedHP(10, 'elite', 0)).toBe(20)
  })

  it('adds 15 HP for elite at level 2-4', () => {
    expect(getAdjustedHP(30, 'elite', 2)).toBe(45)
    expect(getAdjustedHP(30, 'elite', 4)).toBe(45)
  })

  it('adds 20 HP for elite at level 5-19', () => {
    expect(getAdjustedHP(50, 'elite', 5)).toBe(70)
    expect(getAdjustedHP(50, 'elite', 19)).toBe(70)
  })

  it('adds 30 HP for elite at level 20+', () => {
    expect(getAdjustedHP(200, 'elite', 20)).toBe(230)
  })

  it('subtracts HP for weak adjustment', () => {
    expect(getAdjustedHP(50, 'weak', 5)).toBe(30) // 50 - 20
  })

  it('enforces minimum 1 HP for weak', () => {
    expect(getAdjustedHP(5, 'weak', 5)).toBe(1) // 5 - 20 → clamped to 1
  })
})

describe('getAdjustedAC', () => {
  it('returns base AC for normal', () => {
    expect(getAdjustedAC(18, 'normal')).toBe(18)
  })

  it('adds 2 for elite', () => {
    expect(getAdjustedAC(18, 'elite')).toBe(20)
  })

  it('subtracts 2 for weak', () => {
    expect(getAdjustedAC(18, 'weak')).toBe(16)
  })
})

describe('getAdjustedAttack', () => {
  it('returns base for normal', () => {
    expect(getAdjustedAttack(12, 'normal')).toBe(12)
  })

  it('adds 2 for elite', () => {
    expect(getAdjustedAttack(12, 'elite')).toBe(14)
  })

  it('subtracts 2 for weak', () => {
    expect(getAdjustedAttack(12, 'weak')).toBe(10)
  })
})

describe('getAdjustedDamage', () => {
  it('returns base damage for normal', () => {
    expect(getAdjustedDamage('2d6+4', 'normal')).toBe('2d6+4')
  })

  it('appends +2 for elite', () => {
    expect(getAdjustedDamage('2d6+4', 'elite')).toBe('2d6+4 +2')
  })

  it('appends -2 for weak', () => {
    expect(getAdjustedDamage('2d6+4', 'weak')).toBe('2d6+4 -2')
  })
})
