/**
 * Hazard Types for Starfinder 2e / Pathfinder 2e
 *
 * Hazards include traps, environmental hazards, and haunts.
 * They can be simple (one-time effects) or complex (take turns in initiative).
 */

export type HazardComplexity = 'simple' | 'complex'
export type HazardType = 'trap' | 'environmental' | 'haunt'
export type TrapSubtype = 'mechanical' | 'magical' | 'tech'
export type StatBand = 'extreme' | 'high' | 'low'
export type Proficiency = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'
export type MainChallenge = 'find' | 'disable' | 'survive' | 'endure'
export type TargetingModel = 'single' | 'area' | 'random' | 'range' | 'touch'

export interface DisableMethod {
  id: string
  skill: string  // e.g., "Thievery", "Athletics", "dispel magic"
  proficiency: Proficiency
  dcBand: StatBand
  dcOverride?: number  // Manual override
  notes?: string
  isSecondary?: boolean  // Secondary/less-efficient method
}

export interface HazardComponent {
  id: string
  name: string
  ac?: number
  hardness?: number
  hp: number
  bt?: number  // Broken Threshold
  position?: string  // Where it's located
}

export interface HazardAction {
  name: string
  trigger?: string
  actionType?: 'reaction' | 'free' | number  // number for action cost
  effect: string
  damage?: string
  damageType?: string
  dc?: number
  save?: 'fortitude' | 'reflex' | 'will'
  attackBonus?: number
  traits?: string[]
  targetingModel?: TargetingModel
}

export interface RoutineAction {
  id: string
  name: string
  actionCost: number
  effect: string
  damage?: string
  damageType?: string
  dc?: number
  save?: 'fortitude' | 'reflex' | 'will'
  attackBonus?: number
  targetingModel?: TargetingModel
  componentId?: string  // If tied to a component, removed when component destroyed
}

export interface DegradationRule {
  componentId: string
  effect: string  // What happens when this component is disabled/destroyed
  removeActionIds?: string[]  // Actions to remove
}

export interface StatBands {
  stealth?: StatBand
  ac?: StatBand
  fortSave?: StatBand
  refSave?: StatBand
  attackOrDC?: StatBand  // For offense
}

export interface Hazard {
  id: string
  name: string
  level: number
  complexity: HazardComplexity
  type: HazardType
  trapSubtypes?: TrapSubtype[]  // For traps: mechanical, magical, tech (can be multiple)
  traits: string[]
  source: string
  description: string  // Narrative description

  // Concept
  mainChallenge?: MainChallenge  // What's the main difficulty?

  // Stealth & Detection
  isObvious?: boolean  // If true, no Stealth DC needed
  stealthDC?: number
  stealthBand?: StatBand
  stealthProficiency?: Proficiency  // Required to find it

  // Disable methods
  disableMethods?: DisableMethod[]

  // Stat bands for auto-calculation
  statBands?: StatBands

  // Defenses (only if physical component)
  hasPhysicalComponent?: boolean
  ac?: number
  saves?: {
    fortitude?: number
    reflex?: number
    will?: number
  }
  hardness?: number
  hp?: number
  bt?: number  // Broken Threshold
  immunities?: string[]
  weaknesses?: { type: string; value: number }[]
  resistances?: { type: string; value: number }[]

  // Components (for complex hazards with multiple parts)
  components?: HazardComponent[]
  degradationRules?: DegradationRule[]

  // Offense
  usesAttackRoll?: boolean  // true = attack bonus, false = save DC
  attackBonus?: number
  saveDC?: number
  saveType?: 'fortitude' | 'reflex' | 'will'
  damage?: string
  damageType?: string
  targetingModel?: TargetingModel

  // Simple hazard specific
  trigger?: string
  effect?: string
  reset?: string

  // Complex hazard specific
  actions: HazardAction[]  // Reactive actions
  routine?: string  // Narrative routine description
  routineActions?: RoutineAction[]  // Structured routine actions
  actionsPerRound?: number

  // Legacy fields for compatibility
  stealth?: string
  disable?: string
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
