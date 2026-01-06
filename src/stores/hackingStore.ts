import { reactive, watch } from 'vue'
import type { Computer, NodeState, HackingEffect, HackingEffectType, SavedHackingEncounter } from '../types/hacking'
import { createHackingEffect, createSampleComputer } from '../types/hacking'
import { generateRandomComputer, type GeneratorOptions } from '../utils/hackingGenerator'

// Generate or retrieve session ID for channel isolation
function getSessionId(): string {
  // Check URL first (for player views)
  const hash = window.location.hash
  const sessionMatch = hash.match(/[?&]session=([^&]+)/)
  if (sessionMatch) {
    return sessionMatch[1]
  }

  // Check sessionStorage (persists per tab)
  let sessionId = sessionStorage.getItem('sf2e-hacking-session')
  if (!sessionId) {
    sessionId = crypto.randomUUID().slice(0, 8)
    sessionStorage.setItem('sf2e-hacking-session', sessionId)
  }
  return sessionId
}

// State interface
interface HackingState {
  computer: Computer | null
  activeEffects: HackingEffect[]
  focusedNodeId: string | null
  ambientIntensity: number  // 0-1, controls particle density
  isGMView: boolean
  savedEncounters: SavedHackingEncounter[]
  showPlayerView: boolean
  sessionId: string
}

// Create reactive state
const state = reactive<HackingState>({
  computer: null,
  activeEffects: [],
  focusedNodeId: null,
  ambientIntensity: 0.7,
  isGMView: true,
  savedEncounters: [],
  showPlayerView: false,
  sessionId: ''
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
    // Use session-specific channel name for isolation
    const channelName = `sf2e-hacking-${state.sessionId}`
    console.log('[Hacking] Opening channel:', channelName)
    channel = new BroadcastChannel(channelName)
    currentChannelSession = state.sessionId

    channel.onmessage = (event) => {
      const { type, payload } = event.data
      console.log('[Hacking] Received:', type, payload)

      switch (type) {
        case 'effect':
          state.activeEffects.push(payload)
          break
        case 'node-state':
          if (state.computer) {
            const node = state.computer.accessPoints.find(ap => ap.id === payload.nodeId)
            if (node) {
              node.state = payload.state
            }
          }
          break
        case 'focus':
          state.focusedNodeId = payload.nodeId
          break
        case 'intensity':
          state.ambientIntensity = payload.value
          break
        case 'computer':
          state.computer = payload
          break
        case 'clear-effects':
          state.activeEffects = []
          break
      }
    }
  }
}

function broadcast(type: string, payload: unknown) {
  console.log('[Hacking] Broadcasting:', type, 'channel:', currentChannelSession)
  if (channel) {
    channel.postMessage({ type, payload })
  }
}

// Actions
function loadComputer(computer: Computer) {
  state.computer = computer
  broadcast('computer', computer)
  saveToLocalStorage()
}

function loadSampleComputer() {
  loadComputer(createSampleComputer())
}

function createNewComputer(name: string = 'New Computer') {
  const newComputer: Computer = {
    id: crypto.randomUUID(),
    name,
    level: 1,
    type: 'tech',
    accessPoints: []
  }
  loadComputer(newComputer)
  return newComputer
}

function generateComputer(options?: GeneratorOptions) {
  const computer = generateRandomComputer(options)
  loadComputer(computer)
  return computer
}

function setNodeState(nodeId: string, newState: NodeState) {
  if (!state.computer) return

  const node = state.computer.accessPoints.find(ap => ap.id === nodeId)
  if (node) {
    node.state = newState
    broadcast('node-state', { nodeId, state: newState })
    saveToLocalStorage()
  }
}

function triggerEffect(type: HackingEffectType, targetNodeId?: string) {
  const effect = createHackingEffect(type, targetNodeId || state.focusedNodeId || undefined)
  state.activeEffects.push(effect)
  broadcast('effect', effect)

  // Auto-remove effect after duration
  setTimeout(() => {
    const index = state.activeEffects.findIndex(e => e.id === effect.id)
    if (index !== -1) {
      state.activeEffects.splice(index, 1)
    }
  }, effect.duration)
}

function setFocus(nodeId: string | null) {
  state.focusedNodeId = nodeId
  broadcast('focus', { nodeId })
}

function setAmbientIntensity(value: number) {
  state.ambientIntensity = Math.max(0, Math.min(1, value))
  broadcast('intensity', { value: state.ambientIntensity })
}

function clearEffects() {
  state.activeEffects = []
  broadcast('clear-effects', null)
}

function setGMView(isGM: boolean) {
  state.isGMView = isGM
}

function togglePlayerView() {
  state.showPlayerView = !state.showPlayerView
}

// Encounter management
function saveEncounter(name?: string) {
  if (!state.computer) return null

  const encounter: SavedHackingEncounter = {
    id: crypto.randomUUID(),
    name: name || state.computer.name,
    computer: JSON.parse(JSON.stringify(state.computer)),
    savedAt: Date.now()
  }

  state.savedEncounters.push(encounter)
  saveEncountersToStorage()
  return encounter
}

function loadEncounter(encounterId: string) {
  const encounter = state.savedEncounters.find(e => e.id === encounterId)
  if (encounter) {
    loadComputer(JSON.parse(JSON.stringify(encounter.computer)))
  }
}

function deleteEncounter(encounterId: string) {
  const index = state.savedEncounters.findIndex(e => e.id === encounterId)
  if (index !== -1) {
    state.savedEncounters.splice(index, 1)
    saveEncountersToStorage()
  }
}

// URL sharing
function generateShareUrl(): string {
  if (!state.computer) return window.location.href

  const shareData = {
    c: state.computer,
    i: state.ambientIntensity
  }

  const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)))
  const baseUrl = window.location.origin + window.location.pathname
  // Include session ID for BroadcastChannel isolation
  return `${baseUrl}#/hacking/view?session=${state.sessionId}&state=${encoded}`
}

function loadFromUrl(): boolean {
  const hash = window.location.hash
  const match = hash.match(/[?&]state=([^&]+)/)

  if (match && match[1]) {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(match[1])))
      if (decoded.c) {
        state.computer = decoded.c
        if (typeof decoded.i === 'number') {
          state.ambientIntensity = decoded.i
        }
        return true
      }
    } catch (e) {
      console.warn('Failed to load state from URL:', e)
    }
  }
  return false
}

// LocalStorage persistence
const STORAGE_KEY = 'sf2e-hacking-state'
const ENCOUNTERS_KEY = 'sf2e-hacking-saved'

function saveToLocalStorage() {
  if (state.computer) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      computer: state.computer,
      ambientIntensity: state.ambientIntensity
    }))
  }
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.computer) {
        state.computer = data.computer
      }
      if (typeof data.ambientIntensity === 'number') {
        state.ambientIntensity = data.ambientIntensity
      }
    } catch (e) {
      console.warn('Failed to load saved state:', e)
    }
  }
}

function saveEncountersToStorage() {
  localStorage.setItem(ENCOUNTERS_KEY, JSON.stringify(state.savedEncounters))
}

function loadEncountersFromStorage() {
  const saved = localStorage.getItem(ENCOUNTERS_KEY)
  if (saved) {
    try {
      state.savedEncounters = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load saved encounters:', e)
      state.savedEncounters = []
    }
  }
}

// Initialize
let initialized = false

function init() {
  if (initialized) return
  initialized = true

  // Set session ID first (needed for channel isolation)
  state.sessionId = getSessionId()
  console.log('[Hacking] Init with session:', state.sessionId)

  initChannel()
  loadEncountersFromStorage()

  const loadedFromUrl = loadFromUrl()

  if (!loadedFromUrl) {
    loadFromLocalStorage()
  }

  if (!state.computer) {
    loadSampleComputer()
  }
}

// Allow reinitializing channel (for player view after URL parse)
function ensureChannel() {
  const urlSessionId = getSessionId()
  if (urlSessionId !== state.sessionId) {
    console.log('[Hacking] Session changed:', state.sessionId, '->', urlSessionId)
    state.sessionId = urlSessionId
  }
  initChannel()
}

// Watch for changes and save
watch(
  () => state.computer,
  () => saveToLocalStorage(),
  { deep: true }
)

// Export store
export function useHackingStore() {
  init()

  return {
    state,
    loadComputer,
    loadSampleComputer,
    createNewComputer,
    generateComputer,
    setNodeState,
    triggerEffect,
    setFocus,
    setAmbientIntensity,
    clearEffects,
    setGMView,
    togglePlayerView,
    // Encounter management
    saveEncounter,
    loadEncounter,
    deleteEncounter,
    // URL sharing
    generateShareUrl,
    loadFromUrl,
    ensureChannel
  }
}
