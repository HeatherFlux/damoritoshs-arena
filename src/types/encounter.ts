/**
 * Encounter Building Types
 * Uses PF2e/SF2e encounter math (they share the same system)
 */

import type { Creature, EncounterCreature, CreatureAdjustment, EncounterHazard } from './creature'
import type { Hazard } from './hazard'
import { calculateHazardXP } from './hazard'

export type Difficulty = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'

export interface DifficultyThresholds {
  trivial: { min: number; max: number }
  low: { min: number; max: number }
  moderate: { min: number; max: number }
  severe: { min: number; max: number }
  extreme: { min: number; max: number }
}

// XP for creatures relative to party level (PF2e/SF2e unified system)
export const CREATURE_XP_BY_LEVEL_DIFF: Record<string, number> = {
  '-4': 10,
  '-3': 15,
  '-2': 20,
  '-1': 30,
  '0': 40,
  '1': 60,
  '2': 80,
  '3': 120,
  '4': 160,
}

// Difficulty XP budgets for a party of 4
export const DIFFICULTY_BUDGETS: Record<Difficulty, number> = {
  trivial: 40,
  low: 60,
  moderate: 80,
  severe: 120,
  extreme: 160,
}

// Per-player adjustment (add/subtract per player above/below 4)
export const PER_PLAYER_ADJUSTMENT = 20

// Elite/Weak adjustments
export const ADJUSTMENT_LEVEL_CHANGE: Record<CreatureAdjustment, number> = {
  normal: 0,
  elite: 1,
  weak: -1,
}

export interface EncounterXPResult {
  totalXP: number
  creatureXP: number
  hazardXP: number
  adjustedBudget: number
  difficulty: Difficulty
  creatureBreakdown: Array<{
    creature: Creature
    count: number
    adjustment: CreatureAdjustment
    effectiveLevel: number
    levelDiff: number
    xpEach: number
    xpTotal: number
  }>
  hazardBreakdown: Array<{
    hazard: Hazard
    count: number
    levelDiff: number
    xpEach: number
    xpTotal: number
  }>
}

/**
 * Calculate XP for a single creature based on level difference from party
 */
export function getCreatureXP(levelDiff: number): number {
  // Clamp to -4 to +4 range
  const clampedDiff = Math.max(-4, Math.min(4, levelDiff))
  return CREATURE_XP_BY_LEVEL_DIFF[clampedDiff.toString()] ?? 0
}

/**
 * Calculate adjusted XP budget based on party size
 */
export function getAdjustedBudget(partySize: number, baseBudget: number): number {
  const playerDiff = partySize - 4
  return baseBudget + (playerDiff * PER_PLAYER_ADJUSTMENT)
}

/**
 * Determine encounter difficulty from XP total
 */
export function getDifficulty(xp: number, partySize: number): Difficulty {
  const thresholds: Array<{ difficulty: Difficulty; threshold: number }> = [
    { difficulty: 'trivial', threshold: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.trivial) },
    { difficulty: 'low', threshold: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.low) },
    { difficulty: 'moderate', threshold: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.moderate) },
    { difficulty: 'severe', threshold: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.severe) },
    { difficulty: 'extreme', threshold: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.extreme) },
  ]

  let difficulty: Difficulty = 'trivial'
  for (const { difficulty: d, threshold } of thresholds) {
    if (xp >= threshold) {
      difficulty = d
    }
  }
  return difficulty
}

/**
 * Calculate full encounter XP breakdown
 */
export function calculateEncounterXP(
  creatures: EncounterCreature[],
  partyLevel: number,
  partySize: number,
  hazards: EncounterHazard[] = []
): EncounterXPResult {
  // Calculate creature XP
  const creatureBreakdown = creatures.map(({ creature, count, adjustment }) => {
    const levelChange = ADJUSTMENT_LEVEL_CHANGE[adjustment]
    const effectiveLevel = creature.level + levelChange
    const levelDiff = effectiveLevel - partyLevel
    const xpEach = getCreatureXP(levelDiff)
    const xpTotal = xpEach * count

    return {
      creature,
      count,
      adjustment,
      effectiveLevel,
      levelDiff,
      xpEach,
      xpTotal,
    }
  })

  // Calculate hazard XP
  const hazardBreakdown = hazards.map(({ hazard, count }) => {
    const levelDiff = hazard.level - partyLevel
    const xpEach = calculateHazardXP(hazard, partyLevel)
    const xpTotal = xpEach * count

    return {
      hazard,
      count,
      levelDiff,
      xpEach,
      xpTotal,
    }
  })

  const creatureXP = creatureBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const hazardXP = hazardBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const totalXP = creatureXP + hazardXP
  const adjustedBudget = getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.moderate)
  const difficulty = getDifficulty(totalXP, partySize)

  return {
    totalXP,
    creatureXP,
    hazardXP,
    adjustedBudget,
    difficulty,
    creatureBreakdown,
    hazardBreakdown,
  }
}
