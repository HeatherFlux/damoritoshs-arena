import { reactive, computed, watch } from 'vue'
import type { Party, Player } from '../types/party'
import { generateId } from '../types/party'
import { parsePathbuilderJSON } from '../utils/pathbuilderImport'

const STORAGE_KEY = 'sf2e-parties'

interface PartyState {
  parties: Party[]
  activePartyId: string | null
}

function loadFromStorage(): Partial<PartyState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert date strings back to Date objects
      if (parsed.parties) {
        parsed.parties = parsed.parties.map((p: Party) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }))
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load parties from storage:', e)
  }
  return {}
}

function saveToStorage(state: PartyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save parties:', e)
  }
}

// Initialize state
const savedState = loadFromStorage()
const state = reactive<PartyState>({
  parties: savedState.parties ?? [],
  activePartyId: savedState.activePartyId ?? null,
})

// Auto-save on changes
watch(
  () => ({ parties: state.parties, activePartyId: state.activePartyId }),
  (newVal) => saveToStorage(newVal),
  { deep: true }
)

// Computed values
const activeParty = computed(() =>
  state.parties.find(p => p.id === state.activePartyId)
)

// Party level (average of player levels, or 1 if no players)
const partyLevel = computed(() => {
  const players = activeParty.value?.players ?? []
  if (players.length === 0) return 1
  const totalLevel = players.reduce((sum, p) => sum + (p.level || 1), 0)
  return Math.round(totalLevel / players.length)
})

// Party size (number of players)
const partySize = computed(() => {
  return activeParty.value?.players?.length ?? 4
})

// Party Actions
function createParty(name: string = 'New Party'): Party {
  const now = new Date()
  const party: Party = {
    id: generateId(),
    name,
    players: [],
    createdAt: now,
    updatedAt: now,
  }
  state.parties.push(party)
  state.activePartyId = party.id
  return party
}

function deleteParty(id: string) {
  const index = state.parties.findIndex(p => p.id === id)
  if (index !== -1) {
    state.parties.splice(index, 1)
    if (state.activePartyId === id) {
      state.activePartyId = state.parties[0]?.id ?? null
    }
  }
}

function setActiveParty(id: string | null) {
  state.activePartyId = id
}

function updatePartyName(id: string, name: string) {
  const party = state.parties.find(p => p.id === id)
  if (party) {
    party.name = name
    party.updatedAt = new Date()
  }
}

// Player Actions
function addPlayer(player: Omit<Player, 'id'>): Player | null {
  const party = activeParty.value
  if (!party) return null

  const newPlayer: Player = {
    id: generateId(),
    ...player,
  }
  party.players.push(newPlayer)
  party.updatedAt = new Date()
  return newPlayer
}

function removePlayer(playerId: string) {
  const party = activeParty.value
  if (!party) return

  const index = party.players.findIndex(p => p.id === playerId)
  if (index !== -1) {
    party.players.splice(index, 1)
    party.updatedAt = new Date()
  }
}

function updatePlayer(playerId: string, updates: Partial<Player>) {
  const party = activeParty.value
  if (!party) return

  const player = party.players.find(p => p.id === playerId)
  if (player) {
    Object.assign(player, updates)
    party.updatedAt = new Date()
  }
}

function importPlayerFromPathbuilder(json: string): { success: boolean; player?: Player; error?: string } {
  const party = activeParty.value
  if (!party) {
    return { success: false, error: 'No active party selected' }
  }

  const result = parsePathbuilderJSON(json)
  if (!result.success || !result.combatant) {
    return { success: false, error: result.errors?.[0] || 'Failed to parse Pathbuilder data' }
  }

  const combatant = result.combatant
  const newPlayer: Player = {
    id: generateId(),
    name: combatant.name,
    maxHP: combatant.maxHP,
    ac: combatant.ac,
    level: combatant.level,
    class: combatant.class,
    ancestry: combatant.ancestry,
    perception: combatant.perception,
    fortitude: combatant.fortitude,
    reflex: combatant.reflex,
    will: combatant.will,
    pathbuilderData: json, // Store for potential re-import
  }

  party.players.push(newPlayer)
  party.updatedAt = new Date()

  return { success: true, player: newPlayer }
}

// Get all players from active party for adding to encounters
function getPartyPlayers(): Player[] {
  return activeParty.value?.players ?? []
}

export const usePartyStore = () => ({
  // State
  state,

  // Computed
  activeParty,
  partyLevel,
  partySize,

  // Party Actions
  createParty,
  deleteParty,
  setActiveParty,
  updatePartyName,

  // Player Actions
  addPlayer,
  removePlayer,
  updatePlayer,
  importPlayerFromPathbuilder,
  getPartyPlayers,
})
