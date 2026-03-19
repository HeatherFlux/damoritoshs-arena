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
import { createDefaultStarship, createDefaultThreat, createEmptySavedScene } from '../types/starship'
import type { ShopType, SettlementSize } from '../types/shop'

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

export interface BundleEncounter {
  name: string
  partyLevel?: number
  partySize?: number
  notes?: string
  creatures?: BundleCreatureRef[]
  hazards?: BundleHazardRef[]
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
  ac?: number
  maxShields?: number
  shieldRegen?: number
  fortitude?: number
  reflex?: number
  description?: string
  routine?: object
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
  additionalObjectives?: string[]
  roleDescriptions?: Record<string, string>
}

export interface BundleShop {
  name: string
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
  shops?: BundleShop[]
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
  shops: number
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
  }
  partyStore: {
    importParties: (json: string, mode?: 'merge' | 'replace') => { success: boolean; imported: number; error?: string }
  }
  shopStore: {
    state: {
      partyLevel: number
      shopType: ShopType
      settlement: SettlementSize
      customName: string
    }
    generateShop: () => object
  }
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

  // 4. Import encounters (resolve creature/hazard references)
  if (bundle.encounters && bundle.encounters.length > 0) {
    const allCreatures = stores.encounterStore.state.creatures
    const allHazards = stores.encounterStore.state.hazards

    const encounters = bundle.encounters.map(enc => {
      const encounterCreatures: EncounterCreature[] = []
      const encounterHazards: EncounterHazard[] = []

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

      const threats: StarshipThreat[] = (s.threats ?? []).map(t => ({
        ...createDefaultThreat(),
        id: crypto.randomUUID(),
        name: t.name,
        type: t.type,
        level: t.level,
        maxHP: t.maxHP ?? 30,
        currentHP: t.maxHP ?? 30,
        maxShields: t.maxShields,
        currentShields: t.maxShields,
        shieldRegen: t.shieldRegen,
        ac: t.ac ?? 14,
        fortitude: t.fortitude,
        reflex: t.reflex,
        description: t.description,
        routine: t.routine as StarshipThreat['routine'],
        isDefeated: false,
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

  // 7. Import shops (generate inventory using shop store)
  if (bundle.shops && bundle.shops.length > 0) {
    for (const shop of bundle.shops) {
      try {
        stores.shopStore.state.partyLevel = shop.partyLevel ?? bundle.partyLevel ?? 5
        stores.shopStore.state.shopType = shop.shopType ?? 'general'
        stores.shopStore.state.settlement = shop.settlement ?? 'city'
        stores.shopStore.state.customName = shop.name
        stores.shopStore.generateShop()
        result.shops++
      } catch (e) {
        result.warnings.push({
          section: 'shops',
          message: `Failed to generate shop "${shop.name}": ${(e as Error).message}`,
        })
      }
    }
  }

  result.success = result.warnings.filter(w => !w.message.includes('skipped')).length === 0 ||
    (result.creatures + result.hazards + result.parties + result.encounters +
     result.hackingSessions + result.starshipScenes + result.shops) > 0

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
} {
  return {
    creatures: bundle.creatures?.length ?? 0,
    hazards: bundle.hazards?.length ?? 0,
    party: bundle.party?.name ?? null,
    encounters: bundle.encounters?.map(e => e.name) ?? [],
    hacking: bundle.hacking?.map(h => h.name) ?? [],
    starship: bundle.starship?.map(s => s.name) ?? [],
    shops: bundle.shops?.map(s => s.name) ?? [],
  }
}
