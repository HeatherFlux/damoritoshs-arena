<script setup lang="ts">
import { ref, computed } from 'vue'

const model = defineModel<string[]>({ default: () => [] })

const isOpen = ref(false)
const customTrait = ref('')

// Ability trait categories from PF2e/SF2e
const traitCategories = {
  action: {
    label: 'Action Types',
    items: [
      'attack', 'concentrate', 'manipulate', 'move',
      'flourish', 'press', 'open'
    ]
  },
  area: {
    label: 'Area & Aura',
    items: [
      'aura', 'emanation', 'burst', 'cone', 'line',
      'visual', 'auditory', 'olfactory'
    ]
  },
  mental: {
    label: 'Mental & Emotional',
    items: [
      'mental', 'emotion', 'fear', 'linguistic',
      'incapacitation', 'sleep', 'confusion'
    ]
  },
  magic: {
    label: 'Magic & Tradition',
    items: [
      'magical', 'arcane', 'divine', 'occult', 'primal',
      'enchantment', 'evocation', 'illusion', 'necromancy',
      'transmutation', 'abjuration', 'conjuration', 'divination'
    ]
  },
  tech: {
    label: 'Tech & Science',
    items: [
      'tech', 'radiation', 'disease', 'poison',
      'electricity', 'sonic'
    ]
  },
  damage: {
    label: 'Damage & Healing',
    items: [
      'acid', 'cold', 'fire', 'force',
      'vitality', 'void', 'spirit',
      'healing', 'death'
    ]
  },
  special: {
    label: 'Special',
    items: [
      'curse', 'fortune', 'misfortune', 'prediction',
      'polymorph', 'morph', 'possession',
      'teleportation', 'extradimensional'
    ]
  }
}

function isSelected(item: string): boolean {
  return model.value.includes(item)
}

function toggleItem(item: string) {
  const current = [...model.value]
  const index = current.indexOf(item)

  if (index >= 0) {
    current.splice(index, 1)
  } else {
    current.push(item)
  }

  model.value = current
}

function removeItem(item: string) {
  model.value = model.value.filter(i => i !== item)
}

function addCustom() {
  const item = customTrait.value.trim()
  if (item && !model.value.includes(item)) {
    model.value = [...model.value, item]
  }
  customTrait.value = ''
}

// Check if an item is known
const knownItems = computed(() => {
  const all = new Set<string>()
  for (const cat of Object.values(traitCategories)) {
    for (const item of cat.items) all.add(item)
  }
  return all
})

const customItems = computed(() => {
  return model.value.filter(item => !knownItems.value.has(item))
})
</script>

<template>
  <div class="picker">
    <!-- Selected items display -->
    <div class="selected-items" @click="isOpen = true">
      <span
        v-for="item in model"
        :key="item"
        class="item-chip selected"
        @click.stop="removeItem(item)"
      >
        {{ item }}
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
            <span class="popover-title">Select Ability Traits</span>
            <button type="button" class="btn-close" @click="isOpen = false">×</button>
          </div>

          <div class="popover-body">
            <div
              v-for="(category, key) in traitCategories"
              :key="key"
              class="item-category"
            >
              <div class="category-label">{{ category.label }}</div>
              <div class="item-grid">
                <button
                  v-for="item in category.items"
                  :key="item"
                  type="button"
                  class="item-chip"
                  :class="{ selected: isSelected(item) }"
                  @click="toggleItem(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>

            <!-- Custom input -->
            <div class="item-category">
              <div class="category-label">Custom</div>
              <div class="custom-input-row">
                <input
                  v-model="customTrait"
                  type="text"
                  class="input input-sm"
                  placeholder="Add custom trait..."
                  @keydown.enter.prevent="addCustom"
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="!customTrait.trim()"
                  @click="addCustom"
                >
                  Add
                </button>
              </div>
              <div v-if="customItems.length" class="item-grid" style="margin-top: 0.5rem;">
                <span
                  v-for="item in customItems"
                  :key="item"
                  class="item-chip selected"
                  @click="removeItem(item)"
                >
                  {{ item }}
                  <span class="remove">×</span>
                </span>
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
  color: var(--color-text-dim);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.item-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.item-chip.selected {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
}

.item-chip .remove {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.7;
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
  max-width: 520px;
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

.item-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.custom-input-row {
  display: flex;
  gap: 0.5rem;
}

.custom-input-row .input {
  flex: 1;
}

.popover-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
