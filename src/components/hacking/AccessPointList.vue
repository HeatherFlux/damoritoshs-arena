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
  return !!(
    node.hackSkills?.length ||
    node.vulnerabilities?.length ||
    node.countermeasures?.length ||
    node.cumulative
  )
}

function getNodeDC(node: AccessPoint): number | undefined {
  return node.dc || node.hackSkills?.[0]?.dc
}

// ============ Cumulative challenge mode ============

// Per-node input state for the GM's "record this roll" form.
const rollTotalInputs = ref<Record<string, number | null>>({})
const cumulativeTargetInputs = ref<Record<string, number | null>>({})

/** Default target heuristic — DC × successesRequired. */
function getDefaultCumulativeTarget(node: AccessPoint): number {
  const dc = getNodeDC(node) ?? 15
  const successes = node.successesRequired ?? 1
  return dc * successes
}

function enableCumulative(nodeId: string) {
  const node = store.state.computer?.accessPoints.find(n => n.id === nodeId)
  if (!node) return
  const target = cumulativeTargetInputs.value[nodeId] || getDefaultCumulativeTarget(node)
  store.setNodeCumulative(nodeId, target)
  cumulativeTargetInputs.value[nodeId] = null
}

/**
 * Record a hack roll. The GM enters the d20 total; we compute the
 * margin (rolled - dc) and pass to the store mutator with the GM-
 * declared outcome tier.
 */
function recordRoll(nodeId: string, outcome: 'critical_success' | 'success' | 'failure' | 'critical_failure') {
  const node = store.state.computer?.accessPoints.find(n => n.id === nodeId)
  if (!node || !node.cumulative) return
  const total = rollTotalInputs.value[nodeId] ?? 0
  const dc = getNodeDC(node) ?? 15
  const margin = total - dc
  store.recordHackProgress(nodeId, outcome, margin)
  rollTotalInputs.value[nodeId] = null
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
          'is-hidden': node.hidden,
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
              <span v-if="node.hidden" class="hidden-badge">HIDDEN</span>
            </div>
            <div class="node-meta">
              <span class="node-type">{{ node.type }}<span v-if="getNodeDC(node)"> | DC {{ getNodeDC(node) }}</span></span>
              <span v-if="node.successesRequired && !node.cumulative" class="node-successes">
                {{ node.successesRequired }} success{{ node.successesRequired > 1 ? 'es' : '' }}
              </span>
              <span v-if="node.cumulative" class="node-successes" :title="`Cumulative challenge — ${node.cumulative.current} / ${node.cumulative.target} margin accumulated`">
                {{ node.cumulative.current }} / {{ node.cumulative.target }}
              </span>
            </div>
            <!-- Cumulative progress bar — visible when cumulative mode is on -->
            <div v-if="node.cumulative" class="cumulative-bar-track" :title="`${node.cumulative.current} / ${node.cumulative.target}`">
              <div
                class="cumulative-bar-fill"
                :style="{ width: Math.min(100, (node.cumulative.current / Math.max(1, node.cumulative.target)) * 100) + '%' }"
              ></div>
            </div>
          </div>

          <div class="node-controls">
            <button
              class="visibility-btn"
              :class="{ 'is-hidden': node.hidden }"
              :title="node.hidden ? 'Show to players' : 'Hide from players'"
              @click.stop="store.toggleNodeHidden(node.id)"
            >
              <svg v-if="!node.hidden" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>

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

        <!-- Hack Skills (if more detailed than just DC) -->
        <div v-if="node.hackSkills?.length" class="hack-dc">
          <span class="dc-label">Skills:</span>
          <span class="dc-value">{{ node.hackSkills.map(formatSkill).join(' or ') }}</span>
        </div>

        <!-- GM Notes (read-only display) -->
        <div v-if="node.notes" class="node-notes-display">
          <span class="notes-label">Notes:</span>
          <span class="notes-text">{{ node.notes }}</span>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedNode === node.id" class="node-details">
          <!-- Cumulative challenge mode — toggle + record-roll form. -->
          <div class="detail-section cumulative-section">
            <div class="section-label">Cumulative Challenge</div>
            <div v-if="!node.cumulative" class="cumulative-enable">
              <span class="cumul-hint">Margin-based progress (success adds rolled-DC to a running total). Set a target to enable.</span>
              <div class="cumul-enable-row">
                <input
                  type="number"
                  class="cumul-input"
                  v-model.number="cumulativeTargetInputs[node.id]"
                  :placeholder="String(getDefaultCumulativeTarget(node))"
                  min="1"
                />
                <button
                  class="btn-secondary btn-xs"
                  @click.stop="enableCumulative(node.id)"
                >Enable</button>
              </div>
            </div>
            <div v-else class="cumulative-active">
              <div class="cumul-status">
                <strong>{{ node.cumulative.current }}</strong> / {{ node.cumulative.target }} margin
                <button
                  class="btn-secondary btn-xs"
                  @click.stop="store.setNodeCumulative(node.id)"
                  title="Disable cumulative mode"
                >Disable</button>
              </div>
              <div class="cumul-record-row">
                <span class="cumul-row-label">Record roll:</span>
                <input
                  type="number"
                  class="cumul-input"
                  v-model.number="rollTotalInputs[node.id]"
                  placeholder="d20 total"
                />
                <button class="btn-secondary btn-xs cumul-outcome-crit-success" @click.stop="recordRoll(node.id, 'critical_success')" title="Critical success (margin × 2)">Crit</button>
                <button class="btn-secondary btn-xs cumul-outcome-success" @click.stop="recordRoll(node.id, 'success')" title="Success (margin)">Pass</button>
                <button class="btn-secondary btn-xs cumul-outcome-failure" @click.stop="recordRoll(node.id, 'failure')" title="Failure (no progress)">Fail</button>
                <button class="btn-secondary btn-xs cumul-outcome-crit-failure" @click.stop="recordRoll(node.id, 'critical_failure')" title="Critical failure (-margin)">Fumble</button>
              </div>
            </div>
          </div>

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
  min-height: 0;
  padding: 0.75rem;
  overflow-y: auto;
  border-radius: var(--radius-md);
}

@media (min-width: 1024px) {
  .node-list {
    min-height: 300px;
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

.nodes {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

@media (min-width: 1024px) {
  .nodes {
    gap: 0.5rem;
  }
}

.node-item {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all 0.15s ease;
}

.node-item.is-hidden {
  opacity: 0.55;
}

.node-item.focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
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

@media (min-width: 1024px) {
  .node-item.state-breached,
  .node-item.state-alarmed,
  .node-item.state-active {
    border-left-width: 4px;
  }
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  cursor: pointer;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .node-header {
    padding: 0.75rem;
  }
}

.node-header:hover {
  background: var(--color-bg-hover);
}

.node-name-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 1024px) {
  .node-name-row {
    gap: 0.375rem;
  }
}

.expand-btn {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 10px;
  cursor: pointer;
  width: 16px;
}

@media (min-width: 1024px) {
  .expand-btn {
    font-size: 11px;
    width: 18px;
  }
}

.node-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

@media (min-width: 1024px) {
  .node-name {
    font-size: var(--text-base);
  }
}

.node-dc {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-bg);
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-accent);
}

@media (min-width: 1024px) {
  .node-dc {
    font-size: var(--text-xs);
    padding: 0.125rem 0.375rem;
  }
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.625rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

@media (min-width: 1024px) {
  .node-meta {
    gap: 0.5rem;
    font-size: var(--text-xs);
    margin-top: 0.25rem;
  }
}

.node-type {
  text-transform: uppercase;
}

.node-successes {
  color: var(--color-accent);
}

.hidden-badge {
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.0625rem 0.25rem;
  border-radius: var(--radius-sm);
}

@media (min-width: 1024px) {
  .hidden-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }
}

.node-controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.visibility-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.15s ease;
}

.visibility-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border);
  background: var(--color-bg);
}

.visibility-btn.is-hidden {
  color: var(--color-text-muted);
}

.state-select {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  /* Remove native select arrows */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: none;
}

@media (min-width: 1024px) {
  .state-select {
    padding: 0.25rem 0.5rem;
    font-size: var(--text-xs);
  }
}

/* Remove arrows in IE/Edge */
.state-select::-ms-expand {
  display: none;
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
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
}

@media (min-width: 1024px) {
  .hack-dc {
    padding: 0.5rem 0.75rem;
    font-size: var(--text-sm);
  }
}

.dc-label {
  color: var(--color-text-muted);
  margin-right: 0.375rem;
}

@media (min-width: 1024px) {
  .dc-label {
    margin-right: 0.5rem;
  }
}

.dc-value {
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
}

/* GM Notes (read-only display) */
.node-notes-display {
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
}

@media (min-width: 1024px) {
  .node-notes-display {
    padding: 0.5rem 0.75rem;
    font-size: var(--text-sm);
  }
}

.notes-label {
  color: var(--color-text-muted);
  margin-right: 0.375rem;
}

@media (min-width: 1024px) {
  .notes-label {
    margin-right: 0.5rem;
  }
}

.notes-text {
  color: var(--color-text-dim);
  font-style: italic;
}

/* Expanded details */
.node-details {
  padding: 0.5rem;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .node-details {
    padding: 0.75rem;
  }
}

.detail-section {
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .detail-section {
    margin-bottom: 0.75rem;
  }
}

/* Cumulative challenge progress + record-roll form */
.cumulative-bar-track {
  height: 4px;
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
  border-radius: 2px;
  margin: 0.25rem 0 0.25rem;
  overflow: hidden;
}

.cumulative-bar-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-accent) 50%, transparent);
}

.cumulative-section {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
}

.cumul-hint {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  margin-bottom: 0.375rem;
  font-style: italic;
}

.cumul-enable-row,
.cumul-record-row,
.cumul-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.cumul-status {
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}

.cumul-status strong {
  color: var(--color-accent);
  font-family: 'JetBrains Mono', monospace;
}

.cumul-row-label {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cumul-input {
  width: 70px;
  padding: 0.25rem 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
}

.cumul-outcome-crit-success { color: var(--color-success); }
.cumul-outcome-success { color: var(--color-text); }
.cumul-outcome-failure { color: var(--color-text-dim); }
.cumul-outcome-crit-failure { color: var(--color-danger); }

.detail-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

@media (min-width: 1024px) {
  .section-label {
    font-size: var(--text-xs);
    margin-bottom: 0.375rem;
  }
}

.vuln-label {
  color: var(--color-success);
}

.cm-label {
  color: var(--color-danger);
}

.detail-item {
  font-size: var(--text-xs);
  padding: 0.25rem 0;
  padding-left: 0.5rem;
  border-left: 2px solid;
}

@media (min-width: 1024px) {
  .detail-item {
    font-size: var(--text-sm);
    padding: 0.375rem 0;
    padding-left: 0.625rem;
    border-left-width: 3px;
  }
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
  font-size: 0.625rem;
  margin-top: 0.125rem;
}

@media (min-width: 1024px) {
  .cm-info {
    font-size: var(--text-xs);
  }
}

/* Outcome section */
.outcome-section {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .outcome-section {
    margin-top: 1rem;
    padding-top: 0.75rem;
  }
}

.outcome-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-success);
  margin-bottom: 0.25rem;
}

@media (min-width: 1024px) {
  .outcome-label {
    font-size: var(--text-xs);
    margin-bottom: 0.375rem;
  }
}

.outcome-text {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  line-height: 1.5;
}

@media (min-width: 1024px) {
  .outcome-text {
    font-size: var(--text-sm);
  }
}
</style>
