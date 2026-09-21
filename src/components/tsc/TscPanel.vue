<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { usePartyStore } from '../../stores/partyStore'
import type { NpcStarship, PlayerStarship, StarshipHazard, TscSavedScene } from '../../types/tsc'
import TscStarshipSearch from './TscStarshipSearch.vue'
import TscHazardSearch from './TscHazardSearch.vue'
import VehicleSearch from './VehicleSearch.vue'
import TscPlayerShipSheet from './TscPlayerShipSheet.vue'
import TscTracker from './TscTracker.vue'
import TscStarshipBuilder from './TscStarshipBuilder.vue'

type SubTab = 'tracker' | 'library' | 'ship' | 'builder'
type LibraryTab = 'starships' | 'hazards' | 'vehicles'

const store = useTscStore()
const partyStore = usePartyStore()

const activeTab = ref<SubTab>(store.state.activeScene ? 'tracker' : 'library')
const libraryTab = ref<LibraryTab>('starships')
const editingShip = ref<PlayerStarship | null>(null)
const builderShip = ref<NpcStarship | null>(null)
const builderEditing = ref(false)

function cloneToBuilder(ship: NpcStarship) {
  builderShip.value = ship
  builderEditing.value = false
  activeTab.value = 'builder'
}

function editInBuilder(ship: NpcStarship) {
  builderShip.value = ship
  builderEditing.value = true
  activeTab.value = 'builder'
}
const draftScene = ref<TscSavedScene | null>(null)

const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const hasActiveScene = computed(() => !!store.state.activeScene)

/** Adding from the library targets the active scene, or a draft scene that becomes the active one. */
function ensureScene(): void {
  if (store.state.activeScene) return
  const saved = draftScene.value ?? store.createEmptyTscScene()
  saved.level = partyLevel.value
  draftScene.value = saved
  store.startScene(saved)
}

function addShipToScene(ship: NpcStarship) {
  ensureScene()
  store.addNpcShip(ship)
  activeTab.value = 'tracker'
}

function addHazardToScene(hazard: StarshipHazard) {
  ensureScene()
  store.addHazard(hazard)
  activeTab.value = 'tracker'
}

function loadSceneFromSidebar(scene: TscSavedScene) {
  if (store.state.activeScene && !confirm('Replace the running tactical scene?')) return
  store.startScene(scene)
  activeTab.value = 'tracker'
}

function editShipFromSidebar(ship: PlayerStarship) {
  editingShip.value = ship
  activeTab.value = 'ship'
}

function saveCurrentSetup() {
  const saved = store.saveActiveSceneAsTemplate()
  if (!saved) alert('Start a tactical scene first, then save it.')
}

defineExpose({ loadSceneFromSidebar, editShipFromSidebar, saveCurrentSetup })
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="tabs px-3 pt-2 border-b border-[var(--color-border)] flex gap-1 shrink-0">
      <button class="tab" :class="{ 'tab-active': activeTab === 'tracker' }" @click="activeTab = 'tracker'">
        Tracker <span v-if="hasActiveScene" class="inline-block w-2 h-2 bg-success animate-pulse ml-1" title="Scene running"></span>
      </button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'library' }" @click="activeTab = 'library'">Library</button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'ship' }" @click="activeTab = 'ship'">Player Ship</button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'builder' }" @click="activeTab = 'builder'">Builder</button>
    </div>

    <div class="flex-1 overflow-hidden p-3">
      <!-- Tracker -->
      <div v-if="activeTab === 'tracker'" class="h-full overflow-hidden">
        <TscTracker @open-library="activeTab = 'library'" @open-ship="activeTab = 'ship'" />
      </div>

      <!-- Library -->
      <div v-else-if="activeTab === 'library'" class="h-full flex flex-col">
        <div class="flex gap-1 mb-2 shrink-0">
          <button class="btn-xs" :class="libraryTab === 'starships' ? 'btn-primary' : 'btn-secondary'" @click="libraryTab = 'starships'">Starships</button>
          <button class="btn-xs" :class="libraryTab === 'hazards' ? 'btn-primary' : 'btn-secondary'" @click="libraryTab = 'hazards'">Starship Hazards</button>
          <button class="btn-xs" :class="libraryTab === 'vehicles' ? 'btn-primary' : 'btn-secondary'" @click="libraryTab = 'vehicles'">Vehicles</button>
        </div>
        <div class="flex-1 overflow-hidden">
          <TscStarshipSearch v-if="libraryTab === 'starships'" :party-level="partyLevel" add-label="Add to scene" cloneable @add="addShipToScene" @clone="cloneToBuilder" @edit="editInBuilder" />
          <TscHazardSearch v-else-if="libraryTab === 'hazards'" :party-level="partyLevel" add-label="Add to scene" @add="addHazardToScene" />
          <VehicleSearch v-else />
        </div>
      </div>

      <!-- Player ship -->
      <div v-else-if="activeTab === 'ship'" class="h-full overflow-hidden">
        <TscPlayerShipSheet :ship="editingShip" @saved="(ship) => (editingShip = ship)" />
      </div>

      <!-- Builder -->
      <div v-else class="h-full overflow-hidden">
        <TscStarshipBuilder :ship="builderShip" :editing="builderEditing" @saved="(ship) => { builderShip = ship; builderEditing = true }" />
      </div>
    </div>
  </div>
</template>
