<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ActionLogEntry } from '../../types/starship'

const props = defineProps<{
  log: ActionLogEntry[]
  currentRound: number
}>()

// Filter mode: 'all' or 'current' round
const filterMode = ref<'all' | 'current'>('all')

const filteredLog = computed(() => {
  const entries = filterMode.value === 'current'
    ? props.log.filter(e => e.round === props.currentRound)
    : props.log

  // Reverse chronological
  return [...entries].reverse()
})

function getResultLabel(result: ActionLogEntry['result']): string {
  switch (result) {
    case 'critical_success': return 'CRIT SUCCESS'
    case 'success': return 'SUCCESS'
    case 'failure': return 'FAILURE'
    case 'critical_failure': return 'CRIT FAIL'
  }
}

function getResultClass(result: ActionLogEntry['result']): string {
  switch (result) {
    case 'critical_success': return 'result-crit-success'
    case 'success': return 'result-success'
    case 'failure': return 'result-failure'
    case 'critical_failure': return 'result-crit-failure'
  }
}

// Confirm before clearing
const confirmClear = ref(false)

function clearLog() {
  if (!confirmClear.value) {
    confirmClear.value = true
    setTimeout(() => { confirmClear.value = false }, 3000)
    return
  }
  // Parent should handle actual clearing — emit event
  emits('clear')
  confirmClear.value = false
}

const emits = defineEmits<{
  (e: 'clear'): void
}>()
</script>

<template>
  <div class="action-log panel">
    <div class="log-header">
      <h3 class="log-title">
        Action Log
        <span class="log-count">({{ log.length }})</span>
      </h3>
      <div class="log-controls">
        <button
          class="filter-btn"
          :class="{ active: filterMode === 'all' }"
          @click="filterMode = 'all'"
        >
          All
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterMode === 'current' }"
          @click="filterMode = 'current'"
        >
          Round {{ currentRound }}
        </button>
        <button
          v-if="log.length > 0"
          class="clear-btn"
          :class="{ confirm: confirmClear }"
          @click="clearLog"
        >
          {{ confirmClear ? 'Confirm?' : 'Clear' }}
        </button>
      </div>
    </div>

    <div v-if="filteredLog.length === 0" class="log-empty">
      <span>No actions recorded{{ filterMode === 'current' ? ' this round' : '' }}.</span>
    </div>

    <div v-else class="log-entries">
      <div
        v-for="entry in filteredLog"
        :key="entry.id"
        class="log-entry"
      >
        <div class="entry-left">
          <span class="round-badge">R{{ entry.round }}</span>
          <span class="entry-name">{{ entry.playerName }}</span>
        </div>
        <span class="entry-action">{{ entry.actionName }}</span>
        <span class="result-badge" :class="getResultClass(entry.result)">
          {{ getResultLabel(entry.result) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-log {
  padding: 0.75rem;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.log-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.log-count {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.log-controls {
  display: flex;
  gap: 0.25rem;
}

.filter-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(var(--color-accent-rgb, 99, 102, 241), 0.1);
}

.filter-btn:hover:not(.active) {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.clear-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.clear-btn.confirm {
  border-color: var(--color-danger);
  background: var(--color-danger);
  color: white;
}

.log-empty {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-dim);
  font-size: 0.75rem;
  font-style: italic;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.entry-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.round-badge {
  padding: 0.0625rem 0.25rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5625rem;
  font-weight: 600;
  color: var(--color-text-dim);
}

.entry-name {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.entry-action {
  flex: 1;
  min-width: 0;
  color: var(--color-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-badge {
  flex-shrink: 0;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-crit-success {
  background: rgba(34, 197, 94, 0.2);
  color: #22C55E;
}

.result-success {
  background: rgba(59, 130, 246, 0.2);
  color: #3B82F6;
}

.result-failure {
  background: rgba(249, 115, 22, 0.2);
  color: #F97316;
}

.result-crit-failure {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}
</style>
