<script setup lang="ts">
import { computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import { generateSecret, generateSecrets } from '../../utils/adventureGenerator'
import EntryCard from './EntryCard.vue'
import InspireButton from './InspireButton.vue'

const store = useAdventureStore()

const secrets = computed(() => store.state.currentAdventure?.secrets || [])

function handleAdd() {
  store.addSecret('New secret or clue...')
  // Start editing the new entry
  const secrets = store.state.currentAdventure?.secrets
  const newSecret = secrets?.[secrets.length - 1]
  if (newSecret) store.state.editingEntryId = newSecret.id
}

function handleInspire(count: number) {
  const generated = count === 1 ? [generateSecret()] : generateSecrets(count)
  for (const s of generated) {
    store.addSecret(s.text, s.dangerLevel, true)
  }
}

function dangerBadge(level?: string) {
  if (!level) return null
  const colors: Record<string, string> = {
    low: 'bg-success/15 text-success',
    medium: 'bg-warning/15 text-warning',
    high: 'bg-danger/15 text-danger',
  }
  return { label: level, color: colors[level] || '' }
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-2">
        <span class="text-accent/60">&gt;&gt;</span> SECRETS & CLUES
        <span v-if="secrets.length" class="text-dim font-normal">({{ secrets.length }})</span>
      </h3>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-xs" @click="handleAdd">+ Add</button>
        <InspireButton label="secrets" @inspire="handleInspire" />
      </div>
    </div>
    <div v-if="secrets.length" class="flex flex-col gap-2">
      <EntryCard
        v-for="secret in secrets"
        :key="secret.id"
        :id="secret.id"
        :text="secret.text"
        :notes="secret.notes"
        :generated="secret.generated"
        :badges="[dangerBadge(secret.dangerLevel)].filter(Boolean) as any"
        :is-editing="store.state.editingEntryId === secret.id"
        @update:text="store.updateSecret(secret.id, { text: $event })"
        @update:notes="store.updateSecret(secret.id, { notes: $event || undefined })"
        @delete="store.removeSecret(secret.id)"
        @start-edit="store.state.editingEntryId = secret.id"
        @stop-edit="store.state.editingEntryId = null"
      />
    </div>
    <p v-else class="text-sm text-dim italic">
      No secrets yet. Add clues your players can discover in any order.
    </p>
  </section>
</template>
