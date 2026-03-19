import { reactive, watch } from 'vue'
import type {
  Adventure, AdventureScene, AdventureSecret, AdventureLocation, AdventureNPC,
  SavedAdventure, AdventureSection
} from '../types/adventure'

// State interface
interface AdventureState {
  currentAdventure: Adventure | null
  savedAdventures: SavedAdventure[]
  activeSection: AdventureSection
  editingEntryId: string | null
}

// LocalStorage keys
const STATE_KEY = 'sf2e-adventure-state'
const SAVED_KEY = 'sf2e-adventure-saved'

// Module-level reactive state (singleton)
const state = reactive<AdventureState>({
  currentAdventure: null,
  savedAdventures: [],
  activeSection: 'strongStart',
  editingEntryId: null,
})

// ===== HELPERS =====

function generateId(): string {
  return crypto.randomUUID().slice(0, 8)
}

function now(): number {
  return Date.now()
}

function saveStateToLocalStorage() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      currentAdventure: state.currentAdventure,
      activeSection: state.activeSection,
    }))
  } catch { /* storage full */ }
}

function saveSavedToLocalStorage() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(state.savedAdventures))
  } catch { /* storage full */ }
}

function loadFromLocalStorage() {
  try {
    const stateJson = localStorage.getItem(STATE_KEY)
    if (stateJson) {
      const parsed = JSON.parse(stateJson)
      if (parsed.currentAdventure) state.currentAdventure = parsed.currentAdventure
      if (parsed.activeSection) state.activeSection = parsed.activeSection
    }
    const savedJson = localStorage.getItem(SAVED_KEY)
    if (savedJson) {
      state.savedAdventures = JSON.parse(savedJson)
    }
  } catch { /* corrupt data */ }
}

// ===== ADVENTURE CRUD =====

function createAdventure(name?: string): Adventure {
  const adventure: Adventure = {
    id: generateId(),
    name: name || 'New Adventure',
    createdAt: now(),
    updatedAt: now(),
    strongStart: '',
    scenes: [],
    secrets: [],
    locations: [],
    npcs: [],
  }
  state.currentAdventure = adventure
  return adventure
}

function saveAdventure() {
  if (!state.currentAdventure) return

  state.currentAdventure.updatedAt = now()

  const existing = state.savedAdventures.findIndex(s => s.id === state.currentAdventure!.id)
  const saved: SavedAdventure = {
    id: state.currentAdventure.id,
    name: state.currentAdventure.name,
    savedAt: now(),
    adventure: JSON.parse(JSON.stringify(state.currentAdventure)),
  }

  if (existing >= 0) {
    state.savedAdventures[existing] = saved
  } else {
    state.savedAdventures.unshift(saved)
  }

  saveSavedToLocalStorage()
}

function loadAdventure(id: string) {
  const saved = state.savedAdventures.find(s => s.id === id)
  if (saved) {
    state.currentAdventure = JSON.parse(JSON.stringify(saved.adventure))
    state.editingEntryId = null
  }
}

function deleteAdventure(id: string) {
  state.savedAdventures = state.savedAdventures.filter(s => s.id !== id)
  if (state.currentAdventure?.id === id) {
    state.currentAdventure = null
  }
  saveSavedToLocalStorage()
}

function renameAdventure(name: string) {
  if (state.currentAdventure) {
    state.currentAdventure.name = name
    state.currentAdventure.updatedAt = now()
  }
}

// ===== STRONG START =====

function setStrongStart(text: string) {
  if (state.currentAdventure) {
    state.currentAdventure.strongStart = text
    state.currentAdventure.updatedAt = now()
  }
}

// ===== SCENES =====

function addScene(text: string, type?: AdventureScene['type'], tension?: AdventureScene['tension'], generated?: boolean): AdventureScene {
  const scene: AdventureScene = {
    id: generateId(),
    text,
    leadsTo: [],
    type,
    tension,
    generated,
  }
  if (state.currentAdventure) {
    state.currentAdventure.scenes.push(scene)
    state.currentAdventure.updatedAt = now()
  }
  return scene
}

function updateScene(id: string, updates: Partial<Omit<AdventureScene, 'id'>>) {
  if (!state.currentAdventure) return
  const scene = state.currentAdventure.scenes.find(s => s.id === id)
  if (scene) {
    Object.assign(scene, updates)
    state.currentAdventure.updatedAt = now()
  }
}

function removeScene(id: string) {
  if (!state.currentAdventure) return
  state.currentAdventure.scenes = state.currentAdventure.scenes.filter(s => s.id !== id)
  // Clean leadsTo references
  for (const scene of state.currentAdventure.scenes) {
    scene.leadsTo = scene.leadsTo.filter(ref => ref !== id)
  }
  state.currentAdventure.updatedAt = now()
}

function linkScenes(fromId: string, toId: string) {
  if (!state.currentAdventure) return
  const from = state.currentAdventure.scenes.find(s => s.id === fromId)
  if (from && !from.leadsTo.includes(toId)) {
    from.leadsTo.push(toId)
    state.currentAdventure.updatedAt = now()
  }
}

function unlinkScenes(fromId: string, toId: string) {
  if (!state.currentAdventure) return
  const from = state.currentAdventure.scenes.find(s => s.id === fromId)
  if (from) {
    from.leadsTo = from.leadsTo.filter(ref => ref !== toId)
    state.currentAdventure.updatedAt = now()
  }
}

// ===== SECRETS =====

function addSecret(text: string, dangerLevel?: AdventureSecret['dangerLevel'], generated?: boolean): AdventureSecret {
  const secret: AdventureSecret = {
    id: generateId(),
    text,
    dangerLevel,
    generated,
  }
  if (state.currentAdventure) {
    state.currentAdventure.secrets.push(secret)
    state.currentAdventure.updatedAt = now()
  }
  return secret
}

function updateSecret(id: string, updates: Partial<Omit<AdventureSecret, 'id'>>) {
  if (!state.currentAdventure) return
  const secret = state.currentAdventure.secrets.find(s => s.id === id)
  if (secret) {
    Object.assign(secret, updates)
    state.currentAdventure.updatedAt = now()
  }
}

function removeSecret(id: string) {
  if (!state.currentAdventure) return
  state.currentAdventure.secrets = state.currentAdventure.secrets.filter(s => s.id !== id)
  state.currentAdventure.updatedAt = now()
}

// ===== LOCATIONS =====

function addLocation(text: string, environment?: string, generated?: boolean): AdventureLocation {
  const location: AdventureLocation = {
    id: generateId(),
    text,
    environment,
    generated,
  }
  if (state.currentAdventure) {
    state.currentAdventure.locations.push(location)
    state.currentAdventure.updatedAt = now()
  }
  return location
}

function updateLocation(id: string, updates: Partial<Omit<AdventureLocation, 'id'>>) {
  if (!state.currentAdventure) return
  const location = state.currentAdventure.locations.find(l => l.id === id)
  if (location) {
    Object.assign(location, updates)
    state.currentAdventure.updatedAt = now()
  }
}

function removeLocation(id: string) {
  if (!state.currentAdventure) return
  state.currentAdventure.locations = state.currentAdventure.locations.filter(l => l.id !== id)
  state.currentAdventure.updatedAt = now()
}

// ===== NPCS =====

function addNPC(text: string, role?: AdventureNPC['role'], ancestry?: string, generated?: boolean): AdventureNPC {
  const npc: AdventureNPC = {
    id: generateId(),
    text,
    role,
    ancestry,
    generated,
  }
  if (state.currentAdventure) {
    state.currentAdventure.npcs.push(npc)
    state.currentAdventure.updatedAt = now()
  }
  return npc
}

function updateNPC(id: string, updates: Partial<Omit<AdventureNPC, 'id'>>) {
  if (!state.currentAdventure) return
  const npc = state.currentAdventure.npcs.find(n => n.id === id)
  if (npc) {
    Object.assign(npc, updates)
    state.currentAdventure.updatedAt = now()
  }
}

function removeNPC(id: string) {
  if (!state.currentAdventure) return
  state.currentAdventure.npcs = state.currentAdventure.npcs.filter(n => n.id !== id)
  state.currentAdventure.updatedAt = now()
}

// ===== MARKDOWN EXPORT =====

function adventureToMarkdown(): string {
  const a = state.currentAdventure
  if (!a) return ''

  const lines: string[] = []
  lines.push(`# ${a.name}`)
  lines.push('')

  // Strong Start
  lines.push('## Strong Start')
  lines.push('')
  if (a.strongStart) {
    lines.push(a.strongStart)
  } else {
    lines.push('*Not yet written*')
  }
  lines.push('')

  // Scenes
  lines.push(`## Scenes (${a.scenes.length})`)
  lines.push('')
  for (const scene of a.scenes) {
    const badges: string[] = []
    if (scene.type) badges.push(`[${scene.type}]`)
    if (scene.tension) badges.push(`[${scene.tension}]`)
    lines.push(`- ${badges.join(' ')} ${scene.text}`)
    if (scene.leadsTo.length > 0) {
      const targets = scene.leadsTo
        .map(id => a.scenes.find(s => s.id === id)?.text?.slice(0, 40))
        .filter(Boolean)
        .map(t => `"${t}..."`)
      if (targets.length) {
        lines.push(`  - *Leads to:* ${targets.join(', ')}`)
      }
    }
    if (scene.notes) {
      lines.push(`  - *Notes:* ${scene.notes}`)
    }
  }
  lines.push('')

  // Secrets & Clues
  lines.push(`## Secrets & Clues (${a.secrets.length})`)
  lines.push('')
  for (const secret of a.secrets) {
    const badge = secret.dangerLevel ? `[${secret.dangerLevel}]` : ''
    lines.push(`- ${badge} ${secret.text}`)
    if (secret.notes) {
      lines.push(`  - *Notes:* ${secret.notes}`)
    }
  }
  lines.push('')

  // Fantastic Locations
  lines.push(`## Fantastic Locations (${a.locations.length})`)
  lines.push('')
  for (const loc of a.locations) {
    const badge = loc.environment ? `[${loc.environment}]` : ''
    lines.push(`- ${badge} ${loc.text}`)
    if (loc.notes) {
      lines.push(`  - *Notes:* ${loc.notes}`)
    }
  }
  lines.push('')

  // Important NPCs
  lines.push(`## Important NPCs (${a.npcs.length})`)
  lines.push('')
  for (const npc of a.npcs) {
    const badges: string[] = []
    if (npc.role) badges.push(`[${npc.role}]`)
    if (npc.ancestry) badges.push(`[${npc.ancestry}]`)
    lines.push(`- ${badges.join(' ')} ${npc.text}`)
    if (npc.notes) {
      lines.push(`  - *Notes:* ${npc.notes}`)
    }
  }

  return lines.join('\n')
}

// ===== IMPORT / EXPORT =====

function exportAdventures(): string {
  return JSON.stringify(state.savedAdventures, null, 2)
}

function importAdventures(json: string) {
  const parsed = JSON.parse(json) as SavedAdventure[]
  if (!Array.isArray(parsed)) throw new Error('Invalid format')
  // Merge: add new ones, skip duplicates by id
  for (const item of parsed) {
    if (!state.savedAdventures.find(s => s.id === item.id)) {
      state.savedAdventures.push(item)
    }
  }
  saveSavedToLocalStorage()
}

// ===== WATCHERS =====

watch(() => state.currentAdventure, () => saveStateToLocalStorage(), { deep: true })
watch(() => state.activeSection, () => saveStateToLocalStorage())

// ===== INIT =====

let initialized = false

function init() {
  if (initialized) return
  initialized = true
  loadFromLocalStorage()
}

// ===== COMPOSABLE =====

export function useAdventureStore() {
  init()
  return {
    state,
    createAdventure,
    saveAdventure,
    loadAdventure,
    deleteAdventure,
    renameAdventure,
    setStrongStart,
    addScene,
    updateScene,
    removeScene,
    linkScenes,
    unlinkScenes,
    addSecret,
    updateSecret,
    removeSecret,
    addLocation,
    updateLocation,
    removeLocation,
    addNPC,
    updateNPC,
    removeNPC,
    adventureToMarkdown,
    exportAdventures,
    importAdventures,
  }
}
