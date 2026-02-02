<script setup lang="ts">
import { ref, computed } from 'vue'
import type { InitiativeEntry, StarshipAction, ActionLogEntry } from '../../types/starship'
import { getDCForLevel } from '../../utils/dcTable'
import { rollD20, rollDamage, type RollResult } from '../../utils/dice'
import { useStarshipStore } from '../../stores/starshipStore'
import { getRoleColor } from '../../data/starshipRoles'
import ActionIcon from '../ActionIcon.vue'

const props = defineProps<{
  turn: InitiativeEntry
  actions: StarshipAction[]
  roleName: string
  roleId: string
  sceneLevel: number
  shipBonuses: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'action-resolved'): void
}>()

const store = useStarshipStore()

// GM-entered modifier for the current roll
const modifier = ref(0)

// Last roll result state
const lastRoll = ref<{
  action: StarshipAction
  rollResult: RollResult
  outcome: ActionLogEntry['result']
  outcomeText: string
  dc: number
  damageResult?: RollResult
} | null>(null)

// Animation flag
const showResult = ref(false)

const sceneDC = computed(() => getDCForLevel(props.sceneLevel))

// Determine the 4-tier outcome from a d20 roll vs DC
function determine4TierOutcome(
  roll: RollResult,
  dc: number
): ActionLogEntry['result'] {
  const total = roll.total
  let degree: 'critical_success' | 'success' | 'failure' | 'critical_failure'

  if (total >= dc + 10) {
    degree = 'critical_success'
  } else if (total >= dc) {
    degree = 'success'
  } else if (total <= dc - 10) {
    degree = 'critical_failure'
  } else {
    degree = 'failure'
  }

  // Nat 20 upgrades one step
  if (roll.isNat20) {
    if (degree === 'failure') degree = 'success'
    else if (degree === 'success') degree = 'critical_success'
    else if (degree === 'critical_failure') degree = 'failure'
  }

  // Nat 1 downgrades one step
  if (roll.isNat1) {
    if (degree === 'success') degree = 'failure'
    else if (degree === 'critical_success') degree = 'success'
    else if (degree === 'failure') degree = 'critical_failure'
  }

  return degree
}

function getOutcomeText(action: StarshipAction, outcome: ActionLogEntry['result']): string {
  switch (outcome) {
    case 'critical_success': return action.outcomes.criticalSuccess
    case 'success': return action.outcomes.success
    case 'failure': return action.outcomes.failure || 'No effect.'
    case 'critical_failure': return action.outcomes.criticalFailure || 'Something goes wrong.'
  }
}

function getOutcomeLabel(outcome: ActionLogEntry['result']): string {
  switch (outcome) {
    case 'critical_success': return 'CRITICAL SUCCESS'
    case 'success': return 'SUCCESS'
    case 'failure': return 'FAILURE'
    case 'critical_failure': return 'CRITICAL FAILURE'
  }
}

function getOutcomeClass(outcome: ActionLogEntry['result']): string {
  switch (outcome) {
    case 'critical_success': return 'crit-success'
    case 'success': return 'success'
    case 'failure': return 'failure'
    case 'critical_failure': return 'crit-failure'
  }
}

function rollForAction(action: StarshipAction) {
  // Determine DC — use action's fixed DC if set, otherwise scene DC
  const dc = action.dc ?? sceneDC.value

  // Apply ship bonus if applicable
  let totalMod = modifier.value
  for (const skill of action.skills) {
    if (props.shipBonuses[skill]) {
      totalMod += props.shipBonuses[skill]
      break // Only apply one bonus
    }
  }

  // For attack actions, roll vs AC (modifier is the attack bonus)
  const rollResult = rollD20(totalMod, action.name, props.turn.name)

  const outcome = action.isAttack
    ? determine4TierOutcome(rollResult, dc) // For attacks, DC = target AC
    : determine4TierOutcome(rollResult, dc)

  const outcomeText = getOutcomeText(action, outcome)

  // Auto-roll damage on hit for attack actions
  let damageResult: RollResult | undefined
  if (action.isAttack && action.damage && (outcome === 'success' || outcome === 'critical_success')) {
    damageResult = rollDamage(
      action.damage,
      action.name,
      props.turn.name,
      outcome === 'critical_success'
    )
  }

  lastRoll.value = {
    action,
    rollResult,
    outcome,
    outcomeText,
    dc,
    damageResult
  }

  // Trigger animation
  showResult.value = false
  requestAnimationFrame(() => {
    showResult.value = true
  })
}

function logAndNext() {
  if (!lastRoll.value) return

  const { action, rollResult, outcome, damageResult } = lastRoll.value

  // Build description with roll breakdown
  let description = rollResult.breakdown
  if (damageResult) {
    description += ` | Damage: ${damageResult.breakdown}`
  }

  store.logAction(
    props.roleId,
    props.turn.name,
    action.name,
    outcome,
    description
  )

  // Reset state
  lastRoll.value = null
  showResult.value = false
  modifier.value = 0

  emit('action-resolved')
}

// Role color from metadata
const roleColor = computed(() => getRoleColor(props.roleId))
</script>

<template>
  <div class="action-roll-panel panel">
    <!-- Header -->
    <div class="panel-header" :style="{ borderColor: roleColor }">
      <div class="role-info">
        <span class="role-dot" :style="{ background: roleColor }"></span>
        <span class="player-name">{{ turn.name }}</span>
        <span class="role-name">{{ roleName }}</span>
      </div>
      <div class="modifier-input">
        <label class="mod-label">Modifier</label>
        <input
          type="number"
          class="mod-input"
          v-model.number="modifier"
          placeholder="+0"
          @keyup.enter="() => {}"
        />
      </div>
    </div>

    <!-- Actions List -->
    <div v-if="!lastRoll" class="actions-list">
      <div
        v-for="action in actions"
        :key="action.id"
        class="action-row"
        @click="rollForAction(action)"
      >
        <div class="action-info">
          <span class="action-name">{{ action.name }}</span>
          <ActionIcon :action="action.actionCost" />
        </div>
        <div class="action-skills">
          {{ action.skills.join(' / ') }}
          <span v-if="action.isAttack" class="attack-tag">Attack</span>
        </div>
        <button class="roll-btn">
          Roll
          <span class="dc-hint">DC {{ action.dc ?? sceneDC }}</span>
        </button>
      </div>
    </div>

    <!-- Roll Result -->
    <div v-if="lastRoll" class="roll-result" :class="{ 'show': showResult }">
      <div class="result-action-name">{{ lastRoll.action.name }}</div>

      <!-- Roll breakdown -->
      <div class="roll-breakdown">
        <span class="roll-dice">
          1d20 (<span class="roll-natural" :class="{ nat20: lastRoll.rollResult.isNat20, nat1: lastRoll.rollResult.isNat1 }">{{ lastRoll.rollResult.roll }}</span>)
          {{ lastRoll.rollResult.modifier >= 0 ? '+' : '' }}{{ lastRoll.rollResult.modifier }}
          = <strong>{{ lastRoll.rollResult.total }}</strong>
        </span>
        <span class="roll-vs">vs DC {{ lastRoll.dc }}</span>
      </div>

      <!-- Outcome badge -->
      <div class="outcome-badge" :class="getOutcomeClass(lastRoll.outcome)">
        {{ getOutcomeLabel(lastRoll.outcome) }}
      </div>

      <!-- Outcome text -->
      <p class="outcome-text">{{ lastRoll.outcomeText }}</p>

      <!-- Damage result (if applicable) -->
      <div v-if="lastRoll.damageResult" class="damage-result">
        <span class="damage-label">Damage:</span>
        <span class="damage-total">{{ lastRoll.damageResult.total }}</span>
        <span v-if="lastRoll.damageResult.damageType" class="damage-type">
          {{ lastRoll.damageResult.damageType }}
        </span>
        <span class="damage-breakdown">({{ lastRoll.damageResult.breakdown }})</span>
      </div>

      <!-- Log & Next button -->
      <button class="log-next-btn" @click="logAndNext">
        Log & Next Turn
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-roll-panel {
  padding: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--color-accent);
  background: var(--color-bg-surface);
}

.role-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.role-name {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modifier-input {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.mod-label {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.mod-input {
  width: 4rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
}

.mod-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Hide number input spinners */
.mod-input::-webkit-inner-spin-button,
.mod-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.mod-input {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Actions List */
.actions-list {
  display: flex;
  flex-direction: column;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.action-row:last-child {
  border-bottom: none;
}

.action-row:hover {
  background: var(--color-bg-surface);
}

.action-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.action-info :deep(.action-icon) {
  flex-shrink: 0;
}

.action-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-skills {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.attack-tag {
  display: inline-block;
  padding: 0.0625rem 0.25rem;
  margin-left: 0.25rem;
  background: var(--color-danger);
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.roll-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.roll-btn:hover {
  background: var(--color-accent-hover);
}

.dc-hint {
  font-size: 0.625rem;
  opacity: 0.8;
  font-weight: 400;
}

/* Roll Result */
.roll-result {
  padding: 1rem;
  text-align: center;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.25s ease;
}

.roll-result.show {
  opacity: 1;
  transform: translateY(0);
}

.result-action-name {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.roll-breakdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.roll-natural {
  font-weight: 700;
}

.roll-natural.nat20 {
  color: var(--color-success);
}

.roll-natural.nat1 {
  color: var(--color-danger);
}

.roll-vs {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

/* Outcome Badge */
.outcome-badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.outcome-badge.crit-success {
  background: rgba(34, 197, 94, 0.2);
  color: #22C55E;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.outcome-badge.success {
  background: rgba(59, 130, 246, 0.2);
  color: #3B82F6;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.outcome-badge.failure {
  background: rgba(249, 115, 22, 0.2);
  color: #F97316;
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.outcome-badge.crit-failure {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.outcome-text {
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
  max-width: 500px;
  margin-inline: auto;
}

/* Damage Result */
.damage-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  margin-bottom: 0.75rem;
}

.damage-label {
  font-size: 0.6875rem;
  color: var(--color-danger);
  text-transform: uppercase;
  font-weight: 600;
}

.damage-total {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-danger);
}

.damage-type {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.damage-breakdown {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-family: 'JetBrains Mono', monospace;
}

/* Log & Next Button */
.log-next-btn {
  width: 100%;
  padding: 0.625rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.15s ease;
}

.log-next-btn:hover {
  background: var(--color-accent-hover);
}
</style>
