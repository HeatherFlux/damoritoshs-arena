<script setup lang="ts">
import { useEncounterStore } from '../stores/encounterStore'

const store = useEncounterStore()

const emit = defineEmits<{
  import: []
  export: []
}>()

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getCreatureCount(encounterId: string): number {
  const encounter = store.state.encounters.find(e => e.id === encounterId)
  if (!encounter) return 0
  return encounter.creatures.reduce((sum, c) => sum + c.count, 0)
}

function getHazardCount(encounterId: string): number {
  const encounter = store.state.encounters.find(e => e.id === encounterId)
  if (!encounter?.hazards) return 0
  return encounter.hazards.reduce((sum, h) => sum + h.count, 0)
}

function getThreatSummary(encounterId: string): string {
  const creatures = getCreatureCount(encounterId)
  const hazards = getHazardCount(encounterId)
  const parts: string[] = []
  if (creatures > 0) parts.push(`${creatures} creature${creatures !== 1 ? 's' : ''}`)
  if (hazards > 0) parts.push(`${hazards} hazard${hazards !== 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(', ') : 'Empty'
}

function clearAll() {
  if (confirm('Clear all encounters? This cannot be undone.')) {
    store.clearAllEncounters()
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-4">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="text-base font-semibold mb-2">Encounters</h2>
      <div class="flex gap-1">
        <button class="btn-secondary btn-xs" @click="emit('import')">
          Import
        </button>
        <button class="btn-secondary btn-xs" @click="emit('export')">
          Export
        </button>
        <button class="btn-primary btn-xs" @click="store.createEncounter()">
          New
        </button>
      </div>
    </div>

    <!-- Encounter List -->
    <div class="flex-1 overflow-y-auto flex flex-col gap-2">
      <div
        v-for="encounter in store.state.encounters"
        :key="encounter.id"
        class="group flex items-center justify-between p-3 bg-elevated border border-transparent rounded-md cursor-pointer transition-all duration-150 hover:border-[var(--color-border)]"
        :class="{
          'border-[var(--color-accent)] bg-accent-subtle': encounter.id === store.state.activeEncounterId
        }"
        @click="store.setActiveEncounter(encounter.id)"
      >
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="font-medium text-sm truncate">{{ encounter.name }}</span>
          <span class="text-[0.6875rem] text-dim">
            {{ getThreatSummary(encounter.id) }} &middot;
            {{ formatDate(encounter.updatedAt) }}
          </span>
        </div>
        <button
          class="btn-icon bg-transparent border-none text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:text-danger"
          @click.stop="store.deleteEncounter(encounter.id)"
          title="Delete encounter"
        >
          &times;
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="store.state.encounters.length === 0" class="text-center py-8 px-4 text-dim text-sm">
        <p>No encounters yet</p>
        <p class="text-xs mt-2">Click "New" to create one</p>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="store.state.encounters.length > 0" class="pt-3 border-t border-[var(--color-border)] mt-3">
      <button
        class="btn btn-sm bg-transparent text-dim border border-[var(--color-border)] text-[0.6875rem] hover:bg-danger-subtle hover:border-[var(--color-danger)] hover:text-danger"
        @click="clearAll"
      >
        Clear All
      </button>
    </div>
  </div>
</template>
