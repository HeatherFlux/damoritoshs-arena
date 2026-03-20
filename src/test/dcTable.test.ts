import { describe, it, expect } from 'vitest'
import { getDCForLevel, getStarshipSceneXP, DC_BY_LEVEL } from '../utils/dcTable'

describe('getDCForLevel', () => {
  it('returns DC 14 for level 0', () => {
    expect(getDCForLevel(0)).toBe(14)
  })

  it('returns DC 15 for level 1', () => {
    expect(getDCForLevel(1)).toBe(15)
  })

  it('returns DC 27 for level 10', () => {
    expect(getDCForLevel(10)).toBe(27)
  })

  it('returns DC 40 for level 20', () => {
    expect(getDCForLevel(20)).toBe(40)
  })

  it('clamps negative levels to 0', () => {
    expect(getDCForLevel(-5)).toBe(14)
  })

  it('clamps levels above 20 to 20', () => {
    expect(getDCForLevel(25)).toBe(40)
  })

  it('covers all levels 0-20', () => {
    for (let level = 0; level <= 20; level++) {
      expect(getDCForLevel(level)).toBe(DC_BY_LEVEL[level])
    }
  })
})

describe('getStarshipSceneXP', () => {
  it('returns 40 XP for same-level threat', () => {
    expect(getStarshipSceneXP(5, 5)).toBe(40)
  })

  it('returns 120 XP for +4 diff', () => {
    expect(getStarshipSceneXP(9, 5)).toBe(120)
  })

  it('returns 10 XP for -4 diff', () => {
    expect(getStarshipSceneXP(1, 5)).toBe(10)
  })

  it('clamps extreme positive diff to +4', () => {
    expect(getStarshipSceneXP(20, 5)).toBe(120)
  })

  it('clamps extreme negative diff to -4', () => {
    expect(getStarshipSceneXP(1, 20)).toBe(10)
  })
})
