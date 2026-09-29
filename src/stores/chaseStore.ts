/**
 * Chase store (Starfinder GM Core pp. 214–217).
 *
 * Owns the saved chase library and the chase being run: obstacles, each side's position and
 * Chase Points, and the condition of any attached vehicles.
 *
 * Sync follows tscStore's model: only a sanitized `player-data` snapshot is ever broadcast,
 * never the raw scene.
 */

import { computed, reactive, watch } from 'vue'
import type {
  ChaseDegree,
  ChaseObstacle,
  ChaseOutcome,
  ChasePlayerData,
  ChaseScene,
  ChaseSide,
  ChaseState,
  ChaseSyncMessage,
  ChaseSyncMessageType,
  ChaseVehicleInstance,
  SavedChase,
} from '../types/chase'
import type { Player } from '../types/party'
import type { Vehicle } from '../types/tsc'
import {
  PASS_PENALTY,
  applyChasePoints,
  applyVehicleDamage,
  chasePointsForDegree,
  checkOutcome,
  createSceneFromSaved,
  createVehicleInstance,
  currentObstacle,
  hasFinished,
  moveSide,
  repairVehicle as restoreVehicleHP,
  revealReached,
  turnOrder,
  vehicleCondition,
} from '../utils/chaseRules'
import { degreeOfSuccess } from '../utils/tscDerive'
import { rollD20 } from '../utils/dice'
import { sendTurnChange } from '../utils/discordIntegration'
import { createSyncTransport, isWebSocketSupported, isSyncAvailable, type SyncMessage, type ConnectionState } from '../utils/syncTransport'

// ============ Storage keys ============

const STORAGE_KEY = 'sf2e-chase'
const SESSION_KEY = 'sf2e-chase-session'
const LOG_LIMIT = 200

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

const state = reactive<ChaseState>({
  savedChases: [],
  hiddenExamples: [],
  activeScene: null,
  sessionId: '',
  isGMView: true,
  playerData: null,
  wsConnectionState: 'disconnected',
  isRemoteSyncEnabled: false,
})

// ============ Player view snapshot ============

/**
 * What players may see. Face-down obstacles carry no name, options or DCs; the other side's
 * vehicles show a condition band instead of numbers; GM-only log entries are dropped.
 */
export function buildChasePlayerData(scene: ChaseScene | null): ChasePlayerData | null {
  if (!scene) return null
  return {
    name: scene.name,
    type: scene.type,
    roundLength: scene.roundLength,
    round: scene.round,
    roundLimit: scene.end.roundLimit,
    obstacleCount: scene.obstacles.length,
    obstacles: scene.obstacles.map((o, index) => o.revealedToPlayers
      ? {
          index,
          revealed: true,
          name: o.name,
          level: o.level,
          environment: o.environment,
          chasePoints: o.chasePoints,
          description: o.description,
          options: o.options.map(opt => ({ dc: opt.dc, skills: [...opt.skills], description: opt.description })),
        }
      : { index, revealed: false }),
    sides: scene.sides.map(side => ({
      id: side.id,
      name: side.name,
      role: side.role,
      isPlayers: side.isPlayers,
      position: side.position,
      chasePoints: side.isPlayers ? side.chasePoints : undefined,
      members: side.isPlayers ? side.members.map(m => ({ name: m.name, hasActed: m.hasActed })) : [],
      vehicles: side.vehicles.map(v => ({
        label: v.label,
        name: v.vehicle.name,
        condition: vehicleCondition(v),
        uncontrolled: v.uncontrolled,
        currentHP: side.isPlayers ? v.currentHP : undefined,
        maxHP: side.isPlayers ? v.vehicle.hp : undefined,
        pilotName: side.isPlayers ? side.members.find(m => m.id === v.pilotMemberId)?.name : undefined,
      })),
    })),
    outcome: scene.outcome,
    log: scene.log.filter(e => !e.gmOnly).slice(-12),
  }
}

// ============ Sync plumbing ============

let wsTransport: ReturnType<typeof createSyncTransport> | null = null
let stateRetryTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let channel: BroadcastChannel | null = null
let currentChannelSession: string | null = null

function handleSyncMessage(message: ChaseSyncMessage) {
  if (message.type === 'player-data' && !state.isGMView) {
    state.playerData = message.payload as ChasePlayerData | null
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
    channel = new BroadcastChannel(`sf2e-chase-${state.sessionId}`)
    currentChannelSession = state.sessionId
    channel.onmessage = (event) => handleSyncMessage(event.data as ChaseSyncMessage)
  }
}

function send(type: ChaseSyncMessageType, payload: unknown) {
  // Round-trip through JSON to strip Vue proxies (structuredClone throws on them).
  const safePayload = payload === undefined || payload === null ? null : JSON.parse(JSON.stringify(payload))
  const message: ChaseSyncMessage = { type, payload: safePayload, timestamp: Date.now() }
  if (channel) channel.postMessage(message)
  if (wsTransport && state.isRemoteSyncEnabled) wsTransport.send({ type, payload: safePayload })
}

function broadcastPlayerData() {
  if (!state.isGMView) return
  send('player-data', buildChasePlayerData(state.activeScene))
}

function handleRemoteMessage(message: SyncMessage) {
  if (message.type === 'init') return
  handleSyncMessage({ type: message.type as ChaseSyncMessageType, payload: message.payload, timestamp: Date.now() })
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
    console.error('[Chase] Failed to enable remote sync:', e)
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
    console.error('[Chase] Failed to join remote session:', e)
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
  return `${baseUrl}#/chase/view?session=${state.sessionId}${syncParam}`
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
    console.warn('[Chase] Clipboard copy failed:', e)
  }
  window.open(url, '_blank', 'width=1920,height=1080')
  return { success: copied, syncEnabled }
}

/** Player view: ask the GM tab for state; fall back to the same-device localStorage copy. */
function requestStateFromGM() {
  if (channel) channel.postMessage({ type: 'request-state', payload: null, timestamp: Date.now() })
  if (!state.playerData) {
    loadFromLocalStorage()
    state.playerData = buildChasePlayerData(state.activeScene)
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
    savedChases: state.savedChases,
    hiddenExamples: state.hiddenExamples,
    activeScene: state.activeScene,
  }))
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const data = JSON.parse(saved)
    if (Array.isArray(data.savedChases)) state.savedChases = data.savedChases
    if (Array.isArray(data.hiddenExamples)) state.hiddenExamples = data.hiddenExamples
    if (data.activeScene) state.activeScene = data.activeScene
  } catch (e) {
    console.warn('[Chase] Failed to load saved state:', e)
  }
}

// ============ Library ============

function saveChase(chase: SavedChase): void {
  const copy: SavedChase = JSON.parse(JSON.stringify(chase))
  copy.savedAt = Date.now()
  const index = state.savedChases.findIndex(c => c.id === copy.id)
  if (index >= 0) state.savedChases[index] = copy
  else state.savedChases.push(copy)
  saveToLocalStorage()
}

function deleteChase(id: string): void {
  state.savedChases = state.savedChases.filter(c => c.id !== id)
  saveToLocalStorage()
}

/** Take a bundled example out of the list. It stays out until the examples are restored. */
function hideExample(id: string): void {
  if (!state.hiddenExamples.includes(id)) state.hiddenExamples.push(id)
  saveToLocalStorage()
}

function restoreExamples(): void {
  state.hiddenExamples = []
  saveToLocalStorage()
}

function getSavedChase(id: string): SavedChase | undefined {
  return state.savedChases.find(c => c.id === id)
}

function exportChases(): string {
  return JSON.stringify({ version: 1, chases: state.savedChases }, null, 2)
}

/** Merge by id: an imported chase replaces a saved one with the same id. */
function importChases(json: string | unknown): number {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  const list: unknown = Array.isArray(data) ? data : (data as { chases?: unknown })?.chases
  if (!Array.isArray(list)) throw new Error('No chases found in the file')
  let count = 0
  for (const item of list as SavedChase[]) {
    if (!item || typeof item.id !== 'string' || !Array.isArray(item.obstacles) || !Array.isArray(item.sides)) continue
    saveChase(item)
    count++
  }
  return count
}

// ============ Running a chase ============

function log(text: string, gmOnly = false): void {
  const scene = state.activeScene
  if (!scene) return
  scene.log.push({ id: crypto.randomUUID(), round: scene.round, text, gmOnly: gmOnly || undefined, timestamp: Date.now() })
  if (scene.log.length > LOG_LIMIT) scene.log.splice(0, scene.log.length - LOG_LIMIT)
}

function getSide(sideId: string): ChaseSide | undefined {
  return state.activeScene?.sides.find(s => s.id === sideId)
}

/** Note an end condition for the GM to confirm. The chase never ends on its own. */
function evaluate(atEndOfRound: boolean): void {
  const scene = state.activeScene
  if (!scene || scene.outcome) return
  const found = checkOutcome(scene, atEndOfRound)
  if (found) scene.pendingOutcome = found
  else if (!atEndOfRound && scene.pendingOutcome?.kind !== 'trail-lost' && scene.pendingOutcome?.kind !== 'out-of-time') {
    scene.pendingOutcome = null
  }
}

function describeAdvance(side: ChaseSide, overcame: ChaseObstacle | undefined): void {
  const scene = state.activeScene
  if (!scene || !overcame) return
  const next = currentObstacle(scene, side)
  log(next
    ? `${side.name} overcome ${overcame.name} and reach ${side.isPlayers || next.revealedToPlayers ? next.name : 'the next obstacle'}.`
    : `${side.name} overcome ${overcame.name}, the last obstacle.`)
}

/** Steady sides with this role clear `pace` obstacles. */
function advanceSteadySides(roles: ChaseSide['role'][]): void {
  const scene = state.activeScene
  if (!scene) return
  for (const side of turnOrder(scene.sides)) {
    if (side.control !== 'steady' || !roles.includes(side.role) || hasFinished(scene, side)) continue
    if (side.pace <= 0) continue
    const before = side.position
    moveSide(scene, side, side.pace)
    if (side.position !== before) {
      const at = currentObstacle(scene, side)
      log(at
        ? `${side.name} move on to ${at.revealedToPlayers ? at.name : 'the next obstacle'}.`
        : `${side.name} clear the last obstacle.`)
    }
  }
}

function startChase(saved: SavedChase): void {
  state.activeScene = createSceneFromSaved(saved)
  log(`${saved.name} begins.`)
  // The pursued act first each round, so a quarry moving at a steady pace moves now
  advanceSteadySides(['pursued'])
  evaluate(false)
}

function startSavedChase(id: string): boolean {
  const saved = getSavedChase(id)
  if (!saved) return false
  startChase(saved)
  return true
}

function endChase(): void {
  state.activeScene = null
  saveToLocalStorage()
  broadcastPlayerData()
}

function confirmOutcome(): void {
  const scene = state.activeScene
  if (!scene?.pendingOutcome) return
  scene.outcome = scene.pendingOutcome
  scene.pendingOutcome = null
  log(scene.outcome.text)
}

function dismissOutcome(): void {
  if (state.activeScene) state.activeScene.pendingOutcome = null
}

function setOutcome(outcome: ChaseOutcome | null): void {
  const scene = state.activeScene
  if (!scene) return
  scene.outcome = outcome
  scene.pendingOutcome = null
  if (outcome) log(outcome.text)
}

const DEGREE_LABELS: Record<ChaseDegree, string> = {
  criticalSuccess: 'critical success',
  success: 'success',
  failure: 'failure',
  criticalFailure: 'critical failure',
}

/**
 * Record a member's check against the obstacle their side faces. The member has then taken
 * their turn for the round.
 */
function resolveCheck(
  sideId: string,
  memberId: string | null,
  degree: ChaseDegree,
  detail: { optionId?: string; skill?: string } = {},
): { advanced: boolean } {
  const scene = state.activeScene
  const side = getSide(sideId)
  if (!scene || !side) return { advanced: false }
  const obstacle = currentObstacle(scene, side)
  if (!obstacle) return { advanced: false }
  const member = side.members.find(m => m.id === memberId)
  const option = obstacle.options.find(o => o.id === detail.optionId)
  const points = chasePointsForDegree(degree)
  const result = applyChasePoints(scene, side, points)
  if (member) member.hasActed = true

  const who = member?.name ?? side.name
  const how = detail.skill ?? option?.skills.join(' or ')
  const change = points > 0 ? `+${points}` : points < 0 ? `${points}` : 'no'
  log(`${who}: ${DEGREE_LABELS[degree]}${how ? ` on ${how}` : ''} against ${obstacle.name} (${change} Chase Point${Math.abs(points) === 1 ? '' : 's'}).`, !side.isPlayers)
  if (result.advanced) describeAdvance(side, result.overcame)
  evaluate(false)
  return { advanced: result.advanced }
}

/** Roll the check here: d20 plus the modifier against the option's DC. */
function rollCheck(
  sideId: string,
  memberId: string | null,
  optionId: string,
  modifier: number,
  skill?: string,
): { degree: ChaseDegree; total: number; natural: number } | null {
  const scene = state.activeScene
  const side = getSide(sideId)
  if (!scene || !side) return null
  const obstacle = currentObstacle(scene, side)
  const option = obstacle?.options.find(o => o.id === optionId)
  if (!obstacle || !option || option.dc === undefined) return null
  const member = side.members.find(m => m.id === memberId)
  const label = skill ?? option.skills.join(' or ')
  const roll = rollD20(modifier, `${label || 'Check'} vs DC ${option.dc} (${obstacle.name})`, member?.name ?? side.name)
  const degree = degreeOfSuccess(roll.total, option.dc, roll.roll)
  resolveCheck(sideId, memberId, degree, { optionId, skill })
  return { degree, total: roll.total, natural: roll.roll }
}

/** An approach that helps without a check: 1 Chase Point, or 2 if it is extremely helpful. */
function grantPoints(sideId: string, memberId: string | null, points: number, reason = ''): { advanced: boolean } {
  const scene = state.activeScene
  const side = getSide(sideId)
  if (!scene || !side) return { advanced: false }
  const obstacle = currentObstacle(scene, side)
  if (!obstacle) return { advanced: false }
  const member = side.members.find(m => m.id === memberId)
  const result = applyChasePoints(scene, side, points)
  if (member) member.hasActed = true
  const change = points >= 0 ? `+${points}` : `${points}`
  log(`${member?.name ?? side.name}: ${change} Chase Point${Math.abs(points) === 1 ? '' : 's'} against ${obstacle.name}${reason ? ` (${reason})` : ''}.`, !side.isPlayers)
  if (result.advanced) describeAdvance(side, result.overcame)
  evaluate(false)
  return { advanced: result.advanced }
}

/** A member who passes or can't act costs the group 1 Chase Point. */
function passTurn(sideId: string, memberId: string): void {
  const scene = state.activeScene
  const side = getSide(sideId)
  const member = side?.members.find(m => m.id === memberId)
  if (!scene || !side || !member) return
  const obstacle = currentObstacle(scene, side)
  member.hasActed = true
  if (!obstacle) return
  applyChasePoints(scene, side, PASS_PENALTY)
  log(`${member.name} can't help against ${obstacle.name} (${PASS_PENALTY} Chase Point).`, !side.isPlayers)
}

function setMemberActed(sideId: string, memberId: string, hasActed: boolean): void {
  const member = getSide(sideId)?.members.find(m => m.id === memberId)
  if (member) member.hasActed = hasActed
}

/** Move a side forward or back by hand: a shortcut, a setback, or a correction. */
function nudgeSide(sideId: string, delta: number): void {
  const scene = state.activeScene
  const side = getSide(sideId)
  if (!scene || !side) return
  const before = side.position
  moveSide(scene, side, delta)
  if (side.position === before) return
  log(`${side.name} moved ${delta > 0 ? 'ahead' : 'back'} ${Math.abs(side.position - before)} by the GM.`, true)
  evaluate(false)
}

function setChasePoints(sideId: string, points: number): void {
  const scene = state.activeScene
  const side = getSide(sideId)
  if (!scene || !side) return
  const result = applyChasePoints(scene, side, Math.max(0, Math.floor(points)) - side.chasePoints)
  if (result.advanced) describeAdvance(side, result.overcame)
  evaluate(false)
}

/**
 * Close the round: steady pursuers and competitors move, end conditions are judged, and unless
 * one was met the next round opens with the steady pursued moving first.
 */
function endRound(): void {
  const scene = state.activeScene
  if (!scene || scene.outcome) return
  advanceSteadySides(['competitor', 'pursuer'])
  evaluate(true)
  if (scene.pendingOutcome) return
  beginNextRound()
}

function beginNextRound(): void {
  const scene = state.activeScene
  if (!scene) return
  for (const side of scene.sides) {
    if (currentObstacle(scene, side)) side.roundsAtObstacle++
    for (const m of side.members) m.hasActed = false
  }
  scene.round++
  log(`Round ${scene.round} begins.`)
  advanceSteadySides(['pursued'])
  evaluate(false)
  const first = turnOrder(scene.sides)[0]
  if (first) sendTurnChange(first.name, scene.round, first.isPlayers)
}

/** Carry on after the GM dismisses an end condition that was met at the end of a round. */
function continueAfterDismiss(): void {
  const scene = state.activeScene
  if (!scene) return
  scene.pendingOutcome = null
  beginNextRound()
}

function revealObstacle(obstacleId: string, revealed: boolean): void {
  const scene = state.activeScene
  const obstacle = scene?.obstacles.find(o => o.id === obstacleId)
  if (!scene || !obstacle) return
  obstacle.revealedToPlayers = revealed
  // Obstacles the party has reached stay face up
  revealReached(scene)
}

// ============ Members ============

function addMember(sideId: string, name: string, playerId?: string): void {
  const side = getSide(sideId)
  if (!side || !name.trim()) return
  side.members.push({ id: crypto.randomUUID(), name: name.trim(), playerId, hasActed: false })
}

function removeMember(sideId: string, memberId: string): void {
  const side = getSide(sideId)
  if (!side) return
  side.members = side.members.filter(m => m.id !== memberId)
  for (const v of side.vehicles) if (v.pilotMemberId === memberId) v.pilotMemberId = undefined
}

/** Add every party member who is not already on the side. */
function addMembersFromParty(sideId: string, players: Player[]): number {
  const side = getSide(sideId)
  if (!side) return 0
  let added = 0
  for (const p of players) {
    if (side.members.some(m => m.playerId === p.id)) continue
    side.members.push({ id: crypto.randomUUID(), name: p.name, playerId: p.id, hasActed: false })
    added++
  }
  return added
}

// ============ Vehicles ============

function findVehicle(instanceId: string): { side: ChaseSide; vehicle: ChaseVehicleInstance } | null {
  for (const side of state.activeScene?.sides ?? []) {
    const vehicle = side.vehicles.find(v => v.instanceId === instanceId)
    if (vehicle) return { side, vehicle }
  }
  return null
}

function attachVehicle(sideId: string, vehicle: Vehicle): ChaseVehicleInstance | null {
  const side = getSide(sideId)
  if (!side) return null
  const same = side.vehicles.filter(v => v.vehicle.id === vehicle.id).length
  const instance = createVehicleInstance(vehicle, same ? `${vehicle.name} ${same + 1}` : vehicle.name)
  side.vehicles.push(instance)
  log(`${side.name} take ${instance.label}.`, !side.isPlayers)
  return instance
}

function detachVehicle(instanceId: string): void {
  const found = findVehicle(instanceId)
  if (!found) return
  found.side.vehicles = found.side.vehicles.filter(v => v.instanceId !== instanceId)
}

function damageVehicle(instanceId: string, amount: number, options: { ignoreHardness?: boolean } = {}): number {
  const found = findVehicle(instanceId)
  if (!found || !(amount > 0)) return 0
  const before = vehicleCondition(found.vehicle)
  const dealt = applyVehicleDamage(found.vehicle, amount, options)
  const after = vehicleCondition(found.vehicle)
  const hardness = options.ignoreHardness ? '' : `, ${found.vehicle.vehicle.hardness} stopped by Hardness`
  log(`${found.vehicle.label} takes ${dealt} damage (${amount} dealt${hardness}).`, !found.side.isPlayers)
  if (after !== before && (after === 'broken' || after === 'destroyed')) {
    log(`${found.vehicle.label} is ${after}.`)
  }
  return dealt
}

function repairVehicle(instanceId: string, amount: number): number {
  const found = findVehicle(instanceId)
  if (!found || !(amount > 0)) return 0
  const restored = restoreVehicleHP(found.vehicle, amount)
  if (restored) log(`${found.vehicle.label} regains ${restored} Hit Points.`, !found.side.isPlayers)
  return restored
}

function setVehicleHP(instanceId: string, hp: number): void {
  const found = findVehicle(instanceId)
  if (!found) return
  found.vehicle.currentHP = Math.max(0, Math.min(found.vehicle.vehicle.hp, Math.floor(hp)))
}

function setUncontrolled(instanceId: string, uncontrolled: boolean): void {
  const found = findVehicle(instanceId)
  if (!found || found.vehicle.uncontrolled === uncontrolled) return
  found.vehicle.uncontrolled = uncontrolled
  log(`${found.vehicle.label} ${uncontrolled ? 'goes out of control' : 'is back under control'}.`)
}

function setPilot(instanceId: string, memberId: string | undefined): void {
  const found = findVehicle(instanceId)
  if (!found) return
  found.vehicle.pilotMemberId = memberId || undefined
}

function renameVehicle(instanceId: string, label: string): void {
  const found = findVehicle(instanceId)
  if (found && label.trim()) found.vehicle.label = label.trim()
}

// ============ Computed ============

const isActive = computed(() => !!state.activeScene)

/** The players' lead over the nearest opposing side, in obstacles. Negative when behind. */
const gap = computed<number | null>(() => {
  const scene = state.activeScene
  if (!scene) return null
  const players = scene.sides.find(s => s.isPlayers)
  const others = scene.sides.filter(s => !s.isPlayers)
  if (!players || others.length === 0) return null
  const diffs = others.map(o => players.position - o.position)
  return diffs.reduce((closest, d) => (Math.abs(d) < Math.abs(closest) ? d : closest))
})

// ============ Init ============

let initialized = false

function init() {
  if (initialized) return
  initialized = true
  state.sessionId = getSessionId()
  initChannel()
  loadFromLocalStorage()
}

watch(() => state.activeScene, () => {
  if (!initialized) return
  saveToLocalStorage()
  broadcastPlayerData()
}, { deep: true })

/** Test hook: wipe in-memory state (localStorage is mocked per test). */
export function __resetChaseStore() {
  state.savedChases = []
  state.hiddenExamples = []
  state.activeScene = null
  state.playerData = null
  state.isGMView = true
  disableRemoteSync()
  if (channel) { channel.close(); channel = null; currentChannelSession = null }
  initialized = false
}

export function useChaseStore() {
  init()
  return {
    state,
    isActive,
    gap,
    // library
    saveChase,
    deleteChase,
    hideExample,
    restoreExamples,
    getSavedChase,
    exportChases,
    importChases,
    // running
    startChase,
    startSavedChase,
    endChase,
    endRound,
    continueAfterDismiss,
    confirmOutcome,
    dismissOutcome,
    setOutcome,
    resolveCheck,
    rollCheck,
    grantPoints,
    passTurn,
    setMemberActed,
    nudgeSide,
    setChasePoints,
    revealObstacle,
    // members
    addMember,
    removeMember,
    addMembersFromParty,
    // vehicles
    attachVehicle,
    detachVehicle,
    damageVehicle,
    repairVehicle,
    setVehicleHP,
    setUncontrolled,
    setPilot,
    renameVehicle,
    // sharing and sync
    broadcastPlayerData,
    generateShareUrl,
    openPlayerView,
    rotateSession,
    setGMView,
    ensureChannel,
    requestStateFromGM,
    enableRemoteSync,
    joinRemoteSession,
    disableRemoteSync,
    hasRemoteSyncInUrl,
    isSyncAvailable,
  }
}
