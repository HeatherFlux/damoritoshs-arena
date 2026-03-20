import { describe, it, expect, beforeEach } from 'vitest'
import { useCombatStore } from '../stores/combatStore'

describe('combatStore', () => {
  let store: ReturnType<typeof useCombatStore>

  beforeEach(() => {
    store = useCombatStore()
    // Clean slate
    store.endCombat()
  })

  describe('combat lifecycle', () => {
    it('starts combat', () => {
      store.startCombat('Test Combat')
      expect(store.state.combat).toBeTruthy()
      expect(store.state.combat?.name).toBe('Test Combat')
      expect(store.state.combat?.round).toBe(1)
      expect(store.state.combat?.turn).toBe(0)
    })

    it('ends combat', () => {
      store.startCombat()
      store.endCombat()
      expect(store.state.combat).toBeNull()
    })
  })

  describe('combatants', () => {
    beforeEach(() => {
      store.startCombat('Test')
    })

    it('adds a player', () => {
      const combatant = store.addPlayer('Poppy', 15, 85, 24)
      expect(combatant.name).toBe('Poppy')
      expect(combatant.initiative).toBe(15)
      expect(combatant.maxHP).toBe(85)
      expect(combatant.ac).toBe(24)
      expect(combatant.isPlayer).toBe(true)
    })

    it('allows duplicate player names (no auto-suffix for players)', () => {
      store.addPlayer('Poppy', 15, 85, 24)
      const second = store.addPlayer('Poppy', 12, 85, 24)
      // addPlayer doesn't de-duplicate — only addCreature does
      expect(second.name).toBe('Poppy')
      expect(store.state.combat!.combatants.length).toBe(2)
    })

    it('removes a combatant', () => {
      const combatant = store.addPlayer('Jane', 10, 60, 20)
      expect(store.state.combat!.combatants.length).toBe(1)
      store.removeCombatant(combatant.id)
      expect(store.state.combat!.combatants.length).toBe(0)
    })
  })

  describe('turn management', () => {
    beforeEach(() => {
      store.startCombat('Test')
      store.addPlayer('Poppy', 15, 85, 24)
      store.addPlayer('Drakesh', 12, 100, 22)
      store.addPlayer('Basil', 8, 70, 20)
    })

    it('sorts combatants by initiative', () => {
      const sorted = store.sortedCombatants.value
      expect(sorted[0].name).toBe('Poppy')   // 15
      expect(sorted[1].name).toBe('Drakesh') // 12
      expect(sorted[2].name).toBe('Basil')   // 8
    })

    it('advances turn', () => {
      expect(store.state.combat!.turn).toBe(0)
      store.nextTurn()
      expect(store.state.combat!.turn).toBe(1)
    })

    it('wraps around and increments round', () => {
      store.nextTurn() // Drakesh
      store.nextTurn() // Basil
      store.nextTurn() // Back to Poppy, Round 2
      expect(store.state.combat!.round).toBe(2)
    })

    it('goes to previous turn', () => {
      store.nextTurn()
      expect(store.state.combat!.turn).toBe(1)
      store.previousTurn()
      expect(store.state.combat!.turn).toBe(0)
    })
  })

  describe('HP and conditions', () => {
    let playerId: string

    beforeEach(() => {
      store.startCombat('Test')
      const player = store.addPlayer('Poppy', 15, 85, 24)
      playerId = player.id
    })

    it('applies damage', () => {
      store.applyDamage(playerId, 20)
      const c = store.state.combat!.combatants[0]
      expect(c.currentHP).toBe(65)
    })

    it('applies healing', () => {
      store.applyDamage(playerId, 30)
      store.applyHealing(playerId, 10)
      const c = store.state.combat!.combatants[0]
      expect(c.currentHP).toBe(65)
    })

    it('does not heal above max', () => {
      store.applyHealing(playerId, 100)
      const c = store.state.combat!.combatants[0]
      expect(c.currentHP).toBe(85)
    })

    it('marks dead at 0 HP', () => {
      store.applyDamage(playerId, 100)
      const c = store.state.combat!.combatants[0]
      expect(c.currentHP).toBe(0)
      expect(c.isDead).toBe(true)
    })

    it('revives when healed from 0', () => {
      store.applyDamage(playerId, 100)
      store.applyHealing(playerId, 10)
      const c = store.state.combat!.combatants[0]
      expect(c.currentHP).toBe(10)
      expect(c.isDead).toBe(false)
    })

    it('adds conditions', () => {
      store.addCondition(playerId, 'frightened', 2)
      const c = store.state.combat!.combatants[0]
      expect(c.conditions.length).toBe(1)
      expect(c.conditions[0].name).toBe('frightened')
      expect(c.conditions[0].value).toBe(2)
    })

    it('removes conditions', () => {
      store.addCondition(playerId, 'blinded')
      store.removeCondition(playerId, 'blinded')
      const c = store.state.combat!.combatants[0]
      expect(c.conditions.length).toBe(0)
    })

    it('toggles dead', () => {
      store.toggleDead(playerId)
      expect(store.state.combat!.combatants[0].isDead).toBe(true)
      store.toggleDead(playerId)
      expect(store.state.combat!.combatants[0].isDead).toBe(false)
    })
  })

  describe('player view data', () => {
    it('exposes playerViewData reactive', () => {
      expect(store.playerViewData).toBeTruthy()
    })

    it('broadcasts on state changes (BroadcastChannel mocked)', () => {
      // Just verify broadcastCombatState doesn't throw
      store.startCombat('Test')
      store.addPlayer('Poppy', 15, 85, 24)
      store.nextTurn()
      // No error = broadcast calls are wired up correctly
    })
  })

  describe('openPlayerView', () => {
    it('is a callable function', () => {
      expect(typeof store.openPlayerView).toBe('function')
    })
  })
})
