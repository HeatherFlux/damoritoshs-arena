/**
 * Starfinder 2e Creature Types
 * Based on the remaster format from Alien Archive
 */

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface Saves {
  fort: number
  ref: number
  will: number
}

export interface Attack {
  name: string
  type: 'melee' | 'ranged' | 'area'
  bonus: number
  damage: string
  traits: string[]
  actions: 1 | 2 | 3
  range?: string
  area?: string
}

export interface SpellEntry {
  level: number
  spells: string[]
  dc?: number
  attack?: number
}

export interface SpecialAbility {
  name: string
  actions?: 0 | 1 | 2 | 3 | 'reaction' | 'free'
  traits?: string[]
  description: string
}

export interface Creature {
  id: string
  name: string
  level: number
  traits: string[]
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
  source: string
  perception: number
  senses: string[]
  languages: string[]
  skills: Record<string, number>
  abilities: AbilityScores
  items?: string[]
  ac: number
  saves: Saves
  hp: number
  immunities: string[]
  resistances: string[]
  weaknesses: string[]
  speed: string
  attacks: Attack[]
  spells?: SpellEntry[]
  specialAbilities: SpecialAbility[]
  description?: string
  rawText?: string
}

export type CreatureAdjustment = 'normal' | 'elite' | 'weak'

export interface EncounterCreature {
  creature: Creature
  count: number
  adjustment: CreatureAdjustment
  notes?: string
}

import type { EncounterHazard } from './hazard'

export interface Encounter {
  id: string
  name: string
  creatures: EncounterCreature[]
  hazards?: EncounterHazard[]
  partyLevel: number
  partySize: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Re-export hazard types for convenience
export type { Hazard, EncounterHazard } from './hazard'
