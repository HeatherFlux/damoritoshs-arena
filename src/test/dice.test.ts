import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  rollD20,
  rollDamage,
  rollFlat,
  formatModifier,
  getRecallKnowledgeDCs,
  getRecallKnowledgeSkill,
  getRollHistory,
  clearRollHistory,
  deleteRoll,
  exportToDiscord,
  exportToFoundry,
  exportToPlainText,
  exportToJSON,
} from '../utils/dice'

beforeEach(() => {
  clearRollHistory()
  vi.restoreAllMocks()
})

describe('rollD20', () => {
  it('returns roll + modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // floor(0.5*20)+1 = 11
    const result = rollD20(5, 'Perception', 'Goblin')
    expect(result.roll).toBe(11)
    expect(result.modifier).toBe(5)
    expect(result.total).toBe(16)
    expect(result.name).toBe('Perception')
    expect(result.source).toBe('Goblin')
  })

  it('detects nat 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95) // floor(0.95*20)+1 = 20
    const result = rollD20(0, 'Test')
    expect(result.roll).toBe(20)
    expect(result.isNat20).toBe(true)
    expect(result.isNat1).toBe(false)
  })

  it('detects nat 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // floor(0.0*20)+1 = 1
    const result = rollD20(0, 'Test')
    expect(result.roll).toBe(1)
    expect(result.isNat1).toBe(true)
    expect(result.isNat20).toBe(false)
  })

  it('adds to roll history', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    rollD20(0, 'Test')
    expect(getRollHistory()).toHaveLength(1)
  })

  it('includes breakdown string', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollD20(3, 'Attack')
    expect(result.breakdown).toContain('1d20')
    expect(result.breakdown).toContain('11')
  })
})

describe('rollDamage', () => {
  it('parses "2d6+4" correctly', () => {
    // Two dice rolls: first 0.5 → 4, second 0.5 → 4
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollDamage('2d6+4', 'Longsword', 'Fighter')
    expect(result.modifier).toBe(4)
    expect(result.individualRolls).toHaveLength(2)
    expect(result.total).toBe(result.roll + result.modifier)
    expect(result.type).toBe('damage')
  })

  it('parses "1d8" with no modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollDamage('1d8', 'Dagger')
    expect(result.modifier).toBe(0)
    expect(result.individualRolls).toHaveLength(1)
  })

  it('parses damage type from "2d6+4 fire"', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollDamage('2d6+4 fire', 'Fireball')
    expect(result.damageType).toBe('fire')
  })

  it('doubles dice and modifier on crit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollDamage('2d6+4', 'Sword', 'Fighter', true)
    expect(result.individualRolls).toHaveLength(4) // 2*2 = 4 dice
    expect(result.modifier).toBe(8) // 4*2
    expect(result.isCriticalHit).toBe(true)
    expect(result.name).toContain('CRIT')
  })

  it('returns fallback for unparseable expression', () => {
    const result = rollDamage('unparseable', 'Bad')
    expect(result.total).toBe(0)
    expect(result.breakdown).toContain('Could not parse')
  })
})

describe('rollFlat', () => {
  it('rolls vs DC', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // roll = 11
    const result = rollFlat(15, 'Recovery')
    expect(result.roll).toBe(11)
    expect(result.total).toBe(11)
    expect(result.modifier).toBe(0)
    expect(result.breakdown).toContain('DC 15')
  })

  it('detects critical success at roll >= dc + 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95) // roll = 20
    const result = rollFlat(10, 'Test')
    expect(result.isCriticalSuccess).toBe(true)
  })

  it('detects critical success on nat 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95)
    const result = rollFlat(20, 'Test')
    expect(result.isNat20).toBe(true)
    expect(result.isCriticalSuccess).toBe(true)
  })

  it('detects critical failure on nat 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const result = rollFlat(10, 'Test')
    expect(result.isNat1).toBe(true)
    expect(result.isCriticalFailure).toBe(true)
  })
})

describe('formatModifier', () => {
  it('formats positive numbers with +', () => {
    expect(formatModifier(5)).toBe('+5')
  })

  it('formats negative numbers with -', () => {
    expect(formatModifier(-3)).toBe('-3')
  })

  it('formats zero as +0', () => {
    expect(formatModifier(0)).toBe('+0')
  })
})

describe('getRecallKnowledgeDCs', () => {
  it('calculates base DC as 14 + level', () => {
    const dcs = getRecallKnowledgeDCs(5)
    expect(dcs.standard).toBe(19)
    expect(dcs.unspecific).toBe(17)
    expect(dcs.specific).toBe(14)
  })

  it('adds +2 for uncommon', () => {
    const dcs = getRecallKnowledgeDCs(5, 'uncommon')
    expect(dcs.standard).toBe(21)
  })

  it('adds +5 for rare', () => {
    const dcs = getRecallKnowledgeDCs(5, 'rare')
    expect(dcs.standard).toBe(24)
  })

  it('adds +10 for unique', () => {
    const dcs = getRecallKnowledgeDCs(5, 'unique')
    expect(dcs.standard).toBe(29)
  })

  it('specific is standard - 5', () => {
    const dcs = getRecallKnowledgeDCs(10)
    expect(dcs.specific).toBe(dcs.standard - 5)
  })
})

describe('getRecallKnowledgeSkill', () => {
  it('returns Nature for beast', () => {
    expect(getRecallKnowledgeSkill(['Beast'])).toBe('Nature')
  })

  it('returns Crafting for construct', () => {
    expect(getRecallKnowledgeSkill(['Construct'])).toBe('Crafting')
  })

  it('returns Religion for undead', () => {
    expect(getRecallKnowledgeSkill(['Undead'])).toBe('Religion')
  })

  it('returns Society for humanoid', () => {
    expect(getRecallKnowledgeSkill(['Humanoid'])).toBe('Society')
  })

  it('returns Arcana as default', () => {
    expect(getRecallKnowledgeSkill(['Unknown'])).toBe('Arcana')
  })

  it('is case insensitive', () => {
    expect(getRecallKnowledgeSkill(['BEAST'])).toBe('Nature')
  })
})

describe('roll history', () => {
  it('starts empty', () => {
    expect(getRollHistory()).toHaveLength(0)
  })

  it('accumulates rolls', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    rollD20(0, 'A')
    rollD20(0, 'B')
    expect(getRollHistory()).toHaveLength(2)
  })

  it('clearRollHistory empties it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    rollD20(0, 'Test')
    clearRollHistory()
    expect(getRollHistory()).toHaveLength(0)
  })

  it('deleteRoll removes a specific roll', () => {
    // Use unique random values so IDs differ
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return (callCount % 20) / 20
    })
    const r1 = rollD20(0, 'A')
    rollD20(0, 'B')
    expect(getRollHistory()).toHaveLength(2)
    deleteRoll(r1.id)
    const history = getRollHistory()
    expect(history).toHaveLength(1)
    expect(history[0].name).toBe('B')
  })
})

describe('export formats', () => {
  it('exportToDiscord includes source and name', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const roll = rollD20(5, 'Perception', 'Goblin')
    const text = exportToDiscord(roll)
    expect(text).toContain('Goblin')
    expect(text).toContain('Perception')
  })

  it('exportToFoundry produces /r command', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const roll = rollD20(5, 'Attack', 'Fighter')
    const text = exportToFoundry(roll)
    expect(text).toMatch(/^\/r 1d20/)
  })

  it('exportToPlainText includes total', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const roll = rollD20(3, 'Test', 'Source')
    const text = exportToPlainText(roll)
    expect(text).toContain(String(roll.total))
  })

  it('exportToJSON is valid JSON', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const roll = rollD20(0, 'Test')
    const json = exportToJSON(roll)
    expect(() => JSON.parse(json)).not.toThrow()
  })
})
