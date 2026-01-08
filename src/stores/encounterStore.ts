import { reactive, computed, watch } from 'vue'
import type { Creature, Encounter, CreatureAdjustment, EncounterHazard } from '../types/creature'
import type { Hazard } from '../types/hazard'
import { calculateEncounterXP, type EncounterXPResult } from '../types/encounter'
import { usePartyStore } from './partyStore'

// Import bundled creature data (pre-fetched from AoN)
import bundledCreatures from '../data/creatures.json'
import { HAZARDS } from '../data/hazards'

const STORAGE_KEY = 'sf2e-encounters'
const CREATURES_STORAGE_KEY = 'sf2e-custom-creatures'

// Load custom creatures from localStorage
function loadCustomCreatures(): Creature[] {
  try {
    const saved = localStorage.getItem(CREATURES_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to load custom creatures:', e)
  }
  return []
}

function saveCustomCreatures(creatures: Creature[]) {
  try {
    localStorage.setItem(CREATURES_STORAGE_KEY, JSON.stringify(creatures))
  } catch (e) {
    console.error('Failed to save custom creatures:', e)
  }
}

interface EncounterState {
  creatures: Creature[]
  hazards: Hazard[]
  encounters: Encounter[]
  activeEncounterId: string | null
  partyLevel: number
  partySize: number
  useManualOverride: boolean  // When true, use partyLevel/partySize instead of party store
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function loadFromStorage(): Partial<EncounterState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert date strings back to Date objects
      if (parsed.encounters) {
        parsed.encounters = parsed.encounters.map((e: any) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        }))
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load encounters from storage:', e)
  }
  return {}
}

function saveToStorage(state: Pick<EncounterState, 'encounters' | 'partyLevel' | 'partySize' | 'useManualOverride'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      encounters: state.encounters,
      partyLevel: state.partyLevel,
      partySize: state.partySize,
      useManualOverride: state.useManualOverride,
    }))
  } catch (e) {
    console.error('Failed to save encounters:', e)
  }
}

// Initialize state with bundled + custom creatures
const savedState = loadFromStorage()
const customCreatures = loadCustomCreatures()

const state = reactive<EncounterState>({
  creatures: [
    ...(bundledCreatures as unknown as Creature[]),
    ...customCreatures,
  ],
  hazards: HAZARDS,
  encounters: savedState.encounters ?? [],
  activeEncounterId: null,
  partyLevel: savedState.partyLevel ?? 1,
  partySize: savedState.partySize ?? 4,
  useManualOverride: savedState.useManualOverride ?? false,
})

// Auto-save on changes
watch(
  () => ({
    encounters: state.encounters,
    partyLevel: state.partyLevel,
    partySize: state.partySize,
    useManualOverride: state.useManualOverride
  }),
  (newVal) => saveToStorage(newVal),
  { deep: true }
)

// Computed values
const activeEncounter = computed(() =>
  state.encounters.find(e => e.id === state.activeEncounterId)
)

// Get party info from party store
const partyStore = usePartyStore()

// Determine effective party level/size (use manual override or party store)
const effectivePartyLevel = computed(() => {
  // Use manual values if: override enabled OR no active party OR party has no players
  const partyPlayers = partyStore.activeParty.value?.players
  const hasPartyPlayers = partyPlayers && partyPlayers.length > 0
  if (state.useManualOverride || !hasPartyPlayers) {
    return state.partyLevel
  }
  return partyStore.partyLevel.value
})

const effectivePartySize = computed(() => {
  const partyPlayers = partyStore.activeParty.value?.players
  const hasPartyPlayers = partyPlayers && partyPlayers.length > 0
  if (state.useManualOverride || !hasPartyPlayers) {
    return state.partySize
  }
  return partyStore.partySize.value
})

const encounterXP = computed((): EncounterXPResult | null => {
  const encounter = activeEncounter.value
  if (!encounter) return null
  return calculateEncounterXP(
    encounter.creatures,
    effectivePartyLevel.value,
    effectivePartySize.value,
    encounter.hazards ?? []
  )
})

// Convenience computed values for status bar
const totalXP = computed(() => encounterXP.value?.totalXP ?? 0)
const difficulty = computed(() => encounterXP.value?.difficulty ?? 'trivial')

// Actions
function createEncounter(name: string = 'New Encounter'): Encounter {
  const now = new Date()
  const encounter: Encounter = {
    id: generateId(),
    name,
    creatures: [],
    hazards: [],
    partyLevel: state.partyLevel,
    partySize: state.partySize,
    createdAt: now,
    updatedAt: now,
  }
  state.encounters.push(encounter)
  state.activeEncounterId = encounter.id
  return encounter
}

function deleteEncounter(id: string) {
  const index = state.encounters.findIndex(e => e.id === id)
  if (index !== -1) {
    state.encounters.splice(index, 1)
    if (state.activeEncounterId === id) {
      state.activeEncounterId = state.encounters[0]?.id ?? null
    }
  }
}

function setActiveEncounter(id: string | null) {
  state.activeEncounterId = id
}

function addCreatureToEncounter(creature: Creature, adjustment: CreatureAdjustment = 'normal') {
  const encounter = activeEncounter.value
  if (!encounter) return

  const existing = encounter.creatures.find(
    ec => ec.creature.id === creature.id && ec.adjustment === adjustment
  )

  if (existing) {
    existing.count++
  } else {
    encounter.creatures.push({
      creature,
      count: 1,
      adjustment,
    })
  }
  encounter.updatedAt = new Date()
}

function removeCreatureFromEncounter(creatureId: string, adjustment: CreatureAdjustment) {
  const encounter = activeEncounter.value
  if (!encounter) return

  const index = encounter.creatures.findIndex(
    ec => ec.creature.id === creatureId && ec.adjustment === adjustment
  )

  if (index !== -1) {
    if (encounter.creatures[index].count > 1) {
      encounter.creatures[index].count--
    } else {
      encounter.creatures.splice(index, 1)
    }
    encounter.updatedAt = new Date()
  }
}

function updateCreatureCount(creatureId: string, adjustment: CreatureAdjustment, count: number) {
  const encounter = activeEncounter.value
  if (!encounter) return

  const ec = encounter.creatures.find(
    ec => ec.creature.id === creatureId && ec.adjustment === adjustment
  )

  if (ec) {
    if (count <= 0) {
      removeCreatureFromEncounter(creatureId, adjustment)
    } else {
      ec.count = count
      encounter.updatedAt = new Date()
    }
  }
}

function updateCreatureAdjustment(creatureId: string, oldAdjustment: CreatureAdjustment, newAdjustment: CreatureAdjustment) {
  const encounter = activeEncounter.value
  if (!encounter) return

  const ec = encounter.creatures.find(
    ec => ec.creature.id === creatureId && ec.adjustment === oldAdjustment
  )

  if (ec) {
    ec.adjustment = newAdjustment
    encounter.updatedAt = new Date()
  }
}

function updateEncounterName(id: string, name: string) {
  const encounter = state.encounters.find(e => e.id === id)
  if (encounter) {
    encounter.name = name
    encounter.updatedAt = new Date()
  }
}

// Hazard management
function addHazardToEncounter(hazard: Hazard) {
  const encounter = activeEncounter.value
  if (!encounter) return

  // Initialize hazards array if needed
  if (!encounter.hazards) {
    encounter.hazards = []
  }

  const existing = encounter.hazards.find((eh: EncounterHazard) => eh.hazard.id === hazard.id)

  if (existing) {
    existing.count++
  } else {
    encounter.hazards.push({
      hazard,
      count: 1,
    })
  }
  encounter.updatedAt = new Date()
}

function removeHazardFromEncounter(hazardId: string) {
  const encounter = activeEncounter.value
  if (!encounter || !encounter.hazards) return

  const index = encounter.hazards.findIndex((eh: EncounterHazard) => eh.hazard.id === hazardId)

  if (index !== -1) {
    if (encounter.hazards[index].count > 1) {
      encounter.hazards[index].count--
    } else {
      encounter.hazards.splice(index, 1)
    }
    encounter.updatedAt = new Date()
  }
}

function updateHazardCount(hazardId: string, count: number) {
  const encounter = activeEncounter.value
  if (!encounter || !encounter.hazards) return

  const eh = encounter.hazards.find((h: EncounterHazard) => h.hazard.id === hazardId)

  if (eh) {
    if (count <= 0) {
      removeHazardFromEncounter(hazardId)
    } else {
      eh.count = count
      encounter.updatedAt = new Date()
    }
  }
}

function setPartyLevel(level: number) {
  state.partyLevel = Math.max(1, Math.min(20, level))
}

function setPartySize(size: number) {
  state.partySize = Math.max(1, Math.min(12, size))
}

function setManualOverride(enabled: boolean) {
  state.useManualOverride = enabled
}

function exportEncounters(): string {
  return JSON.stringify(state.encounters, null, 2)
}

function importEncounters(json: string) {
  try {
    const imported = JSON.parse(json) as Encounter[]
    imported.forEach(e => {
      e.createdAt = new Date(e.createdAt)
      e.updatedAt = new Date(e.updatedAt)
      if (!state.encounters.find(ex => ex.id === e.id)) {
        state.encounters.push(e)
      }
    })
  } catch (e) {
    console.error('Failed to import encounters:', e)
    throw new Error('Invalid encounter data')
  }
}

function clearAllEncounters() {
  state.encounters = []
  state.activeEncounterId = null
  localStorage.removeItem(STORAGE_KEY)
}

// Custom creature management
function addCustomCreature(creature: Creature): void {
  // Generate a unique ID if not provided
  if (!creature.id) {
    creature.id = `custom-${generateId()}`
  }

  // Check for duplicate
  const existingIds = new Set(state.creatures.map(c => c.id))
  if (existingIds.has(creature.id)) {
    // Regenerate ID if duplicate
    creature.id = `custom-${generateId()}`
  }

  // Add to creatures list
  state.creatures.push(creature)

  // Save custom creatures
  const bundledIds = new Set((bundledCreatures as unknown as Creature[]).map(c => c.id))
  const customOnly = state.creatures.filter(c => !bundledIds.has(c.id))
  saveCustomCreatures(customOnly)
}

function importCustomCreatures(json: string): number {
  try {
    const imported = JSON.parse(json) as Creature[]
    if (!Array.isArray(imported)) throw new Error('Invalid format')

    const existingIds = new Set(state.creatures.map(c => c.id))
    const newCreatures = imported.filter(c => !existingIds.has(c.id))

    if (newCreatures.length > 0) {
      state.creatures.push(...newCreatures)
      // Save custom creatures (filter out bundled ones)
      const bundledIds = new Set((bundledCreatures as unknown as Creature[]).map(c => c.id))
      const customOnly = state.creatures.filter(c => !bundledIds.has(c.id))
      saveCustomCreatures(customOnly)
    }

    return newCreatures.length
  } catch (e) {
    console.error('Failed to import creatures:', e)
    throw new Error('Invalid creature data')
  }
}

function exportCustomCreatures(): string {
  const bundledIds = new Set((bundledCreatures as unknown as Creature[]).map(c => c.id))
  const customOnly = state.creatures.filter(c => !bundledIds.has(c.id))
  return JSON.stringify(customOnly, null, 2)
}

function clearCustomCreatures() {
  const bundledIds = new Set((bundledCreatures as unknown as Creature[]).map(c => c.id))
  state.creatures = state.creatures.filter(c => bundledIds.has(c.id))
  localStorage.removeItem(CREATURES_STORAGE_KEY)
}

function getCreatureStats() {
  const bundledIds = new Set((bundledCreatures as unknown as Creature[]).map(c => c.id))
  const bundledCount = state.creatures.filter(c => bundledIds.has(c.id)).length
  const customCount = state.creatures.length - bundledCount
  return { total: state.creatures.length, bundled: bundledCount, custom: customCount }
}

export const useEncounterStore = () => ({
  // State
  state,

  // Computed
  activeEncounter,
  encounterXP,
  totalXP,
  difficulty,
  effectivePartyLevel,
  effectivePartySize,

  // Creature Actions
  createEncounter,
  deleteEncounter,
  setActiveEncounter,
  addCreatureToEncounter,
  removeCreatureFromEncounter,
  updateCreatureCount,
  updateCreatureAdjustment,
  updateEncounterName,

  // Hazard Actions
  addHazardToEncounter,
  removeHazardFromEncounter,
  updateHazardCount,

  // Party Settings
  setPartyLevel,
  setPartySize,
  setManualOverride,

  // Import/Export
  exportEncounters,
  importEncounters,
  clearAllEncounters,

  // Creature management
  addCustomCreature,
  importCustomCreatures,
  exportCustomCreatures,
  clearCustomCreatures,
  getCreatureStats,
})
