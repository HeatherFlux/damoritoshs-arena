<script setup lang="ts">
/**
 * The CHASE tab. Setup follows the custom builder's layout: a side panel to build in and a
 * live preview beside it. Running a chase swaps the preview for the tracker.
 */
import { computed, ref, watch } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { usePartyStore } from '../../stores/partyStore'
import type { SampleChaseObstacle, SavedChase } from '../../types/chase'
import type { Vehicle } from '../../types/tsc'
import {
  OBSTACLES_BY_LENGTH,
  createEmptyChase,
  createVehicleInstance,
  defaultSetup,
  lengthForCount,
  obstacleFromSample,
  suggestedChasePoints,
} from '../../utils/chaseRules'
import { generateObstacles, type ObstaclePool } from '../../utils/chaseGenerator'
import CollapsibleSidebar from '../CollapsibleSidebar.vue'
import RollHistory from '../RollHistory.vue'
import VehicleSearch from '../tsc/VehicleSearch.vue'
import ChaseTracker from './ChaseTracker.vue'
import ChaseSetupPanel from './ChaseSetupPanel.vue'
import ChasePreview from './ChasePreview.vue'
import ChaseObstacleLibrary from './ChaseObstacleLibrary.vue'

const DRAFT_KEY = 'sf2e-chase-draft'

interface Draft {
  chase: SavedChase
  pool: ObstaclePool
  handEdited: boolean
}

const store = useChaseStore()
const partyStore = usePartyStore()

const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const partySize = computed(() => partyStore.partySize.value || 4)
const hasActiveScene = computed(() => !!store.state.activeScene)

const draft = ref<Draft>(loadDraft() ?? newDraft())
const mode = ref<'setup' | 'run'>(hasActiveScene.value ? 'run' : 'setup')
const mobileSetupOpen = ref(true)
const notice = ref('')

const pickingObstacle = ref(false)
/** Side the vehicle being picked goes to, in the running chase or in the chase being set up. */
const pickingVehicleFor = ref<{ where: 'scene' | 'draft'; sideId: string } | null>(null)

const showImport = ref(false)
const importText = ref('')
const importError = ref('')

const problems = computed(() => {
  const c = draft.value.chase
  const list: string[] = []
  if (c.obstacles.length === 0) list.push('Add at least one obstacle.')
  if (!c.sides.some(s => s.isPlayers)) list.push('One side must be the party.')
  for (const o of c.obstacles) {
    if (o.options.length === 0) list.push(`${o.name} has no way past it.`)
    else if (!(o.chasePoints >= 1)) list.push(`${o.name} needs at least 1 Chase Point.`)
  }
  return list
})

/** A medium Run Away chase at the party's level, already filled with obstacles. */
function newDraft(): Draft {
  const chase = createEmptyChase('run-away')
  chase.level = partyStore.partyLevel.value || 1
  chase.length = 'medium'
  const pool: ObstaclePool = 'any'
  chase.obstacles = generateObstacles(OBSTACLES_BY_LENGTH.medium, [], {
    level: chase.level,
    pool,
    partySize: partyStore.partySize.value || 4,
  })
  const setup = defaultSetup(chase.type, chase.obstacles.length)
  chase.sides = setup.sides
  chase.end = setup.end
  return { chase, pool, handEdited: false }
}

function loadDraft(): Draft | null {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return null
    const data = JSON.parse(saved) as Draft
    if (!data?.chase || !Array.isArray(data.chase.obstacles) || !Array.isArray(data.chase.sides)) return null
    return { chase: data.chase, pool: data.pool ?? 'any', handEdited: !!data.handEdited }
  } catch {
    return null
  }
}

watch(draft, (value) => localStorage.setItem(DRAFT_KEY, JSON.stringify(value)), { deep: true })

// The run view only makes sense while a chase is running
watch(hasActiveScene, (running) => { if (!running) mode.value = 'setup' })

function flash(text: string) {
  notice.value = text
  setTimeout(() => { if (notice.value === text) notice.value = '' }, 2000)
}

function saveDraft() {
  store.saveChase(draft.value.chase)
  flash('Saved')
}

function startDraft() {
  if (problems.value.length) return
  if (hasActiveScene.value && !confirm('Replace the chase that is running?')) return
  store.saveChase(draft.value.chase)
  store.startChase(draft.value.chase)
  // A chase with no one on the party's side picks up the active party
  const side = store.state.activeScene?.sides.find(s => s.isPlayers)
  if (side && side.members.length === 0) store.addMembersFromParty(side.id, partyStore.getPartyPlayers())
  mode.value = 'run'
}

function newChase() {
  draft.value = newDraft()
  mode.value = 'setup'
}

function loadChase(chase: SavedChase) {
  draft.value = { chase: JSON.parse(JSON.stringify(chase)), pool: 'any', handEdited: true }
}

function addPickedObstacle(sample: SampleChaseObstacle) {
  const c = draft.value.chase
  c.obstacles.push(obstacleFromSample(sample, suggestedChasePoints(partySize.value, c.obstacles.length)))
  c.length = lengthForCount(c.obstacles.length)
  if (c.type === 'beat-the-clock') c.end.roundLimit = c.obstacles.length
  draft.value.handEdited = true
}

function attachVehicle(vehicle: Vehicle) {
  const target = pickingVehicleFor.value
  if (!target) return
  if (target.where === 'scene') {
    store.attachVehicle(target.sideId, vehicle)
  } else {
    const side = draft.value.chase.sides.find(s => s.id === target.sideId)
    if (side) {
      const same = side.vehicles.filter(v => v.vehicle.id === vehicle.id).length
      side.vehicles.push(createVehicleInstance(vehicle, same ? `${vehicle.name} ${same + 1}` : vehicle.name))
    }
  }
  pickingVehicleFor.value = null
}

const vehicleTargetName = computed(() => {
  const t = pickingVehicleFor.value
  if (!t) return ''
  const sides = t.where === 'scene' ? store.state.activeScene?.sides : draft.value.chase.sides
  return sides?.find(s => s.id === t.sideId)?.name ?? ''
})

function exportChases() {
  const blob = new Blob([store.exportChases()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chases.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importChases() {
  try {
    const count = store.importChases(importText.value)
    showImport.value = false
    importText.value = ''
    importError.value = ''
    flash(`Imported ${count}`)
  } catch {
    importError.value = 'No chases found in that JSON'
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
  <div class="chase-layout">
    <!-- Setup: side panel and live preview -->
    <template v-if="mode === 'setup'">
      <aside class="chase-sidebar" :class="{ 'chase-sidebar-closed': !mobileSetupOpen }">
        <div class="p-4 border-b border-border">
          <div class="mode-switcher">
            <button class="mode-btn mode-btn-active">Set up</button>
            <button class="mode-btn" :disabled="!hasActiveScene" :title="hasActiveScene ? 'Go to the chase that is running' : 'Start a chase first'" @click="mode = 'run'">
              Run <span v-if="hasActiveScene" class="inline-block w-2 h-2 bg-success animate-pulse"></span>
            </button>
          </div>
          <p v-if="notice" class="text-[0.6875rem] text-success mt-2">{{ notice }}</p>
        </div>

        <button class="mobile-toggle" @click="mobileSetupOpen = !mobileSetupOpen">
          <span>Setup</span><span>{{ mobileSetupOpen ? '▼' : '▶' }}</span>
        </button>

        <ChaseSetupPanel
          v-show="mobileSetupOpen"
          v-model:pool="draft.pool"
          v-model:hand-edited="draft.handEdited"
          class="chase-sidebar-body"
          :chase="draft.chase"
          :problems="problems"
          @save="saveDraft"
          @start="startDraft"
          @new="newChase"
          @load="loadChase"
          @pick-obstacle="pickingObstacle = true"
          @pick-vehicle="(sideId) => (pickingVehicleFor = { where: 'draft', sideId })"
          @import="showImport = true"
          @export="exportChases"
        />
      </aside>

      <section class="chase-main">
        <ChasePreview :chase="draft.chase" :problems="problems" />
      </section>
    </template>

    <!-- Running -->
    <template v-else>
      <section class="chase-run">
        <div class="run-bar">
          <div class="mode-switcher run-switcher">
            <button class="mode-btn" @click="mode = 'setup'">Set up</button>
            <button class="mode-btn mode-btn-active">Run <span class="inline-block w-2 h-2 bg-success animate-pulse"></span></button>
          </div>
        </div>
        <div class="flex-1 overflow-hidden p-3 min-h-0">
          <ChaseTracker
            @open-builder="mode = 'setup'"
            @add-vehicle="(sideId) => (pickingVehicleFor = { where: 'scene', sideId })"
          />
        </div>
      </section>
      <CollapsibleSidebar side="right" storageKey="chaseRight">
        <RollHistory />
      </CollapsibleSidebar>
    </template>

    <!-- Pick an obstacle -->
    <Teleport to="body">
      <div v-if="pickingObstacle" class="modal-overlay" @click.self="pickingObstacle = false">
        <div class="modal picker-modal">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold uppercase tracking-wide"><span class="text-accent">//</span> Pick obstacles</h3>
            <button class="btn-secondary btn-icon btn-sm" title="Close" @click="pickingObstacle = false">×</button>
          </div>
          <div class="picker-body">
            <ChaseObstacleLibrary add-label="Add" :party-level="partyLevel" @add="addPickedObstacle" />
          </div>
          <div class="flex items-center justify-between mt-3">
            <span class="text-[0.75rem] text-dim">{{ draft.chase.obstacles.length }} in the chase</span>
            <button class="btn btn-primary" @click="pickingObstacle = false">Done</button>
          </div>
        </div>
      </div>

      <!-- Pick a vehicle -->
      <div v-if="pickingVehicleFor" class="modal-overlay" @click.self="pickingVehicleFor = null">
        <div class="modal picker-modal">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-lg font-bold uppercase tracking-wide"><span class="text-accent">//</span> Vehicle for {{ vehicleTargetName }}</h3>
            <button class="btn-secondary btn-icon btn-sm" title="Close" @click="pickingVehicleFor = null">×</button>
          </div>
          <p class="text-[0.75rem] text-dim mb-3">A table aid. The chase rules don't use vehicle statistics, but you can track its condition and see its piloting DCs.</p>
          <div class="picker-body">
            <VehicleSearch select-label="Attach" @select="attachVehicle" />
          </div>
        </div>
      </div>

      <!-- Import -->
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal">
          <h3 class="mb-2">Import Chases</h3>
          <p class="text-dim text-sm mb-4">Paste exported chase JSON or upload a file:</p>
          <input type="file" accept=".json" class="mb-3 text-sm" @change="onImportFile" />
          <textarea v-model="importText" class="input w-full font-mono text-xs p-3 resize-y" placeholder='{"version": 1, "chases": [...]}' rows="10"></textarea>
          <p v-if="importError" class="text-danger mt-2">{{ importError }}</p>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn btn-secondary" @click="showImport = false">Cancel</button>
            <button class="btn btn-primary" @click="importChases">Import</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chase-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.chase-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
}

.chase-main {
  padding: 1rem;
}

.chase-run {
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
  .chase-layout {
    flex-direction: row;
    overflow: hidden;
  }

  .chase-sidebar {
    width: 23rem;
    flex-shrink: 0;
    min-height: 0;
    border-bottom: none;
    border-right: 1px solid var(--color-border);
  }

  .chase-sidebar-body {
    display: flex !important;
    flex: 1;
    min-height: 0;
  }

  .mobile-toggle {
    display: none;
  }

  .chase-main {
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

.mode-switcher {
  display: flex;
  gap: 0.25rem;
  background: var(--color-bg);
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}

.mode-btn:hover:not(:disabled):not(.mode-btn-active) {
  color: var(--color-text);
  background: var(--color-bg-elevated);
}

.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-btn-active {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.picker-modal {
  max-width: 48rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-body {
  height: 60vh;
  min-height: 0;
  overflow: hidden;
}
</style>
