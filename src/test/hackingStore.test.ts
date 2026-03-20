import { describe, it, expect, beforeEach, vi } from 'vitest'

// The hackingStore has side effects on import (init, window.location.hash), so we need to mock some globals
// before importing
vi.stubGlobal('location', { ...window.location, hash: '' })

import { useHackingStore } from '../stores/hackingStore'

describe('hackingStore', () => {
  let store: ReturnType<typeof useHackingStore>

  beforeEach(() => {
    store = useHackingStore()
    // Reset state
    store.clearEffects()
    store.state.savedEncounters = []
  })

  describe('computer CRUD', () => {
    it('creates a new computer', () => {
      const computer = store.createNewComputer('Test Server')
      expect(computer.name).toBe('Test Server')
      expect(computer.level).toBe(1)
      expect(computer.type).toBe('tech')
      expect(store.state.computer!.name).toBe('Test Server')
    })

    it('loads a computer', () => {
      const computer = {
        id: 'test-id',
        name: 'Loaded Computer',
        level: 5,
        type: 'magic' as const,
        accessPoints: [],
      }
      store.loadComputer(computer)
      expect(store.state.computer!.name).toBe('Loaded Computer')
    })
  })

  describe('node state', () => {
    it('sets node state', () => {
      store.createNewComputer('Test')
      // Add an access point manually
      store.state.computer!.accessPoints = [{
        id: 'node-1',
        name: 'Gateway',
        type: 'physical',
        state: 'locked',
        position: { x: 0.5, y: 0.5 },
        connectedTo: [],
      }]
      store.setNodeState('node-1', 'breached')
      expect(store.state.computer!.accessPoints[0].state).toBe('breached')
    })

    it('sets node notes', () => {
      store.createNewComputer('Test')
      store.state.computer!.accessPoints = [{
        id: 'node-1',
        name: 'Gateway',
        type: 'physical',
        state: 'locked',
        position: { x: 0.5, y: 0.5 },
        connectedTo: [],
      }]
      store.setNodeNotes('node-1', 'Player hacked this')
      expect(store.state.computer!.accessPoints[0].notes).toBe('Player hacked this')
    })
  })

  describe('effects', () => {
    it('triggers an effect', () => {
      store.createNewComputer('Test')
      store.triggerEffect('breach')
      expect(store.state.activeEffects.length).toBeGreaterThan(0)
      expect(store.state.activeEffects[0].type).toBe('breach')
    })

    it('clears all effects', () => {
      store.createNewComputer('Test')
      store.triggerEffect('breach')
      store.triggerEffect('alarm')
      store.clearEffects()
      expect(store.state.activeEffects).toHaveLength(0)
    })

    it('clamps ambient intensity to 0-1', () => {
      store.setAmbientIntensity(1.5)
      expect(store.state.ambientIntensity).toBe(1)

      store.setAmbientIntensity(-0.5)
      expect(store.state.ambientIntensity).toBe(0)

      store.setAmbientIntensity(0.7)
      expect(store.state.ambientIntensity).toBe(0.7)
    })
  })

  describe('save/load encounters', () => {
    it('saves current computer as encounter', () => {
      store.createNewComputer('Starbase Alpha')
      const encounter = store.saveEncounter()
      expect(encounter).not.toBeNull()
      expect(encounter!.name).toBe('Starbase Alpha')
      expect(store.state.savedEncounters).toHaveLength(1)
    })

    it('saves with custom name', () => {
      store.createNewComputer('Computer')
      const encounter = store.saveEncounter('Custom Name')
      expect(encounter!.name).toBe('Custom Name')
    })

    it('loads a saved encounter', () => {
      store.createNewComputer('Original')
      store.state.computer!.level = 7
      const saved = store.saveEncounter()

      store.createNewComputer('Different')
      store.loadEncounter(saved!.id)
      expect(store.state.computer!.name).toBe('Original')
      expect(store.state.computer!.level).toBe(7)
    })

    it('deletes a saved encounter', () => {
      store.createNewComputer('To Delete')
      const saved = store.saveEncounter()
      store.deleteEncounter(saved!.id)
      expect(store.state.savedEncounters).toHaveLength(0)
    })

    it('returns null when saving with no computer', () => {
      store.state.computer = null
      const result = store.saveEncounter()
      expect(result).toBeNull()
    })
  })
})
