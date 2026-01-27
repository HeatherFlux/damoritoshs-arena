<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import type { SavedScene, StarshipThreat, VictoryCondition } from '../../types/starship'
import { createEmptySavedScene, createDefaultThreat, createDefaultStarship } from '../../types/starship'
import ThreatCard from './ThreatCard.vue'

const emit = defineEmits<{
  (e: 'start-scene'): void
}>()

const store = useStarshipStore()

// Local scene state
const scene = ref<SavedScene>(createEmptySavedScene())


// Victory condition options
const victoryConditions: { value: VictoryCondition; label: string; description: string }[] = [
  { value: 'defeat', label: 'Defeat All Threats', description: 'Win by defeating all enemy ships and hazards' },
  { value: 'victory_points', label: 'Victory Points', description: 'Accumulate a target number of VP' },
  { value: 'survival', label: 'Survival', description: 'Survive for a number of rounds' },
  { value: 'escape', label: 'Escape', description: 'Escape the encounter area' },
  { value: 'custom', label: 'Custom', description: 'Define a custom victory condition' }
]

// Watch for active scene changes and populate editor
watch(
  () => store.state.activeScene,
  (activeScene) => {
    if (activeScene) {
      // Convert active scene to saved scene format for editing
      scene.value = {
        id: activeScene.id,
        name: activeScene.name,
        level: activeScene.level,
        description: activeScene.description,
        victoryCondition: activeScene.victoryCondition,
        vpRequired: activeScene.vpRequired,
        survivalRounds: activeScene.survivalRounds,
        customCondition: activeScene.customCondition,
        starship: { ...activeScene.starship },
        threats: activeScene.threats.map(t => ({ ...t })),
        roles: [...activeScene.roles],
        savedAt: Date.now()
      }
    }
  },
  { immediate: true }
)

function updateField<K extends keyof SavedScene>(field: K, value: SavedScene[K]) {
  scene.value[field] = value
}

// Threat management
function addThreat() {
  scene.value.threats.push(createDefaultThreat())
}

function updateThreat(index: number, updates: Partial<StarshipThreat>) {
  scene.value.threats[index] = { ...scene.value.threats[index], ...updates }
}

function removeThreat(index: number) {
  scene.value.threats.splice(index, 1)
}

// XP Calculation (reuse creature XP formula)
const CREATURE_XP_BY_LEVEL_DIFF: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  [0]: 40,
  [1]: 60,
  [2]: 80,
  [3]: 120,
  [4]: 160,
}

function getThreatXP(threatLevel: number, partyLevel: number): number {
  const diff = Math.max(-4, Math.min(4, threatLevel - partyLevel))
  return CREATURE_XP_BY_LEVEL_DIFF[diff] ?? 40
}

const totalXP = computed(() => {
  const partyLevel = scene.value.level
  return scene.value.threats.reduce((sum, threat) => {
    return sum + getThreatXP(threat.level, partyLevel)
  }, 0)
})

const difficulty = computed(() => {
  const xp = totalXP.value
  if (xp >= 160) return { label: 'Extreme', color: 'var(--color-danger)' }
  if (xp >= 120) return { label: 'Severe', color: 'var(--color-warning)' }
  if (xp >= 80) return { label: 'Moderate', color: 'var(--color-success)' }
  if (xp >= 60) return { label: 'Low', color: 'var(--color-info)' }
  return { label: 'Trivial', color: 'var(--color-text-dim)' }
})

// Save and Start
function saveScene() {
  // Get the starship from builder component if available
  // For now, use the scene's starship or create default
  if (!scene.value.starship.name || scene.value.starship.name === 'New Starship') {
    scene.value.starship = createDefaultStarship()
    scene.value.starship.name = scene.value.name + "'s Ship"
  }

  store.saveScene(scene.value)
}

function startScene() {
  // Save first
  saveScene()

  // Find the saved scene and start it
  const saved = store.state.savedScenes.find(s => s.id === scene.value.id)
  if (saved) {
    store.startScene(saved)
    emit('start-scene')
  }
}

function resetScene() {
  scene.value = createEmptySavedScene()
}
</script>

<template>
  <div class="scene-builder panel">
    <div class="builder-header">
      <h3 class="builder-title">Scene Builder</h3>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="resetScene">Reset</button>
        <button class="btn btn-secondary btn-sm" @click="saveScene">Save</button>
        <button class="btn btn-primary btn-sm" @click="startScene">Start Scene</button>
      </div>
    </div>

    <div class="builder-content">
      <!-- Basic Info -->
      <div class="form-section">
        <div class="form-row">
          <label class="form-label">
            <span>Scene Name</span>
            <input
              type="text"
              class="input"
              :value="scene.name"
              @input="updateField('name', ($event.target as HTMLInputElement).value)"
              placeholder="Scene Name"
            />
          </label>
          <label class="form-label form-label-sm">
            <span>Level</span>
            <input
              type="number"
              class="input input-number"
              :value="scene.level"
              @input="updateField('level', parseInt(($event.target as HTMLInputElement).value) || 1)"
              min="1"
              max="20"
            />
          </label>
        </div>

        <label class="form-label">
          <span>Description</span>
          <textarea
            class="input textarea"
            :value="scene.description"
            @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Describe the scene setup..."
            rows="3"
          ></textarea>
        </label>
      </div>

      <!-- Victory Condition -->
      <div class="form-section">
        <h4 class="section-title">Victory Condition</h4>

        <div class="condition-grid">
          <button
            v-for="condition in victoryConditions"
            :key="condition.value"
            class="condition-btn"
            :class="{ active: scene.victoryCondition === condition.value }"
            @click="updateField('victoryCondition', condition.value)"
          >
            <span class="condition-label">{{ condition.label }}</span>
            <span class="condition-desc">{{ condition.description }}</span>
          </button>
        </div>

        <!-- VP Required -->
        <label v-if="scene.victoryCondition === 'victory_points'" class="form-label mt-1">
          <span>VP Required</span>
          <input
            type="number"
            class="input input-number"
            :value="scene.vpRequired"
            @input="updateField('vpRequired', parseInt(($event.target as HTMLInputElement).value) || 5)"
            min="1"
          />
        </label>

        <!-- Survival Rounds -->
        <label v-if="scene.victoryCondition === 'survival'" class="form-label mt-1">
          <span>Rounds to Survive</span>
          <input
            type="number"
            class="input input-number"
            :value="scene.survivalRounds"
            @input="updateField('survivalRounds', parseInt(($event.target as HTMLInputElement).value) || 5)"
            min="1"
          />
        </label>

        <!-- Custom Condition -->
        <label v-if="scene.victoryCondition === 'custom'" class="form-label mt-1">
          <span>Custom Condition</span>
          <input
            type="text"
            class="input"
            :value="scene.customCondition"
            @input="updateField('customCondition', ($event.target as HTMLInputElement).value)"
            placeholder="Describe the victory condition..."
          />
        </label>
      </div>

      <!-- Threats -->
      <div class="form-section">
        <div class="section-header">
          <h4 class="section-title">Threats</h4>
          <div class="xp-display">
            <span class="xp-label">XP:</span>
            <span class="xp-value">{{ totalXP }}</span>
            <span class="difficulty-badge" :style="{ background: difficulty.color }">
              {{ difficulty.label }}
            </span>
          </div>
        </div>

        <div class="threats-list">
          <ThreatCard
            v-for="(threat, index) in scene.threats"
            :key="threat.id"
            :threat="threat"
            :editing="true"
            @update="(updates) => updateThreat(index, updates)"
            @remove="removeThreat(index)"
          />

          <button class="btn btn-secondary add-threat-btn" @click="addThreat">
            + Add Threat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-builder {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: var(--radius-md);
  overflow: auto;
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.builder-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.builder-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.textarea {
  resize: vertical;
  min-height: 60px;
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

.mt-1 {
  margin-top: 0.5rem;
}

/* Victory Conditions */
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

/* XP Display */
.xp-display {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.xp-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.xp-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.difficulty-badge {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  color: var(--color-bg);
}

/* Threats List */
.threats-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-threat-btn {
  width: 100%;
  justify-content: center;
  border-style: dashed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}
</style>
