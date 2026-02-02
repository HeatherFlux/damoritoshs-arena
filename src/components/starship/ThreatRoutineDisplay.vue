<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { StarshipThreat, ThreatRoutineAction, ActionLogEntry } from '../../types/starship'
import { useStarshipStore } from '../../stores/starshipStore'
import { rollD20, rollDamage, type RollResult } from '../../utils/dice'
import ActionIcon from '../ActionIcon.vue'

const props = defineProps<{
  threat: StarshipThreat
}>()

const emit = defineEmits<{
  (e: 'execute-action', action: ThreatRoutineAction): void
}>()

const store = useStarshipStore()

const routine = computed(() => props.threat.routine)

const actionsUsed = computed(() => props.threat.routineActionsUsed ?? [])

const totalActionsUsed = computed(() => {
  return actionsUsed.value.reduce((sum, actionId) => {
    const action = routine.value?.actions.find(a => a.id === actionId)
    return sum + (action?.actionCost ?? 0)
  }, 0)
})

const actionsRemaining = computed(() => {
  if (!routine.value) return 0
  return routine.value.actionsPerTurn - totalActionsUsed.value
})

// Track roll results per action (keyed by action.id)
const actionRolls = reactive<Record<string, {
  attackRoll?: RollResult
  damageRoll?: RollResult
  outcome?: ActionLogEntry['result']
}>>({})

function isUsed(actionId: string): boolean {
  return actionsUsed.value.includes(actionId)
}

function canUseAction(action: ThreatRoutineAction): boolean {
  if (isUsed(action.id)) return false
  return action.actionCost <= actionsRemaining.value
}

function executeAction(action: ThreatRoutineAction) {
  store.useRoutineAction(props.threat.id, action.id)

  // Roll attack if it's an attack action
  if (action.type === 'attack' && action.attackBonus != null) {
    const attackRoll = rollD20(action.attackBonus, action.name, props.threat.name)

    // Determine outcome (attacks need a target AC — we'll log it as success/failure based on nat results only,
    // since GM determines if it hits. We just show the roll.)
    let outcome: ActionLogEntry['result'] = 'success'
    if (attackRoll.isNat20) {
      outcome = 'critical_success'
    } else if (attackRoll.isNat1) {
      outcome = 'critical_failure'
    }

    let damageRoll: RollResult | undefined
    if (action.damage) {
      damageRoll = rollDamage(
        action.damage,
        action.name,
        props.threat.name,
        outcome === 'critical_success'
      )
    }

    actionRolls[action.id] = { attackRoll, damageRoll, outcome }

    // Log with roll breakdown
    let description = attackRoll.breakdown
    if (damageRoll) {
      description += ` | Damage: ${damageRoll.breakdown}`
    }

    store.logAction(
      props.threat.id,
      props.threat.name,
      action.name,
      outcome,
      description
    )
  } else {
    // Non-attack action — log as success (GM narrates the outcome)
    actionRolls[action.id] = { outcome: 'success' }

    store.logAction(
      props.threat.id,
      props.threat.name,
      action.name,
      'success',
      action.description
    )
  }

  emit('execute-action', action)
}

function getTypeIcon(type: ThreatRoutineAction['type']): string {
  switch (type) {
    case 'attack': return '⚔️'
    case 'skill_check': return '🎯'
    case 'ability': return '✨'
    case 'movement': return '➡️'
    default: return '•'
  }
}

function getOutcomeClass(outcome?: ActionLogEntry['result']): string {
  switch (outcome) {
    case 'critical_success': return 'crit-success'
    case 'success': return 'outcome-success'
    case 'failure': return 'outcome-failure'
    case 'critical_failure': return 'crit-failure'
    default: return ''
  }
}
</script>

<template>
  <div v-if="routine" class="routine-display">
    <div class="routine-header">
      <h4 class="routine-title">
        Routine
        <span class="actions-budget">
          ({{ actionsRemaining }} / {{ routine.actionsPerTurn }} actions remaining)
        </span>
      </h4>
    </div>

    <p class="routine-description">{{ routine.description }}</p>

    <div class="actions-list">
      <div
        v-for="action in routine.actions"
        :key="action.id"
        class="action-card"
        :class="{
          used: isUsed(action.id),
          disabled: !canUseAction(action)
        }"
      >
        <div class="action-header">
          <span class="action-type-icon">{{ getTypeIcon(action.type) }}</span>
          <span class="action-name">{{ action.name }}</span>
          <ActionIcon :action="action.actionCost" />
          <span v-if="isUsed(action.id)" class="used-badge">Used</span>
        </div>

        <p class="action-description">{{ action.description }}</p>

        <!-- Attack details -->
        <div v-if="action.type === 'attack'" class="action-stats attack-stats">
          <span class="stat-item">
            <span class="stat-label">Attack</span>
            <span class="stat-value">+{{ action.attackBonus }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">Damage</span>
            <span class="stat-value">{{ action.damage }} {{ action.damageType }}</span>
          </span>
          <span v-if="action.traits?.length" class="traits">
            <span v-for="trait in action.traits" :key="trait" class="trait-tag">
              {{ trait }}
            </span>
          </span>
        </div>

        <!-- Skill check details -->
        <div v-if="action.type === 'skill_check'" class="action-stats check-stats">
          <span class="stat-item">
            <span class="stat-label">Skill</span>
            <span class="stat-value">{{ action.skill }}</span>
          </span>
          <span v-if="action.vsDefense" class="stat-item">
            <span class="stat-label">vs</span>
            <span class="stat-value">{{ action.vsDefense }}</span>
          </span>
          <span v-if="action.dc" class="stat-item">
            <span class="stat-label">DC</span>
            <span class="stat-value">{{ action.dc }}</span>
          </span>
        </div>

        <!-- Ability with DC/damage -->
        <div v-if="action.type === 'ability' && (action.dc || action.damage)" class="action-stats ability-stats">
          <span v-if="action.dc" class="stat-item">
            <span class="stat-label">{{ action.vsDefense || 'DC' }}</span>
            <span class="stat-value">{{ action.dc }}</span>
          </span>
          <span v-if="action.damage" class="stat-item">
            <span class="stat-label">Damage</span>
            <span class="stat-value">{{ action.damage }} {{ action.damageType }}</span>
          </span>
        </div>

        <!-- Effects by outcome -->
        <div class="effects-section" v-if="action.effectOnCriticalSuccess || action.effectOnSuccess || action.effectOnFailure || action.effectOnCriticalFailure">
          <div v-if="action.effectOnCriticalSuccess" class="effect-row crit-success">
            <span class="effect-label">Critical Success:</span>
            <span class="effect-text">{{ action.effectOnCriticalSuccess }}</span>
          </div>
          <div v-if="action.effectOnSuccess" class="effect-row success">
            <span class="effect-label">Success:</span>
            <span class="effect-text">{{ action.effectOnSuccess }}</span>
          </div>
          <div v-if="action.effectOnFailure" class="effect-row failure">
            <span class="effect-label">Failure:</span>
            <span class="effect-text">{{ action.effectOnFailure }}</span>
          </div>
          <div v-if="action.effectOnCriticalFailure" class="effect-row crit-failure">
            <span class="effect-label">Critical Failure:</span>
            <span class="effect-text">{{ action.effectOnCriticalFailure }}</span>
          </div>
        </div>

        <!-- Conditional effects -->
        <div v-if="action.conditionalDamage || action.conditionalEffect" class="conditional-section">
          <span v-if="action.conditionalDamage" class="conditional-item">
            {{ action.conditionalDamage }}
          </span>
          <span v-if="action.conditionalEffect" class="conditional-item">
            {{ action.conditionalEffect }}
          </span>
        </div>

        <!-- Roll result (shown after execution) -->
        <div v-if="actionRolls[action.id]" class="roll-result-inline">
          <div v-if="actionRolls[action.id].attackRoll" class="inline-roll">
            <span class="inline-roll-label">Attack:</span>
            <span class="inline-roll-value" :class="getOutcomeClass(actionRolls[action.id].outcome)">
              {{ actionRolls[action.id].attackRoll!.breakdown }}
            </span>
          </div>
          <div v-if="actionRolls[action.id].damageRoll" class="inline-roll">
            <span class="inline-roll-label">Damage:</span>
            <span class="inline-roll-value damage-value">
              {{ actionRolls[action.id].damageRoll!.total }}
              <span v-if="actionRolls[action.id].damageRoll!.damageType" class="inline-dmg-type">
                {{ actionRolls[action.id].damageRoll!.damageType }}
              </span>
            </span>
          </div>
          <div v-if="!actionRolls[action.id].attackRoll" class="inline-roll">
            <span class="inline-executed-badge">Executed</span>
          </div>
        </div>

        <button
          v-if="!isUsed(action.id)"
          class="execute-btn"
          :class="{ disabled: !canUseAction(action) }"
          :disabled="!canUseAction(action)"
          @click="executeAction(action)"
        >
          Execute{{ action.type === 'attack' ? ' & Roll' : '' }}
        </button>
      </div>
    </div>

    <!-- Variations -->
    <div v-if="routine.variations?.length" class="variations-section">
      <h5 class="variations-title">Variations</h5>
      <div v-for="(variation, idx) in routine.variations" :key="idx" class="variation">
        <span class="variation-trigger">{{ variation.trigger }}:</span>
        <span class="variation-actions">
          {{ variation.actions.map(a => a.name).join(', ') }}
        </span>
      </div>
    </div>

    <!-- Special Abilities -->
    <div v-if="threat.specialAbilities?.length" class="special-abilities">
      <h5 class="abilities-title">Special Abilities</h5>
      <div v-for="ability in threat.specialAbilities" :key="ability.name" class="ability">
        <span class="ability-name">{{ ability.name }}</span>
        <span v-if="ability.trigger" class="ability-trigger">({{ ability.trigger }})</span>
        <p class="ability-description">{{ ability.description }}</p>
      </div>
    </div>
  </div>

  <div v-else class="no-routine">
    <p>No routine defined for this threat.</p>
    <p class="hint">Add a routine in the scene builder to track actions during combat.</p>
  </div>
</template>

<style scoped>
.routine-display {
  padding: 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.routine-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.routine-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.actions-budget {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-dim);
  text-transform: none;
  letter-spacing: 0;
  margin-left: 0.5rem;
}

.routine-description {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-style: italic;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-card {
  padding: 0.625rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.action-card.used {
  opacity: 0.5;
  background: var(--color-bg);
}

.action-card.disabled:not(.used) {
  opacity: 0.7;
}

.action-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.action-header :deep(.action-icon) {
  flex-shrink: 0;
  display: inline-block;
  min-width: 1.5em;
  text-align: center;
  overflow: visible;
}

.action-type-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

.action-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.used-badge {
  padding: 0.125rem 0.375rem;
  background: var(--color-text-muted);
  color: var(--color-bg);
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.action-description {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.action-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.stat-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.stat-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  font-family: 'JetBrains Mono', monospace;
}

.traits {
  display: flex;
  gap: 0.25rem;
}

.trait-tag {
  padding: 0.125rem 0.25rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

.effects-section {
  margin-bottom: 0.5rem;
  padding: 0.375rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.effect-row {
  display: flex;
  gap: 0.375rem;
  font-size: 0.6875rem;
  line-height: 1.4;
  margin-bottom: 0.125rem;
}

.effect-row:last-child {
  margin-bottom: 0;
}

.effect-label {
  font-weight: 600;
  white-space: nowrap;
}

.effect-row.crit-success .effect-label {
  color: var(--color-success);
}

.effect-row.success .effect-label {
  color: var(--color-info);
}

.effect-row.failure .effect-label {
  color: var(--color-warning);
}

.effect-row.crit-failure .effect-label {
  color: var(--color-danger);
}

.effect-text {
  color: var(--color-text-dim);
}

.conditional-section {
  margin-bottom: 0.5rem;
}

.conditional-item {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-warning);
  font-style: italic;
}

/* Inline roll result */
.roll-result-inline {
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: 0.375rem;
}

.inline-roll {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  margin-bottom: 0.125rem;
}

.inline-roll:last-child {
  margin-bottom: 0;
}

.inline-roll-label {
  font-weight: 600;
  color: var(--color-text-dim);
  font-size: 0.625rem;
  text-transform: uppercase;
}

.inline-roll-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-text);
}

.inline-roll-value.crit-success {
  color: #22C55E;
}

.inline-roll-value.outcome-success {
  color: #3B82F6;
}

.inline-roll-value.outcome-failure {
  color: #F97316;
}

.inline-roll-value.crit-failure {
  color: #EF4444;
}

.inline-roll-value.damage-value {
  color: var(--color-danger);
  font-weight: 700;
}

.inline-dmg-type {
  font-size: 0.625rem;
  font-weight: 400;
  color: var(--color-text-dim);
}

.inline-executed-badge {
  padding: 0.125rem 0.5rem;
  background: var(--color-text-muted);
  color: var(--color-bg);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

.execute-btn {
  width: 100%;
  padding: 0.375rem;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.execute-btn:hover:not(.disabled) {
  background: var(--color-accent-hover);
}

.execute-btn.disabled {
  background: var(--color-text-muted);
  cursor: not-allowed;
}

.variations-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.variations-title,
.abilities-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin: 0 0 0.375rem 0;
}

.variation {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.variation-trigger {
  font-weight: 600;
  color: var(--color-warning);
}

.special-abilities {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.ability {
  margin-bottom: 0.5rem;
}

.ability:last-child {
  margin-bottom: 0;
}

.ability-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.ability-trigger {
  font-size: 0.6875rem;
  color: var(--color-warning);
  margin-left: 0.25rem;
}

.ability-description {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  margin: 0.125rem 0 0 0;
  line-height: 1.4;
}

.no-routine {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-dim);
}

.no-routine p {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.no-routine .hint {
  font-size: 0.75rem;
  font-style: italic;
}
</style>
