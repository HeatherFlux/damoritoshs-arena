/**
 * Encounter Building Types
 * Uses PF2e/SF2e encounter math (they share the same system)
 */

import type { Creature, EncounterCreature, CreatureAdjustment, EncounterHazard } from './creature'
import type { Hazard } from './hazard'
import { calculateHazardXP, SIMPLE_HAZARD_XP, COMPLEX_HAZARD_XP } from './hazard'
import type { EncounterStarship, EncounterStarshipHazard, NpcStarship, StarshipHazard } from './tsc'

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

/**
 * Tech Core p. 208: a crew of three or fewer PCs treats the tactical starship
 * encounter budget as 20 lower for moderate or harder encounters and 10 lower
 * for low or trivial ones.
 */
export const SMALL_CREW_REDUCTION: Record<Difficulty, number> = {
  trivial: 10,
  low: 10,
  moderate: 20,
  severe: 20,
  extreme: 20,
}

export interface EncounterXPOptions {
  /** Apply the Tech Core small-crew budget reduction (starship encounters only). */
  smallCrew?: boolean
}

export interface EncounterXPResult {
  totalXP: number
  creatureXP: number
  hazardXP: number
  starshipXP: number
  starshipHazardXP: number
  adjustedBudget: number
  difficulty: Difficulty
  smallCrewAdjusted: boolean
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
  starshipBreakdown: Array<{
    starship: NpcStarship
    count: number
    levelDiff: number
    xpEach: number
    xpTotal: number
  }>
  starshipHazardBreakdown: Array<{
    hazard: StarshipHazard
    count: number
    levelDiff: number
    xpEach: number
    xpTotal: number
  }>
}

/** Starship hazards use the same simple/complex hazard XP tables as GM Core hazards (Tech Core p. 246, 249). */
export function calculateStarshipHazardXP(hazard: Pick<StarshipHazard, 'level' | 'complexity'>, partyLevel: number): number {
  const clampedDiff = Math.max(-4, Math.min(4, hazard.level - partyLevel))
  return (hazard.complexity === 'simple' ? SIMPLE_HAZARD_XP : COMPLEX_HAZARD_XP)[clampedDiff] || 0
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
export function getDifficulty(xp: number, partySize: number, smallCrew = false): Difficulty {
  const budget = (d: Difficulty) => getAdjustedBudget(partySize, DIFFICULTY_BUDGETS[d]) - (smallCrew ? SMALL_CREW_REDUCTION[d] : 0)
  const thresholds: Array<{ difficulty: Difficulty; threshold: number }> = [
    { difficulty: 'trivial', threshold: budget('trivial') },
    { difficulty: 'low', threshold: budget('low') },
    { difficulty: 'moderate', threshold: budget('moderate') },
    { difficulty: 'severe', threshold: budget('severe') },
    { difficulty: 'extreme', threshold: budget('extreme') },
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
  hazards: EncounterHazard[] = [],
  starships: EncounterStarship[] = [],
  starshipHazards: EncounterStarshipHazard[] = [],
  options: EncounterXPOptions = {}
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

  // Tech Core p. 208: treat starships as creatures for the experience budget.
  const starshipBreakdown = starships.map(({ starship, count }) => {
    const levelDiff = starship.level - partyLevel
    const xpEach = getCreatureXP(levelDiff)
    return { starship, count, levelDiff, xpEach, xpTotal: xpEach * count }
  })

  const starshipHazardBreakdown = starshipHazards.map(({ hazard, count }) => {
    const levelDiff = hazard.level - partyLevel
    const xpEach = calculateStarshipHazardXP(hazard, partyLevel)
    return { hazard, count, levelDiff, xpEach, xpTotal: xpEach * count }
  })

  const creatureXP = creatureBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const hazardXP = hazardBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const starshipXP = starshipBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const starshipHazardXP = starshipHazardBreakdown.reduce((sum, b) => sum + b.xpTotal, 0)
  const totalXP = creatureXP + hazardXP + starshipXP + starshipHazardXP
  const smallCrewAdjusted = !!options.smallCrew && (starships.length > 0 || starshipHazards.length > 0)
  const adjustedBudget = getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.moderate) - (smallCrewAdjusted ? SMALL_CREW_REDUCTION.moderate : 0)
  const difficulty = getDifficulty(totalXP, partySize, smallCrewAdjusted)

  return {
    totalXP,
    creatureXP,
    hazardXP,
    starshipXP,
    starshipHazardXP,
    adjustedBudget,
    difficulty,
    smallCrewAdjusted,
    creatureBreakdown,
    hazardBreakdown,
    starshipBreakdown,
    starshipHazardBreakdown,
  }
}
