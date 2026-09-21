import { describe, it, expect } from 'vitest'
import { buildTscPlayerData, createNpcShipInstance, createHazardInstance, createSceneFromSaved, createEmptyTscScene, hullBand } from '../stores/tscStore'
import { createPlayerStarship } from '../utils/tscDerive'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import type { TscInitiativeEntry, TscScene } from '../types/tsc'

const buccaneer = TSC_STARSHIPS.find(s => s.name === 'Dread Buccaneer')!
const asteroidField = TSC_HAZARDS.find(h => h.name === 'Asteroid Field')!

function entry(kind: TscInitiativeEntry['kind'], refId: string, name: string, initiative: number): TscInitiativeEntry {
  return { id: `e-${refId}`, kind, refId, name, initiative, hasActedThisRound: false }
}

function makeScene(): TscScene {
  const saved = createEmptyTscScene()
  saved.playerShip = createPlayerStarship('explorer', 5, 'Wanderer')
  const scene = createSceneFromSaved(saved)
  scene.pcs = [{ id: 'pc1', name: 'Iseph' }, { id: 'pc2', name: 'Navasi' }]
  const a = createNpcShipInstance(buccaneer, 'Buccaneer A')
  const b = createNpcShipInstance(buccaneer, 'Buccaneer B')
  b.hiddenFromPlayers = true
  const hz = createHazardInstance(asteroidField, 'Rocks')
  scene.npcShips = [a, b]
  scene.hazards = [hz]
  scene.initiativeOrder = [
    entry('pc', 'pc1', 'Iseph', 25),
    entry('npcShip', b.instanceId, 'Buccaneer B', 20),
    entry('npcShip', a.instanceId, 'Buccaneer A', 15),
    entry('pc', 'pc2', 'Navasi', 10),
  ]
  scene.initiativeRolled = true
  return scene
}

describe('buildTscPlayerData', () => {
  it('returns null without a scene', () => {
    expect(buildTscPlayerData(null)).toBeNull()
  })

  it('drops hidden NPC ships and undetected hazards from the snapshot and the order', () => {
    const scene = makeScene()
    const data = buildTscPlayerData(scene)!
    expect(data.npcShips.map(n => n.label)).toEqual(['Buccaneer A'])
    expect(data.hazards).toEqual([])
    expect(data.entries.map(e => e.name)).toEqual(['Iseph', 'Buccaneer A', 'Navasi'])
    scene.hazards[0].detected = true
    expect(buildTscPlayerData(scene)!.hazards.map(h => h.name)).toEqual(['Asteroid Field'])
  })

  it('remaps the turn index onto the visible list, skipping a hidden current actor', () => {
    const scene = makeScene()
    scene.currentTurnIndex = 2 // Buccaneer A
    expect(buildTscPlayerData(scene)!.turn).toBe(1)
    scene.currentTurnIndex = 1 // hidden Buccaneer B -> next visible is Buccaneer A
    expect(buildTscPlayerData(scene)!.turn).toBe(1)
    scene.currentTurnIndex = 3
    expect(buildTscPlayerData(scene)!.turn).toBe(2)
  })

  it('replaces NPC hull numbers with a band and never exposes AC or exact HP', () => {
    const scene = makeScene()
    const npc = scene.npcShips[0]
    const snapshot = () => buildTscPlayerData(scene)!.npcShips[0]
    expect(snapshot().band).toBe('intact')
    npc.currentHP = Math.floor(buccaneer.hp / 2)
    expect(snapshot().band).toBe('damaged')
    npc.currentHP = Math.floor(buccaneer.hp / 5)
    expect(snapshot().band).toBe('critical')
    npc.currentHP = 0
    npc.destroyed = true
    expect(snapshot().band).toBe('destroyed')
    expect(JSON.stringify(snapshot())).not.toContain('"ac"')
    expect(JSON.stringify(snapshot())).not.toContain('currentHP')
  })

  it('lists NPC stations and the model name only once identified', () => {
    const scene = makeScene()
    const npc = scene.npcShips[0]
    npc.stationState.gunnery = { malfunctioning: true }
    const before = buildTscPlayerData(scene, {})!.npcShips[0]
    expect(before.modelName).toBeUndefined()
    expect(before.identifiedStations).toEqual([])
    expect(before.malfunctioningStations).toEqual([])
    const after = buildTscPlayerData(scene, { 'Dread Buccaneer': ['gunnery'] })!.npcShips[0]
    expect(after.modelName).toBe('Dread Buccaneer')
    expect(after.identifiedStations).toEqual(['gunnery'])
    expect(after.malfunctioningStations).toEqual(['gunnery'])
  })

  it('exposes the full player ship numbers and derived statistics', () => {
    const scene = makeScene()
    scene.playerShip!.currentHP = 30
    scene.playerShip!.compromised = 0
    scene.playerShip!.wrecked = 1
    const ship = buildTscPlayerData(scene)!.playerShip!
    expect(ship).toMatchObject({ name: 'Wanderer', frame: 'explorer', level: 5, currentHP: 30, maxHP: 77, maxSP: 36, ac: 20, wrecked: 1 })
    expect(ship.stations.map(s => [s.kind, s.grade])).toEqual([["pilot's console", 'advanced'], ['generator', 'advanced']])
  })

  it('hullBand thresholds', () => {
    expect(hullBand(100, 100)).toBe('intact')
    expect(hullBand(99, 100)).toBe('damaged')
    expect(hullBand(25, 100)).toBe('critical')
    expect(hullBand(0, 100)).toBe('destroyed')
  })
})
