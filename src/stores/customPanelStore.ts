import { reactive, computed } from 'vue'
import type { Creature } from '../types/creature'

/**
 * Simple store to share custom panel state with StatusBar
 * Also manages editing/cloning state for creatures
 */

interface CustomPanelState {
  mode: 'creature' | 'hazard'
  creatureName: string
  hazardName: string
  creatureValid: boolean
  hazardValid: boolean
  editingCreatureId: string | null
  pendingCreatureData: Partial<Creature> | null
}

const state = reactive<CustomPanelState>({
  mode: 'creature',
  creatureName: '',
  hazardName: '',
  creatureValid: false,
  hazardValid: false,
  editingCreatureId: null,
  pendingCreatureData: null,
})

// Current name based on mode
const currentName = computed(() => {
  return state.mode === 'creature' ? state.creatureName : state.hazardName
})

// Current validation status based on mode
const isValid = computed(() => {
  return state.mode === 'creature' ? state.creatureValid : state.hazardValid
})

function setMode(mode: 'creature' | 'hazard') {
  state.mode = mode
}

function setCreatureState(name: string, valid: boolean) {
  state.creatureName = name
  state.creatureValid = valid
}

function setHazardState(name: string, valid: boolean) {
  state.hazardName = name
  state.hazardValid = valid
}

/**
 * Start editing or cloning a creature.
 * @param creature - The creature to edit/clone
 * @param createNew - If true, creates a new custom creature (clone). If false, edits in place.
 * @param nameSuffix - Optional suffix to append to name (e.g., ' (Custom)' or ' (Copy)')
 */
function startEditing(creature: Creature, createNew: boolean, nameSuffix?: string) {
  // Deep clone the creature data
  const cloned: Partial<Creature> = JSON.parse(JSON.stringify(creature))

  if (createNew) {
    // New creature: assign new ID, optionally modify name
    state.editingCreatureId = null
    if (nameSuffix) {
      cloned.name = (cloned.name || '') + nameSuffix
    }
    // Clear the ID so addCustomCreature generates a new one
    delete cloned.id
  } else {
    // Editing existing custom creature
    state.editingCreatureId = creature.id
  }

  state.pendingCreatureData = cloned
}

function clearEditing() {
  state.editingCreatureId = null
  state.pendingCreatureData = null
}

export const useCustomPanelStore = () => ({
  state,
  currentName,
  isValid,
  setMode,
  setCreatureState,
  setHazardState,
  startEditing,
  clearEditing,
})
