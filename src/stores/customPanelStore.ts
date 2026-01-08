import { reactive, computed } from 'vue'

/**
 * Simple store to share custom panel state with StatusBar
 */

interface CustomPanelState {
  mode: 'creature' | 'hazard'
  creatureName: string
  hazardName: string
  creatureValid: boolean
  hazardValid: boolean
}

const state = reactive<CustomPanelState>({
  mode: 'creature',
  creatureName: '',
  hazardName: '',
  creatureValid: false,
  hazardValid: false,
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

export const useCustomPanelStore = () => ({
  state,
  currentName,
  isValid,
  setMode,
  setCreatureState,
  setHazardState,
})
