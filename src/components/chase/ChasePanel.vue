<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { usePartyStore } from '../../stores/partyStore'
import type { SampleChaseObstacle, SavedChase } from '../../types/chase'
import type { Vehicle } from '../../types/tsc'
import {
  createEmptyChase,
  createVehicleInstance,
  lengthForCount,
  obstacleFromSample,
  suggestedChasePoints,
} from '../../utils/chaseRules'
import ChaseTracker from './ChaseTracker.vue'
import ChaseBuilder from './ChaseBuilder.vue'
import ChaseObstacleLibrary from './ChaseObstacleLibrary.vue'
import VehicleSearch from '../tsc/VehicleSearch.vue'

type SubTab = 'tracker' | 'builder' | 'obstacles' | 'vehicles'

const store = useChaseStore()
const partyStore = usePartyStore()

const activeTab = ref<SubTab>(store.state.activeScene ? 'tracker' : 'builder')
const draft = ref<SavedChase>(newDraft())
/** Side that the next vehicle picked in the library goes to. */
const vehicleTarget = ref<{ where: 'scene' | 'draft'; sideId: string } | null>(null)
const notice = ref('')

const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const partySize = computed(() => partyStore.partySize.value || 4)
const hasActiveScene = computed(() => !!store.state.activeScene)
const draftIsSaved = computed(() => !!store.getSavedChase(draft.value.id))

const vehicleTargetSide = computed(() => {
  const t = vehicleTarget.value
  if (!t) return null
  const sides = t.where === 'scene' ? store.state.activeScene?.sides : draft.value.sides
  return sides?.find(s => s.id === t.sideId) ?? null
})

/** Sides a vehicle can go to: the running chase if there is one, otherwise the draft. */
const vehicleSides = computed(() => {
  const where = hasActiveScene.value ? 'scene' as const : 'draft' as const
  const sides = where === 'scene' ? store.state.activeScene!.sides : draft.value.sides
  return sides.map(s => ({ where, sideId: s.id, name: s.name }))
})

function newDraft(): SavedChase {
  const chase = createEmptyChase('run-away')
  chase.level = partyStore.partyLevel.value || 1
  return chase
}

function flash(text: string) {
  notice.value = text
  setTimeout(() => { if (notice.value === text) notice.value = '' }, 2000)
}

function saveDraft() {
  store.saveChase(draft.value)
  flash('Saved')
}

function startDraft() {
  if (hasActiveScene.value && !confirm('Replace the chase that is running?')) return
  store.saveChase(draft.value)
  store.startChase(draft.value)
  addPartyIfEmpty()
  activeTab.value = 'tracker'
}

/** A chase started with no one on the party's side picks up the active party. */
function addPartyIfEmpty() {
  const side = store.state.activeScene?.sides.find(s => s.isPlayers)
  if (side && side.members.length === 0) store.addMembersFromParty(side.id, partyStore.getPartyPlayers())
}

function newChase() {
  draft.value = newDraft()
  activeTab.value = 'builder'
}

function addSampleObstacle(sample: SampleChaseObstacle) {
  const c = draft.value
  c.obstacles.push(obstacleFromSample(sample, suggestedChasePoints(partySize.value, c.obstacles.length)))
  c.length = lengthForCount(c.obstacles.length)
  if (c.type === 'beat-the-clock') c.end.roundLimit = c.obstacles.length
}

function chooseVehicleFor(where: 'scene' | 'draft', sideId: string) {
  vehicleTarget.value = { where, sideId }
  activeTab.value = 'vehicles'
}

function attachVehicle(vehicle: Vehicle) {
  const target = vehicleTarget.value ?? vehicleSides.value[0] ?? null
  if (!target) return
  if (target.where === 'scene') {
    store.attachVehicle(target.sideId, vehicle)
    activeTab.value = 'tracker'
  } else {
    const side = draft.value.sides.find(s => s.id === target.sideId)
    if (!side) return
    const same = side.vehicles.filter(v => v.vehicle.id === vehicle.id).length
    side.vehicles.push(createVehicleInstance(vehicle, same ? `${vehicle.name} ${same + 1}` : vehicle.name))
    activeTab.value = 'builder'
  }
  vehicleTarget.value = null
}

// ---- Called from the sidebar through App.vue ----

function editChaseFromSidebar(chase: SavedChase) {
  draft.value = JSON.parse(JSON.stringify(chase))
  activeTab.value = 'builder'
}

function startChaseFromSidebar(chase: SavedChase) {
  if (hasActiveScene.value && !confirm('Replace the chase that is running?')) return
  store.startChase(chase)
  addPartyIfEmpty()
  activeTab.value = 'tracker'
}

defineExpose({ editChaseFromSidebar, startChaseFromSidebar, newChase })
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="tabs px-3 pt-2 border-b border-[var(--color-border)] flex items-center gap-1 shrink-0">
      <button class="tab" :class="{ 'tab-active': activeTab === 'tracker' }" @click="activeTab = 'tracker'">
        Tracker <span v-if="hasActiveScene" class="inline-block w-2 h-2 bg-success animate-pulse ml-1" title="Chase running"></span>
      </button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'builder' }" @click="activeTab = 'builder'">Builder</button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'obstacles' }" @click="activeTab = 'obstacles'">Obstacles</button>
      <button class="tab" :class="{ 'tab-active': activeTab === 'vehicles' }" @click="activeTab = 'vehicles'">Vehicles</button>
      <span v-if="notice" class="ml-auto text-[0.6875rem] text-success">{{ notice }}</span>
    </div>

    <div class="flex-1 overflow-hidden p-3">
      <div v-if="activeTab === 'tracker'" class="h-full overflow-hidden">
        <ChaseTracker @open-builder="activeTab = 'builder'" @add-vehicle="(id) => chooseVehicleFor('scene', id)" />
      </div>

      <div v-else-if="activeTab === 'builder'" class="h-full overflow-hidden">
        <ChaseBuilder
          :chase="draft"
          :saved="draftIsSaved"
          @save="saveDraft"
          @start="startDraft"
          @new="newChase"
          @open-obstacles="activeTab = 'obstacles'"
          @add-vehicle="(id) => chooseVehicleFor('draft', id)"
        />
      </div>

      <div v-else-if="activeTab === 'obstacles'" class="h-full flex flex-col">
        <p class="text-[0.75rem] text-dim mb-2 shrink-0">
          Adding puts the obstacle at the end of <span class="font-semibold text-text">{{ draft.name }}</span> in the builder ({{ draft.obstacles.length }} so far).
        </p>
        <div class="flex-1 overflow-hidden">
          <ChaseObstacleLibrary add-label="Add" :party-level="partyLevel" @add="addSampleObstacle" />
        </div>
      </div>

      <div v-else class="h-full flex flex-col">
        <div class="text-[0.75rem] mb-2 shrink-0 flex flex-wrap items-center gap-2">
          <span class="trait bg-surface text-dim" title="The chase rules do not use vehicle statistics. Attaching one lets you track its condition and see its piloting DCs.">table aid</span>
          <template v-if="vehicleSides.length">
            <span class="text-dim">Attach to</span>
            <select
              :value="vehicleTargetSide ? vehicleTarget!.sideId : vehicleSides[0].sideId"
              class="input input-sm select w-44"
              @change="vehicleTarget = { where: vehicleSides[0].where, sideId: ($event.target as HTMLSelectElement).value }"
            >
              <option v-for="s in vehicleSides" :key="s.sideId" :value="s.sideId">{{ s.name }}</option>
            </select>
            <span class="text-dim">in {{ hasActiveScene ? 'the running chase' : 'the builder' }}.</span>
          </template>
        </div>
        <div class="flex-1 overflow-hidden">
          <VehicleSearch select-label="Attach" @select="attachVehicle" />
        </div>
      </div>
    </div>
  </div>
</template>
