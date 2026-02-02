/**
 * Starfinder 2E Cinematic Starship Scenes Types
 * Based on SF2e rules for cinematic starship combat
 */

// ============ Threat Routine Types ============

// Action types for threat routines
export type ThreatActionType = 'attack' | 'skill_check' | 'ability' | 'movement'

// Individual action in a threat's routine
export interface ThreatRoutineAction {
  id: string
  name: string
  actionCost: 1 | 2 | 3
  type: ThreatActionType
  description: string
  // For attacks
  attackBonus?: number
  damage?: string
  damageType?: string
  traits?: string[]
  // For skill checks
  skill?: string
  vsDefense?: 'AC' | 'Fortitude DC' | 'Reflex DC' | 'Will DC'
  dc?: number
  // Effects by outcome
  effectOnSuccess?: string
  effectOnCriticalSuccess?: string
  effectOnFailure?: string
  effectOnCriticalFailure?: string
  // Conditional effects
  conditionalDamage?: string
  conditionalEffect?: string
}

// A threat's full routine
export interface ThreatRoutine {
  actionsPerTurn: number
  description: string
  actions: ThreatRoutineAction[]
  variations?: {
    trigger: string
    actions: ThreatRoutineAction[]
  }[]
}

// ============ Initiative Types ============

// Entry in the initiative order
export interface InitiativeEntry {
  id: string
  name: string
  type: 'pc' | 'threat'
  // For PCs
  roleId?: string
  roleSkill?: string
  // Initiative value
  initiative: number
  // Turn tracking
  hasActedThisRound: boolean
  // Link to threat (for threat entries)
  threatId?: string
}

// ============ Role Types ============

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

// Weapon proficiency for attack actions
export type WeaponProficiency = 'simple' | 'martial'

// Starship action defined per-scene (not per-role)
export interface StarshipAction {
  id: string
  name: string
  actionCost: 1 | 2 | 3 // Most are 2-action; some are 3-action or free (1)
  role: string // Which role(s) can use this: "pilot", "gunner", "any", "captain|pilot", "magic_officer|science_officer"
  skills: string[] // Skills that can be used (e.g., ['Piloting', 'Acrobatics'])
  dc?: number // Optional fixed DC
  description: string
  outcomes: ActionOutcomes
  // For attack actions (gunner Strikes)
  isAttack?: boolean // True if this is an attack roll vs AC
  proficiency?: WeaponProficiency // Required weapon proficiency (simple/martial)
  damage?: string // Damage dice expression (e.g., '2d10+8 fire')
  traits?: string[] // Weapon traits (e.g., ['deadly d8', 'range 120 ft'])
}

// Starship role metadata (actions are per-scene, not per-role)
export interface StarshipRole {
  id: string
  type: StarshipRoleType
  name: string
  description: string
  primarySkills: string[] // Main skills for this role (used for initiative suggestion)
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

// Tactical role for threats (how the GM should run them)
export type TacticalRole = 'standard' | 'complication' | 'indiscriminate'

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
  // Legacy: simple abilities list (for backward compat)
  abilities?: string[]

  // Initiative (NEW)
  initiativeSkill?: string
  initiativeBonus?: number

  // Combat stats extensions (NEW)
  fortitude?: number
  reflex?: number
  skills?: Record<string, number>

  // The routine! (NEW)
  routine?: ThreatRoutine

  // Special abilities outside routine (NEW)
  specialAbilities?: {
    name: string
    description: string
    trigger?: string
  }[]

  // Immunities/resistances (NEW)
  immunities?: string[]
  resistances?: Record<string, number>
  weaknesses?: Record<string, number>

  // Runtime state
  conditions?: string[]
  routineActionsUsed?: string[] // Track per round

  // Tactical role (how GM runs this threat)
  tacticalRole?: TacticalRole

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
  // Scene-specific roles and actions (per SF2e rules)
  availableRoles: string[] // e.g. ["captain", "engineer", "gunner", "gunner", "pilot", "science_officer"]
  starshipActions: StarshipAction[] // Scene-specific actions with role tags
  // Party sizing and objectives
  partySize?: number
  additionalObjectives?: string[]
  roleDescriptions?: Record<string, string>
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
  // Scene-specific roles and actions
  availableRoles: string[]
  starshipActions: StarshipAction[]
  // Party sizing and objectives
  partySize?: number
  additionalObjectives?: string[]
  roleDescriptions?: Record<string, string>
  // Runtime state
  currentRound: number
  currentVP: number
  isActive: boolean
  // Action log for the scene
  actionLog: ActionLogEntry[]
  // Initiative tracking (NEW)
  initiativeOrder: InitiativeEntry[]
  currentTurnIndex: number
  initiativeRolled: boolean
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
  | 'initiative-update' // Initiative order changed
  | 'turn-change' // Current turn changed

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
    fortitude: 10,
    reflex: 12,
    initiativeSkill: 'Piloting',
    initiativeBonus: 5,
    description: '',
    abilities: [],
    routine: {
      actionsPerTurn: 2,
      description: '',
      actions: []
    },
    isDefeated: false,
    routineActionsUsed: []
  }
}

// Create a new scene from saved template
export function createSceneFromSaved(saved: SavedScene): StarshipScene {
  return {
    ...saved,
    id: crypto.randomUUID(),
    // Deep copy mutable state
    starship: { ...saved.starship },
    threats: saved.threats.map(t => ({
      ...t,
      currentHP: t.maxHP,
      currentShields: t.maxShields,
      isDefeated: false,
      routineActionsUsed: []
    })),
    roles: [...saved.roles],
    availableRoles: [...saved.availableRoles],
    starshipActions: [...saved.starshipActions],
    partySize: saved.partySize ?? 4,
    additionalObjectives: [...(saved.additionalObjectives ?? [])],
    roleDescriptions: { ...(saved.roleDescriptions ?? {}) },
    // Initialize runtime state
    currentRound: 1,
    currentVP: 0,
    isActive: true,
    actionLog: [],
    // Initialize initiative state
    initiativeOrder: [],
    currentTurnIndex: 0,
    initiativeRolled: false
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
    availableRoles: ['captain', 'engineer', 'gunner', 'pilot', 'science_officer', 'magic_officer'],
    starshipActions: [],
    savedAt: Date.now()
  }
}
