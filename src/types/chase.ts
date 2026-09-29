/**
 * Chases (Starfinder GM Core pp. 214–217).
 *
 * A chase is a run of obstacles. Each side gathers Chase Points against the obstacle it faces
 * and moves on once it has enough. Vehicles are not part of the chase rules; attaching them to
 * a side and tracking their condition is a table aid this app adds (vehicle rules: GM Core
 * pp. 234–237).
 */

import type { Vehicle } from './tsc'

export type ChaseEnvironment = 'underground' | 'urban' | 'vehicle' | 'wilderness' | 'custom'
export type ChaseType = 'chase-down' | 'run-away' | 'beat-the-clock' | 'competitive'
export type ChaseLength = 'short' | 'medium' | 'long' | 'custom'
export type ChaseDegree = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'

/** One way past an obstacle. */
export interface ChaseOption {
  id: string
  /** Absent for an approach that needs no check, such as casting the right spell. */
  dc?: number
  /** Skills, Perception, or saves that can be rolled against the DC. */
  skills: string[]
  /** What the character does, e.g. "weave or push through". */
  description: string
}

/** An obstacle as printed in the book's sample table. */
export interface SampleChaseObstacle {
  id: string
  name: string
  level: number
  environment: ChaseEnvironment
  /** Set on the higher-level variant of another sample. */
  baseId?: string
  options: { dc: number; skills: string[]; description: string }[]
}

export interface ChaseObstacle {
  id: string
  name: string
  level: number
  environment: ChaseEnvironment
  /** Chase Points needed to overcome it. */
  chasePoints: number
  options: ChaseOption[]
  description: string
  /** GM-only notes, never sent to players. */
  notes?: string
  /** Players see a face-down card until this is set. */
  revealedToPlayers: boolean
  sampleId?: string
}

export type ChaseSideRole = 'pursued' | 'pursuer' | 'competitor'

/**
 * How a side makes progress.
 * - `checks`: its members attempt checks and earn Chase Points (the PCs, or NPCs the GM rolls for)
 * - `steady`: it clears `pace` obstacles at the end of every round
 */
export type ChaseSideControl = 'checks' | 'steady'

export interface ChaseMember {
  id: string
  name: string
  /** partyStore player id, when the member came from the party. */
  playerId?: string
  hasActed: boolean
}

export interface ChaseVehicleInstance {
  instanceId: string
  label: string
  vehicle: Vehicle
  currentHP: number
  uncontrolled: boolean
  pilotMemberId?: string
}

export type VehicleCondition = 'intact' | 'damaged' | 'broken' | 'destroyed'

export interface ChaseSide {
  id: string
  name: string
  role: ChaseSideRole
  control: ChaseSideControl
  /** True for the side the players run. Decides what the player view shows in full. */
  isPlayers: boolean
  /**
   * Index of the obstacle the side is facing. -1 is the starting line, before the first
   * obstacle; `obstacles.length` means every obstacle is behind it.
   */
  position: number
  chasePoints: number
  /** Obstacles cleared per round when `control` is `steady`. */
  pace: number
  /** Default modifier offered when the GM rolls for this side. */
  rollModifier: number
  members: ChaseMember[]
  vehicles: ChaseVehicleInstance[]
  /** Rounds spent on the current obstacle, for the "stuck" hint. */
  roundsAtObstacle: number
}

export interface ChaseEndConditions {
  /** The chase ends when a pursuer reaches the obstacle the pursued are on. */
  catchEnds: boolean
  /** The pursued get away when this many obstacles ahead at the end of a round. */
  leadToEscape: number | null
  /** Rounds allowed before time runs out. */
  roundLimit: number | null
}

export type ChaseOutcomeKind = 'caught' | 'escaped' | 'trail-lost' | 'finished' | 'out-of-time' | 'tie'

export interface ChaseOutcome {
  kind: ChaseOutcomeKind
  winnerSideId?: string
  text: string
}

export interface ChaseLogEntry {
  id: string
  round: number
  text: string
  /** Kept out of the player view. */
  gmOnly?: boolean
  timestamp: number
}

/** A chase as built and saved, before it is run. */
export interface SavedChase {
  id: string
  name: string
  type: ChaseType
  length: ChaseLength
  level: number
  /** How long a round is in the story, e.g. "3 actions" or "10 minutes". */
  roundLength: string
  description: string
  obstacles: ChaseObstacle[]
  sides: ChaseSide[]
  end: ChaseEndConditions
  savedAt: number
  /** Set on the bundled examples. Saving one makes it the GM's own copy. */
  isExample?: boolean
}

/** A chase being run. */
export interface ChaseScene extends SavedChase {
  templateId: string
  round: number
  isActive: boolean
  /** An end condition has been met; the GM confirms or dismisses it. */
  pendingOutcome: ChaseOutcome | null
  outcome: ChaseOutcome | null
  log: ChaseLogEntry[]
}

// ============ Player view ============

export interface ChasePlayerObstacle {
  index: number
  revealed: boolean
  /** Only present when revealed. */
  name?: string
  level?: number
  environment?: ChaseEnvironment
  chasePoints?: number
  description?: string
  options?: { dc?: number; skills: string[]; description: string }[]
}

export interface ChasePlayerVehicle {
  label: string
  name: string
  condition: VehicleCondition
  uncontrolled: boolean
  /** Exact numbers only for the players' own vehicles. */
  currentHP?: number
  maxHP?: number
  pilotName?: string
}

export interface ChasePlayerSide {
  id: string
  name: string
  role: ChaseSideRole
  isPlayers: boolean
  position: number
  /** Progress on the current obstacle; only sent for the players' side. */
  chasePoints?: number
  members: { name: string; hasActed: boolean }[]
  vehicles: ChasePlayerVehicle[]
}

export interface ChasePlayerData {
  name: string
  type: ChaseType
  roundLength: string
  round: number
  roundLimit: number | null
  obstacleCount: number
  obstacles: ChasePlayerObstacle[]
  sides: ChasePlayerSide[]
  outcome: ChaseOutcome | null
  log: ChaseLogEntry[]
}

export type ChaseSyncMessageType = 'player-data' | 'request-state'

export interface ChaseSyncMessage {
  type: ChaseSyncMessageType
  payload: unknown
  timestamp: number
}

export interface ChaseState {
  savedChases: SavedChase[]
  activeScene: ChaseScene | null
  sessionId: string
  isGMView: boolean
  playerData: ChasePlayerData | null
  wsConnectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  isRemoteSyncEnabled: boolean
}
