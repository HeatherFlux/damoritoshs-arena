import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub location before import (store has init side effects)
vi.stubGlobal('location', { ...window.location, hash: '' })

vi.mock('../utils/discordIntegration', () => ({
  sendTurnChange: vi.fn().mockResolvedValue(undefined),
  initDiscordIntegration: vi.fn(),
  destroyDiscordIntegration: vi.fn(),
}))

import { nextTick } from 'vue'
import { useChaseStore, buildChasePlayerData, __resetChaseStore } from '../stores/chaseStore'
import { sendTurnChange } from '../utils/discordIntegration'
import { createEmptyChase, createEmptyObstacle, defaultSetup } from '../utils/chaseRules'
import { getVehicleById } from '../data/vehicles'
import type { ChaseType, SavedChase } from '../types/chase'

function buildChase(type: ChaseType = 'run-away', obstacles = 6, points = 3): SavedChase {
  const chase = createEmptyChase(type)
  chase.name = 'Dock Run'
  chase.obstacles = Array.from({ length: obstacles }, (_, i) => ({
    ...createEmptyObstacle(1, points),
    name: `Obstacle ${i + 1}`,
    notes: `secret ${i + 1}`,
    options: [
      { id: `o${i}-a`, dc: 15, skills: ['Athletics'], description: 'push through' },
      { id: `o${i}-b`, dc: 13, skills: ['Society'], description: 'follow the flow' },
    ],
  }))
  const setup = defaultSetup(type, obstacles)
  chase.sides = setup.sides
  chase.end = setup.end
  const party = chase.sides.find(s => s.isPlayers)!
  party.members = ['Iseph', 'Navasi', 'Obozaya', 'Quig'].map((name, i) => ({ id: `pc${i}`, name, hasActed: false }))
  return chase
}

describe('chaseStore', () => {
  let store: ReturnType<typeof useChaseStore>
  const scene = () => store.state.activeScene!
  const party = () => scene().sides.find(s => s.isPlayers)!
  const foes = () => scene().sides.find(s => !s.isPlayers)!

  beforeEach(() => {
    __resetChaseStore()
    vi.mocked(sendTurnChange).mockClear()
    store = useChaseStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('library', () => {
    it('saves, updates and deletes chases', () => {
      const chase = buildChase()
      store.saveChase(chase)
      expect(store.state.savedChases).toHaveLength(1)
      chase.name = 'Renamed'
      store.saveChase(chase)
      expect(store.state.savedChases).toHaveLength(1)
      expect(store.getSavedChase(chase.id)?.name).toBe('Renamed')
      store.deleteChase(chase.id)
      expect(store.state.savedChases).toHaveLength(0)
    })

    it('keeps saved chases independent of the caller', () => {
      const chase = buildChase()
      store.saveChase(chase)
      chase.obstacles[0].name = 'Changed after saving'
      expect(store.getSavedChase(chase.id)?.obstacles[0].name).toBe('Obstacle 1')
    })

    it('round-trips through export and import', () => {
      store.saveChase(buildChase())
      const json = store.exportChases()
      __resetChaseStore()
      localStorage.clear()
      store = useChaseStore()
      expect(store.state.savedChases).toHaveLength(0)
      expect(store.importChases(json)).toBe(1)
      expect(store.state.savedChases[0].obstacles).toHaveLength(6)
    })

    it('persists across a reload', () => {
      store.saveChase(buildChase())
      __resetChaseStore()
      store = useChaseStore()
      expect(store.state.savedChases).toHaveLength(1)
    })

    it('remembers deleted examples across a reload and can restore them', () => {
      store.hideExample('example-run-away')
      store.hideExample('example-run-away')
      expect(store.state.hiddenExamples).toEqual(['example-run-away'])
      __resetChaseStore()
      store = useChaseStore()
      expect(store.state.hiddenExamples).toEqual(['example-run-away'])
      store.restoreExamples()
      __resetChaseStore()
      store = useChaseStore()
      expect(store.state.hiddenExamples).toEqual([])
    })

    it('rejects a file with no chases', () => {
      expect(() => store.importChases('{"foo":1}')).toThrow()
    })
  })

  describe('running', () => {
    it('starting leaves the saved chase untouched', () => {
      const chase = buildChase()
      store.saveChase(chase)
      store.startSavedChase(chase.id)
      store.resolveCheck(party().id, 'pc0', 'criticalSuccess')
      expect(party().chasePoints).toBe(2)
      expect(store.getSavedChase(chase.id)?.sides.find(s => s.isPlayers)?.chasePoints).toBe(0)
    })

    it('applies each degree of success and marks the member as having acted', () => {
      store.startChase(buildChase('run-away', 6, 5))
      store.resolveCheck(party().id, 'pc0', 'success')
      expect(party().chasePoints).toBe(1)
      store.resolveCheck(party().id, 'pc1', 'criticalSuccess')
      expect(party().chasePoints).toBe(3)
      store.resolveCheck(party().id, 'pc2', 'failure')
      expect(party().chasePoints).toBe(3)
      store.resolveCheck(party().id, 'pc3', 'criticalFailure')
      expect(party().chasePoints).toBe(2)
      expect(party().members.every(m => m.hasActed)).toBe(true)
    })

    it('a critical failure cannot take the total below 0', () => {
      store.startChase(buildChase())
      store.resolveCheck(party().id, 'pc0', 'criticalFailure')
      expect(party().chasePoints).toBe(0)
    })

    it('passing costs a point', () => {
      store.startChase(buildChase('run-away', 6, 5))
      store.resolveCheck(party().id, 'pc0', 'criticalSuccess')
      store.passTurn(party().id, 'pc1')
      expect(party().chasePoints).toBe(1)
      expect(party().members[1].hasActed).toBe(true)
    })

    it('an approach with no check grants points', () => {
      store.startChase(buildChase('run-away', 6, 5))
      store.grantPoints(party().id, 'pc0', 1, 'cast the right spell')
      store.grantPoints(party().id, 'pc1', 2)
      expect(party().chasePoints).toBe(3)
    })

    it('moves on without carrying points, and the rest of the party can act on the next obstacle', () => {
      store.startChase(buildChase('run-away', 6, 3))
      store.resolveCheck(party().id, 'pc0', 'criticalSuccess')
      const result = store.resolveCheck(party().id, 'pc1', 'criticalSuccess')
      expect(result.advanced).toBe(true)
      expect(party().position).toBe(1)
      expect(party().chasePoints).toBe(0)
      expect(party().members.map(m => m.hasActed)).toEqual([true, true, false, false])
      store.resolveCheck(party().id, 'pc2', 'success')
      expect(party().chasePoints).toBe(1)
      expect(scene().obstacles[1].revealedToPlayers).toBe(true)
    })

    it('steady pursuers move at the end of the round and the round resets', () => {
      store.startChase(buildChase('run-away', 6, 3))
      store.resolveCheck(party().id, 'pc0', 'criticalSuccess')
      store.resolveCheck(party().id, 'pc1', 'criticalSuccess')
      expect(foes().position).toBe(-1)
      store.endRound()
      expect(foes().position).toBe(0)
      expect(scene().round).toBe(2)
      expect(party().members.every(m => !m.hasActed)).toBe(true)
      expect(scene().pendingOutcome).toBeNull()
      expect(sendTurnChange).toHaveBeenCalledWith('Party', 2, true)
    })

    it('a steady quarry moves first, at the start of each round', () => {
      store.startChase(buildChase('chase-down', 8, 3))
      expect(foes().position).toBe(2)
      store.endRound()
      expect(foes().position).toBe(3)
      expect(scene().round).toBe(2)
    })

    it('pace can be changed and a side can stand still', () => {
      store.startChase(buildChase('run-away', 8, 3))
      store.nudgeSide(party().id, 3)
      foes().pace = 2
      store.endRound()
      expect(foes().position).toBe(1)
      store.dismissOutcome()
      foes().pace = 0
      store.endRound()
      expect(foes().position).toBe(1)
    })

    it('surfaces being caught but does not end the chase by itself', () => {
      store.startChase(buildChase('run-away', 6, 3))
      store.endRound()
      expect(scene().pendingOutcome?.kind).toBe('caught')
      expect(scene().outcome).toBeNull()
      expect(scene().round).toBe(1)
      store.confirmOutcome()
      expect(scene().outcome?.kind).toBe('caught')
      expect(scene().pendingOutcome).toBeNull()
      expect(store.state.activeScene).not.toBeNull()
    })

    it('the GM can wave an ending away and play on', () => {
      store.startChase(buildChase('run-away', 6, 3))
      store.endRound()
      expect(scene().pendingOutcome?.kind).toBe('caught')
      store.nudgeSide(party().id, 1)
      store.continueAfterDismiss()
      expect(scene().pendingOutcome).toBeNull()
      expect(scene().round).toBe(2)
    })

    it('the party loses its pursuers three obstacles ahead at the end of a round', () => {
      store.startChase(buildChase('run-away', 8, 1))
      for (const id of ['pc0', 'pc1', 'pc2']) store.resolveCheck(party().id, id, 'success')
      expect(party().position).toBe(3)
      expect(scene().pendingOutcome).toBeNull()
      store.endRound()
      expect(foes().position).toBe(0)
      expect(scene().pendingOutcome?.kind).toBe('trail-lost')
    })

    it('the party catches a quarry that stands still', () => {
      const chase = buildChase('chase-down', 6, 1)
      chase.sides.find(s => !s.isPlayers)!.pace = 0
      store.startChase(chase)
      store.resolveCheck(party().id, 'pc0', 'success')
      expect(scene().pendingOutcome).toMatchObject({ kind: 'caught', winnerSideId: party().id })
    })

    it('counts rounds spent stuck on an obstacle', () => {
      const chase = buildChase('beat-the-clock', 6, 3)
      store.startChase(chase)
      store.endRound()
      store.endRound()
      expect(party().roundsAtObstacle).toBe(2)
      store.nudgeSide(party().id, 1)
      expect(party().roundsAtObstacle).toBe(0)
    })

    it('runs out of time in a beat the clock chase', () => {
      store.startChase(buildChase('beat-the-clock', 2, 3))
      store.endRound()
      expect(scene().pendingOutcome).toBeNull()
      store.endRound()
      expect(scene().pendingOutcome?.kind).toBe('out-of-time')
    })

    it('rolls a check against the chosen approach', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.95) // natural 20
      store.startChase(buildChase('run-away', 6, 5))
      const result = store.rollCheck(party().id, 'pc0', 'o0-a', 3)
      expect(result).toEqual({ degree: 'criticalSuccess', total: 23, natural: 20 })
      expect(party().chasePoints).toBe(2)
    })

    it('adds party members once', () => {
      store.startChase(buildChase())
      const players = [{ id: 'p1', name: 'Zemir', maxHP: 20, ac: 18 }, { id: 'p2', name: 'Chk Chk', maxHP: 18, ac: 17 }]
      expect(store.addMembersFromParty(party().id, players)).toBe(2)
      expect(store.addMembersFromParty(party().id, players)).toBe(0)
      expect(party().members).toHaveLength(6)
    })

    it('ending clears the active chase', () => {
      store.startChase(buildChase())
      store.endChase()
      expect(store.state.activeScene).toBeNull()
    })
  })

  describe('vehicles', () => {
    const cruiser = getVehicleById('urban-cruiser')!

    it('attaches, labels duplicates, and detaches', () => {
      store.startChase(buildChase())
      const a = store.attachVehicle(party().id, cruiser)!
      const b = store.attachVehicle(party().id, cruiser)!
      expect([a.label, b.label]).toEqual(['Urban Cruiser', 'Urban Cruiser 2'])
      store.detachVehicle(a.instanceId)
      expect(party().vehicles.map(v => v.label)).toEqual(['Urban Cruiser 2'])
    })

    it('tracks damage, broken and destroyed', () => {
      store.startChase(buildChase())
      const v = store.attachVehicle(party().id, cruiser)!
      expect(store.damageVehicle(v.instanceId, 35)).toBe(30)
      expect(party().vehicles[0].currentHP).toBe(30)
      expect(scene().log.some(e => e.text === 'Urban Cruiser is broken.')).toBe(true)
      store.repairVehicle(v.instanceId, 5)
      expect(party().vehicles[0].currentHP).toBe(35)
      store.damageVehicle(v.instanceId, 999)
      expect(party().vehicles[0].currentHP).toBe(0)
      expect(scene().log.some(e => e.text === 'Urban Cruiser is destroyed.')).toBe(true)
    })

    it('sets a pilot and clears it when the pilot leaves', () => {
      store.startChase(buildChase())
      const v = store.attachVehicle(party().id, cruiser)!
      store.setPilot(v.instanceId, 'pc1')
      expect(party().vehicles[0].pilotMemberId).toBe('pc1')
      store.removeMember(party().id, 'pc1')
      expect(party().vehicles[0].pilotMemberId).toBeUndefined()
    })

    it('marks a vehicle uncontrolled', () => {
      store.startChase(buildChase())
      const v = store.attachVehicle(foes().id, cruiser)!
      store.setUncontrolled(v.instanceId, true)
      expect(foes().vehicles[0].uncontrolled).toBe(true)
    })
  })

  describe('sharing', () => {
    it('builds a share link to the player view', () => {
      expect(store.generateShareUrl()).toContain(`#/chase/view?session=${store.state.sessionId}`)
    })

    it('rotating the session changes the link', () => {
      const before = store.state.sessionId
      store.rotateSession()
      expect(store.state.sessionId).not.toBe(before)
      expect(store.generateShareUrl()).toContain(store.state.sessionId)
    })

    it('broadcasts a snapshot to the same session only', async () => {
      const received: unknown[] = []
      const elsewhere: unknown[] = []
      const listener = new BroadcastChannel(`sf2e-chase-${store.state.sessionId}`)
      listener.onmessage = e => received.push(e.data)
      const other = new BroadcastChannel('sf2e-chase-someone-else')
      other.onmessage = e => elsewhere.push(e.data)
      store.startChase(buildChase())
      await nextTick()
      expect(received.length).toBeGreaterThan(0)
      expect((received.at(-1) as { type: string }).type).toBe('player-data')
      expect(elsewhere).toHaveLength(0)
      listener.close()
      other.close()
    })

    it('saves the running chase', async () => {
      store.startChase(buildChase())
      store.resolveCheck(party().id, 'pc0', 'success')
      await nextTick()
      const saved = JSON.parse(localStorage.getItem('sf2e-chase')!)
      expect(saved.activeScene.sides.find((s: { isPlayers: boolean }) => s.isPlayers).chasePoints).toBe(1)
    })
  })

  describe('player snapshot', () => {
    it('hides everything about face-down obstacles', () => {
      store.startChase(buildChase('run-away', 6, 3))
      const data = buildChasePlayerData(scene())!
      expect(data.obstacles[0]).toMatchObject({ revealed: true, name: 'Obstacle 1', chasePoints: 3 })
      expect(data.obstacles[0].options).toHaveLength(2)
      for (const hidden of data.obstacles.slice(1)) {
        expect(hidden).toEqual({ index: hidden.index, revealed: false })
      }
      expect(JSON.stringify(data)).not.toContain('Obstacle 2')
    })

    it('never sends GM notes', () => {
      store.startChase(buildChase())
      expect(JSON.stringify(buildChasePlayerData(scene()))).not.toContain('secret')
    })

    it('shows a scouted obstacle', () => {
      store.startChase(buildChase())
      store.revealObstacle(scene().obstacles[2].id, true)
      expect(buildChasePlayerData(scene())!.obstacles[2].name).toBe('Obstacle 3')
      store.revealObstacle(scene().obstacles[0].id, false)
      expect(buildChasePlayerData(scene())!.obstacles[0].revealed).toBe(true)
    })

    it('gives numbers for the party and only a condition for the other side', () => {
      store.startChase(buildChase())
      const mine = store.attachVehicle(party().id, getVehicleById('urban-cruiser')!)!
      const theirs = store.attachVehicle(foes().id, getVehicleById('enercycle')!)!
      store.setPilot(mine.instanceId, 'pc0')
      store.damageVehicle(theirs.instanceId, 12) // 7 after Hardness 5: HP 14 to 7, its Broken Threshold
      const data = buildChasePlayerData(scene())!
      const p = data.sides.find(s => s.isPlayers)!
      const f = data.sides.find(s => !s.isPlayers)!
      expect(p.vehicles[0]).toMatchObject({ currentHP: 60, maxHP: 60, pilotName: 'Iseph', condition: 'intact' })
      expect(f.vehicles[0].condition).toBe('broken')
      expect(f.vehicles[0].currentHP).toBeUndefined()
      expect(f.vehicles[0].maxHP).toBeUndefined()
      expect(f.chasePoints).toBeUndefined()
      expect(f.members).toEqual([])
    })

    it('keeps GM-only log lines out', () => {
      store.startChase(buildChase())
      store.nudgeSide(foes().id, 1)
      const data = buildChasePlayerData(scene())!
      expect(scene().log.some(e => e.gmOnly)).toBe(true)
      expect(data.log.some(e => e.gmOnly)).toBe(false)
    })

    it('is null with no chase running', () => {
      expect(buildChasePlayerData(null)).toBeNull()
    })
  })
})
