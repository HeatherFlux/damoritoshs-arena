/**
 * Session Bundle Importer
 *
 * Parses a YAML or JSON session bundle and distributes data to each store.
 * Used by the SessionBundleImporter.vue component.
 */

import yaml from 'js-yaml'
import type { Creature, CreatureAdjustment, EncounterCreature } from '../types/creature'
import type { Hazard, EncounterHazard } from '../types/hazard'
import type { SavedHackingEncounter, Computer, AccessPoint } from '../types/hacking'
import type { SavedScene, StarshipThreat } from '../types/starship'
import type { EncounterStarship, EncounterStarshipHazard, Heading, NpcStarship, PlayerStarship, SensorMapDescriptor, StarshipHazard, TscHazardInstance, TscNpcShipInstance, TscPc, TscSavedScene } from '../types/tsc'
import type { ChaseEndConditions, ChaseMember, ChaseObstacle, ChaseOption, ChaseSide, SavedChase } from '../types/chase'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { createHazardInstance, createNpcShipInstance, defaultPosition, DEFAULT_ZONES } from '../stores/tscStore'
import { createSide, defaultSetup, lengthForCount, obstacleFromSample, suggestedChasePoints } from '../utils/chaseRules'
import { createDefaultStarship, createDefaultThreat, createEmptySavedScene } from '../types/starship'
import type { ShopType, SettlementSize, SavedShop } from '../types/shop'

// ============ Types ============

export interface BundlePlayer {
  name: string
  level?: number
  maxHP: number
  ac: number
  class?: string
  ancestry?: string
  perception?: number
  fortitude?: number
  reflex?: number
  will?: number
  notes?: string
}

export interface BundleParty {
  name: string
  players: BundlePlayer[]
}

export interface BundleCreatureRef {
  creatureId?: string
  creatureName?: string
  count?: number
  adjustment?: CreatureAdjustment
}

export interface BundleHazardRef {
  hazardId?: string
  hazardName?: string
  count?: number
}

export interface BundleStarshipRef {
  starshipId?: string
  starshipName?: string
  count?: number
}

export interface BundleStarshipHazardRef {
  hazardId?: string
  hazardName?: string
  count?: number
}

/** Where a referenced ship or hazard starts in a hand-written tactical scene. */
interface BundleTscPlacement {
  label?: string
  zone?: string
  heading?: Heading
  hidden?: boolean
  detected?: boolean
}

export interface BundleTscShipRef extends BundleStarshipRef, BundleTscPlacement {}
export interface BundleTscHazardRef extends BundleStarshipHazardRef, BundleTscPlacement {}

/**
 * A tactical scene as written by hand. Ships and hazards may be references to the bundled
 * Tech Core data instead of full snapshots, and ids and defaults are filled in on import.
 */
export interface BundleTscScene extends Partial<Omit<TscSavedScene, 'name' | 'pcs' | 'npcShips' | 'hazards' | 'sensorMap'>> {
  name: string
  /** Id of a player starship in this bundle's tscPlayerShips or already saved in the app. */
  playerShipId?: string
  pcs?: Partial<TscPc>[]
  npcShips?: (TscNpcShipInstance | BundleTscShipRef)[]
  hazards?: (TscHazardInstance | BundleTscHazardRef)[]
  sensorMap?: Partial<SensorMapDescriptor>
}

type BundleChaseObstacle = Partial<Omit<ChaseObstacle, 'options'>> & { options?: Partial<ChaseOption>[] }
type BundleChaseSide = Partial<Omit<ChaseSide, 'members'>> & { members?: (string | Partial<ChaseMember>)[] }

/** A chase as written by hand. Anything left out gets the default a new chase would have. */
export interface BundleChase extends Partial<Omit<SavedChase, 'name' | 'obstacles' | 'sides' | 'end'>> {
  name: string
  obstacles?: BundleChaseObstacle[]
  sides?: BundleChaseSide[]
  end?: Partial<ChaseEndConditions>
}

export interface BundleEncounter {
  name: string
  partyLevel?: number
  partySize?: number
  notes?: string
  creatures?: BundleCreatureRef[]
  hazards?: BundleHazardRef[]
  /** Tech Core NPC starships attached to the encounter (resolved against bundled + custom starships). */
  starships?: BundleStarshipRef[]
  /** Tech Core starship hazards (resolved against the bundled tscHazards data). */
  starshipHazards?: BundleStarshipHazardRef[]
  tscSmallCrew?: boolean
}

export interface BundleHacking {
  name: string
  computer: Partial<Computer> & { name: string; level: number; type: string; accessPoints: Partial<AccessPoint>[] }
}

export interface BundleStarshipThreat {
  name: string
  type: 'enemy_ship' | 'hazard' | 'environmental'
  level: number
  maxHP?: number
  currentHP?: number
  ac?: number
  maxShields?: number
  currentShields?: number
  shieldRegen?: number
  fortitude?: number
  reflex?: number
  description?: string
  // Initiative — needed for the runner's auto-roll on enemy turns.
  initiativeSkill?: string
  initiativeBonus?: number
  // Skill-bonus map. The runner reads this when a `skill_check`
  // routine action fires (chip shows "+12 Piloting", click rolls
  // d20+12). Drop this and the chip falls back to flat d20.
  skills?: Record<string, number>
  // Tactical hint shown as a badge on the threat card.
  tacticalRole?: 'standard' | 'complication' | 'indiscriminate'
  // Routine: 4-tier outcomes, attack bonuses, damage, etc.
  routine?: object
  // Out-of-routine abilities (auras, reactions). `hidden: true` keeps
  // the ability off the player view until the GM reveals it.
  specialAbilities?: {
    name: string
    description: string
    trigger?: string
    hidden?: boolean
  }[]
  immunities?: string[]
  resistances?: Record<string, number>
  weaknesses?: Record<string, number>
}

export interface BundleStarship {
  name: string
  level?: number
  description?: string
  victoryCondition?: string
  vpRequired?: number
  survivalRounds?: number
  customCondition?: string
  starship?: {
    name?: string
    ac?: number
    fortitude?: number
    reflex?: number
    maxHP?: number
    maxShields?: number
    shieldRegen?: number
    bonuses?: Record<string, number>
  }
  threats?: BundleStarshipThreat[]
  roles?: { roleId: string; playerName: string; playerId?: string }[]
  availableRoles?: string[]
  starshipActions?: object[]
  partySize?: number
  /** Each entry can be a plain string (legacy) or an object with a
   * hidden flag for spoiler-y objectives the GM only reveals later. */
  additionalObjectives?: (string | { text: string; hidden?: boolean })[]
  roleDescriptions?: Record<string, string>
}

/**
 * A bundled shop entry. Two shapes are accepted:
 *
 *  1. Snapshot (preferred): includes a full `shop` object with rolled inventory
 *     and an optional `shopkeeper`. Round-trips cleanly via shopStore.savedShops.
 *  2. Legacy params-only: `{ name, shopType, settlement, partyLevel }`. The
 *     importer drops these with a warning since they would re-roll different
 *     items than the GM prepped.
 */
export interface BundleShop {
  name: string
  // Snapshot fields
  shop?: SavedShop['shop']
  shopkeeper?: SavedShop['shopkeeper']
  savedAt?: number
  // Legacy generation-params fields (dropped on import)
  shopType?: ShopType
  settlement?: SettlementSize
  partyLevel?: number
}

export interface SessionBundle {
  name: string
  description?: string
  partyLevel?: number
  creatures?: Creature[]
  hazards?: Hazard[]
  party?: BundleParty
  encounters?: BundleEncounter[]
  hacking?: BundleHacking[]
  starship?: BundleStarship[]
  /** Reusable PC ship templates — see starship-templates.schema.json */
  starshipTemplates?: BundleStarshipTemplate[]
  shops?: BundleShop[]
  /** Tech Core tactical starship combat — see tsc-scenes.schema.json */
  tscScenes?: BundleTscScene[]
  /** Player starship sheets — see tsc-player-starships.schema.json */
  tscPlayerShips?: PlayerStarship[]
  /** GM-authored NPC starships — see tsc-starships.schema.json */
  tscCustomStarships?: NpcStarship[]
  /** Chases (GM Core) — see chases.schema.json */
  chases?: BundleChase[]
}

export interface BundleStarshipTemplate {
  id?: string
  name: string
  description?: string
  isCampaignShip?: boolean
  starship: {
    id?: string
    name?: string
    level?: number
    ac?: number
    fortitude?: number
    reflex?: number
    maxHP?: number
    currentHP?: number
    maxShields?: number
    currentShields?: number
    shieldRegen?: number
    bonuses?: Record<string, number>
    templateId?: string
  }
  savedAt?: number
}

export interface ImportWarning {
  section: string
  message: string
  item?: string
}

export interface ImportResult {
  success: boolean
  sessionName: string
  creatures: number
  hazards: number
  parties: number
  encounters: number
  hackingSessions: number
  starshipScenes: number
  starshipTemplates: number
  shops: number
  tscScenes: number
  tscPlayerShips: number
  tscCustomStarships: number
  chases: number
  warnings: ImportWarning[]
}

// ============ Parsing ============

/**
 * Parse a session bundle from YAML or JSON string
 */
export function parseSessionBundle(content: string): SessionBundle {
  const trimmed = content.trim()

  // Try JSON first (starts with { )
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as SessionBundle
    } catch (e) {
      throw new Error(`Invalid JSON: ${(e as Error).message}`)
    }
  }

  // Try YAML
  try {
    const parsed = yaml.load(trimmed)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('YAML did not produce a valid object')
    }
    return parsed as SessionBundle
  } catch (e) {
    throw new Error(`Invalid YAML: ${(e as Error).message}`)
  }
}

// ============ Reference Resolution ============

/**
 * Find a creature by ID in the available creatures list
 */
function findCreatureById(id: string, allCreatures: Creature[]): Creature | null {
  return allCreatures.find(c => c.id === id) ?? null
}

/**
 * Find a creature by name using fuzzy matching
 */
export function resolveCreatureRef(
  ref: BundleCreatureRef,
  allCreatures: Creature[]
): Creature | null {
  if (ref.creatureId) {
    return findCreatureById(ref.creatureId, allCreatures)
  }

  if (ref.creatureName) {
    const name = ref.creatureName.toLowerCase().trim()

    // Exact match first
    const exact = allCreatures.find(c => c.name.toLowerCase() === name)
    if (exact) return exact

    // Partial match (name contains search)
    const partial = allCreatures.find(c => c.name.toLowerCase().includes(name))
    if (partial) return partial

    // Reverse partial (search contains name)
    const reverse = allCreatures.find(c => name.includes(c.name.toLowerCase()))
    if (reverse) return reverse

    return null
  }

  return null
}

/**
 * Find a hazard by ID or name
 */
function resolveHazardRef(
  ref: BundleHazardRef,
  allHazards: Hazard[]
): Hazard | null {
  if (ref.hazardId) {
    return allHazards.find(h => h.id === ref.hazardId) ?? null
  }

  if (ref.hazardName) {
    const name = ref.hazardName.toLowerCase().trim()
    const exact = allHazards.find(h => h.name.toLowerCase() === name)
    if (exact) return exact

    const partial = allHazards.find(h => h.name.toLowerCase().includes(name))
    if (partial) return partial

    return null
  }

  return null
}

// ============ Store Interface ============

export interface ImportStores {
  encounterStore: {
    state: {
      creatures: Creature[]
      hazards: Hazard[]
    }
    importCustomCreatures: (json: string) => number
    importCustomHazards: (json: string) => number
    importEncounters: (json: string) => void
  }
  hackingStore: {
    state: {
      savedEncounters: SavedHackingEncounter[]
    }
  }
  starshipStore: {
    importScenes: (json: string) => void
    /** Optional — present in starshipStore. Required to round-trip
     * starship templates from session bundles. */
    importStarshipTemplates?: (json: string) => void
  }
  partyStore: {
    importParties: (json: string, mode?: 'merge' | 'replace') => { success: boolean; imported: number; error?: string }
  }
  shopStore: {
    state: {
      savedShops: SavedShop[]
    }
  }
  /** Optional — present in tscStore. Required to round-trip tactical starship data. */
  tscStore?: {
    importScenes: (json: string) => void
    importPlayerShips: (json: string) => void
    importCustomStarships: (json: string) => number
    getStarshipById: (id: string) => NpcStarship | undefined
    allStarships: { value: NpcStarship[] }
    state?: { playerShips: PlayerStarship[] }
  }
  /** Optional — present in chaseStore. Required to round-trip chases. */
  chaseStore?: {
    importChases: (json: string | unknown) => number
  }
}

function resolveStarshipRef(ref: BundleStarshipRef, pool: NpcStarship[]): NpcStarship | undefined {
  if (ref.starshipId) {
    const byId = pool.find(s => s.id === ref.starshipId)
    if (byId) return byId
  }
  if (ref.starshipName) {
    const name = ref.starshipName.toLowerCase()
    return pool.find(s => s.name.toLowerCase() === name)
  }
  return undefined
}

function resolveStarshipHazardRef(ref: BundleStarshipHazardRef): StarshipHazard | undefined {
  if (ref.hazardId) {
    const byId = TSC_HAZARDS.find(h => h.id === ref.hazardId)
    if (byId) return byId
  }
  if (ref.hazardName) {
    const name = ref.hazardName.toLowerCase()
    return TSC_HAZARDS.find(h => h.name.toLowerCase() === name)
  }
  return undefined
}

// ============ Hand-written tactical scenes and chases ============

type Warn = (message: string) => void

function placement(ref: BundleTscPlacement, zones: string[]) {
  return defaultPosition(ref.zone ?? zones[0] ?? '1', ref.heading ?? 'fore')
}

/** Fill in a tactical scene, turning ship and hazard references into full instances. */
export function normalizeBundleTscScene(
  raw: BundleTscScene,
  starshipPool: NpcStarship[],
  playerShips: PlayerStarship[],
  warn: Warn,
): TscSavedScene {
  const zones = raw.sensorMap?.zones?.length ? raw.sensorMap.zones : [...DEFAULT_ZONES]
  const sensorMap: SensorMapDescriptor = { ...raw.sensorMap, kind: raw.sensorMap?.kind ?? 'freeform', zones }

  let playerShip = raw.playerShip ?? null
  if (!playerShip && raw.playerShipId) {
    playerShip = playerShips.find(p => p.id === raw.playerShipId) ?? null
    if (!playerShip) warn(`Could not resolve player starship reference: "${raw.playerShipId}"`)
  }

  const npcShips: TscNpcShipInstance[] = []
  for (const entry of raw.npcShips ?? []) {
    if ('model' in entry) { npcShips.push(entry); continue }
    const model = resolveStarshipRef(entry, starshipPool)
    if (!model) { warn(`Could not resolve starship reference: "${entry.starshipId || entry.starshipName || 'unknown'}"`); continue }
    const count = entry.count ?? 1
    for (let i = 0; i < count; i++) {
      const existing = npcShips.filter(n => n.model.id === model.id).length
      const base = entry.label ?? model.name
      const label = entry.label && count === 1 ? base : existing === 0 ? base : `${base} ${existing + 1}`
      const inst = createNpcShipInstance(model, label, placement(entry, zones))
      inst.hiddenFromPlayers = !!entry.hidden
      if (entry.detected !== undefined) inst.detected = entry.detected
      npcShips.push(inst)
    }
  }

  const hazards: TscHazardInstance[] = []
  for (const entry of raw.hazards ?? []) {
    if ('hazard' in entry) { hazards.push(entry); continue }
    const hazard = resolveStarshipHazardRef(entry)
    if (!hazard) { warn(`Could not resolve starship hazard reference: "${entry.hazardId || entry.hazardName || 'unknown'}"`); continue }
    const inst = createHazardInstance(hazard, entry.label, placement(entry, zones))
    inst.hiddenFromPlayers = !!entry.hidden
    if (entry.detected !== undefined) inst.detected = entry.detected
    hazards.push(inst)
  }

  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name,
    level: raw.level ?? playerShip?.level ?? 1,
    description: raw.description,
    playerShip,
    pcs: (raw.pcs ?? []).map(pc => ({ ...pc, id: pc.id ?? crypto.randomUUID(), name: pc.name ?? 'PC' })),
    npcShips,
    hazards,
    sensorMap,
    savedAt: raw.savedAt ?? Date.now(),
  }
}

/** Fill in a chase: ids, sample obstacles by id, default sides and end conditions for its type. */
export function normalizeBundleChase(raw: BundleChase, partySize: number, warn: Warn): SavedChase {
  const type = raw.type ?? 'run-away'
  const level = raw.level ?? 1
  const obstacles: ChaseObstacle[] = []
  for (const [index, o] of (raw.obstacles ?? []).entries()) {
    const chasePoints = o.chasePoints ?? suggestedChasePoints(partySize, index)
    const sample = o.sampleId ? SAMPLE_CHASE_OBSTACLES.find(s => s.id === o.sampleId) : undefined
    if (o.sampleId && !sample) warn(`Unknown sample obstacle "${o.sampleId}" in chase "${raw.name}"`)
    const base: ChaseObstacle = sample
      ? obstacleFromSample(sample, chasePoints)
      : { id: crypto.randomUUID(), name: 'Obstacle', level, environment: 'custom', chasePoints, options: [], description: '', revealedToPlayers: false }
    obstacles.push({
      ...base,
      ...o,
      id: o.id ?? base.id,
      chasePoints,
      description: o.description ?? base.description,
      revealedToPlayers: o.revealedToPlayers ?? false,
      options: o.options
        ? o.options.map(opt => ({ ...opt, id: opt.id ?? crypto.randomUUID(), skills: opt.skills ?? [], description: opt.description ?? '' }))
        : base.options,
    })
  }

  const defaults = defaultSetup(type, obstacles.length)
  const sides: ChaseSide[] = raw.sides
    ? raw.sides.map(side => createSide({
        ...side,
        name: side.name ?? 'Side',
        role: side.role ?? 'competitor',
        ...(side.id ? { id: side.id } : {}),
        members: (side.members ?? []).map(m => {
          const member = typeof m === 'string' ? { name: m } : m
          return { ...member, id: member.id ?? crypto.randomUUID(), name: member.name ?? 'Member', hasActed: member.hasActed ?? false }
        }),
      }))
    : defaults.sides

  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name,
    type,
    length: raw.length ?? lengthForCount(obstacles.length),
    level,
    roundLength: raw.roundLength ?? '3 actions',
    description: raw.description ?? '',
    obstacles,
    sides,
    end: { ...defaults.end, ...raw.end },
    savedAt: raw.savedAt ?? Date.now(),
  }
}

/**
 * Read a standalone tactical scene file (YAML or JSON): an exported array of scenes, or an
 * object with tscScenes and, optionally, the tscPlayerShips they point at.
 */
export function parseTscScenesFile(content: string, starshipPool: NpcStarship[], savedPlayerShips: PlayerStarship[]) {
  const data = yaml.load(content) as BundleTscScene[] | Pick<SessionBundle, 'tscScenes' | 'tscPlayerShips'>
  const raw = Array.isArray(data) ? data : data?.tscScenes
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('No tactical scenes found in the file')
  const playerShips = Array.isArray(data) ? [] : data.tscPlayerShips ?? []
  const warnings: string[] = []
  const scenes = raw.map(sc => normalizeBundleTscScene(sc, starshipPool, [...playerShips, ...savedPlayerShips], m => warnings.push(m)))
  return { scenes, playerShips, warnings }
}

/**
 * Read a standalone chase file (YAML or JSON): an exported { version, chases } file, a plain
 * array of chases, or an object with chases (and, optionally, a party for Chase Points).
 */
export function parseChasesFile(content: string, partySize = 4) {
  const data = yaml.load(content) as BundleChase[] | Pick<SessionBundle, 'chases' | 'party'>
  const raw = Array.isArray(data) ? data : data?.chases
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('No chases found in the file')
  const size = (!Array.isArray(data) && data.party?.players?.length) || partySize
  const warnings: string[] = []
  const chases = raw.map(c => normalizeBundleChase(c, size, m => warnings.push(m)))
  return { chases, warnings }
}

// ============ Import Logic ============

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Import a session bundle into all stores
 */
export function importSessionBundle(
  bundle: SessionBundle,
  stores: ImportStores
): ImportResult {
  const result: ImportResult = {
    success: true,
    sessionName: bundle.name,
    creatures: 0,
    hazards: 0,
    parties: 0,
    encounters: 0,
    hackingSessions: 0,
    starshipScenes: 0,
    starshipTemplates: 0,
    tscScenes: 0,
    tscPlayerShips: 0,
    tscCustomStarships: 0,
    chases: 0,
    shops: 0,
    warnings: [],
  }

  // 1. Import creatures first (so encounters can reference them)
  if (bundle.creatures && bundle.creatures.length > 0) {
    try {
      const count = stores.encounterStore.importCustomCreatures(JSON.stringify(bundle.creatures))
      result.creatures = count
    } catch (e) {
      result.warnings.push({
        section: 'creatures',
        message: `Failed to import creatures: ${(e as Error).message}`,
      })
    }
  }

  // 2. Import hazards
  if (bundle.hazards && bundle.hazards.length > 0) {
    try {
      const count = stores.encounterStore.importCustomHazards(JSON.stringify(bundle.hazards))
      result.hazards = count
    } catch (e) {
      result.warnings.push({
        section: 'hazards',
        message: `Failed to import hazards: ${(e as Error).message}`,
      })
    }
  }

  // 3. Import party
  if (bundle.party) {
    try {
      const partyData = {
        version: 1,
        parties: [{
          id: `bundle-${generateId()}`,
          name: bundle.party.name,
          players: bundle.party.players.map(p => ({
            id: `player-${generateId()}`,
            name: p.name,
            maxHP: p.maxHP,
            ac: p.ac,
            level: p.level,
            class: p.class,
            ancestry: p.ancestry,
            perception: p.perception,
            fortitude: p.fortitude,
            reflex: p.reflex,
            will: p.will,
            notes: p.notes,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      }
      const importResult = stores.partyStore.importParties(JSON.stringify(partyData))
      if (importResult.success) {
        result.parties = importResult.imported
      } else {
        result.warnings.push({
          section: 'party',
          message: importResult.error || 'Failed to import party',
        })
      }
    } catch (e) {
      result.warnings.push({
        section: 'party',
        message: `Failed to import party: ${(e as Error).message}`,
      })
    }
  }

  // 3b. Import custom NPC starships before encounters so starship references resolve
  if (bundle.tscCustomStarships && bundle.tscCustomStarships.length > 0) {
    if (!stores.tscStore) {
      result.warnings.push({ section: 'tsc', message: 'Bundle contains tscCustomStarships but the store is not available — skipping.' })
    } else {
      try {
        result.tscCustomStarships = stores.tscStore.importCustomStarships(JSON.stringify(bundle.tscCustomStarships))
      } catch (e) {
        result.warnings.push({ section: 'tsc', message: `Failed to import custom starships: ${(e as Error).message}` })
      }
    }
  }

  // 4. Import encounters (resolve creature/hazard references)
  if (bundle.encounters && bundle.encounters.length > 0) {
    const allCreatures = stores.encounterStore.state.creatures
    const allHazards = stores.encounterStore.state.hazards

    const starshipPool = stores.tscStore?.allStarships.value ?? TSC_STARSHIPS

    const encounters = bundle.encounters.map(enc => {
      const encounterCreatures: EncounterCreature[] = []
      const encounterHazards: EncounterHazard[] = []
      const encounterStarships: EncounterStarship[] = []
      const encounterStarshipHazards: EncounterStarshipHazard[] = []

      // Resolve Tech Core starship and starship-hazard references
      for (const ref of enc.starships ?? []) {
        const starship = resolveStarshipRef(ref, starshipPool)
        if (starship) encounterStarships.push({ starship, count: ref.count ?? 1 })
        else result.warnings.push({ section: 'encounters', message: `Could not resolve starship reference: "${ref.starshipId || ref.starshipName || 'unknown'}"`, item: enc.name })
      }
      for (const ref of enc.starshipHazards ?? []) {
        const hazard = resolveStarshipHazardRef(ref)
        if (hazard) encounterStarshipHazards.push({ hazard, count: ref.count ?? 1 })
        else result.warnings.push({ section: 'encounters', message: `Could not resolve starship hazard reference: "${ref.hazardId || ref.hazardName || 'unknown'}"`, item: enc.name })
      }

      // Resolve creature references
      if (enc.creatures) {
        for (const ref of enc.creatures) {
          const creature = resolveCreatureRef(ref, allCreatures)
          if (creature) {
            encounterCreatures.push({
              creature,
              count: ref.count ?? 1,
              adjustment: ref.adjustment ?? 'normal',
            })
          } else {
            const refLabel = ref.creatureId || ref.creatureName || 'unknown'
            result.warnings.push({
              section: 'encounters',
              message: `Could not resolve creature reference: "${refLabel}"`,
              item: enc.name,
            })
          }
        }
      }

      // Resolve hazard references
      if (enc.hazards) {
        for (const ref of enc.hazards) {
          const hazard = resolveHazardRef(ref, allHazards)
          if (hazard) {
            encounterHazards.push({
              hazard,
              count: ref.count ?? 1,
            })
          } else {
            const refLabel = ref.hazardId || ref.hazardName || 'unknown'
            result.warnings.push({
              section: 'encounters',
              message: `Could not resolve hazard reference: "${refLabel}"`,
              item: enc.name,
            })
          }
        }
      }

      return {
        id: `bundle-${generateId()}`,
        name: enc.name,
        creatures: encounterCreatures,
        hazards: encounterHazards,
        ...(encounterStarships.length ? { starships: encounterStarships } : {}),
        ...(encounterStarshipHazards.length ? { starshipHazards: encounterStarshipHazards } : {}),
        ...(enc.tscSmallCrew !== undefined ? { tscSmallCrew: enc.tscSmallCrew } : {}),
        partyLevel: enc.partyLevel ?? bundle.partyLevel ?? 1,
        partySize: enc.partySize ?? 4,
        notes: enc.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })

    try {
      stores.encounterStore.importEncounters(JSON.stringify(encounters))
      result.encounters = encounters.length
    } catch (e) {
      result.warnings.push({
        section: 'encounters',
        message: `Failed to import encounters: ${(e as Error).message}`,
      })
    }
  }

  // 4b. Tactical starship scenes and player starship sheets
  if ((bundle.tscScenes?.length || bundle.tscPlayerShips?.length) && !stores.tscStore) {
    result.warnings.push({ section: 'tsc', message: 'Bundle contains tactical starship data but the store is not available — skipping.' })
  } else if (stores.tscStore) {
    if (bundle.tscPlayerShips && bundle.tscPlayerShips.length > 0) {
      try {
        stores.tscStore.importPlayerShips(JSON.stringify(bundle.tscPlayerShips))
        result.tscPlayerShips = bundle.tscPlayerShips.length
      } catch (e) {
        result.warnings.push({ section: 'tsc', message: `Failed to import player starships: ${(e as Error).message}` })
      }
    }
    if (bundle.tscScenes && bundle.tscScenes.length > 0) {
      try {
        const playerShips = [...(bundle.tscPlayerShips ?? []), ...(stores.tscStore.state?.playerShips ?? [])]
        const warn: Warn = message => result.warnings.push({ section: 'tsc', message })
        const scenes = bundle.tscScenes.map(sc => normalizeBundleTscScene(sc, stores.tscStore!.allStarships.value, playerShips, warn))
        stores.tscStore.importScenes(JSON.stringify(scenes))
        result.tscScenes = bundle.tscScenes.length
      } catch (e) {
        result.warnings.push({ section: 'tsc', message: `Failed to import tactical scenes: ${(e as Error).message}` })
      }
    }
  }

  // 4c. Chases
  if (bundle.chases && bundle.chases.length > 0) {
    if (!stores.chaseStore) {
      result.warnings.push({ section: 'chases', message: 'Bundle contains chases but the store is not available — skipping.' })
    } else {
      try {
        const partySize = bundle.party?.players?.length || 4
        const warn: Warn = message => result.warnings.push({ section: 'chases', message })
        result.chases = stores.chaseStore.importChases({ chases: bundle.chases.map(c => normalizeBundleChase(c, partySize, warn)) })
      } catch (e) {
        result.warnings.push({ section: 'chases', message: `Failed to import chases: ${(e as Error).message}` })
      }
    }
  }

  // 5. Import hacking sessions
  if (bundle.hacking && bundle.hacking.length > 0) {
    for (const hack of bundle.hacking) {
      try {
        const computer: Computer = {
          id: hack.computer.id || crypto.randomUUID(),
          name: hack.computer.name,
          level: hack.computer.level,
          type: hack.computer.type as 'tech' | 'magic' | 'hybrid',
          description: hack.computer.description,
          successDescription: hack.computer.successDescription,
          criticalSuccessDescription: hack.computer.criticalSuccessDescription,
          failureDescription: hack.computer.failureDescription,
          accessPoints: (hack.computer.accessPoints || []).map(ap => ({
            id: ap.id || crypto.randomUUID(),
            name: ap.name || 'Access Point',
            type: (ap.type || 'physical') as 'physical' | 'remote' | 'magical',
            state: (ap.state || 'locked') as 'locked' | 'active' | 'breached' | 'alarmed',
            position: ap.position || { x: 0.5, y: 0.5 },
            connectedTo: ap.connectedTo || [],
            dc: ap.dc,
            successesRequired: ap.successesRequired,
            hackSkills: ap.hackSkills,
            vulnerabilities: ap.vulnerabilities,
            countermeasures: ap.countermeasures,
            notes: ap.notes,
          })),
        }

        const savedEncounter: SavedHackingEncounter = {
          id: crypto.randomUUID(),
          name: hack.name,
          computer,
          savedAt: Date.now(),
        }

        // Check for duplicate names
        const existing = stores.hackingStore.state.savedEncounters
        if (!existing.find(e => e.name === savedEncounter.name)) {
          existing.push(savedEncounter)
          result.hackingSessions++
        } else {
          result.warnings.push({
            section: 'hacking',
            message: `Hacking session "${hack.name}" already exists, skipped`,
          })
        }
      } catch (e) {
        result.warnings.push({
          section: 'hacking',
          message: `Failed to import hacking session "${hack.name}": ${(e as Error).message}`,
        })
      }
    }
  }

  // 6. Import starship scenes
  if (bundle.starship && bundle.starship.length > 0) {
    const scenes: SavedScene[] = bundle.starship.map(s => {
      const defaultStarship = createDefaultStarship()
      const starship = s.starship ? {
        ...defaultStarship,
        name: s.starship.name ?? defaultStarship.name,
        level: s.level ?? defaultStarship.level,
        ac: s.starship.ac ?? defaultStarship.ac,
        fortitude: s.starship.fortitude ?? defaultStarship.fortitude,
        reflex: s.starship.reflex ?? defaultStarship.reflex,
        maxHP: s.starship.maxHP ?? defaultStarship.maxHP,
        currentHP: s.starship.maxHP ?? defaultStarship.currentHP,
        maxShields: s.starship.maxShields ?? defaultStarship.maxShields,
        currentShields: s.starship.maxShields ?? defaultStarship.currentShields,
        shieldRegen: s.starship.shieldRegen ?? defaultStarship.shieldRegen,
      } : defaultStarship

      // Spread the full threat first so optional fields survive
      // (skills, initiativeSkill/Bonus, tacticalRole, specialAbilities,
      // immunities, weaknesses, resistances). The earlier hand-picked
      // whitelist silently dropped them, which broke the runner's
      // auto-roll for skill_check routine actions on imported threats.
      // Then layer runtime defaults and regenerate the id so re-imports
      // can't clobber existing live state.
      const threats: StarshipThreat[] = (s.threats ?? []).map(t => ({
        ...createDefaultThreat(),
        ...(t as Partial<StarshipThreat>),
        id: crypto.randomUUID(),
        maxHP: t.maxHP ?? 30,
        currentHP: t.maxHP ?? 30,
        maxShields: t.maxShields,
        currentShields: t.maxShields,
        ac: t.ac ?? 14,
        routine: t.routine as StarshipThreat['routine'],
        isDefeated: false,
        routineActionsUsed: [],
      }))

      const base = createEmptySavedScene()

      // Map starship bonuses if provided
      if (s.starship?.bonuses && starship !== defaultStarship) {
        starship.bonuses = s.starship.bonuses
      }

      return {
        ...base,
        id: crypto.randomUUID(),
        name: s.name,
        level: s.level ?? bundle.partyLevel ?? 1,
        description: s.description ?? '',
        victoryCondition: (s.victoryCondition ?? 'defeat') as SavedScene['victoryCondition'],
        vpRequired: s.vpRequired,
        survivalRounds: s.survivalRounds,
        customCondition: s.customCondition,
        starship,
        threats,
        roles: (s.roles ?? []) as SavedScene['roles'],
        availableRoles: s.availableRoles ?? base.availableRoles,
        starshipActions: (s.starshipActions ?? []) as SavedScene['starshipActions'],
        partySize: s.partySize ?? base.partySize,
        additionalObjectives: s.additionalObjectives,
        roleDescriptions: s.roleDescriptions,
        savedAt: Date.now(),
      }
    })

    try {
      stores.starshipStore.importScenes(JSON.stringify(scenes))
      result.starshipScenes = scenes.length
    } catch (e) {
      result.warnings.push({
        section: 'starship',
        message: `Failed to import starship scenes: ${(e as Error).message}`,
      })
    }
  }

  // 6b. Import starship templates (reusable PC ship configs)
  if (bundle.starshipTemplates && bundle.starshipTemplates.length > 0) {
    if (!stores.starshipStore.importStarshipTemplates) {
      result.warnings.push({
        section: 'starship',
        message: 'Bundle contains starshipTemplates but the store does not expose importStarshipTemplates — skipping. Update the app.',
      })
    } else {
      try {
        // Normalise each template into the SavedStarship shape the store
        // expects. Missing optional fields get sensible defaults.
        const normalised = bundle.starshipTemplates.map(t => {
          const ship = t.starship ?? {}
          return {
            id: t.id ?? crypto.randomUUID(),
            name: t.name,
            description: t.description,
            isCampaignShip: t.isCampaignShip ?? false,
            savedAt: t.savedAt ?? Date.now(),
            starship: {
              id: ship.id ?? crypto.randomUUID(),
              name: ship.name ?? t.name,
              level: ship.level ?? bundle.partyLevel ?? 1,
              ac: ship.ac ?? 15,
              fortitude: ship.fortitude ?? 10,
              reflex: ship.reflex ?? 10,
              maxHP: ship.maxHP ?? 30,
              currentHP: ship.currentHP ?? ship.maxHP ?? 30,
              maxShields: ship.maxShields ?? 5,
              currentShields: ship.currentShields ?? ship.maxShields ?? 5,
              shieldRegen: ship.shieldRegen ?? 1,
              bonuses: ship.bonuses ?? {},
              templateId: ship.templateId ?? t.id,
            },
          }
        })
        stores.starshipStore.importStarshipTemplates(JSON.stringify(normalised))
        result.starshipTemplates = normalised.length
      } catch (e) {
        result.warnings.push({
          section: 'starship',
          message: `Failed to import starship templates: ${(e as Error).message}`,
        })
      }
    }
  }

  // 7. Import shops as saved snapshots
  if (bundle.shops && bundle.shops.length > 0) {
    for (const shop of bundle.shops) {
      try {
        if (!shop.shop || !shop.shop.inventory) {
          // Legacy params-only entry — re-rolling would produce different items
          // than the GM prepped, so drop with a clear warning.
          result.warnings.push({
            section: 'shops',
            message: `Shop "${shop.name}" is in the legacy params-only format and was skipped. Re-export the bundle from a newer version of the app to include the rolled inventory.`,
          })
          continue
        }

        const saved: SavedShop = {
          id: `bundle-${generateId()}`,
          name: shop.name,
          shop: shop.shop,
          shopkeeper: shop.shopkeeper ?? null,
          savedAt: shop.savedAt ?? Date.now(),
        }
        stores.shopStore.state.savedShops.push(saved)
        result.shops++
      } catch (e) {
        result.warnings.push({
          section: 'shops',
          message: `Failed to import shop "${shop.name}": ${(e as Error).message}`,
        })
      }
    }
  }

  result.success = result.warnings.filter(w => !w.message.includes('skipped')).length === 0 ||
    (result.creatures + result.hazards + result.parties + result.encounters +
     result.hackingSessions + result.starshipScenes + result.starshipTemplates + result.shops) > 0

  return result
}

/**
 * Preview what a session bundle will import (without actually importing)
 */
export function previewSessionBundle(bundle: SessionBundle): {
  creatures: number
  hazards: number
  party: string | null
  encounters: string[]
  hacking: string[]
  starship: string[]
  shops: string[]
  tscScenes: string[]
  tscPlayerShips: string[]
  tscCustomStarships: number
  chases: string[]
} {
  return {
    creatures: bundle.creatures?.length ?? 0,
    hazards: bundle.hazards?.length ?? 0,
    party: bundle.party?.name ?? null,
    encounters: bundle.encounters?.map(e => e.name) ?? [],
    hacking: bundle.hacking?.map(h => h.name) ?? [],
    starship: bundle.starship?.map(s => s.name) ?? [],
    shops: bundle.shops?.map(s => s.name) ?? [],
    tscScenes: bundle.tscScenes?.map(s => s.name) ?? [],
    tscPlayerShips: bundle.tscPlayerShips?.map(s => s.name) ?? [],
    tscCustomStarships: bundle.tscCustomStarships?.length ?? 0,
    chases: bundle.chases?.map(c => c.name) ?? [],
  }
}
