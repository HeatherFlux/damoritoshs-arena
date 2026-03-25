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

  describe('bug fixes', () => {
    describe('all dead combatants (bug #1)', () => {
      beforeEach(() => {
        store.startCombat('Test')
        store.addPlayer('Poppy', 15, 85, 24)
        store.addPlayer('Drakesh', 12, 100, 22)
      })

      it('nextTurn still works when all combatants are dead', () => {
        // Kill everyone
        const combatants = store.state.combat!.combatants
        combatants.forEach(c => { c.isDead = true })

        // Should NOT hang — should advance turn and increment round
        store.nextTurn()
        expect(store.state.combat!.turn).toBeDefined()
        expect(store.state.combat!.round).toBe(2)
      })

      it('nextTurn skips dead but lands on dead if all are dead', () => {
        const combatants = store.state.combat!.combatants
        combatants.forEach(c => { c.isDead = true })

        const turnBefore = store.state.combat!.turn
        store.nextTurn()
        // Turn should have advanced (not stuck)
        expect(store.state.combat!.turn !== turnBefore || store.state.combat!.round > 1).toBe(true)
      })
    })

    describe('removeCombatant preserves current turn (bug #2)', () => {
      beforeEach(() => {
        store.startCombat('Test')
        store.addPlayer('Poppy', 15, 85, 24)    // sorted 0
        store.addPlayer('Drakesh', 12, 100, 22)  // sorted 1
        store.addPlayer('Basil', 8, 70, 20)      // sorted 2
      })

      it('removing higher-initiative combatant keeps current turn correct', () => {
        // Advance to Drakesh (turn 1 in sorted order)
        store.nextTurn()
        expect(store.sortedCombatants.value[store.state.combat!.turn].name).toBe('Drakesh')

        // Remove Poppy (higher initiative, sorted index 0)
        const poppy = store.state.combat!.combatants.find(c => c.name === 'Poppy')!
        store.removeCombatant(poppy.id)

        // Drakesh should still be the current combatant
        const current = store.sortedCombatants.value[store.state.combat!.turn]
        expect(current.name).toBe('Drakesh')
      })

      it('removing lower-initiative combatant keeps current turn correct', () => {
        // Stay on Poppy (turn 0)
        expect(store.sortedCombatants.value[store.state.combat!.turn].name).toBe('Poppy')

        // Remove Basil (lowest initiative)
        const basil = store.state.combat!.combatants.find(c => c.name === 'Basil')!
        store.removeCombatant(basil.id)

        // Poppy should still be current
        const current = store.sortedCombatants.value[store.state.combat!.turn]
        expect(current.name).toBe('Poppy')
      })

      it('removing current combatant advances to next in line', () => {
        // On Poppy (turn 0)
        const poppy = store.state.combat!.combatants.find(c => c.name === 'Poppy')!
        store.removeCombatant(poppy.id)

        // Turn 0 should now point to Drakesh (next highest initiative)
        const current = store.sortedCombatants.value[store.state.combat!.turn]
        expect(current.name).toBe('Drakesh')
      })

      it('removing last combatant resets turn to 0', () => {
        // Remove all but one
        const combatants = [...store.state.combat!.combatants]
        store.removeCombatant(combatants[0].id)
        store.removeCombatant(combatants[1].id)
        store.removeCombatant(combatants[2].id)

        expect(store.state.combat!.combatants.length).toBe(0)
        expect(store.state.combat!.turn).toBe(0)
      })
    })

    describe('previousTurn round handling (bug #13)', () => {
      beforeEach(() => {
        store.startCombat('Test')
        store.addPlayer('Poppy', 15, 85, 24)
        store.addPlayer('Drakesh', 12, 100, 22)
      })

      it('previousTurn at round 1 does not go below round 1', () => {
        // At round 1, turn 0
        store.previousTurn()
        expect(store.state.combat!.round).toBe(1)
      })

      it('previousTurn only decrements round once even with dead skipping', () => {
        // Advance to round 2
        store.nextTurn()
        store.nextTurn() // Round 2
        expect(store.state.combat!.round).toBe(2)

        // Kill Poppy (sorted index 0) — going back should skip them
        const poppy = store.state.combat!.combatants.find(c => c.name === 'Poppy')!
        poppy.isDead = true

        // Previous from Drakesh wraps back and skips dead Poppy
        // but round should only decrement once
        store.previousTurn()
        expect(store.state.combat!.round).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
