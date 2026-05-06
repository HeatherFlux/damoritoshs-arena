import { describe, it, expect } from 'vitest'
import { simulateScene } from '../utils/simulateScene'
import { createEmptySavedScene } from '../types/starship'
import type { StarshipThreat, StarshipAction } from '../types/starship'

function makeAttackAction(overrides: Partial<StarshipAction> = {}): StarshipAction {
  return {
    id: 'a1', name: 'Cannon', actionCost: 2, role: 'gunner',
    skills: [], isAttack: true, damage: '2d6+5',
    description: '',
    outcomes: { criticalSuccess: '', success: '' },
    ...overrides,
  }
}

function makeThreat(overrides: Partial<StarshipThreat> = {}): StarshipThreat {
  return {
    id: 't1', name: 'Test Cruiser', type: 'enemy_ship', level: 5,
    maxHP: 80, currentHP: 80, ac: 22, isDefeated: false,
    routine: {
      actionsPerTurn: 2,
      description: '',
      actions: [
        { id: 'r1', name: 'Beam', actionCost: 1, type: 'attack', description: '', attackBonus: 14, damage: '2d10+5' },
      ],
    },
    ...overrides,
  }
}

describe('simulateScene', () => {
  it('returns a summary with all outcome buckets', () => {
    const scene = createEmptySavedScene()
    scene.victoryCondition = 'defeat'
    scene.threats = [makeThreat()]
    scene.starshipActions = [makeAttackAction()]

    const summary = simulateScene(scene, { iterations: 100 })

    expect(summary.iterations).toBe(100)
    expect(summary.outcomes).toHaveProperty('victory_vp')
    expect(summary.outcomes).toHaveProperty('victory_defeat')
    expect(summary.outcomes).toHaveProperty('defeat_ship_destroyed')
    expect(summary.outcomes).toHaveProperty('stalled')
    // Counts add up to iterations.
    const total = Object.values(summary.outcomes).reduce((s, n) => s + n, 0)
    expect(total).toBe(100)
  })

  it('a one-sided fight (PCs heavily out-attack) victories most of the time', () => {
    const scene = createEmptySavedScene()
    scene.level = 10
    scene.victoryCondition = 'defeat'
    // Glass-cannon threat: low HP, weak attack
    scene.threats = [makeThreat({
      maxHP: 20, currentHP: 20, ac: 14,
      routine: {
        actionsPerTurn: 1,
        description: '',
        actions: [{ id: 'r1', name: 'Pop', actionCost: 1, type: 'attack', description: '', attackBonus: 5, damage: '1d4' }],
      },
    })]
    // Strong PC ship + crew
    scene.starship.maxHP = 200
    scene.starship.currentHP = 200
    scene.starship.ac = 25
    scene.starshipActions = [makeAttackAction({ damage: '5d10+10' })]

    const summary = simulateScene(scene, { iterations: 200, gunnerBonus: 25 })

    expect(summary.outcomes.victory_defeat).toBeGreaterThan(150)
    expect(summary.outcomes.defeat_ship_destroyed).toBeLessThan(20)
  })

  it('a one-sided fight in the threat\'s favour produces lots of defeats', () => {
    const scene = createEmptySavedScene()
    scene.level = 1
    scene.victoryCondition = 'defeat'
    // Brutal threat: high HP, big attack
    scene.threats = [makeThreat({
      maxHP: 500, currentHP: 500, ac: 30,
      routine: {
        actionsPerTurn: 3,
        description: '',
        actions: [
          { id: 'r1', name: 'Heavy Beam', actionCost: 1, type: 'attack', description: '', attackBonus: 30, damage: '8d10+20' },
          { id: 'r2', name: 'Heavy Beam', actionCost: 1, type: 'attack', description: '', attackBonus: 30, damage: '8d10+20' },
          { id: 'r3', name: 'Heavy Beam', actionCost: 1, type: 'attack', description: '', attackBonus: 30, damage: '8d10+20' },
        ],
      },
    })]
    // Weak PC ship + crew
    scene.starship.maxHP = 30
    scene.starship.currentHP = 30
    scene.starship.maxShields = 0
    scene.starship.currentShields = 0
    scene.starship.ac = 15
    scene.starshipActions = [makeAttackAction({ damage: '1d4' })]

    const summary = simulateScene(scene, { iterations: 200, gunnerBonus: 0 })

    expect(summary.outcomes.defeat_ship_destroyed).toBeGreaterThan(150)
  })

  it('survival victory triggers when the ship lasts the required rounds', () => {
    const scene = createEmptySavedScene()
    scene.level = 5
    scene.victoryCondition = 'survival'
    scene.survivalRounds = 3
    scene.threats = [makeThreat({
      maxHP: 1000, currentHP: 1000, // unkillable
      routine: {
        actionsPerTurn: 1,
        description: '',
        actions: [{ id: 'r1', name: 'Tickle', actionCost: 1, type: 'attack', description: '', attackBonus: 5, damage: '1d4' }],
      },
    })]
    scene.starship.maxHP = 200
    scene.starship.currentHP = 200
    scene.starship.ac = 25
    scene.starshipActions = []

    const summary = simulateScene(scene, { iterations: 100 })

    expect(summary.outcomes.victory_survival).toBeGreaterThan(80)
  })

  it('records median rounds within the round cap', () => {
    const scene = createEmptySavedScene()
    scene.victoryCondition = 'defeat'
    scene.threats = [makeThreat({ maxHP: 50 })]
    scene.starshipActions = [makeAttackAction()]

    const summary = simulateScene(scene, { iterations: 100, roundCap: 20 })

    expect(summary.medianRounds).toBeGreaterThan(0)
    expect(summary.medianRounds).toBeLessThanOrEqual(20)
    expect(summary.meanRounds).toBeGreaterThan(0)
  })
})
