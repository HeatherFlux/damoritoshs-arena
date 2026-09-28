<script setup lang="ts">
import { ref, computed } from 'vue'
import { VEHICLES } from '../../data/vehicles'
import type { StarshipSize, Vehicle } from '../../types/tsc'
import { sizeLabel } from '../../utils/tscStatBlock'
import VehicleStatBlock from './VehicleStatBlock.vue'

const props = defineProps<{
  /** When set, each vehicle gets a button with this label that emits `select`. */
  selectLabel?: string
}>()

const emit = defineEmits<{
  (e: 'select', vehicle: Vehicle): void
}>()

const searchQuery = ref('')
const levelFilter = ref<number | null>(null)
const sizeFilter = ref<'' | StarshipSize>('')
const terrainFilter = ref<'' | 'land' | 'air' | 'sea' | 'hybrid'>('')
const expanded = ref<string | null>(null)

const LEVELS = [...new Set(VEHICLES.map(v => v.level))].sort((a, b) => a - b)
const SIZES: StarshipSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

/** Terrain class derived from the printed Speed line. */
function terrainOf(v: Vehicle): 'land' | 'air' | 'sea' | 'hybrid' {
  // Climbing and burrowing are ways of crossing land
  const kinds = new Set(v.speed.map(s => (!s.kind || s.kind === 'climb' || s.kind === 'burrow' ? 'land' : s.kind)))
  const hasFly = kinds.has('fly')
  const hasSwim = kinds.has('swim')
  const hasLand = kinds.has('land')
  if ([hasFly, hasSwim, hasLand].filter(Boolean).length > 1) return 'hybrid'
  if (hasFly) return 'air'
  if (hasSwim) return 'sea'
  return 'land'
}

const filtered = computed(() => {
  let results = VEHICLES
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    results = results.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.traits.some(t => t.toLowerCase().includes(q)),
    )
  }
  if (levelFilter.value !== null) results = results.filter(v => v.level === levelFilter.value)
  if (sizeFilter.value) results = results.filter(v => v.size === sizeFilter.value)
  if (terrainFilter.value) results = results.filter(v => terrainOf(v) === terrainFilter.value)
  return [...results].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
})

const hasFilters = computed(() => !!searchQuery.value || levelFilter.value !== null || !!sizeFilter.value || !!terrainFilter.value)

function clearFilters() {
  searchQuery.value = ''
  levelFilter.value = null
  sizeFilter.value = ''
  terrainFilter.value = ''
}

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base lg:text-lg font-semibold">Vehicles</h2>
      <span class="text-xs text-dim">{{ filtered.length }} / {{ VEHICLES.length }}</span>
    </div>

    <div class="flex flex-col gap-2 mb-3">
      <input v-model="searchQuery" type="text" placeholder="Search vehicles..." class="input input-sm lg:input" />
      <div class="grid grid-cols-2 lg:flex gap-2">
        <select v-model.number="levelFilter" class="input input-sm lg:input select flex-1">
          <option :value="null">Any Level</option>
          <option v-for="n in LEVELS" :key="n" :value="n">Level {{ n }}</option>
        </select>
        <select v-model="sizeFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Size</option>
          <option v-for="s in SIZES" :key="s" :value="s">{{ sizeLabel(s) }}</option>
        </select>
        <select v-model="terrainFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Terrain</option>
          <option value="land">Land</option>
          <option value="air">Air</option>
          <option value="sea">Sea</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <button v-if="hasFilters" class="btn-secondary btn-xs lg:btn-sm col-span-2 lg:col-span-1" @click="clearFilters">Clear</button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 lg:gap-2">
      <div v-for="vehicle in filtered" :key="vehicle.id" class="card p-0" :class="{ 'card-selected': expanded === vehicle.id }">
        <div class="flex justify-between items-center p-2 lg:p-3 cursor-pointer" @click="toggle(vehicle.id)">
          <div class="flex-1 min-w-0">
            <span class="block font-semibold text-sm lg:text-base mb-1 truncate">{{ vehicle.name }}</span>
            <div class="flex gap-1 lg:gap-1.5 flex-wrap">
              <span class="badge-level text-[0.5625rem] lg:text-[0.6875rem]">Lvl {{ vehicle.level }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ sizeLabel(vehicle.size) }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ terrainOf(vehicle) }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ vehicle.price }}</span>
            </div>
          </div>
          <button
            v-if="props.selectLabel"
            class="btn-primary btn-xs shrink-0 ml-2"
            @click.stop="emit('select', vehicle)"
          >{{ props.selectLabel }}</button>
        </div>
        <div v-if="expanded === vehicle.id" class="px-2 lg:px-3 pb-2 lg:pb-3 pt-2 border-t border-[var(--color-border)]">
          <VehicleStatBlock :vehicle="vehicle" />
        </div>
      </div>
      <div v-if="filtered.length === 0" class="text-center py-6 lg:py-8 text-dim text-sm">No vehicles match your filters.</div>
    </div>
  </div>
</template>
