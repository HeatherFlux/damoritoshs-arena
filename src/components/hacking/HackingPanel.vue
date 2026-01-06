<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import HackingCanvas from './HackingCanvas.vue'
import HackingEffectOverlay from './HackingEffectOverlay.vue'
import HackingControls from './HackingControls.vue'
import AccessPointList from './AccessPointList.vue'
import ComputerEditor from './ComputerEditor.vue'

const store = useHackingStore()

// UI State
const showEditor = ref(false)
const showEncounterMenu = ref(false)
const showShareModal = ref(false)
const shareUrl = ref('')
const copySuccess = ref(false)

onMounted(() => {
  store.setGMView(true)
})

function openPlayerView() {
  const url = store.generateShareUrl()
  window.open(url, '_blank', 'width=1920,height=1080')
}

function createNew() {
  store.createNewComputer('New Computer')
  showEditor.value = true
}

function generateRandom() {
  store.generateComputer()
}

function saveCurrentEncounter() {
  const name = prompt('Enter a name for this encounter:', store.state.computer?.name || 'Encounter')
  if (name) {
    store.saveEncounter(name)
    showEncounterMenu.value = false
  }
}

function loadSelectedEncounter(id: string) {
  store.loadEncounter(id)
  showEncounterMenu.value = false
}

function deleteSelectedEncounter(id: string) {
  if (confirm('Delete this saved encounter?')) {
    store.deleteEncounter(id)
  }
}

function openShareModal() {
  shareUrl.value = store.generateShareUrl()
  showShareModal.value = true
  copySuccess.value = false
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copySuccess.value = true
    setTimeout(() => copySuccess.value = false, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="hacking-layout">
    <!-- Header -->
    <header class="hacking-header panel">
      <div class="header-content">
        <div class="header-left">
          <span v-if="store.state.computer" class="computer-info">
            <span class="computer-name text-accent font-semibold">{{ store.state.computer.name }}</span>
            <span class="text-dim ml-2">(Level {{ store.state.computer.level }} {{ store.state.computer.type }})</span>
          </span>
        </div>
        <div class="header-center">
          <button class="btn btn-secondary btn-sm" @click="createNew">
            + New
          </button>
          <button class="btn btn-primary btn-sm" @click="generateRandom">
            🎲 Random
          </button>
          <button class="btn btn-secondary btn-sm" @click="showEditor = true">
            ✏️ Edit
          </button>
          <div class="dropdown-container">
            <button class="btn btn-secondary btn-sm" @click="showEncounterMenu = !showEncounterMenu">
              📁 Encounters
            </button>
            <div v-if="showEncounterMenu" class="dropdown-menu">
              <button class="dropdown-item" @click="saveCurrentEncounter">
                💾 Save Current
              </button>
              <hr class="dropdown-divider" />
              <div v-if="store.state.savedEncounters.length === 0" class="dropdown-empty">
                No saved encounters
              </div>
              <div
                v-for="enc in store.state.savedEncounters"
                :key="enc.id"
                class="dropdown-item encounter-item"
              >
                <div class="encounter-info" @click="loadSelectedEncounter(enc.id)">
                  <span class="encounter-name">{{ enc.name }}</span>
                  <span class="encounter-date">{{ formatDate(enc.savedAt) }}</span>
                </div>
                <button class="encounter-delete" @click.stop="deleteSelectedEncounter(enc.id)">✕</button>
              </div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="openShareModal">
            🔗 Share
          </button>
        </div>
        <div class="header-right">
          <button class="btn btn-primary btn-sm" @click="openPlayerView">
            Open Player View
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <div class="hacking-content">
      <!-- Left sidebar: Controls -->
      <aside class="hacking-sidebar-left">
        <HackingControls />
      </aside>

      <!-- Center: Canvas preview -->
      <main class="hacking-main">
        <div class="canvas-container panel">
          <HackingCanvas />
        </div>

        <div class="focused-info" v-if="store.state.focusedNodeId && store.state.computer">
          <div class="focused-label text-accent text-sm">Selected:</div>
          <div class="focused-name text-lg font-semibold">
            {{ store.state.computer.accessPoints.find(ap => ap.id === store.state.focusedNodeId)?.name }}
          </div>
        </div>
      </main>

      <!-- Right sidebar: Node list -->
      <aside class="hacking-sidebar-right">
        <AccessPointList />
      </aside>
    </div>

    <!-- Effect overlay -->
    <HackingEffectOverlay />

    <!-- Computer Editor Modal -->
    <Teleport to="body">
      <div v-if="showEditor" class="modal-overlay" @click.self="showEditor = false">
        <div class="modal-content editor-modal">
          <ComputerEditor @close="showEditor = false" />
        </div>
      </div>
    </Teleport>

    <!-- Share Modal -->
    <Teleport to="body">
      <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
        <div class="modal-content share-modal panel">
          <h3 class="text-lg font-semibold text-accent mb-4">Share with Players</h3>
          <p class="text-sm text-dim mb-3">
            Send this link to players - they'll see the current encounter state:
          </p>
          <div class="share-url-container">
            <input
              type="text"
              :value="shareUrl"
              readonly
              class="input share-url-input"
              @click="($event.target as HTMLInputElement).select()"
            />
            <button class="btn btn-primary" @click="copyShareUrl">
              {{ copySuccess ? '✓ Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="text-xs text-muted mt-3">
            Note: The URL contains the full encounter state. Changes you make after sharing won't sync automatically - share a new link for updates.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showShareModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Click outside to close dropdown -->
    <div v-if="showEncounterMenu" class="dropdown-backdrop" @click="showEncounterMenu = false"></div>
  </div>
</template>

<style scoped>
.hacking-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

.hacking-header {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.computer-info {
  font-size: var(--text-sm);
}

.hacking-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.hacking-sidebar-left,
.hacking-sidebar-right {
  flex-shrink: 0;
  padding: 1rem;
  overflow-y: auto;
}

.hacking-main {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  min-height: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.focused-info {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Header center buttons */
.header-center {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Dropdown */
.dropdown-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  min-width: 220px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--color-bg-hover);
}

.dropdown-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.25rem 0;
}

.dropdown-empty {
  padding: 0.75rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-align: center;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* Encounter items */
.encounter-item {
  padding: 0.5rem 0.75rem;
}

.encounter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  cursor: pointer;
}

.encounter-name {
  font-weight: 500;
}

.encounter-date {
  font-size: 10px;
  color: var(--color-text-muted);
}

.encounter-delete {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.encounter-delete:hover {
  background: var(--color-danger);
  color: white;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  max-height: 90vh;
  overflow: auto;
}

.editor-modal {
  width: 90vw;
  height: 80vh;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.share-modal {
  width: 100%;
  max-width: 500px;
  padding: 1.5rem;
}

.share-url-container {
  display: flex;
  gap: 0.5rem;
}

.share-url-input {
  flex: 1;
  font-size: var(--text-xs);
  font-family: 'JetBrains Mono', monospace;
}

.modal-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}
</style>
