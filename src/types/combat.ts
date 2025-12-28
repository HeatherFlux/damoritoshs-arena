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
  // Elite: +10 HP for levels 1 and below, +15 for 2-4, +20 for 5-19, +30 for 20+
  // Weak: reverse
  const hpAdjust = level <= 1 ? 10 : level <= 4 ? 15 : level <= 19 ? 20 : 30
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
