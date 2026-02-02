<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StarshipThreat, ThreatType, ThreatRoutine, TacticalRole } from '../../types/starship'
import ThreatRoutineDisplay from './ThreatRoutineDisplay.vue'
import ThreatRoutineEditor from './ThreatRoutineEditor.vue'

const props = defineProps<{
  threat: StarshipThreat
  editing?: boolean
  isCurrentTurn?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<StarshipThreat>): void
  (e: 'remove'): void
  (e: 'damage', amount: number): void
  (e: 'heal', amount: number): void
  (e: 'toggle-defeated'): void
}>()

// Track expanded state for routine display
const showRoutine = ref(false)

// Track whether routine editor is open in editing mode
const showRoutineEditor = ref(false)

// Summary text for collapsed routine
const routineSummary = computed(() => {
  const routine = props.threat.routine
  if (!routine || !routine.actions.length) return null
  const actionCount = routine.actions.length
  const types = [...new Set(routine.actions.map(a => a.type))]
  return `${routine.actionsPerTurn} actions/turn, ${actionCount} ${actionCount === 1 ? 'ability' : 'abilities'} (${types.join(', ')})`
})

function onRoutineUpdate(routine: ThreatRoutine) {
  emit('update', { routine })
}

function onRoutineEditorClose() {
  showRoutineEditor.value = false
}

const threatTypes: { value: ThreatType; label: string }[] = [
  { value: 'enemy_ship', label: 'Enemy Ship' },
  { value: 'hazard', label: 'Hazard' },
  { value: 'environmental', label: 'Environmental' }
]

const tacticalRoles: { value: TacticalRole; label: string; description: string; color: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Targets the party ship directly', color: 'var(--color-text-dim)' },
  { value: 'complication', label: 'Complication', description: 'Penalizes crew unless addressed', color: 'var(--color-warning)' },
  { value: 'indiscriminate', label: 'Indiscriminate', description: 'Hits everyone equally', color: 'var(--color-info)' }
]

const currentTacticalRole = computed(() => {
  return tacticalRoles.find(r => r.value === props.threat.tacticalRole) ?? tacticalRoles[0]
})

const typeIcon = computed(() => {
  switch (props.threat.type) {
    case 'enemy_ship': return '[X]'
    case 'hazard': return '[!]'
    case 'environmental': return '[~]'
    default: return '[?]'
  }
})

const typeColor = computed(() => {
  switch (props.threat.type) {
    case 'enemy_ship': return 'var(--color-danger)'
    case 'hazard': return 'var(--color-warning)'
    case 'environmental': return 'var(--color-info)'
    default: return 'var(--color-text-dim)'
  }
})

const hpPercent = computed(() => {
  if (!props.threat.maxHP || !props.threat.currentHP) return 100
  return Math.round((props.threat.currentHP / props.threat.maxHP) * 100)
})

const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

function updateField<K extends keyof StarshipThreat>(field: K, value: StarshipThreat[K]) {
  emit('update', { [field]: value })
}
</script>

<template>
  <div
    class="threat-card"
    :class="{
      editing,
      defeated: threat.isDefeated,
      'current-turn': isCurrentTurn
    }"
  >
    <!-- Editing Mode -->
    <template v-if="editing">
      <div class="threat-header">
        <span class="threat-icon" :style="{ color: typeColor }">{{ typeIcon }}</span>
        <input
          type="text"
          class="input threat-name-input"
          :value="threat.name"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
          placeholder="Threat name"
        />
        <button class="remove-btn" @click="emit('remove')">&times;</button>
      </div>

      <div class="threat-fields">
        <label class="field-label">
          <span>Type</span>
          <select
            class="input select"
            :value="threat.type"
            @change="updateField('type', ($event.target as HTMLSelectElement).value as ThreatType)"
          >
            <option v-for="t in threatTypes" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </label>

        <label class="field-label">
          <span>Tactical Role</span>
          <select
            class="input select"
            :value="threat.tacticalRole ?? 'standard'"
            @change="updateField('tacticalRole', ($event.target as HTMLSelectElement).value as TacticalRole)"
          >
            <option v-for="r in tacticalRoles" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </label>

        <label class="field-label">
          <span>Level</span>
          <input
            type="number"
            class="input input-number"
            :value="threat.level"
            @input="updateField('level', parseInt(($event.target as HTMLInputElement).value) || 1)"
            min="1"
            max="20"
          />
        </label>

        <template v-if="threat.type === 'enemy_ship'">
          <label class="field-label">
            <span>Max HP</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.maxHP"
              @input="updateField('maxHP', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="1"
            />
          </label>

          <label class="field-label">
            <span>AC</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.ac"
              @input="updateField('ac', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Fortitude</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.fortitude"
              @input="updateField('fortitude', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Reflex</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.reflex"
              @input="updateField('reflex', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Max Shields</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.maxShields"
              @input="updateField('maxShields', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>

          <label class="field-label">
            <span>Shield Regen</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.shieldRegen"
              @input="updateField('shieldRegen', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>
        </template>
      </div>

      <!-- Initiative Section -->
      <div class="threat-fields initiative-fields">
        <label class="field-label">
          <span>Initiative Skill</span>
          <input
            type="text"
            class="input"
            :value="threat.initiativeSkill"
            @input="updateField('initiativeSkill', ($event.target as HTMLInputElement).value)"
            placeholder="Piloting"
          />
        </label>

        <label class="field-label">
          <span>Initiative Bonus</span>
          <input
            type="number"
            class="input input-number"
            :value="threat.initiativeBonus"
            @input="updateField('initiativeBonus', parseInt(($event.target as HTMLInputElement).value) || 0)"
          />
        </label>
      </div>

      <label class="field-label description-field">
        <span>Description / Abilities</span>
        <textarea
          class="input textarea"
          :value="threat.description"
          @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
          placeholder="Describe abilities, special rules..."
          rows="2"
        ></textarea>
      </label>

      <!-- Routine Editor Integration -->
      <div class="routine-edit-section">
        <button
          v-if="!showRoutineEditor"
          class="edit-routine-btn"
          @click="showRoutineEditor = true"
        >
          {{ threat.routine?.actions?.length ? 'Edit Routine' : '+ Add Routine' }}
        </button>
        <span v-if="!showRoutineEditor && routineSummary" class="routine-summary">
          {{ routineSummary }}
        </span>

        <ThreatRoutineEditor
          v-if="showRoutineEditor"
          :routine="threat.routine"
          @update="onRoutineUpdate"
          @close="onRoutineEditorClose"
        />
      </div>
    </template>

    <!-- Display Mode (during scene run) -->
    <template v-else>
      <div class="threat-header">
        <span class="threat-icon" :style="{ color: typeColor }">{{ typeIcon }}</span>
        <div class="threat-info">
          <span class="threat-name">{{ threat.name }}</span>
          <span class="threat-meta">Level {{ threat.level }} {{ threatTypes.find(t => t.value === threat.type)?.label }}</span>
        </div>
        <span
          v-if="threat.tacticalRole && threat.tacticalRole !== 'standard'"
          class="tactical-badge"
          :style="{ borderColor: currentTacticalRole.color, color: currentTacticalRole.color }"
          :title="currentTacticalRole.description"
        >
          {{ currentTacticalRole.label }}
        </span>
        <div v-if="threat.ac" class="threat-ac">
          <span class="ac-label">AC</span>
          <span class="ac-value">{{ threat.ac }}</span>
        </div>
      </div>

      <!-- HP Bar (for enemy ships) -->
      <div v-if="threat.maxHP" class="hp-section">
        <div class="hp-bar-container">
          <div
            class="hp-bar"
            :style="{ width: hpPercent + '%', background: hpColor }"
          ></div>
        </div>
        <div class="hp-controls">
          <button class="hp-btn damage" @click="emit('damage', 5)">-5</button>
          <span class="hp-text">
            {{ threat.currentHP }} / {{ threat.maxHP }} HP
          </span>
          <button class="hp-btn heal" @click="emit('heal', 5)">+5</button>
        </div>
      </div>

      <!-- Description -->
      <p v-if="threat.description" class="threat-description">
        {{ threat.description }}
      </p>

      <!-- Abilities -->
      <div v-if="threat.abilities?.length" class="threat-abilities">
        <span
          v-for="ability in threat.abilities"
          :key="ability"
          class="ability-tag"
        >
          {{ ability }}
        </span>
      </div>

      <!-- Routine Toggle -->
      <button
        v-if="threat.routine"
        class="routine-toggle-btn"
        :class="{ expanded: showRoutine }"
        @click="showRoutine = !showRoutine"
      >
        {{ showRoutine ? 'Hide Routine' : 'Show Routine' }}
        <span class="toggle-icon">{{ showRoutine ? '▼' : '▶' }}</span>
      </button>

      <!-- Routine Display (expandable) -->
      <ThreatRoutineDisplay
        v-if="showRoutine && threat.routine"
        :threat="threat"
        class="routine-section"
      />

      <!-- Defeat Toggle -->
      <button
        class="defeat-btn"
        :class="{ defeated: threat.isDefeated }"
        @click="emit('toggle-defeated')"
      >
        {{ threat.isDefeated ? 'DEFEATED' : 'Mark Defeated' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.threat-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  transition: all 0.15s ease;
}

.threat-card.editing {
  background: var(--color-bg);
}

.threat-card.defeated {
  opacity: 0.5;
}

.threat-card.current-turn {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
}

.threat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.threat-icon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
}

.threat-name-input {
  flex: 1;
  font-weight: 600;
}

.threat-info {
  flex: 1;
  min-width: 0;
}

.threat-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.threat-meta {
  display: block;
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.threat-ac {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.ac-label {
  font-size: 0.5rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.ac-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Tactical Role Badge */
.tactical-badge {
  padding: 0.125rem 0.375rem;
  border: 1px solid;
  border-radius: var(--radius-sm);
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: help;
}

.remove-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.remove-btn:hover {
  color: var(--color-danger);
}

/* Editing Fields */
.threat-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.field-label span {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.description-field {
  grid-column: 1 / -1;
}

.input {
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.8125rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-number {
  text-align: center;
}

.select {
  cursor: pointer;
}

.textarea {
  resize: vertical;
  min-height: 40px;
  font-family: inherit;
}

/* Hide number input spinners */
.input-number::-webkit-inner-spin-button,
.input-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-number {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* HP Section */
.hp-section {
  margin: 0.5rem 0;
}

.hp-bar-container {
  height: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.375rem;
}

.hp-bar {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
}

.hp-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.hp-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hp-btn.damage:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.hp-btn.heal:hover {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.hp-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--color-text);
}

/* Description & Abilities */
.threat-description {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  line-height: 1.4;
  margin: 0.5rem 0;
}

.threat-abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.5rem 0;
}

.ability-tag {
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

/* Defeat Button */
.defeat-btn {
  width: 100%;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.defeat-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.defeat-btn.defeated {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

/* Routine Toggle */
.routine-toggle-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 0.5rem;
}

.routine-toggle-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.routine-toggle-btn.expanded {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toggle-icon {
  font-size: 0.5rem;
  transition: transform 0.15s ease;
}

.routine-section {
  margin-bottom: 0.5rem;
}

/* Initiative fields */
.initiative-fields {
  margin-top: 0.5rem;
}

/* Routine edit section */
.routine-edit-section {
  margin-top: 0.5rem;
}

.edit-routine-btn {
  width: 100%;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-routine-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  border-style: solid;
}

.routine-summary {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
}
</style>
