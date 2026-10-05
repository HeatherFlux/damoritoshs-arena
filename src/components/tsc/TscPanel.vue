<script setup lang="ts">
/**
 * Tactical starship combat. Setup follows the custom builder's layout: a side panel to build
 * in and a live preview beside it. Running a scene swaps the preview for the tracker.
 */
import { computed, ref, watch } from 'vue'
import { useTscStore, createEmptyTscScene, createHazardInstance, createNpcShipInstance } from '../../stores/tscStore'
import { usePartyStore } from '../../stores/partyStore'
import type { NpcStarship, PlayerStarship, StarshipHazard, TscSavedScene } from '../../types/tsc'
import type { Difficulty } from '../../types/encounter'
import { createPlayerStarship, setPlayerStarshipLevel } from '../../utils/tscDerive'
import { generateOpposition, labelInstances } from '../../utils/tscGenerator'
import { parseTscScenesFile } from '../../utils/sessionBundleImporter'
import CollapsibleSidebar from '../CollapsibleSidebar.vue'
import ModeSwitch from '../ModeSwitch.vue'
import RollHistory from '../RollHistory.vue'
import TscTracker from './TscTracker.vue'
import TscSetupPanel from './TscSetupPanel.vue'
import TscPreview from './TscPreview.vue'
import TscPicker from './TscPicker.vue'
import TscPlayerShipSheet from './TscPlayerShipSheet.vue'

const DRAFT_KEY = 'sf2e-tsc-draft'

interface Draft {
  scene: TscSavedScene
  difficulty: Difficulty
  faction: string
  handEdited: boolean
}

const store = useTscStore()
const partyStore = usePartyStore()

const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const hasActiveScene = computed(() => !!store.state.activeScene)

const draft = ref<Draft>(loadDraft() ?? newDraft())
const mode = ref<'setup' | 'run'>(hasActiveScene.value ? 'run' : 'setup')
const mobileSetupOpen = ref(true)
const notice = ref('')

/** Where picked ships and hazards go: the scene being set up, or the one running. */
const picking = ref<'draft' | 'scene' | null>(null)
const editingShipFor = ref<'draft' | 'scene' | null>(null)

const showImport = ref(false)
const importText = ref('')
const importError = ref('')

const problems = computed(() => {
  const s = draft.value.scene
  const list: string[] = []
  if (!s.playerShip) list.push("Pick the party's ship.")
  if (s.npcShips.length === 0 && s.hazards.length === 0) list.push('Add at least one enemy ship or hazard.')
  return list
})

const pickerCount = computed(() => {
  const s = picking.value === 'scene' ? store.state.activeScene : draft.value.scene
  return (s?.npcShips.length ?? 0) + (s?.hazards.length ?? 0)
})

const sheetBeingEdited = computed<PlayerStarship | null>(() => {
  const ship = editingShipFor.value === 'scene' ? store.state.activeScene?.playerShip : draft.value.scene.playerShip
  if (!ship) return null
  // Editing a ship that came from a saved sheet updates that sheet
  return ship.templateId ? { ...ship, id: ship.templateId } : ship
})

/** A moderate scene at the party's level: their ship, or a new explorer, against a fresh pick of enemies. */
function newDraft(): Draft {
  const scene = createEmptyTscScene()
  const sheet = store.state.playerShips[0]
  // With no party set up, a saved ship is the best guide to the party's level
  scene.level = partyStore.activeParty.value?.players.length ? partyStore.partyLevel.value || 1 : sheet?.level ?? 1
  scene.playerShip = sheet
    ? { ...JSON.parse(JSON.stringify(sheet)), id: crypto.randomUUID(), templateId: sheet.id }
    : createPlayerStarship('explorer', scene.level, 'Party Starship')
  if (scene.playerShip && scene.playerShip.level !== scene.level) scene.playerShip = setPlayerStarshipLevel(scene.playerShip, scene.level)
  const difficulty: Difficulty = 'moderate'
  scene.npcShips = generateOpposition({
    level: scene.level,
    partySize: partyStore.partySize.value || 4,
    difficulty,
    faction: '',
    ships: store.allStarships.value,
  }).map(s => createNpcShipInstance(s))
  labelInstances(scene.npcShips, n => n.model.name)
  return { scene, difficulty, faction: '', handEdited: false }
}

function loadDraft(): Draft | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return null
    const data = JSON.parse(saved) as Draft
    if (!data?.scene || !Array.isArray(data.scene.npcShips) || !Array.isArray(data.scene.hazards)) return null
    return { scene: data.scene, difficulty: data.difficulty ?? 'moderate', faction: data.faction ?? '', handEdited: !!data.handEdited }
  } catch {
    return null
  }
}

watch(draft, (value) => localStorage.setItem(DRAFT_KEY, JSON.stringify(value)), { deep: true })

// A scene can also be started from the encounter builder; follow it either way
watch(hasActiveScene, (running) => { mode.value = running ? 'run' : 'setup' })

function flash(text: string) {
  notice.value = text
  setTimeout(() => { if (notice.value === text) notice.value = '' }, 2000)
}

function saveDraft() {
  store.saveScene(draft.value.scene)
  flash('Saved')
}

function startDraft() {
  if (problems.value.length) return
  if (hasActiveScene.value && !confirm('Replace the scene that is running?')) return
  store.saveScene(draft.value.scene)
  store.startScene(draft.value.scene)
  // A scene with no crew picks up the active party
  if (store.state.activeScene && store.state.activeScene.pcs.length === 0) {
    for (const p of partyStore.getPartyPlayers()) store.addPc({ name: p.name, playerId: p.id, initiativeBonus: p.perception })
  }
  mode.value = 'run'
}

function newScene() {
  draft.value = newDraft()
  mode.value = 'setup'
}

function loadScene(scene: TscSavedScene) {
  draft.value = { scene: JSON.parse(JSON.stringify(scene)), difficulty: draft.value.difficulty, faction: '', handEdited: true }
}

function addShip(ship: NpcStarship) {
  if (picking.value === 'scene') {
    store.addNpcShip(ship)
    return
  }
  const s = draft.value.scene
  s.npcShips.push(createNpcShipInstance(ship))
  labelInstances(s.npcShips, n => n.model.name)
  draft.value.handEdited = true
}

function addHazard(hazard: StarshipHazard) {
  if (picking.value === 'scene') {
    store.addHazard(hazard)
    return
  }
  const s = draft.value.scene
  s.hazards.push(createHazardInstance(hazard))
  labelInstances(s.hazards, h => h.hazard.name)
  draft.value.handEdited = true
}

function shipSheetSaved(sheet: PlayerStarship) {
  if (editingShipFor.value === 'scene') {
    store.loadPlayerShipIntoScene(sheet.id)
  } else {
    draft.value.scene.playerShip = { ...JSON.parse(JSON.stringify(sheet)), id: crypto.randomUUID(), templateId: sheet.id }
    draft.value.scene.level = sheet.level
    const ids = new Set(sheet.stations.map(s => s.id))
    for (const pc of draft.value.scene.pcs) if (pc.stationId && !ids.has(pc.stationId)) pc.stationId = undefined
  }
  editingShipFor.value = null
}

function exportScenes() {
  const blob = new Blob([store.exportScenes()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tactical-starship-scenes.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importScenes() {
  try {
    const { scenes, playerShips, warnings } = parseTscScenesFile(importText.value, store.allStarships.value, store.state.playerShips)
    if (playerShips.length) store.importPlayerShips(JSON.stringify(playerShips))
    store.importScenes(JSON.stringify(scenes))
    importText.value = ''
    // Keep the dialog open to show anything that was skipped.
    importError.value = warnings.length ? `Imported ${scenes.length}. Skipped: ${warnings.join('; ')}` : ''
    if (!warnings.length) showImport.value = false
    flash(`Imported ${scenes.length}`)
  } catch {
    importError.value = 'No tactical scenes found in that YAML or JSON'
  }
}

function onImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { importText.value = reader.result as string }
  reader.readAsText(file)
}
</script>

<template>
  <div class="tsc-layout" :class="{ 'tsc-layout-run': mode === 'run' }">
    <!-- Setup: side panel and live preview -->
    <template v-if="mode === 'setup'">
      <aside class="tsc-sidebar">
        <div class="p-4 border-b border-border">
          <ModeSwitch v-model="mode" :running="hasActiveScene" idle-hint="Start a scene first" />
          <p v-if="notice" class="text-[0.6875rem] text-success mt-2">{{ notice }}</p>
        </div>

        <button class="mobile-toggle" @click="mobileSetupOpen = !mobileSetupOpen">
          <span>Setup</span><span>{{ mobileSetupOpen ? '▼' : '▶' }}</span>
        </button>

        <TscSetupPanel
          v-show="mobileSetupOpen"
          v-model:difficulty="draft.difficulty"
          v-model:faction="draft.faction"
          v-model:hand-edited="draft.handEdited"
          class="tsc-sidebar-body"
          :scene="draft.scene"
          :problems="problems"
          @save="saveDraft"
          @start="startDraft"
          @new="newScene"
          @load="loadScene"
          @pick-threat="picking = 'draft'"
          @edit-ship="editingShipFor = 'draft'"
          @import="showImport = true"
          @export="exportScenes"
        />
      </aside>

      <section class="tsc-main">
        <TscPreview :scene="draft.scene" :problems="problems" />
      </section>
    </template>

    <!-- Running -->
    <template v-else>
      <section class="tsc-run">
        <div class="run-bar">
          <ModeSwitch v-model="mode" class="run-switcher" :running="hasActiveScene" />
        </div>
        <div class="flex-1 overflow-hidden p-3 min-h-0">
          <TscTracker @open-library="picking = 'scene'" @open-ship="editingShipFor = 'scene'" />
        </div>
      </section>
      <CollapsibleSidebar side="right" storageKey="starshipRight">
        <RollHistory />
      </CollapsibleSidebar>
    </template>

    <Teleport to="body">
      <TscPicker
        v-if="picking"
        :party-level="picking === 'scene' ? (store.state.activeScene?.level ?? partyLevel) : draft.scene.level"
        :count="pickerCount"
        @add-ship="addShip"
        @add-hazard="addHazard"
        @close="picking = null"
      />

      <!-- The party's ship in full -->
      <div v-if="editingShipFor" class="modal-overlay" @click.self="editingShipFor = null">
        <div class="modal sheet-modal">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold uppercase tracking-wide"><span class="text-accent">//</span> Stations and upgrades</h3>
            <button class="btn-secondary btn-icon btn-sm" title="Close without changes" @click="editingShipFor = null">×</button>
          </div>
          <div class="sheet-body">
            <TscPlayerShipSheet :ship="sheetBeingEdited" dialog @saved="shipSheetSaved" />
          </div>
        </div>
      </div>

      <!-- Import -->
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal">
          <h3 class="mb-2">Import Tactical Scenes</h3>
          <p class="text-dim text-sm mb-4">Paste tactical scene YAML or exported JSON, or upload a file:</p>
          <input type="file" accept=".yaml,.yml,.json" class="mb-3 text-sm" @change="onImportFile" />
          <textarea v-model="importText" class="input w-full font-mono text-xs p-3 resize-y" placeholder='[{"id": "...", "name": "...", ...}]' rows="10"></textarea>
          <p v-if="importError" class="text-danger mt-2">{{ importError }}</p>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn btn-secondary" @click="showImport = false">Cancel</button>
            <button class="btn btn-primary" @click="importScenes">Import</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tsc-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.tsc-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
}

.tsc-main {
  padding: 1rem;
}

/* The runner keeps Roll History beside it at every width, like the combat tab.
   Stacked in a column, the full-height sidebar left the runner no height at all. */
.tsc-layout-run {
  flex-direction: row;
  overflow: hidden;
}

.tsc-run {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-toggle {
  display: flex;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: var(--color-bg-elevated);
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

@media (min-width: 1024px) {
  .tsc-layout {
    flex-direction: row;
    overflow: hidden;
  }

  .tsc-sidebar {
    width: 23rem;
    flex-shrink: 0;
    min-height: 0;
    border-bottom: none;
    border-right: 1px solid var(--color-border);
  }

  .tsc-sidebar-body {
    display: flex !important;
    flex: 1;
    min-height: 0;
  }

  .mobile-toggle {
    display: none;
  }

  .tsc-main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 1.5rem;
  }
}

.run-bar {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}

.run-switcher {
  width: 16rem;
}

.sheet-modal {
  max-width: 64rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-body {
  height: 72vh;
  min-height: 0;
  overflow: hidden;
}
</style>
