<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import type { NpcStarship, StarshipSize } from '../../types/tsc'
import { factionOptions, sizeLabel } from '../../utils/tscStatBlock'
import TscStarshipStatBlock from './TscStarshipStatBlock.vue'

const props = withDefaults(defineProps<{
  /** Label for the add button; omit to hide it. */
  addLabel?: string
  /** Party level used to color level badges. */
  partyLevel?: number
  /** Show a "Clone" action (custom starship builder). */
  cloneable?: boolean
}>(), { addLabel: 'Add to scene', partyLevel: 1, cloneable: false })

const emit = defineEmits<{
  (e: 'add', ship: NpcStarship): void
  (e: 'clone', ship: NpcStarship): void
  (e: 'edit', ship: NpcStarship): void
}>()

const store = useTscStore()

const searchQuery = ref('')
const levelFilter = ref<number | null>(null)
const sizeFilter = ref<'' | StarshipSize>('')
const factionFilter = ref('')
const expanded = ref<string | null>(null)

const factions = computed(() => factionOptions(store.allStarships.value))
const SIZES: StarshipSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

const filtered = computed(() => {
  let results = store.allStarships.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    results = results.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.faction.toLowerCase().includes(q) ||
      s.traits.some(t => t.toLowerCase().includes(q)) ||
      s.battleStations.some(st => st.entries.some(e => e.name.toLowerCase().includes(q))),
    )
  }
  if (levelFilter.value !== null) results = results.filter(s => s.level === levelFilter.value)
  if (sizeFilter.value) results = results.filter(s => s.size === sizeFilter.value)
  if (factionFilter.value) results = results.filter(s => s.faction === factionFilter.value)
  return [...results].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
})

const hasFilters = computed(() => !!searchQuery.value || levelFilter.value !== null || !!sizeFilter.value || !!factionFilter.value)

function clearFilters() {
  searchQuery.value = ''
  levelFilter.value = null
  sizeFilter.value = ''
  factionFilter.value = ''
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
      <h2 class="text-base lg:text-lg font-semibold">NPC Starships</h2>
      <span class="text-xs text-dim">{{ filtered.length }} / {{ store.allStarships.value.length }}</span>
    </div>

    <div class="flex flex-col gap-2 mb-3">
      <input v-model="searchQuery" type="text" placeholder="Search starships, factions, stations..." class="input input-sm lg:input" />
      <div class="grid grid-cols-2 lg:flex gap-2">
        <select v-model.number="levelFilter" class="input input-sm lg:input select flex-1">
          <option :value="null">Any Level</option>
          <option v-for="n in 21" :key="n - 2" :value="n - 2">Level {{ n - 2 }}</option>
        </select>
        <select v-model="sizeFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Size</option>
          <option v-for="s in SIZES" :key="s" :value="s">{{ sizeLabel(s) }}</option>
        </select>
        <select v-model="factionFilter" class="input input-sm lg:input select flex-1 col-span-2 lg:col-span-1">
          <option value="">Any Faction</option>
          <option v-for="f in factions" :key="f" :value="f">{{ f }}</option>
        </select>
        <button v-if="hasFilters" class="btn-secondary btn-xs lg:btn-sm col-span-2 lg:col-span-1" @click="clearFilters">Clear</button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 lg:gap-2">
      <div v-for="ship in filtered" :key="ship.id" class="card p-0" :class="{ 'card-selected': expanded === ship.id }">
        <div class="flex justify-between items-center p-2 lg:p-3 cursor-pointer" @click="toggle(ship.id)">
          <div class="flex-1 min-w-0">
            <span class="block font-semibold text-sm lg:text-base mb-1 truncate">
              {{ ship.name }}
              <span v-if="store.isCustomStarship(ship.id)" class="text-[0.625rem] text-accent uppercase ml-1">custom</span>
            </span>
            <div class="flex gap-1 lg:gap-1.5 flex-wrap">
              <span class="badge-level text-[0.5625rem] lg:text-[0.6875rem]" :class="levelClass(ship.level)">Lvl {{ ship.level }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ sizeLabel(ship.size) }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">{{ ship.faction }}</span>
              <span class="text-[0.5625rem] lg:text-[0.6875rem] px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-dim">HP {{ ship.hp }}<span v-if="ship.sp !== undefined"> · SP {{ ship.sp }}</span></span>
            </div>
          </div>
          <div class="ml-2 flex items-center gap-1">
            <button v-if="cloneable" class="btn-secondary btn-xs" title="Clone into the builder" @click.stop="emit('clone', ship)">Clone</button>
            <button v-if="cloneable && store.isCustomStarship(ship.id)" class="btn-secondary btn-xs" title="Edit" @click.stop="emit('edit', ship)">Edit</button>
            <button
              v-if="addLabel"
              class="w-6 h-6 lg:w-7 lg:h-7 rounded bg-[var(--color-accent)] text-white text-lg lg:text-xl font-semibold flex items-center justify-center transition-all duration-150 hover:scale-105"
              :title="addLabel"
              @click.stop="emit('add', ship)"
            >+</button>
          </div>
        </div>
        <div v-if="expanded === ship.id" class="px-2 lg:px-3 pb-2 lg:pb-3 pt-2 border-t border-[var(--color-border)]">
          <TscStarshipStatBlock :ship="ship" />
        </div>
      </div>
      <div v-if="filtered.length === 0" class="text-center py-6 lg:py-8 text-dim text-sm">No starships match your filters.</div>
    </div>
  </div>
</template>
