<script setup lang="ts">
import { computed } from 'vue'
import type { StarshipScene, InitiativeEntry } from '../../types/starship'
import { useStarshipStore } from '../../stores/starshipStore'

const props = defineProps<{
  scene: StarshipScene
}>()

const store = useStarshipStore()

const initiativeOrder = computed(() => props.scene.initiativeOrder || [])
const currentTurnIndex = computed(() => props.scene.currentTurnIndex || 0)
const currentRound = computed(() => props.scene.currentRound || 1)

const currentTurn = computed(() => {
  return initiativeOrder.value[currentTurnIndex.value] || null
})

const canDelay = computed(() => {
  if (!currentTurn.value) return false
  // Can delay if there are more entries after current who haven't acted
  const remainingEntries = initiativeOrder.value
    .filter((e, i) => i > currentTurnIndex.value && !e.hasActedThisRound)
  return remainingEntries.length > 0
})

const sceneEnded = computed(() => {
  // Scene ends when victory condition is met
  // This is handled by the parent, but we can disable controls
  return false
})

function nextTurn() {
  store.nextTurn()
}

function delayTurn() {
  store.delayTurn()
}

function endRound() {
  store.endRound()
}

function getEntryIcon(entry: InitiativeEntry): string {
  if (entry.type === 'pc') {
    return '👤'
  }
  return '⚔️'
}

function getEntryColor(entry: InitiativeEntry, index: number): string {
  if (index === currentTurnIndex.value) {
    return 'var(--color-accent)'
  }
  if (entry.hasActedThisRound) {
    return 'var(--color-text-muted)'
  }
  if (entry.type === 'threat') {
    return 'var(--color-danger)'
  }
  return 'var(--color-text)'
}
</script>

<template>
  <div class="initiative-tracker panel">
    <div class="tracker-header">
      <h3 class="tracker-title">Initiative</h3>
      <div class="round-badge">
        <span class="round-label">Round</span>
        <span class="round-number">{{ currentRound }}</span>
      </div>
    </div>

    <div v-if="initiativeOrder.length > 0" class="initiative-list">
      <div
        v-for="(entry, index) in initiativeOrder"
        :key="entry.id"
        class="initiative-entry"
        :class="{
          current: index === currentTurnIndex,
          acted: entry.hasActedThisRound,
          pc: entry.type === 'pc',
          threat: entry.type === 'threat'
        }"
      >
        <span class="entry-initiative">{{ entry.initiative }}</span>
        <span class="entry-icon">{{ getEntryIcon(entry) }}</span>
        <div class="entry-info">
          <span class="entry-name" :style="{ color: getEntryColor(entry, index) }">
            {{ entry.name }}
          </span>
          <span v-if="entry.roleSkill" class="entry-skill">
            ({{ entry.roleSkill }})
          </span>
        </div>
        <span v-if="entry.hasActedThisRound" class="acted-badge">Done</span>
        <span v-if="index === currentTurnIndex && !entry.hasActedThisRound" class="current-indicator">
          ►
        </span>
      </div>
    </div>

    <div v-else class="no-initiative">
      <p>Initiative not yet rolled.</p>
    </div>

    <div v-if="initiativeOrder.length > 0" class="tracker-controls">
      <button
        class="btn btn-primary"
        :disabled="sceneEnded"
        @click="nextTurn"
      >
        Next Turn
      </button>
      <button
        class="btn btn-secondary"
        :disabled="!canDelay"
        @click="delayTurn"
      >
        Delay
      </button>
      <button
        class="btn btn-secondary btn-sm"
        @click="endRound"
      >
        End Round
      </button>
    </div>

    <!-- Current Turn Summary -->
    <div v-if="currentTurn" class="current-turn-summary">
      <div class="summary-label">Current Turn:</div>
      <div class="summary-name">{{ currentTurn.name }}</div>
      <div v-if="currentTurn.type === 'threat'" class="summary-hint">
        Check threat routine for actions
      </div>
      <div v-else class="summary-hint">
        {{ currentTurn.roleSkill }} check
      </div>
    </div>
  </div>
</template>

<style scoped>
.initiative-tracker {
  padding: 0.75rem;
}

.tracker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tracker-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.round-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
}

.round-label {
  font-size: 0.5rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.initiative-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.initiative-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.initiative-entry.current {
  border-color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
}

.initiative-entry.acted {
  opacity: 0.5;
}

.initiative-entry.threat .entry-initiative {
  color: var(--color-danger);
}

.entry-initiative {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  min-width: 1.75rem;
  text-align: center;
}

.entry-icon {
  font-size: 0.875rem;
}

.entry-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.entry-name {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-skill {
  display: block;
  font-size: 0.625rem;
  color: var(--color-text-muted);
}

.acted-badge {
  padding: 0.125rem 0.25rem;
  background: var(--color-text-muted);
  color: var(--color-bg);
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.current-indicator {
  color: var(--color-accent);
  font-weight: 700;
}

.no-initiative {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.875rem;
}

.tracker-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

.btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  flex: 1;
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.5rem;
  font-size: 0.6875rem;
}

.current-turn-summary {
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  text-align: center;
}

.summary-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.summary-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0.125rem 0;
}

.summary-hint {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-style: italic;
}
</style>
