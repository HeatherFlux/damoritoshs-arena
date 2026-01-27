import { reactive, watch } from 'vue'
import type {
  StarshipState,
  StarshipScene,
  SavedScene,
  Starship,
  StarshipThreat,
  StarshipRole,
  RoleAssignment,
  ActionLogEntry,
  StarshipSyncMessage,
  StarshipSyncMessageType
} from '../types/starship'
import {
  createDefaultThreat,
  createSceneFromSaved,
  createEmptySavedScene
} from '../types/starship'

// Storage keys
const STORAGE_KEY = 'sf2e-starship'
const CUSTOM_ROLES_KEY = 'sf2e-custom-roles'

// Generate or retrieve session ID for channel isolation
function getSessionId(): string {
  // Check URL first (for player views)
  const hash = window.location.hash
  const sessionMatch = hash.match(/[?&]session=([^&]+)/)
  if (sessionMatch) {
    return sessionMatch[1]
  }

  // Check sessionStorage (persists per tab)
  let sessionId = sessionStorage.getItem('sf2e-starship-session')
  if (!sessionId) {
    sessionId = crypto.randomUUID().slice(0, 8)
    sessionStorage.setItem('sf2e-starship-session', sessionId)
  }
  return sessionId
}

// Create reactive state
const state = reactive<StarshipState>({
  savedScenes: [],
  activeScene: null,
  customRoles: [],
  editingStarship: null,
  sessionId: '',
  isGMView: true,
  showPlayerView: false
})

// BroadcastChannel for cross-tab sync
let channel: BroadcastChannel | null = null
let currentChannelSession: string | null = null

function initChannel() {
  if (typeof BroadcastChannel === 'undefined') return

  // If channel exists but session changed, close old channel
  if (channel && currentChannelSession !== state.sessionId) {
    channel.close()
    channel = null
  }

  if (!channel && state.sessionId) {
    const channelName = `sf2e-starship-${state.sessionId}`
    console.log('[Starship] Opening channel:', channelName)
    channel = new BroadcastChannel(channelName)
    currentChannelSession = state.sessionId

    channel.onmessage = (event) => {
      const message = event.data as StarshipSyncMessage
      console.log('[Starship] Received:', message.type)
      handleSyncMessage(message)
    }
  }
}

function broadcast(type: StarshipSyncMessageType, payload: unknown) {
  if (channel && state.isGMView) {
    const message: StarshipSyncMessage = {
      type,
      payload,
      timestamp: Date.now()
    }
    console.log('[Starship] Broadcasting:', type)
    channel.postMessage(message)
  }
}

function handleSyncMessage(message: StarshipSyncMessage) {
  // Only players receive sync messages
  if (state.isGMView) return

  switch (message.type) {
    case 'scene-update':
      state.activeScene = message.payload as StarshipScene
      break
    case 'starship-update':
      if (state.activeScene) {
        state.activeScene.starship = message.payload as Starship
      }
      break
    case 'threat-update': {
      if (state.activeScene) {
        const updatedThreat = message.payload as StarshipThreat
        const idx = state.activeScene.threats.findIndex(t => t.id === updatedThreat.id)
        if (idx !== -1) {
          state.activeScene.threats[idx] = updatedThreat
        }
      }
      break
    }
    case 'round-change':
      if (state.activeScene) {
        state.activeScene.currentRound = message.payload as number
      }
      break
    case 'vp-change':
      if (state.activeScene) {
        state.activeScene.currentVP = message.payload as number
      }
      break
    case 'action-log':
      if (state.activeScene) {
        state.activeScene.actionLog.push(message.payload as ActionLogEntry)
      }
      break
    case 'role-assignment':
      if (state.activeScene) {
        state.activeScene.roles = message.payload as RoleAssignment[]
      }
      break
  }
}

// ============ Scene Management ============

function saveScene(scene?: Partial<SavedScene>): SavedScene {
  const newScene: SavedScene = {
    ...createEmptySavedScene(),
    ...scene,
    savedAt: Date.now()
  }

  // Check if updating existing
  const existingIdx = state.savedScenes.findIndex(s => s.id === newScene.id)
  if (existingIdx !== -1) {
    state.savedScenes[existingIdx] = newScene
  } else {
    state.savedScenes.push(newScene)
  }

  saveToLocalStorage()
  return newScene
}

function loadScene(sceneId: string): StarshipScene | null {
  const saved = state.savedScenes.find(s => s.id === sceneId)
  if (!saved) return null

  state.activeScene = createSceneFromSaved(saved)
  broadcast('scene-update', state.activeScene)
  return state.activeScene
}

function deleteScene(sceneId: string) {
  const idx = state.savedScenes.findIndex(s => s.id === sceneId)
  if (idx !== -1) {
    state.savedScenes.splice(idx, 1)
    saveToLocalStorage()
  }
}

function startScene(saved: SavedScene): StarshipScene {
  state.activeScene = createSceneFromSaved(saved)
  broadcast('scene-update', state.activeScene)
  saveToLocalStorage()
  return state.activeScene
}

function endScene() {
  state.activeScene = null
  broadcast('scene-update', null)
  saveToLocalStorage()
}

// ============ Starship Management ============

function updateStarship(updates: Partial<Starship>) {
  if (!state.activeScene) return

  state.activeScene.starship = {
    ...state.activeScene.starship,
    ...updates
  }
  broadcast('starship-update', state.activeScene.starship)
  saveToLocalStorage()
}

function damageStarship(damage: number) {
  if (!state.activeScene) return

  const ship = state.activeScene.starship
  let remaining = damage

  // Apply to shields first
  if (ship.currentShields > 0) {
    const shieldDamage = Math.min(ship.currentShields, remaining)
    ship.currentShields -= shieldDamage
    remaining -= shieldDamage
  }

  // Apply remaining to HP
  if (remaining > 0) {
    ship.currentHP = Math.max(0, ship.currentHP - remaining)
  }

  broadcast('starship-update', ship)
  saveToLocalStorage()
}

function healStarship(amount: number) {
  if (!state.activeScene) return

  const ship = state.activeScene.starship
  ship.currentHP = Math.min(ship.maxHP, ship.currentHP + amount)
  broadcast('starship-update', ship)
  saveToLocalStorage()
}

function regenerateShields() {
  if (!state.activeScene) return

  const ship = state.activeScene.starship
  ship.currentShields = Math.min(ship.maxShields, ship.currentShields + ship.shieldRegen)
  broadcast('starship-update', ship)
  saveToLocalStorage()
}

function setShields(amount: number) {
  if (!state.activeScene) return

  const ship = state.activeScene.starship
  ship.currentShields = Math.max(0, Math.min(ship.maxShields, amount))
  broadcast('starship-update', ship)
  saveToLocalStorage()
}

// ============ Threat Management ============

function addThreat(threat?: Partial<StarshipThreat>) {
  if (!state.activeScene) return

  const newThreat: StarshipThreat = {
    ...createDefaultThreat(),
    ...threat
  }
  state.activeScene.threats.push(newThreat)
  broadcast('scene-update', state.activeScene)
  saveToLocalStorage()
  return newThreat
}

function updateThreat(threatId: string, updates: Partial<StarshipThreat>) {
  if (!state.activeScene) return

  const idx = state.activeScene.threats.findIndex(t => t.id === threatId)
  if (idx !== -1) {
    state.activeScene.threats[idx] = {
      ...state.activeScene.threats[idx],
      ...updates
    }
    broadcast('threat-update', state.activeScene.threats[idx])
    saveToLocalStorage()
  }
}

function damageThreat(threatId: string, damage: number) {
  if (!state.activeScene) return

  const threat = state.activeScene.threats.find(t => t.id === threatId)
  if (threat && threat.currentHP !== undefined) {
    threat.currentHP = Math.max(0, threat.currentHP - damage)
    if (threat.currentHP === 0) {
      threat.isDefeated = true
    }
    broadcast('threat-update', threat)
    saveToLocalStorage()
  }
}

function removeThreat(threatId: string) {
  if (!state.activeScene) return

  const idx = state.activeScene.threats.findIndex(t => t.id === threatId)
  if (idx !== -1) {
    state.activeScene.threats.splice(idx, 1)
    broadcast('scene-update', state.activeScene)
    saveToLocalStorage()
  }
}

// ============ Round & VP Management ============

function advanceRound() {
  if (!state.activeScene) return

  state.activeScene.currentRound++
  // Auto-regenerate shields at start of round
  regenerateShields()
  broadcast('round-change', state.activeScene.currentRound)
  saveToLocalStorage()
}

function setRound(round: number) {
  if (!state.activeScene) return

  state.activeScene.currentRound = Math.max(1, round)
  broadcast('round-change', state.activeScene.currentRound)
  saveToLocalStorage()
}

function addVP(amount: number) {
  if (!state.activeScene) return

  state.activeScene.currentVP += amount
  broadcast('vp-change', state.activeScene.currentVP)
  saveToLocalStorage()
}

function setVP(amount: number) {
  if (!state.activeScene) return

  state.activeScene.currentVP = Math.max(0, amount)
  broadcast('vp-change', state.activeScene.currentVP)
  saveToLocalStorage()
}

// ============ Role Management ============

function assignRole(roleId: string, playerName: string, playerId?: string) {
  if (!state.activeScene) return

  const existingIdx = state.activeScene.roles.findIndex(r => r.roleId === roleId)
  const assignment: RoleAssignment = { roleId, playerName, playerId }

  if (existingIdx !== -1) {
    state.activeScene.roles[existingIdx] = assignment
  } else {
    state.activeScene.roles.push(assignment)
  }

  broadcast('role-assignment', state.activeScene.roles)
  saveToLocalStorage()
}

function unassignRole(roleId: string) {
  if (!state.activeScene) return

  const idx = state.activeScene.roles.findIndex(r => r.roleId === roleId)
  if (idx !== -1) {
    state.activeScene.roles.splice(idx, 1)
    broadcast('role-assignment', state.activeScene.roles)
    saveToLocalStorage()
  }
}

// ============ Custom Roles ============

function addCustomRole(role: StarshipRole) {
  const newRole: StarshipRole = {
    ...role,
    id: crypto.randomUUID(),
    type: 'custom',
    isCustom: true
  }
  state.customRoles.push(newRole)
  saveCustomRoles()
  return newRole
}

function updateCustomRole(roleId: string, updates: Partial<StarshipRole>) {
  const idx = state.customRoles.findIndex(r => r.id === roleId)
  if (idx !== -1) {
    state.customRoles[idx] = {
      ...state.customRoles[idx],
      ...updates
    }
    saveCustomRoles()
  }
}

function deleteCustomRole(roleId: string) {
  const idx = state.customRoles.findIndex(r => r.id === roleId)
  if (idx !== -1) {
    state.customRoles.splice(idx, 1)
    saveCustomRoles()
  }
}

// ============ Action Log ============

function logAction(
  roleId: string,
  playerName: string,
  actionName: string,
  result: ActionLogEntry['result'],
  description?: string
) {
  if (!state.activeScene) return

  const entry: ActionLogEntry = {
    id: crypto.randomUUID(),
    round: state.activeScene.currentRound,
    timestamp: Date.now(),
    roleId,
    playerName,
    actionName,
    result,
    description
  }

  state.activeScene.actionLog.push(entry)
  broadcast('action-log', entry)
  saveToLocalStorage()
  return entry
}

// ============ URL Sharing ============

function generateShareUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#/starship/view?session=${state.sessionId}`
}

function openPlayerView() {
  const url = generateShareUrl()
  console.log('[Starship] Opening player view:', url)
  window.open(url, '_blank', 'width=1920,height=1080')
}

// ============ Import/Export ============

function exportScenes(): string {
  return JSON.stringify(state.savedScenes, null, 2)
}

function importScenes(json: string) {
  try {
    const scenes = JSON.parse(json) as SavedScene[]
    if (!Array.isArray(scenes)) throw new Error('Invalid format')

    // Merge with existing, replacing by ID
    for (const scene of scenes) {
      const existingIdx = state.savedScenes.findIndex(s => s.id === scene.id)
      if (existingIdx !== -1) {
        state.savedScenes[existingIdx] = scene
      } else {
        state.savedScenes.push(scene)
      }
    }
    saveToLocalStorage()
  } catch (e) {
    console.error('[Starship] Import failed:', e)
    throw e
  }
}

// ============ Persistence ============

function saveToLocalStorage() {
  const data = {
    savedScenes: state.savedScenes,
    activeScene: state.activeScene
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.savedScenes) state.savedScenes = data.savedScenes
      if (data.activeScene) state.activeScene = data.activeScene
    } catch (e) {
      console.warn('[Starship] Failed to load saved state:', e)
    }
  }
}

function saveCustomRoles() {
  localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(state.customRoles))
}

function loadCustomRoles() {
  const saved = localStorage.getItem(CUSTOM_ROLES_KEY)
  if (saved) {
    try {
      state.customRoles = JSON.parse(saved)
    } catch (e) {
      console.warn('[Starship] Failed to load custom roles:', e)
      state.customRoles = []
    }
  }
}

// ============ View Management ============

function setGMView(isGM: boolean) {
  state.isGMView = isGM
}

function togglePlayerView() {
  state.showPlayerView = !state.showPlayerView
}

// ============ Initialization ============

let initialized = false

function init() {
  if (initialized) return
  initialized = true

  console.log('[Starship] ======== INIT START ========')
  console.log('[Starship] Current hash:', window.location.hash)

  // Set session ID first
  state.sessionId = getSessionId()
  console.log('[Starship] Session ID:', state.sessionId)

  initChannel()
  loadFromLocalStorage()
  loadCustomRoles()

  console.log('[Starship] ======== INIT COMPLETE ========')
}

// Allow reinitializing channel (for player view after URL parse)
function ensureChannel() {
  const urlSessionId = getSessionId()
  if (urlSessionId !== state.sessionId) {
    console.log('[Starship] Session changed:', state.sessionId, '->', urlSessionId)
    state.sessionId = urlSessionId
  }
  initChannel()
}

// Watch for changes and save
watch(
  () => state.activeScene,
  () => {
    saveToLocalStorage()
  },
  { deep: true }
)

// Export store
export function useStarshipStore() {
  init()

  return {
    state,
    // Scene management
    saveScene,
    loadScene,
    deleteScene,
    startScene,
    endScene,
    // Starship management
    updateStarship,
    damageStarship,
    healStarship,
    regenerateShields,
    setShields,
    // Threat management
    addThreat,
    updateThreat,
    damageThreat,
    removeThreat,
    // Round & VP
    advanceRound,
    setRound,
    addVP,
    setVP,
    // Role management
    assignRole,
    unassignRole,
    // Custom roles
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    // Action log
    logAction,
    // URL sharing
    generateShareUrl,
    openPlayerView,
    // Import/Export
    exportScenes,
    importScenes,
    // View management
    setGMView,
    togglePlayerView,
    ensureChannel
  }
}
