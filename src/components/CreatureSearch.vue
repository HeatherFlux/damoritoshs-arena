<script setup lang="ts">
import { ref, computed } from 'vue'
import Fuse from 'fuse.js'
import { useEncounterStore } from '../stores/encounterStore'
import type { Creature, CreatureAdjustment } from '../types/creature'
import CreatureCard from './CreatureCard.vue'

const store = useEncounterStore()

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
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Creatures</h2>
      <span class="text-xs text-dim">{{ filteredCreatures.length }} / {{ store.state.creatures.length }}</span>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-2 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search creatures..."
        class="input"
      />

      <div class="flex gap-2">
        <select v-model.number="levelFilter" class="input select flex-1">
          <option :value="null">Any Level</option>
          <option v-for="n in 25" :key="n - 1" :value="n - 1">Level {{ n - 1 }}</option>
        </select>

        <select v-model="traitFilter" class="input select flex-1">
          <option value="">Any Trait</option>
          <option v-for="trait in availableTraits" :key="trait" :value="trait">
            {{ trait }}
          </option>
        </select>

        <button
          v-if="searchQuery || levelFilter !== null || traitFilter"
          class="btn-secondary btn-sm"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Creature List -->
    <div class="flex-1 overflow-y-auto flex flex-col gap-2">
      <div
        v-for="creature in filteredCreatures"
        :key="creature.id"
        class="card p-3"
      >
        <!-- Creature Header -->
        <div
          class="flex justify-between items-center cursor-pointer"
          @click="toggleStatblock(creature.id)"
        >
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-7 h-7 bg-[var(--color-accent)] text-white text-xs font-bold rounded">
              {{ creature.level }}
            </span>
            <span class="font-medium">{{ creature.name }}</span>
          </div>
          <div class="flex gap-1">
            <button
              class="btn-secondary btn-compact"
              title="Add Weak"
              @click.stop="addToEncounter(creature, 'weak')"
            >
              W
            </button>
            <button
              class="btn-primary btn-compact"
              title="Add Normal"
              @click.stop="addToEncounter(creature, 'normal')"
            >
              +
            </button>
            <button
              class="btn-secondary btn-compact"
              title="Add Elite"
              @click.stop="addToEncounter(creature, 'elite')"
            >
              E
            </button>
          </div>
        </div>

        <!-- Traits -->
        <div class="flex flex-wrap gap-1 mt-2">
          <span
            v-for="trait in creature.traits"
            :key="trait"
            class="trait"
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
