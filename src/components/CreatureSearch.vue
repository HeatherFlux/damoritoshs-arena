<script setup lang="ts">
import { ref, computed } from 'vue'
import Fuse from 'fuse.js'
import { useEncounterStore } from '../stores/encounterStore'
import { useCustomPanelStore } from '../stores/customPanelStore'
import type { Creature, CreatureAdjustment } from '../types/creature'
import CreatureCard from './CreatureCard.vue'

const emit = defineEmits<{
  (e: 'edit-creature'): void
}>()

const store = useEncounterStore()
const customPanelStore = useCustomPanelStore()

const searchQuery = ref('')
const levelFilter = ref<number | null>(null)
const traitFilter = ref('')
const showStatblock = ref<string | null>(null)

// Set up Fuse.js for fuzzy search
const fuse = computed(() => new Fuse(store.state.creatures, {
  keys: ['name', 'traits', 'source'],
  threshold: 0.3,
  ignoreLocation: true,
}))

// Get unique traits for filter dropdown
const availableTraits = computed(() => {
  const traits = new Set<string>()
  store.state.creatures.forEach(c => c.traits.forEach(t => traits.add(t)))
  return Array.from(traits).sort()
})

// Filtered creatures
const filteredCreatures = computed(() => {
  let results = store.state.creatures

  // Apply text search
  if (searchQuery.value.trim()) {
    results = fuse.value.search(searchQuery.value).map(r => r.item)
  }

  // Apply level filter
  if (levelFilter.value !== null) {
    results = results.filter(c => c.level === levelFilter.value)
  }

  // Apply trait filter
  if (traitFilter.value) {
    results = results.filter(c =>
      c.traits.some(t => t.toLowerCase() === traitFilter.value.toLowerCase())
    )
  }

  // Sort by level, then name
  return results.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name)
  })
})

function addToEncounter(creature: Creature, adjustment: CreatureAdjustment = 'normal') {
  // Auto-create encounter if none exists
  if (!store.activeEncounter.value) {
    store.createEncounter()
  }
  store.addCreatureToEncounter(creature, adjustment)
}

function toggleStatblock(creatureId: string) {
  showStatblock.value = showStatblock.value === creatureId ? null : creatureId
}

function clearFilters() {
  searchQuery.value = ''
  levelFilter.value = null
  traitFilter.value = ''
}

function editCreature(creature: Creature) {
  const isCustom = store.isCustomCreature(creature.id)
  if (isCustom) {
    customPanelStore.startEditing(creature, false)
  } else {
    customPanelStore.startEditing(creature, true, ' (Custom)')
  }
  emit('edit-creature')
}

function cloneCreature(creature: Creature) {
  customPanelStore.startEditing(creature, true, ' (Copy)')
  emit('edit-creature')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-3 lg:mb-4">
      <h2 class="text-base lg:text-lg font-semibold">Creatures</h2>
      <span class="text-xs text-dim">{{ filteredCreatures.length }} / {{ store.state.creatures.length }}</span>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-2 mb-3 lg:mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search creatures..."
        class="input input-sm lg:input"
      />

      <div class="grid grid-cols-2 lg:flex gap-2">
        <select v-model.number="levelFilter" class="input input-sm lg:input select flex-1">
          <option :value="null">Any Level</option>
          <option v-for="n in 25" :key="n - 1" :value="n - 1">Level {{ n - 1 }}</option>
        </select>

        <select v-model="traitFilter" class="input input-sm lg:input select flex-1">
          <option value="">Any Trait</option>
          <option v-for="trait in availableTraits" :key="trait" :value="trait">
            {{ trait }}
          </option>
        </select>

        <button
          v-if="searchQuery || levelFilter !== null || traitFilter"
          class="btn-secondary btn-xs lg:btn-sm col-span-2 lg:col-span-1"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Creature List -->
    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 lg:gap-2">
      <div
        v-for="creature in filteredCreatures"
        :key="creature.id"
        class="card p-2 lg:p-3"
      >
        <!-- Creature Header -->
        <div
          class="flex justify-between items-center gap-2 cursor-pointer"
          @click="toggleStatblock(creature.id)"
        >
          <div class="flex items-center gap-2 lg:gap-3 min-w-0">
            <span class="inline-flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 bg-[var(--color-accent)] text-white text-xs font-bold rounded shrink-0">
              {{ creature.level }}
            </span>
            <span class="font-medium text-sm lg:text-base truncate">{{ creature.name }}</span>
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              class="btn-secondary btn-compact text-xs"
              title="Edit creature"
              @click.stop="editCreature(creature)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z"/></svg>
            </button>
            <button
              class="btn-secondary btn-compact text-xs"
              title="Clone as template"
              @click.stop="cloneCreature(creature)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>
            </button>
            <button
              class="btn-secondary btn-compact text-xs"
              title="Add Weak"
              @click.stop="addToEncounter(creature, 'weak')"
            >
              W
            </button>
            <button
              class="btn-primary btn-compact text-xs"
              title="Add Normal"
              @click.stop="addToEncounter(creature, 'normal')"
            >
              +
            </button>
            <button
              class="btn-secondary btn-compact text-xs"
              title="Add Elite"
              @click.stop="addToEncounter(creature, 'elite')"
            >
              E
            </button>
          </div>
        </div>

        <!-- Traits -->
        <div class="flex flex-wrap gap-1 mt-1.5 lg:mt-2">
          <span
            v-for="trait in creature.traits"
            :key="trait"
            class="trait text-[0.5625rem] lg:text-[0.625rem]"
            :class="{
              'trait-size': ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].includes(trait),
              'trait-rarity-uncommon': trait === 'Uncommon',
              'trait-rarity-rare': trait === 'Rare',
              'trait-rarity-unique': trait === 'Unique',
            }"
          >
            {{ trait }}
          </span>
        </div>

        <!-- Statblock (Expanded) -->
        <CreatureCard
          v-if="showStatblock === creature.id"
          :creature="creature"
          class="mt-3 pt-3 border-t border-[var(--color-border)]"
        />
      </div>

      <!-- No Results -->
      <div v-if="filteredCreatures.length === 0" class="text-center py-8 text-dim">
        <p>No creatures found</p>
        <p class="text-sm mt-2">Try adjusting your filters or search term</p>
      </div>
    </div>
  </div>
</template>
