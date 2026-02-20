<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCombatStore } from '../stores/combatStore'
import { useEncounterStore } from '../stores/encounterStore'
import { COMBAT_CONDITIONS, VALUED_CONDITIONS } from '../types/combat'
import { CONDITIONS as CONDITION_DEFS } from '../data/conditions'
import { formatWarnings } from '../utils/pathbuilderImport'
import type { ImportResult } from '../utils/pathbuilderImport'
import CombatantRow from './CombatantRow.vue'

const combatStore = useCombatStore()
const encounterStore = useEncounterStore()

const showAddPlayer = ref(false)
const newPlayerName = ref('')
const newPlayerInit = ref(10)
const newPlayerHP = ref(50)
const newPlayerAC = ref(20)

const showConditionPicker = ref<string | null>(null)

// Pathbuilder import state
const showImportModal = ref(false)
const importJson = ref('')
const importResult = ref<ImportResult | null>(null)
const isImporting = ref(false)

function startFromEncounter() {
  if (!encounterStore.activeEncounter.value) return

  combatStore.startCombat(encounterStore.activeEncounter.value.name)

  // Add all creatures from the encounter
  for (const entry of encounterStore.activeEncounter.value.creatures) {
    for (let i = 0; i < entry.count; i++) {
      combatStore.addCreature(entry.creature, entry.adjustment)
    }
  }

  // Roll initiative for all creatures
  combatStore.rollAllInitiative()
}

function addPlayer() {
  if (!newPlayerName.value.trim()) return

  combatStore.addPlayer(
    newPlayerName.value.trim(),
    newPlayerInit.value,
    newPlayerHP.value,
    newPlayerAC.value
  )

  // Reset form
  newPlayerName.value = ''
  newPlayerInit.value = 10
  newPlayerHP.value = 50
  newPlayerAC.value = 20
  showAddPlayer.value = false
}

function addConditionToCombatant(combatantId: string, conditionKey: string) {
  const needsValue = VALUED_CONDITIONS.includes(conditionKey)
  combatStore.addCondition(combatantId, conditionKey, needsValue ? 1 : undefined)
  showConditionPicker.value = null
}

function getConditionDef(key: string) {
  return CONDITION_DEFS[key]
}

const hasCombat = computed(() => combatStore.state.combat !== null)

// Pathbuilder import functions
function openImportModal() {
  importJson.value = ''
  importResult.value = null
  isImporting.value = false
  showImportModal.value = true
}

function closeImportModal() {
  showImportModal.value = false
  importJson.value = ''
  importResult.value = null
}

function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    importJson.value = e.target?.result as string || ''
    handleImport()
  }
  reader.readAsText(file)
  // Reset input so the same file can be re-selected
  ;(event.target as HTMLInputElement).value = ''
}

function handleImport() {
  if (!importJson.value.trim()) {
    importResult.value = {
      success: false,
      warnings: [],
      errors: ['Please upload a file or paste a Pathbuilder / Pathmuncher JSON export']
    }
    return
  }

  isImporting.value = true
  importResult.value = combatStore.importPlayerFromPathbuilder(importJson.value)
  isImporting.value = false

  // If successful, clear the input but keep modal open to show result
  if (importResult.value.success) {
    importJson.value = ''
  }
}

function importAnother() {
  importJson.value = ''
  importResult.value = null
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- No Combat State -->
    <div v-if="!hasCombat" class="text-center p-12">
      <h2 class="mb-2">Combat Tracker</h2>
      <p class="text-dim mb-8">Start a combat encounter to track initiative, HP, and conditions.</p>

      <div class="flex flex-col gap-3 items-center">
        <button
          v-if="encounterStore.activeEncounter.value?.creatures.length"
          class="btn-primary"
          @click="startFromEncounter"
        >
          Start from "{{ encounterStore.activeEncounter.value?.name }}"
        </button>

        <button class="btn-secondary" @click="combatStore.startCombat('New Combat')">
          Start Empty Combat
        </button>
      </div>
    </div>

    <!-- Active Combat -->
    <template v-else>
      <div class="flex flex-col lg:flex-row justify-between items-start gap-3 mb-4 pb-4 border-b border-border">
        <div>
          <h2 class="text-lg lg:text-xl mb-1">{{ combatStore.state.combat?.name }}</h2>
          <div class="flex flex-wrap gap-2 lg:gap-4 text-sm text-dim">
            <span class="bg-accent text-white px-2 py-0.5 rounded font-semibold">Round {{ combatStore.state.combat?.round }}</span>
            <span v-if="combatStore.currentCombatant.value">
              Current: <strong class="text-text">{{ combatStore.currentCombatant.value.name }}</strong>
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary btn-xs lg:btn-sm" @click="combatStore.previousTurn()">
            ← Prev
          </button>
          <button class="btn-primary btn-sm" @click="combatStore.nextTurn()">
            Next Turn →
          </button>
          <button class="btn-secondary btn-xs lg:btn-sm" @click="combatStore.rollAllInitiative()">
            Roll All Init
          </button>
          <button class="btn-danger btn-xs lg:btn-sm" @click="combatStore.endCombat()">
            End Combat
          </button>
        </div>
      </div>

      <!-- Combatant List -->
      <div class="flex-1 overflow-y-auto">
        <!-- Desktop header - hidden on mobile -->
        <div class="hidden lg:grid gap-2 p-2 text-xs font-semibold uppercase text-dim border-b border-border" style="grid-template-columns: 60px 1fr 180px 50px 1fr 80px;">
          <span>Init</span>
          <span>Name</span>
          <span>HP</span>
          <span>AC</span>
          <span>Conditions</span>
          <span></span>
        </div>

        <CombatantRow
          v-for="(combatant, index) in combatStore.sortedCombatants.value"
          :key="combatant.id"
          :combatant="combatant"
          :is-current="combatStore.state.combat?.turn === index"
          @show-conditions="showConditionPicker = combatant.id"
        />
      </div>

      <!-- Add Combatant Controls -->
      <div class="flex gap-2 pt-4 border-t border-border mt-auto">
        <button class="btn-secondary" @click="showAddPlayer = !showAddPlayer">
          + Add Player
        </button>
        <button class="btn-primary" @click="openImportModal">
          Import from Pathbuilder / Pathmuncher
        </button>
      </div>

      <!-- Add Player Form -->
      <div v-if="showAddPlayer" class="card mt-4 p-4">
        <h4 class="mb-3">Add Player Character</h4>
        <div class="flex gap-2 items-center">
          <input
            v-model="newPlayerName"
            type="text"
            placeholder="Character Name"
            class="input flex-1"
            @keyup.enter="addPlayer"
          />
          <input
            v-model.number="newPlayerInit"
            type="number"
            placeholder="Initiative"
            class="input w-20"
          />
          <input
            v-model.number="newPlayerHP"
            type="number"
            placeholder="HP"
            class="input w-20"
          />
          <input
            v-model.number="newPlayerAC"
            type="number"
            placeholder="AC"
            class="input w-20"
          />
          <button class="btn-primary" @click="addPlayer">Add</button>
          <button class="btn-secondary" @click="showAddPlayer = false">Cancel</button>
        </div>
      </div>
    </template>

    <!-- Condition Picker Modal -->
    <div
      v-if="showConditionPicker"
      class="modal-overlay"
      @click.self="showConditionPicker = null"
    >
      <div class="modal max-w-[700px] max-h-[80vh] flex flex-col">
        <h3 class="mb-4">Add Condition</h3>
        <div class="flex flex-col gap-1.5 my-4 max-h-[500px] overflow-y-auto">
          <button
            v-for="conditionKey in COMBAT_CONDITIONS"
            :key="conditionKey"
            class="flex flex-col items-start gap-0.5 px-3.5 py-2.5 text-[0.8125rem] text-left bg-elevated border border-border rounded-md transition-all duration-150 hover:bg-accent/15 hover:border-accent"
            :title="getConditionDef(conditionKey)?.description"
            @click="addConditionToCombatant(showConditionPicker!, conditionKey)"
          >
            <span class="font-semibold text-text capitalize flex items-center gap-1.5">
              {{ getConditionDef(conditionKey)?.name || conditionKey }}
            </span>
            <span class="text-[0.6875rem] text-dim">{{ getConditionDef(conditionKey)?.shortDescription }}</span>
          </button>
        </div>
        <button class="btn-secondary" @click="showConditionPicker = null">Cancel</button>
      </div>
    </div>

    <!-- Pathbuilder Import Modal -->
    <div
      v-if="showImportModal"
      class="modal-overlay"
      @click.self="closeImportModal"
    >
      <div class="modal max-w-[600px]">
        <h3 class="mb-4">Import from Pathbuilder / Pathmuncher</h3>
        <p class="text-dim text-sm mb-4">
          Export your character from Pathbuilder using "Export to JSON", or use a Pathmuncher JSON export. Upload a file or paste the JSON below.
        </p>

        <!-- Success State -->
        <div v-if="importResult?.success" class="text-center py-6">
          <div class="w-12 h-12 bg-success text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-4">✓</div>
          <div class="text-lg mb-3">
            <strong>{{ importResult.combatant?.name }}</strong> imported successfully!
          </div>
          <div v-if="importResult.characterSummary" class="flex items-center justify-center gap-2 flex-wrap text-sm text-dim mb-4">
            <span class="bg-elevated px-2 py-1 rounded">Level {{ importResult.characterSummary.level }}</span>
            <span class="bg-elevated px-2 py-1 rounded">{{ importResult.characterSummary.ancestry }}</span>
            <span class="bg-elevated px-2 py-1 rounded">{{ importResult.characterSummary.class }}</span>
            <span class="text-border">|</span>
            <span class="font-semibold text-accent">HP {{ importResult.characterSummary.hp }}</span>
            <span class="font-semibold text-accent">AC {{ importResult.characterSummary.ac }}</span>
          </div>
          <div v-if="importResult.warnings.length > 0" class="text-left text-[0.8125rem] text-warning bg-warning/10 p-3 rounded-md mb-4">
            <strong>Notes:</strong>
            <ul class="mt-2 ml-5 list-disc">
              <li v-for="(warning, idx) in formatWarnings(importResult.warnings)" :key="idx" class="mb-1">
                {{ warning }}
              </li>
            </ul>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn-secondary" @click="importAnother">Import Another</button>
            <button class="btn-primary" @click="closeImportModal">Done</button>
          </div>
        </div>

        <!-- Input State -->
        <template v-else>
          <label
            class="flex items-center justify-center gap-2 px-4 py-3 mb-3 rounded-md border-2 border-dashed border-border text-sm text-dim cursor-pointer transition-colors hover:border-accent hover:text-accent"
          >
            <span>Choose JSON file...</span>
            <input type="file" accept=".json,application/json" class="hidden" @change="handleFileImport" />
          </label>

          <div class="text-center text-[0.6875rem] text-muted mb-3">or paste JSON below</div>

          <textarea
            v-model="importJson"
            class="input w-full font-mono text-xs p-3 resize-y mb-4"
            placeholder='{"success":true,"build":{"name":"Character Name",...}}'
            rows="6"
            :disabled="isImporting"
          ></textarea>

          <!-- Error Messages -->
          <div v-if="importResult?.errors.length" class="mb-4">
            <div v-for="(error, idx) in importResult.errors" :key="idx" class="text-danger text-sm p-2 px-3 bg-danger/10 rounded mb-2">
              {{ error }}
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button class="btn-secondary" @click="closeImportModal">Cancel</button>
            <button
              class="btn-primary"
              @click="handleImport"
              :disabled="isImporting || !importJson.trim()"
            >
              {{ isImporting ? 'Importing...' : 'Import Character' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
