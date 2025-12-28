/**
 * Hazard Types for Starfinder 2e / Pathfinder 2e
 *
 * Hazards include traps, environmental hazards, and haunts.
 * They can be simple (one-time effects) or complex (take turns in initiative).
 */

export type HazardComplexity = 'simple' | 'complex'
export type HazardType = 'trap' | 'environmental' | 'haunt'

export interface HazardAction {
  name: string
  trigger?: string
  actionType?: 'reaction' | 'free' | number  // number for action cost
  effect: string
  damage?: string
  damageType?: string
  dc?: number
  save?: 'fortitude' | 'reflex' | 'will'
  traits?: string[]
}

export interface Hazard {
  id: string
  name: string
  level: number
  complexity: HazardComplexity
  type: HazardType
  traits: string[]
  stealth?: string  // "Stealth DC 20 (trained)" or "Stealth +15"
  stealthDC?: number
  description: string
  disable?: string  // "Thievery DC 18 (trained) to disable"
  ac?: number
  saves?: {
    fortitude?: number
    reflex?: number
    will?: number
  }
  hp?: number
  bt?: number  // Broken Threshold
  hardness?: number
  immunities?: string[]
  weaknesses?: { type: string; value: number }[]
  resistances?: { type: string; value: number }[]
  actions: HazardAction[]
  routine?: string  // For complex hazards
  reset?: string
  source: string
}

export interface EncounterHazard {
  hazard: Hazard
  count: number
  notes?: string
}

// XP Tables per PF2e/SF2e rules
// Simple hazards use creature XP / 5 (rounded)
// Complex hazards use full creature XP

export const CREATURE_XP_BY_LEVEL_DIFF: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  [0]: 40,
  [1]: 60,
  [2]: 80,
  [3]: 120,
  [4]: 160,
}

// Simple hazard XP = creature XP / 5
export const SIMPLE_HAZARD_XP: Record<number, number> = {
  [-4]: 2,
  [-3]: 3,
  [-2]: 4,
  [-1]: 6,
  [0]: 8,
  [1]: 12,
  [2]: 16,
  [3]: 24,
  [4]: 32,
}

// Complex hazard XP = creature XP (same as creatures)
export const COMPLEX_HAZARD_XP: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  [0]: 40,
  [1]: 60,
  [2]: 80,
  [3]: 120,
  [4]: 160,
}

/**
 * Calculate XP for a hazard based on party level
 */
export function calculateHazardXP(
  hazard: Hazard,
  partyLevel: number
): number {
  const levelDiff = hazard.level - partyLevel

  // Clamp to valid range
  const clampedDiff = Math.max(-4, Math.min(4, levelDiff))

  if (hazard.complexity === 'simple') {
    return SIMPLE_HAZARD_XP[clampedDiff] || 0
  } else {
    return COMPLEX_HAZARD_XP[clampedDiff] || 0
  }
}

/**
 * Get hazard XP label (for display)
 */
export function getHazardXPLabel(hazard: Hazard, partyLevel: number): string {
  const xp = calculateHazardXP(hazard, partyLevel)
  const levelDiff = hazard.level - partyLevel
  const sign = levelDiff >= 0 ? '+' : ''
  return `${xp} XP (Level ${sign}${levelDiff})`
}

/**
 * Format hazard complexity for display
 */
export function formatComplexity(complexity: HazardComplexity): string {
  return complexity === 'simple' ? 'Simple' : 'Complex'
}

/**
 * Format hazard type for display
 */
export function formatHazardType(type: HazardType): string {
  switch (type) {
    case 'trap': return 'Trap'
    case 'environmental': return 'Environmental'
    case 'haunt': return 'Haunt'
    default: return type
  }
}

/**
 * Get the CSS class for hazard type coloring
 */
export function getHazardTypeClass(type: HazardType): string {
  switch (type) {
    case 'trap': return 'hazard-trap'
    case 'environmental': return 'hazard-environmental'
    case 'haunt': return 'hazard-haunt'
    default: return ''
  }
}
