<script setup lang="ts">
import { useChaseStore } from '../../stores/chaseStore'
import type { SavedChase } from '../../types/chase'
import { CHASE_TYPE_LABELS } from '../../utils/chaseRules'

const store = useChaseStore()

const emit = defineEmits<{
  (e: 'edit-chase', chase: SavedChase): void
  (e: 'start-chase', chase: SavedChase): void
  (e: 'new-chase'): void
  (e: 'import'): void
  (e: 'export'): void
}>()

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

function duplicate(chase: SavedChase) {
  store.saveChase({ ...JSON.parse(JSON.stringify(chase)), id: crypto.randomUUID(), name: chase.name + ' (Copy)' })
}

function exportSingle(chase: SavedChase) {
  const safeName = chase.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([JSON.stringify({ version: 1, chases: [chase] }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName || 'chase'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function remove(chase: SavedChase) {
  if (confirm(`Delete "${chase.name}"?`)) store.deleteChase(chase.id)
}
</script>

<template>
  <div class="chase-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Chases</h2>
      <div class="sidebar-actions">
        <button class="btn-secondary btn-xs" @click="emit('import')">Import</button>
        <button class="btn-secondary btn-xs" @click="emit('export')">Export</button>
        <button class="btn-primary btn-xs" @click="emit('new-chase')">New</button>
      </div>
    </div>

    <div class="chase-list">
      <div
        v-for="chase in store.state.savedChases"
        :key="chase.id"
        class="chase-item group"
        :class="{ active: store.state.activeScene?.templateId === chase.id }"
        @click="emit('edit-chase', chase)"
      >
        <div class="chase-info">
          <span class="chase-name">{{ chase.name }}</span>
          <span class="chase-meta">{{ CHASE_TYPE_LABELS[chase.type] }} · {{ chase.obstacles.length }} obstacles · {{ formatDate(chase.savedAt) }}</span>
        </div>
        <div class="chase-actions">
          <button class="btn-icon-tiny" title="Start this chase" @click.stop="emit('start-chase', chase)">▶</button>
          <button class="btn-icon-tiny" title="Duplicate" @click.stop="duplicate(chase)">⧉</button>
          <button class="btn-icon-tiny" title="Export" @click.stop="exportSingle(chase)">⤓</button>
          <button class="btn-icon-tiny text-danger" title="Delete" @click.stop="remove(chase)">×</button>
        </div>
      </div>
      <div v-if="store.state.savedChases.length === 0" class="text-dim text-xs px-2 py-3">No saved chases yet. Build one and save it.</div>
    </div>
  </div>
</template>

<style scoped>
.chase-sidebar { display: flex; flex-direction: column; height: 100%; padding: 0.75rem; gap: 0.5rem; overflow-y: auto; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; }
.sidebar-title { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-dim); }
.sidebar-actions { display: flex; gap: 0.25rem; }
.chase-list { display: flex; flex-direction: column; gap: 0.25rem; }
.chase-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid var(--color-border); background: var(--color-bg-surface); cursor: pointer; gap: 0.5rem; }
.chase-item:hover, .chase-item.active { border-color: var(--color-accent); }
.chase-info { display: flex; flex-direction: column; min-width: 0; }
.chase-name { font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chase-meta { font-size: 0.625rem; color: var(--color-text-dim); }
.chase-actions { display: flex; gap: 0.125rem; opacity: 0; }
.chase-item:hover .chase-actions, .chase-item:focus-within .chase-actions { opacity: 1; }
</style>
