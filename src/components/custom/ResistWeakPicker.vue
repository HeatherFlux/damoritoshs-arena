<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string // "Resistances" or "Weaknesses"
  levelSuggestion?: { min: number; max: number } // Suggested value range from GM Core table
}>()

const model = defineModel<string[]>({ default: () => [] })

const isOpen = ref(false)
const customType = ref('')
const customValue = ref(5)

// Damage types from GM Core
const damageTypes = {
  energy: {
    label: 'Energy',
    items: ['acid', 'cold', 'electricity', 'fire', 'sonic']
  },
  physical: {
    label: 'Physical',
    items: ['bludgeoning', 'piercing', 'slashing', 'physical']
  },
  alignment: {
    label: 'Alignment',
    items: ['holy', 'unholy']
  },
  other: {
    label: 'Other',
    items: ['force', 'mental', 'poison', 'precision', 'spirit', 'vitality', 'void']
  },
  materials: {
    label: 'Material Exceptions',
    items: ['cold iron', 'silver', 'adamantine', 'orichalcum']
  }
}

// Parse existing entries to check selection
function parseEntry(entry: string): { type: string; value: number; exception?: string } | null {
  // Match patterns like "fire 5" or "physical 10 (except silver)"
  const match = entry.match(/^(.+?)\s+(\d+)(?:\s*\(except\s+(.+?)\))?$/i)
  if (match) {
    return { type: match[1].toLowerCase(), value: parseInt(match[2]), exception: match[3] }
  }
  return null
}

function getTypeValue(type: string): number | null {
  for (const entry of model.value) {
    const parsed = parseEntry(entry)
    if (parsed && parsed.type === type.toLowerCase()) {
      return parsed.value
    }
  }
  return null
}

function isSelected(type: string): boolean {
  return getTypeValue(type) !== null
}

function toggleType(type: string) {
  const existing = getTypeValue(type)
  if (existing !== null) {
    // Remove it
    model.value = model.value.filter(entry => {
      const parsed = parseEntry(entry)
      return !parsed || parsed.type !== type.toLowerCase()
    })
  } else {
    // Add with default value
    const defaultValue = props.levelSuggestion
      ? Math.round((props.levelSuggestion.min + props.levelSuggestion.max) / 2)
      : 5
    model.value = [...model.value, `${type} ${defaultValue}`]
  }
}

function updateValue(type: string, newValue: number) {
  model.value = model.value.map(entry => {
    const parsed = parseEntry(entry)
    if (parsed && parsed.type === type.toLowerCase()) {
      if (parsed.exception) {
        return `${type} ${newValue} (except ${parsed.exception})`
      }
      return `${type} ${newValue}`
    }
    return entry
  })
}

function removeEntry(entry: string) {
  model.value = model.value.filter(e => e !== entry)
}

function addCustom() {
  const type = customType.value.trim()
  if (type && customValue.value > 0) {
    const entry = `${type} ${customValue.value}`
    if (!model.value.includes(entry)) {
      model.value = [...model.value, entry]
    }
  }
  customType.value = ''
  customValue.value = props.levelSuggestion
    ? Math.round((props.levelSuggestion.min + props.levelSuggestion.max) / 2)
    : 5
}

// Format for display
function formatEntry(entry: string): { type: string; value: string } {
  const parsed = parseEntry(entry)
  if (parsed) {
    return {
      type: parsed.type,
      value: parsed.exception ? `${parsed.value} (except ${parsed.exception})` : String(parsed.value)
    }
  }
  return { type: entry, value: '' }
}
</script>

<template>
  <div class="picker">
    <!-- Selected items display -->
    <div class="selected-items" @click="isOpen = true">
      <span
        v-for="entry in model"
        :key="entry"
        class="item-chip selected"
        @click.stop="removeEntry(entry)"
      >
        <span class="entry-type">{{ formatEntry(entry).type }}</span>
        <span class="entry-value">{{ formatEntry(entry).value }}</span>
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
            <span class="popover-title">Select {{ label }}</span>
            <button type="button" class="btn-close" @click="isOpen = false">×</button>
          </div>

          <div class="popover-body">
            <!-- Suggestion hint -->
            <div v-if="levelSuggestion" class="suggestion-hint">
              Suggested range: {{ levelSuggestion.min }}–{{ levelSuggestion.max }}
            </div>

            <div
              v-for="(category, key) in damageTypes"
              :key="key"
              class="item-category"
            >
              <div class="category-label">{{ category.label }}</div>
              <div class="type-list">
                <div
                  v-for="type in category.items"
                  :key="type"
                  class="type-row"
                  :class="{ selected: isSelected(type) }"
                >
                  <button
                    type="button"
                    class="type-toggle"
                    :class="{ active: isSelected(type) }"
                    @click="toggleType(type)"
                  >
                    <span class="toggle-check">{{ isSelected(type) ? '✓' : '' }}</span>
                    {{ type }}
                  </button>
                  <input
                    v-if="isSelected(type)"
                    type="number"
                    class="value-input"
                    :value="getTypeValue(type)"
                    min="1"
                    max="30"
                    @input="updateValue(type, parseInt(($event.target as HTMLInputElement).value) || 1)"
                  />
                </div>
              </div>
            </div>

            <!-- Custom input -->
            <div class="item-category">
              <div class="category-label">Custom</div>
              <div class="custom-row">
                <input
                  v-model="customType"
                  type="text"
                  class="input input-sm flex-1"
                  placeholder="Type name..."
                />
                <input
                  v-model.number="customValue"
                  type="number"
                  class="input input-sm value-input"
                  min="1"
                  max="30"
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="!customType.trim()"
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

.item-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
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

.item-chip:hover {
  opacity: 0.9;
}

.entry-type {
  font-weight: 600;
}

.entry-value {
  opacity: 0.9;
}

.item-chip .remove {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.7;
  margin-left: 0.125rem;
}

.item-chip .remove:hover {
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
  max-width: 400px;
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
  text-align: center;
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

.type-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-toggle {
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

.type-toggle:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.type-toggle.active {
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
