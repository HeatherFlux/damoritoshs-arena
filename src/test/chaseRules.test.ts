import { describe, it, expect } from 'vitest'
import {
  OBSTACLES_BY_LENGTH,
  applyChasePoints,
  applyVehicleDamage,
  chasePointsForDegree,
  checkOutcome,
  createEmptyChase,
  createEmptyObstacle,
  createSceneFromSaved,
  createVehicleInstance,
  defaultSetup,
  effectiveVehicleStats,
  isBroken,
  isDestroyed,
  lengthForCount,
  moveSide,
  repairVehicle,
  suggestedChasePoints,
  turnOrder,
  vehicleCondition,
} from '../utils/chaseRules'
import type { ChaseScene, ChaseType } from '../types/chase'
import { getVehicleById } from '../data/vehicles'

function scene(type: ChaseType, obstacles = 6, points = 3): ChaseScene {
  const saved = createEmptyChase(type)
  saved.obstacles = Array.from({ length: obstacles }, (_, i) => ({ ...createEmptyObstacle(1, points), name: `Obstacle ${i + 1}` }))
  const setup = defaultSetup(type, obstacles)
  saved.sides = setup.sides
  saved.end = setup.end
  return createSceneFromSaved(saved)
}

const players = (s: ChaseScene) => s.sides.find(x => x.isPlayers)!
const others = (s: ChaseScene) => s.sides.find(x => !x.isPlayers)!

describe('Chase Points', () => {
  it('follows the four degrees of success', () => {
    expect(chasePointsForDegree('criticalSuccess')).toBe(2)
    expect(chasePointsForDegree('success')).toBe(1)
    expect(chasePointsForDegree('failure')).toBe(0)
    expect(chasePointsForDegree('criticalFailure')).toBe(-1)
  })

  it('never drops below 0', () => {
    const s = scene('run-away')
    applyChasePoints(s, players(s), -1)
    expect(players(s).chasePoints).toBe(0)
    applyChasePoints(s, players(s), 1)
    applyChasePoints(s, players(s), -5)
    expect(players(s).chasePoints).toBe(0)
  })

  it('moves on at the requirement and does not carry extra points over', () => {
    const s = scene('run-away', 6, 3)
    applyChasePoints(s, players(s), 2)
    expect(players(s).position).toBe(0)
    const result = applyChasePoints(s, players(s), 2)
    expect(result.advanced).toBe(true)
    expect(result.overcame?.name).toBe('Obstacle 1')
    expect(players(s).position).toBe(1)
    expect(players(s).chasePoints).toBe(0)
  })

  it('suggests party size minus 1 and minus 2 in turn, never below 1', () => {
    const table: Record<number, number[]> = { 1: [1, 1], 2: [1, 1], 3: [2, 1], 4: [3, 2], 5: [4, 3], 6: [5, 4] }
    for (const [size, [even, odd]] of Object.entries(table)) {
      expect(suggestedChasePoints(Number(size), 0)).toBe(even)
      expect(suggestedChasePoints(Number(size), 1)).toBe(odd)
      expect(suggestedChasePoints(Number(size), 2)).toBe(even)
    }
  })

  it('knows the obstacle counts for each length', () => {
    expect(OBSTACLES_BY_LENGTH).toEqual({ short: 6, medium: 8, long: 10 })
    expect(lengthForCount(8)).toBe('medium')
    expect(lengthForCount(7)).toBe('custom')
  })
})

describe('setup', () => {
  it('chase down: the quarry starts one ahead and acts first', () => {
    const s = scene('chase-down')
    expect(others(s).role).toBe('pursued')
    expect(others(s).position - players(s).position).toBe(1)
    expect(turnOrder(s.sides)[0].id).toBe(others(s).id)
    expect(s.end).toEqual({ catchEnds: true, leadToEscape: null, roundLimit: null })
  })

  it('run away: the party starts one ahead, acts first, and escapes three ahead', () => {
    const s = scene('run-away')
    expect(players(s).role).toBe('pursued')
    expect(players(s).position - others(s).position).toBe(1)
    expect(turnOrder(s.sides)[0].id).toBe(players(s).id)
    expect(s.end.leadToEscape).toBe(3)
  })

  it('beat the clock: rounds equal obstacles', () => {
    const s = scene('beat-the-clock', 8)
    expect(s.sides).toHaveLength(1)
    expect(s.end.roundLimit).toBe(8)
  })

  it('competitive: both sides start level', () => {
    const s = scene('competitive')
    expect(s.sides.every(x => x.role === 'competitor' && x.position === 0)).toBe(true)
  })

  it('reveals only what the party has reached', () => {
    const s = scene('run-away')
    expect(s.obstacles.map(o => o.revealedToPlayers)).toEqual([true, false, false, false, false, false])
    moveSide(s, players(s), 2)
    expect(s.obstacles.map(o => o.revealedToPlayers)).toEqual([true, true, true, false, false, false])
    moveSide(s, others(s), 3)
    expect(s.obstacles[3].revealedToPlayers).toBe(false)
  })

  it('resets progress when a saved chase is started', () => {
    const saved = createEmptyChase('run-away')
    saved.obstacles = [createEmptyObstacle(1, 2)]
    saved.sides[0].chasePoints = 1
    saved.sides[0].members = [{ id: 'm', name: 'Navasi', hasActed: true }]
    const s = createSceneFromSaved(saved)
    expect(s.sides[0].chasePoints).toBe(0)
    expect(s.sides[0].members[0].hasActed).toBe(false)
    expect(s.round).toBe(1)
    expect(s.templateId).toBe(saved.id)
    expect(saved.sides[0].chasePoints).toBe(1)
  })
})

describe('ending', () => {
  it('nothing has ended at the start', () => {
    for (const type of ['chase-down', 'run-away', 'beat-the-clock', 'competitive'] as ChaseType[]) {
      expect(checkOutcome(scene(type), false)).toBeNull()
    }
  })

  it('caught when a pursuer reaches the obstacle the pursued are on', () => {
    const s = scene('run-away')
    moveSide(s, others(s), 1)
    const outcome = checkOutcome(s, false)
    expect(outcome?.kind).toBe('caught')
    expect(outcome?.winnerSideId).toBe(others(s).id)
  })

  it('the party catches its quarry in a chase down', () => {
    const s = scene('chase-down')
    moveSide(s, players(s), 1)
    expect(checkOutcome(s, false)?.winnerSideId).toBe(players(s).id)
  })

  it('escaped when the pursued clear the last obstacle', () => {
    const s = scene('run-away', 3)
    moveSide(s, players(s), 3)
    expect(checkOutcome(s, false)?.kind).toBe('escaped')
  })

  it('the trail is lost three ahead, judged only at the end of a round', () => {
    const s = scene('run-away', 8)
    moveSide(s, players(s), 2)
    expect(players(s).position - others(s).position).toBe(3)
    expect(checkOutcome(s, false)).toBeNull()
    expect(checkOutcome(s, true)?.kind).toBe('trail-lost')
  })

  it('two ahead is not enough', () => {
    const s = scene('run-away', 8)
    moveSide(s, players(s), 1)
    expect(checkOutcome(s, true)).toBeNull()
  })

  it('time runs out at the end of the last round', () => {
    const s = scene('beat-the-clock', 4)
    s.round = 3
    expect(checkOutcome(s, true)).toBeNull()
    s.round = 4
    expect(checkOutcome(s, false)).toBeNull()
    expect(checkOutcome(s, true)?.kind).toBe('out-of-time')
  })

  it('finishing in the last round beats the clock', () => {
    const s = scene('beat-the-clock', 4)
    s.round = 4
    moveSide(s, players(s), 4)
    expect(checkOutcome(s, true)?.kind).toBe('finished')
  })

  it('a competitive chase goes to whoever finishes, or is tied', () => {
    const s = scene('competitive', 4)
    moveSide(s, others(s), 4)
    expect(checkOutcome(s, false)).toMatchObject({ kind: 'finished', winnerSideId: others(s).id })
    moveSide(s, players(s), 4)
    expect(checkOutcome(s, false)?.kind).toBe('tie')
  })

  it('catching can be switched off', () => {
    const s = scene('run-away')
    s.end.catchEnds = false
    moveSide(s, others(s), 2)
    expect(checkOutcome(s, false)).toBeNull()
  })
})

describe('vehicles', () => {
  const cruiser = () => createVehicleInstance(getVehicleById('urban-cruiser')!)

  it('starts intact with a copy of the stat block', () => {
    const v = cruiser()
    expect(v.currentHP).toBe(60)
    expect(vehicleCondition(v)).toBe('intact')
    v.vehicle.hp = 1
    expect(getVehicleById('urban-cruiser')!.hp).toBe(60)
  })

  it('takes damage after Hardness', () => {
    const v = cruiser()
    expect(applyVehicleDamage(v, 4)).toBe(0)
    expect(v.currentHP).toBe(60)
    expect(applyVehicleDamage(v, 15)).toBe(10)
    expect(v.currentHP).toBe(50)
    expect(vehicleCondition(v)).toBe('damaged')
    expect(applyVehicleDamage(v, 10, { ignoreHardness: true })).toBe(10)
    expect(v.currentHP).toBe(40)
  })

  it('is broken at its Broken Threshold and destroyed at 0', () => {
    const v = cruiser()
    applyVehicleDamage(v, 34)
    expect(v.currentHP).toBe(31)
    expect(isBroken(v)).toBe(false)
    applyVehicleDamage(v, 6)
    expect(v.currentHP).toBe(30)
    expect(isBroken(v)).toBe(true)
    applyVehicleDamage(v, 500)
    expect(v.currentHP).toBe(0)
    expect(isDestroyed(v)).toBe(true)
    expect(isBroken(v)).toBe(false)
    expect(vehicleCondition(v)).toBe('destroyed')
  })

  it('applies the broken penalties', () => {
    const v = cruiser()
    expect(effectiveVehicleStats(v)).toMatchObject({ broken: false, ac: 16, fort: 11, collisionDC: 19 })
    expect(effectiveVehicleStats(v).pilotingChecks[0].dc).toBe(19)
    expect(effectiveVehicleStats(v).speed[0].feet).toBe(55)
    applyVehicleDamage(v, 35)
    const broken = effectiveVehicleStats(v)
    expect(broken).toMatchObject({ broken: true, ac: 14, fort: 9, collisionDC: 17 })
    expect(broken.pilotingChecks[0].dc).toBe(24)
    expect(broken.speed[0].feet).toBe(27)
  })

  it('repairs up to full', () => {
    const v = cruiser()
    applyVehicleDamage(v, 35)
    expect(repairVehicle(v, 10)).toBe(10)
    expect(isBroken(v)).toBe(false)
    expect(repairVehicle(v, 500)).toBe(20)
    expect(v.currentHP).toBe(60)
  })
})
