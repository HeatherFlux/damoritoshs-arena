<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import { isSyncAvailable, getSyncServerUrl } from '../../utils/syncTransport'
import HackingCanvas from './HackingCanvas.vue'
import HackingEffectOverlay from './HackingEffectOverlay.vue'
import AccessPointList from './AccessPointList.vue'
import ComputerEditor from './ComputerEditor.vue'

const store = useHackingStore()

// UI State
const showEditor = ref(false)
const showSavedList = ref(false)
const copySuccess = ref(false)
const partyLevel = ref(5)

// Remote sync state
const syncLoading = ref(false)
const syncAvailable = computed(() => isSyncAvailable())
const syncEnabled = computed(() => store.state.isRemoteSyncEnabled)
const syncState = computed(() => store.state.wsConnectionState)

onMounted(() => {
  store.setGMView(true)
  console.log('[HackingPanel] Mounted. Sync available:', syncAvailable.value, 'Server:', getSyncServerUrl())
})

onUnmounted(() => {
  if (store.state.isRemoteSyncEnabled) {
    store.disableRemoteSync()
  }
})

function openPlayerView() {
  const url = store.generateShareUrl(false)
  console.log('[HackingPanel] Opening local player view:', url)
  window.open(url, '_blank', 'width=1920,height=1080')
}

async function startSessionLink() {
  if (!syncAvailable.value) {
    console.warn('[HackingPanel] Sync not available - no server configured')
    alert('Remote sync is not available. Make sure the sync server is running.')
    return
  }

  syncLoading.value = true
  try {
    if (!syncEnabled.value) {
      console.log('[HackingPanel] Enabling remote sync...')
      const success = await store.enableRemoteSync()
      if (!success) {
        console.error('[HackingPanel] Failed to enable remote sync')
        alert('Failed to connect to sync server. Is it running?')
        return
      }
    }

    const url = store.generateShareUrl(true)
    console.log('[HackingPanel] Session URL:', url)

    await navigator.clipboard.writeText(url)
    copySuccess.value = true
    setTimeout(() => copySuccess.value = false, 3000)
  } catch (e) {
    console.error('[HackingPanel] Failed to start session:', e)
    alert('Failed to create session link')
  } finally {
    syncLoading.value = false
  }
}

function stopSession() {
  console.log('[HackingPanel] Stopping remote session')
  store.disableRemoteSync()
}

function createNew() {
  store.createNewComputer('New Computer')
  showEditor.value = true
}

function generateRandom() {
  store.generateComputer({ partyLevel: partyLevel.value })
}

function saveCurrentEncounter() {
  const name = prompt('Enter a name for this encounter:', store.state.computer?.name || 'Encounter')
  if (name) {
    store.saveEncounter(name)
  }
}

function loadSelectedEncounter(id: string) {
  store.loadEncounter(id)
  showSavedList.value = false
}

function deleteSelectedEncounter(id: string) {
  if (confirm('Delete this saved encounter?')) {
    store.deleteEncounter(id)
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
    <!-- Minimal Header - just computer name -->
    <header class="hacking-header panel">
      <div class="header-content">
        <span v-if="store.state.computer" class="computer-info">
          <span class="computer-name">{{ store.state.computer.name }}</span>
          <span class="computer-meta">Level {{ store.state.computer.level }} {{ store.state.computer.type }}</span>
        </span>
        <span v-else class="computer-name text-muted">No Computer</span>
      </div>
    </header>

    <!-- Main content -->
    <div class="hacking-content">
      <!-- Left: Controls sidebar -->
      <aside class="hacking-sidebar">
        <!-- Controls Card -->
        <div class="controls-card panel">
          <h3 class="card-title">Controls</h3>

          <!-- Computer Actions -->
          <div class="control-section">
            <div class="control-row">
              <button class="btn btn-secondary flex-1" @click="createNew">New</button>
              <button class="btn btn-secondary flex-1" @click="showEditor = true">Edit</button>
            </div>

            <div class="control-row random-row">
              <label class="level-label">
                <span>Level</span>
                <input
                  type="number"
                  v-model.number="partyLevel"
                  min="1"
                  max="20"
                  class="level-input"
                />
              </label>
              <button class="btn btn-primary flex-1" @click="generateRandom">Random</button>
            </div>
          </div>

          <!-- Saved Encounters -->
          <div class="control-section">
            <div class="control-row">
              <button class="btn btn-secondary flex-1" @click="saveCurrentEncounter">Save</button>
              <button
                class="btn btn-secondary flex-1"
                @click="showSavedList = !showSavedList"
              >
                Load {{ store.state.savedEncounters.length > 0 ? `(${store.state.savedEncounters.length})` : '' }}
              </button>
            </div>

            <div v-if="showSavedList && store.state.savedEncounters.length > 0" class="saved-list">
              <div
                v-for="enc in store.state.savedEncounters"
                :key="enc.id"
                class="saved-item"
              >
                <div class="saved-info" @click="loadSelectedEncounter(enc.id)">
                  <span class="saved-name">{{ enc.name }}</span>
                  <span class="saved-date">{{ formatDate(enc.savedAt) }}</span>
                </div>
                <button class="saved-delete" @click="deleteSelectedEncounter(enc.id)">×</button>
              </div>
            </div>
          </div>

          <!-- Player Sharing -->
          <div class="control-section">
            <div class="section-label">Share</div>
            <div class="control-row">
              <button
                class="btn btn-accent flex-1"
                title="Open a player-facing view in a new window for displaying on a second monitor"
                @click="openPlayerView"
              >
                Player View
              </button>
            </div>
            <div class="control-row">
              <button
                v-if="!syncEnabled"
                class="btn btn-secondary flex-1"
                :class="{ loading: syncLoading }"
                :disabled="syncLoading"
                title="Copy a link to share with players so they can view the hacking encounter on their own device"
                @click="startSessionLink"
              >
                {{ copySuccess ? 'Copied!' : 'Session Link' }}
              </button>
              <div v-else class="session-status">
                <span class="sync-indicator" :class="'sync-' + syncState"></span>
                <span class="session-label">LIVE</span>
                <button class="btn btn-danger btn-sm" @click="stopSession">×</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Access Points Card -->
        <AccessPointList />
      </aside>

      <!-- Right: Canvas -->
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
  </div>
</template>

<style scoped>
.hacking-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  background: var(--color-bg);
}

.hacking-header {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  align-items: center;
}

.computer-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.computer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-accent);
}

.computer-meta {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hacking-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  width: 100%;
}

/* Right: Canvas display */
.hacking-main {
  flex: 1;
  min-width: 50%;
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

/* Left: Controls sidebar */
.hacking-sidebar {
  flex-shrink: 0;
  width: 380px;
  max-width: 40%;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Controls Card */
.controls-card {
  width: 100%;
  padding: 1.5rem;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.control-section {
  padding-top: 1.25rem;
  margin-top: 0.25rem;
  border-top: 1px solid var(--color-border);
}

.control-section:first-of-type {
  padding-top: 0;
  margin-top: 0;
  border-top: none;
}

.section-label {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.control-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.control-row:last-child {
  margin-bottom: 0;
}

.random-row {
  align-items: center;
}

.level-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.level-input {
  width: 3.5rem;
  padding: 0.5rem 0.5rem;
  font-size: var(--text-base);
  text-align: center;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}

.level-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.flex-1 {
  flex: 1;
}

/* Saved List */
.saved-list {
  margin-top: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.saved-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.saved-item:last-child {
  border-bottom: none;
}

.saved-info {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.saved-info:hover {
  color: var(--color-accent);
}

.saved-name {
  font-size: var(--text-base);
  font-weight: 500;
}

.saved-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.saved-delete {
  padding: 0.375rem 0.625rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.saved-delete:hover {
  color: var(--color-danger);
}

/* Buttons */
.btn-accent {
  background: var(--color-accent);
  color: var(--color-bg);
  border: 1px solid var(--color-accent);
}

.btn-accent:hover {
  background: color-mix(in srgb, var(--color-accent) 85%, white);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
  border: 1px solid var(--color-danger);
}

.btn-xs {
  padding: 0.125rem 0.375rem;
  font-size: 10px;
  min-width: auto;
}

.btn.loading {
  opacity: 0.7;
  cursor: wait;
}

/* Session Status */
.session-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-sm);
  flex: 1;
  justify-content: center;
}

.session-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-success);
  letter-spacing: 0.05em;
}

.sync-indicator {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
}

.sync-indicator.sync-connected {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.sync-indicator.sync-connecting {
  background: var(--color-warning);
}

.sync-indicator.sync-disconnected {
  background: var(--color-text-muted);
}

.sync-indicator.sync-error {
  background: var(--color-danger);
}

/* Modal */
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
</style>
