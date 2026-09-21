/**
 * Tactical Starship Combat store (Starfinder Tech Core ch. 6–7).
 *
 * Separate from starshipStore (the GM Core cinematic scene runner). Owns the
 * TSC scene library, the active scene (initiative, Hull/Shield Points, the
 * player ship's compromised/wrecked spiral, station malfunctions, positions),
 * player-starship templates, custom NPC starships, and the per-model memory of
 * identified battle stations.
 *
 * Sync follows combatStore's model: only a sanitized `player-data` snapshot is
 * ever broadcast, never the raw scene.
 */

import { computed, reactive, watch } from 'vue'
import type {
  FrameId,
  HullBand,
  NpcStarship,
  PlayerStarship,
  StarshipHazard,
  TscHazardInstance,
  TscInitiativeEntry,
  TscNpcShipInstance,
  TscPc,
  TscPlayerData,
  TscPosition,
  TscSavedScene,
  TscScene,
  TscState,
  TscSyncMessage,
  TscSyncMessageType,
} from '../types/tsc'
import type { CombatantCondition } from '../types/combat'
import { TSC_STARSHIPS } from '../data/tscStarships'
import {
  createPlayerStarship,
  degreeOfSuccess,
  deriveStarshipStats,
  generateShieldsDice,
  hullIntegrityDC,
  hullIntegrityDelta,
  setPlayerStarshipLevel,
  type DegreeOfSuccess,
} from '../utils/tscDerive'
import { rollD20, rollDamage, rollFlat } from '../utils/dice'
import { sendTurnChange } from '../utils/discordIntegration'
import { createSyncTransport, isWebSocketSupported, isSyncAvailable, type SyncMessage, type ConnectionState } from '../utils/syncTransport'

// ============ Storage keys ============

const STORAGE_KEY = 'sf2e-tsc'
const PLAYER_SHIPS_KEY = 'sf2e-tsc-player-ships'
const CUSTOM_STARSHIPS_KEY = 'sf2e-tsc-custom-starships'
const SESSION_KEY = 'sf2e-tsc-session'
const CUSTOM_ID_PREFIX = 'custom-starship-'

export const DEFAULT_ZONES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// ============ Session ============

function getSessionId(): string {
  const match = window.location.hash.match(/[?&]session=([^&]+)/)
  if (match) return match[1]
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID().slice(0, 8)
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

const state = reactive<TscState>({
  savedScenes: [],
  activeScene: null,
  playerShips: [],
  customStarships: [],
  identifiedModels: {},
  sessionId: '',
  isGMView: true,
  playerData: null,
  wsConnectionState: 'disconnected',
  isRemoteSyncEnabled: false,
})

// ============ Factories ============

export function defaultPosition(zone = '1', heading: TscPosition['heading'] = 'fore'): TscPosition {
  return { zone, heading }
}

export function createEmptyTscScene(): TscSavedScene {
  return {
    id: crypto.randomUUID(),
    name: 'New Tactical Scene',
    level: 1,
    playerShip: null,
    pcs: [],
    npcShips: [],
    hazards: [],
    sensorMap: { kind: 'freeform', zones: [...DEFAULT_ZONES] },
    savedAt: Date.now(),
  }
}

export function createNpcShipInstance(model: NpcStarship, label?: string, position?: TscPosition): TscNpcShipInstance {
  const stationState: TscNpcShipInstance['stationState'] = {}
  for (const st of model.battleStations) stationState[st.name] = { malfunctioning: false }
  return {
    instanceId: crypto.randomUUID(),
    label: label ?? model.name,
    model: JSON.parse(JSON.stringify(model)),
    currentHP: model.hp,
    currentSP: model.sp ?? 0,
    stationState,
    conditions: [],
    offKilter: false,
    inoperable: false,
    position: position ?? defaultPosition(),
    destroyed: false,
    hiddenFromPlayers: false,
    detected: true,
  }
}

export function createHazardInstance(hazard: StarshipHazard, label?: string, position?: TscPosition): TscHazardInstance {
  const componentHP: Record<string, number> = {}
  for (const c of hazard.components) if (c.hp !== undefined) componentHP[c.name] = c.hp
  return {
    instanceId: crypto.randomUUID(),
    label: label ?? hazard.name,
    hazard: JSON.parse(JSON.stringify(hazard)),
    currentHP: hazard.hp,
    componentHP: Object.keys(componentHP).length ? componentHP : undefined,
    position: position ?? defaultPosition(),
    disabled: false,
    // Hazards start undetected: the crew must Seek Starships (or trip them) first.
    detected: false,
    hiddenFromPlayers: false,
  }
}

function resetInstance(n: TscNpcShipInstance): TscNpcShipInstance {
  const fresh = createNpcShipInstance(n.model, n.label, n.position)
  fresh.hiddenFromPlayers = n.hiddenFromPlayers
  fresh.detected = n.detected
  return fresh
}

function resetHazard(h: TscHazardInstance): TscHazardInstance {
  const fresh = createHazardInstance(h.hazard, h.label, h.position)
  fresh.hiddenFromPlayers = h.hiddenFromPlayers
  return fresh
}

export function createSceneFromSaved(saved: TscSavedScene): TscScene {
  const clone = JSON.parse(JSON.stringify(saved)) as TscSavedScene
  let playerShip: PlayerStarship | null = null
  if (clone.playerShip) {
    const derived = deriveStarshipStats(clone.playerShip)
    playerShip = {
      ...clone.playerShip,
      currentHP: derived.maxHP,
      currentSP: derived.maxSP,
      compromised: 0,
      wrecked: clone.playerShip.wrecked ?? 0,
      inoperable: false,
      offKilter: false,
      conditions: [],
      stations: clone.playerShip.stations.map(s => ({ ...s, malfunctioning: false })),
    }
  }
  return {
    id: crypto.randomUUID(),
    name: clone.name,
    level: clone.level,
    description: clone.description,
    playerShip,
    playerShipPosition: defaultPosition(),
    playerShipDestroyed: false,
    pcs: clone.pcs.map(p => ({ ...p })),
    npcShips: clone.npcShips.map(resetInstance),
    hazards: clone.hazards.map(resetHazard),
    sensorMap: clone.sensorMap ?? { kind: 'freeform', zones: [...DEFAULT_ZONES] },
    initiativeOrder: [],
    currentTurnIndex: 0,
    initiativeRolled: false,
    round: 1,
    isActive: true,
    log: [],
  }
}

// ============ Player data (sanitized) ============

export function hullBand(current: number, max: number): HullBand {
  if (current <= 0) return 'destroyed'
  const ratio = max > 0 ? current / max : 1
  if (ratio <= 0.25) return 'critical'
  if (ratio < 1) return 'damaged'
  return 'intact'
}

/**
 * Build the sanitized snapshot the player view renders. Hidden and undetected
 * entities are dropped and the turn index is remapped onto the visible list,
 * following combatStore.buildPlayerData.
 */
export function buildTscPlayerData(scene: TscScene | null, identifiedModels: Record<string, string[]> = {}): TscPlayerData | null {
  if (!scene) return null
  const visibleShipIds = new Set(scene.npcShips.filter(n => !n.hiddenFromPlayers && n.detected).map(n => n.instanceId))
  const visibleHazardIds = new Set(scene.hazards.filter(h => !h.hiddenFromPlayers && h.detected).map(h => h.instanceId))
  const isVisible = (e: TscInitiativeEntry) =>
    e.kind === 'pc' || e.kind === 'playerShip' ||
    (e.kind === 'npcShip' && visibleShipIds.has(e.refId)) ||
    (e.kind === 'hazard' && visibleHazardIds.has(e.refId))
  const order = scene.initiativeOrder
  const currentId = order[scene.currentTurnIndex]?.id
  const visible = order.filter(isVisible)
  let turn = visible.findIndex(e => e.id === currentId)
  if (turn === -1 && visible.length > 0) {
    for (let step = 1; step <= order.length; step++) {
      const probe = order[(scene.currentTurnIndex + step) % order.length]
      const idx = visible.findIndex(e => e.id === probe.id)
      if (idx !== -1) { turn = idx; break }
    }
    if (turn === -1) turn = 0
  } else if (turn === -1) {
    turn = 0
  }

  let playerShip: TscPlayerData['playerShip'] = null
  if (scene.playerShip) {
    const ship = scene.playerShip
    const d = deriveStarshipStats(ship)
    playerShip = {
      name: ship.name,
      frame: ship.frame,
      level: ship.level,
      currentHP: ship.currentHP,
      maxHP: d.maxHP,
      currentSP: ship.currentSP,
      maxSP: d.maxSP,
      ac: d.ac,
      fort: d.fort,
      ref: d.ref,
      will: d.will,
      speed: d.speed,
      sensorRange: d.sensorRange,
      compromised: ship.compromised,
      wrecked: ship.wrecked,
      inoperable: ship.inoperable,
      offKilter: ship.offKilter,
      conditions: ship.conditions.map(c => ({ ...c })),
      stations: ship.stations.map(s => ({
        id: s.id,
        kind: s.kind,
        grade: d.stations.find(x => x.id === s.id)?.grade ?? 'commercial',
        helmedBy: s.helmedBy,
        malfunctioning: s.malfunctioning,
      })),
      position: { ...scene.playerShipPosition },
      destroyed: scene.playerShipDestroyed,
    }
  }

  return {
    sceneName: scene.name,
    round: scene.round,
    isActive: scene.isActive,
    initiativeRolled: scene.initiativeRolled,
    turn,
    entries: visible.map(e => ({ kind: e.kind, name: e.name })),
    playerShip,
    npcShips: scene.npcShips.filter(n => visibleShipIds.has(n.instanceId)).map(n => {
      const identified = identifiedModels[n.model.name] ?? []
      return {
        instanceId: n.instanceId,
        label: n.label,
        modelName: identified.length ? n.model.name : undefined,
        size: n.model.size,
        band: hullBand(n.currentHP, n.model.hp),
        shieldsUp: n.currentSP > 0,
        identifiedStations: [...identified],
        malfunctioningStations: Object.entries(n.stationState).filter(([, s]) => s.malfunctioning).map(([name]) => name)
          .filter(name => identified.includes(name)),
        conditions: n.conditions.map(c => ({ ...c })),
        offKilter: n.offKilter,
        inoperable: n.inoperable,
        position: { ...n.position },
        destroyed: n.destroyed,
      }
    }),
    hazards: scene.hazards.filter(h => visibleHazardIds.has(h.instanceId)).map(h => ({
      instanceId: h.instanceId,
      label: h.label,
      name: h.hazard.name,
      position: { ...h.position },
      disabled: h.disabled,
    })),
    sensorMap: { ...scene.sensorMap, zones: [...scene.sensorMap.zones] },
    log: scene.log.filter(e => !e.gmOnly).slice(-12),
  }
}

// ============ Sync plumbing ============

let wsTransport: ReturnType<typeof createSyncTransport> | null = null
let stateRetryTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let channel: BroadcastChannel | null = null
let currentChannelSession: string | null = null

function handleSyncMessage(message: TscSyncMessage) {
  if (message.type === 'player-data' && !state.isGMView) {
    state.playerData = message.payload as TscPlayerData | null
    if (stateRetryTimer) {
      clearInterval(stateRetryTimer)
      stateRetryTimer = null
    }
  }
  if (message.type === 'request-state' && state.isGMView) {
    broadcastPlayerData()
  }
}

function initChannel() {
  if (typeof BroadcastChannel === 'undefined') return
  if (channel && currentChannelSession !== state.sessionId) {
    channel.close()
    channel = null
  }
  if (!channel && state.sessionId) {
    channel = new BroadcastChannel(`sf2e-tsc-${state.sessionId}`)
    currentChannelSession = state.sessionId
    channel.onmessage = (event) => handleSyncMessage(event.data as TscSyncMessage)
  }
}

function send(type: TscSyncMessageType, payload: unknown) {
  // Round-trip through JSON to strip Vue proxies (structuredClone throws on them).
  const safePayload = payload === undefined || payload === null ? null : JSON.parse(JSON.stringify(payload))
  const message: TscSyncMessage = { type, payload: safePayload, timestamp: Date.now() }
  if (channel) channel.postMessage(message)
  if (wsTransport && state.isRemoteSyncEnabled) wsTransport.send({ type, payload: safePayload })
}

function broadcastPlayerData() {
  if (!state.isGMView) return
  send('player-data', buildTscPlayerData(state.activeScene, state.identifiedModels))
}

function handleRemoteMessage(message: SyncMessage) {
  if (message.type === 'init') return
  handleSyncMessage({ type: message.type as TscSyncMessageType, payload: message.payload, timestamp: Date.now() })
}

async function enableRemoteSync(): Promise<boolean> {
  if (!isWebSocketSupported()) return false
  try {
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteMessage
    wsTransport.onStateChange = (s: ConnectionState) => { state.wsConnectionState = s }
    await wsTransport.connect(state.sessionId, 'gm')
    state.isRemoteSyncEnabled = true
    broadcastPlayerData()
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      if (wsTransport && state.isRemoteSyncEnabled) broadcastPlayerData()
    }, 30000)
    return true
  } catch (e) {
    console.error('[TSC] Failed to enable remote sync:', e)
    state.isRemoteSyncEnabled = false
    state.wsConnectionState = 'error'
    return false
  }
}

async function joinRemoteSession(sessionId: string): Promise<boolean> {
  if (!isWebSocketSupported()) return false
  try {
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteMessage
    wsTransport.onStateChange = (s: ConnectionState) => { state.wsConnectionState = s }
    await wsTransport.connect(sessionId, 'player')
    state.isRemoteSyncEnabled = true
    wsTransport.send({ type: 'request-state', payload: null })
    let retries = 0
    if (stateRetryTimer) clearInterval(stateRetryTimer)
    stateRetryTimer = setInterval(() => {
      retries++
      if (retries >= 3 || state.playerData) {
        if (stateRetryTimer) clearInterval(stateRetryTimer)
        stateRetryTimer = null
        return
      }
      if (wsTransport && state.isRemoteSyncEnabled) wsTransport.send({ type: 'request-state', payload: null })
    }, 3000)
    return true
  } catch (e) {
    console.error('[TSC] Failed to join remote session:', e)
    state.isRemoteSyncEnabled = false
    state.wsConnectionState = 'error'
    return false
  }
}

function disableRemoteSync(): void {
  if (wsTransport) {
    wsTransport.disconnect()
    wsTransport = null
  }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  if (stateRetryTimer) { clearInterval(stateRetryTimer); stateRetryTimer = null }
  state.isRemoteSyncEnabled = false
  state.wsConnectionState = 'disconnected'
}

function hasRemoteSyncInUrl(): boolean {
  return window.location.hash.includes('sync=ws')
}

function generateShareUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname
  const syncParam = state.isRemoteSyncEnabled ? '&sync=ws' : ''
  return `${baseUrl}#/tsc/view?session=${state.sessionId}${syncParam}`
}

/** Mint a fresh session id so a new share link never inherits a prior session's state. */
function rotateSession(): void {
  const newId = crypto.randomUUID().slice(-8)
  state.sessionId = newId
  sessionStorage.setItem(SESSION_KEY, newId)
  initChannel()
}

async function openPlayerView(): Promise<{ success: boolean; syncEnabled: boolean }> {
  if (state.isRemoteSyncEnabled) disableRemoteSync()
  rotateSession()
  let syncEnabled = false
  if (isSyncAvailable()) syncEnabled = await enableRemoteSync()
  const url = generateShareUrl()
  let copied = false
  try {
    await navigator.clipboard.writeText(url)
    copied = true
  } catch (e) {
    console.warn('[TSC] Clipboard copy failed:', e)
  }
  window.open(url, '_blank', 'width=1920,height=1080')
  return { success: copied, syncEnabled }
}

/** Player view: ask the GM tab for state; fall back to the same-device localStorage copy. */
function requestStateFromGM() {
  if (channel) channel.postMessage({ type: 'request-state', payload: null, timestamp: Date.now() })
  if (!state.playerData) {
    loadFromLocalStorage()
    state.playerData = buildTscPlayerData(state.activeScene, state.identifiedModels)
  }
}

function setGMView(isGM: boolean) {
  state.isGMView = isGM
}

function ensureChannel() {
  const urlSessionId = getSessionId()
  if (urlSessionId !== state.sessionId) state.sessionId = urlSessionId
  initChannel()
}

// ============ Persistence ============

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    savedScenes: state.savedScenes,
    activeScene: state.activeScene,
    identifiedModels: state.identifiedModels,
  }))
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const data = JSON.parse(saved)
    if (Array.isArray(data.savedScenes)) state.savedScenes = data.savedScenes
    if (data.activeScene) state.activeScene = data.activeScene
    if (data.identifiedModels && typeof data.identifiedModels === 'object') state.identifiedModels = data.identifiedModels
  } catch (e) {
    console.warn('[TSC] Failed to load saved state:', e)
  }
}

function savePlayerShipsToLocalStorage() {
  localStorage.setItem(PLAYER_SHIPS_KEY, JSON.stringify(state.playerShips))
}

function saveCustomStarshipsToLocalStorage() {
  localStorage.setItem(CUSTOM_STARSHIPS_KEY, JSON.stringify(state.customStarships))
}

function loadLibrariesFromLocalStorage() {
  try {
    const ships = localStorage.getItem(PLAYER_SHIPS_KEY)
    if (ships) {
      const parsed = JSON.parse(ships)
      if (Array.isArray(parsed)) state.playerShips = parsed
    }
    const custom = localStorage.getItem(CUSTOM_STARSHIPS_KEY)
    if (custom) {
      const parsed = JSON.parse(custom)
      if (Array.isArray(parsed)) state.customStarships = parsed
    }
  } catch (e) {
    console.warn('[TSC] Failed to load libraries:', e)
  }
}

// ============ Helpers ============

function scene(): TscScene {
  if (!state.activeScene) throw new Error('[TSC] No active scene')
  return state.activeScene
}

function logEntry(text: string, gmOnly = false) {
  const s = state.activeScene
  if (!s) return
  s.log.push({ id: crypto.randomUUID(), round: s.round, timestamp: Date.now(), text, ...(gmOnly ? { gmOnly: true } : {}) })
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200)
}

function findNpc(instanceId: string): TscNpcShipInstance | undefined {
  return state.activeScene?.npcShips.find(n => n.instanceId === instanceId)
}

function findHazard(instanceId: string): TscHazardInstance | undefined {
  return state.activeScene?.hazards.find(h => h.instanceId === instanceId)
}

export type ShipTarget = { kind: 'player' } | { kind: 'npc'; instanceId: string }

// ============ Scenes ============

function saveScene(saved: TscSavedScene): TscSavedScene {
  const copy: TscSavedScene = { ...JSON.parse(JSON.stringify(saved)), savedAt: Date.now() }
  const idx = state.savedScenes.findIndex(s => s.id === copy.id)
  if (idx === -1) state.savedScenes.push(copy)
  else state.savedScenes[idx] = copy
  saveToLocalStorage()
  return copy
}

function deleteScene(sceneId: string) {
  const idx = state.savedScenes.findIndex(s => s.id === sceneId)
  if (idx !== -1) state.savedScenes.splice(idx, 1)
  saveToLocalStorage()
}

function getSavedScene(sceneId: string): TscSavedScene | undefined {
  return state.savedScenes.find(s => s.id === sceneId)
}

function startScene(saved: TscSavedScene): TscScene {
  state.activeScene = createSceneFromSaved(saved)
  logEntry(`Scene "${saved.name}" started`)
  broadcastPlayerData()
  return state.activeScene
}

/** Snapshot the active scene back into its saved template (participants and map, not runtime state). */
function saveActiveSceneAsTemplate(): TscSavedScene | null {
  const s = state.activeScene
  if (!s) return null
  return saveScene({
    id: s.id,
    name: s.name,
    level: s.level,
    description: s.description,
    playerShip: s.playerShip,
    pcs: s.pcs,
    npcShips: s.npcShips,
    hazards: s.hazards,
    sensorMap: s.sensorMap,
    savedAt: Date.now(),
  })
}

function endScene() {
  const s = state.activeScene
  if (!s) return
  // Campaign continuity: a ship loaded from a template carries its damage forward.
  if (s.playerShip?.templateId) {
    const template = state.playerShips.find(p => p.id === s.playerShip!.templateId)
    if (template) {
      template.currentHP = s.playerShip.currentHP
      template.currentSP = s.playerShip.currentSP
      template.compromised = s.playerShip.compromised
      template.wrecked = s.playerShip.wrecked
      template.inoperable = s.playerShip.inoperable
      template.stations = template.stations.map(st => ({
        ...st,
        malfunctioning: s.playerShip!.stations.find(x => x.id === st.id)?.malfunctioning ?? st.malfunctioning,
      }))
      savePlayerShipsToLocalStorage()
    }
  }
  state.activeScene = null
  saveToLocalStorage()
  broadcastPlayerData()
}

function exportScenes(): string {
  return JSON.stringify(state.savedScenes, null, 2)
}

function importScenes(json: string) {
  const scenes = JSON.parse(json) as TscSavedScene[]
  if (!Array.isArray(scenes)) throw new Error('Invalid format')
  for (const sc of scenes) {
    const idx = state.savedScenes.findIndex(s => s.id === sc.id)
    if (idx === -1) state.savedScenes.push(sc)
    else state.savedScenes[idx] = sc
  }
  saveToLocalStorage()
}

// ============ Player starship templates ============

function savePlayerShip(ship: PlayerStarship): PlayerStarship {
  const copy: PlayerStarship = JSON.parse(JSON.stringify(ship))
  const idx = state.playerShips.findIndex(p => p.id === copy.id)
  if (idx === -1) state.playerShips.push(copy)
  else state.playerShips[idx] = copy
  savePlayerShipsToLocalStorage()
  return copy
}

function deletePlayerShip(shipId: string) {
  const idx = state.playerShips.findIndex(p => p.id === shipId)
  if (idx !== -1) state.playerShips.splice(idx, 1)
  savePlayerShipsToLocalStorage()
}

function newPlayerShip(frame: FrameId, level = 1, name = 'New Starship'): PlayerStarship {
  return savePlayerShip(createPlayerStarship(frame, level, name))
}

/** Instantiate a template into the active scene (or a saved scene) with a link back for write-back. */
function instantiatePlayerShip(templateId: string): PlayerStarship | null {
  const template = state.playerShips.find(p => p.id === templateId)
  if (!template) return null
  return { ...JSON.parse(JSON.stringify(template)), id: crypto.randomUUID(), templateId: template.id }
}

function loadPlayerShipIntoScene(templateId: string): PlayerStarship | null {
  const ship = instantiatePlayerShip(templateId)
  if (!ship || !state.activeScene) return null
  const d = deriveStarshipStats(ship)
  ship.currentHP = Math.min(ship.currentHP, d.maxHP)
  ship.currentSP = d.maxSP // the generator starts every encounter with full Shield Points
  state.activeScene.playerShip = ship
  broadcastPlayerData()
  return ship
}

function exportPlayerShips(): string {
  return JSON.stringify(state.playerShips, null, 2)
}

function importPlayerShips(json: string) {
  const ships = JSON.parse(json) as PlayerStarship[]
  if (!Array.isArray(ships)) throw new Error('Invalid format')
  for (const ship of ships) {
    const idx = state.playerShips.findIndex(p => p.id === ship.id)
    if (idx === -1) state.playerShips.push(ship)
    else state.playerShips[idx] = ship
  }
  savePlayerShipsToLocalStorage()
}

// ============ Custom NPC starships ============

const allStarships = computed<NpcStarship[]>(() => [...TSC_STARSHIPS, ...state.customStarships])

function isCustomStarship(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX)
}

function addCustomStarship(ship: NpcStarship): NpcStarship {
  const id = isCustomStarship(ship.id) ? ship.id : `${CUSTOM_ID_PREFIX}${ship.id || crypto.randomUUID().slice(0, 8)}`
  const copy: NpcStarship = { ...JSON.parse(JSON.stringify(ship)), id, source: ship.source || 'Custom' }
  const idx = state.customStarships.findIndex(s => s.id === id)
  if (idx === -1) state.customStarships.push(copy)
  else state.customStarships[idx] = copy
  saveCustomStarshipsToLocalStorage()
  return copy
}

function deleteCustomStarship(id: string) {
  const idx = state.customStarships.findIndex(s => s.id === id)
  if (idx !== -1) state.customStarships.splice(idx, 1)
  saveCustomStarshipsToLocalStorage()
}

function exportCustomStarships(): string {
  return JSON.stringify(state.customStarships, null, 2)
}

function importCustomStarships(json: string): number {
  const ships = JSON.parse(json) as NpcStarship[]
  if (!Array.isArray(ships)) throw new Error('Invalid format')
  ships.forEach(s => addCustomStarship(s))
  return ships.length
}

function getStarshipById(id: string): NpcStarship | undefined {
  return allStarships.value.find(s => s.id === id)
}

// ============ Participants ============

function addPc(input: { name: string; playerId?: string; initiativeBonus?: number }): TscPc {
  const pc: TscPc = { id: crypto.randomUUID(), ...input }
  scene().pcs.push(pc)
  broadcastPlayerData()
  return pc
}

function removePc(pcId: string) {
  const s = scene()
  const idx = s.pcs.findIndex(p => p.id === pcId)
  if (idx !== -1) s.pcs.splice(idx, 1)
  removeEntry(pcId)
  broadcastPlayerData()
}

function setPcStation(pcId: string, stationId: string | undefined) {
  const s = scene()
  const pc = s.pcs.find(p => p.id === pcId)
  if (!pc) return
  // One PC per station: vacate any station this PC was helming.
  if (s.playerShip) {
    for (const st of s.playerShip.stations) if (st.helmedBy === pc.name) st.helmedBy = undefined
    if (stationId) {
      const st = s.playerShip.stations.find(x => x.id === stationId)
      if (st) {
        for (const other of s.pcs) if (other.stationId === stationId) other.stationId = undefined
        st.helmedBy = pc.name
      }
    }
  }
  pc.stationId = stationId
  broadcastPlayerData()
}

function setPcExplorationActivity(pcId: string, activityId: string | undefined) {
  const pc = scene().pcs.find(p => p.id === pcId)
  if (pc) pc.explorationActivityId = activityId
}

function addNpcShip(model: NpcStarship, count = 1, opts: { hidden?: boolean; zone?: string } = {}): TscNpcShipInstance[] {
  const s = scene()
  const existing = s.npcShips.filter(n => n.model.id === model.id).length
  const added: TscNpcShipInstance[] = []
  for (let i = 0; i < count; i++) {
    const n = existing + i
    const label = n === 0 ? model.name : `${model.name} ${n + 1}`
    const inst = createNpcShipInstance(model, label, defaultPosition(opts.zone ?? s.sensorMap.zones[0] ?? '1'))
    inst.hiddenFromPlayers = !!opts.hidden
    s.npcShips.push(inst)
    added.push(inst)
  }
  broadcastPlayerData()
  return added
}

function removeNpcShip(instanceId: string) {
  const s = scene()
  const idx = s.npcShips.findIndex(n => n.instanceId === instanceId)
  if (idx !== -1) s.npcShips.splice(idx, 1)
  removeEntry(instanceId)
  broadcastPlayerData()
}

function addHazard(hazard: StarshipHazard, opts: { zone?: string } = {}): TscHazardInstance {
  const s = scene()
  const existing = s.hazards.filter(h => h.hazard.id === hazard.id).length
  const label = existing === 0 ? hazard.name : `${hazard.name} ${existing + 1}`
  const inst = createHazardInstance(hazard, label, defaultPosition(opts.zone ?? s.sensorMap.zones[0] ?? '1'))
  s.hazards.push(inst)
  broadcastPlayerData()
  return inst
}

function removeHazard(instanceId: string) {
  const s = scene()
  const idx = s.hazards.findIndex(h => h.instanceId === instanceId)
  if (idx !== -1) s.hazards.splice(idx, 1)
  removeEntry(instanceId)
  broadcastPlayerData()
}

function setPosition(target: ShipTarget | { kind: 'hazard'; instanceId: string }, position: Partial<TscPosition>) {
  const s = scene()
  if (target.kind === 'player') Object.assign(s.playerShipPosition, position)
  else if (target.kind === 'npc') { const n = findNpc(target.instanceId); if (n) Object.assign(n.position, position) }
  else { const h = findHazard(target.instanceId); if (h) Object.assign(h.position, position) }
  broadcastPlayerData()
}

function setHidden(target: { kind: 'npc' | 'hazard'; instanceId: string }, hidden: boolean) {
  const e = target.kind === 'npc' ? findNpc(target.instanceId) : findHazard(target.instanceId)
  if (e) e.hiddenFromPlayers = hidden
  broadcastPlayerData()
}

function setDetected(target: { kind: 'npc' | 'hazard'; instanceId: string }, detected: boolean) {
  const e = target.kind === 'npc' ? findNpc(target.instanceId) : findHazard(target.instanceId)
  if (e) e.detected = detected
  broadcastPlayerData()
}

function setSensorMapZones(zones: string[]) {
  scene().sensorMap.zones = zones.map(z => z.trim()).filter(Boolean)
  broadcastPlayerData()
}

// ============ Initiative ============

const currentEntry = computed<TscInitiativeEntry | null>(() => {
  const s = state.activeScene
  if (!s || !s.initiativeRolled || !s.initiativeOrder.length) return null
  return s.initiativeOrder[s.currentTurnIndex] ?? null
})

/**
 * Roll initiative. PCs supply their totals; NPC starships always roll
 * (1d20 + Perception), complex hazards roll (1d20 + Stealth modifier), and
 * neither the player starship nor simple hazards enter the order (p. 169, 246).
 */
function rollInitiative(pcRolls: { pcId: string; total: number }[]) {
  const s = scene()
  const entries: TscInitiativeEntry[] = []
  for (const pc of s.pcs) {
    const roll = pcRolls.find(r => r.pcId === pc.id)
    const total = roll ? roll.total : rollD20(pc.initiativeBonus ?? 0, 'Initiative', pc.name).total
    entries.push({ id: crypto.randomUUID(), kind: 'pc', refId: pc.id, name: pc.name, initiative: total, hasActedThisRound: false })
  }
  for (const n of s.npcShips) {
    if (n.destroyed) continue
    const total = rollD20(n.model.perception, 'Initiative', n.label).total
    entries.push({ id: crypto.randomUUID(), kind: 'npcShip', refId: n.instanceId, name: n.label, initiative: total, hasActedThisRound: false })
  }
  for (const h of s.hazards) {
    if (h.hazard.complexity !== 'complex' || h.disabled) continue
    const mod = h.hazard.stealth.modifier ?? ((h.hazard.stealth.dc ?? 10) - 10)
    const total = rollD20(mod, 'Initiative', h.label).total
    entries.push({ id: crypto.randomUUID(), kind: 'hazard', refId: h.instanceId, name: h.label, initiative: total, hasActedThisRound: false })
  }
  entries.sort((a, b) => b.initiative - a.initiative)
  s.initiativeOrder = entries
  s.currentTurnIndex = 0
  s.initiativeRolled = true
  s.round = 1
  logEntry('Initiative rolled')
  broadcastPlayerData()
}

function announceTurn() {
  const entry = currentEntry.value
  const s = state.activeScene
  if (!entry || !s) return
  void sendTurnChange(entry.name, s.round, entry.kind === 'pc' || entry.kind === 'playerShip')
}

function nextTurn() {
  const s = scene()
  if (!s.initiativeRolled || !s.initiativeOrder.length) return
  const current = s.initiativeOrder[s.currentTurnIndex]
  if (current) current.hasActedThisRound = true
  s.currentTurnIndex++
  if (s.currentTurnIndex >= s.initiativeOrder.length) {
    s.currentTurnIndex = 0
    s.round++
    for (const e of s.initiativeOrder) e.hasActedThisRound = false
    logEntry(`Round ${s.round}`)
  }
  announceTurn()
  broadcastPlayerData()
}

function previousTurn() {
  const s = scene()
  if (!s.initiativeRolled || !s.initiativeOrder.length) return
  s.currentTurnIndex--
  if (s.currentTurnIndex < 0) {
    s.currentTurnIndex = s.initiativeOrder.length - 1
    if (s.round > 1) s.round--
  }
  const current = s.initiativeOrder[s.currentTurnIndex]
  if (current) current.hasActedThisRound = false
  broadcastPlayerData()
}

function setTurn(index: number) {
  const s = scene()
  if (index >= 0 && index < s.initiativeOrder.length) {
    s.currentTurnIndex = index
    broadcastPlayerData()
  }
}

/** Move the current entry to the end of the order (Delay) without advancing the round. */
function delayTurn() {
  const s = scene()
  if (!s.initiativeRolled || s.initiativeOrder.length < 2) return
  const [entry] = s.initiativeOrder.splice(s.currentTurnIndex, 1)
  entry.hasActedThisRound = false
  s.initiativeOrder.push(entry)
  if (s.currentTurnIndex >= s.initiativeOrder.length) s.currentTurnIndex = 0
  broadcastPlayerData()
}

function endRound() {
  const s = scene()
  if (!s.initiativeRolled) return
  s.currentTurnIndex = 0
  s.round++
  for (const e of s.initiativeOrder) e.hasActedThisRound = false
  logEntry(`Round ${s.round}`)
  announceTurn()
  broadcastPlayerData()
}

/**
 * Insert the compromised player starship directly before the entry whose turn
 * reduced it to 0 Hull Points (p. 173). The current actor is unchanged.
 */
function insertPlayerShipBefore(entryId: string | undefined) {
  const s = scene()
  if (!s.playerShip || !s.initiativeRolled) return
  if (s.initiativeOrder.some(e => e.kind === 'playerShip')) return
  let idx = entryId ? s.initiativeOrder.findIndex(e => e.id === entryId) : -1
  if (idx === -1) idx = s.currentTurnIndex
  const anchor = s.initiativeOrder[idx]
  const entry: TscInitiativeEntry = {
    id: crypto.randomUUID(),
    kind: 'playerShip',
    refId: s.playerShip.id,
    name: s.playerShip.name,
    initiative: anchor ? anchor.initiative : 0,
    hasActedThisRound: anchor ? anchor.hasActedThisRound : false,
  }
  s.initiativeOrder.splice(idx, 0, entry)
  if (s.currentTurnIndex >= idx) s.currentTurnIndex++
}

/** Remove an entity from initiative, keeping the current actor pointed at the same entry. */
function removeEntry(refId: string) {
  const s = state.activeScene
  if (!s) return
  const idx = s.initiativeOrder.findIndex(e => e.refId === refId)
  if (idx === -1) return
  s.initiativeOrder.splice(idx, 1)
  if (idx < s.currentTurnIndex) s.currentTurnIndex--
  if (s.currentTurnIndex >= s.initiativeOrder.length) s.currentTurnIndex = 0
}

// ============ Damage & repairs ============

export interface DamageResult {
  shieldDamage: number
  hullDamage: number
  destroyed: boolean
  becameCompromised: boolean
  compromised?: number
}

function destroyPlayerShip() {
  const s = scene()
  s.playerShipDestroyed = true
  removeEntry(s.playerShip?.id ?? '')
  logEntry(`${s.playerShip?.name ?? 'The starship'} is destroyed`)
}

/** Shields absorb damage first, then Hull Points (p. 171). `bypassing` skips shields. */
function applyDamageToPools(current: { hp: number; sp: number }, amount: number, bypassing: boolean) {
  let remaining = Math.max(0, Math.floor(amount))
  let shieldDamage = 0
  if (!bypassing && current.sp > 0) {
    shieldDamage = Math.min(current.sp, remaining)
    current.sp -= shieldDamage
    remaining -= shieldDamage
  }
  const hullDamage = Math.min(current.hp, remaining)
  current.hp -= hullDamage
  return { shieldDamage, hullDamage }
}

function damageShip(target: ShipTarget, amount: number, opts: { bypassing?: boolean; critical?: boolean; sourceEntryId?: string } = {}): DamageResult {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (!n || n.destroyed) return { shieldDamage: 0, hullDamage: 0, destroyed: !!n?.destroyed, becameCompromised: false }
    const pools = { hp: n.currentHP, sp: n.currentSP }
    const r = applyDamageToPools(pools, amount, !!opts.bypassing)
    n.currentHP = pools.hp
    n.currentSP = pools.sp
    const destroyed = n.currentHP <= 0
    if (destroyed) {
      n.destroyed = true
      removeEntry(n.instanceId)
      logEntry(`${n.label} is destroyed`, n.hiddenFromPlayers || !n.detected)
    } else if (r.hullDamage || r.shieldDamage) {
      logEntry(`${n.label} takes ${amount} damage (${r.shieldDamage} shields, ${r.hullDamage} hull)`, true)
    }
    broadcastPlayerData()
    return { ...r, destroyed, becameCompromised: false }
  }

  const ship = s.playerShip
  if (!ship || s.playerShipDestroyed) return { shieldDamage: 0, hullDamage: 0, destroyed: s.playerShipDestroyed, becameCompromised: false }
  const step = opts.critical ? 2 : 1

  if (ship.compromised > 0) {
    // Already at 0 Hull Points: any unmitigated damage worsens the compromised value.
    const pools = { hp: 0, sp: ship.currentSP }
    const r = applyDamageToPools(pools, amount, !!opts.bypassing)
    ship.currentSP = pools.sp
    const unmitigated = Math.max(0, Math.floor(amount)) - r.shieldDamage
    if (unmitigated > 0 || opts.bypassing) {
      ship.compromised += step
      for (const st of ship.stations) st.malfunctioning = true
      logEntry(`${ship.name} takes damage while compromised: compromised ${ship.compromised}`)
      if (ship.compromised >= 10) {
        destroyPlayerShip()
        broadcastPlayerData()
        return { ...r, destroyed: true, becameCompromised: false, compromised: ship.compromised }
      }
    }
    broadcastPlayerData()
    return { ...r, destroyed: false, becameCompromised: false, compromised: ship.compromised }
  }

  const pools = { hp: ship.currentHP, sp: ship.currentSP }
  const r = applyDamageToPools(pools, amount, !!opts.bypassing)
  ship.currentHP = pools.hp
  ship.currentSP = pools.sp
  let becameCompromised = false
  if (ship.currentHP <= 0 && r.hullDamage > 0) {
    becameCompromised = true
    ship.compromised = step + ship.wrecked
    ship.inoperable = true
    for (const st of ship.stations) st.malfunctioning = true
    insertPlayerShipBefore(opts.sourceEntryId ?? currentEntry.value?.id)
    logEntry(`${ship.name} is reduced to 0 Hull Points: compromised ${ship.compromised}, inoperable, all stations malfunctioning`)
    if (ship.compromised >= 10) {
      destroyPlayerShip()
      broadcastPlayerData()
      return { ...r, destroyed: true, becameCompromised, compromised: ship.compromised }
    }
  } else if (r.hullDamage || r.shieldDamage) {
    logEntry(`${ship.name} takes ${amount} damage (${r.shieldDamage} shields, ${r.hullDamage} hull)`)
  }
  broadcastPlayerData()
  return { ...r, destroyed: false, becameCompromised, compromised: ship.compromised || undefined }
}

/** Losing compromised always grants wrecked 1 (or +1) and ends inoperable (p. 173). */
function clearCompromised() {
  const s = scene()
  const ship = s.playerShip
  if (!ship) return
  ship.compromised = 0
  ship.wrecked += 1
  ship.inoperable = false
  removeEntry(ship.id)
  logEntry(`${ship.name} is no longer compromised: wrecked ${ship.wrecked}`)
}

export interface HullIntegrityResult {
  roll: number
  dc: number
  degree: DegreeOfSuccess
  compromised: number
  destroyed: boolean
  recovered: boolean
}

/** Flat check DC 10 + compromised value, attempted each round on the ship's turn (p. 173). */
function hullIntegrityCheck(roll?: number): HullIntegrityResult | null {
  const s = scene()
  const ship = s.playerShip
  if (!ship || ship.compromised <= 0) return null
  const dc = hullIntegrityDC(ship.compromised)
  const natural = roll ?? rollFlat(dc, 'Hull Integrity', ship.name).roll
  const degree = degreeOfSuccess(natural, dc, natural)
  ship.compromised += hullIntegrityDelta(degree)
  logEntry(`Hull integrity check (DC ${dc}): ${natural} — ${degree}, compromised ${Math.max(0, ship.compromised)}`)
  let destroyed = false
  let recovered = false
  if (ship.compromised >= 10) {
    destroyPlayerShip()
    destroyed = true
  } else if (ship.compromised <= 0) {
    clearCompromised()
    recovered = true
  }
  broadcastPlayerData()
  return { roll: natural, dc, degree, compromised: Math.max(0, ship.compromised), destroyed, recovered }
}

function healShip(target: ShipTarget, amount: number) {
  const s = scene()
  const heal = Math.max(0, Math.floor(amount))
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (!n || n.destroyed) return
    n.currentHP = Math.min(n.model.hp, n.currentHP + heal)
    logEntry(`${n.label} regains ${heal} Hull Points`, true)
  } else {
    const ship = s.playerShip
    if (!ship || s.playerShipDestroyed) return
    const max = deriveStarshipStats(ship).maxHP
    ship.currentHP = Math.min(max, ship.currentHP + heal)
    logEntry(`${ship.name} regains ${heal} Hull Points`)
    if (ship.compromised > 0 && ship.currentHP >= 1) clearCompromised()
  }
  broadcastPlayerData()
}

function restoreShields(target: ShipTarget, amount?: number) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (!n || n.destroyed || n.model.sp === undefined) return
    const gain = amount ?? n.model.fortify ?? 0
    n.currentSP = Math.min(n.model.sp, n.currentSP + Math.max(0, gain))
    logEntry(`${n.label} regains ${gain} Shield Points`, true)
  } else {
    const ship = s.playerShip
    if (!ship) return
    const max = deriveStarshipStats(ship).maxSP
    const gain = amount ?? rollDamage(generateShieldsDice(ship.level), 'Generate Shields', ship.name).total
    ship.currentSP = Math.min(max, ship.currentSP + Math.max(0, gain))
    logEntry(`${ship.name} regains ${gain} Shield Points`)
  }
  broadcastPlayerData()
}

function setHP(target: ShipTarget, hp: number) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (n) n.currentHP = Math.max(0, Math.min(n.model.hp, hp))
  } else if (s.playerShip) {
    const ship = s.playerShip
    ship.currentHP = Math.max(0, Math.min(deriveStarshipStats(ship).maxHP, hp))
    if (ship.compromised > 0 && ship.currentHP >= 1) clearCompromised()
  }
  broadcastPlayerData()
}

function setSP(target: ShipTarget, sp: number) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (n) n.currentSP = Math.max(0, Math.min(n.model.sp ?? 0, sp))
  } else if (s.playerShip) {
    s.playerShip.currentSP = Math.max(0, Math.min(deriveStarshipStats(s.playerShip).maxSP, sp))
  }
  broadcastPlayerData()
}

function setWrecked(value: number) {
  const ship = scene().playerShip
  if (ship) ship.wrecked = Math.max(0, value)
  broadcastPlayerData()
}

function setCompromised(value: number) {
  const s = scene()
  const ship = s.playerShip
  if (!ship) return
  ship.compromised = Math.max(0, value)
  if (ship.compromised >= 10) destroyPlayerShip()
  else if (ship.compromised === 0 && ship.inoperable) clearCompromised()
  broadcastPlayerData()
}

function setStationMalfunction(target: ShipTarget, stationKey: string, malfunctioning: boolean) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (!n) return
    if (!n.stationState[stationKey]) n.stationState[stationKey] = { malfunctioning: false }
    n.stationState[stationKey].malfunctioning = malfunctioning
    logEntry(`${n.label}: ${stationKey} ${malfunctioning ? 'is malfunctioning' : 'repaired'}`, true)
  } else if (s.playerShip) {
    const st = s.playerShip.stations.find(x => x.id === stationKey)
    if (st) {
      st.malfunctioning = malfunctioning
      logEntry(`${s.playerShip.name}: ${st.kind} ${malfunctioning ? 'is malfunctioning' : 'repaired'}`)
    }
  }
  broadcastPlayerData()
}

function repairStation(target: ShipTarget, stationKey: string) {
  setStationMalfunction(target, stationKey, false)
}

/** Repair Self (3 actions): fix one malfunctioning station and regain HP equal to level (p. 208). */
function repairSelf(instanceId: string, stationKey?: string) {
  const n = findNpc(instanceId)
  if (!n || n.destroyed) return
  const key = stationKey ?? Object.entries(n.stationState).find(([, st]) => st.malfunctioning)?.[0]
  if (key && n.stationState[key]) n.stationState[key].malfunctioning = false
  n.currentHP = Math.min(n.model.hp, n.currentHP + Math.max(0, n.model.level))
  logEntry(`${n.label} Repairs Self${key ? ` (${key})` : ''}`, true)
  broadcastPlayerData()
}

function setInoperable(target: ShipTarget, inoperable: boolean) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (n) n.inoperable = inoperable
  } else if (s.playerShip) {
    s.playerShip.inoperable = inoperable
    if (inoperable) for (const st of s.playerShip.stations) st.malfunctioning = true
  }
  broadcastPlayerData()
}

function setOffKilter(target: ShipTarget, offKilter: boolean) {
  const s = scene()
  if (target.kind === 'npc') {
    const n = findNpc(target.instanceId)
    if (n) n.offKilter = offKilter
  } else if (s.playerShip) {
    s.playerShip.offKilter = offKilter
  }
  broadcastPlayerData()
}

function conditionsOf(target: ShipTarget): CombatantCondition[] | undefined {
  if (target.kind === 'npc') return findNpc(target.instanceId)?.conditions
  return scene().playerShip?.conditions
}

function addCondition(target: ShipTarget, name: string, value?: number, note?: string) {
  const list = conditionsOf(target)
  if (!list) return
  const existing = list.find(c => c.name === name)
  if (existing) {
    if (value !== undefined) existing.value = value
    if (note !== undefined) existing.note = note
  } else {
    list.push({ name, ...(value !== undefined ? { value } : {}), ...(note ? { note } : {}) })
  }
  broadcastPlayerData()
}

function removeCondition(target: ShipTarget, name: string) {
  const list = conditionsOf(target)
  if (!list) return
  const idx = list.findIndex(c => c.name === name)
  if (idx !== -1) list.splice(idx, 1)
  broadcastPlayerData()
}

function setHazardDisabled(instanceId: string, disabled: boolean) {
  const h = findHazard(instanceId)
  if (!h) return
  h.disabled = disabled
  if (disabled) removeEntry(instanceId)
  logEntry(`${h.label} ${disabled ? 'disabled' : 're-armed'}`, !h.detected || h.hiddenFromPlayers)
  broadcastPlayerData()
}

function damageHazard(instanceId: string, amount: number, component?: string) {
  const h = findHazard(instanceId)
  if (!h) return
  const dmg = Math.max(0, Math.floor(amount))
  if (component && h.componentHP && h.componentHP[component] !== undefined) {
    h.componentHP[component] = Math.max(0, h.componentHP[component] - dmg)
  } else if (h.currentHP !== undefined) {
    h.currentHP = Math.max(0, h.currentHP - dmg)
    if (h.currentHP === 0) setHazardDisabled(instanceId, true)
  }
  broadcastPlayerData()
}

// ============ Player starship runtime edits ============

function playerShip(): PlayerStarship | null {
  return state.activeScene?.playerShip ?? null
}

function setHelmedBy(stationId: string, name: string | undefined) {
  const ship = playerShip()
  if (!ship) return
  const st = ship.stations.find(x => x.id === stationId)
  if (!st) return
  if (name) for (const other of ship.stations) if (other.helmedBy === name) other.helmedBy = undefined
  st.helmedBy = name
  broadcastPlayerData()
}

function setPilotingDC(dc: number | undefined) {
  const ship = playerShip()
  if (ship) ship.pilotingDC = dc
  broadcastPlayerData()
}

function setScenePlayerShipLevel(level: number) {
  const s = scene()
  if (!s.playerShip) return
  s.playerShip = setPlayerStarshipLevel(s.playerShip, level)
  broadcastPlayerData()
}

function setSceneLevel(level: number) {
  scene().level = level
}

// ============ Identification memory ============

function identifyModel(modelName: string, stationNames: string[]) {
  const current = new Set(state.identifiedModels[modelName] ?? [])
  for (const n of stationNames) current.add(n)
  state.identifiedModels = { ...state.identifiedModels, [modelName]: [...current] }
  saveToLocalStorage()
  broadcastPlayerData()
}

function forgetModel(modelName: string) {
  const copy = { ...state.identifiedModels }
  delete copy[modelName]
  state.identifiedModels = copy
  saveToLocalStorage()
  broadcastPlayerData()
}

function isStationIdentified(modelName: string, stationName: string): boolean {
  return (state.identifiedModels[modelName] ?? []).includes(stationName)
}

// ============ Derived ============

const derivedPlayerShip = computed(() => {
  const ship = state.activeScene?.playerShip
  return ship ? deriveStarshipStats(ship) : null
})

// ============ Init ============

let initialized = false

function init() {
  if (initialized) return
  initialized = true
  state.sessionId = getSessionId()
  initChannel()
  loadFromLocalStorage()
  loadLibrariesFromLocalStorage()
}

watch(() => state.activeScene, () => { if (initialized) saveToLocalStorage() }, { deep: true })

/** Test hook: wipe in-memory state (localStorage is mocked per test). */
export function __resetTscStore() {
  state.savedScenes = []
  state.activeScene = null
  state.playerShips = []
  state.customStarships = []
  state.identifiedModels = {}
  state.playerData = null
  state.isGMView = true
  disableRemoteSync()
  if (channel) { channel.close(); channel = null; currentChannelSession = null }
  initialized = false
}

export function useTscStore() {
  init()
  return {
    state,
    // scenes
    createEmptyTscScene,
    saveScene,
    deleteScene,
    getSavedScene,
    startScene,
    saveActiveSceneAsTemplate,
    endScene,
    exportScenes,
    importScenes,
    // player ships
    savePlayerShip,
    deletePlayerShip,
    newPlayerShip,
    instantiatePlayerShip,
    loadPlayerShipIntoScene,
    exportPlayerShips,
    importPlayerShips,
    setHelmedBy,
    setPilotingDC,
    setScenePlayerShipLevel,
    setSceneLevel,
    derivedPlayerShip,
    // library
    allStarships,
    getStarshipById,
    isCustomStarship,
    addCustomStarship,
    deleteCustomStarship,
    exportCustomStarships,
    importCustomStarships,
    // participants
    addPc,
    removePc,
    setPcStation,
    setPcExplorationActivity,
    addNpcShip,
    removeNpcShip,
    addHazard,
    removeHazard,
    setPosition,
    setHidden,
    setDetected,
    setSensorMapZones,
    // initiative
    currentEntry,
    rollInitiative,
    nextTurn,
    previousTurn,
    setTurn,
    delayTurn,
    endRound,
    removeEntry,
    // damage & repairs
    damageShip,
    healShip,
    restoreShields,
    setHP,
    setSP,
    setWrecked,
    setCompromised,
    hullIntegrityCheck,
    setStationMalfunction,
    repairStation,
    repairSelf,
    setInoperable,
    setOffKilter,
    addCondition,
    removeCondition,
    setHazardDisabled,
    damageHazard,
    // identification
    identifyModel,
    forgetModel,
    isStationIdentified,
    // log
    logEntry,
    // view & sync
    setGMView,
    ensureChannel,
    requestStateFromGM,
    broadcastPlayerData,
    generateShareUrl,
    rotateSession,
    openPlayerView,
    enableRemoteSync,
    joinRemoteSession,
    disableRemoteSync,
    hasRemoteSyncInUrl,
    isSyncAvailable,
  }
}
