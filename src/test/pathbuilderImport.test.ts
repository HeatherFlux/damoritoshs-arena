import { describe, it, expect } from 'vitest'
import {
  getAbilityModifier,
  getClassHP,
  parsePathbuilderJSON,
} from '../utils/pathbuilderImport'
import { makePathbuilderJSON } from './fixtures'

describe('getAbilityModifier', () => {
  it('returns 0 for score 10', () => {
    expect(getAbilityModifier(10)).toBe(0)
  })

  it('returns +4 for score 18', () => {
    expect(getAbilityModifier(18)).toBe(4)
  })

  it('returns -1 for score 8', () => {
    expect(getAbilityModifier(8)).toBe(-1)
  })

  it('returns -5 for score 1', () => {
    expect(getAbilityModifier(1)).toBe(-5)
  })

  it('returns 0 for score 11', () => {
    expect(getAbilityModifier(11)).toBe(0)
  })

  it('returns +2 for score 14', () => {
    expect(getAbilityModifier(14)).toBe(2)
  })
})

describe('getClassHP', () => {
  it('returns 10 for soldier', () => {
    expect(getClassHP('soldier')).toBe(10)
  })

  it('returns 6 for wizard', () => {
    expect(getClassHP('wizard')).toBe(6)
  })

  it('is case insensitive', () => {
    expect(getClassHP('SOLDIER')).toBe(10)
    expect(getClassHP('Wizard')).toBe(6)
  })

  it('returns 8 as default for unknown classes', () => {
    expect(getClassHP('unknownclass')).toBe(8)
  })

  it('looks up SF2e classes first', () => {
    expect(getClassHP('operative')).toBe(8)
    expect(getClassHP('solarian')).toBe(10)
  })

  it('looks up PF2e classes', () => {
    expect(getClassHP('barbarian')).toBe(12)
    expect(getClassHP('psychic')).toBe(6)
  })
})

describe('parsePathbuilderJSON', () => {
  it('fails on invalid JSON', () => {
    const result = parsePathbuilderJSON('not json')
    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Invalid JSON')
  })

  it('fails on missing success/build fields', () => {
    const result = parsePathbuilderJSON(JSON.stringify({ foo: 'bar' }))
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('valid Pathbuilder')
  })

  it('fails when success is false', () => {
    const data = { success: false, build: { name: 'Test', level: 1 } }
    const result = parsePathbuilderJSON(JSON.stringify(data))
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('reported an error')
  })

  it('fails on missing name', () => {
    const data = { success: true, build: { name: '', level: 1 } }
    const result = parsePathbuilderJSON(JSON.stringify(data))
    expect(result.success).toBe(false)
  })

  it('fails on invalid level', () => {
    const data = { success: true, build: { name: 'Test', level: 0 } }
    const result = parsePathbuilderJSON(JSON.stringify(data))
    expect(result.success).toBe(false)
  })

  it('successfully parses a valid character', () => {
    const result = parsePathbuilderJSON(makePathbuilderJSON())
    expect(result.success).toBe(true)
    expect(result.combatant).toBeDefined()
    expect(result.combatant!.name).toBe('Zephyr Windwalker')
    expect(result.combatant!.isPlayer).toBe(true)
    expect(result.combatant!.ac).toBe(22)
  })

  it('populates characterSummary', () => {
    const result = parsePathbuilderJSON(makePathbuilderJSON())
    expect(result.characterSummary).toBeDefined()
    expect(result.characterSummary!.name).toBe('Zephyr Windwalker')
    expect(result.characterSummary!.level).toBe(5)
    expect(result.characterSummary!.class).toBe('Soldier')
    expect(result.characterSummary!.ancestry).toBe('Human')
  })

  it('calculates HP correctly', () => {
    const result = parsePathbuilderJSON(makePathbuilderJSON())
    // HP = ancestryhp(8) + (classhp(10) + conMod(2) + bonushpPerLevel(0)) * level(5) + bonushp(0)
    // = 8 + (10 + 2 + 0) * 5 + 0 = 8 + 60 = 68
    expect(result.combatant!.maxHP).toBe(68)
  })

  it('adds warnings for missing optional fields', () => {
    const json = makePathbuilderJSON({
      class: '',
      ancestry: '',
    })
    // We need to patch the JSON to have empty class/ancestry
    const data = JSON.parse(json)
    data.build.class = ''
    data.build.ancestry = ''
    const result = parsePathbuilderJSON(JSON.stringify(data))
    expect(result.success).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('calculates saves from proficiencies', () => {
    const result = parsePathbuilderJSON(makePathbuilderJSON())
    expect(result.combatant!.fortitude).toBeDefined()
    expect(result.combatant!.reflex).toBeDefined()
    expect(result.combatant!.will).toBeDefined()
    expect(result.combatant!.perception).toBeDefined()
  })
})
