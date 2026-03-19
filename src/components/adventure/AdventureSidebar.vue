<script setup lang="ts">
import { ref } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'

const store = useAdventureStore()

const showImportModal = ref(false)
const importText = ref('')
const importError = ref('')

function handleNew() {
  store.createAdventure()
}

function handleSave() {
  store.saveAdventure()
}

function handleLoad(id: string) {
  store.loadAdventure(id)
}

function handleDelete(id: string) {
  if (confirm('Delete this saved adventure?')) {
    store.deleteAdventure(id)
  }
}

function handleExport() {
  const json = store.exportAdventures()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'adventure-preps.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  try {
    store.importAdventures(importText.value)
    showImportModal.value = false
    importText.value = ''
    importError.value = ''
  } catch {
    importError.value = 'Invalid JSON data'
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="adventure-sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold mb-2">
        <span class="text-accent/60">//</span> SAVED ADVENTURES
      </h3>
      <div class="flex gap-1.5 mb-3">
        <button
          class="btn btn-secondary btn-xs flex-1"
          @click="showImportModal = true"
          title="Import adventures"
        >
          Import
        </button>
        <button
          class="btn btn-secondary btn-xs flex-1"
          @click="handleExport"
          title="Export all adventures"
        >
          Export
        </button>
      </div>
    </div>

    <!-- New + Save -->
    <button class="btn btn-primary btn-sm w-full mb-2" @click="handleNew">
      + New Adventure
    </button>
    <button
      v-if="store.state.currentAdventure"
      class="btn btn-secondary btn-sm w-full mb-3"
      @click="handleSave"
    >
      Save Current
    </button>

    <!-- Saved list -->
    <div class="adventure-list">
      <div
        v-for="saved in store.state.savedAdventures"
        :key="saved.id"
        class="adventure-item group"
        :class="{ active: store.state.currentAdventure?.id === saved.id }"
        @click="handleLoad(saved.id)"
      >
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text truncate">{{ saved.name }}</div>
          <div class="text-[0.625rem] text-dim">{{ formatDate(saved.savedAt) }}</div>
        </div>
        <button
          class="btn-icon-tiny opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-danger"
          @click.stop="handleDelete(saved.id)"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
          </svg>
        </button>
      </div>

      <div v-if="!store.state.savedAdventures.length" class="text-xs text-dim italic p-3 text-center">
        No saved adventures yet
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <h3 class="mb-2">Import Adventures</h3>
        <p class="text-dim text-sm mb-4">Paste exported adventure JSON below:</p>
        <textarea
          v-model="importText"
          class="input w-full font-mono text-xs p-3 resize-y"
          placeholder="[{...}]"
          rows="8"
        ></textarea>
        <p v-if="importError" class="text-danger mt-2 text-sm">{{ importError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn btn-secondary" @click="showImportModal = false">Cancel</button>
          <button class="btn btn-primary" @click="handleImport">Import</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.adventure-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
}

.adventure-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.adventure-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.adventure-item:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-hover);
}

.adventure-item.active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-elevated));
}

.btn-icon-tiny {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-icon-tiny:hover {
  background: var(--color-bg-hover);
}
</style>
