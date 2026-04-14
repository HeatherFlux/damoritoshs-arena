import { describe, it, expect, beforeEach } from 'vitest'
import { useCombatStore } from '../stores/combatStore'
import { makeCreature, makeHazard } from './fixtures'

describe('combatStore — extended', () => {
  let store: ReturnType<typeof useCombatStore>

  beforeEach(() => {
    store = useCombatStore()
    store.endCombat()
  })

  describe('addCreature with adjustments', () => {
    it('applies elite HP and AC', () => {
      const creature = makeCreature({ hp: 45, ac: 18, level: 5 })
      const combatant = store.addCreature(creature, 'elite')
      // Elite level 5: +20 HP, +2 AC
      expect(combatant.maxHP).toBe(65)
      expect(combatant.currentHP).toBe(65)
      expect(combatant.ac).toBe(20)
    })

    it('applies weak HP and AC', () => {
      const creature = makeCreature({ hp: 45, ac: 18, level: 5 })
      const combatant = store.addCreature(creature, 'weak')
      // Weak level 5 (bracket 3-5): -15 HP, -2 AC
      expect(combatant.maxHP).toBe(30)
      expect(combatant.ac).toBe(16)
    })

    it('gives unique names to duplicate creatures', () => {
      const creature = makeCreature({ name: 'Goblin Warrior' })
      const c1 = store.addCreature(creature)
      const c2 = store.addCreature(creature)
      expect(c1.name).toBe('Goblin Warrior')
      expect(c2.name).toBe('Goblin Warrior 2')
    })

    it('continues numbering for multiple duplicates', () => {
      const creature = makeCreature({ name: 'Skeleton' })
      store.addCreature(creature)
      store.addCreature(creature)
      const c3 = store.addCreature(creature)
      expect(c3.name).toBe('Skeleton 3')
    })
  })

  describe('addHazard', () => {
    it('adds complex hazard with initiative 0', () => {
      const hazard = makeHazard({ complexity: 'complex', name: 'Blade Pillar', hp: 50, ac: 20 })
      const combatant = store.addHazard(hazard)
      expect(combatant.initiative).toBe(0)
      expect(combatant.isActive).toBe(true)
      expect(combatant.isHazard).toBe(true)
    })

    it('adds simple hazard with very low initiative', () => {
      const hazard = makeHazard({ complexity: 'simple', name: 'Dart Trap' })
      const combatant = store.addHazard(hazard)
      expect(combatant.initiative).toBe(-999)
      expect(combatant.isActive).toBe(false)
    })
  })

  describe('temp HP', () => {
    it('sets temp HP', () => {
      store.startCombat()
      const combatant = store.addPlayer('Hero', 10, 50, 20)
      store.setTempHP(combatant.id, 10)
      expect(state().combatants.find(c => c.id === combatant.id)!.tempHP).toBe(10)
    })

    it('damage consumes temp HP first', () => {
      store.startCombat()
      const combatant = store.addPlayer('Hero', 10, 50, 20)
      store.setTempHP(combatant.id, 10)
      store.applyDamage(combatant.id, 15)
      const c = state().combatants.find(c => c.id === combatant.id)!
      expect(c.tempHP).toBe(0)
      expect(c.currentHP).toBe(45) // 50 - (15 - 10) = 45
    })
  })

  describe('setMaxHP', () => {
    it('caps current HP at new max', () => {
      store.startCombat()
      const combatant = store.addPlayer('Hero', 10, 50, 20)
      store.setMaxHP(combatant.id, 30)
      const c = state().combatants.find(c => c.id === combatant.id)!
      expect(c.maxHP).toBe(30)
      expect(c.currentHP).toBe(30)
    })

    it('enforces minimum max HP of 1', () => {
      store.startCombat()
      const combatant = store.addPlayer('Hero', 10, 50, 20)
      store.setMaxHP(combatant.id, 0)
      expect(state().combatants.find(c => c.id === combatant.id)!.maxHP).toBe(1)
    })
  })

  function state() {
    return store.state.combat!
  }

  describe('player view sync', () => {
    it('requestStateFromGM loads from localStorage immediately', () => {
      // Start combat and add a player on the GM side
      store.startCombat('Sync Test')
      store.addPlayer('Zephyr', 15, 50, 20)

      // Now simulate a player view requesting state
      // First, the combat is saved to localStorage by startCombat/addPlayer
      const saved = localStorage.getItem('sf2e-combat')
      expect(saved).toBeTruthy()

      // Create a fresh store instance and set as player view
      const playerStore = useCombatStore()
      playerStore.setGMView(false)
      playerStore.requestStateFromGM()

      // Player view should have data loaded from localStorage
      expect(playerStore.playerViewData.value).not.toBeNull()
      expect(playerStore.playerViewData.value!.combatName).toBe('Sync Test')
      expect(playerStore.playerViewData.value!.isActive).toBe(true)
      expect(playerStore.playerViewData.value!.combatants).toHaveLength(1)
      expect(playerStore.playerViewData.value!.combatants[0].name).toBe('Zephyr')
    })

    it('player view data does not expose HP values', () => {
      store.startCombat('HP Test')
      store.addPlayer('Tank', 10, 100, 25)

      const playerStore = useCombatStore()
      playerStore.setGMView(false)
      playerStore.requestStateFromGM()

      const combatant = playerStore.playerViewData.value!.combatants[0]
      // Player data should only have name, conditions, isDead, isPlayer, isActive
      expect(combatant).not.toHaveProperty('currentHP')
      expect(combatant).not.toHaveProperty('maxHP')
      expect(combatant).not.toHaveProperty('ac')
      expect(combatant).not.toHaveProperty('tempHP')
    })

    it('player view shows correct turn and round', () => {
      store.startCombat('Turn Test')
      store.addPlayer('Player1', 20, 50, 20)
      store.addPlayer('Player2', 10, 50, 20)

      const playerStore = useCombatStore()
      playerStore.setGMView(false)
      playerStore.requestStateFromGM()

      expect(playerStore.playerViewData.value!.round).toBe(1)
      expect(playerStore.playerViewData.value!.turn).toBe(0)
    })

    it('player view includes conditions', () => {
      store.startCombat('Condition Test')
      const c = store.addPlayer('Cursed', 10, 50, 20)
      store.addCondition(c.id, 'frightened', 2)

      const playerStore = useCombatStore()
      playerStore.setGMView(false)
      playerStore.requestStateFromGM()

      const combatant = playerStore.playerViewData.value!.combatants[0]
      expect(combatant.conditions).toHaveLength(1)
      expect(combatant.conditions[0].name).toBe('frightened')
      expect(combatant.conditions[0].value).toBe(2)
    })
  })
})
