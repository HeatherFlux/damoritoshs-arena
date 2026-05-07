import { reactive, watch } from 'vue'
import type {
  StarshipState,
  StarshipScene,
  SavedScene,
  SavedStarship,
  Starship,
  StarshipThreat,
  RoleAssignment,
  ActionLogEntry,
  StarshipSyncMessage,
  StarshipSyncMessageType,
  InitiativeEntry,
  ThreatRoutineAction
} from '../types/starship'
import {
  createDefaultThreat,
  createSceneFromSaved,
  createEmptySavedScene
} from '../types/starship'
import { createSyncTransport, isWebSocketSupported, isSyncAvailable, type SyncMessage, type ConnectionState } from '../utils/syncTransport'

// Storage keys
const STORAGE_KEY = 'sf2e-starship'
const STARSHIP_TEMPLATES_KEY = 'sf2e-starship-templates'

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
  savedStarships: [],
  activeScene: null,
  editingStarship: null,
  sessionId: '',
  isGMView: true,
  showPlayerView: false,
  // Real-time sync
  wsConnectionState: 'disconnected',
  isRemoteSyncEnabled: false,
  // Scene editing state
  editingSceneId: null
})

// WebSocket transport reference (independent instance, not the hacking singleton)
let wsTransport: ReturnType<typeof createSyncTransport> | null = null
let stateRetryTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

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
  if (!state.isGMView) return

  // BroadcastChannel.postMessage uses the structuredClone algorithm,
  // which throws DataCloneError on Vue reactive Proxy objects. Most of
  // our payloads are reactive references into state.activeScene (the
  // ship, threats, the scene itself), so we deep-strip reactivity by
  // round-tripping through JSON before sending. Same problem applies to
  // the WebSocket transport. Fixes session-13 nextTurn bug where the
  // BroadcastChannel throw killed the rest of nextTurn after the round
  // had already incremented, leaving initiative frozen on the last
  // entry while the round counter kept ticking up.
  const safePayload = payload === undefined ? undefined : JSON.parse(JSON.stringify(payload))

  // Local tabs via BroadcastChannel
  if (channel) {
    const message: StarshipSyncMessage = {
      type,
      payload: safePayload,
      timestamp: Date.now()
    }
    console.log('[Starship] Broadcasting:', type)
    channel.postMessage(message)
  }

  // Remote devices via WebSocket (only if GM and sync enabled)
  if (wsTransport && state.isRemoteSyncEnabled) {
    wsTransport.send({ type, payload: safePayload })
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
    case 'initiative-update':
      if (state.activeScene) {
        state.activeScene.initiativeOrder = message.payload as InitiativeEntry[]
        state.activeScene.initiativeRolled = true
      }
      break
    case 'turn-change':
      if (state.activeScene) {
        const payload = message.payload as { currentTurnIndex: number; initiativeOrder: InitiativeEntry[] }
        state.activeScene.currentTurnIndex = payload.currentTurnIndex
        state.activeScene.initiativeOrder = payload.initiativeOrder
      }
      break
  }
}

// ============ Scene Management ============

function saveScene(scene?: Partial<SavedScene>): SavedScene {
  // Deep clone the input so the saved entry is fully decoupled from the
  // caller's reference. Without this, editing activeSetup after a save
  // would silently mutate state.savedScenes[idx] (shared nested arrays
  // and objects: threats, starshipActions, outcomes, bonuses…).
  const merged = {
    ...createEmptySavedScene(),
    ...scene,
    savedAt: Date.now()
  }
  const newScene: SavedScene = JSON.parse(JSON.stringify(merged))

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

// ============ Starship Template Management ============

/**
 * Save the given starship config as a reusable template. If a template with
 * the same id already exists, it's updated in place. Otherwise a new entry
 * is created with a fresh UUID. Returns the persisted template.
 *
 * The starship snapshot is deep-cloned so further edits to the source
 * Starship object don't quietly mutate the saved template (mirrors the
 * pattern in saveScene to avoid the same shared-reference class of bugs).
 */
function saveStarshipTemplate(input: {
  name: string
  starship: Starship
  description?: string
  isCampaignShip?: boolean
  id?: string
}): SavedStarship {
  const id = input.id ?? crypto.randomUUID()
  const template: SavedStarship = {
    id,
    name: input.name.trim() || input.starship.name || 'Unnamed Ship',
    description: input.description,
    isCampaignShip: input.isCampaignShip ?? false,
    starship: JSON.parse(JSON.stringify({ ...input.starship, templateId: id })),
    savedAt: Date.now(),
  }

  const existingIdx = state.savedStarships.findIndex(s => s.id === id)
  if (existingIdx !== -1) {
    state.savedStarships[existingIdx] = template
  } else {
    state.savedStarships.push(template)
  }
  saveStarshipsToLocalStorage()
  return template
}

/**
 * Load a saved starship template into a fresh Starship config that can be
 * dropped into a scene's starship slot. The returned ship's templateId is
 * preserved so endScene knows where to write campaign-state back to.
 */
function loadStarshipTemplate(templateId: string): Starship | null {
  const template = state.savedStarships.find(s => s.id === templateId)
  if (!template) return null
  const ship: Starship = JSON.parse(JSON.stringify(template.starship))
  ship.templateId = template.id
  if (!template.isCampaignShip) {
    // Non-campaign templates start each scene at full strength. Campaign
    // ships preserve persisted currentHP/currentShields (set on endScene)
    // so damage carries forward between encounters.
    ship.currentHP = ship.maxHP
    ship.currentShields = ship.maxShields
  }
  return ship
}

function deleteStarshipTemplate(templateId: string) {
  const idx = state.savedStarships.findIndex(s => s.id === templateId)
  if (idx !== -1) {
    state.savedStarships.splice(idx, 1)
    saveStarshipsToLocalStorage()
  }
}

function renameStarshipTemplate(templateId: string, name: string) {
  const t = state.savedStarships.find(s => s.id === templateId)
  if (!t) return
  t.name = name.trim() || t.name
  t.savedAt = Date.now()
  saveStarshipsToLocalStorage()
}

function setStarshipTemplateCampaignFlag(templateId: string, isCampaignShip: boolean) {
  const t = state.savedStarships.find(s => s.id === templateId)
  if (!t) return
  t.isCampaignShip = isCampaignShip
  saveStarshipsToLocalStorage()
}

function exportStarshipTemplates(): string {
  return JSON.stringify(state.savedStarships, null, 2)
}

function importStarshipTemplates(json: string) {
  const parsed = JSON.parse(json) as SavedStarship[]
  if (!Array.isArray(parsed)) throw new Error('Expected an array of starship templates')
  for (const template of parsed) {
    const existingIdx = state.savedStarships.findIndex(s => s.id === template.id)
    if (existingIdx !== -1) {
      state.savedStarships[existingIdx] = template
    } else {
      state.savedStarships.push(template)
    }
  }
  saveStarshipsToLocalStorage()
}

function startScene(saved: SavedScene): StarshipScene {
  const scene = createSceneFromSaved(saved)
  // Campaign continuity: createSceneFromSaved resets currentHP/Shields to
  // max on every start. For ships linked to a saved campaign template we
  // override that reset and pull the persisted post-scene state instead,
  // so damage from a previous encounter actually carries forward.
  const linkedId = scene.starship.templateId
  if (linkedId) {
    const template = state.savedStarships.find(t => t.id === linkedId)
    if (template?.isCampaignShip) {
      scene.starship.currentHP = template.starship.currentHP ?? scene.starship.maxHP
      scene.starship.currentShields = template.starship.currentShields ?? scene.starship.maxShields
    }
  }
  state.activeScene = scene
  broadcast('scene-update', state.activeScene)
  saveToLocalStorage()
  return state.activeScene
}

/**
 * Persist whatever's currently in state.activeScene to localStorage and
 * broadcast a fresh scene-update to player views. Used by in-scene
 * editors (e.g. tweaking VP target / scene name during play) that mutate
 * the activeScene directly without going through a typed mutator.
 */
function persistActiveScene() {
  if (!state.activeScene) return
  broadcast('scene-update', state.activeScene)
  saveToLocalStorage()
}

function endScene() {
  // Campaign continuity: if the running scene's ship is linked to a template
  // marked isCampaignShip, persist the current HP/Shields back to the
  // template so the next scene starts from the post-encounter state. This
  // is opt-in per template so a one-shot ship doesn't accidentally carry
  // damage forward between unrelated scenes.
  const ship = state.activeScene?.starship
  const linkedId = ship?.templateId
  if (ship && linkedId) {
    const template = state.savedStarships.find(t => t.id === linkedId)
    if (template?.isCampaignShip) {
      // Persist live state. Keep maxHP/maxShields untouched — only
      // currentHP/currentShields and (defensively) anything the GM may
      // have edited mid-scene like AC, saves, or bonuses.
      template.starship = {
        ...template.starship,
        ac: ship.ac,
        fortitude: ship.fortitude,
        reflex: ship.reflex,
        maxHP: ship.maxHP,
        maxShields: ship.maxShields,
        shieldRegen: ship.shieldRegen,
        currentHP: ship.currentHP,
        currentShields: ship.currentShields,
        bonuses: { ...ship.bonuses },
        templateId: linkedId,
      }
      template.savedAt = Date.now()
      saveStarshipsToLocalStorage()
    }
  }
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
  // Guard against negative/zero damage. Healing must go through healStarship
  // / setShields so it can be clamped against max.
  if (damage <= 0) return

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

  // Also regenerate threat shields. Treat undefined currentShields as 0 so
  // threats authored with maxShields but no explicit currentShields (e.g.
  // imported from older bundles) still regenerate. Skip only when the
  // threat genuinely has no shield system (maxShields = 0/undefined) or
  // no regen rate. Covered by the "currentShields=undefined" regression
  // test in starshipStore.test.ts.
  for (const threat of state.activeScene.threats) {
    if (threat.isDefeated) continue
    const regen = threat.shieldRegen ?? 0
    const max = threat.maxShields ?? 0
    if (regen > 0 && max > 0) {
      const cur = threat.currentShields ?? 0
      threat.currentShields = Math.min(max, cur + regen)
      broadcast('threat-update', threat)
    }
  }

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
  // Guard against negative/zero damage. Threat heals should go through
  // updateThreat with explicit clamping at the call site.
  if (damage <= 0) return

  const threat = state.activeScene.threats.find(t => t.id === threatId)
  if (!threat || threat.currentHP === undefined) return

  let remaining = damage

  // Apply to shields first (mirrors damageStarship)
  if (threat.currentShields !== undefined && threat.currentShields > 0) {
    const shieldDmg = Math.min(threat.currentShields, remaining)
    threat.currentShields -= shieldDmg
    remaining -= shieldDmg
  }

  // Apply remaining to HP
  if (remaining > 0) {
    threat.currentHP = Math.max(0, threat.currentHP - remaining)
    if (threat.currentHP === 0) {
      threat.isDefeated = true
    }
  }

  broadcast('threat-update', threat)
  saveToLocalStorage()
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

  // Clamp at zero — addVP(-N) used to silently push currentVP negative,
  // which the VP card would then render as e.g. "-3 / 5 VP".
  state.activeScene.currentVP = Math.max(0, state.activeScene.currentVP + amount)
  broadcast('vp-change', state.activeScene.currentVP)
  saveToLocalStorage()
}

function setVP(amount: number) {
  if (!state.activeScene) return

  state.activeScene.currentVP = Math.max(0, amount)
  broadcast('vp-change', state.activeScene.currentVP)
  saveToLocalStorage()
}

// ============ Initiative Management ============

interface PCInitiativeInput {
  playerId?: string
  playerName: string
  roleId: string
  roleSkill?: string
  roll: number
}

function rollInitiative(pcInitiatives: PCInitiativeInput[]) {
  if (!state.activeScene) return

  const entries: InitiativeEntry[] = []

  // Create PC entries
  for (const pc of pcInitiatives) {
    entries.push({
      id: crypto.randomUUID(),
      name: pc.playerName,
      type: 'pc',
      roleId: pc.roleId,
      roleSkill: pc.roleSkill,
      initiative: pc.roll,
      hasActedThisRound: false
    })
  }

  // Create threat entries (auto-roll using initiativeBonus)
  for (const threat of state.activeScene.threats) {
    if (threat.isDefeated) continue

    const bonus = threat.initiativeBonus ?? 0
    // Roll 1d20 + bonus
    const roll = Math.floor(Math.random() * 20) + 1 + bonus

    entries.push({
      id: crypto.randomUUID(),
      name: threat.name,
      type: 'threat',
      threatId: threat.id,
      initiative: roll,
      hasActedThisRound: false
    })
  }

  // Sort descending by initiative
  entries.sort((a, b) => b.initiative - a.initiative)

  state.activeScene.initiativeOrder = entries
  state.activeScene.currentTurnIndex = 0
  state.activeScene.initiativeRolled = true

  broadcast('initiative-update', entries)
  saveToLocalStorage()
}

function getCurrentTurn(): InitiativeEntry | null {
  if (!state.activeScene || !state.activeScene.initiativeRolled) return null
  return state.activeScene.initiativeOrder[state.activeScene.currentTurnIndex] ?? null
}

function nextTurn() {
  if (!state.activeScene || !state.activeScene.initiativeRolled) return

  const order = state.activeScene.initiativeOrder
  // Guard: if initiative was "rolled" but the order is empty (GM clicked
  // Skip Initiative), nextTurn would fall into the wrap-around path on
  // every call — `(0+1) % 0 === NaN` and `NaN <= 0` is false, but the
  // `order.every(...)` is vacuously true on an empty array, so each
  // click would silently advance the round. Refuse to do anything;
  // the GM should use Next Round explicitly.
  if (order.length === 0) return

  const currentIdx = state.activeScene.currentTurnIndex

  // Mark current as acted
  if (order[currentIdx]) {
    order[currentIdx].hasActedThisRound = true
  }

  // Find next who hasn't acted
  let nextIdx = (currentIdx + 1) % order.length

  // If we've wrapped around, check if everyone has acted
  if (nextIdx <= currentIdx || order.every(e => e.hasActedThisRound)) {
    // Everyone has acted - advance round
    advanceRound()
    // Reset hasActedThisRound for all
    for (const entry of order) {
      entry.hasActedThisRound = false
    }
    // Reset routine actions for all threats
    resetRoutineActions()
    nextIdx = 0
  }

  state.activeScene.currentTurnIndex = nextIdx

  broadcast('turn-change', {
    currentTurnIndex: nextIdx,
    initiativeOrder: order
  })
  saveToLocalStorage()
}

function delayTurn() {
  if (!state.activeScene || !state.activeScene.initiativeRolled) return

  const order = state.activeScene.initiativeOrder
  const currentIdx = state.activeScene.currentTurnIndex

  // Can't delay if last in order this round
  const remainingEntries = order.filter((e, i) => i > currentIdx && !e.hasActedThisRound)
  if (remainingEntries.length === 0) return

  // Remove current from position and insert one spot later
  const [current] = order.splice(currentIdx, 1)
  order.splice(currentIdx + 1, 0, current)

  // Current turn index stays the same (now points to next combatant)
  broadcast('turn-change', {
    currentTurnIndex: currentIdx,
    initiativeOrder: order
  })
  saveToLocalStorage()
}

function endRound() {
  if (!state.activeScene || !state.activeScene.initiativeRolled) return

  // Mark all remaining as acted
  for (const entry of state.activeScene.initiativeOrder) {
    entry.hasActedThisRound = true
  }

  // Advance round
  advanceRound()

  // Reset for new round
  for (const entry of state.activeScene.initiativeOrder) {
    entry.hasActedThisRound = false
  }
  resetRoutineActions()
  state.activeScene.currentTurnIndex = 0

  broadcast('turn-change', {
    currentTurnIndex: 0,
    initiativeOrder: state.activeScene.initiativeOrder
  })
  saveToLocalStorage()
}

function skipInitiative() {
  // Mark initiative as rolled without actually rolling (for GMs who don't want initiative)
  if (!state.activeScene) return

  state.activeScene.initiativeRolled = true
  state.activeScene.initiativeOrder = []
  state.activeScene.currentTurnIndex = 0
  saveToLocalStorage()
}

// ============ Routine Management ============

function useRoutineAction(threatId: string, actionId: string) {
  if (!state.activeScene) return

  const threat = state.activeScene.threats.find(t => t.id === threatId)
  if (!threat) return

  if (!threat.routineActionsUsed) {
    threat.routineActionsUsed = []
  }

  if (!threat.routineActionsUsed.includes(actionId)) {
    threat.routineActionsUsed.push(actionId)
  }

  broadcast('threat-update', threat)
  saveToLocalStorage()
}

function resetRoutineActions() {
  if (!state.activeScene) return

  for (const threat of state.activeScene.threats) {
    threat.routineActionsUsed = []
  }
  // Note: This is called as part of round change, so no separate broadcast needed
}

function getAvailableRoutineActions(threatId: string): ThreatRoutineAction[] {
  if (!state.activeScene) return []

  const threat = state.activeScene.threats.find(t => t.id === threatId)
  if (!threat || !threat.routine) return []

  const used = threat.routineActionsUsed ?? []
  return threat.routine.actions.filter(action => !used.includes(action.id))
}

function isRoutineActionUsed(threatId: string, actionId: string): boolean {
  if (!state.activeScene) return false

  const threat = state.activeScene.threats.find(t => t.id === threatId)
  if (!threat) return false

  return threat.routineActionsUsed?.includes(actionId) ?? false
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

// ============ Remote Sync (WebSocket) ============

function handleRemoteMessage(message: SyncMessage) {
  const { type, payload } = message
  console.log('[Starship] Remote message:', type, 'isGM:', state.isGMView)

  // Init from worker is hacking-specific — only honor it if a scene field is present
  if (type === 'init') {
    if (state.isGMView) return
    const p = payload as { scene?: StarshipScene | null }
    if (p && 'scene' in p) {
      state.activeScene = p.scene ?? null
    }
    return
  }

  // Player asks for current state — GM responds with full scene
  if (type === 'request-state' && state.isGMView) {
    if (state.activeScene && wsTransport && state.isRemoteSyncEnabled) {
      wsTransport.send({ type: 'scene-update', payload: state.activeScene })
    }
    return
  }

  // Player received fresh scene state — stop retrying
  if (type === 'scene-update' && !state.isGMView && stateRetryTimer) {
    clearInterval(stateRetryTimer)
    stateRetryTimer = null
  }

  // Same handling as BroadcastChannel messages
  const syncMessage = { type: type as StarshipSyncMessageType, payload, timestamp: Date.now() }
  handleSyncMessage(syncMessage)
}

async function enableRemoteSync(): Promise<boolean> {
  console.log('[Starship] enableRemoteSync() called, session:', state.sessionId)

  if (!isWebSocketSupported()) {
    console.warn('[Starship] WebSocket not supported')
    return false
  }

  try {
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteMessage
    wsTransport.onStateChange = (newState: ConnectionState) => {
      console.log('[Starship] WebSocket state changed:', newState)
      state.wsConnectionState = newState
    }

    await wsTransport.connect(state.sessionId, 'gm')
    state.isRemoteSyncEnabled = true

    // Send current scene state to any connected players
    if (state.activeScene) {
      wsTransport.send({ type: 'scene-update', payload: state.activeScene })
    }

    // Heartbeat: re-send scene every 30s for late joiners and resilience
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      if (wsTransport && state.isRemoteSyncEnabled && state.activeScene) {
        wsTransport.send({ type: 'scene-update', payload: state.activeScene })
      }
    }, 30000)

    console.log('[Starship] Remote sync enabled as GM')
    return true
  } catch (e) {
    console.error('[Starship] Failed to enable remote sync:', e)
    state.isRemoteSyncEnabled = false
    state.wsConnectionState = 'error'
    return false
  }
}

async function joinRemoteSession(sessionId: string): Promise<boolean> {
  console.log('[Starship] joinRemoteSession() called, session:', sessionId)

  if (!isWebSocketSupported()) {
    console.warn('[Starship] WebSocket not supported')
    return false
  }

  try {
    wsTransport = createSyncTransport()
    wsTransport.onMessage = handleRemoteMessage
    wsTransport.onStateChange = (newState: ConnectionState) => {
      console.log('[Starship] WebSocket state changed:', newState)
      state.wsConnectionState = newState
    }

    await wsTransport.connect(sessionId, 'player')
    state.isRemoteSyncEnabled = true

    // Ask GM for current scene, retry if no response
    wsTransport.send({ type: 'request-state', payload: null })
    let retries = 0
    const MAX_RETRIES = 3
    if (stateRetryTimer) clearInterval(stateRetryTimer)
    stateRetryTimer = setInterval(() => {
      retries++
      if (retries >= MAX_RETRIES || state.activeScene) {
        if (stateRetryTimer) {
          clearInterval(stateRetryTimer)
          stateRetryTimer = null
        }
        return
      }
      if (wsTransport && state.isRemoteSyncEnabled) {
        wsTransport.send({ type: 'request-state', payload: null })
      }
    }, 3000)

    console.log('[Starship] Joined remote session as player')
    return true
  } catch (e) {
    console.error('[Starship] Failed to join remote session:', e)
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
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (stateRetryTimer) {
    clearInterval(stateRetryTimer)
    stateRetryTimer = null
  }
  state.isRemoteSyncEnabled = false
  state.wsConnectionState = 'disconnected'
  console.log('[Starship] Remote sync disabled')
}

function hasRemoteSyncInUrl(): boolean {
  const hash = window.location.hash
  return hash.includes('sync=ws')
}

// ============ URL Sharing ============

function generateShareUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname
  const syncParam = state.isRemoteSyncEnabled ? '&sync=ws' : ''
  return `${baseUrl}#/starship/view?session=${state.sessionId}${syncParam}`
}

/**
 * Unified player view launcher: enables remote sync if available, copies
 * the share URL to clipboard, then opens the player view in a new tab.
 */
async function openPlayerView(): Promise<{ success: boolean; syncEnabled: boolean }> {
  let syncEnabled = state.isRemoteSyncEnabled

  if (isSyncAvailable() && !syncEnabled) {
    syncEnabled = await enableRemoteSync()
  }

  const url = generateShareUrl()
  console.log('[Starship] Opening player view:', url)

  let copied = false
  try {
    await navigator.clipboard.writeText(url)
    copied = true
  } catch (e) {
    console.warn('[Starship] Clipboard copy failed:', e)
  }

  window.open(url, '_blank', 'width=1920,height=1080')
  return { success: copied, syncEnabled }
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

function saveStarshipsToLocalStorage() {
  localStorage.setItem(STARSHIP_TEMPLATES_KEY, JSON.stringify(state.savedStarships))
}

function loadStarshipsFromLocalStorage() {
  const saved = localStorage.getItem(STARSHIP_TEMPLATES_KEY)
  if (!saved) return
  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) state.savedStarships = parsed
  } catch (e) {
    console.warn('[Starship] Failed to load saved starship templates:', e)
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
  loadStarshipsFromLocalStorage()

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
    persistActiveScene,
    // Starship template library
    saveStarshipTemplate,
    loadStarshipTemplate,
    deleteStarshipTemplate,
    renameStarshipTemplate,
    setStarshipTemplateCampaignFlag,
    exportStarshipTemplates,
    importStarshipTemplates,
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
    // Initiative management
    rollInitiative,
    getCurrentTurn,
    nextTurn,
    delayTurn,
    endRound,
    skipInitiative,
    // Routine management
    useRoutineAction,
    resetRoutineActions,
    getAvailableRoutineActions,
    isRoutineActionUsed,
    // Role management
    assignRole,
    unassignRole,
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
    ensureChannel,
    // Remote sync
    enableRemoteSync,
    joinRemoteSession,
    disableRemoteSync,
    hasRemoteSyncInUrl,
    isSyncAvailable
  }
}
