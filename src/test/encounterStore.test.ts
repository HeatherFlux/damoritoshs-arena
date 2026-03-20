import { describe, it, expect, beforeEach } from 'vitest'
import { useEncounterStore } from '../stores/encounterStore'
import type { Creature } from '../types/creature'

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    name: 'Test Creature',
    level: 3,
    traits: ['Beast'],
    size: 'medium',
    source: 'Custom',
    perception: 8,
    senses: [],
    languages: [],
    skills: {},
    abilities: { str: 3, dex: 2, con: 2, int: -3, wis: 1, cha: 0 },
    ac: 18,
    saves: { fort: 8, ref: 7, will: 5 },
    hp: 45,
    immunities: [],
    resistances: [],
    weaknesses: [],
    speed: '30 feet',
    attacks: [],
    specialAbilities: [],
    ...overrides,
  }
}

describe('encounterStore', () => {
  let store: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    store = useEncounterStore()
  })

  describe('addCustomCreature', () => {
    it('adds a custom creature to the list', () => {
      const before = store.state.creatures.length
      const creature = makeCreature({ name: 'My Custom Beast' })
      store.addCustomCreature(creature)
      expect(store.state.creatures.length).toBe(before + 1)
      expect(store.state.creatures.find(c => c.name === 'My Custom Beast')).toBeTruthy()
    })

    it('generates an ID if not provided', () => {
      const creature = makeCreature({ id: '' })
      store.addCustomCreature(creature)
      expect(creature.id).toMatch(/^custom-/)
    })
  })

  describe('isCustomCreature', () => {
    it('returns true for custom creatures', () => {
      const creature = makeCreature({ id: `custom-${Date.now()}` })
      store.addCustomCreature(creature)
      expect(store.isCustomCreature(creature.id)).toBe(true)
    })

    it('returns false for bundled creatures', () => {
      // First creature in the list should be bundled
      const bundled = store.state.creatures[0]
      if (bundled) {
        expect(store.isCustomCreature(bundled.id)).toBe(false)
      }
    })
  })

  describe('updateCustomCreature', () => {
    it('updates an existing custom creature in place', () => {
      const creature = makeCreature({ name: 'Original Name' })
      store.addCustomCreature(creature)

      const updated = { ...creature, name: 'Updated Name' }
      store.updateCustomCreature(creature.id, updated)

      const found = store.state.creatures.find(c => c.id === creature.id)
      expect(found?.name).toBe('Updated Name')
    })

    it('does not change list length', () => {
      const creature = makeCreature()
      store.addCustomCreature(creature)
      const before = store.state.creatures.length

      store.updateCustomCreature(creature.id, { ...creature, name: 'Changed' })
      expect(store.state.creatures.length).toBe(before)
    })

    it('refuses to update bundled creatures', () => {
      const bundled = store.state.creatures[0]
      if (bundled) {
        const originalName = bundled.name
        store.updateCustomCreature(bundled.id, { ...bundled, name: 'Hacked' })
        expect(store.state.creatures.find(c => c.id === bundled.id)?.name).toBe(originalName)
      }
    })
  })

  describe('deleteCustomCreature', () => {
    it('removes a custom creature', () => {
      const creature = makeCreature()
      store.addCustomCreature(creature)
      const before = store.state.creatures.length

      store.deleteCustomCreature(creature.id)
      expect(store.state.creatures.length).toBe(before - 1)
      expect(store.state.creatures.find(c => c.id === creature.id)).toBeUndefined()
    })

    it('refuses to delete bundled creatures', () => {
      const bundled = store.state.creatures[0]
      if (bundled) {
        const before = store.state.creatures.length
        store.deleteCustomCreature(bundled.id)
        expect(store.state.creatures.length).toBe(before)
      }
    })
  })
})
