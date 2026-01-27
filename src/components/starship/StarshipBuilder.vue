<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import type { Starship } from '../../types/starship'
import { createDefaultStarship } from '../../types/starship'

const store = useStarshipStore()

// Local editing state
const starship = ref<Starship>(createDefaultStarship())

// Bonuses management
const newBonusKey = ref('')
const newBonusValue = ref(0)

// Initialize from active scene if available
watch(
  () => store.state.activeScene?.starship,
  (sceneShip) => {
    if (sceneShip) {
      starship.value = { ...sceneShip }
    }
  },
  { immediate: true }
)

function updateField<K extends keyof Starship>(field: K, value: Starship[K]) {
  starship.value[field] = value

  // If we have an active scene, update it
  if (store.state.activeScene) {
    store.updateStarship({ [field]: value })
  }
}

function addBonus() {
  if (!newBonusKey.value.trim()) return

  starship.value.bonuses = {
    ...starship.value.bonuses,
    [newBonusKey.value.trim()]: newBonusValue.value
  }

  if (store.state.activeScene) {
    store.updateStarship({ bonuses: starship.value.bonuses })
  }

  newBonusKey.value = ''
  newBonusValue.value = 0
}

function removeBonus(key: string) {
  const { [key]: _, ...rest } = starship.value.bonuses
  starship.value.bonuses = rest

  if (store.state.activeScene) {
    store.updateStarship({ bonuses: starship.value.bonuses })
  }
}

function resetToDefaults() {
  starship.value = createDefaultStarship()
}

// Expose the starship for parent components
defineExpose({
  getStarship: () => starship.value
})
</script>

<template>
  <div class="starship-builder panel">
    <div class="builder-header">
      <h3 class="builder-title">PC Starship</h3>
      <button class="btn btn-secondary btn-sm" @click="resetToDefaults">Reset</button>
    </div>

    <div class="builder-content">
      <!-- Basic Info -->
      <div class="form-section">
        <div class="form-row">
          <label class="form-label">
            <span>Name</span>
            <input
              type="text"
              class="input"
              :value="starship.name"
              @input="updateField('name', ($event.target as HTMLInputElement).value)"
              placeholder="Ship Name"
            />
          </label>
          <label class="form-label form-label-sm">
            <span>Level</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.level"
              @input="updateField('level', parseInt(($event.target as HTMLInputElement).value) || 1)"
              min="1"
              max="20"
            />
          </label>
        </div>
      </div>

      <!-- Defenses -->
      <div class="form-section">
        <h4 class="section-title">Defenses</h4>
        <div class="stat-grid">
          <label class="form-label">
            <span>AC</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.ac"
              @input="updateField('ac', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>
          <label class="form-label">
            <span>Fort</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.fortitude"
              @input="updateField('fortitude', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>
          <label class="form-label">
            <span>Ref</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.reflex"
              @input="updateField('reflex', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>
        </div>
      </div>

      <!-- Shields -->
      <div class="form-section">
        <h4 class="section-title">Shields</h4>
        <div class="stat-grid">
          <label class="form-label">
            <span>Max</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.maxShields"
              @input="updateField('maxShields', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>
          <label class="form-label">
            <span>Current</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.currentShields"
              @input="updateField('currentShields', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
              :max="starship.maxShields"
            />
          </label>
          <label class="form-label">
            <span>Regen</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.shieldRegen"
              @input="updateField('shieldRegen', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>
        </div>
      </div>

      <!-- HP -->
      <div class="form-section">
        <h4 class="section-title">Hull Points</h4>
        <div class="stat-grid stat-grid-2">
          <label class="form-label">
            <span>Max HP</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.maxHP"
              @input="updateField('maxHP', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="1"
            />
          </label>
          <label class="form-label">
            <span>Current HP</span>
            <input
              type="number"
              class="input input-number"
              :value="starship.currentHP"
              @input="updateField('currentHP', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
              :max="starship.maxHP"
            />
          </label>
        </div>
      </div>

      <!-- Bonuses -->
      <div class="form-section">
        <h4 class="section-title">Ship Bonuses</h4>

        <div v-if="Object.keys(starship.bonuses).length > 0" class="bonus-list">
          <div
            v-for="(value, key) in starship.bonuses"
            :key="key"
            class="bonus-item"
          >
            <span class="bonus-name">{{ key }}</span>
            <span class="bonus-value" :class="{ positive: value > 0, negative: value < 0 }">
              {{ value > 0 ? '+' : '' }}{{ value }}
            </span>
            <button class="bonus-remove" @click="removeBonus(key as string)">&times;</button>
          </div>
        </div>

        <div class="add-bonus">
          <input
            type="text"
            class="input"
            v-model="newBonusKey"
            placeholder="Skill name"
            @keyup.enter="addBonus"
          />
          <input
            type="number"
            class="input input-number"
            v-model.number="newBonusValue"
            placeholder="+/-"
          />
          <button class="btn btn-secondary btn-sm" @click="addBonus">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.starship-builder {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: var(--radius-md);
  height: fit-content;
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.builder-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.builder-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.form-label span {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.form-label-sm {
  flex: 0 0 80px;
}

.input {
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-number {
  text-align: center;
  width: 100%;
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

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.stat-grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

/* Bonuses */
.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.bonus-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
}

.bonus-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
}

.bonus-value.positive {
  color: var(--color-success);
}

.bonus-value.negative {
  color: var(--color-danger);
}

.bonus-remove {
  padding: 0 0.25rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.bonus-remove:hover {
  color: var(--color-danger);
}

.add-bonus {
  display: flex;
  gap: 0.5rem;
}

.add-bonus .input:first-child {
  flex: 1;
}

.add-bonus .input-number {
  width: 60px;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}
</style>
