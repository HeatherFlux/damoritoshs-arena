<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  levelSuggestion?: { low: number; moderate: number; high: number; extreme: number }
}>()

const model = defineModel<Record<string, number>>({ default: () => ({}) })

const isOpen = ref(false)
const customSkillName = ref('')
const customSkillValue = ref(0)

// Core skills from PF2e/SF2e
const coreSkills = [
  'Acrobatics', 'Arcana', 'Athletics', 'Computers', 'Crafting',
  'Deception', 'Diplomacy', 'Engineering', 'Intimidation', 'Life Science',
  'Medicine', 'Nature', 'Occultism', 'Performance', 'Physical Science',
  'Piloting', 'Religion', 'Society', 'Stealth', 'Survival', 'Thievery'
]

// Get skills as array for display
const skillEntries = computed(() => {
  return Object.entries(model.value).map(([name, bonus]) => ({ name, bonus }))
})

function isSelected(skill: string): boolean {
  return skill in model.value
}

function getSkillValue(skill: string): number {
  return model.value[skill] ?? 0
}

function toggleSkill(skill: string) {
  const current = { ...model.value }
  if (skill in current) {
    delete current[skill]
  } else {
    // Add with moderate default value
    const defaultValue = props.levelSuggestion?.moderate ?? 5
    current[skill] = defaultValue
  }
  model.value = current
}

function updateValue(skill: string, newValue: number) {
  model.value = { ...model.value, [skill]: newValue }
}

function removeSkill(skill: string) {
  const current = { ...model.value }
  delete current[skill]
  model.value = current
}

function addCustom() {
  const name = customSkillName.value.trim()
  if (name && !(name in model.value)) {
    model.value = { ...model.value, [name]: customSkillValue.value }
  }
  customSkillName.value = ''
  customSkillValue.value = props.levelSuggestion?.moderate ?? 5
}

// Check if a skill is a known core skill
const customSkills = computed(() => {
  const coreSet = new Set(coreSkills)
  return Object.keys(model.value).filter(skill => !coreSet.has(skill))
})

// Format bonus for display
function formatBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : String(bonus)
}
</script>

<template>
  <div class="picker">
    <!-- Selected skills display -->
    <div class="selected-items" @click="isOpen = true">
      <span
        v-for="entry in skillEntries"
        :key="entry.name"
        class="skill-chip selected"
        @click.stop="removeSkill(entry.name)"
      >
        <span class="skill-name">{{ entry.name }}</span>
        <span class="skill-bonus">{{ formatBonus(entry.bonus) }}</span>
        <span class="remove">×</span>
      </span>
      <button type="button" class="add-btn">
        + Add
      </button>
    </div>

    <!-- Popover -->
    <Teleport to="body">
      <div v-if="isOpen" class="picker-overlay" @click="isOpen = false">
        <div class="picker-popover" @click.stop>
          <div class="popover-header">
            <span class="popover-title">Select Skills</span>
            <button type="button" class="btn-close" @click="isOpen = false">×</button>
          </div>

          <div class="popover-body">
            <!-- Suggestion hint -->
            <div v-if="levelSuggestion" class="suggestion-hint">
              <span class="hint-label">Suggested bonuses:</span>
              <span class="hint-item">Low +{{ levelSuggestion.low }}</span>
              <span class="hint-item">Mod +{{ levelSuggestion.moderate }}</span>
              <span class="hint-item">High +{{ levelSuggestion.high }}</span>
              <span class="hint-item">Extreme +{{ levelSuggestion.extreme }}</span>
            </div>

            <div class="item-category">
              <div class="category-label">Core Skills</div>
              <div class="skill-list">
                <div
                  v-for="skill in coreSkills"
                  :key="skill"
                  class="skill-row"
                  :class="{ selected: isSelected(skill) }"
                >
                  <button
                    type="button"
                    class="skill-toggle"
                    :class="{ active: isSelected(skill) }"
                    @click="toggleSkill(skill)"
                  >
                    <span class="toggle-check">{{ isSelected(skill) ? '✓' : '' }}</span>
                    {{ skill }}
                  </button>
                  <input
                    v-if="isSelected(skill)"
                    type="number"
                    class="value-input"
                    :value="getSkillValue(skill)"
                    @input="updateValue(skill, parseInt(($event.target as HTMLInputElement).value) || 0)"
                  />
                </div>
              </div>
            </div>

            <!-- Custom skills -->
            <div v-if="customSkills.length" class="item-category">
              <div class="category-label">Custom Skills</div>
              <div class="skill-list">
                <div
                  v-for="skill in customSkills"
                  :key="skill"
                  class="skill-row selected"
                >
                  <button
                    type="button"
                    class="skill-toggle active"
                    @click="removeSkill(skill)"
                  >
                    <span class="toggle-check">✓</span>
                    {{ skill }}
                  </button>
                  <input
                    type="number"
                    class="value-input"
                    :value="getSkillValue(skill)"
                    @input="updateValue(skill, parseInt(($event.target as HTMLInputElement).value) || 0)"
                  />
                </div>
              </div>
            </div>

            <!-- Add custom -->
            <div class="item-category">
              <div class="category-label">Add Custom Skill</div>
              <div class="custom-row">
                <input
                  v-model="customSkillName"
                  type="text"
                  class="input input-sm flex-1"
                  placeholder="Skill name..."
                />
                <input
                  v-model.number="customSkillValue"
                  type="number"
                  class="input input-sm value-input"
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="!customSkillName.trim()"
                  @click="addCustom"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div class="popover-footer">
            <button type="button" class="btn btn-primary btn-sm" @click="isOpen = false">
              Done
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
}

.selected-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem;
  min-height: 2.25rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.selected-items:hover {
  border-color: var(--color-accent);
}

.add-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-dim);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-bg);
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.skill-chip:hover {
  opacity: 0.9;
}

.skill-name {
  font-weight: 600;
}

.skill-bonus {
  font-family: var(--font-mono);
  opacity: 0.9;
}

.skill-chip .remove {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.7;
  margin-left: 0.125rem;
}

.skill-chip .remove:hover {
  opacity: 1;
}

/* Popover */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.15s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.picker-popover {
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: slide-up 0.2s ease;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.popover-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.btn-close {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-close:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.popover-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.suggestion-hint {
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.hint-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hint-item {
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.item-category {
  margin-bottom: 1rem;
}

.item-category:last-child {
  margin-bottom: 0;
}

.category-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.skill-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.skill-toggle:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.skill-toggle.active {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toggle-check {
  width: 1rem;
  text-align: center;
  font-weight: bold;
}

.value-input {
  width: 3.5rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  text-align: center;
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  color: var(--color-text);
  -moz-appearance: textfield;
  appearance: textfield;
}

.value-input::-webkit-outer-spin-button,
.value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.custom-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

.popover-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
