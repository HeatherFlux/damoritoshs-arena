import { describe, it, expect, beforeEach } from 'vitest'
import { useCustomPanelStore } from '../stores/customPanelStore'
import type { Creature } from '../types/creature'

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'creature-123',
    name: 'Space Goblin',
    level: 1,
    traits: ['Goblin', 'Humanoid'],
    size: 'small',
    source: 'Alien Archive',
    perception: 4,
    senses: ['darkvision'],
    languages: ['Common', 'Goblin'],
    skills: { stealth: 7, acrobatics: 5 },
    abilities: { str: 0, dex: 3, con: 1, int: 0, wis: 0, cha: 1 },
    ac: 16,
    saves: { fort: 4, ref: 7, will: 3 },
    hp: 18,
    immunities: [],
    resistances: [],
    weaknesses: [],
    speed: '25 feet',
    attacks: [
      { name: 'Dogslicer', type: 'melee', bonus: 7, damage: '1d6+2 slashing', traits: ['agile', 'backstabber', 'finesse'], actions: 1 },
    ],
    specialAbilities: [],
    ...overrides,
  }
}

describe('customPanelStore', () => {
  let store: ReturnType<typeof useCustomPanelStore>

  beforeEach(() => {
    store = useCustomPanelStore()
    store.clearEditing()
  })

  describe('startEditing (edit in place)', () => {
    it('sets editingCreatureId for custom creatures', () => {
      const creature = makeCreature()
      store.startEditing(creature, false)

      expect(store.state.editingCreatureId).toBe('creature-123')
      expect(store.state.pendingCreatureData).toBeTruthy()
      expect(store.state.pendingCreatureData?.name).toBe('Space Goblin')
    })

    it('deep clones creature data', () => {
      const creature = makeCreature()
      store.startEditing(creature, false)

      // Mutating the pending data should not affect the original
      store.state.pendingCreatureData!.name = 'Modified'
      expect(creature.name).toBe('Space Goblin')
    })

    it('preserves all creature fields', () => {
      const creature = makeCreature()
      store.startEditing(creature, false)

      const pending = store.state.pendingCreatureData!
      expect(pending.level).toBe(1)
      expect(pending.ac).toBe(16)
      expect(pending.hp).toBe(18)
      expect(pending.attacks?.length).toBe(1)
      expect(pending.attacks?.[0]?.name).toBe('Dogslicer')
      expect(pending.skills?.stealth).toBe(7)
      expect(pending.senses).toContain('darkvision')
    })
  })

  describe('startEditing (clone / new)', () => {
    it('sets editingCreatureId to null for new creatures', () => {
      const creature = makeCreature()
      store.startEditing(creature, true, ' (Copy)')

      expect(store.state.editingCreatureId).toBeNull()
    })

    it('appends name suffix', () => {
      const creature = makeCreature()
      store.startEditing(creature, true, ' (Copy)')

      expect(store.state.pendingCreatureData?.name).toBe('Space Goblin (Copy)')
    })

    it('appends (Custom) suffix for bundled edits', () => {
      const creature = makeCreature()
      store.startEditing(creature, true, ' (Custom)')

      expect(store.state.pendingCreatureData?.name).toBe('Space Goblin (Custom)')
    })

    it('clears the id so a new one is generated on save', () => {
      const creature = makeCreature()
      store.startEditing(creature, true, ' (Copy)')

      expect(store.state.pendingCreatureData?.id).toBeUndefined()
    })
  })

  describe('clearEditing', () => {
    it('resets both editing fields', () => {
      const creature = makeCreature()
      store.startEditing(creature, false)

      expect(store.state.editingCreatureId).not.toBeNull()
      expect(store.state.pendingCreatureData).not.toBeNull()

      store.clearEditing()

      expect(store.state.editingCreatureId).toBeNull()
      expect(store.state.pendingCreatureData).toBeNull()
    })
  })
})
