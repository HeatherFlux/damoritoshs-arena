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

// Mobile collapsible sections
const mobileControlsOpen = ref(false)
const mobileNodesOpen = ref(false)
const mobileCanvasOpen = ref(true)

// Get focused node with DC
const focusedNode = computed(() => {
  if (!store.state.focusedNodeId || !store.state.computer) return null
  return store.state.computer.accessPoints.find(ap => ap.id === store.state.focusedNodeId)
})

function getNodeDC(node: { dc?: number; hackSkills?: { dc: number }[] } | null): number | undefined {
  if (!node) return undefined
  return node.dc || node.hackSkills?.[0]?.dc
}

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
      <!-- Mobile: Collapsible Controls -->
      <div class="mobile-section">
        <button class="mobile-section-header" @click="mobileControlsOpen = !mobileControlsOpen">
          <span>Controls</span>
          <span class="mobile-chevron">{{ mobileControlsOpen ? '▼' : '▶' }}</span>
        </button>
        <div class="mobile-section-content" v-show="mobileControlsOpen">
          <!-- Controls Card (mobile) -->
          <div class="controls-card panel">
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
        </div>
      </div>

      <!-- Mobile: Collapsible Node Details -->
      <div class="mobile-section">
        <button class="mobile-section-header" @click="mobileNodesOpen = !mobileNodesOpen">
          <span>Node Details</span>
          <span class="mobile-chevron">{{ mobileNodesOpen ? '▼' : '▶' }}</span>
        </button>
        <div class="mobile-section-content" v-show="mobileNodesOpen">
          <AccessPointList />
        </div>
      </div>

      <!-- Mobile: Collapsible Nodes View -->
      <div class="mobile-section mobile-section-canvas">
        <button class="mobile-section-header" @click="mobileCanvasOpen = !mobileCanvasOpen">
          <span>Nodes View</span>
          <span class="mobile-chevron">{{ mobileCanvasOpen ? '▼' : '▶' }}</span>
        </button>
        <div class="mobile-section-content mobile-canvas-content" v-show="mobileCanvasOpen">
          <div class="canvas-container panel">
            <HackingCanvas />
          </div>
          <div class="focused-info" v-if="focusedNode">
            <div class="focused-content">
              <span class="focused-label">Selected:</span>
              <span class="focused-name">{{ focusedNode.name }}</span>
            </div>
            <div class="focused-dc" v-if="getNodeDC(focusedNode)">
              <span class="dc-label">DC</span>
              <span class="dc-value">{{ getNodeDC(focusedNode) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop: Controls sidebar -->
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

        <div class="focused-info" v-if="focusedNode">
          <div class="focused-content">
            <span class="focused-label">Selected:</span>
            <span class="focused-name">{{ focusedNode.name }}</span>
          </div>
          <div class="focused-dc" v-if="getNodeDC(focusedNode)">
            <span class="dc-label">DC</span>
            <span class="dc-value">{{ getNodeDC(focusedNode) }}</span>
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
  padding: 0.375rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .hacking-header {
    padding: 0.5rem 1rem;
  }
}

.header-content {
  display: flex;
  align-items: center;
}

.computer-info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .computer-info {
    gap: 0.75rem;
  }
}

.computer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-accent);
}

@media (min-width: 1024px) {
  .computer-name {
    font-size: var(--text-lg);
  }
}

.computer-meta {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (min-width: 1024px) {
  .computer-meta {
    font-size: var(--text-xs);
  }
}

.hacking-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  overflow-y: auto;
  width: 100%;
  position: relative;
}

@media (min-width: 1024px) {
  .hacking-content {
    flex-direction: row;
    overflow-y: hidden;
  }
}

/* Canvas display - desktop only */
.hacking-main {
  display: none;
}

@media (min-width: 1024px) {
  .hacking-main {
    display: flex;
    flex: 1;
    min-width: 50%;
    min-height: 0;
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }
}

.canvas-container {
  flex: 1;
  min-height: 150px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

@media (min-width: 1024px) {
  .canvas-container {
    min-height: 0;
  }
}

.focused-info {
  flex-shrink: 0;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .focused-info {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
}

.focused-content {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

@media (min-width: 1024px) {
  .focused-content {
    gap: 0.5rem;
  }
}

.focused-label {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (min-width: 1024px) {
  .focused-label {
    font-size: var(--text-sm);
  }
}

.focused-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 1024px) {
  .focused-name {
    font-size: var(--text-base);
  }
}

.focused-dc {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .focused-dc {
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
  }
}

.focused-dc .dc-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-bg);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (min-width: 1024px) {
  .focused-dc .dc-label {
    font-size: var(--text-xs);
  }
}

.focused-dc .dc-value {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-bg);
  font-family: 'JetBrains Mono', monospace;
}

@media (min-width: 1024px) {
  .focused-dc .dc-value {
    font-size: var(--text-base);
  }
}

/* Mobile collapsible sections */
.mobile-section {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .mobile-section {
    display: none;
  }
}

.mobile-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--color-bg-elevated);
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mobile-section-header:hover {
  background: var(--color-bg-hover);
}

.mobile-chevron {
  font-size: 10px;
  color: var(--color-text-dim);
}

.mobile-section-content {
  padding: 0.5rem;
  background: var(--color-bg);
}

.mobile-section-canvas {
  flex: 1;
  min-height: 0;
}

@media (min-width: 1024px) {
  .mobile-section-canvas {
    display: none;
  }
}

.mobile-canvas-content {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Controls sidebar - desktop only */
.hacking-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .hacking-sidebar {
    display: flex;
    flex-shrink: 0;
    width: 380px;
    max-width: 40%;
    padding: 1rem;
    overflow-y: auto;
    flex-direction: column;
    gap: 1rem;
  }
}

/* Controls Card */
.controls-card {
  width: 100%;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .controls-card {
    padding: 1.5rem;
  }
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .card-title {
    font-size: var(--text-base);
    margin-bottom: 1rem;
  }
}

.control-section {
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .control-section {
    padding-top: 1.25rem;
  }
}

.control-section:first-of-type {
  padding-top: 0;
  margin-top: 0;
  border-top: none;
}

.section-label {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .section-label {
    font-size: var(--text-sm);
    margin-bottom: 0.75rem;
  }
}

.control-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .control-row {
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
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
  gap: 0.375rem;
  font-size: var(--text-xs);
  color: var(--color-text-dim);
}

@media (min-width: 1024px) {
  .level-label {
    gap: 0.5rem;
    font-size: var(--text-sm);
  }
}

.level-input {
  width: 2.5rem;
  padding: 0.375rem;
  font-size: var(--text-sm);
  text-align: center;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}

@media (min-width: 1024px) {
  .level-input {
    width: 3.5rem;
    padding: 0.5rem;
    font-size: var(--text-base);
  }
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
  margin-top: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 150px;
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .saved-list {
    margin-top: 0.75rem;
    max-height: none;
  }
}

.saved-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .saved-item {
    padding: 0.75rem;
  }
}

.saved-item:last-child {
  border-bottom: none;
}

.saved-info {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

@media (min-width: 1024px) {
  .saved-info {
    gap: 0.25rem;
  }
}

.saved-info:hover {
  color: var(--color-accent);
}

.saved-name {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 1024px) {
  .saved-name {
    font-size: var(--text-base);
  }
}

.saved-date {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}

@media (min-width: 1024px) {
  .saved-date {
    font-size: var(--text-xs);
  }
}

.saved-delete {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .saved-delete {
    padding: 0.375rem 0.625rem;
    font-size: 1.25rem;
  }
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
  padding: 0.5rem;
}

@media (min-width: 1024px) {
  .modal-overlay {
    padding: 2rem;
  }
}

.modal-content {
  max-height: 95vh;
  overflow: auto;
}

@media (min-width: 1024px) {
  .modal-content {
    max-height: 90vh;
  }
}

.editor-modal {
  width: 98vw;
  height: 95vh;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

@media (min-width: 1024px) {
  .editor-modal {
    width: 90vw;
    height: 80vh;
  }
}

/* Hide number input spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
