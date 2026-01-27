<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CreatureForm from './CreatureForm.vue'
import HazardForm from './HazardForm.vue'
import StatBlockPreview from './StatBlockPreview.vue'
import AsciiBackground from './AsciiBackground.vue'
import { useEncounterStore } from '../../stores/encounterStore'
import { useCustomPanelStore } from '../../stores/customPanelStore'
import type { Creature } from '../../types/creature'
import type { Hazard } from '../../types/hazard'

const encounterStore = useEncounterStore()
const customPanelStore = useCustomPanelStore()

type BuildMode = 'creature' | 'hazard'
const buildMode = ref<BuildMode>('creature')

// Mobile collapsible sections
const mobileBuilderOpen = ref(true)
const mobilePreviewOpen = ref(false)

// Sync build mode to store
watch(buildMode, (mode) => {
  customPanelStore.setMode(mode)
}, { immediate: true })

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
    // Hazard just needs name and level
    return hazardData.value.name?.trim() &&
           hazardData.value.level !== undefined
  }
})

// Sync creature state to store for StatusBar
watch([() => creatureData.value.name, () => creatureData.value.level, () => creatureData.value.hp, () => creatureData.value.ac], () => {
  const valid = !!(creatureData.value.name?.trim() &&
                   creatureData.value.level !== undefined &&
                   creatureData.value.hp !== undefined &&
                   creatureData.value.ac !== undefined)
  customPanelStore.setCreatureState(creatureData.value.name || '', valid)
}, { immediate: true, deep: true })

// Sync hazard state to store for StatusBar
watch([() => hazardData.value.name, () => hazardData.value.level], () => {
  const valid = !!(hazardData.value.name?.trim() && hazardData.value.level !== undefined)
  customPanelStore.setHazardState(hazardData.value.name || '', valid)
}, { immediate: true, deep: true })

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
  } else {
    // Create a complete hazard object
    const hazard: Hazard = {
      id: `custom-hazard-${Date.now()}`,
      name: hazardData.value.name || 'Unnamed Hazard',
      level: hazardData.value.level ?? 1,
      complexity: hazardData.value.complexity || 'simple',
      type: hazardData.value.type || 'trap',
      trapSubtypes: hazardData.value.trapSubtypes || [],
      traits: hazardData.value.traits || [],
      source: hazardData.value.source || 'Custom',
      description: hazardData.value.description || '',
      mainChallenge: hazardData.value.mainChallenge,
      isObvious: hazardData.value.isObvious,
      stealthDC: hazardData.value.stealthDC,
      stealthProficiency: hazardData.value.stealthProficiency,
      disable: hazardData.value.disable,
      hasPhysicalComponent: hazardData.value.hasPhysicalComponent,
      ac: hazardData.value.ac,
      saves: hazardData.value.saves,
      hardness: hazardData.value.hardness,
      hp: hazardData.value.hp,
      bt: hazardData.value.bt,
      immunities: hazardData.value.immunities || [],
      usesAttackRoll: hazardData.value.usesAttackRoll,
      attackBonus: hazardData.value.attackBonus,
      saveDC: hazardData.value.saveDC,
      saveType: hazardData.value.saveType,
      damage: hazardData.value.damage,
      damageType: hazardData.value.damageType,
      targetingModel: hazardData.value.targetingModel,
      trigger: hazardData.value.trigger,
      effect: hazardData.value.effect,
      reset: hazardData.value.reset,
      routine: hazardData.value.routine,
      actionsPerRound: hazardData.value.actionsPerRound,
      actions: hazardData.value.actions || [],
    }

    encounterStore.addCustomHazard(hazard)
    successMessage.value = `${hazard.name} added to hazard list!`
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)

    // Reset form
    resetHazardForm()
  }
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

function resetHazardForm() {
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

function discardForm() {
  if (buildMode.value === 'creature') {
    resetCreatureForm()
  } else {
    resetHazardForm()
  }
}
</script>

<template>
  <div class="custom-layout">
    <!-- ASCII Background Animation -->
    <AsciiBackground />

    <!-- Mobile: Collapsible Builder -->
    <div class="mobile-section">
      <button class="mobile-section-header" @click="mobileBuilderOpen = !mobileBuilderOpen">
        <span>Builder</span>
        <span class="mobile-chevron">{{ mobileBuilderOpen ? '▼' : '▶' }}</span>
      </button>
      <div class="mobile-section-content" v-show="mobileBuilderOpen">
        <!-- Mode Switcher -->
        <div class="p-3 border-b border-border">
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
        <div class="p-3">
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
        <div class="p-3 border-t border-border bg-elevated flex flex-col gap-2">
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
              {{ buildMode === 'creature' ? 'Add' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: Collapsible Preview -->
    <div class="mobile-section mobile-section-preview">
      <button class="mobile-section-header" @click="mobilePreviewOpen = !mobilePreviewOpen">
        <span>Preview</span>
        <span class="mobile-chevron">{{ mobilePreviewOpen ? '▼' : '▶' }}</span>
      </button>
      <div class="mobile-section-content mobile-preview-content" v-show="mobilePreviewOpen">
        <div class="p-3">
          <StatBlockPreview
            v-if="buildMode === 'creature'"
            :creature="creatureData"
          />
          <StatBlockPreview
            v-else
            :hazard="hazardData"
          />
        </div>
      </div>
    </div>

    <!-- Desktop: Left Panel Form -->
    <aside class="desktop-sidebar">
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
            {{ buildMode === 'creature' ? 'Add to Creatures' : 'Add to Hazards' }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Desktop: Right Panel Preview -->
    <section class="desktop-preview">
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
/* Layout */
.custom-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  overflow-y: auto;
  position: relative;
}

@media (min-width: 1024px) {
  .custom-layout {
    flex-direction: row;
    overflow-y: hidden;
  }
}

/* Mobile sections */
.mobile-section {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
}

@media (min-width: 1024px) {
  .mobile-section {
    display: none;
  }
}

.mobile-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--color-bg-elevated);
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mobile-section-header:hover {
  background: var(--color-bg-hover);
}

.mobile-chevron {
  font-size: 10px;
  color: var(--color-text-dim);
}

.mobile-section-content {
  background: var(--color-bg-surface);
}

.mobile-section-preview {
  flex: 1;
  min-height: 0;
}

.mobile-preview-content {
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .mobile-section-preview {
    display: none;
  }
}

/* Desktop sidebar */
.desktop-sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .desktop-sidebar {
    display: flex;
    flex-direction: column;
    width: 20rem;
    background: var(--color-bg-surface);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }
}

/* Desktop preview */
.desktop-preview {
  display: none;
}

@media (min-width: 1024px) {
  .desktop-preview {
    display: block;
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: var(--color-bg);
  }
}

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
