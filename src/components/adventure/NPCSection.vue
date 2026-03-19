<script setup lang="ts">
import { computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import { generateNPCEntry, generateNPCEntries } from '../../utils/adventureGenerator'
import EntryCard from './EntryCard.vue'
import InspireButton from './InspireButton.vue'

const store = useAdventureStore()

const npcs = computed(() => store.state.currentAdventure?.npcs || [])

function handleAdd() {
  store.addNPC('New NPC...')
  const npcs = store.state.currentAdventure?.npcs
  const newNpc = npcs?.[npcs.length - 1]
  if (newNpc) store.state.editingEntryId = newNpc.id
}

function handleInspire(count: number) {
  const generated = count === 1 ? [generateNPCEntry()] : generateNPCEntries(count)
  for (const npc of generated) {
    store.addNPC(npc.text, npc.role, npc.ancestry, true)
  }
}

const roleColors: Record<string, string> = {
  ally: 'bg-success/15 text-success',
  questgiver: 'bg-accent/15 text-accent',
  rival: 'bg-danger/15 text-danger',
  wildcard: 'bg-warning/15 text-warning',
  innocent: 'bg-secondary/15 text-secondary',
}

function npcBadges(npc: { role?: string; ancestry?: string }) {
  const badges = []
  if (npc.role) badges.push({ label: npc.role, color: roleColors[npc.role] || '' })
  if (npc.ancestry) badges.push({ label: npc.ancestry, color: 'bg-dim/15 text-dim' })
  return badges
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-2">
        <span class="text-accent/60">&gt;&gt;</span> IMPORTANT NPCs
        <span v-if="npcs.length" class="text-dim font-normal">({{ npcs.length }})</span>
      </h3>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-xs" @click="handleAdd">+ Add</button>
        <InspireButton label="NPCs" @inspire="handleInspire" />
      </div>
    </div>
    <div v-if="npcs.length" class="flex flex-col gap-2">
      <EntryCard
        v-for="npc in npcs"
        :key="npc.id"
        :id="npc.id"
        :text="npc.text"
        :notes="npc.notes"
        :generated="npc.generated"
        :badges="npcBadges(npc)"
        :is-editing="store.state.editingEntryId === npc.id"
        @update:text="store.updateNPC(npc.id, { text: $event })"
        @update:notes="store.updateNPC(npc.id, { notes: $event || undefined })"
        @delete="store.removeNPC(npc.id)"
        @start-edit="store.state.editingEntryId = npc.id"
        @stop-edit="store.state.editingEntryId = null"
      />
    </div>
    <p v-else class="text-sm text-dim italic">
      No NPCs yet. Note key characters the party might interact with.
    </p>
  </section>
</template>
