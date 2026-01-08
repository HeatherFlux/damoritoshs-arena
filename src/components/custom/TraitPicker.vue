<script setup lang="ts">
import { ref, computed } from 'vue'

const model = defineModel<string[]>({ default: () => [] })

const isOpen = ref(false)
const customTrait = ref('')

// Trait categories - includes SF2e and PF2e creature types
const traitCategories = {
  type: {
    label: 'Creature Type',
    exclusive: true, // Only one from this category
    traits: [
      'Aberration', 'Animal', 'Astral', 'Beast', 'Celestial', 'Construct',
      'Dragon', 'Elemental', 'Ethereal', 'Fey', 'Fiend', 'Fungus', 'Giant',
      'Humanoid', 'Monitor', 'Ooze', 'Plant', 'Spirit', 'Undead'
    ]
  },
  subtype: {
    label: 'Subtype',
    exclusive: false,
    traits: [
      'Robot', 'Android', 'Spectra', 'Drift', 'Cosmic',
      'Air', 'Earth', 'Fire', 'Metal', 'Water', 'Wood',
      'Aeon', 'Angel', 'Archon', 'Azata', 'Daemon', 'Demon', 'Devil',
      'Inevitable', 'Protean', 'Psychopomp', 'Qlippoth'
    ]
  },
  rarity: {
    label: 'Rarity',
    exclusive: true,
    traits: ['Uncommon', 'Rare', 'Unique']
  },
  alignment: {
    label: 'Alignment',
    exclusive: false,
    traits: ['Chaotic', 'Evil', 'Good', 'Lawful']
  },
  tech: {
    label: 'Tech/Magic',
    exclusive: false,
    traits: ['Tech', 'Magical']
  },
  other: {
    label: 'Other',
    exclusive: false,
    traits: [
      'Amphibious', 'Aquatic', 'Incorporeal', 'Mindless', 'Swarm',
      'Unholy', 'Holy', 'Void', 'Vitality'
    ]
  }
}

function isSelected(trait: string): boolean {
  return model.value.includes(trait)
}

function toggleTrait(trait: string, category: keyof typeof traitCategories) {
  const current = [...model.value]
  const index = current.indexOf(trait)

  if (index >= 0) {
    // Remove trait
    current.splice(index, 1)
  } else {
    // If exclusive category, remove other traits from same category first
    if (traitCategories[category].exclusive) {
      const categoryTraits = traitCategories[category].traits
      for (const t of categoryTraits) {
        const i = current.indexOf(t)
        if (i >= 0) current.splice(i, 1)
      }
    }
    current.push(trait)
  }

  model.value = current
}

function removeTrait(trait: string) {
  model.value = model.value.filter(t => t !== trait)
}

function addCustomTrait() {
  const trait = customTrait.value.trim()
  if (trait && !model.value.includes(trait)) {
    model.value = [...model.value, trait]
  }
  customTrait.value = ''
}

// Check if a trait is a known trait (in any category)
const knownTraits = computed(() => {
  const all = new Set<string>()
  for (const cat of Object.values(traitCategories)) {
    for (const t of cat.traits) all.add(t)
  }
  return all
})

const customTraits = computed(() => {
  return model.value.filter(t => !knownTraits.value.has(t))
})
</script>

<template>
  <div class="trait-picker">
    <!-- Selected traits display -->
    <div class="selected-traits" @click="isOpen = true">
      <span
        v-for="trait in model"
        :key="trait"
        class="trait-chip selected"
        @click.stop="removeTrait(trait)"
      >
        {{ trait }}
        <span class="remove">×</span>
      </span>
      <button type="button" class="add-traits-btn">
        + Traits
      </button>
    </div>

    <!-- Popover -->
    <Teleport to="body">
      <div v-if="isOpen" class="trait-popover-overlay" @click="isOpen = false">
        <div class="trait-popover" @click.stop>
          <div class="popover-header">
            <span class="popover-title">Select Traits</span>
            <button type="button" class="btn-close" @click="isOpen = false">×</button>
          </div>

          <div class="popover-body">
            <div
              v-for="(category, key) in traitCategories"
              :key="key"
              class="trait-category"
            >
              <div class="category-label">
                {{ category.label }}
                <span v-if="category.exclusive" class="exclusive-hint">(pick one)</span>
              </div>
              <div class="trait-grid">
                <button
                  v-for="trait in category.traits"
                  :key="trait"
                  type="button"
                  class="trait-chip"
                  :class="{ selected: isSelected(trait) }"
                  @click="toggleTrait(trait, key)"
                >
                  {{ trait }}
                </button>
              </div>
            </div>

            <!-- Custom trait input -->
            <div class="trait-category">
              <div class="category-label">Custom</div>
              <div class="custom-input-row">
                <input
                  v-model="customTrait"
                  type="text"
                  class="input input-sm"
                  placeholder="Add custom trait..."
                  @keydown.enter.prevent="addCustomTrait"
                />
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="!customTrait.trim()"
                  @click="addCustomTrait"
                >
                  Add
                </button>
              </div>
              <div v-if="customTraits.length" class="trait-grid" style="margin-top: 0.5rem;">
                <span
                  v-for="trait in customTraits"
                  :key="trait"
                  class="trait-chip selected"
                  @click="removeTrait(trait)"
                >
                  {{ trait }}
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
.trait-picker {
  position: relative;
}

.selected-traits {
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

.selected-traits:hover {
  border-color: var(--color-accent);
}

.add-traits-btn {
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

.add-traits-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.trait-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-dim);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.trait-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.trait-chip.selected {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
}

.trait-chip .remove {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.7;
}

.trait-chip .remove:hover {
  opacity: 1;
}

/* Popover overlay */
.trait-popover-overlay {
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

.trait-popover {
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
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  transition: all 0.15s ease;
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

.trait-category {
  margin-bottom: 1rem;
}

.trait-category:last-child {
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

.exclusive-hint {
  font-weight: 400;
  font-style: italic;
  text-transform: none;
  letter-spacing: normal;
  opacity: 0.7;
}

.trait-grid {
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
