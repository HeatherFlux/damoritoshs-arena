<script setup lang="ts">
import type { VictoryCondition } from '../../types/starship'

const props = defineProps<{
  victoryCondition: VictoryCondition
  vpRequired?: number
  survivalRounds?: number
  customCondition?: string
  additionalObjectives?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:victoryCondition', value: VictoryCondition): void
  (e: 'update:vpRequired', value: number): void
  (e: 'update:survivalRounds', value: number): void
  (e: 'update:customCondition', value: string): void
  (e: 'update:additionalObjectives', value: string[]): void
}>()

const victoryConditions: { value: VictoryCondition; label: string; description: string }[] = [
  { value: 'defeat', label: 'Defeat All Threats', description: 'Win by defeating all enemy ships and hazards' },
  { value: 'victory_points', label: 'Victory Points', description: 'Accumulate a target number of VP' },
  { value: 'survival', label: 'Survival', description: 'Survive for a number of rounds' },
  { value: 'escape', label: 'Escape', description: 'Escape the encounter area' },
  { value: 'custom', label: 'Custom', description: 'Define a custom victory condition' }
]

function addObjective() {
  const current = props.additionalObjectives ? [...props.additionalObjectives] : []
  current.push('')
  emit('update:additionalObjectives', current)
}

function updateObjective(index: number, value: string) {
  if (!props.additionalObjectives) return
  const updated = [...props.additionalObjectives]
  updated[index] = value
  emit('update:additionalObjectives', updated)
}

function removeObjective(index: number) {
  if (!props.additionalObjectives) return
  const updated = [...props.additionalObjectives]
  updated.splice(index, 1)
  emit('update:additionalObjectives', updated)
}
</script>

<template>
  <div class="victory-editor">
    <h4 class="section-title">Victory Condition</h4>

    <div class="condition-grid">
      <button
        v-for="condition in victoryConditions"
        :key="condition.value"
        class="condition-btn"
        :class="{ active: victoryCondition === condition.value }"
        @click="emit('update:victoryCondition', condition.value)"
      >
        <span class="condition-label">{{ condition.label }}</span>
        <span class="condition-desc">{{ condition.description }}</span>
      </button>
    </div>

    <!-- VP Required -->
    <label v-if="victoryCondition === 'victory_points'" class="form-field mt-1">
      <span>VP Required</span>
      <input
        type="number"
        class="input input-number"
        :value="vpRequired"
        @input="emit('update:vpRequired', parseInt(($event.target as HTMLInputElement).value) || 5)"
        min="1"
      />
    </label>

    <!-- Survival Rounds -->
    <label v-if="victoryCondition === 'survival'" class="form-field mt-1">
      <span>Rounds to Survive</span>
      <input
        type="number"
        class="input input-number"
        :value="survivalRounds"
        @input="emit('update:survivalRounds', parseInt(($event.target as HTMLInputElement).value) || 5)"
        min="1"
      />
    </label>

    <!-- Custom Condition -->
    <label v-if="victoryCondition === 'custom'" class="form-field mt-1">
      <span>Custom Condition</span>
      <input
        type="text"
        class="input"
        :value="customCondition"
        @input="emit('update:customCondition', ($event.target as HTMLInputElement).value)"
        placeholder="Describe the victory condition..."
      />
    </label>

    <!-- Additional Objectives -->
    <div class="objectives-section">
      <h4 class="section-title section-title-sm">Additional Objectives</h4>
      <div class="objectives-list">
        <div
          v-for="(obj, idx) in (additionalObjectives ?? [])"
          :key="idx"
          class="objective-row"
        >
          <input
            type="text"
            class="input objective-input"
            :value="obj"
            @input="updateObjective(idx, ($event.target as HTMLInputElement).value)"
            placeholder="Objective description..."
          />
          <button class="remove-btn" @click="removeObjective(idx)">&times;</button>
        </div>
        <button class="btn btn-secondary add-objective-btn" @click="addObjective">
          + Add Objective
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.victory-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.section-title-sm {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.condition-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .condition-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.condition-btn {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.condition-btn:hover {
  border-color: var(--color-accent);
}

.condition-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.condition-btn.active .condition-label,
.condition-btn.active .condition-desc {
  color: var(--color-bg);
}

.condition-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.condition-desc {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  line-height: 1.3;
}

.mt-1 {
  margin-top: 0.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field span {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.input {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-number {
  text-align: center;
  width: 120px;
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

/* Objectives */
.objectives-section {
  margin-top: 0.75rem;
}

.objectives-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.objective-row {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.objective-input {
  flex: 1;
}

.add-objective-btn {
  width: 100%;
  justify-content: center;
  border-style: dashed;
  font-size: 0.75rem;
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
</style>
