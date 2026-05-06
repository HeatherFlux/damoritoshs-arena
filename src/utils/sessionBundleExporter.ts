/**
 * Session Bundle Exporter
 *
 * Aggregates state from the relevant stores into a SessionBundle that can be
 * serialized as YAML or JSON, then re-imported by sessionBundleImporter on a
 * different device. Mirror image of sessionBundleImporter.ts.
 *
 * Out of scope (intentional):
 *  - Live combat state (combatStore) — not round-tripped
 *  - Per-device settings (settingsStore) — theme/Discord webhook stay per-device
 *  - Shop generator state (shopStore) — session-only, not persisted
 */

import yaml from 'js-yaml'
import type { Creature, Encounter, EncounterCreature } from '../types/creature'
import type { Hazard, EncounterHazard } from '../types/hazard'
import type { SavedHackingEncounter } from '../types/hacking'
import type { SavedScene, SavedStarship } from '../types/starship'
import type { Party } from '../types/party'
import type { SavedShop } from '../types/shop'
import type {
  SessionBundle,
  BundleParty,
  BundlePlayer,
  BundleEncounter,
  BundleCreatureRef,
  BundleHazardRef,
  BundleHacking,
  BundleStarship,
  BundleStarshipThreat,
  BundleShop,
} from './sessionBundleImporter'

// ============ Stores Interface ============

export interface ExportStores {
  encounterStore: {
    state: { encounters: Encounter[] }
    exportCustomCreatures: () => string
    exportCustomHazards: () => string
  }
  partyStore: {
    activeParty: { value: Party | undefined }
  }
  hackingStore: {
    state: { savedEncounters: SavedHackingEncounter[] }
  }
  starshipStore: {
    state: { savedScenes: SavedScene[]; savedStarships?: SavedStarship[] }
  }
  shopStore: {
    state: { savedShops: SavedShop[] }
  }
}

export interface BuildBundleOptions {
  name: string
  description?: string
}

// ============ Build ============

/**
 * Aggregate state from the four persistent stores into a SessionBundle.
 * The active party only is included; multi-party users can use the existing
 * per-store party JSON export as a fallback.
 */
export function buildSessionBundle(
  stores: ExportStores,
  opts: BuildBundleOptions
): SessionBundle {
  const bundle: SessionBundle = { name: opts.name }

  if (opts.description) {
    bundle.description = opts.description
  }

  // ---- Party (active only) ----
  const active = stores.partyStore.activeParty.value
  if (active) {
    bundle.party = mapParty(active)
    const derivedLevel = derivePartyLevel(active)
    if (derivedLevel != null) {
      bundle.partyLevel = derivedLevel
    }
  }

  // ---- Custom creatures / hazards ----
  // Use the store's existing exporters which already filter out bundled entries.
  const customCreatures = parseJsonArray<Creature>(stores.encounterStore.exportCustomCreatures())
  if (customCreatures.length > 0) {
    bundle.creatures = customCreatures
  }

  const customHazards = parseJsonArray<Hazard>(stores.encounterStore.exportCustomHazards())
  if (customHazards.length > 0) {
    bundle.hazards = customHazards
  }

  // ---- Encounters ----
  const encounters = stores.encounterStore.state.encounters
  if (encounters.length > 0) {
    bundle.encounters = encounters.map(mapEncounter)
  }

  // ---- Hacking ----
  const hacking = stores.hackingStore.state.savedEncounters
  if (hacking.length > 0) {
    bundle.hacking = hacking.map(mapHacking)
  }

  // ---- Starship scenes ----
  const scenes = stores.starshipStore.state.savedScenes
  if (scenes.length > 0) {
    bundle.starship = scenes.map(mapStarshipScene)
  }

  // ---- Starship templates (reusable PC ship configs) ----
  const templates = stores.starshipStore.state.savedStarships ?? []
  if (templates.length > 0) {
    bundle.starshipTemplates = templates.map(t => JSON.parse(JSON.stringify(t)))
  }

  // ---- Shops (full snapshots, not just generation params) ----
  const shops = stores.shopStore.state.savedShops
  if (shops.length > 0) {
    bundle.shops = shops.map(mapShop)
  }

  return bundle
}

function mapShop(saved: SavedShop): BundleShop {
  return {
    name: saved.name,
    shop: saved.shop,
    shopkeeper: saved.shopkeeper,
    savedAt: saved.savedAt,
  }
}

// ============ Serialize ============

export type BundleFormat = 'yaml' | 'json'

export interface SerializedBundle {
  content: string
  mimeType: string
  extension: 'yaml' | 'json'
}

export function serializeBundle(
  bundle: SessionBundle,
  format: BundleFormat = 'yaml'
): SerializedBundle {
  if (format === 'json') {
    return {
      content: JSON.stringify(bundle, null, 2),
      mimeType: 'application/json',
      extension: 'json',
    }
  }

  // YAML
  const content = yaml.dump(bundle, {
    noRefs: true,
    lineWidth: 120,
    skipInvalid: true,
  })
  return {
    content,
    mimeType: 'application/x-yaml',
    extension: 'yaml',
  }
}

/**
 * Build a sensible default filename for an exported bundle.
 * Format: <slug>-<YYYY-MM-DD>
 */
export function defaultBundleFilename(activePartyName?: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const slug = activePartyName ? slugify(activePartyName) : 'session'
  return `${slug}-${today}`
}

// ============ Helpers ============

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'session'
}

function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function derivePartyLevel(party: Party): number | null {
  const players = party.players ?? []
  if (players.length === 0) return null
  const total = players.reduce((sum, p) => sum + (p.level ?? 1), 0)
  return Math.round(total / players.length)
}

function mapParty(party: Party): BundleParty {
  return {
    name: party.name,
    players: party.players.map(mapPlayer),
  }
}

function mapPlayer(p: Party['players'][number]): BundlePlayer {
  // Drop id and pathbuilderData; keep everything else the schema accepts.
  const out: BundlePlayer = {
    name: p.name,
    maxHP: p.maxHP,
    ac: p.ac,
  }
  if (p.level != null) out.level = p.level
  if (p.class != null) out.class = p.class
  if (p.ancestry != null) out.ancestry = p.ancestry
  if (p.perception != null) out.perception = p.perception
  if (p.fortitude != null) out.fortitude = p.fortitude
  if (p.reflex != null) out.reflex = p.reflex
  if (p.will != null) out.will = p.will
  if (p.notes != null) out.notes = p.notes
  return out
}

function mapEncounter(enc: Encounter): BundleEncounter {
  const out: BundleEncounter = { name: enc.name }
  if (enc.partyLevel != null) out.partyLevel = enc.partyLevel
  if (enc.partySize != null) out.partySize = enc.partySize
  if (enc.notes) out.notes = enc.notes

  if (enc.creatures.length > 0) {
    out.creatures = enc.creatures.map(mapCreatureRef)
  }
  if (enc.hazards && enc.hazards.length > 0) {
    out.hazards = enc.hazards.map(mapHazardRef)
  }
  return out
}

function mapCreatureRef(ec: EncounterCreature): BundleCreatureRef {
  const ref: BundleCreatureRef = {
    creatureId: ec.creature.id,
    count: ec.count,
  }
  if (ec.adjustment && ec.adjustment !== 'normal') {
    ref.adjustment = ec.adjustment
  }
  return ref
}

function mapHazardRef(eh: EncounterHazard): BundleHazardRef {
  return {
    hazardId: eh.hazard.id,
    count: eh.count,
  }
}

function mapHacking(saved: SavedHackingEncounter): BundleHacking {
  // Spread the full Computer; importer accepts Partial<Computer> + required fields
  // and will regenerate IDs as needed.
  return {
    name: saved.name,
    computer: saved.computer,
  }
}

function mapStarshipScene(scene: SavedScene): BundleStarship {
  const out: BundleStarship = {
    name: scene.name,
    level: scene.level,
    description: scene.description,
    victoryCondition: scene.victoryCondition,
  }

  if (scene.vpRequired != null) out.vpRequired = scene.vpRequired
  if (scene.survivalRounds != null) out.survivalRounds = scene.survivalRounds
  if (scene.customCondition) out.customCondition = scene.customCondition

  out.starship = {
    name: scene.starship.name,
    ac: scene.starship.ac,
    fortitude: scene.starship.fortitude,
    reflex: scene.starship.reflex,
    maxHP: scene.starship.maxHP,
    maxShields: scene.starship.maxShields,
    shieldRegen: scene.starship.shieldRegen,
    bonuses: { ...scene.starship.bonuses },
  }

  if (scene.threats.length > 0) {
    out.threats = scene.threats.map(mapStarshipThreat)
  }

  if (scene.roles?.length > 0) {
    out.roles = scene.roles.map(r => ({
      roleId: r.roleId,
      playerName: r.playerName,
      ...(r.playerId != null ? { playerId: r.playerId } : {}),
    }))
  }

  if (scene.availableRoles?.length > 0) {
    out.availableRoles = [...scene.availableRoles]
  }

  if (scene.starshipActions?.length > 0) {
    out.starshipActions = scene.starshipActions as object[]
  }

  if (scene.partySize != null) out.partySize = scene.partySize
  if (scene.additionalObjectives && scene.additionalObjectives.length > 0) {
    // Bundle still emits strings for backward compat. If any objective
    // has a hidden flag, emit the object form so the flag round-trips.
    out.additionalObjectives = scene.additionalObjectives.map(o => {
      if (typeof o === 'string') return o
      return o.hidden ? o : o.text
    })
  }
  if (scene.roleDescriptions) {
    out.roleDescriptions = { ...scene.roleDescriptions }
  }

  return out
}

function mapStarshipThreat(t: SavedScene['threats'][number]): BundleStarshipThreat {
  const out: BundleStarshipThreat = {
    name: t.name,
    type: t.type,
    level: t.level,
  }
  if (t.maxHP != null) out.maxHP = t.maxHP
  if (t.ac != null) out.ac = t.ac
  if (t.maxShields != null) out.maxShields = t.maxShields
  if (t.shieldRegen != null) out.shieldRegen = t.shieldRegen
  if (t.fortitude != null) out.fortitude = t.fortitude
  if (t.reflex != null) out.reflex = t.reflex
  if (t.description) out.description = t.description
  if (t.routine) out.routine = t.routine as object
  return out
}
