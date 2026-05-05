/**
 * Combat Tracker Types for Starfinder 2e
 */

import type { Creature, CreatureAdjustment } from './creature'
import type { Hazard } from './hazard'
import { COMBAT_CONDITIONS, CONDITIONS as CONDITION_DEFS, conditionHasValue } from '../data/conditions'

// Re-export conditions from the data file
export { COMBAT_CONDITIONS, CONDITION_DEFS, conditionHasValue }

// Legacy CONDITIONS array for backward compatibility
export const CONDITIONS = COMBAT_CONDITIONS

export type Condition = typeof COMBAT_CONDITIONS[number]

// Conditions that have a numeric value
export const VALUED_CONDITIONS: string[] = Object.entries(CONDITION_DEFS)
  .filter(([_, def]) => def.hasValue)
  .map(([key]) => key)

export interface CombatantCondition {
  name: string
  value?: number
  note?: string
}

export interface Combatant {
  id: string
  name: string
  initiative: number
  initiativeBonus: number
  currentHP: number
  maxHP: number
  tempHP: number
  ac: number
  conditions: CombatantCondition[]
  isPlayer: boolean
  isActive: boolean
  isDead: boolean
  /** When true, this combatant is filtered out of the player view feed (CombatPlayerData). GM-side display is unaffected. */
  hiddenFromPlayers?: boolean
  notes: string
  // Reference to creature data if it's a monster
  creature?: Creature
  adjustment?: CreatureAdjustment
  // Reference to hazard data if it's a hazard
  isHazard?: boolean
  hazard?: Hazard
  // Extended player character stats (from Pathbuilder import)
  level?: number
  class?: string
  ancestry?: string
  perception?: number
  fortitude?: number
  reflex?: number
  will?: number
}

export interface Combat {
  id: string
  name: string
  round: number
  turn: number  // Index of current combatant
  combatants: Combatant[]
  isActive: boolean
  createdAt: Date
}

// Elite/Weak stat adjustments
export function getAdjustedHP(baseHP: number, adjustment: CreatureAdjustment, level: number): number {
  if (adjustment === 'normal') return baseHP
  // Per PF2e Bestiary (Elite/Weak Adjustments table):
  //   Levels 1-2:  ±10 HP
  //   Levels 3-5:  ±15 HP
  //   Levels 6-20: ±20 HP
  //   Levels 21+:  ±30 HP
  // Bug history: brackets used to be 1 / 2-4 / 5-19 / 20+, off by one across
  // the board. A weak level-5 creature lost 20 HP instead of 15.
  const hpAdjust = level <= 2 ? 10 : level <= 5 ? 15 : level <= 20 ? 20 : 30
  return adjustment === 'elite' ? baseHP + hpAdjust : Math.max(1, baseHP - hpAdjust)
}

export function getAdjustedAC(baseAC: number, adjustment: CreatureAdjustment): number {
  if (adjustment === 'normal') return baseAC
  return adjustment === 'elite' ? baseAC + 2 : baseAC - 2
}

export function getAdjustedAttack(baseAttack: number, adjustment: CreatureAdjustment): number {
  if (adjustment === 'normal') return baseAttack
  return adjustment === 'elite' ? baseAttack + 2 : baseAttack - 2
}

export function getAdjustedDamage(baseDamage: string, adjustment: CreatureAdjustment): string {
  if (adjustment === 'normal') return baseDamage
  // Add or subtract 2 from damage (simplified - just append)
  const modifier = adjustment === 'elite' ? '+2' : '-2'
  return `${baseDamage} ${modifier}`
}
