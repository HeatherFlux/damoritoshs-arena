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
