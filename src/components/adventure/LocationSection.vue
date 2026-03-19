<script setup lang="ts">
import { computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import { generateLocation, generateLocations } from '../../utils/adventureGenerator'
import EntryCard from './EntryCard.vue'
import InspireButton from './InspireButton.vue'

const store = useAdventureStore()

const locations = computed(() => store.state.currentAdventure?.locations || [])

function handleAdd() {
  store.addLocation('New location...')
  const locs = store.state.currentAdventure?.locations
  const newLoc = locs?.[locs.length - 1]
  if (newLoc) store.state.editingEntryId = newLoc.id
}

function handleInspire(count: number) {
  const generated = count === 1 ? [generateLocation()] : generateLocations(count)
  for (const loc of generated) {
    store.addLocation(loc.text, loc.environment, true)
  }
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-2">
        <span class="text-accent/60">&gt;&gt;</span> FANTASTIC LOCATIONS
        <span v-if="locations.length" class="text-dim font-normal">({{ locations.length }})</span>
      </h3>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-xs" @click="handleAdd">+ Add</button>
        <InspireButton label="locations" @inspire="handleInspire" />
      </div>
    </div>
    <div v-if="locations.length" class="flex flex-col gap-2">
      <EntryCard
        v-for="loc in locations"
        :key="loc.id"
        :id="loc.id"
        :text="loc.text"
        :notes="loc.notes"
        :generated="loc.generated"
        :badges="loc.environment ? [{ label: loc.environment, color: 'bg-secondary/15 text-secondary' }] : []"
        :is-editing="store.state.editingEntryId === loc.id"
        @update:text="store.updateLocation(loc.id, { text: $event })"
        @update:notes="store.updateLocation(loc.id, { notes: $event || undefined })"
        @delete="store.removeLocation(loc.id)"
        @start-edit="store.state.editingEntryId = loc.id"
        @stop-edit="store.state.editingEntryId = null"
      />
    </div>
    <p v-else class="text-sm text-dim italic">
      No locations yet. Describe evocative places the party might visit.
    </p>
  </section>
</template>
