<script setup lang="ts">
import { ref, computed } from 'vue'
import CreatureForm from './CreatureForm.vue'
import HazardForm from './HazardForm.vue'
import StatBlockPreview from './StatBlockPreview.vue'
import AsciiBackground from './AsciiBackground.vue'
import { useEncounterStore } from '../../stores/encounterStore'
import type { Creature } from '../../types/creature'
import type { Hazard } from '../../types/hazard'

const encounterStore = useEncounterStore()

type BuildMode = 'creature' | 'hazard'
const buildMode = ref<BuildMode>('creature')

// Success message
const showSuccess = ref(false)
const successMessage = ref('')

// Form state for creature
const creatureData = ref<Partial<Creature>>({
  name: '',
  level: 1,
  size: 'medium',
  traits: [],
  source: 'Custom',
  perception: 0,
  senses: [],
  languages: [],
  skills: {},
  abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ac: 15,
  saves: { fort: 0, ref: 0, will: 0 },
  hp: 15,
  immunities: [],
  resistances: [],
  weaknesses: [],
  speed: '25 feet',
  attacks: [],
  specialAbilities: [],
})

// Form state for hazard
const hazardData = ref<Partial<Hazard>>({
  name: '',
  level: 1,
  complexity: 'simple',
  type: 'trap',
  traits: [],
  source: 'Custom',
  description: '',
  actions: [],
  saves: { fortitude: undefined, reflex: undefined, will: undefined },
  immunities: [],
})

// Show export modal
const showExportModal = ref(false)

// Computed JSON for export
const exportJson = computed(() => {
  if (buildMode.value === 'creature') {
    return JSON.stringify(creatureData.value, null, 2)
  }
  return JSON.stringify(hazardData.value, null, 2)
})

function copyToClipboard() {
  navigator.clipboard.writeText(exportJson.value)
}

// Check if form is valid for adding
const canAdd = computed(() => {
  if (buildMode.value === 'creature') {
    return creatureData.value.name?.trim() &&
           creatureData.value.level !== undefined &&
           creatureData.value.hp !== undefined &&
           creatureData.value.ac !== undefined
  } else {
    return hazardData.value.name?.trim() &&
           hazardData.value.level !== undefined &&
           hazardData.value.description?.trim()
  }
})

// Add to list
function addToList() {
  if (!canAdd.value) return

  if (buildMode.value === 'creature') {
    // Create a complete creature object
    const creature: Creature = {
      id: `custom-${Date.now()}`,
      name: creatureData.value.name || 'Unnamed Creature',
      level: creatureData.value.level ?? 1,
      traits: creatureData.value.traits || [],
      size: creatureData.value.size || 'medium',
      source: creatureData.value.source || 'Custom',
      perception: creatureData.value.perception ?? 0,
      senses: creatureData.value.senses || [],
      languages: creatureData.value.languages || [],
      skills: creatureData.value.skills || {},
      abilities: creatureData.value.abilities || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      ac: creatureData.value.ac ?? 15,
      saves: creatureData.value.saves || { fort: 0, ref: 0, will: 0 },
      hp: creatureData.value.hp ?? 10,
      immunities: creatureData.value.immunities || [],
      resistances: creatureData.value.resistances || [],
      weaknesses: creatureData.value.weaknesses || [],
      speed: creatureData.value.speed || '25 feet',
      attacks: creatureData.value.attacks || [],
      specialAbilities: creatureData.value.specialAbilities || [],
    }

    encounterStore.addCustomCreature(creature)
    successMessage.value = `${creature.name} added to creature list!`
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)

    // Reset form
    resetCreatureForm()
  }
  // TODO: Add hazard support when hazard store is ready
}

function resetCreatureForm() {
  creatureData.value = {
    name: '',
    level: 1,
    size: 'medium',
    traits: [],
    source: 'Custom',
    perception: 0,
    senses: [],
    languages: [],
    skills: {},
    abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ac: 15,
    saves: { fort: 0, ref: 0, will: 0 },
    hp: 15,
    immunities: [],
    resistances: [],
    weaknesses: [],
    speed: '25 feet',
    attacks: [],
    specialAbilities: [],
  }
}

function discardForm() {
  if (buildMode.value === 'creature') {
    resetCreatureForm()
  } else {
    hazardData.value = {
      name: '',
      level: 1,
      complexity: 'simple',
      type: 'trap',
      traits: [],
      source: 'Custom',
      description: '',
      actions: [],
      saves: { fortitude: undefined, reflex: undefined, will: undefined },
      immunities: [],
    }
  }
}
</script>

<template>
  <div class="flex flex-1 overflow-hidden relative">
    <!-- ASCII Background Animation -->
    <AsciiBackground />
    <!-- Left Panel: Form -->
    <aside class="w-80 bg-surface border-r border-border overflow-y-auto flex flex-col">
      <!-- Mode Switcher -->
      <div class="p-4 border-b border-border">
        <div class="mode-switcher">
          <button
            class="mode-btn"
            :class="{ 'mode-btn-active': buildMode === 'creature' }"
            @click="buildMode = 'creature'"
          >
            <span class="mode-icon">◆</span>
            CREATURE
          </button>
          <button
            class="mode-btn"
            :class="{ 'mode-btn-active': buildMode === 'hazard' }"
            @click="buildMode = 'hazard'"
          >
            <span class="mode-icon">⚠</span>
            HAZARD
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <CreatureForm
          v-if="buildMode === 'creature'"
          v-model="creatureData"
        />
        <HazardForm
          v-else
          v-model="hazardData"
        />
      </div>

      <!-- Action Bar -->
      <div class="p-4 border-t border-border bg-elevated flex flex-col gap-2">
        <!-- Success Message -->
        <div
          v-if="showSuccess"
          class="success-message"
        >
          ✓ {{ successMessage }}
        </div>

        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" @click="discardForm" title="Discard">
            ✕
          </button>
          <button class="btn btn-secondary flex-1" @click="showExportModal = true">
            Export
          </button>
          <button
            class="btn btn-primary flex-1"
            :disabled="!canAdd"
            @click="addToList"
          >
            <span class="text-lg mr-1">+</span>
            Add to List
          </button>
        </div>
      </div>
    </aside>

    <!-- Right Panel: Preview -->
    <section class="flex-1 overflow-y-auto p-6 bg-bg">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-xs uppercase tracking-widest text-dim mb-4 font-mono">
          <span class="text-accent">//</span> Live Preview
        </h2>
        <StatBlockPreview
          v-if="buildMode === 'creature'"
          :creature="creatureData"
        />
        <StatBlockPreview
          v-else
          :hazard="hazardData"
        />
      </div>
    </section>

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
        <div class="modal max-w-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold uppercase tracking-wide">
              <span class="text-accent">//</span> Export JSON
            </h3>
            <button class="btn-secondary btn-icon btn-sm" @click="showExportModal = false">
              ×
            </button>
          </div>
          <pre class="bg-bg p-4 rounded border border-border overflow-x-auto text-xs font-mono text-dim max-h-96 overflow-y-auto">{{ exportJson }}</pre>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn btn-secondary" @click="showExportModal = false">Close</button>
            <button class="btn btn-primary" @click="copyToClipboard">Copy to Clipboard</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mode-switcher {
  display: flex;
  gap: 0.25rem;
  background: var(--color-bg);
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%
  );
}

.mode-btn:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.mode-btn-active {
  color: var(--color-bg);
  background: var(--color-accent);
  box-shadow: 0 0 12px var(--color-accent);
}

.mode-btn-active .mode-icon {
  color: var(--color-bg);
}

.mode-icon {
  font-size: 0.875rem;
  color: var(--color-accent);
  transition: color 0.15s ease;
}

/* Chamfer diagonal line */
.mode-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: linear-gradient(
    135deg,
    transparent 50%,
    var(--color-border) 50%
  );
  pointer-events: none;
}

.mode-btn-active::after {
  background: linear-gradient(
    135deg,
    transparent 50%,
    var(--color-accent) 50%
  );
}

/* Success message */
.success-message {
  padding: 0.5rem 0.75rem;
  background: var(--color-success-subtle);
  border: 1px solid var(--color-success);
  border-radius: 0.25rem;
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: 600;
  text-align: center;
  animation: slide-in 0.2s ease;
}

@keyframes slide-in {
  0% {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
