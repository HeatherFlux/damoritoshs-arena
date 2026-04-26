import { reactive, computed } from 'vue'
import type { Creature, CreatureAdjustment } from '../types/creature'
import type { Hazard } from '../types/hazard'
import type { Combat, Combatant } from '../types/combat'
import { getAdjustedHP, getAdjustedAC } from '../types/combat'
import { parsePathbuilderJSON, type ImportResult } from '../utils/pathbuilderImport'
import { sendTurnChange } from '../utils/discordIntegration'
import { createSyncTransport, isWebSocketSupported, isSyncAvailable, type SyncMessage, type ConnectionState } from '../utils/syncTransport'

const STORAGE_KEY = 'sf2e-combat'
const SYNC_CHANNEL = 'sf2e-combat-sync'

// Types for player view data (no HP or stats exposed)
export interface CombatPlayerData {
  combatants: {
    name: string
    conditions: { name: string; value?: number }[]
    isDead: boolean
    isPlayer: boolean
    isActive: boolean
  }[]
  round: number
  turn: number
  combatName: string
  isActive: boolean
}

// BroadcastChannel for same-device sync
let channel: BroadcastChannel | null = null

function initChannel() {
  if (channel) return
  try {
    channel = new BroadcastChannel(SYNC_CHANNEL)
    channel.onmessage = (event) => {
      if (event.data?.type === 'combat-state' && !isGMView) {
        playerViewData.value = event.data.payload as CombatPlayerData
      }
      // GM responds to state requests from player views
      if (event.data?.type === 'request-state' && isGMView) {
        broadcastCombatState()
      }
    }
  } catch (e) {
    // BroadcastChannel not supported
  }
}

/**
 * Build sanitized player data from a Combat object (no HP/AC exposed).
 * Used both for broadcasting and for localStorage fallback.
 */
function buildPlayerData(combat: Combat | null): CombatPlayerData {
  if (!combat) {
    return { combatants: [], round: 0, turn: 0, combatName: '', isActive: false }
  }
  const sorted = [...combat.combatants].sort((a, b) => b.initiative - a.initiative)
  return {
    combatants: sorted.map(c => ({
      name: c.name,
      conditions: c.conditions.map(cond => ({ name: cond.name, value: cond.value })),
      isDead: c.isDead,
      isPlayer: c.isPlayer,
      isActive: c.isActive,
    })),
    round: combat.round,
    turn: combat.turn,
    combatName: combat.name,
    isActive: combat.isActive,
  }
}

/**
 * Request current state from GM tab (called by player view on mount).
 * Also loads from localStorage as an immediate fallback.
 */
function requestStateFromGM() {
  // Immediate fallback: load sanitized state from localStorage
  // This means the player view works even if the GM tab is closed
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const combat = JSON.parse(saved) as Combat
      combat.createdAt = new Date(combat.createdAt)
      playerViewData.value = buildPlayerData(combat)
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Then request fresh state from GM tab via BroadcastChannel
  if (!channel) initChannel()
  if (channel) {
    channel.postMessage({ type: 'request-state' })
  }
}

// ============================================
// WebSocket sync for cross-device player view
// ============================================

let wsTransport: ReturnType<typeof createSyncTransport> | null = null
let combatSessionId: string = ''
let stateRetryTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const remoteSyncState = reactive({
  enabled: false,
  connectionState: 'disconnected' as ConnectionState,
})

function getCombatSessionId(): string {
  if (!combatSessionId) {
    // Check URL first (for player views)
    const hash = window.location.hash
    const match = hash.match(/[?&]session=([^&]+)/)
    if (match) {
      combatSessionId = match[1]
    } else {
      combatSessionId = Math.random().toString(36).substring(2, 10)
    }
  }
  return combatSessionId
}

function handleRemoteCombatMessage(message: SyncMessage) {
  if (message.type === 'combat-state' && !isGMView) {
    playerViewData.value = message.payload as CombatPlayerData
    // State received — stop retrying
    if (stateRetryTimer) {
      clearInterval(stateRetryTimer)
      stateRetryTimer = null
    }
  }
  // GM responds to remote state requests
  if (message.type === 'request-state' && isGMView) {
    broadcastCombatState()
  }
}

async function enableCombatRemoteSync(): Promise<boolean> {
  if (!isWebSocketSupported()) return false

  try {
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteCombatMessage
    wsTransport.onStateChange = (newState) => {
      remoteSyncState.connectionState = newState
    }

    await wsTransport.connect(getCombatSessionId(), 'gm')
    remoteSyncState.enabled = true

    // Send current state to any connected players
    if (state.combat) {
      wsTransport.send({ type: 'combat-state', payload: buildPlayerData(state.combat) })
    }

    // Periodic heartbeat — re-send state every 30s for late joiners and resilience
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      if (wsTransport && remoteSyncState.enabled && state.combat) {
        wsTransport.send({ type: 'combat-state', payload: buildPlayerData(state.combat) })
      }
    }, 30000)

    return true
  } catch (e) {
    console.error('[Combat] Failed to enable remote sync:', e)
    remoteSyncState.enabled = false
    remoteSyncState.connectionState = 'error'
    return false
  }
}

async function joinCombatRemoteSession(sessionId: string): Promise<boolean> {
  if (!isWebSocketSupported()) return false

  try {
    combatSessionId = sessionId
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteCombatMessage
    wsTransport.onStateChange = (newState) => {
      remoteSyncState.connectionState = newState
    }

    await wsTransport.connect(sessionId, 'player')
    remoteSyncState.enabled = true

    // Request current state from GM, with retries
    wsTransport.send({ type: 'request-state', payload: null })
    let retries = 0
    const MAX_RETRIES = 3
    stateRetryTimer = setInterval(() => {
      retries++
      if (retries >= MAX_RETRIES || playerViewData.value) {
        if (stateRetryTimer) {
          clearInterval(stateRetryTimer)
          stateRetryTimer = null
        }
        return
      }
      if (wsTransport && remoteSyncState.enabled) {
        wsTransport.send({ type: 'request-state', payload: null })
      }
    }, 3000)
    return true
  } catch (e) {
    console.error('[Combat] Failed to join remote session:', e)
    remoteSyncState.enabled = false
    remoteSyncState.connectionState = 'error'
    return false
  }
}

function disableCombatRemoteSync() {
  if (wsTransport) {
    wsTransport.disconnect()
    wsTransport = null
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (stateRetryTimer) {
    clearInterval(stateRetryTimer)
    stateRetryTimer = null
  }
  remoteSyncState.enabled = false
  remoteSyncState.connectionState = 'disconnected'
}

function generateCombatShareUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname
  const sessionId = getCombatSessionId()
  return `${baseUrl}#/combat/view?session=${sessionId}&sync=ws`
}

function hasCombatRemoteSyncInUrl(): boolean {
  return window.location.hash.includes('sync=ws')
}

function getCombatSessionFromUrl(): string | null {
  const match = window.location.hash.match(/[?&]session=([^&]+)/)
  return match ? match[1] : null
}

function broadcastCombatState() {
  const payload = buildPlayerData(state.combat)

  // Send via BroadcastChannel (same-device tabs)
  if (!channel) initChannel()
  if (channel) {
    channel.postMessage({ type: 'combat-state', payload })
  }

  // Send via WebSocket (cross-device) — independent of BroadcastChannel
  if (wsTransport && remoteSyncState.enabled && isGMView) {
    wsTransport.send({ type: 'combat-state', payload })
  }
}

// Player view state
let isGMView = true
const playerViewData = reactive<{ value: CombatPlayerData | null }>({ value: null })

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function loadFromStorage(): Combat | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.createdAt = new Date(parsed.createdAt)
      return parsed
    }
  } catch (e) {
    console.error('Failed to load combat from storage:', e)
  }
  return null
}

function saveToStorage(combat: Combat | null) {
  try {
    if (combat) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combat))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    console.error('Failed to save combat:', e)
  }
}

interface CombatState {
  combat: Combat | null
}

const state = reactive<CombatState>({
  combat: loadFromStorage(),
})

// Computed
const sortedCombatants = computed(() => {
  if (!state.combat) return []
  return [...state.combat.combatants].sort((a, b) => b.initiative - a.initiative)
})

const currentCombatant = computed(() => {
  if (!state.combat || state.combat.combatants.length === 0) return null
  const sorted = sortedCombatants.value
  return sorted[state.combat.turn % sorted.length] || null
})

const nextCombatant = computed(() => {
  if (!state.combat || state.combat.combatants.length <= 1) return null
  const sorted = sortedCombatants.value
  const nextIndex = (state.combat.turn + 1) % sorted.length
  return sorted[nextIndex] || null
})

const aliveCombatants = computed(() => {
  return sortedCombatants.value.filter(c => !c.isDead)
})

// Actions
function startCombat(name: string = 'Combat'): Combat {
  const combat: Combat = {
    id: generateId(),
    name,
    round: 1,
    turn: 0,
    combatants: [],
    isActive: true,
    createdAt: new Date(),
  }
  state.combat = combat
  saveToStorage(combat)
  broadcastCombatState()
  return combat
}

function endCombat() {
  state.combat = null
  saveToStorage(null)
  broadcastCombatState()
}

function addPlayer(name: string, initiative: number, hp: number, ac: number): Combatant {
  if (!state.combat) startCombat()

  const combatant: Combatant = {
    id: generateId(),
    name,
    initiative,
    initiativeBonus: 0,
    currentHP: hp,
    maxHP: hp,
    tempHP: 0,
    ac,
    conditions: [],
    isPlayer: true,
    isActive: true,
    isDead: false,
    notes: '',
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  broadcastCombatState()
  return combatant
}

function addCreature(
  creature: Creature,
  adjustment: CreatureAdjustment = 'normal',
  customName?: string
): Combatant {
  if (!state.combat) startCombat()

  const maxHP = getAdjustedHP(creature.hp, adjustment, creature.level)
  const ac = getAdjustedAC(creature.ac, adjustment)

  // Check for duplicate names and add number suffix
  const baseName = customName || creature.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: creature.perception, // Default to perception for rolling
    initiativeBonus: creature.perception,
    currentHP: maxHP,
    maxHP,
    tempHP: 0,
    ac,
    conditions: [],
    isPlayer: false,
    isActive: true,
    isDead: false,
    notes: '',
    creature,
    adjustment,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  broadcastCombatState()
  return combatant
}

function addHazard(hazard: Hazard, customName?: string): Combatant {
  if (!state.combat) startCombat()

  // Check for duplicate names and add number suffix
  const baseName = customName || hazard.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: hazard.complexity === 'complex' ? 0 : -999, // Complex hazards roll, simple don't act
    initiativeBonus: 0,
    currentHP: hazard.hp || 0,
    maxHP: hazard.hp || 0,
    tempHP: 0,
    ac: hazard.ac || 10,
    conditions: [],
    isPlayer: false,
    isActive: hazard.complexity === 'complex', // Only complex hazards take turns
    isDead: false,
    notes: `${hazard.complexity.toUpperCase()} ${hazard.type.toUpperCase()}\nDisable: ${hazard.disable || 'N/A'}`,
    isHazard: true,
    hazard,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  broadcastCombatState()
  return combatant
}

function removeCombatant(id: string) {
  if (!state.combat) return

  const index = state.combat.combatants.findIndex(c => c.id === id)
  if (index === -1) return

  // Capture current combatant's ID before removal (using sorted view)
  const sorted = sortedCombatants.value
  const currentId = sorted[state.combat.turn]?.id

  state.combat.combatants.splice(index, 1)

  if (state.combat.combatants.length === 0) {
    state.combat.turn = 0
  } else if (id === currentId) {
    // Removed the active combatant — keep turn index, next-in-line takes over
    // Clamp to valid range in case we removed the last in sort order
    const newSorted = [...state.combat.combatants].sort((a, b) => b.initiative - a.initiative)
    if (state.combat.turn >= newSorted.length) {
      state.combat.turn = 0
    }
  } else {
    // Removed someone else — find where the current combatant ended up
    const newSorted = [...state.combat.combatants].sort((a, b) => b.initiative - a.initiative)
    const newIndex = newSorted.findIndex(c => c.id === currentId)
    state.combat.turn = newIndex !== -1 ? newIndex : 0
  }

  saveToStorage(state.combat)
  broadcastCombatState()
}

function setInitiative(id: string, initiative: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.initiative = initiative
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function rollInitiative(id: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    const roll = Math.floor(Math.random() * 20) + 1
    combatant.initiative = roll + combatant.initiativeBonus
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function rollAllInitiative() {
  if (!state.combat) return

  state.combat.combatants.forEach(combatant => {
    if (!combatant.isPlayer) {
      const roll = Math.floor(Math.random() * 20) + 1
      combatant.initiative = roll + combatant.initiativeBonus
    }
  })
  saveToStorage(state.combat)
  broadcastCombatState()
}

function nextTurn() {
  if (!state.combat || state.combat.combatants.length === 0) return

  const sorted = sortedCombatants.value
  let nextIndex = (state.combat.turn + 1) % sorted.length

  // Skip dead combatants (but allow landing on dead if all are dead)
  let attempts = 0
  while (sorted[nextIndex]?.isDead && attempts < sorted.length - 1) {
    nextIndex = (nextIndex + 1) % sorted.length
    attempts++
  }

  // Check if we've wrapped around (new round)
  if (nextIndex <= state.combat.turn || attempts >= sorted.length - 1) {
    state.combat.round++
  }

  state.combat.turn = nextIndex
  saveToStorage(state.combat)
  broadcastCombatState()

  // Send turn change to Discord
  const nextCombatant = sorted[nextIndex]
  if (nextCombatant) {
    sendTurnChange(nextCombatant.name, state.combat.round, nextCombatant.isPlayer)
  }
}

function previousTurn() {
  if (!state.combat || sortedCombatants.value.length === 0) return

  const sorted = sortedCombatants.value
  let prevIndex = state.combat.turn - 1
  let wrappedBack = false

  if (prevIndex < 0) {
    prevIndex = sorted.length - 1
    wrappedBack = true
  }

  // Skip dead combatants (but allow landing on dead if all are dead)
  let attempts = 0
  while (sorted[prevIndex]?.isDead && attempts < sorted.length - 1) {
    prevIndex--
    if (prevIndex < 0) {
      prevIndex = sorted.length - 1
      wrappedBack = true
    }
    attempts++
  }

  // Only decrement round once, and never below 1
  if (wrappedBack) {
    state.combat.round = Math.max(1, state.combat.round - 1)
  }

  state.combat.turn = prevIndex
  saveToStorage(state.combat)
  broadcastCombatState()
}

function setTurn(index: number) {
  if (!state.combat) return
  state.combat.turn = Math.max(0, Math.min(index, sortedCombatants.value.length - 1))
  saveToStorage(state.combat)
  broadcastCombatState()
}

function applyDamage(id: string, damage: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  // Damage temp HP first
  if (combatant.tempHP > 0) {
    const tempDamage = Math.min(damage, combatant.tempHP)
    combatant.tempHP -= tempDamage
    damage -= tempDamage
  }

  combatant.currentHP = Math.max(0, combatant.currentHP - damage)

  // Check for death
  if (combatant.currentHP <= 0) {
    combatant.isDead = true
  }

  saveToStorage(state.combat)
  broadcastCombatState()
}

function applyHealing(id: string, healing: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + healing)

  // Revive if healed from 0
  if (combatant.currentHP > 0 && combatant.isDead) {
    combatant.isDead = false
  }

  saveToStorage(state.combat)
  broadcastCombatState()
}

function setHP(id: string, hp: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  combatant.currentHP = Math.max(0, Math.min(combatant.maxHP, hp))
  combatant.isDead = combatant.currentHP <= 0

  saveToStorage(state.combat)
  broadcastCombatState()
}

function setTempHP(id: string, tempHP: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.tempHP = Math.max(0, tempHP)
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function setMaxHP(id: string, maxHP: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.maxHP = Math.max(1, maxHP)
    combatant.currentHP = Math.min(combatant.currentHP, combatant.maxHP)
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function addCondition(id: string, condition: string, value?: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  // Check if condition already exists
  const existing = combatant.conditions.find(c => c.name === condition)
  if (existing) {
    existing.value = value
  } else {
    combatant.conditions.push({ name: condition, value })
  }

  saveToStorage(state.combat)
  broadcastCombatState()
}

function removeCondition(id: string, condition: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  const index = combatant.conditions.findIndex(c => c.name === condition)
  if (index !== -1) {
    combatant.conditions.splice(index, 1)
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function updateConditionValue(id: string, condition: string, value: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  const cond = combatant.conditions.find(c => c.name === condition)
  if (cond) {
    if (value <= 0) {
      removeCondition(id, condition)
    } else {
      cond.value = Math.min(value, 10)
      saveToStorage(state.combat)
    }
  }
}

function setNotes(id: string, notes: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.notes = notes
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function toggleDead(id: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.isDead = !combatant.isDead
    if (combatant.isDead) {
      combatant.currentHP = 0
    }
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

function updateCombatantName(id: string, name: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.name = name
    saveToStorage(state.combat)
    broadcastCombatState()
  }
}

/**
 * Import a player character from Pathbuilder JSON export
 */
function importPlayerFromPathbuilder(json: string): ImportResult {
  const result = parsePathbuilderJSON(json)

  if (!result.success || !result.combatant) {
    return result
  }

  // Start combat if needed
  if (!state.combat) startCombat()

  // Check for duplicate names
  const baseName = result.combatant.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  // Create the combatant with extended player stats
  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: result.combatant.perception || 0, // Use perception for initiative
    initiativeBonus: result.combatant.perception || 0,
    currentHP: result.combatant.currentHP,
    maxHP: result.combatant.maxHP,
    tempHP: 0,
    ac: result.combatant.ac,
    conditions: [],
    isPlayer: true,
    isActive: true,
    isDead: false,
    notes: '',
    // Extended stats
    level: result.combatant.level,
    class: result.combatant.class,
    ancestry: result.combatant.ancestry,
    perception: result.combatant.perception,
    fortitude: result.combatant.fortitude,
    reflex: result.combatant.reflex,
    will: result.combatant.will,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  broadcastCombatState()

  // Return result with the created combatant
  return {
    ...result,
    combatant: combatant,
  }
}

function clearAndStartCombat(name: string = 'Combat'): Combat {
  // End existing combat and start fresh
  state.combat = null
  return startCombat(name)
}

function setGMView(isGM: boolean) {
  isGMView = isGM
  initChannel()
}

function ensureChannel() {
  initChannel()
}

function openPlayerView() {
  broadcastCombatState()
  window.open(`${window.location.pathname}#/combat/view`, '_blank')
}

export const useCombatStore = () => ({
  state,
  sortedCombatants,
  currentCombatant,
  nextCombatant,
  aliveCombatants,
  playerViewData,

  startCombat,
  endCombat,
  clearAndStartCombat,
  addPlayer,
  addCreature,
  addHazard,
  removeCombatant,
  setInitiative,
  rollInitiative,
  rollAllInitiative,
  nextTurn,
  previousTurn,
  setTurn,
  applyDamage,
  applyHealing,
  setHP,
  setTempHP,
  setMaxHP,
  addCondition,
  removeCondition,
  updateConditionValue,
  setNotes,
  toggleDead,
  updateCombatantName,
  importPlayerFromPathbuilder,
  setGMView,
  ensureChannel,
  openPlayerView,
  broadcastCombatState,
  requestStateFromGM,

  // Remote sync (cross-device)
  remoteSyncState,
  enableCombatRemoteSync,
  joinCombatRemoteSession,
  disableCombatRemoteSync,
  generateCombatShareUrl,
  hasCombatRemoteSyncInUrl,
  getCombatSessionFromUrl,
  isSyncAvailable: isSyncAvailable,
})
