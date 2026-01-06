<script setup lang="ts">
import { useHackingStore } from '../../stores/hackingStore'
import type { NodeState } from '../../types/hacking'

const store = useHackingStore()

const nodeStates: NodeState[] = ['locked', 'active', 'breached', 'alarmed']

function handleStateChange(nodeId: string, newState: NodeState) {
  store.setNodeState(nodeId, newState)
}
</script>

<template>
  <div class="node-list panel p-4">
    <h3 class="text-lg font-semibold mb-4 text-accent">Access Points</h3>

    <div v-if="!store.state.computer" class="text-muted text-sm">
      No computer loaded
    </div>

    <div v-else class="nodes">
      <div
        v-for="node in store.state.computer.accessPoints"
        :key="node.id"
        class="node-item"
        :class="{
          focused: store.state.focusedNodeId === node.id,
          [`state-${node.state}`]: true
        }"
        @click="store.setFocus(node.id)"
      >
        <div class="node-info">
          <div class="node-name">{{ node.name }}</div>
          <div class="node-type text-xs text-muted">{{ node.type }}</div>
        </div>

        <select
          class="state-select"
          :class="`select-${node.state}`"
          :value="node.state"
          @click.stop
          @change="handleStateChange(node.id, ($event.target as HTMLSelectElement).value as NodeState)"
        >
          <option v-for="state in nodeStates" :key="state" :value="state">
            {{ state.charAt(0).toUpperCase() + state.slice(1) }}
          </option>
        </select>
      </div>
    </div>

    <hr class="my-4 border-[var(--color-border)]" />

    <div class="node-actions">
      <button
        class="btn btn-sm btn-secondary w-full mb-2"
        :disabled="!store.state.focusedNodeId"
        @click="store.triggerEffect('breach', store.state.focusedNodeId || undefined)"
      >
        Breach Selected
      </button>
      <button
        class="btn btn-sm btn-secondary w-full"
        :disabled="!store.state.focusedNodeId"
        @click="store.triggerEffect('alarm', store.state.focusedNodeId || undefined)"
      >
        Alarm Selected
      </button>
    </div>
  </div>
</template>

<style scoped>
.node-list {
  width: 240px;
}

.nodes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.node-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.node-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.node-item.focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
}

.node-item.state-breached {
  border-left: 3px solid var(--color-success);
}

.node-item.state-alarmed {
  border-left: 3px solid var(--color-danger);
}

.node-item.state-active {
  border-left: 3px solid var(--color-accent);
}

.node-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.state-select {
  padding: 0.25rem 0.5rem;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s ease;
  appearance: none;
  padding-right: 1.25rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a8b9a' d='M3 4.5L6 7.5 9 4.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.25rem center;
}

.state-select:hover {
  border-color: var(--color-border-hover);
}

.state-select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
}

.state-select.select-breached {
  border-color: var(--color-success);
  color: var(--color-success);
}

.state-select.select-alarmed {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.state-select.select-active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.state-select.select-locked {
  color: var(--color-text-dim);
}

.node-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
