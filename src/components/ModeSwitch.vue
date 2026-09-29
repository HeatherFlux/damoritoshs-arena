<script setup lang="ts">
/** The Set up / Run switch at the top of a setup side panel. */
defineProps<{
  /** True while something is running, which is what makes Run available. */
  running: boolean
  /** Shown when Run is not available yet. */
  idleHint?: string
}>()

const mode = defineModel<'setup' | 'run'>({ required: true })
</script>

<template>
  <div class="mode-switch">
    <button class="mode-switch-btn" :class="{ 'mode-switch-active': mode === 'setup' }" @click="mode = 'setup'">Set up</button>
    <button
      class="mode-switch-btn"
      :class="{ 'mode-switch-active': mode === 'run' }"
      :disabled="!running"
      :title="running ? 'Go to what is running' : (idleHint ?? 'Start first')"
      @click="mode = 'run'"
    >
      Run <span v-if="running" class="inline-block w-2 h-2 bg-success animate-pulse"></span>
    </button>
  </div>
</template>

<style scoped>
.mode-switch {
  display: flex;
  gap: 0.25rem;
  background: var(--color-bg);
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
}

.mode-switch-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}

.mode-switch-btn:hover:not(:disabled):not(.mode-switch-active) {
  color: var(--color-text);
  background: var(--color-bg-elevated);
}

.mode-switch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-switch-active {
  color: var(--color-on-accent);
  background: var(--color-accent);
}
</style>
