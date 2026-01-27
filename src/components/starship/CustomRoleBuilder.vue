<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import type { StarshipRole, StarshipAction } from '../../types/starship'
import { getAllRoleSkills } from '../../data/starshipRoles'

const props = defineProps<{
  editingRole?: StarshipRole | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useStarshipStore()

// Available skills for selection
const availableSkills = getAllRoleSkills()

// Track if we're editing an existing role
const isEditing = computed(() => !!props.editingRole)
const editingRoleId = ref<string | null>(null)

// Role being built
const role = ref<Omit<StarshipRole, 'id'>>({
  type: 'custom',
  name: '',
  description: '',
  primarySkills: [],
  actions: [],
  isCustom: true
})

// Initialize form with existing role data if editing
onMounted(() => {
  if (props.editingRole) {
    editingRoleId.value = props.editingRole.id
    role.value = {
      type: props.editingRole.type,
      name: props.editingRole.name,
      description: props.editingRole.description,
      primarySkills: [...props.editingRole.primarySkills],
      actions: props.editingRole.actions.map(a => ({ ...a, outcomes: { ...a.outcomes } })),
      isCustom: true
    }
  }
})

// Skill input
const newSkill = ref('')

// Action being edited
const editingActionIndex = ref<number | null>(null)
const actionForm = ref<Omit<StarshipAction, 'id'>>({
  name: '',
  actionCost: 2,
  skills: [],
  description: '',
  outcomes: {
    criticalSuccess: '',
    success: '',
    failure: '',
    criticalFailure: ''
  }
})

const actionSkillInput = ref('')

// Validation
const isValid = computed(() => {
  return (
    role.value.name.trim() !== '' &&
    role.value.primarySkills.length > 0 &&
    role.value.actions.length > 0
  )
})

const isActionValid = computed(() => {
  return (
    actionForm.value.name.trim() !== '' &&
    actionForm.value.skills.length > 0 &&
    actionForm.value.outcomes.criticalSuccess.trim() !== '' &&
    actionForm.value.outcomes.success.trim() !== ''
  )
})

// Primary skills management
function addPrimarySkill() {
  const skill = newSkill.value.trim()
  if (skill && !role.value.primarySkills.includes(skill)) {
    role.value.primarySkills.push(skill)
    newSkill.value = ''
  }
}

function removePrimarySkill(skill: string) {
  const idx = role.value.primarySkills.indexOf(skill)
  if (idx !== -1) {
    role.value.primarySkills.splice(idx, 1)
  }
}

// Action skills management
function addActionSkill() {
  const skill = actionSkillInput.value.trim()
  if (skill && !actionForm.value.skills.includes(skill)) {
    actionForm.value.skills.push(skill)
    actionSkillInput.value = ''
  }
}

function removeActionSkill(skill: string) {
  const idx = actionForm.value.skills.indexOf(skill)
  if (idx !== -1) {
    actionForm.value.skills.splice(idx, 1)
  }
}

// Action management
function addAction() {
  editingActionIndex.value = null
  actionForm.value = {
    name: '',
    actionCost: 2,
    skills: [],
    description: '',
    outcomes: {
      criticalSuccess: '',
      success: '',
      failure: '',
      criticalFailure: ''
    }
  }
}

function editAction(index: number) {
  editingActionIndex.value = index
  const action = role.value.actions[index]
  actionForm.value = {
    name: action.name,
    actionCost: action.actionCost,
    skills: [...action.skills],
    description: action.description,
    outcomes: { ...action.outcomes }
  }
}

function saveAction() {
  if (!isActionValid.value) return

  const action: StarshipAction = {
    id: crypto.randomUUID(),
    ...actionForm.value
  }

  if (editingActionIndex.value !== null) {
    // Update existing
    action.id = role.value.actions[editingActionIndex.value].id
    role.value.actions[editingActionIndex.value] = action
  } else {
    // Add new
    role.value.actions.push(action)
  }

  // Reset form
  editingActionIndex.value = null
  actionForm.value = {
    name: '',
    actionCost: 2,
    skills: [],
    description: '',
    outcomes: {
      criticalSuccess: '',
      success: '',
      failure: '',
      criticalFailure: ''
    }
  }
}

function cancelActionEdit() {
  editingActionIndex.value = null
  actionForm.value = {
    name: '',
    actionCost: 2,
    skills: [],
    description: '',
    outcomes: {
      criticalSuccess: '',
      success: '',
      failure: '',
      criticalFailure: ''
    }
  }
}

function removeAction(index: number) {
  role.value.actions.splice(index, 1)
  if (editingActionIndex.value === index) {
    cancelActionEdit()
  }
}

// Save role
function saveRole() {
  if (!isValid.value) return

  if (isEditing.value && editingRoleId.value) {
    // Update existing role
    store.updateCustomRole(editingRoleId.value, role.value)
  } else {
    // Add new role
    store.addCustomRole(role.value as StarshipRole)
  }
  emit('close')
}
</script>

<template>
  <div class="custom-role-builder">
    <div class="builder-header">
      <h2 class="builder-title">{{ isEditing ? 'Edit Custom Role' : 'Create Custom Role' }}</h2>
      <button class="close-btn" @click="emit('close')">&times;</button>
    </div>

    <div class="builder-content">
      <!-- Role Info -->
      <div class="form-section">
        <h3 class="section-title">Role Information</h3>

        <label class="form-label">
          <span>Role Name *</span>
          <input
            type="text"
            class="input"
            v-model="role.name"
            placeholder="e.g., Medic, Communications Officer"
          />
        </label>

        <label class="form-label">
          <span>Description</span>
          <textarea
            class="input textarea"
            v-model="role.description"
            placeholder="Describe this role's purpose and responsibilities..."
            rows="3"
          ></textarea>
        </label>

        <!-- Primary Skills -->
        <div class="skills-section">
          <span class="form-label-text">Primary Skills *</span>

          <div v-if="role.primarySkills.length > 0" class="skill-tags">
            <span
              v-for="skill in role.primarySkills"
              :key="skill"
              class="skill-tag"
            >
              {{ skill }}
              <button class="skill-remove" @click="removePrimarySkill(skill)">&times;</button>
            </span>
          </div>

          <div class="skill-input-row">
            <input
              type="text"
              class="input"
              v-model="newSkill"
              placeholder="Add a skill..."
              list="skill-suggestions"
              @keyup.enter="addPrimarySkill"
            />
            <datalist id="skill-suggestions">
              <option v-for="skill in availableSkills" :key="skill" :value="skill" />
            </datalist>
            <button class="btn btn-secondary btn-sm" @click="addPrimarySkill">Add</button>
          </div>
        </div>
      </div>

      <!-- Actions Section -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Actions ({{ role.actions.length }})</h3>
          <button class="btn btn-primary btn-sm" @click="addAction">+ Add Action</button>
        </div>

        <!-- Existing Actions -->
        <div v-if="role.actions.length > 0" class="actions-list">
          <div
            v-for="(action, index) in role.actions"
            :key="action.id"
            class="action-preview"
            :class="{ editing: editingActionIndex === index }"
          >
            <div class="action-preview-header">
              <div class="action-cost">
                <span class="cost-diamond"></span>
                <span class="cost-diamond"></span>
              </div>
              <div class="action-preview-info">
                <span class="action-preview-name">{{ action.name }}</span>
                <span class="action-preview-skills">{{ action.skills.join(', ') }}</span>
              </div>
              <div class="action-preview-actions">
                <button class="btn btn-secondary btn-xs" @click="editAction(index)">Edit</button>
                <button class="btn btn-danger btn-xs" @click="removeAction(index)">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Editor -->
        <div v-if="editingActionIndex !== null || actionForm.name || role.actions.length === 0" class="action-editor">
          <h4 class="editor-title">{{ editingActionIndex !== null ? 'Edit Action' : 'New Action' }}</h4>

          <div class="form-row">
            <label class="form-label">
              <span>Action Name *</span>
              <input
                type="text"
                class="input"
                v-model="actionForm.name"
                placeholder="e.g., Emergency Treatment"
              />
            </label>
          </div>

          <label class="form-label">
            <span>Description</span>
            <textarea
              class="input textarea"
              v-model="actionForm.description"
              placeholder="Describe what this action does..."
              rows="2"
            ></textarea>
          </label>

          <!-- Action Skills -->
          <div class="skills-section">
            <span class="form-label-text">Skills *</span>

            <div v-if="actionForm.skills.length > 0" class="skill-tags">
              <span
                v-for="skill in actionForm.skills"
                :key="skill"
                class="skill-tag"
              >
                {{ skill }}
                <button class="skill-remove" @click="removeActionSkill(skill)">&times;</button>
              </span>
            </div>

            <div class="skill-input-row">
              <input
                type="text"
                class="input"
                v-model="actionSkillInput"
                placeholder="Add a skill..."
                list="action-skill-suggestions"
                @keyup.enter="addActionSkill"
              />
              <datalist id="action-skill-suggestions">
                <option v-for="skill in availableSkills" :key="skill" :value="skill" />
              </datalist>
              <button class="btn btn-secondary btn-sm" @click="addActionSkill">Add</button>
            </div>
          </div>

          <!-- Outcomes -->
          <div class="outcomes-section">
            <h5 class="outcomes-title">Outcomes</h5>

            <label class="form-label outcome-label critical-success">
              <span>Critical Success *</span>
              <textarea
                class="input textarea"
                v-model="actionForm.outcomes.criticalSuccess"
                placeholder="What happens on a critical success..."
                rows="2"
              ></textarea>
            </label>

            <label class="form-label outcome-label success">
              <span>Success *</span>
              <textarea
                class="input textarea"
                v-model="actionForm.outcomes.success"
                placeholder="What happens on a success..."
                rows="2"
              ></textarea>
            </label>

            <label class="form-label outcome-label failure">
              <span>Failure</span>
              <textarea
                class="input textarea"
                v-model="actionForm.outcomes.failure"
                placeholder="What happens on a failure (optional)..."
                rows="2"
              ></textarea>
            </label>

            <label class="form-label outcome-label critical-failure">
              <span>Critical Failure</span>
              <textarea
                class="input textarea"
                v-model="actionForm.outcomes.criticalFailure"
                placeholder="What happens on a critical failure (optional)..."
                rows="2"
              ></textarea>
            </label>
          </div>

          <div class="action-editor-actions">
            <button class="btn btn-secondary" @click="cancelActionEdit">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="!isActionValid"
              @click="saveAction"
            >
              {{ editingActionIndex !== null ? 'Update Action' : 'Add Action' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="builder-footer">
      <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
      <button
        class="btn btn-primary"
        :disabled="!isValid"
        @click="saveRole"
      >
        {{ isEditing ? 'Update Role' : 'Save Role' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.custom-role-builder {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  background: var(--color-bg-surface);
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.builder-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-accent);
}

.close-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-danger);
}

.builder-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.form-label span,
.form-label-text {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.input {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

/* Skills */
.skills-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.skill-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.skill-remove {
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.7;
}

.skill-remove:hover {
  opacity: 1;
}

.skill-input-row {
  display: flex;
  gap: 0.5rem;
}

.skill-input-row .input {
  flex: 1;
}

/* Actions */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-preview {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.action-preview.editing {
  border-color: var(--color-accent);
}

.action-preview-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-cost {
  display: flex;
  gap: 0.125rem;
}

.cost-diamond {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--color-accent);
  transform: rotate(45deg);
}

.action-preview-info {
  flex: 1;
  min-width: 0;
}

.action-preview-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-preview-skills {
  display: block;
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

.action-preview-actions {
  display: flex;
  gap: 0.25rem;
}

/* Action Editor */
.action-editor {
  padding: 1rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
}

/* Outcomes */
.outcomes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.outcomes-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.outcome-label {
  padding-left: 0.5rem;
  border-left: 3px solid;
}

.outcome-label.critical-success {
  border-left-color: var(--color-success);
}

.outcome-label.success {
  border-left-color: var(--color-info);
}

.outcome-label.failure {
  border-left-color: var(--color-warning);
}

.outcome-label.critical-failure {
  border-left-color: var(--color-danger);
}

.action-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

/* Footer */
.builder-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

/* Buttons */
.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
}

.btn-danger {
  background: transparent;
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.btn-danger:hover {
  background: var(--color-danger);
  color: white;
}
</style>
