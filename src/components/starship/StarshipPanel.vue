<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { getRoleName, getRoleColor, STARSHIP_ROLES } from '../../data/starshipRoles'
import { OFFICIAL_SCENES, cloneOfficialScene } from '../../data/starshipScenes'
import type { StarshipThreat, SavedScene, StarshipAction } from '../../types/starship'
import { createDefaultThreat, createEmptySavedScene } from '../../types/starship'
import ActionEditor from './ActionEditor.vue'

const store = useStarshipStore()

// Scene state
const isSceneRunning = ref(false)
const currentRound = ref(1)

// Scene-first setup: activeSetup holds the loaded/editable scene data
const activeSetup = ref<SavedScene | null>(null)

// Scene selector
const selectedExample = ref<string>('')
const previewScene = ref<SavedScene | null>(null)

watch(selectedExample, (id) => {
  previewScene.value = id ? OFFICIAL_SCENES.find(s => s.id === id) || null : null
})

// Damage input state
const shipDamageInput = ref(0)
const threatDamageInputs = ref<Record<string, number>>({})

// Ship HP tracking during scene run
const shipCurrentHP = ref(0)
const shipCurrentShields = ref(0)

onMounted(() => {
  store.setGMView(true)
})

// ============ Scene Setup ============

function loadExampleScene() {
  if (!previewScene.value) return

  const scene = cloneOfficialScene(previewScene.value)
  activeSetup.value = scene

  // Reset selector (keep the preview visible until a new selection)
  selectedExample.value = ''
  previewScene.value = null
}

function loadCustomScene() {
  activeSetup.value = createEmptySavedScene()
}

function startScene() {
  if (!activeSetup.value) return

  const setup = activeSetup.value
  shipCurrentHP.value = setup.starship.maxHP
  shipCurrentShields.value = setup.starship.maxShields
  currentRound.value = 1
  isSceneRunning.value = true

  // Update store for player view sync
  store.state.activeScene = {
    id: crypto.randomUUID(),
    name: setup.name,
    level: setup.level,
    description: setup.description,
    victoryCondition: setup.victoryCondition,
    vpRequired: setup.vpRequired,
    customCondition: setup.customCondition,
    starship: {
      id: crypto.randomUUID(),
      name: setup.starship.name,
      level: setup.starship.level,
      ac: setup.starship.ac,
      fortitude: setup.starship.fortitude,
      reflex: setup.starship.reflex,
      maxShields: setup.starship.maxShields,
      currentShields: shipCurrentShields.value,
      shieldRegen: setup.starship.shieldRegen,
      maxHP: setup.starship.maxHP,
      currentHP: shipCurrentHP.value,
      bonuses: setup.starship.bonuses
    },
    threats: setup.threats,
    roles: [],
    availableRoles: [...setup.availableRoles],
    starshipActions: [...setup.starshipActions],
    partySize: setup.partySize ?? 4,
    additionalObjectives: [...(setup.additionalObjectives ?? [])],
    roleDescriptions: { ...(setup.roleDescriptions ?? {}) },
    currentRound: 1,
    currentVP: 0,
    isActive: true,
    actionLog: [],
    initiativeOrder: [],
    currentTurnIndex: 0,
    initiativeRolled: false
  }
}

function endScene() {
  isSceneRunning.value = false
  store.endScene()
}

function nextRound() {
  currentRound.value++
  if (activeSetup.value) {
    shipCurrentShields.value = Math.min(
      activeSetup.value.starship.maxShields,
      shipCurrentShields.value + activeSetup.value.starship.shieldRegen
    )
    // Regenerate threat shields
    for (const threat of activeSetup.value.threats) {
      if (threat.isDefeated) continue
      if (threat.shieldRegen && threat.shieldRegen > 0 && threat.maxShields && threat.currentShields !== undefined) {
        threat.currentShields = Math.min(threat.maxShields, threat.currentShields + threat.shieldRegen)
      }
    }
  }
  if (store.state.activeScene) {
    store.state.activeScene.currentRound = currentRound.value
    store.state.activeScene.starship.currentShields = shipCurrentShields.value
    if (activeSetup.value) {
      store.state.activeScene.threats = [...activeSetup.value.threats]
    }
  }
}

function damageShip(amount: number) {
  let remaining = amount
  if (shipCurrentShields.value > 0) {
    const shieldDmg = Math.min(shipCurrentShields.value, remaining)
    shipCurrentShields.value -= shieldDmg
    remaining -= shieldDmg
  }
  if (remaining > 0) {
    shipCurrentHP.value = Math.max(0, shipCurrentHP.value - remaining)
  }
  if (store.state.activeScene) {
    store.state.activeScene.starship.currentShields = shipCurrentShields.value
    store.state.activeScene.starship.currentHP = shipCurrentHP.value
  }
}

function healShip(amount: number) {
  if (activeSetup.value) {
    shipCurrentHP.value = Math.min(activeSetup.value.starship.maxHP, shipCurrentHP.value + amount)
    if (store.state.activeScene) {
      store.state.activeScene.starship.currentHP = shipCurrentHP.value
    }
  }
}

// ============ Threat Management (setup) ============

function addThreat() {
  if (!activeSetup.value) return
  activeSetup.value.threats.push(createDefaultThreat())
}

function updateThreat(index: number, field: keyof StarshipThreat, value: unknown) {
  if (!activeSetup.value) return
  const t = activeSetup.value.threats[index]
  if (t) {
    (t as Record<string, unknown>)[field] = value
    if (store.state.activeScene) {
      store.state.activeScene.threats = [...activeSetup.value.threats]
    }
  }
}

function removeThreat(index: number) {
  if (!activeSetup.value) return
  activeSetup.value.threats.splice(index, 1)
  if (store.state.activeScene) {
    store.state.activeScene.threats = [...activeSetup.value.threats]
  }
}

function damageThreat(index: number, amount: number) {
  if (!activeSetup.value) return
  const threat = activeSetup.value.threats[index]
  if (!threat) return

  let remaining = amount
  if (threat.currentShields !== undefined && threat.currentShields > 0) {
    const shieldDmg = Math.min(threat.currentShields, remaining)
    threat.currentShields -= shieldDmg
    remaining -= shieldDmg
  }
  if (remaining > 0 && threat.currentHP !== undefined) {
    threat.currentHP = Math.max(0, threat.currentHP - remaining)
    if (threat.currentHP === 0) {
      threat.isDefeated = true
    }
  }
  if (store.state.activeScene) {
    store.state.activeScene.threats = [...activeSetup.value.threats]
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

// ============ Role Management (setup) ============

const customRoleName = ref('')

function addRole(roleId: string) {
  if (!activeSetup.value || !roleId) return
  activeSetup.value.availableRoles.push(roleId)
}

function addCustomRole() {
  if (!activeSetup.value || !customRoleName.value.trim()) return
  // Convert to snake_case id: "Social Media Manager" → "social_media_manager"
  const id = customRoleName.value.trim().toLowerCase().replace(/\s+/g, '_')
  activeSetup.value.availableRoles.push(id)
  customRoleName.value = ''
}

function removeRole(index: number) {
  if (!activeSetup.value) return
  activeSetup.value.availableRoles.splice(index, 1)
}

// ============ Action Management (setup) ============

const editingActionId = ref<string | null>(null)

function addAction() {
  if (!activeSetup.value) return
  const action: StarshipAction = {
    id: crypto.randomUUID(),
    name: 'New Action',
    actionCost: 2,
    role: 'any',
    skills: [],
    description: '',
    outcomes: { criticalSuccess: '', success: '' }
  }
  activeSetup.value.starshipActions.push(action)
  editingActionId.value = action.id
}

function addQuickWeapon() {
  if (!activeSetup.value) return
  const action: StarshipAction = {
    id: crypto.randomUUID(),
    name: 'Ship Weapon',
    actionCost: 2,
    role: 'gunner',
    skills: [],
    description: 'Fire a ship weapon at a threat.',
    isAttack: true,
    damage: '2d10+8',
    traits: [],
    outcomes: {
      criticalSuccess: 'Double damage.',
      success: 'Full damage.',
      failure: 'Miss.',
      criticalFailure: 'Miss and the weapon jams until repaired.'
    }
  }
  activeSetup.value.starshipActions.push(action)
  editingActionId.value = action.id
}

function updateAction(index: number, action: StarshipAction) {
  if (!activeSetup.value) return
  activeSetup.value.starshipActions[index] = action
}

function removeAction(index: number) {
  if (!activeSetup.value) return
  const removed = activeSetup.value.starshipActions[index]
  activeSetup.value.starshipActions.splice(index, 1)
  if (editingActionId.value === removed?.id) {
    editingActionId.value = null
  }
}

// Group actions by role for display
function getActionsGroupedByRole(): { role: string; actions: { action: StarshipAction; index: number }[] }[] {
  if (!activeSetup.value) return []
  const groups = new Map<string, { action: StarshipAction; index: number }[]>()
  activeSetup.value.starshipActions.forEach((action, index) => {
    const role = action.role
    if (!groups.has(role)) groups.set(role, [])
    groups.get(role)!.push({ action, index })
  })
  return Array.from(groups.entries()).map(([role, actions]) => ({ role, actions }))
}

// ============ Role Descriptions ============

function updateRoleDescription(roleId: string, desc: string) {
  if (!activeSetup.value) return
  if (!activeSetup.value.roleDescriptions) {
    activeSetup.value.roleDescriptions = {}
  }
  if (desc.trim()) {
    activeSetup.value.roleDescriptions[roleId] = desc
  } else {
    delete activeSetup.value.roleDescriptions[roleId]
  }
}

// ============ Party Size ============

function updatePartySize(size: number) {
  if (!activeSetup.value) return
  activeSetup.value.partySize = Math.max(1, Math.min(8, size))
}

// ============ Player View ============

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
    <!-- Header -->
    <header class="panel-header">
      <div class="header-title">
        <span class="title-icon">[*]</span>
        <span>STARSHIP SCENES</span>
        <span v-if="isSceneRunning" class="live-dot"></span>
      </div>
    </header>

    <!-- SCENE CONTENT -->
    <div class="tab-content">
      <!-- Not running: Setup -->
      <template v-if="!isSceneRunning">
        <div class="scene-setup">
          <!-- Scene Selector -->
          <section class="setup-section">
            <h3 class="section-title">Load a Scene</h3>
            <div class="example-selector">
              <select v-model="selectedExample" class="input">
                <option value="">Choose an official scene...</option>
                <option
                  v-for="scene in OFFICIAL_SCENES"
                  :key="scene.id"
                  :value="scene.id"
                >
                  {{ scene.name }} (Level {{ scene.level }})
                </option>
              </select>
              <button
                class="btn btn-primary"
                :disabled="!selectedExample"
                @click="loadExampleScene"
              >
                Load
              </button>
            </div>

            <!-- Preview card -->
            <div v-if="previewScene" class="example-preview panel">
              <div class="example-preview-header">
                <span class="example-preview-name">{{ previewScene.name }}</span>
                <span class="example-preview-level">Level {{ previewScene.level }}</span>
              </div>
              <p class="example-preview-desc">{{ previewScene.description }}</p>
              <div class="example-preview-meta">
                <span class="meta-tag">
                  {{ previewScene.starship.name }}
                  &mdash; HP {{ previewScene.starship.maxHP }} / Shields {{ previewScene.starship.maxShields }}
                </span>
                <span class="meta-tag threats-tag">
                  {{ previewScene.threats.length }} threat{{ previewScene.threats.length === 1 ? '' : 's' }}
                </span>
                <span v-if="previewScene.vpRequired" class="meta-tag vp-tag">
                  {{ previewScene.vpRequired }} VP required
                </span>
              </div>
              <!-- Roles preview -->
              <div class="preview-roles">
                <span
                  v-for="(roleId, idx) in previewScene.availableRoles"
                  :key="idx"
                  class="role-chip"
                >
                  {{ getRoleName(roleId) }}
                </span>
              </div>
              <!-- Actions count -->
              <div class="preview-actions-summary">
                {{ previewScene.starshipActions.length }} scene actions
              </div>
            </div>

            <div class="or-divider">
              <span>or</span>
            </div>

            <button class="btn btn-secondary" @click="loadCustomScene">
              Create Custom Scene
            </button>
          </section>

          <!-- Loaded Setup -->
          <template v-if="activeSetup">
            <!-- Scene Info (editable) -->
            <section class="setup-section">
              <h3 class="section-title">Scene Details</h3>
              <div class="scene-info-row">
                <label class="form-field flex-1">
                  <span>Name</span>
                  <input v-model="activeSetup.name" class="input" placeholder="Scene name" />
                </label>
                <label class="form-field" style="width: 80px;">
                  <span>Level</span>
                  <input type="number" v-model.number="activeSetup.level" class="input" min="1" max="20" />
                </label>
                <label class="form-field" style="width: 80px;">
                  <span>Party</span>
                  <input type="number" :value="activeSetup.partySize ?? 4" @input="updatePartySize(parseInt(($event.target as HTMLInputElement).value) || 4)" class="input" min="1" max="8" />
                </label>
              </div>
              <p v-if="(activeSetup.partySize ?? 4) > 4" class="scaling-hint">
                Consider increasing VP targets by {{ ((activeSetup.partySize ?? 4) - 4) * 2 }} for {{ activeSetup.partySize }} players.
              </p>
              <label class="form-field">
                <span>Description</span>
                <textarea v-model="activeSetup.description" class="input textarea" rows="2" placeholder="Scene description..."></textarea>
              </label>
            </section>

            <!-- Ship Stats (inline editable) -->
            <section class="setup-section">
              <h3 class="section-title">{{ activeSetup.starship.name }}</h3>
              <div class="ship-stats">
                <div class="stat">
                  <span class="stat-label">AC</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.ac" />
                </div>
                <div class="stat">
                  <span class="stat-label">Fort</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.fortitude" />
                </div>
                <div class="stat">
                  <span class="stat-label">Ref</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.reflex" />
                </div>
                <div class="stat">
                  <span class="stat-label">HP</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.maxHP" />
                </div>
                <div class="stat">
                  <span class="stat-label">Shields</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.maxShields" />
                </div>
                <div class="stat">
                  <span class="stat-label">Regen</span>
                  <input type="number" class="stat-input" v-model.number="activeSetup.starship.shieldRegen" />
                </div>
              </div>
              <div v-if="Object.keys(activeSetup.starship.bonuses).length > 0" class="ship-bonuses">
                <span v-for="(val, key) in activeSetup.starship.bonuses" :key="key" class="bonus-tag">
                  {{ key }} +{{ val }}
                </span>
              </div>
            </section>

            <!-- Roles -->
            <section class="setup-section">
              <div class="section-header">
                <h3 class="section-title">Crew Roles</h3>
                <select class="input role-add-select" @change="addRole(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
                  <option value="">+ Standard Role</option>
                  <option v-for="role in STARSHIP_ROLES" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <div class="custom-role-row">
                <input
                  v-model="customRoleName"
                  class="input custom-role-input"
                  placeholder="Custom role name..."
                  @keyup.enter="addCustomRole"
                />
                <button class="btn btn-secondary btn-sm" :disabled="!customRoleName.trim()" @click="addCustomRole">
                  + Custom
                </button>
              </div>

              <div v-if="activeSetup.availableRoles.length === 0" class="empty-state empty-state-sm">
                No roles assigned. Add crew roles above.
              </div>

              <div v-else class="role-chips-section">
                <div class="role-chips">
                  <span
                    v-for="(roleId, idx) in activeSetup.availableRoles"
                    :key="idx"
                    class="role-chip removable"
                    :style="{ borderColor: getRoleColor(roleId), color: getRoleColor(roleId) }"
                    @click="removeRole(idx)"
                    :title="'Click to remove ' + getRoleName(roleId)"
                  >
                    {{ getRoleName(roleId) }}
                    <span class="role-remove">&times;</span>
                  </span>
                </div>

                <!-- Role Descriptions -->
                <div class="role-descriptions">
                  <div
                    v-for="roleId in [...new Set(activeSetup.availableRoles)]"
                    :key="'desc-' + roleId"
                    class="role-desc-row"
                  >
                    <label class="role-desc-label" :style="{ color: getRoleColor(roleId) }">
                      {{ getRoleName(roleId) }}
                    </label>
                    <textarea
                      class="input textarea role-desc-textarea"
                      :value="activeSetup.roleDescriptions?.[roleId] ?? ''"
                      @input="updateRoleDescription(roleId, ($event.target as HTMLTextAreaElement).value)"
                      :placeholder="'Describe what the ' + getRoleName(roleId).toLowerCase() + ' does in this scene...'"
                      rows="1"
                    ></textarea>
                  </div>
                </div>
              </div>
            </section>

            <!-- Actions (Editable) -->
            <section class="setup-section">
              <div class="section-header">
                <h3 class="section-title">Scene Actions ({{ activeSetup.starshipActions.length }})</h3>
                <div class="action-add-buttons">
                  <button class="btn btn-secondary btn-sm" @click="addAction">+ Add Action</button>
                  <button class="btn btn-secondary btn-sm" @click="addQuickWeapon">+ Quick Weapon</button>
                </div>
              </div>

              <div v-if="activeSetup.starshipActions.length === 0" class="empty-state empty-state-sm">
                No actions yet. Add crew actions or quick weapons above.
              </div>

              <div v-else class="actions-editor-list">
                <template v-for="group in getActionsGroupedByRole()" :key="group.role">
                  <div class="action-group-header" :style="{ color: getRoleColor(group.role) }">
                    {{ group.role === 'any' ? 'Any Role' : getRoleName(group.role) }}
                  </div>
                  <div v-for="{ action, index } in group.actions" :key="action.id">
                    <!-- Expanded editor -->
                    <ActionEditor
                      v-if="editingActionId === action.id"
                      :action="action"
                      :available-roles="activeSetup.availableRoles"
                      @update="(a) => updateAction(index, a)"
                      @remove="removeAction(index)"
                      @close="editingActionId = null"
                    />
                    <!-- Collapsed summary -->
                    <div v-else class="action-item clickable" @click="editingActionId = action.id">
                      <span class="action-name">{{ action.name }}</span>
                      <span v-if="action.isAttack" class="action-attack-badge">ATK</span>
                      <span class="action-cost">{{ action.actionCost }}A</span>
                      <button class="btn-icon-sm" @click.stop="removeAction(index)">&times;</button>
                    </div>
                  </div>
                </template>
              </div>
            </section>

            <!-- Threats -->
            <section class="setup-section">
              <div class="section-header">
                <h3 class="section-title">Threats</h3>
                <button class="btn btn-secondary btn-sm" @click="addThreat">+ Add Threat</button>
              </div>

              <div v-if="activeSetup.threats.length === 0" class="empty-state">
                No threats added. Add enemy ships or hazards.
              </div>

              <div v-else class="threats-list">
                <div v-for="(threat, idx) in activeSetup.threats" :key="threat.id" class="threat-card panel">
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
              <button class="btn btn-primary btn-lg" @click="startScene">
                Start Scene
              </button>
            </div>
          </template>
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
          <section v-if="activeSetup" class="ship-status panel">
            <h3 class="ship-status-name">{{ activeSetup.starship.name }}</h3>

            <div class="hp-bars">
              <div class="hp-bar-group">
                <div class="hp-label">
                  <span>Shields</span>
                  <span>{{ shipCurrentShields }} / {{ activeSetup.starship.maxShields }}</span>
                </div>
                <div class="hp-bar">
                  <div
                    class="hp-fill shields"
                    :style="{ width: (shipCurrentShields / activeSetup.starship.maxShields * 100) + '%' }"
                  ></div>
                </div>
              </div>
              <div class="hp-bar-group">
                <div class="hp-label">
                  <span>Hull</span>
                  <span>{{ shipCurrentHP }} / {{ activeSetup.starship.maxHP }}</span>
                </div>
                <div class="hp-bar">
                  <div
                    class="hp-fill hull"
                    :style="{ width: (shipCurrentHP / activeSetup.starship.maxHP * 100) + '%' }"
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
          <section v-if="activeSetup && activeSetup.threats.length > 0" class="threats-section">
            <h3 class="section-title">Threats</h3>
            <div class="threats-grid">
              <div
                v-for="(threat, idx) in activeSetup.threats"
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

/* SCENE SETUP */
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

/* EXAMPLE SELECTOR */
.example-selector {
  display: flex;
  gap: 0.5rem;
}

.example-selector select {
  flex: 1;
}

.or-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  color: var(--color-text-dim);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.or-divider::before,
.or-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-border);
}

.example-preview {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-accent);
}

.example-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.example-preview-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
}

.example-preview-level {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  padding: 0.125rem 0.5rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.example-preview-desc {
  font-size: 0.8125rem;
  color: var(--color-text-dim);
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
}

.example-preview-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.meta-tag {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.threats-tag {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.vp-tag {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.preview-roles {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.375rem;
}

.preview-actions-summary {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-style: italic;
}

/* Scene Info Editing */
.scene-info-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.flex-1 {
  flex: 1;
}

.textarea {
  resize: vertical;
  min-height: 50px;
  font-family: inherit;
}

/* SHIP STATS */
.ship-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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

.stat-input {
  width: 60px;
  padding: 0.25rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}

.stat-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Hide number input spinners */
.stat-input::-webkit-inner-spin-button,
.stat-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stat-input {
  -moz-appearance: textfield;
  appearance: textfield;
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

/* ROLE CHIPS */
.role-chips {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.role-chip {
  padding: 0.25rem 0.625rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.role-chip.removable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: opacity 0.15s ease;
}

.role-chip.removable:hover {
  opacity: 0.7;
}

.role-remove {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.6;
}

.role-add-select {
  width: auto;
  max-width: 160px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.custom-role-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.custom-role-input {
  flex: 1;
  font-size: 0.8125rem;
  padding: 0.375rem 0.625rem;
}

.empty-state-sm {
  padding: 1rem;
  font-size: 0.8125rem;
}

/* SCALING HINT */
.scaling-hint {
  margin: 0.25rem 0 0 0;
  font-size: 0.6875rem;
  color: var(--color-info);
  font-style: italic;
}

/* ROLE DESCRIPTIONS */
.role-chips-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-descriptions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.role-desc-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.role-desc-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-desc-textarea {
  min-height: 32px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

/* ACTIONS LIST (EDITABLE) */
.action-add-buttons {
  display: flex;
  gap: 0.375rem;
}

.actions-editor-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.action-group-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.375rem 0 0.125rem 0;
  border-bottom: 1px solid var(--color-border);
  margin-top: 0.25rem;
}

.action-group-header:first-child {
  margin-top: 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}

.action-item.clickable {
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.action-item.clickable:hover {
  border-color: var(--color-accent);
}

.action-name {
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-attack-badge {
  padding: 0.0625rem 0.25rem;
  background: var(--color-danger);
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.action-cost {
  font-size: 0.6875rem;
  color: var(--color-accent);
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.btn-icon-sm {
  padding: 0.125rem 0.375rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
}

.btn-icon-sm:hover {
  color: var(--color-danger);
}

/* THREATS */
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

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field span {
  font-size: 0.75rem;
  color: var(--color-text-dim);
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
</style>
