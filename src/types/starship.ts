/**
 * Starfinder 2E Cinematic Starship Scenes Types
 * Based on SF2e rules for cinematic starship combat
 */

// Role types
export type StarshipRoleType =
  | 'captain'
  | 'engineer'
  | 'gunner'
  | 'magic_officer'
  | 'pilot'
  | 'science_officer'
  | 'custom'

// Action outcome structure following SF2e 4-tier system
export interface ActionOutcomes {
  criticalSuccess: string
  success: string
  failure?: string
  criticalFailure?: string
}

// 2-action activity for a role
export interface StarshipAction {
  id: string
  name: string
  actionCost: 2 // Always 2-action activities in cinematic scenes
  skills: string[] // Skills that can be used (e.g., ['Piloting', 'Acrobatics'])
  dc?: number // Optional fixed DC
  description: string
  outcomes: ActionOutcomes
}

// Starship role definition
export interface StarshipRole {
  id: string
  type: StarshipRoleType
  name: string
  description: string
  primarySkills: string[] // Main skills for this role
  actions: StarshipAction[]
  isCustom?: boolean
}

// PC Starship stats
export interface Starship {
  id: string
  name: string
  level: number
  ac: number
  fortitude: number
  reflex: number
  maxShields: number
  currentShields: number
  shieldRegen: number // Shields regenerated per round
  maxHP: number
  currentHP: number
  // Starship-specific bonuses (e.g., 'Piloting': +2)
  bonuses: Record<string, number>
}

// Threat types for scenes
export type ThreatType = 'enemy_ship' | 'hazard' | 'environmental'

// Enemy ship or hazard in a scene
export interface StarshipThreat {
  id: string
  name: string
  type: ThreatType
  level: number
  maxHP?: number
  currentHP?: number
  maxShields?: number
  currentShields?: number
  shieldRegen?: number
  ac?: number
  description?: string
  // Special abilities or effects
  abilities?: string[]
  // Track if defeated/resolved
  isDefeated: boolean
}

// Victory condition types
export type VictoryCondition =
  | 'defeat' // Defeat all threats
  | 'victory_points' // Accumulate VP
  | 'survival' // Survive X rounds
  | 'escape' // Escape the encounter
  | 'custom' // Custom condition

// Role assignment in a scene
export interface RoleAssignment {
  roleId: string
  playerId?: string // Optional link to party member
  playerName: string
}

// Saved scene template (before running)
export interface SavedScene {
  id: string
  name: string
  level: number
  description: string
  victoryCondition: VictoryCondition
  vpRequired?: number // For victory_points condition
  survivalRounds?: number // For survival condition
  customCondition?: string // For custom condition
  starship: Starship
  threats: StarshipThreat[]
  roles: RoleAssignment[]
  savedAt: number
}

// Active scene state (during play)
export interface StarshipScene {
  id: string
  name: string
  level: number
  description: string
  victoryCondition: VictoryCondition
  vpRequired?: number
  survivalRounds?: number
  customCondition?: string
  starship: Starship
  threats: StarshipThreat[]
  roles: RoleAssignment[]
  // Runtime state
  currentRound: number
  currentVP: number
  isActive: boolean
  // Action log for the scene
  actionLog: ActionLogEntry[]
}

// Log entry for actions taken
export interface ActionLogEntry {
  id: string
  round: number
  timestamp: number
  roleId: string
  playerName: string
  actionName: string
  result: 'critical_success' | 'success' | 'failure' | 'critical_failure'
  description?: string
}

// Store state structure
export interface StarshipState {
  savedScenes: SavedScene[]
  activeScene: StarshipScene | null
  customRoles: StarshipRole[]
  // Current starship being edited (for builder)
  editingStarship: Starship | null
  // Session management
  sessionId: string
  isGMView: boolean
  showPlayerView: boolean
}

// Sync message types for BroadcastChannel
export type StarshipSyncMessageType =
  | 'scene-update' // Full scene state
  | 'starship-update' // Starship HP/shields changed
  | 'threat-update' // Threat status changed
  | 'round-change' // Round advanced
  | 'vp-change' // Victory points changed
  | 'action-log' // New action logged
  | 'role-assignment' // Role assigned

export interface StarshipSyncMessage {
  type: StarshipSyncMessageType
  payload: unknown
  timestamp: number
}

// Default starship factory
export function createDefaultStarship(): Starship {
  return {
    id: crypto.randomUUID(),
    name: 'New Starship',
    level: 1,
    ac: 15,
    fortitude: 10,
    reflex: 12,
    maxShields: 20,
    currentShields: 20,
    shieldRegen: 5,
    maxHP: 50,
    currentHP: 50,
    bonuses: {}
  }
}

// Default threat factory
export function createDefaultThreat(): StarshipThreat {
  return {
    id: crypto.randomUUID(),
    name: 'Enemy Ship',
    type: 'enemy_ship',
    level: 1,
    maxHP: 30,
    currentHP: 30,
    maxShields: 5,
    currentShields: 5,
    shieldRegen: 2,
    ac: 14,
    description: '',
    abilities: [],
    isDefeated: false
  }
}

// Create a new scene from saved template
export function createSceneFromSaved(saved: SavedScene): StarshipScene {
  return {
    ...saved,
    id: crypto.randomUUID(),
    // Deep copy mutable state
    starship: { ...saved.starship },
    threats: saved.threats.map(t => ({ ...t, currentHP: t.maxHP, isDefeated: false })),
    roles: [...saved.roles],
    // Initialize runtime state
    currentRound: 1,
    currentVP: 0,
    isActive: true,
    actionLog: []
  }
}

// Create empty saved scene
export function createEmptySavedScene(): SavedScene {
  return {
    id: crypto.randomUUID(),
    name: 'New Scene',
    level: 1,
    description: '',
    victoryCondition: 'defeat',
    starship: createDefaultStarship(),
    threats: [],
    roles: [],
    savedAt: Date.now()
  }
}
