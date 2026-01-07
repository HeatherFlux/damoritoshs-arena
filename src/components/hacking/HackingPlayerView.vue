<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import { isSyncAvailable } from '../../utils/syncTransport'
import HackingCanvas from './HackingCanvas.vue'
import HackingEffectOverlay from './HackingEffectOverlay.vue'
import PlayerDiceRoller from './PlayerDiceRoller.vue'

const store = useHackingStore()

// UI state - simplified (no sidebar)

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

    <!-- Floating Computer Name Header -->
    <header v-if="store.state.computer" class="computer-name-header">
      <span class="header-name">{{ store.state.computer.name }}</span>
    </header>

    <!-- Dice Roller (floating, bottom-left) -->
    <div v-if="store.state.computer" class="dice-roller-container">
      <PlayerDiceRoller />
    </div>

    <!-- Sync status indicator -->
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


/* ========================================
   FLOATING COMPUTER NAME HEADER
   ======================================== */
.computer-name-header {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow: 0 0 20px var(--color-accent-glow, rgba(30, 203, 225, 0.3));
  backdrop-filter: blur(12px);
  z-index: 110;
}

.header-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow:
    0 0 10px var(--color-accent),
    0 0 30px var(--color-accent-glow, rgba(30, 203, 225, 0.4));
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.header-level {
  padding: 0.25rem 0.625rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
}

/* ========================================
   DICE ROLLER CONTAINER (Desktop floating)
   ======================================== */
.dice-roller-container {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 105;
  width: 200px;
}

/* Sync Badge (bottom-right) */
.sync-badge {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  z-index: 101;
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
