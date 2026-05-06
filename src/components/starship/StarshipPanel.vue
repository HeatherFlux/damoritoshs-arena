<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { getRoleName, getRoleColor, STARSHIP_ROLES } from '../../data/starshipRoles'
import { OFFICIAL_SCENES, cloneOfficialScene } from '../../data/starshipScenes'
import type { StarshipThreat, SavedScene, StarshipAction, VictoryCondition } from '../../types/starship'
import { createDefaultThreat, createEmptySavedScene } from '../../types/starship'
import ActionEditor from './ActionEditor.vue'
import VictoryConditionEditor from './VictoryConditionEditor.vue'
import ThreatCard from './ThreatCard.vue'
import SceneRunner from './SceneRunner.vue'

const store = useStarshipStore()

// Scene state — derived from store (persists across tab switches)
// The runtime ship/round state lives inside <SceneRunner /> now; this
// component only owns setup-mode state.
const isSceneRunning = computed(() => store.state.activeScene !== null)

// Scene-first setup: activeSetup holds the loaded/editable scene data
const activeSetup = ref<SavedScene | null>(null)

// Scene selector
const selectedExample = ref<string>('')
const previewScene = ref<SavedScene | null>(null)

watch(selectedExample, (id) => {
  previewScene.value = id ? OFFICIAL_SCENES.find(s => s.id === id) || null : null
})


onMounted(() => {
  store.setGMView(true)

  // If store already has an active scene (restored from localStorage), rebuild activeSetup
  if (store.state.activeScene) {
    const scene = store.state.activeScene
    activeSetup.value = {
      id: scene.id,
      name: scene.name,
      level: scene.level,
      description: scene.description,
      victoryCondition: scene.victoryCondition,
      vpRequired: scene.vpRequired,
      customCondition: scene.customCondition,
      starship: { ...scene.starship, bonuses: { ...scene.starship.bonuses } },
      threats: scene.threats.map(t => ({ ...t })),
      roles: [...(scene.roles ?? [])],
      availableRoles: [...(scene.availableRoles ?? [])],
      starshipActions: [...(scene.starshipActions ?? [])],
      partySize: scene.partySize,
      additionalObjectives: [...(scene.additionalObjectives ?? [])],
      roleDescriptions: { ...(scene.roleDescriptions ?? {}) },
      savedAt: Date.now()
    }
  }
})

function handleBeforeUnload() {
  store.disableRemoteSync()
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  store.disableRemoteSync()
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

  // Store is the source of truth — startScene sets activeScene
  store.startScene(setup)
}

// ============ Threat Management (setup) ============

function addThreat() {
  if (!activeSetup.value) return
  activeSetup.value.threats.push(createDefaultThreat())
}

function updateThreatFromCard(index: number, updates: Partial<StarshipThreat>) {
  if (!activeSetup.value) return
  activeSetup.value.threats[index] = { ...activeSetup.value.threats[index], ...updates }
}

function removeThreat(index: number) {
  if (!activeSetup.value) return
  activeSetup.value.threats.splice(index, 1)
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
  activeSetup.value.partySize = Math.max(1, Math.min(8, Math.floor(size)))
}

// ============ Setup Warnings ============

const setupWarnings = computed(() => {
  if (!activeSetup.value) return []
  const warnings: string[] = []
  if (activeSetup.value.threats.length === 0) {
    warnings.push('No threats added')
  }
  if (activeSetup.value.starshipActions.length === 0) {
    warnings.push('No scene actions defined')
  }
  if (activeSetup.value.availableRoles.length === 0) {
    warnings.push('No crew roles assigned')
  }
  if (activeSetup.value.victoryCondition === 'victory_points' && !activeSetup.value.vpRequired) {
    warnings.push('No VP target set')
  }
  if (activeSetup.value.victoryCondition === 'survival' && !activeSetup.value.survivalRounds) {
    warnings.push('No survival rounds set')
  }
  return warnings
})

// ============ Save / Load for Sidebar ============

const isEditingExistingScene = computed(() => {
  if (!activeSetup.value) return false
  return store.state.savedScenes.some(s => s.id === activeSetup.value!.id)
})

function saveCurrentSetup() {
  if (!activeSetup.value) return
  activeSetup.value.savedAt = Date.now()
  store.saveScene(activeSetup.value)
  store.state.editingSceneId = activeSetup.value.id
}

function saveAsNewScene() {
  if (!activeSetup.value) return
  // Clone the current setup with a fresh id and " (Copy)" suffix so the
  // user can safely diverge from the original saved scene.
  const clone: SavedScene = {
    ...JSON.parse(JSON.stringify(activeSetup.value)),
    id: crypto.randomUUID(),
    name: `${activeSetup.value.name || 'Untitled'} (Copy)`,
    savedAt: Date.now(),
  }
  const saved = store.saveScene(clone)
  // Switch the editing pointer to the new copy so subsequent "Save Changes"
  // updates the copy, not the original.
  activeSetup.value = JSON.parse(JSON.stringify(saved))
  store.state.editingSceneId = saved.id
}

function discardEdits() {
  // Reload the saved version, dropping unsaved edits.
  if (!activeSetup.value) return
  const original = store.state.savedScenes.find(s => s.id === activeSetup.value!.id)
  if (original) {
    activeSetup.value = JSON.parse(JSON.stringify(original))
  } else {
    activeSetup.value = null
    store.state.editingSceneId = null
  }
}

function loadSceneFromSidebar(scene: SavedScene) {
  activeSetup.value = JSON.parse(JSON.stringify(scene))
}

// ============ Starship Template Controls ============

const showSaveTemplateDialog = ref(false)
const templateDialogName = ref('')
const templateDialogDescription = ref('')
const templateDialogCampaign = ref(false)

function onTemplateSelect(templateId: string) {
  if (!activeSetup.value) return
  if (!templateId) {
    // User chose the placeholder — leave the current ship untouched.
    return
  }
  const ship = store.loadStarshipTemplate(templateId)
  if (ship) {
    activeSetup.value.starship = ship
  }
}

function unlinkTemplate() {
  if (!activeSetup.value) return
  activeSetup.value.starship.templateId = undefined
}

function openSaveTemplateDialog() {
  if (!activeSetup.value) return
  const linkedId = activeSetup.value.starship.templateId
  const linked = linkedId
    ? store.state.savedStarships.find(t => t.id === linkedId)
    : null
  templateDialogName.value = linked?.name ?? activeSetup.value.starship.name ?? ''
  templateDialogDescription.value = linked?.description ?? ''
  templateDialogCampaign.value = linked?.isCampaignShip ?? false
  showSaveTemplateDialog.value = true
}

function confirmSaveTemplate() {
  if (!activeSetup.value) return
  const name = templateDialogName.value.trim()
  if (!name) return
  // If the ship is already linked to a template, update that one in place;
  // otherwise crypto.randomUUID inside the store creates a new entry.
  const linkedId = activeSetup.value.starship.templateId
  const saved = store.saveStarshipTemplate({
    id: linkedId,
    name,
    description: templateDialogDescription.value || undefined,
    isCampaignShip: templateDialogCampaign.value,
    starship: activeSetup.value.starship,
  })
  // Make sure the live setup picks up the (possibly newly assigned) template id.
  activeSetup.value.starship.templateId = saved.id
  showSaveTemplateDialog.value = false
}

function deleteCurrentTemplate() {
  if (!activeSetup.value?.starship.templateId) return
  const id = activeSetup.value.starship.templateId
  if (!confirm('Delete this saved ship template? The current scene keeps its ship config — only the saved template is removed.')) return
  store.deleteStarshipTemplate(id)
  // Detach the live ship so the dropdown shows "— Load saved ship —" again.
  activeSetup.value.starship.templateId = undefined
  showSaveTemplateDialog.value = false
}

// Watch editingSceneId changes (from sidebar clicks)
watch(() => store.state.editingSceneId, (newId) => {
  if (!newId) return
  const scene = store.state.savedScenes.find(s => s.id === newId)
  if (scene) {
    activeSetup.value = JSON.parse(JSON.stringify(scene))
  }
})

// Expose methods for parent (App.vue) to call via ref
defineExpose({
  loadSceneFromSidebar,
  saveCurrentSetup
})
</script>

<template>
  <div class="starship-panel">
    <!-- (Old "[*] STARSHIP SCENES" panel header removed — redundant with
         the page tab nav and stealing vertical space the runner needs.) -->

    <!-- SCENE CONTENT -->
    <!-- During play we hand the whole content area to <SceneRunner /> so it
         can run its own viewport-filling 3-column grid. The setup view still
         scrolls vertically as before. -->
    <div class="tab-content" :class="{ 'tab-content-running': isSceneRunning }">
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
            <!-- Editing indicator (only when an existing scene is loaded) -->
            <div v-if="isEditingExistingScene" class="editing-banner">
              <span class="editing-label">Editing</span>
              <span class="editing-name">{{ activeSetup.name || 'Untitled scene' }}</span>
              <button class="btn-link" @click="discardEdits" title="Discard changes and start fresh">
                Cancel edits
              </button>
            </div>

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

            <!-- Victory Conditions -->
            <section class="setup-section">
              <VictoryConditionEditor
                :victory-condition="activeSetup.victoryCondition"
                :vp-required="activeSetup.vpRequired"
                :survival-rounds="activeSetup.survivalRounds"
                :custom-condition="activeSetup.customCondition"
                :additional-objectives="(activeSetup.additionalObjectives ?? []).map(o => typeof o === 'string' ? o : o.text)"
                @update:victory-condition="(v: VictoryCondition) => activeSetup!.victoryCondition = v"
                @update:vp-required="(v: number) => activeSetup!.vpRequired = v"
                @update:survival-rounds="(v: number) => activeSetup!.survivalRounds = v"
                @update:custom-condition="(v: string) => activeSetup!.customCondition = v"
                @update:additional-objectives="(v: string[]) => {
                  // Preserve hidden flags on existing entries; new entries default to visible.
                  const prev = activeSetup!.additionalObjectives ?? []
                  activeSetup!.additionalObjectives = v.map((text, i) => {
                    const old = prev[i]
                    if (old && typeof old !== 'string' && old.hidden) return { text, hidden: true }
                    return text
                  })
                }"
              />
            </section>

            <!-- Ship Stats (inline editable) -->
            <section class="setup-section">
              <input
                type="text"
                class="section-title-input"
                v-model="activeSetup.starship.name"
                placeholder="Starship name"
                aria-label="Starship name"
              />

              <!-- Ship template controls (load saved / save current) -->
              <div class="template-controls">
                <select
                  class="input template-select"
                  :value="activeSetup.starship.templateId ?? ''"
                  @change="onTemplateSelect(($event.target as HTMLSelectElement).value)"
                  :title="activeSetup.starship.templateId ? 'Currently linked to this saved ship' : 'Load a saved ship template'"
                >
                  <option value="">— Load saved ship —</option>
                  <option
                    v-for="t in store.state.savedStarships"
                    :key="t.id"
                    :value="t.id"
                  >
                    {{ t.name }}<template v-if="t.isCampaignShip"> (campaign)</template>
                  </option>
                </select>
                <button
                  class="btn btn-secondary btn-sm"
                  @click="openSaveTemplateDialog"
                  title="Save this ship configuration for reuse"
                >
                  {{ activeSetup.starship.templateId ? 'Update Template' : 'Save as Template' }}
                </button>
                <button
                  v-if="activeSetup.starship.templateId"
                  class="btn-link"
                  @click="unlinkTemplate"
                  title="Detach this scene's ship from the saved template"
                >
                  Unlink
                </button>
              </div>
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
                <ThreatCard
                  v-for="(threat, idx) in activeSetup.threats"
                  :key="threat.id"
                  :threat="threat"
                  :editing="true"
                  @update="(updates) => updateThreatFromCard(idx, updates)"
                  @remove="removeThreat(idx)"
                />
              </div>
            </section>

            <!-- Setup Warnings -->
            <div v-if="setupWarnings.length > 0" class="setup-warnings">
              <div v-for="warning in setupWarnings" :key="warning" class="warning-item">
                <span class="warning-icon">[!]</span>
                {{ warning }}
              </div>
            </div>

            <!-- Start / Save Buttons -->
            <div class="start-row">
              <template v-if="isEditingExistingScene">
                <button class="btn btn-secondary btn-lg" @click="saveAsNewScene">
                  Save as New
                </button>
                <button class="btn btn-secondary btn-lg" @click="saveCurrentSetup">
                  Save Changes
                </button>
              </template>
              <button v-else class="btn btn-secondary btn-lg" @click="saveCurrentSetup">
                Save as Custom Scene
              </button>
              <button class="btn btn-primary btn-lg" @click="startScene">
                Start Scene
              </button>
            </div>
          </template>
        </div>
      </template>

      <!-- Running: Scene Runner — fully delegated to <SceneRunner /> so all
           the at-a-glance polish (ship bonuses, scene actions, threat
           attacks, quick roll, edit mode) actually renders. The inline
           runner that used to live here was dead-but-rendered duplicate
           code, and silently bypassed every change made to SceneRunner. -->
      <template v-else>
        <SceneRunner />
      </template>
    </div>

    <!-- Save Starship Template Dialog -->
    <div
      v-if="showSaveTemplateDialog"
      class="template-modal-overlay"
      @click.self="showSaveTemplateDialog = false"
    >
      <div class="template-modal">
        <h3>{{ activeSetup?.starship.templateId ? 'Update Saved Ship' : 'Save Ship as Template' }}</h3>
        <label class="form-field">
          <span>Name</span>
          <input
            v-model="templateDialogName"
            class="input"
            placeholder="e.g. The Brassbound, party ship"
            @keydown.enter="confirmSaveTemplate"
          />
        </label>
        <label class="form-field">
          <span>Description (optional)</span>
          <textarea
            v-model="templateDialogDescription"
            class="input textarea"
            rows="2"
            placeholder="Notes about this ship"
          ></textarea>
        </label>
        <label class="checkbox-field">
          <input type="checkbox" v-model="templateDialogCampaign" />
          <span>
            <strong>Campaign ship</strong>
            <span class="checkbox-hint">Carry HP/Shield damage forward when a linked scene ends.</span>
          </span>
        </label>
        <div class="modal-actions">
          <button
            v-if="activeSetup?.starship.templateId"
            class="btn-link delete-link"
            @click="deleteCurrentTemplate"
          >
            Delete Template
          </button>
          <button class="btn btn-secondary" @click="showSaveTemplateDialog = false">Cancel</button>
          <button class="btn btn-primary" :disabled="!templateDialogName.trim()" @click="confirmSaveTemplate">
            {{ activeSetup?.starship.templateId ? 'Update' : 'Save Template' }}
          </button>
        </div>
      </div>
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
  min-height: 0;
}

/* When a scene is running we hand the layout to SceneRunner — no parent
   scroll or padding. The runner itself uses an internally-scrolling grid. */
.tab-content-running {
  overflow: hidden;
  padding: 0;
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

/* Inline-editable section title used for the PC starship name. Visually
   reads as a heading until focused, when it shows a subtle border. */
.section-title-input {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  padding: 0.25rem 0.375rem;
  font-family: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.section-title-input:hover {
  background: var(--color-elevated, rgba(255, 255, 255, 0.04));
}

.section-title-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-elevated, rgba(255, 255, 255, 0.04));
}

.section-title-input::placeholder {
  color: var(--color-dim);
  opacity: 0.6;
}

/* Banner shown when editing a previously-saved scene, so the GM can tell
   they're modifying an existing entry vs creating a new one. */
.editing-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}

.editing-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  font-weight: 700;
}

.editing-name {
  flex: 1;
  color: var(--color-text);
  font-weight: 600;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.75rem;
  text-decoration: underline;
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-sm);
}

.btn-link:hover {
  color: var(--color-danger);
}

/* Ship template controls — load saved / save current row above ship stats */
.template-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.template-select {
  flex: 1;
  min-width: 180px;
}

/* Save template modal — minimal dialog so the GM can name + flag a campaign ship */
.template-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.template-modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.template-modal h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.checkbox-field {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.checkbox-field input[type="checkbox"] {
  margin-top: 0.25rem;
}

.checkbox-hint {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-weight: 400;
  margin-top: 0.125rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.modal-actions .delete-link {
  margin-right: auto;
  color: var(--color-danger);
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

/* SETUP WARNINGS */
.setup-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 8%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
  border-radius: var(--radius-sm);
}

.warning-icon {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.start-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
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
