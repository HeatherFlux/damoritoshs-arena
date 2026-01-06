<script setup lang="ts">
import { onMounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import HackingCanvas from './HackingCanvas.vue'
import HackingEffectOverlay from './HackingEffectOverlay.vue'

const store = useHackingStore()

onMounted(() => {
  store.setGMView(false)
  // Try to load state from URL
  store.loadFromUrl()
  // Ensure we're on the right channel (session ID from URL)
  store.ensureChannel()
})
</script>

<template>
  <div class="player-layout">
    <!-- Fullscreen canvas -->
    <HackingCanvas :fullscreen="true" />

    <!-- Computer info overlay (subtle, bottom corner) -->
    <div v-if="store.state.computer" class="computer-info glass">
      <div class="computer-name">{{ store.state.computer.name }}</div>
      <div class="computer-level">Level {{ store.state.computer.level }} {{ store.state.computer.type }}</div>
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

.computer-info {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: rgba(5, 6, 8, 0.8);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.computer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-accent);
  text-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
}

.computer-level {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
