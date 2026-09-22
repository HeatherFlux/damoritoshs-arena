import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub location before import (store has init side effects)
vi.stubGlobal('location', { ...window.location, hash: '' })

vi.mock('../utils/discordIntegration', () => ({
  sendTurnChange: vi.fn().mockResolvedValue(undefined),
  initDiscordIntegration: vi.fn(),
  destroyDiscordIntegration: vi.fn(),
}))

import { useTscStore, createEmptyTscScene, __resetTscStore } from '../stores/tscStore'
import { sendTurnChange } from '../utils/discordIntegration'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import { createPlayerStarship, deriveStarshipStats } from '../utils/tscDerive'
import type { NpcStarship, StarshipHazard } from '../types/tsc'

const trident = TSC_STARSHIPS.find(s => s.name === 'Raider Trident')!
const buccaneer = TSC_STARSHIPS.find(s => s.name === 'Dread Buccaneer')!
const asteroidField = TSC_HAZARDS.find(h => h.name === 'Asteroid Field')!   // simple
const boardingPod = TSC_HAZARDS.find(h => h.name === 'Boarding Pod')!       // complex

function startBasicScene(store: ReturnType<typeof useTscStore>, opts: { ship?: boolean; npc?: NpcStarship; hazard?: StarshipHazard } = {}) {
  const saved = createEmptyTscScene()
  saved.level = 5
  if (opts.ship !== false) saved.playerShip = createPlayerStarship('explorer', 5, 'Wanderer')
  const scene = store.startScene(saved)
  store.addPc({ name: 'Iseph', initiativeBonus: 8 })
  store.addPc({ name: 'Navasi', initiativeBonus: 5 })
  if (opts.npc) store.addNpcShip(opts.npc)
  if (opts.hazard) store.addHazard(opts.hazard)
  return scene
}

describe('tscStore', () => {
  let store: ReturnType<typeof useTscStore>

  beforeEach(() => {
    __resetTscStore()
    store = useTscStore()
    store.state.isGMView = true
    vi.mocked(sendTurnChange).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('scenes and share URL', () => {
    it('starts a scene from a template with full HP/SP and no runtime state', () => {
      const scene = startBasicScene(store, { npc: trident })
      expect(scene.isActive).toBe(true)
      expect(scene.round).toBe(1)
      expect(scene.initiativeRolled).toBe(false)
      expect(scene.playerShip?.currentHP).toBe(77)
      expect(scene.playerShip?.currentSP).toBe(36)
      expect(scene.npcShips[0].currentHP).toBe(trident.hp)
    })

    it('share URL points at the TSC player view and carries the sync flag', () => {
      expect(store.generateShareUrl()).toContain('#/tsc/view?session=')
      expect(store.generateShareUrl()).not.toContain('sync=ws')
      store.state.isRemoteSyncEnabled = true
      expect(store.generateShareUrl()).toContain('&sync=ws')
    })

    it('rotateSession mints a fresh id and re-keys the channel', () => {
      const a = store.state.sessionId
      store.rotateSession()
      expect(store.state.sessionId).toBeTruthy()
      expect(store.state.sessionId).not.toBe(a)
    })

    it('labels duplicate NPC ships with numeric suffixes', () => {
      startBasicScene(store)
      store.addNpcShip(trident, 3)
      expect(store.state.activeScene!.npcShips.map(n => n.label)).toEqual(['Raider Trident', 'Raider Trident 2', 'Raider Trident 3'])
    })

    it('saveScene / deleteScene round-trip and importScenes merges by id', () => {
      const saved = createEmptyTscScene()
      store.saveScene(saved)
      expect(store.state.savedScenes).toHaveLength(1)
      store.importScenes(JSON.stringify([{ ...saved, name: 'Renamed' }, { ...saved, id: 'other' }]))
      expect(store.state.savedScenes).toHaveLength(2)
      expect(store.state.savedScenes[0].name).toBe('Renamed')
      store.deleteScene(saved.id)
      expect(store.state.savedScenes.map(s => s.id)).toEqual(['other'])
    })
  })

  describe('initiative', () => {
    it('includes PCs, NPC ships and triggered complex hazards; excludes the player ship and simple hazards', () => {
      startBasicScene(store, { npc: buccaneer, hazard: asteroidField })
      const pod = store.addHazard(boardingPod)
      store.triggerHazard(pod.instanceId) // p. 250: "then rolls initiative"
      store.rollInitiative([{ pcId: store.state.activeScene!.pcs[0].id, total: 22 }])
      const kinds = store.state.activeScene!.initiativeOrder.map(e => e.kind).sort()
      expect(kinds).toEqual(['hazard', 'npcShip', 'pc', 'pc'])
      expect(store.state.activeScene!.initiativeOrder.find(e => e.name === 'Iseph')?.initiative).toBe(22)
      expect(store.state.activeScene!.initiativeRolled).toBe(true)
    })

    it('sorts descending and nextTurn wraps the round', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 1 }])
      expect(scene.initiativeOrder[0].name).toBe('Iseph')
      expect(scene.initiativeOrder[scene.initiativeOrder.length - 1].name).toBe('Navasi')
      for (let i = 0; i < scene.initiativeOrder.length; i++) store.nextTurn()
      expect(scene.round).toBe(2)
      expect(scene.currentTurnIndex).toBe(0)
      expect(scene.initiativeOrder.every(e => !e.hasActedThisRound)).toBe(true)
    })

    it('nextTurn notifies Discord with the new actor and side', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.nextTurn()
      expect(sendTurnChange).toHaveBeenCalledWith('Navasi', 1, true)
      store.nextTurn()
      expect(sendTurnChange).toHaveBeenLastCalledWith('Raider Trident', 1, false)
    })

    it('delayTurn moves the current entry to the end without changing the round', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.delayTurn()
      expect(scene.initiativeOrder[scene.initiativeOrder.length - 1].name).toBe('Iseph')
      expect(scene.round).toBe(1)
    })

    it('removing an entry before the current one keeps the current actor', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.nextTurn()
      store.nextTurn() // now on the Trident (index 2)
      const current = store.currentEntry.value!.name
      store.removePc(scene.pcs[0].id)
      expect(store.currentEntry.value!.name).toBe(current)
      expect(scene.currentTurnIndex).toBe(1)
    })
  })

  describe('initiative edge cases (Tech Core pp. 169, 173, 250)', () => {
    it('untriggered complex hazards stay out of initiative; triggering mid-combat rolls and inserts them', () => {
      startBasicScene(store, { npc: trident })
      const pod = store.addHazard(boardingPod)
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      expect(scene.initiativeOrder.some(e => e.kind === 'hazard')).toBe(false)
      const current = store.currentEntry.value!.id
      store.triggerHazard(pod.instanceId)
      expect(scene.initiativeOrder.some(e => e.refId === pod.instanceId)).toBe(true)
      expect(store.currentEntry.value!.id).toBe(current)
      store.untriggerHazard(pod.instanceId)
      expect(scene.initiativeOrder.some(e => e.refId === pod.instanceId)).toBe(false)
    })

    it('reinforcements added mid-combat roll initiative and join the order without changing the current actor', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.nextTurn()
      const current = store.currentEntry.value!.id
      const [added] = store.addNpcShip(buccaneer)
      expect(scene.initiativeOrder.some(e => e.refId === added.instanceId)).toBe(true)
      expect(store.currentEntry.value!.id).toBe(current)
      for (let i = 1; i < scene.initiativeOrder.length; i++) {
        expect(scene.initiativeOrder[i - 1].initiative).toBeGreaterThanOrEqual(scene.initiativeOrder[i].initiative)
      }
    })

    it('ties go to the adversary', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      const npc = scene.npcShips[0]
      // force the NPC roll to a known value by re-labelling after the roll: instead, compare with a PC tied to it
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      const npcInit = scene.initiativeOrder.find(e => e.refId === npc.instanceId)!.initiative
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: npcInit }, { pcId: scene.pcs[1].id, total: npcInit }])
      const order = scene.initiativeOrder.filter(e => e.initiative === scene.initiativeOrder.find(x => x.refId === npc.instanceId)!.initiative)
      if (order.length > 1) expect(order[0].kind).toBe('npcShip')
    })

    it('a compromised player ship stays in initiative when initiative is re-rolled', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.damageShip({ kind: 'player' }, 200)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(true)
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 10 }, { pcId: scene.pcs[1].id, total: 5 }])
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(true)
    })

    it('a ship compromised before initiative is rolled enters the order when it is', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.damageShip({ kind: 'player' }, 200)
      expect(scene.playerShip!.compromised).toBe(1)
      expect(scene.initiativeOrder).toEqual([])
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      expect(scene.initiativeOrder[0].kind).toBe('playerShip')
      expect(store.currentEntry.value!.kind).toBe('playerShip')
    })

    it('becoming compromised with an empty order still yields a valid current entry', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      for (const id of scene.pcs.map(p => p.id)) store.removePc(id)
      store.removeNpcShip(scene.npcShips[0].instanceId)
      expect(scene.initiativeOrder).toEqual([])
      store.damageShip({ kind: 'player' }, 200)
      expect(scene.initiativeOrder.map(e => e.kind)).toEqual(['playerShip'])
      expect(store.currentEntry.value!.kind).toBe('playerShip')
    })
  })

  describe('NPC damage', () => {
    it('depletes shields before hull and destroys at 0 HP, leaving initiative', () => {
      startBasicScene(store, { npc: buccaneer })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      const npc = scene.npcShips[0]
      const sp = npc.currentSP
      const r = store.damageShip({ kind: 'npc', instanceId: npc.instanceId }, sp + 5)
      expect(r.shieldDamage).toBe(sp)
      expect(r.hullDamage).toBe(5)
      expect(npc.currentSP).toBe(0)
      expect(npc.currentHP).toBe(buccaneer.hp - 5)
      store.damageShip({ kind: 'npc', instanceId: npc.instanceId }, 9999)
      expect(npc.destroyed).toBe(true)
      expect(scene.initiativeOrder.some(e => e.refId === npc.instanceId)).toBe(false)
    })

    it('bypassing damage skips shields', () => {
      startBasicScene(store, { npc: buccaneer })
      const npc = store.state.activeScene!.npcShips[0]
      store.damageShip({ kind: 'npc', instanceId: npc.instanceId }, 4, { bypassing: true })
      expect(npc.currentSP).toBe(buccaneer.sp)
      expect(npc.currentHP).toBe(buccaneer.hp - 4)
    })

    it('restoreShields defaults to the fortify value and caps at max SP', () => {
      startBasicScene(store, { npc: buccaneer })
      const npc = store.state.activeScene!.npcShips[0]
      npc.currentSP = 1
      store.restoreShields({ kind: 'npc', instanceId: npc.instanceId })
      expect(npc.currentSP).toBe(Math.min(buccaneer.sp!, 1 + buccaneer.fortify!))
      store.restoreShields({ kind: 'npc', instanceId: npc.instanceId }, 999)
      expect(npc.currentSP).toBe(buccaneer.sp)
    })

    it('repairSelf clears one malfunctioning station and heals level HP', () => {
      startBasicScene(store, { npc: buccaneer })
      const npc = store.state.activeScene!.npcShips[0]
      const station = Object.keys(npc.stationState)[0]
      store.setStationMalfunction({ kind: 'npc', instanceId: npc.instanceId }, station, true)
      npc.currentHP = 10
      store.repairSelf(npc.instanceId)
      expect(npc.stationState[station].malfunctioning).toBe(false)
      expect(npc.currentHP).toBe(10 + buccaneer.level)
    })
  })

  describe('player ship compromised lifecycle', () => {
    function rollAndDamageToZero(critical = false) {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.nextTurn()
      store.nextTurn() // Trident's turn (index 2)
      const attacker = store.currentEntry.value!
      const result = store.damageShip({ kind: 'player' }, 200, { critical })
      return { scene, attacker, result }
    }

    it('reaching 0 HP grants compromised 1, inoperable, malfunctioning stations, and enters initiative before the attacker', () => {
      const { scene, attacker, result } = rollAndDamageToZero()
      const ship = scene.playerShip!
      expect(result.becameCompromised).toBe(true)
      expect(ship.currentHP).toBe(0)
      expect(ship.compromised).toBe(1)
      expect(ship.inoperable).toBe(true)
      expect(ship.stations.every(s => s.malfunctioning)).toBe(true)
      const idx = scene.initiativeOrder.findIndex(e => e.kind === 'playerShip')
      expect(idx).toBe(2)
      expect(scene.initiativeOrder[idx + 1].id).toBe(attacker.id)
      // the attacker is still the current actor
      expect(store.currentEntry.value!.id).toBe(attacker.id)
      expect(scene.currentTurnIndex).toBe(3)
    })

    it('a critical hit grants compromised 2', () => {
      const { scene } = rollAndDamageToZero(true)
      expect(scene.playerShip!.compromised).toBe(2)
    })

    it('damage while compromised raises the value by 1, or 2 on a crit, and 10 destroys the ship', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.damageShip({ kind: 'player' }, 5)
      expect(ship.compromised).toBe(2)
      store.damageShip({ kind: 'player' }, 5, { critical: true })
      expect(ship.compromised).toBe(4)
      store.setCompromised(9)
      const r = store.damageShip({ kind: 'player' }, 1)
      expect(r.destroyed).toBe(true)
      expect(scene.playerShipDestroyed).toBe(true)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(false)
    })

    it('shields still absorb damage while compromised and do not raise the value', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.restoreShields({ kind: 'player' }, 10)
      expect(ship.currentSP).toBe(10)
      store.damageShip({ kind: 'player' }, 6)
      expect(ship.currentSP).toBe(4)
      expect(ship.compromised).toBe(1)
    })

    it('hull integrity check outcomes move the value and recovery grants wrecked 1 and leaves initiative', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.setCompromised(3)
      expect(store.hullIntegrityCheck(1)!.degree).toBe('criticalFailure')   // nat 1 on DC 13 -> crit failure: +2
      expect(ship.compromised).toBe(5)
      expect(store.hullIntegrityCheck(14)!.degree).toBe('failure')          // DC 15, rolled 14: +1
      expect(ship.compromised).toBe(6)
      expect(store.hullIntegrityCheck(16)!.degree).toBe('success')          // DC 16: -1
      expect(ship.compromised).toBe(5)
      expect(store.hullIntegrityCheck(20)!.degree).toBe('criticalSuccess')  // nat 20: -2
      expect(ship.compromised).toBe(3)
      store.setCompromised(1)
      const r = store.hullIntegrityCheck(11)!
      expect(r.recovered).toBe(true)
      expect(ship.compromised).toBe(0)
      expect(ship.wrecked).toBe(1)
      expect(ship.inoperable).toBe(false)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(false)
    })

    it('regaining 1+ Hull Points clears compromised and accumulates wrecked', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.healShip({ kind: 'player' }, 12)
      expect(ship.currentHP).toBe(12)
      expect(ship.compromised).toBe(0)
      expect(ship.wrecked).toBe(1)
      // stations stay malfunctioning until repaired
      expect(ship.stations.every(s => s.malfunctioning)).toBe(true)
      store.repairStation({ kind: 'player' }, ship.stations[0].id)
      expect(ship.stations[0].malfunctioning).toBe(false)
      // second time down: compromised starts at 1 + wrecked 1 = 2, then recovery -> wrecked 2
      store.damageShip({ kind: 'player' }, 50)
      expect(ship.compromised).toBe(2)
      store.healShip({ kind: 'player' }, 5)
      expect(ship.wrecked).toBe(2)
    })

    it('a ship at 0 Hull Points that already recovered from compromised is compromised again by further hull damage', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.setCompromised(1)
      store.hullIntegrityCheck(20) // crit success: -2 -> recovers at 0 HP with wrecked 1
      expect(ship.compromised).toBe(0)
      expect(ship.currentHP).toBe(0)
      expect(ship.wrecked).toBe(1)
      store.damageShip({ kind: 'player' }, 3)
      expect(ship.compromised).toBe(2) // 1 + wrecked 1 (p. 172)
      expect(ship.inoperable).toBe(true)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(true)
    })

    it('zero or fully absorbed damage never raises the compromised value', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.damageShip({ kind: 'player' }, 0, { bypassing: true })
      expect(ship.compromised).toBe(1)
      store.restoreShields({ kind: 'player' }, 20)
      store.damageShip({ kind: 'player' }, 20)
      expect(ship.compromised).toBe(1)
    })

    it('nonlethal damage at 0 HP makes the ship inoperable, not compromised, and 1 HP ends inoperable (p. 172-173)', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      store.damageShip({ kind: 'player' }, 200, { nonlethal: true })
      const ship = scene.playerShip!
      expect(ship.currentHP).toBe(0)
      expect(ship.compromised).toBe(0)
      expect(ship.inoperable).toBe(true)
      expect(ship.stations.every(s => s.malfunctioning)).toBe(true)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(false)
      store.healShip({ kind: 'player' }, 1)
      expect(ship.inoperable).toBe(false)
      expect(ship.wrecked).toBe(0)
    })

    it('setCompromised applies the full package when gaining and clears it when dropping to 0', () => {
      startBasicScene(store, { npc: trident })
      const scene = store.state.activeScene!
      store.rollInitiative([{ pcId: scene.pcs[0].id, total: 30 }, { pcId: scene.pcs[1].id, total: 25 }])
      const ship = scene.playerShip!
      store.setCompromised(3)
      expect(ship.currentHP).toBe(0)
      expect(ship.inoperable).toBe(true)
      expect(ship.stations.every(s => s.malfunctioning)).toBe(true)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(true)
      store.setInoperable({ kind: 'player' }, false) // GM toggles it off by hand
      store.setCompromised(0)
      expect(ship.wrecked).toBe(1)
      expect(scene.initiativeOrder.some(e => e.kind === 'playerShip')).toBe(false)
      // a ship that is inoperable but never compromised is not "losing compromised"
      store.setInoperable({ kind: 'player' }, true)
      store.setCompromised(0)
      expect(ship.wrecked).toBe(1)
    })

    it('setting Hull Points to 0 by hand goes through the compromised package', () => {
      startBasicScene(store, { npc: trident })
      const ship = store.state.activeScene!.playerShip!
      store.setHP({ kind: 'player' }, 0)
      expect(ship.compromised).toBe(1)
      expect(ship.inoperable).toBe(true)
    })

    it('a destroyed ship ignores shields, hull integrity, HP edits and compromised edits', () => {
      const { scene } = rollAndDamageToZero()
      const ship = scene.playerShip!
      store.setCompromised(9)
      store.damageShip({ kind: 'player' }, 1)
      expect(scene.playerShipDestroyed).toBe(true)
      store.restoreShields({ kind: 'player' }, 10)
      expect(ship.currentSP).toBe(0)
      expect(store.hullIntegrityCheck(20)).toBeNull()
      store.setHP({ kind: 'player' }, 5)
      expect(ship.currentHP).toBe(0)
      store.setCompromised(0)
      expect(ship.wrecked).toBe(0)
    })

    it('an inoperable NPC starship cannot Repair Self', () => {
      startBasicScene(store, { npc: buccaneer })
      const npc = store.state.activeScene!.npcShips[0]
      npc.currentHP = 5
      store.setInoperable({ kind: 'npc', instanceId: npc.instanceId }, true)
      store.repairSelf(npc.instanceId)
      expect(npc.currentHP).toBe(5)
    })

    it('starting a scene keeps hull damage and lasting conditions but refills shields', () => {
      const saved = createEmptyTscScene()
      saved.playerShip = createPlayerStarship('explorer', 5, 'Battered')
      saved.playerShip.currentHP = 20
      saved.playerShip.currentSP = 2
      saved.playerShip.wrecked = 2
      saved.playerShip.stations[0].malfunctioning = true
      const scene = store.startScene(saved)
      expect(scene.playerShip!.currentHP).toBe(20)
      expect(scene.playerShip!.currentSP).toBe(36)
      expect(scene.playerShip!.wrecked).toBe(2)
      expect(scene.playerShip!.stations[0].malfunctioning).toBe(true)
    })

    it('hullIntegrityCheck is a no-op when not compromised', () => {
      startBasicScene(store)
      expect(store.hullIntegrityCheck(10)).toBeNull()
    })
  })

  describe('identification memory', () => {
    it('remembers identified stations per model across scenes and persists', () => {
      startBasicScene(store, { npc: buccaneer })
      store.identifyModel('Dread Buccaneer', ['gunnery'])
      store.identifyModel('Dread Buccaneer', ["pilot's console"])
      expect(store.isStationIdentified('Dread Buccaneer', 'gunnery')).toBe(true)
      store.endScene()
      expect(store.state.activeScene).toBeNull()
      expect(store.state.identifiedModels['Dread Buccaneer']).toEqual(['gunnery', "pilot's console"])
      const persisted = JSON.parse(localStorage.getItem('sf2e-tsc')!)
      expect(persisted.identifiedModels['Dread Buccaneer']).toContain('gunnery')
      store.forgetModel('Dread Buccaneer')
      expect(store.isStationIdentified('Dread Buccaneer', 'gunnery')).toBe(false)
    })
  })

  describe('player ship templates', () => {
    it('newPlayerShip creates and persists a frame-derived sheet', () => {
      const ship = store.newPlayerShip('skirmisher', 3, 'Dart')
      expect(store.state.playerShips).toHaveLength(1)
      expect(ship.currentHP).toBe(42)
      expect(deriveStarshipStats(ship).sensorRange).toBe(4)
      expect(JSON.parse(localStorage.getItem('sf2e-tsc-player-ships')!)).toHaveLength(1)
    })

    it('endScene writes damage back to the linked template (campaign continuity)', () => {
      const template = store.newPlayerShip('bulwark', 4, 'Anvil')
      const saved = createEmptyTscScene()
      store.startScene(saved)
      store.loadPlayerShipIntoScene(template.id)
      const ship = store.state.activeScene!.playerShip!
      expect(ship.templateId).toBe(template.id)
      store.damageShip({ kind: 'player' }, 30)
      store.endScene()
      const updated = store.state.playerShips.find(p => p.id === template.id)!
      expect(updated.currentHP).toBe(72 - (30 - 22))
      expect(updated.currentSP).toBe(0)
    })

    it('loading a template into a scene refills shields but keeps hull damage', () => {
      const template = store.newPlayerShip('explorer', 5, 'Scarred')
      template.currentHP = 40
      template.currentSP = 3
      store.savePlayerShip(template)
      store.startScene(createEmptyTscScene())
      const ship = store.loadPlayerShipIntoScene(template.id)!
      expect(ship.currentHP).toBe(40)
      expect(ship.currentSP).toBe(36)
    })
  })

  describe('custom starships', () => {
    it('adds with the custom prefix, merges into the library, and exports only custom ships', () => {
      const custom = store.addCustomStarship({ ...trident, id: 'my-raider', name: 'My Raider' })
      expect(custom.id).toBe('custom-starship-my-raider')
      expect(store.isCustomStarship(custom.id)).toBe(true)
      expect(store.allStarships.value).toHaveLength(TSC_STARSHIPS.length + 1)
      expect(store.getStarshipById(custom.id)?.name).toBe('My Raider')
      const exported = JSON.parse(store.exportCustomStarships())
      expect(exported).toHaveLength(1)
      store.deleteCustomStarship(custom.id)
      expect(store.allStarships.value).toHaveLength(TSC_STARSHIPS.length)
    })
  })

  describe('startFromEncounter', () => {
    it('seeds ships, hazards, crew, and the latest starship sheet from an encounter', () => {
      const sheet = store.newPlayerShip('bulwark', 3, 'Anvil')
      const encounter = {
        id: 'e1', name: 'Blockade Run', creatures: [], partyLevel: 3, partySize: 4, createdAt: new Date(), updatedAt: new Date(),
        starships: [{ starship: trident, count: 2 }, { starship: buccaneer, count: 1 }],
        starshipHazards: [{ hazard: asteroidField, count: 1 }],
      }
      const scene = store.startFromEncounter(encounter, [{ id: 'p1', name: 'Iseph', maxHP: 30, ac: 18, perception: 7 }])
      expect(scene.name).toBe('Blockade Run')
      expect(scene.level).toBe(3)
      expect(scene.npcShips.map(n => n.label)).toEqual(['Raider Trident', 'Raider Trident 2', 'Dread Buccaneer'])
      expect(scene.hazards.map(h => h.label)).toEqual(['Asteroid Field'])
      expect(scene.pcs.map(p => [p.name, p.initiativeBonus])).toEqual([['Iseph', 7]])
      expect(scene.playerShip?.templateId).toBe(sheet.id)
      expect(scene.initiativeRolled).toBe(false)
    })
  })

  describe('crew and stations', () => {
    it('setPcStation helms exactly one station per PC and one PC per station', () => {
      startBasicScene(store)
      const scene = store.state.activeScene!
      const [pilot, generator] = scene.playerShip!.stations
      store.setPcStation(scene.pcs[0].id, pilot.id)
      expect(pilot.helmedBy).toBe('Iseph')
      store.setPcStation(scene.pcs[1].id, pilot.id)
      expect(pilot.helmedBy).toBe('Navasi')
      expect(scene.pcs[0].stationId).toBeUndefined()
      store.setPcStation(scene.pcs[1].id, generator.id)
      expect(pilot.helmedBy).toBeUndefined()
      expect(generator.helmedBy).toBe('Navasi')
      expect(store.derivedPlayerShip.value!.fort).toBe(13) // advanced generator: +0
    })
  })

  describe('session isolation', () => {
    it('after rotating the session, broadcasts no longer reach the old channel', async () => {
      startBasicScene(store)
      const oldSession = store.state.sessionId
      const received: unknown[] = []
      const spy = new BroadcastChannel(`sf2e-tsc-${oldSession}`)
      spy.onmessage = e => received.push(e.data)
      store.rotateSession()
      store.broadcastPlayerData()
      await new Promise(r => setTimeout(r, 0))
      expect(received).toHaveLength(0)
      const fresh: unknown[] = []
      const spy2 = new BroadcastChannel(`sf2e-tsc-${store.state.sessionId}`)
      spy2.onmessage = e => fresh.push(e.data)
      store.broadcastPlayerData()
      await new Promise(r => setTimeout(r, 0))
      expect(fresh).toHaveLength(1)
      spy.close()
      spy2.close()
    })
  })
})
