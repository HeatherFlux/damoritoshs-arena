/**
 * Tactical Starship Combat (TSC) types — Starfinder Tech Core, chapters 6–7.
 *
 * This module is separate from `starship.ts`, which models the GM Core
 * *cinematic* starship scene subsystem (crew roles + Victory Points). TSC is
 * an encounter-mode ruleset: enemy starships and complex hazards roll
 * initiative, damage depletes Shield Points before Hull Points, and positions
 * are tracked in zones on a sensor map.
 *
 * Data types here mirror the JSON produced by `scripts/parse-techcore.py`.
 */

import type { AbilityScores, Saves } from './creature'
import type { CombatantCondition } from './combat'

// ============ Shared vocab ============

export type Heading = 'fore' | 'aft' | 'port' | 'starboard'

export type StationKind =
  | 'drone console'
  | 'generator'
  | 'gunnery'
  | 'magic conduit'
  | "pilot's console"
  | 'scanners'

export type StationGrade =
  | 'commercial'
  | 'tactical'
  | 'advanced'
  | 'superior'
  | 'elite'
  | 'ultimate'
  | 'paragon'

export type FrameId = 'bulwark' | 'explorer' | 'skirmisher'

export type StarshipSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique'

/** Action cost. Numbers are action counts; 'reaction' and 'free' are as printed. */
export type ActionCost = 1 | 2 | 3 | 'reaction' | 'free'

// ============ Stat-block building blocks ============

export interface TscOutcomes {
  criticalSuccess?: string
  success?: string
  failure?: string
  criticalFailure?: string
}

/** A named ability on an NPC starship, hazard, vehicle, or in a faction common-actions block. */
export interface TscAbility {
  name: string
  actions?: ActionCost
  /** Upper bound for variable-cost actions such as "Evade [one-action] to [two-actions]". */
  actionsMax?: ActionCost
  traits?: string[]
  /** Battle station the ability is granted by (common-actions blocks only). */
  station?: string
  frequency?: string
  requirements?: string
  prerequisites?: string
  trigger?: string
  effect: string
  outcomes?: TscOutcomes
  /** Where the ability is printed: with the defenses (before Speed) or with the offense. */
  placement?: 'defense' | 'offense'
  /** Id of the shared ability this was inlined from, e.g. "free-captains:piercing-harpoon". */
  sharedRef?: string
  /** Per-ship parameters substituted into a shared ability ("the listed DC / damage"). */
  params?: Record<string, string>
  /** Id of the ship this ability was copied from when the book prints "As <Ship>." */
  asRefShip?: string
}

/** A shared ability from a "Common Actions and Features" block. */
export interface TscSharedAbility extends TscAbility {
  id: string
  /** 'global' (p. 208), 'default' (Repair Self / Seek Starships) or a faction slug. */
  scope: string
  page: number
}

export interface TscAttack {
  mode: 'melee' | 'ranged' | 'areaFire' | 'autoFire'
  name: string
  actions: ActionCost
  traits: string[]
  bonus?: number
  /** Range increment in zones (ranged Strikes). */
  rangeIncrement?: number
  /** Fixed range in zones (Area Fire / Auto-Fire). */
  range?: number
  /** Area descriptor such as "1-zone burst" or "3-zone line". */
  area?: string
  damage: string
  saveDC?: number
  saveType?: 'fortitude' | 'reflex' | 'will'
}

export interface StationEntry {
  name: string
  /** Weapons are lowercase in the book and match an attack line; actions match an ability. */
  kind: 'weapon' | 'action'
  /** Marked with * in the book: usable only while none of the listed stations is malfunctioning. */
  shared: boolean
  /** "wraith torpedo ×2" */
  count?: number
}

/** A battle station on an NPC starship. Living starships use organelles instead. */
export interface NpcBattleStation {
  name: string
  entries: StationEntry[]
}

// ============ NPC starship ============

export interface NpcStarship {
  id: string
  name: string
  level: number
  source: string
  page?: number
  description?: string
  faction: string
  factionSlug: string
  rarity: Rarity
  size: StarshipSize
  traits: string[]
  perception: number
  sensorRange: number
  /** Extra senses printed after the sensor range, e.g. "nanite scrying". */
  senses?: string
  skills: Record<string, number>
  battleStations: NpcBattleStation[]
  abilities: AbilityScores
  ac: number
  saves: Saves
  /** Hull Points. */
  hp: number
  hpNotes?: string
  /** Shield Points; absent on ships without a generator (most living starships). */
  sp?: number
  /** Shield Points regained by Fortify Shield Points. */
  fortify?: number
  immunities: string[]
  weaknesses: string[]
  resistances: string[]
  /** Speed in zones. */
  speed: number
  speedNotes?: string
  attacks: TscAttack[]
  specialAbilities: TscAbility[]
  livingStarship?: boolean
}

// ============ Starship hazard ============

export interface HazardStealth {
  text: string
  dc?: number
  /** Complex hazards print a Stealth modifier; dc is then modifier + 10. */
  modifier?: number
  proficiency?: string
}

export interface HazardDisable {
  dc: number
  skill: string
  proficiency?: string
  /** Battle station the check must be attempted from, e.g. "scanners". */
  station?: string
}

export interface HazardComponent {
  name: string
  hardness?: number
  hp?: number
  bt?: number
  /** "HP 10 each" — one value per component instance. */
  each?: boolean
}

export interface StarshipHazard {
  id: string
  name: string
  level: number
  source: string
  page?: number
  complexity: 'simple' | 'complex'
  rarity: Rarity
  traits: string[]
  /** 'starship' hazards live on the sensor map; 'deck' hazards act on the player ship's map. */
  scale: 'starship' | 'deck'
  stealth: HazardStealth
  description: string
  flavor?: string
  disable: HazardDisable[]
  disableText: string
  ac?: number
  acLabel?: string
  saves?: { fort: number; ref?: number; will?: number }
  components: HazardComponent[]
  hardness?: number
  hp?: number
  bt?: number
  immunities: string[]
  weaknesses: string[]
  resistances: string[]
  reactions: TscAbility[]
  abilities: TscAbility[]
  attacks: TscAttack[]
  routine?: { actions: number; text: string }
  reset?: string
  special?: string
}

// ============ Vehicle ============

export interface VehicleSpeed {
  feet: number
  mode: string
  /** Movement kind when printed, e.g. "fly" or "swim". */
  kind?: string
}

export interface Vehicle {
  id: string
  name: string
  level: number
  source: string
  page?: number
  rarity: Rarity
  size: StarshipSize
  traits: string[]
  price: string
  description: string
  space: string
  crew: string
  passengers?: number
  pilotingChecks: { skill: string; dc: number }[]
  pilotingCheckText: string
  ac: number
  saves: { fort: number; ref?: number; will?: number }
  hardness: number
  hp: number
  bt?: number
  immunities: string[]
  resistances?: string[]
  weaknesses?: string[]
  speed: VehicleSpeed[]
  speedText: string
  collision: { damage: string; dc: number; type?: string }
  abilities: TscAbility[]
}

// ============ Player starship (frame + level derived) ============

/** A battle station installed on the player starship. */
export interface PlayerStation {
  id: string
  kind: StationKind
  /** Default stations come with the frame and cannot be removed. */
  slot: 'default' | 'custom'
  /** Upgrade ids from tscStationUpgrades (frame default upgrades do not count against the limit). */
  upgrades: string[]
  /** Installed weapon ids from tscWeapons (gunnery only; a second weapon needs Secondary Armaments). */
  weaponIds?: string[]
  /** Party member id or free-text name of the crew member helming the station. */
  helmedBy?: string
  malfunctioning: boolean
}

export interface PlayerStarship {
  id: string
  name: string
  frame: FrameId
  /** Mirrors the party's level; the GM may override. */
  level: number
  stations: PlayerStation[]
  /** Expansion bay ids from tscExpansionBays. */
  expansionBays: string[]
  /** Piloting DC of the helming pilot; the ship's AC is this value when higher. */
  pilotingDC?: number
  currentHP: number
  currentSP: number
  compromised: number
  wrecked: number
  inoperable: boolean
  offKilter: boolean
  conditions: CombatantCondition[]
  notes?: string
  /** Template this ship was loaded from; runtime damage writes back to it on scene end. */
  templateId?: string
}

export interface DerivedStationStats {
  id: string
  kind: StationKind
  grade: StationGrade
  upgradeSlots: number
  /** Gunnery weapon damage dice at this grade. */
  damageDice: number
  /** Gunnery tracking bonus at this grade. */
  tracking: number
  /** Drones controllable at this grade (drone console). */
  drones: number
  helmed: boolean
}

export interface DerivedStarshipStats {
  maxHP: number
  maxSP: number
  ac: number
  fort: number
  ref: number
  will: number
  speed: number
  sensorRange: number
  stations: DerivedStationStats[]
  /** Item bonuses currently applied from helmed stations (scanners' sensor bonus always applies). */
  itemBonuses: { ac: number; fort: number; ref: number; will: number; sensorRange: number }
  /** Status penalties from the inoperable condition. */
  statusPenalties: { ac: number; ref: number }
}

// ============ Encounter scene ============

/**
 * Position on the sensor map. v1 tracks a free-text zone label and a heading;
 * `gridX`/`gridY` are reserved so a visual zone grid can be layered on later
 * without a data migration.
 */
export interface TscPosition {
  zone: string
  heading: Heading
  gridX?: number
  gridY?: number
}

export interface SensorMapDescriptor {
  kind: 'freeform' | 'grid'
  /** Zone labels available in the zone picker (freeform) or generated from the grid. */
  zones: string[]
  width?: number
  height?: number
}

export interface TscStationState {
  malfunctioning: boolean
}

/** An NPC starship placed in a scene. The model is snapshotted so scenes stay self-contained. */
export interface TscNpcShipInstance {
  instanceId: string
  /** Display label, e.g. "Raider Trident 2". */
  label: string
  model: NpcStarship
  currentHP: number
  currentSP: number
  stationState: Record<string, TscStationState>
  conditions: CombatantCondition[]
  offKilter: boolean
  inoperable: boolean
  position: TscPosition
  destroyed: boolean
  /** GM-only until revealed; hidden entities never reach the player view. */
  hiddenFromPlayers: boolean
  /** Whether the crew has detected the ship (undetected ships also stay off the player view). */
  detected: boolean
}

export interface TscHazardInstance {
  instanceId: string
  label: string
  hazard: StarshipHazard
  currentHP?: number
  /** Remaining HP per named component ("Pod", "Asteroid"). */
  componentHP?: Record<string, number>
  position: TscPosition
  disabled: boolean
  detected: boolean
  hiddenFromPlayers: boolean
}

export interface TscPc {
  id: string
  name: string
  /** Party member id when added from the active party. */
  playerId?: string
  /** Battle station the PC is helming. */
  stationId?: string
  /** Exploration activity id from tscStations (grants a free action at initiative). */
  explorationActivityId?: string
  initiativeBonus?: number
}

export type TscInitiativeKind = 'pc' | 'npcShip' | 'hazard' | 'playerShip'

export interface TscInitiativeEntry {
  id: string
  kind: TscInitiativeKind
  /** Id of the PC, NPC ship instance, hazard instance, or player ship. */
  refId: string
  name: string
  initiative: number
  hasActedThisRound: boolean
}

export interface TscLogEntry {
  id: string
  round: number
  timestamp: number
  text: string
  /** Not sent to the player view (exact NPC damage, hidden-entity events). */
  gmOnly?: boolean
}

export interface TscScene {
  id: string
  name: string
  level: number
  description?: string
  playerShip: PlayerStarship | null
  playerShipPosition: TscPosition
  playerShipDestroyed: boolean
  pcs: TscPc[]
  npcShips: TscNpcShipInstance[]
  hazards: TscHazardInstance[]
  sensorMap: SensorMapDescriptor
  initiativeOrder: TscInitiativeEntry[]
  currentTurnIndex: number
  initiativeRolled: boolean
  round: number
  isActive: boolean
  log: TscLogEntry[]
}

/** A scene template before it is started (runtime fields are reset on start). */
export interface TscSavedScene {
  id: string
  name: string
  level: number
  description?: string
  playerShip: PlayerStarship | null
  pcs: TscPc[]
  npcShips: TscNpcShipInstance[]
  hazards: TscHazardInstance[]
  sensorMap: SensorMapDescriptor
  savedAt: number
}

export interface TscState {
  savedScenes: TscSavedScene[]
  activeScene: TscScene | null
  /** Reusable player starship sheets. */
  playerShips: PlayerStarship[]
  /** GM-authored NPC starships (ids prefixed "custom-starship-"). */
  customStarships: NpcStarship[]
  /** Model name -> battle station names identified with Scan Target; persists across scenes. */
  identifiedModels: Record<string, string[]>
  sessionId: string
  isGMView: boolean
  /** Sanitized snapshot received by player views. */
  playerData: TscPlayerData | null
  wsConnectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  isRemoteSyncEnabled: boolean
}

// ============ Player view ============

export type HullBand = 'intact' | 'damaged' | 'critical' | 'destroyed'

export interface TscPlayerData {
  sceneName: string
  round: number
  isActive: boolean
  initiativeRolled: boolean
  /** Index into `entries` of the current turn. */
  turn: number
  entries: { kind: TscInitiativeKind; name: string }[]
  playerShip: {
    name: string
    frame: FrameId
    level: number
    currentHP: number
    maxHP: number
    currentSP: number
    maxSP: number
    ac: number
    fort: number
    ref: number
    will: number
    speed: number
    sensorRange: number
    compromised: number
    wrecked: number
    inoperable: boolean
    offKilter: boolean
    conditions: CombatantCondition[]
    stations: { id: string; kind: StationKind; grade: StationGrade; helmedBy?: string; malfunctioning: boolean }[]
    position: TscPosition
    destroyed: boolean
  } | null
  npcShips: {
    instanceId: string
    label: string
    /** Model name once Scan Target has identified it. */
    modelName?: string
    size: StarshipSize
    band: HullBand
    shieldsUp: boolean
    identifiedStations: string[]
    malfunctioningStations: string[]
    conditions: CombatantCondition[]
    offKilter: boolean
    inoperable: boolean
    position: TscPosition
    destroyed: boolean
  }[]
  hazards: { instanceId: string; label: string; name: string; position: TscPosition; disabled: boolean }[]
  sensorMap: SensorMapDescriptor
  log: TscLogEntry[]
}

export type TscSyncMessageType = 'player-data' | 'request-state'

export interface TscSyncMessage {
  type: TscSyncMessageType
  payload: unknown
  timestamp: number
}
