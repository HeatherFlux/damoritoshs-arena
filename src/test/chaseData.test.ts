import { describe, it, expect } from 'vitest'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { AON_VEHICLES, TECH_CORE_VEHICLES, VEHICLES, getVehicleById } from '../data/vehicles'
import { DC_ADJUSTMENTS, SIMPLE_DCS } from '../utils/dcTable'
import oracle from '../../scripts/chase-obstacles-oracle.json'

// The oracle is parsed from the GM Core PDF by scripts/audit-chase.py, independently of the
// hand-transcribed data file.
interface OracleObstacle {
  name: string
  level: number
  environment: string
  base?: string
  options: { dc: number; skills: string[] }[]
}

const ORACLE = oracle as OracleObstacle[]

const KNOWN_CHECKS = new Set([
  'Acrobatics', 'Arcana', 'Athletics', 'Computers', 'Crafting', 'Deception', 'Diplomacy', 'Intimidation',
  'Medicine', 'Nature', 'Occultism', 'Performance', 'Piloting', 'Religion', 'Society', 'Stealth',
  'Survival', 'Thievery', 'Perception', 'Fortitude', 'Reflex', 'Will',
])

describe('sample chase obstacles', () => {
  it('has the 42 obstacles printed in GM Core', () => {
    expect(SAMPLE_CHASE_OBSTACLES).toHaveLength(42)
    expect(ORACLE).toHaveLength(42)
    const count = (env: string) => SAMPLE_CHASE_OBSTACLES.filter(o => o.environment === env).length
    expect([count('underground'), count('urban'), count('vehicle'), count('wilderness')]).toEqual([8, 12, 12, 10])
  })

  it('matches the book record by record', () => {
    const problems: string[] = []
    const byName = new Map(SAMPLE_CHASE_OBSTACLES.map(o => [o.name, o]))
    for (const want of ORACLE) {
      const got = byName.get(want.name)
      if (!got) { problems.push(`missing ${want.name}`); continue }
      if (got.level !== want.level) problems.push(`${want.name}: level ${got.level}, book ${want.level}`)
      if (got.environment !== want.environment) problems.push(`${want.name}: environment ${got.environment}, book ${want.environment}`)
      const base = got.baseId ? SAMPLE_CHASE_OBSTACLES.find(o => o.id === got.baseId)?.name : undefined
      if (base !== want.base) problems.push(`${want.name}: variant of ${base}, book ${want.base}`)
      const gotOptions = got.options.map(o => ({ dc: o.dc, skills: o.skills }))
      if (JSON.stringify(gotOptions) !== JSON.stringify(want.options)) {
        problems.push(`${want.name}: ${JSON.stringify(gotOptions)}, book ${JSON.stringify(want.options)}`)
      }
    }
    const oracleNames = new Set(ORACLE.map(o => o.name))
    for (const o of SAMPLE_CHASE_OBSTACLES) if (!oracleNames.has(o.name)) problems.push(`unexpected ${o.name}`)
    expect(problems).toEqual([])
  })

  it('every obstacle is well formed', () => {
    const problems: string[] = []
    const ids = new Set<string>()
    for (const o of SAMPLE_CHASE_OBSTACLES) {
      if (ids.has(o.id)) problems.push(`duplicate id ${o.id}`)
      ids.add(o.id)
      if (o.options.length < 2) problems.push(`${o.name}: fewer than two approaches`)
      for (const opt of o.options) {
        if (opt.dc < 10 || opt.dc > 40) problems.push(`${o.name}: DC ${opt.dc} out of range`)
        if (!opt.description.trim()) problems.push(`${o.name}: approach without a description`)
        for (const s of opt.skills) if (!KNOWN_CHECKS.has(s)) problems.push(`${o.name}: unknown check ${s}`)
      }
      if (o.baseId) {
        const base = SAMPLE_CHASE_OBSTACLES.find(b => b.id === o.baseId)
        if (!base) problems.push(`${o.name}: base ${o.baseId} not found`)
        else if (base.level >= o.level) problems.push(`${o.name}: not higher level than ${base.name}`)
      }
    }
    expect(problems).toEqual([])
  })
})

describe('vehicle library', () => {
  it('merges Tech Core and Archives of Nethys vehicles without id clashes', () => {
    expect(TECH_CORE_VEHICLES).toHaveLength(30)
    expect(AON_VEHICLES).toHaveLength(13)
    expect(VEHICLES).toHaveLength(43)
    expect(new Set(VEHICLES.map(v => v.id)).size).toBe(43)
    expect(getVehicleById('urban-cruiser')?.name).toBe('Urban Cruiser')
  })

  it('every Archives of Nethys vehicle has the fields a chase needs', () => {
    const problems: string[] = []
    for (const v of AON_VEHICLES) {
      if (!v.pilotingChecks.length) problems.push(`${v.name}: no piloting checks`)
      for (const c of v.pilotingChecks) if (!(c.dc >= 10) || !c.skill) problems.push(`${v.name}: bad piloting check`)
      if (!(v.hp > 0)) problems.push(`${v.name}: hp`)
      if (v.bt === undefined || v.bt !== Math.floor(v.hp / 2)) problems.push(`${v.name}: BT ${v.bt} is not half of ${v.hp}`)
      if (!(v.hardness >= 0)) problems.push(`${v.name}: hardness`)
      if (!(v.ac > 0) || !(v.saves.fort > 0)) problems.push(`${v.name}: defenses`)
      if (!v.collision.damage || !(v.collision.dc > 0)) problems.push(`${v.name}: collision`)
      if (!v.speedText) problems.push(`${v.name}: speed`)
      if (!v.immunities.includes('object immunities')) problems.push(`${v.name}: object immunities`)
      if (!['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(v.size)) problems.push(`${v.name}: size ${v.size}`)
      for (const a of v.abilities) {
        if (!a.name || !a.effect) problems.push(`${v.name}: empty ability`)
        if (/\*\*|\]\(|<\/?[a-z]/.test(a.effect)) problems.push(`${v.name}: markup left in ${a.name}`)
      }
    }
    expect(problems).toEqual([])
  })
})

describe('DC tables', () => {
  it('match GM Core p. 53', () => {
    expect(SIMPLE_DCS).toEqual({ untrained: 10, trained: 15, expert: 20, master: 30, legendary: 40 })
    expect(DC_ADJUSTMENTS).toEqual({
      'incredibly easy': -10, 'very easy': -5, easy: -2, standard: 0, hard: 2, 'very hard': 5, 'incredibly hard': 10,
    })
  })
})
