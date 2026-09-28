<script setup lang="ts">
import { ref, computed } from 'vue'
import { TSC_HAZARDS } from '../../data/tscHazards'
import type { StarshipHazard } from '../../types/tsc'
import TscHazardStatBlock from './TscHazardStatBlock.vue'

const props = withDefaults(defineProps<{
  addLabel?: string
  partyLevel?: number
}>(), { addLabel: 'Add to scene', partyLevel: 1 })

const emit = defineEmits<{ (e: 'add', hazard: StarshipHazard): void }>()

const searchQuery = ref('')
const levelFilter = ref<number | null>(null)
const complexityFilter = ref<'' | 'simple' | 'complex'>('')
const scaleFilter = ref<'' | 'starship' | 'deck'>('')
const expanded = ref<string | null>(null)

const filtered = computed(() => {
  let results = TSC_HAZARDS
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    results = results.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.description.toLowerCase().includes(q) ||
      h.traits.some(t => t.toLowerCase().includes(q)),
    )
  }
  if (levelFilter.value !== null) results = results.filter(h => h.level === levelFilter.value)
  if (complexityFilter.value) results = results.filter(h => h.complexity === complexityFilter.value)
  if (scaleFilter.value) results = results.filter(h => h.scale === scaleFilter.value)
  return [...results].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
})

const hasFilters = computed(() => !!searchQuery.value || levelFilter.value !== null || !!complexityFilter.value || !!scaleFilter.value)

function clearFilters() {
  searchQuery.value = ''
  levelFilter.value = null
  complexityFilter.value = ''
  scaleFilter.value = ''
}

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function levelClass(level: number) {
  return {
    'badge-level-success': level < props.partyLevel,
    'badge-level-warning': level === props.partyLevel,
    'badge-level-danger': level > props.partyLevel,
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base lg:text-lg font-semibold">Starship Hazards</h2>
      <span class="text-xs text-dim">{{ filtered.length }} / {{ TSC_HAZARDS.length }}</span>
    </div>

    <div class="flex flex-col gap-2 mb-3">
      <input v-model="searchQuery" type="text" placeholder="Search starship hazards..." class="input input-sm lg:input" />
      <div class="grid grid-cols-2 lg:flex gap-2">
        <select v-model.number="levelFilter" class="input input-sm lg:input select flex-1">
          <option :value="null">Any Level</option>
          <option v-for="n in 21" :key="n - 1" :value="n - 1">Level {{ n - 1 }}</option>
        </select>
        <select v-model="complexityFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Complexity</option>
          <option value="simple">Simple</option>
          <option value="complex">Complex</option>
        </select>
        <select v-model="scaleFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Map</option>
          <option value="starship">Sensor map</option>
          <option value="deck">Starship deck</option>
        </select>
        <button v-if="hasFilters" class="btn-secondary btn-xs lg:btn-sm col-span-2 lg:col-span-1" @click="clearFilters">Clear</button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 lg:gap-2">
      <div v-for="hazard in filtered" :key="hazard.id" class="card p-0" :class="{ 'card-selected': expanded === hazard.id }">
        <div class="flex justify-between items-center p-2 lg:p-3 cursor-pointer" @click="toggle(hazard.id)">
          <div class="flex-1 min-w-0">
            <span class="block font-semibold text-sm lg:text-base mb-1 truncate">{{ hazard.name }}</span>
            <div class="flex gap-1 lg:gap-1.5 flex-wrap">
              <span class="badge-level text-[0.5625rem] lg:text-[0.6875rem]" :class="levelClass(hazard.level)">Lvl {{ hazard.level }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated" :class="hazard.complexity === 'complex' ? 'text-warning' : 'text-dim'">{{ hazard.complexity }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ hazard.scale === 'starship' ? 'sensor map' : 'deck' }}</span>
            </div>
          </div>
          <div class="ml-2">
            <button
              v-if="addLabel"
              class="w-6 h-6 lg:w-7 lg:h-7 rounded bg-[var(--color-accent)] text-on-accent text-lg lg:text-xl font-semibold flex items-center justify-center transition-all duration-150 hover:scale-105"
              :title="addLabel"
              @click.stop="emit('add', hazard)"
            >+</button>
          </div>
        </div>
        <div v-if="expanded === hazard.id" class="px-2 lg:px-3 pb-2 lg:pb-3 pt-2 border-t border-[var(--color-border)]">
          <TscHazardStatBlock :hazard="hazard" />
        </div>
      </div>
      <div v-if="filtered.length === 0" class="text-center py-6 lg:py-8 text-dim text-sm">No hazards match your filters.</div>
    </div>
  </div>
</template>
