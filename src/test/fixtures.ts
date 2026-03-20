/**
 * Shared test factories for Damoritosh's Arena tests
 */
import type { Creature } from '../types/creature'
import type { Hazard } from '../types/hazard'
import type { Party, Player } from '../types/party'

export function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

export function makeHazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: `hazard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Test Trap',
    level: 3,
    complexity: 'simple',
    type: 'trap',
    traits: ['Trap'],
    source: 'Custom',
    description: 'A test trap.',
    actions: [],
    hp: 20,
    ac: 15,
    ...overrides,
  }
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Test Player',
    maxHP: 40,
    ac: 20,
    level: 5,
    class: 'Soldier',
    ancestry: 'Human',
    perception: 12,
    fortitude: 14,
    reflex: 10,
    will: 11,
    ...overrides,
  }
}

export function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: `party-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Test Party',
    players: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makePathbuilderJSON(overrides: Record<string, unknown> = {}): string {
  const base = {
    success: true,
    build: {
      name: 'Zephyr Windwalker',
      class: 'Soldier',
      level: 5,
      ancestry: 'Human',
      heritage: 'Versatile Heritage',
      background: 'Spacer',
      size: 2,
      keyability: 'str',
      languages: ['Common', 'Vesk'],
      abilities: { str: 18, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
      attributes: {
        ancestryhp: 8,
        classhp: 10,
        bonushp: 0,
        bonushpPerLevel: 0,
        speed: 25,
        speedBonus: 0,
      },
      proficiencies: {
        perception: 2,
        fortitude: 4,
        reflex: 2,
        will: 2,
      },
      acTotal: { acTotal: 22, acProfBonus: 4 },
      ...overrides,
    },
  }
  return JSON.stringify(base)
}
