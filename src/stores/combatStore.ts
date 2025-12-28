import { reactive, computed } from 'vue'
import type { Creature, CreatureAdjustment } from '../types/creature'
import type { Hazard } from '../types/hazard'
import type { Combat, Combatant } from '../types/combat'
import { getAdjustedHP, getAdjustedAC } from '../types/combat'
import { parsePathbuilderJSON, type ImportResult } from '../utils/pathbuilderImport'

const STORAGE_KEY = 'sf2e-combat'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function loadFromStorage(): Combat | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      parsed.createdAt = new Date(parsed.createdAt)
      return parsed
    }
  } catch (e) {
    console.error('Failed to load combat from storage:', e)
  }
  return null
}

function saveToStorage(combat: Combat | null) {
  try {
    if (combat) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combat))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    console.error('Failed to save combat:', e)
  }
}

interface CombatState {
  combat: Combat | null
}

const state = reactive<CombatState>({
  combat: loadFromStorage(),
})

// Computed
const sortedCombatants = computed(() => {
  if (!state.combat) return []
  return [...state.combat.combatants].sort((a, b) => b.initiative - a.initiative)
})

const currentCombatant = computed(() => {
  if (!state.combat || state.combat.combatants.length === 0) return null
  const sorted = sortedCombatants.value
  return sorted[state.combat.turn % sorted.length] || null
})

const aliveCombatants = computed(() => {
  return sortedCombatants.value.filter(c => !c.isDead)
})

// Actions
function startCombat(name: string = 'Combat'): Combat {
  const combat: Combat = {
    id: generateId(),
    name,
    round: 1,
    turn: 0,
    combatants: [],
    isActive: true,
    createdAt: new Date(),
  }
  state.combat = combat
  saveToStorage(combat)
  return combat
}

function endCombat() {
  state.combat = null
  saveToStorage(null)
}

function addPlayer(name: string, initiative: number, hp: number, ac: number): Combatant {
  if (!state.combat) startCombat()

  const combatant: Combatant = {
    id: generateId(),
    name,
    initiative,
    initiativeBonus: 0,
    currentHP: hp,
    maxHP: hp,
    tempHP: 0,
    ac,
    conditions: [],
    isPlayer: true,
    isActive: true,
    isDead: false,
    notes: '',
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  return combatant
}

function addCreature(
  creature: Creature,
  adjustment: CreatureAdjustment = 'normal',
  customName?: string
): Combatant {
  if (!state.combat) startCombat()

  const maxHP = getAdjustedHP(creature.hp, adjustment, creature.level)
  const ac = getAdjustedAC(creature.ac, adjustment)

  // Check for duplicate names and add number suffix
  const baseName = customName || creature.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: creature.perception, // Default to perception for rolling
    initiativeBonus: creature.perception,
    currentHP: maxHP,
    maxHP,
    tempHP: 0,
    ac,
    conditions: [],
    isPlayer: false,
    isActive: true,
    isDead: false,
    notes: '',
    creature,
    adjustment,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  return combatant
}

function addHazard(hazard: Hazard, customName?: string): Combatant {
  if (!state.combat) startCombat()

  // Check for duplicate names and add number suffix
  const baseName = customName || hazard.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: hazard.complexity === 'complex' ? 0 : -999, // Complex hazards roll, simple don't act
    initiativeBonus: 0,
    currentHP: hazard.hp || 0,
    maxHP: hazard.hp || 0,
    tempHP: 0,
    ac: hazard.ac || 10,
    conditions: [],
    isPlayer: false,
    isActive: hazard.complexity === 'complex', // Only complex hazards take turns
    isDead: false,
    notes: `${hazard.complexity.toUpperCase()} ${hazard.type.toUpperCase()}\nDisable: ${hazard.disable || 'N/A'}`,
    isHazard: true,
    hazard,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)
  return combatant
}

function removeCombatant(id: string) {
  if (!state.combat) return

  const index = state.combat.combatants.findIndex(c => c.id === id)
  if (index !== -1) {
    state.combat.combatants.splice(index, 1)
    // Adjust turn if needed
    if (state.combat.turn >= state.combat.combatants.length) {
      state.combat.turn = 0
    }
    saveToStorage(state.combat)
  }
}

function setInitiative(id: string, initiative: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.initiative = initiative
    saveToStorage(state.combat)
  }
}

function rollInitiative(id: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    const roll = Math.floor(Math.random() * 20) + 1
    combatant.initiative = roll + combatant.initiativeBonus
    saveToStorage(state.combat)
  }
}

function rollAllInitiative() {
  if (!state.combat) return

  state.combat.combatants.forEach(combatant => {
    if (!combatant.isPlayer) {
      const roll = Math.floor(Math.random() * 20) + 1
      combatant.initiative = roll + combatant.initiativeBonus
    }
  })
  saveToStorage(state.combat)
}

function nextTurn() {
  if (!state.combat || aliveCombatants.value.length === 0) return

  const sorted = sortedCombatants.value
  let nextIndex = (state.combat.turn + 1) % sorted.length

  // Skip dead combatants
  let attempts = 0
  while (sorted[nextIndex]?.isDead && attempts < sorted.length) {
    nextIndex = (nextIndex + 1) % sorted.length
    attempts++
  }

  // Check if we've wrapped around (new round)
  if (nextIndex <= state.combat.turn || attempts >= sorted.length) {
    state.combat.round++
  }

  state.combat.turn = nextIndex
  saveToStorage(state.combat)
}

function previousTurn() {
  if (!state.combat || sortedCombatants.value.length === 0) return

  const sorted = sortedCombatants.value
  let prevIndex = state.combat.turn - 1
  if (prevIndex < 0) {
    prevIndex = sorted.length - 1
    state.combat.round = Math.max(1, state.combat.round - 1)
  }

  // Skip dead combatants
  let attempts = 0
  while (sorted[prevIndex]?.isDead && attempts < sorted.length) {
    prevIndex--
    if (prevIndex < 0) {
      prevIndex = sorted.length - 1
      state.combat.round = Math.max(1, state.combat.round - 1)
    }
    attempts++
  }

  state.combat.turn = prevIndex
  saveToStorage(state.combat)
}

function setTurn(index: number) {
  if (!state.combat) return
  state.combat.turn = Math.max(0, Math.min(index, sortedCombatants.value.length - 1))
  saveToStorage(state.combat)
}

function applyDamage(id: string, damage: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  // Damage temp HP first
  if (combatant.tempHP > 0) {
    const tempDamage = Math.min(damage, combatant.tempHP)
    combatant.tempHP -= tempDamage
    damage -= tempDamage
  }

  combatant.currentHP = Math.max(0, combatant.currentHP - damage)

  // Check for death
  if (combatant.currentHP <= 0) {
    combatant.isDead = true
  }

  saveToStorage(state.combat)
}

function applyHealing(id: string, healing: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + healing)

  // Revive if healed from 0
  if (combatant.currentHP > 0 && combatant.isDead) {
    combatant.isDead = false
  }

  saveToStorage(state.combat)
}

function setHP(id: string, hp: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  combatant.currentHP = Math.max(0, Math.min(combatant.maxHP, hp))
  combatant.isDead = combatant.currentHP <= 0

  saveToStorage(state.combat)
}

function setTempHP(id: string, tempHP: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.tempHP = Math.max(0, tempHP)
    saveToStorage(state.combat)
  }
}

function setMaxHP(id: string, maxHP: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.maxHP = Math.max(1, maxHP)
    combatant.currentHP = Math.min(combatant.currentHP, combatant.maxHP)
    saveToStorage(state.combat)
  }
}

function addCondition(id: string, condition: string, value?: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  // Check if condition already exists
  const existing = combatant.conditions.find(c => c.name === condition)
  if (existing) {
    existing.value = value
  } else {
    combatant.conditions.push({ name: condition, value })
  }

  saveToStorage(state.combat)
}

function removeCondition(id: string, condition: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  const index = combatant.conditions.findIndex(c => c.name === condition)
  if (index !== -1) {
    combatant.conditions.splice(index, 1)
    saveToStorage(state.combat)
  }
}

function updateConditionValue(id: string, condition: string, value: number) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (!combatant) return

  const cond = combatant.conditions.find(c => c.name === condition)
  if (cond) {
    if (value <= 0) {
      removeCondition(id, condition)
    } else {
      cond.value = value
      saveToStorage(state.combat)
    }
  }
}

function setNotes(id: string, notes: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.notes = notes
    saveToStorage(state.combat)
  }
}

function toggleDead(id: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.isDead = !combatant.isDead
    if (combatant.isDead) {
      combatant.currentHP = 0
    }
    saveToStorage(state.combat)
  }
}

function updateCombatantName(id: string, name: string) {
  if (!state.combat) return

  const combatant = state.combat.combatants.find(c => c.id === id)
  if (combatant) {
    combatant.name = name
    saveToStorage(state.combat)
  }
}

/**
 * Import a player character from Pathbuilder JSON export
 */
function importPlayerFromPathbuilder(json: string): ImportResult {
  const result = parsePathbuilderJSON(json)

  if (!result.success || !result.combatant) {
    return result
  }

  // Start combat if needed
  if (!state.combat) startCombat()

  // Check for duplicate names
  const baseName = result.combatant.name
  const existingNames = state.combat!.combatants
    .filter(c => c.name.startsWith(baseName))
    .map(c => c.name)

  let finalName = baseName
  if (existingNames.includes(baseName)) {
    let num = 2
    while (existingNames.includes(`${baseName} ${num}`)) {
      num++
    }
    finalName = `${baseName} ${num}`
  }

  // Create the combatant with extended player stats
  const combatant: Combatant = {
    id: generateId(),
    name: finalName,
    initiative: result.combatant.perception || 0, // Use perception for initiative
    initiativeBonus: result.combatant.perception || 0,
    currentHP: result.combatant.currentHP,
    maxHP: result.combatant.maxHP,
    tempHP: 0,
    ac: result.combatant.ac,
    conditions: [],
    isPlayer: true,
    isActive: true,
    isDead: false,
    notes: '',
    // Extended stats
    level: result.combatant.level,
    class: result.combatant.class,
    ancestry: result.combatant.ancestry,
    perception: result.combatant.perception,
    fortitude: result.combatant.fortitude,
    reflex: result.combatant.reflex,
    will: result.combatant.will,
  }

  state.combat!.combatants.push(combatant)
  saveToStorage(state.combat)

  // Return result with the created combatant
  return {
    ...result,
    combatant: combatant,
  }
}

function clearAndStartCombat(name: string = 'Combat'): Combat {
  // End existing combat and start fresh
  state.combat = null
  return startCombat(name)
}

export const useCombatStore = () => ({
  state,
  sortedCombatants,
  currentCombatant,
  aliveCombatants,

  startCombat,
  endCombat,
  clearAndStartCombat,
  addPlayer,
  addCreature,
  addHazard,
  removeCombatant,
  setInitiative,
  rollInitiative,
  rollAllInitiative,
  nextTurn,
  previousTurn,
  setTurn,
  applyDamage,
  applyHealing,
  setHP,
  setTempHP,
  setMaxHP,
  addCondition,
  removeCondition,
  updateConditionValue,
  setNotes,
  toggleDead,
  updateCombatantName,
  importPlayerFromPathbuilder,
})
