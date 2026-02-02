<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { StarshipAction } from '../../types/starship'

const props = defineProps<{
  action: StarshipAction
  availableRoles: string[]
}>()

const emit = defineEmits<{
  (e: 'update', action: StarshipAction): void
  (e: 'remove'): void
  (e: 'close'): void
}>()

// Local editing state
const editState = reactive<StarshipAction>({
  ...JSON.parse(JSON.stringify(props.action))
})

// Sync changes back
watch(editState, () => {
  emit('update', JSON.parse(JSON.stringify(editState)))
}, { deep: true })

// Watch for external prop changes
watch(() => props.action, (newAction) => {
  Object.assign(editState, JSON.parse(JSON.stringify(newAction)))
}, { deep: true })

const actionCosts: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1 Action' },
  { value: 2, label: '2 Actions' },
  { value: 3, label: '3 Actions' }
]

// Role options: all available roles + "any" + pipe-separated multi-role
const roleOptions = computed(() => {
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = [
    { value: 'any', label: 'Any Role' }
  ]
  for (const roleId of props.availableRoles) {
    if (!seen.has(roleId)) {
      seen.add(roleId)
      options.push({
        value: roleId,
        label: roleId.charAt(0).toUpperCase() + roleId.slice(1).replace(/_/g, ' ')
      })
    }
  }
  return options
})

// Handle multi-role via custom input when needed
const useCustomRole = ref(editState.role.includes('|'))
const customRoleInput = ref(editState.role)

function onRoleSelect(value: string) {
  if (value === '__custom__') {
    useCustomRole.value = true
    return
  }
  useCustomRole.value = false
  editState.role = value
}

function onCustomRoleChange(value: string) {
  customRoleInput.value = value
  editState.role = value
}

// Skill tag input
const skillInput = ref('')

function addSkill() {
  if (!skillInput.value.trim()) return
  if (!editState.skills.includes(skillInput.value.trim())) {
    editState.skills.push(skillInput.value.trim())
  }
  skillInput.value = ''
}

function removeSkill(index: number) {
  editState.skills.splice(index, 1)
}

// Trait tag input (for attacks)
const traitInput = ref('')

function addTrait() {
  if (!traitInput.value.trim()) return
  if (!editState.traits) editState.traits = []
  editState.traits.push(traitInput.value.trim())
  traitInput.value = ''
}

function removeTrait(index: number) {
  editState.traits?.splice(index, 1)
}

// Toggle attack mode
function toggleAttack() {
  editState.isAttack = !editState.isAttack
  if (editState.isAttack && !editState.damage) {
    editState.damage = ''
  }
}

// Ensure outcomes object exists
if (!editState.outcomes) {
  editState.outcomes = { criticalSuccess: '', success: '' }
}
</script>

<template>
  <div class="action-editor">
    <div class="editor-header">
      <h4 class="editor-title">{{ editState.name || 'New Action' }}</h4>
      <div class="editor-controls">
        <button class="icon-btn danger" @click="emit('remove')" title="Delete action">&times;</button>
        <button class="icon-btn" @click="emit('close')" title="Collapse">&#9650;</button>
      </div>
    </div>

    <!-- Name & Cost -->
    <div class="form-row two-col">
      <label class="field-label">
        <span>Name</span>
        <input type="text" class="input" v-model="editState.name" placeholder="Action name" />
      </label>
      <label class="field-label">
        <span>Action Cost</span>
        <select class="input select" v-model.number="editState.actionCost">
          <option v-for="c in actionCosts" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </label>
    </div>

    <!-- Role -->
    <div class="form-row two-col">
      <label class="field-label">
        <span>Role</span>
        <select
          v-if="!useCustomRole"
          class="input select"
          :value="editState.role"
          @change="onRoleSelect(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          <option value="__custom__">Multi-role (custom)...</option>
        </select>
        <div v-else class="custom-role-row">
          <input
            type="text"
            class="input"
            :value="customRoleInput"
            @input="onCustomRoleChange(($event.target as HTMLInputElement).value)"
            placeholder="captain|pilot"
          />
          <button class="icon-btn" @click="useCustomRole = false; editState.role = 'any'" title="Use dropdown">&#8634;</button>
        </div>
      </label>

      <!-- DC Override -->
      <label class="field-label">
        <span>DC Override</span>
        <input
          type="number"
          class="input input-number"
          v-model.number="editState.dc"
          placeholder="Auto"
        />
      </label>
    </div>

    <!-- Skills -->
    <div class="field-label">
      <span>Skills</span>
      <div class="tag-input-container">
        <div class="tag-list" v-if="editState.skills.length">
          <span v-for="(skill, idx) in editState.skills" :key="idx" class="skill-tag">
            {{ skill }}
            <button class="tag-remove" @click="removeSkill(idx)">&times;</button>
          </span>
        </div>
        <div class="tag-input-row">
          <input
            type="text"
            class="input tag-input"
            v-model="skillInput"
            placeholder="Add skill..."
            @keydown.enter.prevent="addSkill"
          />
          <button class="add-tag-btn" @click="addSkill">+</button>
        </div>
      </div>
    </div>

    <!-- Description -->
    <label class="field-label">
      <span>Description</span>
      <textarea
        class="input textarea"
        v-model="editState.description"
        placeholder="What this action does..."
        rows="2"
      ></textarea>
    </label>

    <!-- Attack Toggle -->
    <div class="attack-toggle">
      <label class="toggle-label">
        <input type="checkbox" :checked="editState.isAttack" @change="toggleAttack" />
        <span>This is an attack (Strike)</span>
      </label>
    </div>

    <!-- Attack Fields -->
    <template v-if="editState.isAttack">
      <div class="form-row two-col">
        <label class="field-label">
          <span>Attack Bonus</span>
          <input type="number" class="input input-number" v-model.number="editState.proficiency" placeholder="+0" />
        </label>
        <label class="field-label">
          <span>Damage</span>
          <input type="text" class="input" v-model="editState.damage" placeholder="2d10+8 fire" />
        </label>
      </div>

      <div class="field-label">
        <span>Traits</span>
        <div class="tag-input-container">
          <div class="tag-list" v-if="editState.traits?.length">
            <span v-for="(trait, idx) in editState.traits" :key="idx" class="trait-tag">
              {{ trait }}
              <button class="tag-remove" @click="removeTrait(idx)">&times;</button>
            </span>
          </div>
          <div class="tag-input-row">
            <input
              type="text"
              class="input tag-input"
              v-model="traitInput"
              placeholder="Add trait..."
              @keydown.enter.prevent="addTrait"
            />
            <button class="add-tag-btn" @click="addTrait">+</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Outcomes -->
    <div class="outcomes-section">
      <h5 class="outcomes-title">Outcomes</h5>
      <label class="field-label">
        <span class="outcome-label crit-success">Critical Success</span>
        <textarea class="input textarea outcome-textarea" v-model="editState.outcomes.criticalSuccess" placeholder="Critical success effect..." rows="1"></textarea>
      </label>
      <label class="field-label">
        <span class="outcome-label success">Success</span>
        <textarea class="input textarea outcome-textarea" v-model="editState.outcomes.success" placeholder="Success effect..." rows="1"></textarea>
      </label>
      <label class="field-label">
        <span class="outcome-label failure">Failure</span>
        <textarea class="input textarea outcome-textarea" v-model="editState.outcomes.failure" placeholder="Failure effect..." rows="1"></textarea>
      </label>
      <label class="field-label">
        <span class="outcome-label crit-failure">Critical Failure</span>
        <textarea class="input textarea outcome-textarea" v-model="editState.outcomes.criticalFailure" placeholder="Critical failure effect..." rows="1"></textarea>
      </label>
    </div>

    <button class="btn btn-done" @click="emit('close')">Done</button>
  </div>
</template>

<style scoped>
.action-editor {
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.editor-controls {
  display: flex;
  gap: 0.25rem;
}

/* Form */
.form-row {
  display: flex;
  gap: 0.5rem;
}

.form-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.field-label span {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.input {
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.8125rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-number {
  text-align: center;
}

.select {
  cursor: pointer;
}

.textarea {
  resize: vertical;
  min-height: 36px;
  font-family: inherit;
}

/* Hide number input spinners */
.input-number::-webkit-inner-spin-button,
.input-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-number {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Tags */
.tag-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.skill-tag, .trait-tag {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-elevated, var(--color-bg));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  color: var(--color-text);
}

.tag-remove {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
}

.tag-remove:hover {
  color: var(--color-danger);
}

.tag-input-row {
  display: flex;
  gap: 0.25rem;
}

.tag-input {
  flex: 1;
  font-size: 0.75rem;
  padding: 0.25rem 0.375rem;
}

.add-tag-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
}

.add-tag-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Custom role row */
.custom-role-row {
  display: flex;
  gap: 0.25rem;
}

.custom-role-row .input {
  flex: 1;
}

/* Attack toggle */
.attack-toggle {
  padding: 0.375rem 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  accent-color: var(--color-accent);
}

/* Outcomes */
.outcomes-section {
  padding: 0.5rem;
  background: var(--color-bg-surface);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.outcomes-title {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin: 0;
}

.outcome-label {
  font-weight: 600 !important;
}

.outcome-label.crit-success {
  color: var(--color-success) !important;
}

.outcome-label.success {
  color: var(--color-info) !important;
}

.outcome-label.failure {
  color: var(--color-warning) !important;
}

.outcome-label.crit-failure {
  color: var(--color-danger) !important;
}

.outcome-textarea {
  min-height: 28px;
  font-size: 0.75rem;
}

/* Buttons */
.icon-btn {
  padding: 0.125rem 0.375rem;
  background: none;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.icon-btn:hover {
  border-color: var(--color-border);
  color: var(--color-text);
}

.icon-btn.danger:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.btn-done {
  width: 100%;
  padding: 0.375rem 0.75rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-done:hover {
  background: var(--color-accent);
  color: white;
}
</style>
