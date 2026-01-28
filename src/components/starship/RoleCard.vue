<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StarshipRole, StarshipAction } from '../../types/starship'
import ActionIcon from '../ActionIcon.vue'

const props = defineProps<{
  role: StarshipRole
  playerName?: string
  compact?: boolean
  showActions?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'assign', roleId: string): void
  (e: 'unassign', roleId: string): void
  (e: 'edit', role: StarshipRole): void
}>()

const expanded = ref(props.showActions || !props.compact)
const expandedActions = ref<Set<string>>(new Set())

function toggleAction(actionId: string) {
  if (expandedActions.value.has(actionId)) {
    expandedActions.value.delete(actionId)
  } else {
    expandedActions.value.add(actionId)
  }
}

function isActionExpanded(actionId: string): boolean {
  return expandedActions.value.has(actionId)
}

// Get display text for action check type (skill or attack roll)
function getActionCheckDisplay(action: StarshipAction): string {
  if (action.isAttack) {
    const prof = action.proficiency === 'martial' ? 'Martial' : 'Simple'
    return `Attack Roll (${prof})`
  }
  if (action.skills.length === 0) {
    return 'Special'
  }
  return action.skills.join(' or ')
}

const roleTypeColor = computed(() => {
  switch (props.role.type) {
    case 'captain': return 'var(--color-warning)'
    case 'engineer': return 'var(--color-info)'
    case 'gunner': return 'var(--color-danger)'
    case 'magic_officer': return 'var(--color-accent)'
    case 'pilot': return 'var(--color-success)'
    case 'science_officer': return 'var(--color-primary)'
    default: return 'var(--color-text-dim)'
  }
})
</script>

<template>
  <div class="role-card" :class="{ compact, expanded }">
    <div class="role-header" @click="expanded = !expanded">
      <div class="role-icon" :style="{ background: roleTypeColor }">
        {{ role.name.charAt(0) }}
      </div>
      <div class="role-info">
        <h4 class="role-name">{{ role.name }}</h4>
        <div class="role-skills">
          {{ role.primarySkills.length > 0 ? role.primarySkills.join(', ') : 'Attack Rolls' }}
        </div>
      </div>
      <div class="role-meta">
        <span v-if="playerName" class="assigned-badge">{{ playerName }}</span>
        <span v-if="role.isCustom" class="custom-badge">Custom</span>
        <button
          v-if="editable"
          class="edit-btn"
          @click.stop="emit('edit', role)"
          title="Edit role"
        >
          &#9998;
        </button>
        <span class="expand-icon">{{ expanded ? '&#x25BC;' : '&#x25B6;' }}</span>
      </div>
    </div>

    <div v-if="expanded" class="role-content">
      <p class="role-description">{{ role.description }}</p>

      <!-- Actions Header -->
      <div class="role-actions-header">
        <span class="actions-label">{{ role.actions.length }} Actions</span>
        <div v-if="!showActions" class="assignment-controls">
          <button
            v-if="playerName"
            class="btn btn-secondary btn-xs"
            @click.stop="emit('unassign', role.id)"
          >
            Unassign
          </button>
          <button
            v-else
            class="btn btn-primary btn-xs"
            @click.stop="emit('assign', role.id)"
          >
            Assign
          </button>
        </div>
      </div>

      <!-- Actions List -->
      <div class="actions-list">
        <div
          v-for="action in role.actions"
          :key="action.id"
          class="action-item"
          :class="{ 'action-expanded': isActionExpanded(action.id) }"
        >
          <div class="action-header" @click.stop="toggleAction(action.id)">
            <ActionIcon :action="action.actionCost" class="action-cost-icon" />
            <div class="action-info">
              <span class="action-name">{{ action.name }}</span>
              <span class="action-skills" :class="{ 'attack-roll': action.isAttack }">{{ getActionCheckDisplay(action) }}</span>
            </div>
            <span class="action-expand">{{ isActionExpanded(action.id) ? '&#x25BC;' : '&#x25B6;' }}</span>
          </div>

          <div v-if="isActionExpanded(action.id)" class="action-details">
            <p class="action-description">{{ action.description }}</p>

            <div class="outcomes">
              <div class="outcome critical-success">
                <span class="outcome-label">Critical Success</span>
                <p class="outcome-text">{{ action.outcomes.criticalSuccess }}</p>
              </div>
              <div class="outcome success">
                <span class="outcome-label">Success</span>
                <p class="outcome-text">{{ action.outcomes.success }}</p>
              </div>
              <div v-if="action.outcomes.failure" class="outcome failure">
                <span class="outcome-label">Failure</span>
                <p class="outcome-text">{{ action.outcomes.failure }}</p>
              </div>
              <div v-if="action.outcomes.criticalFailure" class="outcome critical-failure">
                <span class="outcome-label">Critical Failure</span>
                <p class="outcome-text">{{ action.outcomes.criticalFailure }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-card {
  background: rgba(var(--color-bg-surface-rgb, 20, 22, 28), 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.role-card.expanded {
  border-color: var(--color-accent);
}

.role-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.role-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.role-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-bg);
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.125rem;
}

.role-skills {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assigned-badge {
  padding: 0.25rem 0.5rem;
  background: var(--color-success);
  color: var(--color-bg);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.custom-badge {
  padding: 0.25rem 0.5rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.edit-btn {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}

.edit-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
}

.expand-icon {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

/* Content */
.role-content {
  padding: 0 0.75rem 0.75rem;
  border-top: 1px solid var(--color-border);
}

.role-description {
  padding: 0.75rem 0;
  font-size: 0.875rem;
  color: var(--color-text-dim);
  line-height: 1.5;
}

.role-actions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.actions-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.assignment-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
}

/* Actions List */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
}

.action-item {
  background: rgba(var(--color-bg-rgb, 5, 6, 8), 0.5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.action-item.action-expanded {
  border-color: var(--color-accent);
}

.action-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.action-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.action-cost-icon {
  font-size: 1.25rem;
  color: var(--color-accent);
  flex-shrink: 0;
}

.action-info {
  flex: 1;
  min-width: 0;
}

.action-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-skills {
  display: block;
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.action-skills.attack-roll {
  color: var(--color-danger);
  font-weight: 600;
}

.action-expand {
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

/* Action Details */
.action-details {
  padding: 0.75rem;
  border-top: 1px solid var(--color-border);
  background: rgba(var(--color-bg-rgb, 5, 6, 8), 0.3);
}

.action-description {
  font-size: 0.8125rem;
  color: var(--color-text-dim);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

/* Outcomes */
.outcomes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.outcome {
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  border-left: 3px solid;
}

.outcome-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.outcome-text {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text);
}

.outcome.critical-success {
  background: rgba(var(--color-success-rgb, 34, 197, 94), 0.1);
  border-left-color: var(--color-success);
}

.outcome.critical-success .outcome-label {
  color: var(--color-success);
}

.outcome.success {
  background: rgba(var(--color-info-rgb, 59, 130, 246), 0.1);
  border-left-color: var(--color-info);
}

.outcome.success .outcome-label {
  color: var(--color-info);
}

.outcome.failure {
  background: rgba(var(--color-warning-rgb, 234, 179, 8), 0.1);
  border-left-color: var(--color-warning);
}

.outcome.failure .outcome-label {
  color: var(--color-warning);
}

.outcome.critical-failure {
  background: rgba(var(--color-danger-rgb, 239, 68, 68), 0.1);
  border-left-color: var(--color-danger);
}

.outcome.critical-failure .outcome-label {
  color: var(--color-danger);
}
</style>
