<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import { isSyncAvailable } from '../../utils/syncTransport'
import HackingCanvas from './HackingCanvas.vue'
import HackingEffectOverlay from './HackingEffectOverlay.vue'
import type { AccessPoint, SkillCheck } from '../../types/hacking'

const store = useHackingStore()

// UI state
const showStatBlock = ref(true)
const expandedAccessPoint = ref<string | null>(null)

// Connection status for display
type SyncStatus = 'connecting' | 'connected' | 'local-only' | 'error'
const syncStatus = ref<SyncStatus>('connecting')

// Computed display values
const statusLabel = computed(() => {
  switch (syncStatus.value) {
    case 'connected': return 'LIVE'
    case 'connecting': return 'SYNC...'
    case 'error': return 'OFFLINE'
    default: return 'SNAPSHOT'
  }
})

// Format skill checks for display
function formatSkillCheck(check: SkillCheck): string {
  let text = `${check.skill} DC ${check.dc}`
  if (check.proficiency && check.proficiency !== 'untrained') {
    text += ` (${check.proficiency})`
  }
  return text
}

function formatSkillChecks(checks: SkillCheck[]): string {
  return checks.map(formatSkillCheck).join(' or ')
}

function toggleAccessPoint(id: string) {
  expandedAccessPoint.value = expandedAccessPoint.value === id ? null : id
}

function getAccessPointState(ap: AccessPoint): string {
  if (ap.state === 'breached') return 'BREACHED'
  if (ap.state === 'alarmed') return 'ALARMED'
  return `${ap.successesRequired || 1} Success${(ap.successesRequired || 1) > 1 ? 'es' : ''}`
}

onMounted(async () => {
  store.setGMView(false)

  // Try to load state from URL first
  store.loadFromUrl()

  // Ensure we're on the right BroadcastChannel (for same-browser tabs)
  store.ensureChannel()

  // Check if URL indicates WebSocket sync is available
  if (store.hasRemoteSyncInUrl() && isSyncAvailable()) {
    syncStatus.value = 'connecting'

    // Get session ID from URL
    const hash = window.location.hash
    const sessionMatch = hash.match(/[?&]session=([^&]+)/)
    const sessionId = sessionMatch ? sessionMatch[1] : store.state.sessionId

    // Try to join remote session
    const success = await store.joinRemoteSession(sessionId)
    syncStatus.value = success ? 'connected' : 'error'
  } else {
    // No sync available or not configured
    syncStatus.value = 'local-only'
  }
})

onUnmounted(() => {
  // Cleanup sync on unmount
  if (store.state.isRemoteSyncEnabled) {
    store.disableRemoteSync()
  }
})
</script>

<template>
  <div class="player-layout">
    <!-- Fullscreen canvas -->
    <HackingCanvas :fullscreen="true" />

    <!-- Stat block panel (right side) -->
    <div v-if="store.state.computer" class="stat-block-panel" :class="{ collapsed: !showStatBlock }">
      <button class="stat-block-toggle" @click="showStatBlock = !showStatBlock">
        {{ showStatBlock ? '▶' : '◀' }}
      </button>

      <div v-if="showStatBlock" class="stat-block-content">
        <!-- Computer Header -->
        <div class="computer-header">
          <div class="computer-title">
            <span class="computer-name">{{ store.state.computer.name }}</span>
            <span class="computer-level-badge">{{ store.state.computer.level }}</span>
          </div>
          <div class="computer-type">{{ store.state.computer.type }} computer</div>
          <p v-if="store.state.computer.description" class="computer-desc">
            {{ store.state.computer.description }}
          </p>
        </div>

        <!-- Access Points -->
        <div class="access-points">
          <div
            v-for="ap in store.state.computer.accessPoints"
            :key="ap.id"
            class="access-point"
            :class="{ expanded: expandedAccessPoint === ap.id, [`state-${ap.state}`]: true }"
          >
            <button class="ap-header" @click="toggleAccessPoint(ap.id)">
              <span class="ap-type-badge" :class="ap.type">{{ ap.type.charAt(0).toUpperCase() }}</span>
              <span class="ap-name">{{ ap.name }}</span>
              <span class="ap-state" :class="ap.state">{{ getAccessPointState(ap) }}</span>
            </button>

            <div v-if="expandedAccessPoint === ap.id" class="ap-details">
              <!-- Hack Skills -->
              <div v-if="ap.hackSkills?.length" class="detail-section">
                <div class="detail-label">Hack</div>
                <div class="detail-value">{{ formatSkillChecks(ap.hackSkills) }}</div>
              </div>

              <!-- Vulnerabilities -->
              <div v-if="ap.vulnerabilities?.length" class="detail-section vulnerabilities">
                <div class="detail-label">Vulnerabilities</div>
                <div v-for="vuln in ap.vulnerabilities" :key="vuln.id" class="vuln-item">
                  <span class="vuln-name">{{ vuln.name }}</span>
                  <span class="vuln-skills">({{ formatSkillChecks(vuln.skills) }}; −{{ vuln.dcReduction }})</span>
                </div>
              </div>

              <!-- Countermeasures -->
              <div v-if="ap.countermeasures?.length" class="detail-section countermeasures">
                <div class="detail-label">Countermeasures</div>
                <div v-for="cm in ap.countermeasures" :key="cm.id" class="cm-item">
                  <div class="cm-header">
                    <span class="cm-name">{{ cm.name }}</span>
                    <span class="cm-threshold">({{ cm.failureThreshold }} Failures{{ cm.isPersistent ? '; persistent' : '' }})</span>
                  </div>
                  <div class="cm-details">
                    <span v-if="cm.noticeDC">Notice DC {{ cm.noticeDC }} {{ cm.noticeSkills?.join('/') }}; </span>
                    <span>Disable {{ formatSkillChecks(cm.disableSkills) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success Descriptions -->
        <div v-if="store.state.computer.successDescription" class="outcome-section">
          <div class="outcome-label success">Success</div>
          <p class="outcome-text">{{ store.state.computer.successDescription }}</p>
        </div>
        <div v-if="store.state.computer.criticalSuccessDescription" class="outcome-section">
          <div class="outcome-label crit">Critical Success</div>
          <p class="outcome-text">{{ store.state.computer.criticalSuccessDescription }}</p>
        </div>
      </div>
    </div>

    <!-- Sync status indicator (bottom left) -->
    <div v-if="store.state.computer" class="sync-badge" :class="'sync-' + syncStatus">
      <span class="sync-indicator"></span>
      <span class="sync-label">{{ statusLabel }}</span>
    </div>

    <!-- Effect overlay -->
    <HackingEffectOverlay />
  </div>
</template>

<style scoped>
.player-layout {
  position: fixed;
  inset: 0;
  background: var(--color-bg);
  overflow: hidden;
}

/* Stat Block Panel */
.stat-block-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  bottom: 1rem;
  width: 360px;
  display: flex;
  z-index: 10;
  transition: width 0.2s ease;
}

.stat-block-panel.collapsed {
  width: auto;
}

.stat-block-toggle {
  flex-shrink: 0;
  width: 24px;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-border);
  border-right: none;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 10px;
  transition: all 0.15s;
}

.stat-block-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-accent);
}

.stat-block-content {
  flex: 1;
  background: rgba(5, 6, 8, 0.95);
  border: 1px solid var(--color-border);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  backdrop-filter: blur(12px);
  overflow-y: auto;
  padding: 1rem;
}

/* Computer Header */
.computer-header {
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-accent);
  margin-bottom: 0.75rem;
}

.computer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.computer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-accent);
  text-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.4));
}

.computer-level-badge {
  padding: 0.125rem 0.5rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 11px;
  font-weight: 700;
  border-radius: var(--radius-sm);
}

.computer-type {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
}

.computer-desc {
  font-size: var(--text-sm);
  color: var(--color-text);
  margin-top: 0.5rem;
  line-height: 1.4;
}

/* Access Points */
.access-points {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.access-point {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.access-point.state-breached {
  border-color: var(--color-success);
}

.access-point.state-alarmed {
  border-color: var(--color-danger);
}

.ap-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.ap-header:hover {
  background: var(--color-bg-hover);
}

.ap-type-badge {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.ap-type-badge.physical {
  background: var(--color-warning);
  color: var(--color-bg);
}

.ap-type-badge.remote {
  background: var(--color-accent);
  color: var(--color-bg);
}

.ap-type-badge.magical {
  background: #9b59b6;
  color: white;
}

.ap-name {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 500;
}

.ap-state {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}

.ap-state.breached {
  background: var(--color-success);
  color: var(--color-bg);
}

.ap-state.alarmed {
  background: var(--color-danger);
  color: white;
}

/* Access Point Details */
.ap-details {
  padding: 0.75rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.detail-section {
  margin-bottom: 0.75rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  margin-bottom: 0.25rem;
}

.detail-value {
  font-size: var(--text-sm);
  color: var(--color-text);
}

/* Vulnerabilities */
.vuln-item {
  font-size: var(--text-sm);
  margin-bottom: 0.25rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-success);
}

.vuln-name {
  color: var(--color-text);
}

.vuln-skills {
  color: var(--color-text-dim);
  font-size: var(--text-xs);
}

/* Countermeasures */
.cm-item {
  font-size: var(--text-sm);
  margin-bottom: 0.375rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-danger);
}

.cm-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.cm-name {
  color: var(--color-text);
  font-weight: 500;
}

.cm-threshold {
  color: var(--color-danger);
  font-size: var(--text-xs);
}

.cm-details {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  margin-top: 0.125rem;
}

/* Outcome Sections */
.outcome-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.outcome-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.outcome-label.success {
  color: var(--color-success);
}

.outcome-label.crit {
  color: var(--color-warning);
}

.outcome-text {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.4;
}

/* Sync Badge (bottom left) */
.sync-badge {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  z-index: 10;
}

.sync-indicator {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
}

.sync-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Sync states */
.sync-connected .sync-indicator {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
  animation: sync-pulse 2s ease-in-out infinite;
}
.sync-connected .sync-label {
  color: var(--color-success);
}

.sync-connecting .sync-indicator {
  background: var(--color-warning);
  animation: sync-pulse-fast 1s ease-in-out infinite;
}
.sync-connecting .sync-label {
  color: var(--color-warning);
}

.sync-local-only .sync-indicator {
  background: var(--color-text-muted);
}
.sync-local-only .sync-label {
  color: var(--color-text-muted);
}

.sync-error .sync-indicator {
  background: var(--color-danger);
  box-shadow: 0 0 6px var(--color-danger);
}
.sync-error .sync-label {
  color: var(--color-danger);
}

@keyframes sync-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--color-success); }
  50% { box-shadow: 0 0 10px var(--color-success); }
}

@keyframes sync-pulse-fast {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
