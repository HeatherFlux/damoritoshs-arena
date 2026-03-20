import { describe, it, expect, beforeEach } from 'vitest'
import { usePartyStore } from '../stores/partyStore'
import { makePathbuilderJSON } from './fixtures'

describe('partyStore', () => {
  let store: ReturnType<typeof usePartyStore>

  beforeEach(() => {
    store = usePartyStore()
    // Clear any leftover parties
    while (store.state.parties.length > 0) {
      store.deleteParty(store.state.parties[0].id)
    }
  })

  describe('party CRUD', () => {
    it('creates a party', () => {
      const party = store.createParty('Heroes')
      expect(party.name).toBe('Heroes')
      expect(party.players).toEqual([])
      expect(store.state.parties).toHaveLength(1)
    })

    it('sets newly created party as active', () => {
      const party = store.createParty('Active Party')
      expect(store.state.activePartyId).toBe(party.id)
      expect(store.activeParty.value?.id).toBe(party.id)
    })

    it('deletes a party', () => {
      const party = store.createParty('Delete Me')
      store.deleteParty(party.id)
      expect(store.state.parties).toHaveLength(0)
    })

    it('falls back to first party when active is deleted', () => {
      const p1 = store.createParty('First')
      const p2 = store.createParty('Second')
      store.setActiveParty(p2.id)
      store.deleteParty(p2.id)
      expect(store.state.activePartyId).toBe(p1.id)
    })

    it('sets activePartyId to null when all parties deleted', () => {
      const party = store.createParty('Only')
      store.deleteParty(party.id)
      expect(store.state.activePartyId).toBeNull()
    })

    it('sets active party', () => {
      const p1 = store.createParty('A')
      store.createParty('B')
      store.setActiveParty(p1.id)
      expect(store.state.activePartyId).toBe(p1.id)
    })

    it('updates party name', () => {
      const party = store.createParty('Old Name')
      store.updatePartyName(party.id, 'New Name')
      expect(store.state.parties[0].name).toBe('New Name')
    })
  })

  describe('player management', () => {
    beforeEach(() => {
      store.createParty('Test Party')
    })

    it('adds a player to active party', () => {
      const player = store.addPlayer({ name: 'Zephyr', maxHP: 40, ac: 20 })
      expect(player).not.toBeNull()
      expect(player!.name).toBe('Zephyr')
      expect(store.activeParty.value!.players).toHaveLength(1)
    })

    it('generates ID for new player', () => {
      const player = store.addPlayer({ name: 'Test', maxHP: 20, ac: 15 })
      expect(player!.id).toBeTruthy()
    })

    it('returns null when no active party', () => {
      store.setActiveParty(null)
      const result = store.addPlayer({ name: 'Nobody', maxHP: 10, ac: 10 })
      expect(result).toBeNull()
    })

    it('removes a player', () => {
      const player = store.addPlayer({ name: 'Remove Me', maxHP: 30, ac: 18 })
      store.removePlayer(player!.id)
      expect(store.activeParty.value!.players).toHaveLength(0)
    })

    it('updates a player', () => {
      const player = store.addPlayer({ name: 'Update Me', maxHP: 30, ac: 18 })
      store.updatePlayer(player!.id, { name: 'Updated', maxHP: 50 })
      expect(store.activeParty.value!.players[0].name).toBe('Updated')
      expect(store.activeParty.value!.players[0].maxHP).toBe(50)
    })
  })

  describe('computed values', () => {
    it('partyLevel returns average of player levels', () => {
      store.createParty('Leveled')
      store.addPlayer({ name: 'A', maxHP: 20, ac: 15, level: 4 })
      store.addPlayer({ name: 'B', maxHP: 20, ac: 15, level: 6 })
      expect(store.partyLevel.value).toBe(5)
    })

    it('partyLevel returns 1 with no players', () => {
      store.createParty('Empty')
      expect(store.partyLevel.value).toBe(1)
    })

    it('partySize returns player count', () => {
      store.createParty('Sized')
      store.addPlayer({ name: 'A', maxHP: 20, ac: 15 })
      store.addPlayer({ name: 'B', maxHP: 20, ac: 15 })
      store.addPlayer({ name: 'C', maxHP: 20, ac: 15 })
      expect(store.partySize.value).toBe(3)
    })

    it('partySize returns 4 with no active party', () => {
      expect(store.partySize.value).toBe(4)
    })
  })

  describe('pathbuilder import', () => {
    it('imports player from valid pathbuilder JSON', () => {
      store.createParty('Import Test')
      const result = store.importPlayerFromPathbuilder(makePathbuilderJSON())
      expect(result.success).toBe(true)
      expect(result.player).toBeDefined()
      expect(result.player!.name).toBe('Zephyr Windwalker')
      expect(store.activeParty.value!.players).toHaveLength(1)
    })

    it('fails when no active party', () => {
      const result = store.importPlayerFromPathbuilder(makePathbuilderJSON())
      expect(result.success).toBe(false)
      expect(result.error).toContain('No active party')
    })

    it('fails on invalid JSON', () => {
      store.createParty('Test')
      const result = store.importPlayerFromPathbuilder('not json')
      expect(result.success).toBe(false)
    })
  })

  describe('export/import', () => {
    it('exports parties as JSON', () => {
      store.createParty('Export Me')
      store.addPlayer({ name: 'Player', maxHP: 30, ac: 18 })
      const json = store.exportParties()
      const data = JSON.parse(json)
      expect(data.version).toBe(1)
      expect(data.parties).toHaveLength(1)
    })

    it('imports in merge mode adds to existing', () => {
      store.createParty('Existing')
      const exportJson = store.exportParties()
      const result = store.importParties(exportJson, 'merge')
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(store.state.parties).toHaveLength(2) // existing + imported
    })

    it('imports in replace mode replaces all', () => {
      store.createParty('Old Party')
      store.createParty('Also Old')
      const exportJson = JSON.stringify({ parties: [{ id: 'new', name: 'New', players: [], createdAt: new Date(), updatedAt: new Date() }] })
      const result = store.importParties(exportJson, 'replace')
      expect(result.success).toBe(true)
      expect(store.state.parties).toHaveLength(1)
    })

    it('fails on invalid import data', () => {
      const result = store.importParties('not json')
      expect(result.success).toBe(false)
    })
  })
})
