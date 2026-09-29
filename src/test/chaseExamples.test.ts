import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('location', { ...window.location, hash: '' })

vi.mock('../utils/discordIntegration', () => ({
  sendTurnChange: vi.fn().mockResolvedValue(undefined),
  initDiscordIntegration: vi.fn(),
  destroyDiscordIntegration: vi.fn(),
}))

import { EXAMPLE_CHASES } from '../data/chaseExamples'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { OBSTACLES_BY_LENGTH, checkOutcome, createSceneFromSaved, defaultSetup } from '../utils/chaseRules'
import { useChaseStore, __resetChaseStore } from '../stores/chaseStore'

const KNOWN_CHECKS = new Set([
  'Acrobatics', 'Arcana', 'Athletics', 'Computers', 'Crafting', 'Deception', 'Diplomacy', 'Intimidation',
  'Medicine', 'Nature', 'Occultism', 'Performance', 'Piloting', 'Religion', 'Society', 'Stealth',
  'Survival', 'Thievery', 'Perception', 'Fortitude', 'Reflex', 'Will',
])

describe('example chases', () => {
  beforeEach(() => {
    __resetChaseStore()
  })

  it('has one example for each type of chase, named after it', () => {
    expect(EXAMPLE_CHASES.map(c => [c.type, c.name])).toEqual([
      ['chase-down', 'Chase Down Example'],
      ['run-away', 'Run Away Example'],
      ['beat-the-clock', 'Beat the Clock Example'],
      ['competitive', 'Competitive Chase Example'],
    ])
    expect(EXAMPLE_CHASES.every(c => c.isExample)).toBe(true)
    expect(new Set(EXAMPLE_CHASES.map(c => c.id)).size).toBe(4)
  })

  it('every example is complete and follows the rules for its type', () => {
    const problems: string[] = []
    for (const chase of EXAMPLE_CHASES) {
      const at = (msg: string) => problems.push(`${chase.name}: ${msg}`)
      if (chase.obstacles.length !== OBSTACLES_BY_LENGTH.short) at(`${chase.obstacles.length} obstacles, a short chase has 6`)
      if (chase.length !== 'short') at(`length ${chase.length}`)
      if (!chase.description.trim()) at('no description')
      if (!chase.roundLength.trim()) at('no round length')

      const setup = defaultSetup(chase.type, chase.obstacles.length)
      if (JSON.stringify(chase.end) !== JSON.stringify(setup.end)) at('end conditions differ from the defaults for its type')
      const shape = (sides: typeof chase.sides) => sides.map(s => [s.role, s.control, s.position, s.isPlayers, s.pace])
      if (JSON.stringify(shape(chase.sides)) !== JSON.stringify(shape(setup.sides))) at('sides differ from the defaults for its type')
      if (chase.sides.filter(s => s.isPlayers).length !== 1) at('needs exactly one party side')
      if (chase.sides.some(s => !s.name.trim())) at('a side has no name')

      const ids = new Set<string>()
      chase.obstacles.forEach((o, i) => {
        const where = `obstacle ${i + 1} (${o.name})`
        if (ids.has(o.id)) at(`${where}: duplicate id`)
        ids.add(o.id)
        if (!o.name.trim()) at(`${where}: no name`)
        if (!o.description.trim()) at(`${where}: nothing for the players to read`)
        if (o.revealedToPlayers) at(`${where}: starts face up`)
        // Party of four: 3 Chase Points, then 2, in turn
        if (o.chasePoints !== (i % 2 === 0 ? 3 : 2)) at(`${where}: ${o.chasePoints} Chase Points`)
        if (o.options.length < 2) at(`${where}: fewer than two approaches`)
        const skillSets = o.options.map(opt => opt.skills.join('+'))
        if (new Set(skillSets).size !== skillSets.length) at(`${where}: two approaches use the same skills`)
        for (const opt of o.options) {
          if (opt.dc === undefined || opt.dc < 10 || opt.dc > 20) at(`${where}: DC ${opt.dc} is off for a 1st-level party`)
          if (!opt.description.trim()) at(`${where}: approach without a description`)
          if (opt.skills.length === 0) at(`${where}: approach without a skill`)
          for (const s of opt.skills) if (!KNOWN_CHECKS.has(s)) at(`${where}: unknown check ${s}`)
        }
        if (o.level > 2) at(`${where}: level ${o.level}`)
      })
    }
    expect(problems).toEqual([])
  })

  it('uses GM Core sample obstacles exactly as printed', () => {
    const problems: string[] = []
    let fromBook = 0
    for (const chase of EXAMPLE_CHASES) {
      for (const o of chase.obstacles) {
        if (!o.sampleId) {
          if (SAMPLE_CHASE_OBSTACLES.some(s => s.name === o.name)) problems.push(`${chase.name}: ${o.name} shares a name with a book obstacle but is not linked to it`)
          continue
        }
        fromBook++
        const sample = SAMPLE_CHASE_OBSTACLES.find(s => s.id === o.sampleId)
        if (!sample) { problems.push(`${chase.name}: ${o.name} points at unknown sample ${o.sampleId}`); continue }
        const mine = o.options.map(x => [x.dc, x.skills, x.description])
        const book = sample.options.map(x => [x.dc, x.skills, x.description])
        if (o.name !== sample.name || o.level !== sample.level || JSON.stringify(mine) !== JSON.stringify(book)) {
          problems.push(`${chase.name}: ${o.name} differs from the book`)
        }
      }
    }
    expect(problems).toEqual([])
    expect(fromBook).toBeGreaterThan(0)
  })

  it('attaches real vehicles at full Hit Points', () => {
    const attached = EXAMPLE_CHASES.flatMap(c => c.sides.flatMap(s => s.vehicles.map(v => ({ chase: c.name, side: s.name, v }))))
    expect(attached.map(a => [a.chase, a.side, a.v.vehicle.name])).toEqual([
      ['Chase Down Example', 'Courier', 'Enercycle'],
      ['Chase Down Example', 'Party', 'Urban Cruiser'],
      ['Run Away Example', 'Party', 'Hoverboard'],
      ['Competitive Chase Example', 'Party', 'Enercycle'],
      ['Competitive Chase Example', 'Rival Crew', 'Enercycle'],
    ])
    expect(attached.every(a => a.v.currentHP === a.v.vehicle.hp && !a.v.uncontrolled)).toBe(true)
  })

  it('every example starts without an ending already met', () => {
    for (const chase of EXAMPLE_CHASES) {
      expect(checkOutcome(createSceneFromSaved(chase), false), chase.name).toBeNull()
    }
  })

  it('every example runs in the tracker', () => {
    const store = useChaseStore()
    for (const chase of EXAMPLE_CHASES) {
      store.startChase(chase)
      const scene = store.state.activeScene!
      const party = scene.sides.find(s => s.isPlayers)!
      store.addMember(party.id, 'Iseph')
      const start = party.position
      for (let i = 0; i < 3; i++) store.resolveCheck(party.id, party.members[0].id, 'success')
      expect(party.position, chase.name).toBe(start + 1)
      store.endRound()
      expect(scene.log.length, chase.name).toBeGreaterThan(3)
      store.endChase()
    }
  })

  it('starting an example leaves the bundled copy untouched', () => {
    const before = JSON.stringify(EXAMPLE_CHASES)
    const store = useChaseStore()
    store.startChase(EXAMPLE_CHASES[0])
    const scene = store.state.activeScene!
    store.damageVehicle(scene.sides[0].vehicles[0].instanceId, 50)
    scene.obstacles[0].name = 'Changed'
    expect(JSON.stringify(EXAMPLE_CHASES)).toBe(before)
  })
})
