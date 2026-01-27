<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { STARSHIP_ROLES } from '../../data/starshipRoles'
import { STARSHIP_TEMPLATES, getScaledStats, type CustomShip, createEmptyCustomShip } from '../../data/starshipTemplates'
import type { StarshipThreat, StarshipRole } from '../../types/starship'
import { createDefaultThreat } from '../../types/starship'
import RoleCard from './RoleCard.vue'
import RolePdfExport from './RolePdfExport.vue'
import CustomRoleBuilder from './CustomRoleBuilder.vue'

const store = useStarshipStore()

// Tab state
type Tab = 'roles' | 'scene'
const activeTab = ref<Tab>('roles')

// Modals
const showPdfExport = ref(false)
const showCustomRoleBuilder = ref(false)
const showCustomShipEditor = ref(false)
const editingCustomRole = ref<StarshipRole | null>(null)

// Role deck - instances of roles (can have duplicates like 2 gunners)
interface RoleInstance {
  instanceId: string
  role: StarshipRole
}
const selectedRoleCards = ref<RoleInstance[]>([])
const roleToAdd = ref<string>('')

// Scene state
const selectedShipId = ref<string>('explorer')
const sceneLevel = ref(1)
const threats = ref<StarshipThreat[]>([])
const isSceneRunning = ref(false)
const currentRound = ref(1)

// Damage input state
const shipDamageInput = ref(0)
const threatDamageInputs = ref<Record<string, number>>({})

// Custom ships storage
const customShips = ref<CustomShip[]>([])
const editingCustomShip = ref<CustomShip | null>(null)

// Load custom ships and role deck from localStorage
onMounted(() => {
  store.setGMView(true)
  const saved = localStorage.getItem('sf2e-custom-ships')
  if (saved) {
    try {
      customShips.value = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load custom ships:', e)
    }
  }
  loadRoleDeck()
})

// Reload role deck when custom roles change (so newly created roles appear)
watch(() => store.state.customRoles, () => {
  loadRoleDeck()
}, { deep: true })

function saveCustomShips() {
  localStorage.setItem('sf2e-custom-ships', JSON.stringify(customShips.value))
}

// Computed
const allRoles = computed(() => [...STARSHIP_ROLES, ...store.state.customRoles])

// Role deck management
function addRoleToDeck() {
  if (!roleToAdd.value) return

  const role = allRoles.value.find(r => r.id === roleToAdd.value)
  if (!role) return

  selectedRoleCards.value.push({
    instanceId: crypto.randomUUID(),
    role: role
  })

  saveRoleDeck()
}

function removeRoleFromDeck(instanceId: string) {
  selectedRoleCards.value = selectedRoleCards.value.filter(r => r.instanceId !== instanceId)
  saveRoleDeck()
}

function clearRoleDeck() {
  selectedRoleCards.value = []
  saveRoleDeck()
}

function openCustomRoleBuilder(role?: StarshipRole) {
  editingCustomRole.value = role || null
  showCustomRoleBuilder.value = true
}

function closeCustomRoleBuilder() {
  showCustomRoleBuilder.value = false
  editingCustomRole.value = null
}

function deleteCustomRole(roleId: string) {
  // Remove from deck if present
  selectedRoleCards.value = selectedRoleCards.value.filter(r => r.role.id !== roleId)
  saveRoleDeck()
  // Delete from store
  store.deleteCustomRole(roleId)
}

function saveRoleDeck() {
  // Save just the role IDs and instance IDs so we can reconstruct
  const toSave = selectedRoleCards.value.map(r => ({
    instanceId: r.instanceId,
    roleId: r.role.id
  }))
  localStorage.setItem('sf2e-role-deck', JSON.stringify(toSave))
}

function loadRoleDeck() {
  const saved = localStorage.getItem('sf2e-role-deck')
  if (!saved) return

  try {
    const parsed = JSON.parse(saved) as { instanceId: string; roleId: string }[]
    selectedRoleCards.value = parsed
      .map(item => {
        const role = allRoles.value.find(r => r.id === item.roleId)
        if (!role) return null
        return { instanceId: item.instanceId, role }
      })
      .filter((item): item is RoleInstance => item !== null)
  } catch (e) {
    console.warn('Failed to load role deck:', e)
  }
}

// Roles for PDF export - use selected roles if any, otherwise all roles
const rolesForExport = computed(() => {
  if (selectedRoleCards.value.length > 0) {
    return selectedRoleCards.value.map(r => r.role)
  }
  return allRoles.value
})

const currentShip = computed(() => {
  // Check custom ships first
  const custom = customShips.value.find(s => s.id === selectedShipId.value)
  if (custom) {
    return {
      name: custom.name,
      level: custom.level,
      ac: custom.ac,
      fortitude: custom.fortitude,
      reflex: custom.reflex,
      maxHP: custom.maxHP,
      currentHP: custom.maxHP,
      maxShields: custom.maxShields,
      currentShields: custom.maxShields,
      shieldRegen: custom.shieldRegen,
      bonuses: custom.bonuses
    }
  }

  // Otherwise use template
  const template = STARSHIP_TEMPLATES.find(t => t.id === selectedShipId.value)
  if (template) {
    return {
      name: template.name,
      ...getScaledStats(template, sceneLevel.value)
    }
  }

  return null
})

// Scene ship HP tracking (separate from template)
const shipCurrentHP = ref(0)
const shipCurrentShields = ref(0)

function startScene() {
  if (!currentShip.value) return

  shipCurrentHP.value = currentShip.value.maxHP
  shipCurrentShields.value = currentShip.value.maxShields
  currentRound.value = 1
  isSceneRunning.value = true

  // Update store for player view sync
  store.state.activeScene = {
    id: crypto.randomUUID(),
    name: `${currentShip.value.name} Scene`,
    level: sceneLevel.value,
    description: '',
    victoryCondition: 'defeat',
    starship: {
      id: crypto.randomUUID(),
      name: currentShip.value.name,
      level: sceneLevel.value,
      ac: currentShip.value.ac,
      fortitude: currentShip.value.fortitude,
      reflex: currentShip.value.reflex,
      maxShields: currentShip.value.maxShields,
      currentShields: shipCurrentShields.value,
      shieldRegen: currentShip.value.shieldRegen,
      maxHP: currentShip.value.maxHP,
      currentHP: shipCurrentHP.value,
      bonuses: currentShip.value.bonuses
    },
    threats: threats.value,
    roles: [],
    currentRound: 1,
    currentVP: 0,
    isActive: true,
    actionLog: []
  }
}

function endScene() {
  isSceneRunning.value = false
  store.endScene()
}

function nextRound() {
  currentRound.value++
  // Regenerate shields
  if (currentShip.value) {
    shipCurrentShields.value = Math.min(
      currentShip.value.maxShields,
      shipCurrentShields.value + currentShip.value.shieldRegen
    )
  }
  // Update store
  if (store.state.activeScene) {
    store.state.activeScene.currentRound = currentRound.value
    store.state.activeScene.starship.currentShields = shipCurrentShields.value
  }
}

function damageShip(amount: number) {
  let remaining = amount

  // Shields first
  if (shipCurrentShields.value > 0) {
    const shieldDmg = Math.min(shipCurrentShields.value, remaining)
    shipCurrentShields.value -= shieldDmg
    remaining -= shieldDmg
  }

  // Then HP
  if (remaining > 0) {
    shipCurrentHP.value = Math.max(0, shipCurrentHP.value - remaining)
  }

  // Update store
  if (store.state.activeScene) {
    store.state.activeScene.starship.currentShields = shipCurrentShields.value
    store.state.activeScene.starship.currentHP = shipCurrentHP.value
  }
}

function healShip(amount: number) {
  if (currentShip.value) {
    shipCurrentHP.value = Math.min(currentShip.value.maxHP, shipCurrentHP.value + amount)
    if (store.state.activeScene) {
      store.state.activeScene.starship.currentHP = shipCurrentHP.value
    }
  }
}

// Threat management
function addThreat() {
  threats.value.push(createDefaultThreat())
}

function updateThreat(index: number, field: keyof StarshipThreat, value: unknown) {
  if (threats.value[index]) {
    (threats.value[index] as Record<string, unknown>)[field] = value
    if (store.state.activeScene) {
      store.state.activeScene.threats = [...threats.value]
    }
  }
}

function removeThreat(index: number) {
  threats.value.splice(index, 1)
  if (store.state.activeScene) {
    store.state.activeScene.threats = [...threats.value]
  }
}

function damageThreat(index: number, amount: number) {
  const threat = threats.value[index]
  if (!threat) return

  let remaining = amount

  // Damage shields first
  if (threat.currentShields !== undefined && threat.currentShields > 0) {
    const shieldDmg = Math.min(threat.currentShields, remaining)
    threat.currentShields -= shieldDmg
    remaining -= shieldDmg
  }

  // Then HP
  if (remaining > 0 && threat.currentHP !== undefined) {
    threat.currentHP = Math.max(0, threat.currentHP - remaining)
    if (threat.currentHP === 0) {
      threat.isDefeated = true
    }
  }

  if (store.state.activeScene) {
    store.state.activeScene.threats = [...threats.value]
  }
}

function applyShipDamage() {
  if (shipDamageInput.value > 0) {
    damageShip(shipDamageInput.value)
    shipDamageInput.value = 0
  }
}

function applyThreatDamage(index: number, threatId: string) {
  const amount = threatDamageInputs.value[threatId] || 0
  if (amount > 0) {
    damageThreat(index, amount)
    threatDamageInputs.value[threatId] = 0
  }
}

// Custom ship editor
function openCustomShipEditor(ship?: CustomShip) {
  editingCustomShip.value = ship ? { ...ship } : createEmptyCustomShip()
  showCustomShipEditor.value = true
}

function saveCustomShip() {
  if (!editingCustomShip.value) return

  const idx = customShips.value.findIndex(s => s.id === editingCustomShip.value!.id)
  if (idx !== -1) {
    customShips.value[idx] = editingCustomShip.value
  } else {
    customShips.value.push(editingCustomShip.value)
  }

  saveCustomShips()
  showCustomShipEditor.value = false
  editingCustomShip.value = null
}

function deleteCustomShip(id: string) {
  customShips.value = customShips.value.filter(s => s.id !== id)
  saveCustomShips()
  if (selectedShipId.value === id) {
    selectedShipId.value = 'explorer'
  }
}

// Player view
function openPlayerView() {
  store.openPlayerView()
}

const copySuccess = ref(false)
async function copyShareLink() {
  const url = store.generateShareUrl()
  await navigator.clipboard.writeText(url)
  copySuccess.value = true
  setTimeout(() => copySuccess.value = false, 2000)
}
</script>

<template>
  <div class="starship-panel">
    <!-- Header with tabs -->
    <header class="panel-header">
      <div class="header-title">
        <span class="title-icon">[*]</span>
        <span>STARSHIP SCENES</span>
      </div>

      <nav class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'roles' }"
          @click="activeTab = 'roles'"
        >
          Roles
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'scene' }"
          @click="activeTab = 'scene'"
        >
          Scene
          <span v-if="isSceneRunning" class="live-dot"></span>
        </button>
      </nav>
    </header>

    <!-- ROLES TAB -->
    <div v-if="activeTab === 'roles'" class="tab-content">
      <div class="roles-toolbar">
        <div class="role-selector">
          <select v-model="roleToAdd" class="input">
            <option value="">Select a role to add...</option>
            <optgroup label="Core Roles">
              <option v-for="role in STARSHIP_ROLES" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </optgroup>
            <optgroup v-if="store.state.customRoles.length > 0" label="Custom Roles">
              <option v-for="role in store.state.customRoles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </optgroup>
          </select>
          <button class="btn btn-primary" @click="addRoleToDeck" :disabled="!roleToAdd">
            Add Role
          </button>
        </div>

        <div class="roles-actions">
          <button class="btn btn-secondary" @click="showPdfExport = true">
            Print Role Cards
          </button>
          <button class="btn btn-secondary" @click="openCustomRoleBuilder()">
            + Custom Role
          </button>
          <button
            v-if="selectedRoleCards.length > 0"
            class="btn btn-danger btn-sm"
            @click="clearRoleDeck"
          >
            Clear All
          </button>
        </div>

        <!-- Custom Roles Management -->
        <div v-if="store.state.customRoles.length > 0" class="custom-roles-list">
          <span class="custom-roles-label">Custom Roles:</span>
          <div class="custom-role-chips">
            <div v-for="role in store.state.customRoles" :key="role.id" class="custom-role-chip">
              <span class="chip-name">{{ role.name }}</span>
              <button class="chip-btn edit" @click="openCustomRoleBuilder(role)" title="Edit">&#9998;</button>
              <button class="chip-btn delete" @click="deleteCustomRole(role.id)" title="Delete">&times;</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedRoleCards.length === 0" class="empty-state">
        <p>No roles selected. Use the dropdown above to add roles to your deck.</p>
        <p class="hint">You can add multiple of the same role (e.g., 2 Gunners).</p>
      </div>

      <div v-else class="roles-grid">
        <div v-for="instance in selectedRoleCards" :key="instance.instanceId" class="role-wrapper">
          <button
            class="remove-role-btn"
            @click="removeRoleFromDeck(instance.instanceId)"
            title="Remove this role"
          >
            &times;
          </button>
          <RoleCard
            :role="instance.role"
            :show-actions="true"
          />
        </div>
      </div>
    </div>

    <!-- SCENE TAB -->
    <div v-if="activeTab === 'scene'" class="tab-content">
      <!-- Not running: Setup -->
      <template v-if="!isSceneRunning">
        <div class="scene-setup">
          <!-- Ship Selection -->
          <section class="setup-section">
            <h3 class="section-title">Select Starship</h3>

            <div class="ship-selector">
              <select v-model="selectedShipId" class="input">
                <optgroup label="Pre-built Ships">
                  <option v-for="t in STARSHIP_TEMPLATES" :key="t.id" :value="t.id">
                    {{ t.name }} - {{ t.description.substring(0, 50) }}...
                  </option>
                </optgroup>
                <optgroup v-if="customShips.length > 0" label="Custom Ships">
                  <option v-for="s in customShips" :key="s.id" :value="s.id">
                    {{ s.name }} (Level {{ s.level }})
                  </option>
                </optgroup>
              </select>

              <button class="btn btn-secondary" @click="openCustomShipEditor()">
                + Custom Ship
              </button>
              <button
                v-if="customShips.find(s => s.id === selectedShipId)"
                class="btn btn-danger btn-sm"
                @click="deleteCustomShip(selectedShipId)"
                title="Delete custom ship"
              >
                &times;
              </button>
            </div>

            <!-- Level selector for templates -->
            <div v-if="!customShips.find(s => s.id === selectedShipId)" class="level-row">
              <label>Scene Level:</label>
              <input
                type="number"
                v-model.number="sceneLevel"
                min="1"
                max="20"
                class="input input-sm"
              />
            </div>

            <!-- Ship Stats Preview -->
            <div v-if="currentShip" class="ship-preview panel">
              <div class="ship-name">{{ currentShip.name }}</div>
              <div class="ship-stats">
                <div class="stat">
                  <span class="stat-label">AC</span>
                  <span class="stat-value">{{ currentShip.ac }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Fort</span>
                  <span class="stat-value">+{{ currentShip.fortitude }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Ref</span>
                  <span class="stat-value">+{{ currentShip.reflex }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">HP</span>
                  <span class="stat-value">{{ currentShip.maxHP }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Shields</span>
                  <span class="stat-value">{{ currentShip.maxShields }} (+{{ currentShip.shieldRegen }}/rd)</span>
                </div>
              </div>
              <div v-if="Object.keys(currentShip.bonuses).length > 0" class="ship-bonuses">
                <span v-for="(val, key) in currentShip.bonuses" :key="key" class="bonus-tag">
                  {{ key }} +{{ val }}
                </span>
              </div>
            </div>
          </section>

          <!-- Threats -->
          <section class="setup-section">
            <div class="section-header">
              <h3 class="section-title">Threats</h3>
              <button class="btn btn-secondary btn-sm" @click="addThreat">+ Add Threat</button>
            </div>

            <div v-if="threats.length === 0" class="empty-state">
              No threats added. Add enemy ships or hazards.
            </div>

            <div v-else class="threats-list">
              <div v-for="(threat, idx) in threats" :key="threat.id" class="threat-card panel">
                <div class="threat-header">
                  <input
                    :value="threat.name"
                    @input="updateThreat(idx, 'name', ($event.target as HTMLInputElement).value)"
                    class="input threat-name-input"
                    placeholder="Threat name"
                  />
                  <button class="btn-icon" @click="removeThreat(idx)">&times;</button>
                </div>
                <div class="threat-stats">
                  <label>
                    <span>Level</span>
                    <input
                      type="number"
                      :value="threat.level"
                      @input="updateThreat(idx, 'level', parseInt(($event.target as HTMLInputElement).value) || 1)"
                      class="input input-sm"
                      min="1"
                    />
                  </label>
                  <label>
                    <span>HP</span>
                    <input
                      type="number"
                      :value="threat.maxHP"
                      @input="updateThreat(idx, 'maxHP', parseInt(($event.target as HTMLInputElement).value) || 1); updateThreat(idx, 'currentHP', parseInt(($event.target as HTMLInputElement).value) || 1)"
                      class="input input-sm"
                      min="1"
                    />
                  </label>
                  <label>
                    <span>Shields</span>
                    <input
                      type="number"
                      :value="threat.maxShields"
                      @input="updateThreat(idx, 'maxShields', parseInt(($event.target as HTMLInputElement).value) || 0); updateThreat(idx, 'currentShields', parseInt(($event.target as HTMLInputElement).value) || 0)"
                      class="input input-sm"
                      min="0"
                    />
                  </label>
                  <label>
                    <span>AC</span>
                    <input
                      type="number"
                      :value="threat.ac"
                      @input="updateThreat(idx, 'ac', parseInt(($event.target as HTMLInputElement).value) || 10)"
                      class="input input-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <!-- Start Button -->
          <div class="start-row">
            <button class="btn btn-primary btn-lg" @click="startScene" :disabled="!currentShip">
              Start Scene
            </button>
          </div>
        </div>
      </template>

      <!-- Running: Scene Runner -->
      <template v-else>
        <div class="scene-runner">
          <!-- Top bar -->
          <div class="runner-header">
            <div class="round-display">
              <span class="round-label">Round</span>
              <span class="round-number">{{ currentRound }}</span>
              <button class="btn btn-sm" @click="nextRound">Next Round</button>
            </div>
            <div class="runner-actions">
              <button class="btn btn-accent btn-sm" @click="openPlayerView">Player View</button>
              <button class="btn btn-secondary btn-sm" @click="copyShareLink">
                {{ copySuccess ? 'Copied!' : 'Copy Link' }}
              </button>
              <button class="btn btn-danger btn-sm" @click="endScene">End Scene</button>
            </div>
          </div>

          <!-- Ship Status -->
          <section v-if="currentShip" class="ship-status panel">
            <h3 class="ship-status-name">{{ currentShip.name }}</h3>

            <div class="hp-bars">
              <div class="hp-bar-group">
                <div class="hp-label">
                  <span>Shields</span>
                  <span>{{ shipCurrentShields }} / {{ currentShip.maxShields }}</span>
                </div>
                <div class="hp-bar">
                  <div
                    class="hp-fill shields"
                    :style="{ width: (shipCurrentShields / currentShip.maxShields * 100) + '%' }"
                  ></div>
                </div>
              </div>
              <div class="hp-bar-group">
                <div class="hp-label">
                  <span>Hull</span>
                  <span>{{ shipCurrentHP }} / {{ currentShip.maxHP }}</span>
                </div>
                <div class="hp-bar">
                  <div
                    class="hp-fill hull"
                    :style="{ width: (shipCurrentHP / currentShip.maxHP * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="damage-controls">
              <input
                type="number"
                v-model.number="shipDamageInput"
                class="input input-sm damage-input"
                placeholder="Damage"
                min="0"
                @keyup.enter="applyShipDamage"
              />
              <button class="btn btn-danger btn-sm" @click="applyShipDamage">Damage</button>
              <button class="btn btn-success btn-sm" @click="healShip(shipDamageInput); shipDamageInput = 0">Heal</button>
            </div>
          </section>

          <!-- Threats -->
          <section v-if="threats.length > 0" class="threats-section">
            <h3 class="section-title">Threats</h3>
            <div class="threats-grid">
              <div
                v-for="(threat, idx) in threats"
                :key="threat.id"
                class="threat-runner-card panel"
                :class="{ defeated: threat.isDefeated }"
              >
                <div class="threat-name">{{ threat.name }}</div>

                <!-- Shields bar (if has shields) -->
                <div v-if="threat.maxShields && threat.maxShields > 0" class="threat-stat-row">
                  <span class="stat-label">Shields</span>
                  <span class="stat-numbers">{{ threat.currentShields }} / {{ threat.maxShields }}</span>
                </div>
                <div v-if="threat.maxShields && threat.maxShields > 0" class="hp-bar hp-bar-sm">
                  <div
                    class="hp-fill shields"
                    :style="{ width: ((threat.currentShields || 0) / (threat.maxShields || 1) * 100) + '%' }"
                  ></div>
                </div>

                <!-- HP bar -->
                <div class="threat-stat-row">
                  <span class="stat-label">HP</span>
                  <span class="stat-numbers">{{ threat.currentHP }} / {{ threat.maxHP }}</span>
                </div>
                <div class="hp-bar hp-bar-sm">
                  <div
                    class="hp-fill threat"
                    :style="{ width: ((threat.currentHP || 0) / (threat.maxHP || 1) * 100) + '%' }"
                  ></div>
                </div>

                <div class="threat-controls">
                  <input
                    type="number"
                    :value="threatDamageInputs[threat.id] || 0"
                    @input="threatDamageInputs[threat.id] = parseInt(($event.target as HTMLInputElement).value) || 0"
                    class="input input-xs damage-input"
                    placeholder="Dmg"
                    min="0"
                    @keyup.enter="applyThreatDamage(idx, threat.id)"
                  />
                  <button class="btn btn-danger btn-xs" @click="applyThreatDamage(idx, threat.id)">Damage</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <!-- PDF Export -->
      <div v-if="showPdfExport" class="modal-overlay" @click.self="showPdfExport = false">
        <div class="modal-content">
          <RolePdfExport :roles="rolesForExport" @close="showPdfExport = false" />
        </div>
      </div>

      <!-- Custom Role Builder -->
      <div v-if="showCustomRoleBuilder" class="modal-overlay" @click.self="closeCustomRoleBuilder">
        <div class="modal-content modal-lg">
          <CustomRoleBuilder :editing-role="editingCustomRole" @close="closeCustomRoleBuilder" />
        </div>
      </div>

      <!-- Custom Ship Editor -->
      <div v-if="showCustomShipEditor" class="modal-overlay" @click.self="showCustomShipEditor = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ editingCustomShip?.id ? 'Edit' : 'New' }} Custom Ship</h3>
            <button class="btn-icon" @click="showCustomShipEditor = false">&times;</button>
          </div>

          <div v-if="editingCustomShip" class="modal-body">
            <label class="form-field">
              <span>Ship Name</span>
              <input v-model="editingCustomShip.name" class="input" placeholder="Ship name" />
            </label>

            <div class="form-row">
              <label class="form-field">
                <span>Level</span>
                <input type="number" v-model.number="editingCustomShip.level" class="input" min="1" max="20" />
              </label>
              <label class="form-field">
                <span>AC</span>
                <input type="number" v-model.number="editingCustomShip.ac" class="input" />
              </label>
            </div>

            <div class="form-row">
              <label class="form-field">
                <span>Fortitude</span>
                <input type="number" v-model.number="editingCustomShip.fortitude" class="input" />
              </label>
              <label class="form-field">
                <span>Reflex</span>
                <input type="number" v-model.number="editingCustomShip.reflex" class="input" />
              </label>
            </div>

            <div class="form-row">
              <label class="form-field">
                <span>Max HP</span>
                <input type="number" v-model.number="editingCustomShip.maxHP" class="input" min="1" />
              </label>
              <label class="form-field">
                <span>Max Shields</span>
                <input type="number" v-model.number="editingCustomShip.maxShields" class="input" min="0" />
              </label>
              <label class="form-field">
                <span>Shield Regen</span>
                <input type="number" v-model.number="editingCustomShip.shieldRegen" class="input" min="0" />
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCustomShipEditor = false">Cancel</button>
            <button class="btn btn-primary" @click="saveCustomShip">Save Ship</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.starship-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.title-icon {
  font-family: 'JetBrains Mono', monospace;
}

.tabs {
  display: flex;
  gap: 0.25rem;
}

.tab {
  position: relative;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.tab.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
}

.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 6px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* ROLES TAB */
.roles-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.role-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-selector select {
  flex: 1;
  min-width: 200px;
}

.roles-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  background: transparent;
}

.role-wrapper {
  position: relative;
  background: transparent;
}

.remove-role-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 10;
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--color-bg);
  border: 2px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.remove-role-btn:hover {
  background: var(--color-danger);
  color: white;
  transform: scale(1.1);
}

.hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

/* Custom Roles Management */
.custom-roles-list {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 0;
  border-top: 1px solid var(--color-border);
}

.custom-roles-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.custom-role-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.custom-role-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--color-bg-surface-rgb, 20, 22, 28), 0.7);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.chip-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.chip-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.chip-btn.edit {
  color: var(--color-accent);
}

.chip-btn.edit:hover {
  background: var(--color-accent);
  color: var(--color-bg);
  border-color: var(--color-accent);
}

.chip-btn.delete {
  color: var(--color-danger);
}

.chip-btn.delete:hover {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

/* SCENE TAB */
.scene-setup {
  max-width: 800px;
  margin: 0 auto;
}

.setup-section {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.section-header .section-title {
  margin-bottom: 0;
}

.ship-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.ship-selector select {
  flex: 1;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.level-row .input-sm {
  width: 80px;
}

.ship-preview {
  padding: 1rem;
  border-radius: var(--radius-md);
}

.ship-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 0.75rem;
}

.ship-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.ship-bonuses {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.bonus-tag {
  padding: 0.125rem 0.5rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-dim);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.threats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.threat-card {
  padding: 0.75rem;
  border-radius: var(--radius-md);
}

.threat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.threat-name-input {
  flex: 1;
  font-weight: 600;
}

.threat-stats {
  display: flex;
  gap: 1rem;
}

.threat-stats label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.threat-stats .input-sm {
  width: 70px;
}

.start-row {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
}

/* SCENE RUNNER */
.scene-runner {
  max-width: 900px;
  margin: 0 auto;
}

.runner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.round-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.round-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-number {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-accent);
}

.runner-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ship-status {
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.ship-status-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 1rem;
}

.hp-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.hp-bar-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.hp-bar {
  height: 20px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.hp-fill.shields {
  background: var(--color-info);
}

.hp-fill.hull {
  background: var(--color-success);
}

.hp-fill.threat {
  background: var(--color-danger);
}

.damage-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.divider {
  color: var(--color-border);
}

.threats-section {
  margin-top: 1.5rem;
}

.threats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.threat-runner-card {
  padding: 0.75rem;
  border-radius: var(--radius-md);
  transition: opacity 0.3s ease;
}

.threat-runner-card.defeated {
  opacity: 0.5;
}

.threat-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.threat-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin-bottom: 0.125rem;
}

.stat-numbers {
  font-family: 'JetBrains Mono', monospace;
}

.hp-bar-sm {
  height: 12px;
  margin-bottom: 0.5rem;
}

.threat-controls {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.damage-input {
  width: 70px;
  text-align: center;
}

.input-xs {
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
  width: 60px;
}

/* FORMS */
.input {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-sm {
  padding: 0.375rem 0.5rem;
  font-size: 0.8rem;
}

/* BUTTONS */
.btn-icon {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.btn-icon:hover {
  color: var(--color-danger);
}

.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}

.btn-accent {
  background: var(--color-accent);
  color: var(--color-bg);
  border-color: var(--color-accent);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.btn-success {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.modal-lg {
  width: 700px;
}

.modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  min-width: 400px;
  max-width: 500px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-accent);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field span {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-field {
  flex: 1;
}
</style>
