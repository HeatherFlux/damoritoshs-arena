<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEncounterStore } from '../stores/encounterStore'
import type { Hazard } from '../types/hazard'
import { formatComplexity, formatHazardType, calculateHazardXP } from '../types/hazard'

const store = useEncounterStore()

const searchQuery = ref('')
const levelFilter = ref<number | null>(null)
const complexityFilter = ref<'' | 'simple' | 'complex'>('')
const typeFilter = ref<'' | 'trap' | 'environmental' | 'haunt'>('')
const expandedHazard = ref<string | null>(null)

// Filtered hazards
const filteredHazards = computed(() => {
  let results = store.state.hazards

  // Apply text search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    results = results.filter(h =>
      h.name.toLowerCase().includes(query) ||
      h.description.toLowerCase().includes(query) ||
      h.traits.some(t => t.toLowerCase().includes(query))
    )
  }

  // Apply level filter
  if (levelFilter.value !== null) {
    results = results.filter(h => h.level === levelFilter.value)
  }

  // Apply complexity filter
  if (complexityFilter.value) {
    results = results.filter(h => h.complexity === complexityFilter.value)
  }

  // Apply type filter
  if (typeFilter.value) {
    results = results.filter(h => h.type === typeFilter.value)
  }

  // Sort by level, then name
  return results.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.name.localeCompare(b.name)
  })
})

function addToEncounter(hazard: Hazard) {
  // Auto-create encounter if none exists
  if (!store.activeEncounter.value) {
    store.createEncounter()
  }
  store.addHazardToEncounter(hazard)
}

function toggleExpanded(hazardId: string) {
  expandedHazard.value = expandedHazard.value === hazardId ? null : hazardId
}

function clearFilters() {
  searchQuery.value = ''
  levelFilter.value = null
  complexityFilter.value = ''
  typeFilter.value = ''
}

function getXP(hazard: Hazard): number {
  return calculateHazardXP(hazard, store.state.partyLevel)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Hazards</h2>
      <span class="text-xs text-dim">{{ filteredHazards.length }} / {{ store.state.hazards.length }}</span>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-2 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search hazards..."
        class="input"
      />

      <div class="flex gap-2 flex-wrap">
        <select v-model.number="levelFilter" class="input select flex-1 min-w-[100px]">
          <option :value="null">Any Level</option>
          <option v-for="n in 11" :key="n - 1" :value="n - 1">Level {{ n - 1 }}</option>
        </select>

        <select v-model="complexityFilter" class="input select flex-1 min-w-[100px]">
          <option value="">Any Complexity</option>
          <option value="simple">Simple</option>
          <option value="complex">Complex</option>
        </select>

        <select v-model="typeFilter" class="input select flex-1 min-w-[100px]">
          <option value="">Any Type</option>
          <option value="trap">Trap</option>
          <option value="environmental">Environmental</option>
          <option value="haunt">Haunt</option>
        </select>

        <button
          v-if="searchQuery || levelFilter !== null || complexityFilter || typeFilter"
          class="btn-secondary btn-sm"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Hazard List -->
    <div class="flex-1 overflow-y-auto flex flex-col gap-2">
      <div
        v-for="hazard in filteredHazards"
        :key="hazard.id"
        class="card p-0"
        :class="{ 'card-selected': expandedHazard === hazard.id }"
      >
        <!-- Hazard Header -->
        <div
          class="flex justify-between items-center p-3 cursor-pointer"
          @click="toggleExpanded(hazard.id)"
        >
          <div class="flex-1 min-w-0">
            <span class="block font-semibold mb-1.5">{{ hazard.name }}</span>
            <div class="flex gap-1.5 flex-wrap">
              <span
                class="badge-level text-[0.6875rem]"
                :class="{
                  'badge-level-success': hazard.level < store.state.partyLevel,
                  'badge-level-warning': hazard.level === store.state.partyLevel,
                  'badge-level-danger': hazard.level > store.state.partyLevel
                }"
              >
                Lvl {{ hazard.level }}
              </span>
              <span
                class="text-[0.6875rem] px-1.5 py-0.5 rounded bg-elevated"
                :class="{
                  'text-dim': hazard.complexity === 'simple',
                  'text-warning': hazard.complexity === 'complex'
                }"
              >
                {{ formatComplexity(hazard.complexity) }}
              </span>
              <span
                class="text-[0.6875rem] px-1.5 py-0.5 rounded bg-elevated"
                :class="{
                  'text-danger': hazard.type === 'trap',
                  'text-success': hazard.type === 'environmental',
                  'text-hazard': hazard.type === 'haunt'
                }"
              >
                {{ formatHazardType(hazard.type) }}
              </span>
              <span class="badge-xp">{{ getXP(hazard) }} XP</span>
            </div>
          </div>
          <div class="ml-2">
            <button
              class="w-7 h-7 rounded bg-[var(--color-accent)] text-white text-xl font-semibold flex items-center justify-center transition-all duration-150 hover:scale-105"
              @click.stop="addToEncounter(hazard)"
              title="Add to encounter"
            >
              +
            </button>
          </div>
        </div>

        <!-- Hazard Details (Expanded) -->
        <div v-if="expandedHazard === hazard.id" class="px-3 pb-3 pt-3 border-t border-[var(--color-border)]">
          <p class="text-sm text-dim mb-3">{{ hazard.description }}</p>

          <!-- Stats Grid -->
          <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 mb-3">
            <div v-if="hazard.stealth" class="flex gap-2 text-[0.8125rem]">
              <span class="font-semibold text-accent">Stealth</span>
              <span>{{ hazard.stealth }}</span>
            </div>
            <div v-if="hazard.disable" class="flex gap-2 text-[0.8125rem]">
              <span class="font-semibold text-accent">Disable</span>
              <span>{{ hazard.disable }}</span>
            </div>
            <div v-if="hazard.ac" class="flex gap-2 text-[0.8125rem]">
              <span class="font-semibold text-accent">AC</span>
              <span>{{ hazard.ac }}</span>
            </div>
            <div v-if="hazard.hp" class="flex gap-2 text-[0.8125rem]">
              <span class="font-semibold text-accent">HP</span>
              <span>{{ hazard.hp }}{{ hazard.bt ? ` (BT ${hazard.bt})` : '' }}</span>
            </div>
            <div v-if="hazard.hardness" class="flex gap-2 text-[0.8125rem]">
              <span class="font-semibold text-accent">Hardness</span>
              <span>{{ hazard.hardness }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="hazard.actions.length" class="flex flex-col gap-2 mb-3">
            <div
              v-for="(action, idx) in hazard.actions"
              :key="idx"
              class="bg-elevated p-2 rounded text-[0.8125rem]"
            >
              <div class="flex items-center gap-1.5 mb-1">
                <span class="font-semibold text-accent">{{ action.name }}</span>
                <span v-if="action.actionType === 'reaction'" class="text-base">⟲</span>
              </div>
              <p v-if="action.trigger" class="my-1 text-dim">
                <strong>Trigger</strong> {{ action.trigger }}
              </p>
              <p class="my-1 text-dim">{{ action.effect }}</p>
              <p v-if="action.damage" class="my-1 text-dim">
                <strong>Damage</strong> {{ action.damage }}
                <span v-if="action.dc"> (DC {{ action.dc }} {{ action.save }})</span>
              </p>
            </div>
          </div>

          <p v-if="hazard.routine" class="text-[0.8125rem] mb-2 text-dim">
            <strong>Routine</strong> {{ hazard.routine }}
          </p>

          <p v-if="hazard.reset" class="text-[0.8125rem] mb-2 text-dim">
            <strong>Reset</strong> {{ hazard.reset }}
          </p>

          <!-- Footer -->
          <div class="flex justify-between text-[0.6875rem] text-muted pt-2 border-t border-[var(--color-border)]">
            <span>{{ hazard.source }}</span>
            <span class="italic">{{ hazard.traits.join(', ') }}</span>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-if="filteredHazards.length === 0" class="text-center py-8 text-dim">
        No hazards found matching your filters.
      </div>
    </div>
  </div>
</template>
