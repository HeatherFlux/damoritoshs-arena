<script setup lang="ts">
import { ref } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import type { NodeState, SkillCheck, AccessPoint } from '../../types/hacking'

const store = useHackingStore()
const expandedNode = ref<string | null>(null)

const nodeStates: NodeState[] = ['locked', 'active', 'breached', 'alarmed']

function handleStateChange(nodeId: string, newState: NodeState) {
  store.setNodeState(nodeId, newState)
}

function toggleExpand(nodeId: string) {
  expandedNode.value = expandedNode.value === nodeId ? null : nodeId
}

function formatSkill(check: SkillCheck): string {
  let text = `${check.skill} DC ${check.dc}`
  if (check.proficiency && check.proficiency !== 'untrained') {
    text += ` (${check.proficiency})`
  }
  return text
}

function hasDetails(node: AccessPoint): boolean {
  return !!(node.hackSkills?.length || node.vulnerabilities?.length || node.countermeasures?.length)
}

function getNodeDC(node: AccessPoint): number | undefined {
  return node.dc || node.hackSkills?.[0]?.dc
}
</script>

<template>
  <div class="node-list panel">
    <h3 class="card-title">Access Points</h3>

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
          expanded: expandedNode === node.id,
          [`state-${node.state}`]: true
        }"
      >
        <!-- Node Header -->
        <div class="node-header" @click="store.setFocus(node.id)">
          <div class="node-info">
            <div class="node-name-row">
              <button
                v-if="hasDetails(node)"
                class="expand-btn"
                @click.stop="toggleExpand(node.id)"
              >
                {{ expandedNode === node.id ? '▼' : '▶' }}
              </button>
              <span class="node-name">{{ node.name }}</span>
            </div>
            <div class="node-meta">
              <span class="node-type">{{ node.type }}<span v-if="getNodeDC(node)"> | DC {{ getNodeDC(node) }}</span></span>
              <span v-if="node.successesRequired" class="node-successes">
                {{ node.successesRequired }} success{{ node.successesRequired > 1 ? 'es' : '' }}
              </span>
            </div>
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

        <!-- Hack Skills (if more detailed than just DC) -->
        <div v-if="node.hackSkills?.length" class="hack-dc">
          <span class="dc-label">Skills:</span>
          <span class="dc-value">{{ node.hackSkills.map(formatSkill).join(' or ') }}</span>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedNode === node.id" class="node-details">
          <!-- Vulnerabilities -->
          <div v-if="node.vulnerabilities?.length" class="detail-section">
            <div class="section-label vuln-label">Vulnerabilities</div>
            <div v-for="vuln in node.vulnerabilities" :key="vuln.id" class="detail-item vuln">
              <span class="item-name">{{ vuln.name }}</span>
              <span class="item-info">
                {{ vuln.skills.map(formatSkill).join(' or ') }}; <strong>−{{ vuln.dcReduction }}</strong>
              </span>
            </div>
          </div>

          <!-- Countermeasures -->
          <div v-if="node.countermeasures?.length" class="detail-section">
            <div class="section-label cm-label">Countermeasures</div>
            <div v-for="cm in node.countermeasures" :key="cm.id" class="detail-item cm">
              <div class="cm-header-row">
                <span class="item-name">{{ cm.name }}</span>
                <span class="cm-threshold">({{ cm.failureThreshold }} fail{{ cm.isPersistent ? ', persistent' : '' }})</span>
              </div>
              <div class="cm-info">
                <span v-if="cm.noticeDC">Notice DC {{ cm.noticeDC }}; </span>
                Disable {{ cm.disableSkills.map(formatSkill).join(' or ') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Crit descriptions -->
    <div v-if="store.state.computer?.successDescription" class="outcome-section">
      <div class="outcome-label">Success</div>
      <div class="outcome-text">{{ store.state.computer.successDescription }}</div>
    </div>
  </div>
</template>

<style scoped>
.node-list {
  flex: 1;
  width: 100%;
  min-height: 300px;
  padding: 1.5rem;
  overflow-y: auto;
  border-radius: var(--radius-md);
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.nodes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.node-item {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all 0.15s ease;
}

.node-item.focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
}

.node-item.state-breached {
  border-left: 4px solid var(--color-success);
}

.node-item.state-alarmed {
  border-left: 4px solid var(--color-danger);
}

.node-item.state-active {
  border-left: 4px solid var(--color-accent);
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  cursor: pointer;
}

.node-header:hover {
  background: var(--color-bg-hover);
}

.node-name-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.expand-btn {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 11px;
  cursor: pointer;
  width: 18px;
}

.node-name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text);
}

.node-dc {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-bg);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-accent);
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.node-type {
  text-transform: uppercase;
}

.node-successes {
  color: var(--color-accent);
}

.state-select {
  padding: 0.25rem 0.5rem;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  appearance: none;
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

/* Hack DC row */
.hack-dc {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
}

.dc-label {
  color: var(--color-text-muted);
  margin-right: 0.5rem;
}

.dc-value {
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
}

/* Expanded details */
.node-details {
  padding: 0.75rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.detail-section {
  margin-bottom: 0.75rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
}

.vuln-label {
  color: var(--color-success);
}

.cm-label {
  color: var(--color-danger);
}

.detail-item {
  font-size: var(--text-sm);
  padding: 0.375rem 0;
  padding-left: 0.625rem;
  border-left: 3px solid;
}

.detail-item.vuln {
  border-color: var(--color-success);
}

.detail-item.cm {
  border-color: var(--color-danger);
}

.item-name {
  display: block;
  color: var(--color-text);
  font-weight: 500;
}

.item-info {
  display: block;
  color: var(--color-text-dim);
  font-size: var(--text-xs);
  margin-top: 0.125rem;
}

.cm-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cm-threshold {
  color: var(--color-danger);
  font-size: var(--text-xs);
}

.cm-info {
  color: var(--color-text-dim);
  font-size: var(--text-xs);
  margin-top: 0.125rem;
}

/* Outcome section */
.outcome-section {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.outcome-label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-success);
  margin-bottom: 0.375rem;
}

.outcome-text {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  line-height: 1.5;
}
</style>
