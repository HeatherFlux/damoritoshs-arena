<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { ThreatRoutine, ThreatRoutineAction, ThreatActionType } from '../../types/starship'

const props = defineProps<{
  routine?: ThreatRoutine
}>()

const emit = defineEmits<{
  (e: 'update', routine: ThreatRoutine): void
  (e: 'close'): void
}>()

// Local editing state
const editState = reactive<ThreatRoutine>({
  actionsPerTurn: props.routine?.actionsPerTurn ?? 2,
  description: props.routine?.description ?? '',
  actions: props.routine?.actions ? JSON.parse(JSON.stringify(props.routine.actions)) : []
})

// Track which action is being edited (-1 = none)
const editingActionIndex = ref(-1)

// Temporary action for editing
const editingAction = ref<ThreatRoutineAction | null>(null)

const actionTypes: { value: ThreatActionType; label: string }[] = [
  { value: 'attack', label: 'Attack' },
  { value: 'skill_check', label: 'Skill Check' },
  { value: 'ability', label: 'Ability' },
  { value: 'movement', label: 'Movement' }
]

const actionCosts: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1 Action' },
  { value: 2, label: '2 Actions' },
  { value: 3, label: '3 Actions' }
]

const defenseOptions = [
  { value: '', label: 'None' },
  { value: 'AC', label: 'AC' },
  { value: 'Fortitude DC', label: 'Fortitude DC' },
  { value: 'Reflex DC', label: 'Reflex DC' },
  { value: 'Will DC', label: 'Will DC' }
]

// Emit updates whenever state changes
watch(editState, () => {
  emit('update', {
    actionsPerTurn: editState.actionsPerTurn,
    description: editState.description,
    actions: JSON.parse(JSON.stringify(editState.actions))
  })
}, { deep: true })

function createNewAction(): ThreatRoutineAction {
  return {
    id: crypto.randomUUID(),
    name: '',
    actionCost: 2,
    type: 'attack',
    description: ''
  }
}

function addAction() {
  const action = createNewAction()
  editingAction.value = action
  editingActionIndex.value = editState.actions.length // Will be pushed on save
}

function editAction(index: number) {
  editingAction.value = JSON.parse(JSON.stringify(editState.actions[index]))
  editingActionIndex.value = index
}

function saveAction() {
  if (!editingAction.value) return
  if (editingActionIndex.value >= editState.actions.length) {
    // New action
    editState.actions.push(editingAction.value)
  } else {
    // Existing action
    editState.actions[editingActionIndex.value] = editingAction.value
  }
  editingAction.value = null
  editingActionIndex.value = -1
}

function cancelAction() {
  editingAction.value = null
  editingActionIndex.value = -1
}

function removeAction(index: number) {
  editState.actions.splice(index, 1)
  if (editingActionIndex.value === index) {
    editingAction.value = null
    editingActionIndex.value = -1
  }
}

function moveAction(index: number, direction: -1 | 1) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= editState.actions.length) return
  const temp = editState.actions[index]
  editState.actions[index] = editState.actions[newIndex]
  editState.actions[newIndex] = temp
}

function getTypeIcon(type: ThreatActionType): string {
  switch (type) {
    case 'attack': return '⚔️'
    case 'skill_check': return '🎯'
    case 'ability': return '✨'
    case 'movement': return '➡️'
    default: return '•'
  }
}

// Tag input for traits
const traitInput = ref('')

function addTrait() {
  if (!editingAction.value || !traitInput.value.trim()) return
  if (!editingAction.value.traits) editingAction.value.traits = []
  editingAction.value.traits.push(traitInput.value.trim())
  traitInput.value = ''
}

function removeTrait(index: number) {
  if (!editingAction.value?.traits) return
  editingAction.value.traits.splice(index, 1)
}
</script>

<template>
  <div class="routine-editor">
    <div class="editor-header">
      <h4 class="editor-title">Routine Editor</h4>
      <button class="close-btn" @click="emit('close')" title="Done editing routine">&times;</button>
    </div>

    <!-- Routine-level fields -->
    <div class="routine-fields">
      <label class="field-label">
        <span>Actions Per Turn</span>
        <select
          class="input select"
          v-model.number="editState.actionsPerTurn"
        >
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3</option>
        </select>
      </label>

      <label class="field-label full-width">
        <span>Routine Description</span>
        <textarea
          class="input textarea"
          v-model="editState.description"
          placeholder="Describe the routine behavior..."
          rows="2"
        ></textarea>
      </label>
    </div>

    <!-- Actions list (collapsed view) -->
    <div class="actions-section">
      <h5 class="section-title">Actions ({{ editState.actions.length }})</h5>

      <div class="actions-list">
        <div
          v-for="(action, index) in editState.actions"
          :key="action.id"
          class="action-summary"
          :class="{ 'is-editing': editingActionIndex === index }"
        >
          <!-- Action being edited inline -->
          <template v-if="editingActionIndex === index && editingAction">
            <div class="action-edit-form">
              <div class="form-row">
                <label class="field-label">
                  <span>Name</span>
                  <input
                    type="text"
                    class="input"
                    v-model="editingAction.name"
                    placeholder="Action name"
                  />
                </label>
              </div>

              <div class="form-row two-col">
                <label class="field-label">
                  <span>Type</span>
                  <select class="input select" v-model="editingAction.type">
                    <option v-for="t in actionTypes" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </option>
                  </select>
                </label>

                <label class="field-label">
                  <span>Action Cost</span>
                  <select class="input select" v-model.number="editingAction.actionCost">
                    <option v-for="c in actionCosts" :key="c.value" :value="c.value">
                      {{ c.label }}
                    </option>
                  </select>
                </label>
              </div>

              <label class="field-label full-width">
                <span>Description</span>
                <textarea
                  class="input textarea"
                  v-model="editingAction.description"
                  placeholder="What this action does..."
                  rows="2"
                ></textarea>
              </label>

              <!-- Attack-specific fields -->
              <template v-if="editingAction.type === 'attack'">
                <div class="form-row two-col">
                  <label class="field-label">
                    <span>Attack Bonus</span>
                    <input
                      type="number"
                      class="input input-number"
                      v-model.number="editingAction.attackBonus"
                      placeholder="+0"
                    />
                  </label>

                  <label class="field-label">
                    <span>Damage</span>
                    <input
                      type="text"
                      class="input"
                      v-model="editingAction.damage"
                      placeholder="2d10+8"
                    />
                  </label>
                </div>

                <div class="form-row two-col">
                  <label class="field-label">
                    <span>Damage Type</span>
                    <input
                      type="text"
                      class="input"
                      v-model="editingAction.damageType"
                      placeholder="fire, bludgeoning..."
                    />
                  </label>

                  <div class="field-label">
                    <span>Traits</span>
                    <div class="tag-input-container">
                      <div class="tag-list" v-if="editingAction.traits?.length">
                        <span
                          v-for="(trait, ti) in editingAction.traits"
                          :key="ti"
                          class="trait-tag"
                        >
                          {{ trait }}
                          <button class="trait-remove" @click="removeTrait(ti)">&times;</button>
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
                        <button class="add-trait-btn" @click="addTrait">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Skill check fields -->
              <template v-if="editingAction.type === 'skill_check'">
                <div class="form-row two-col">
                  <label class="field-label">
                    <span>Skill</span>
                    <input
                      type="text"
                      class="input"
                      v-model="editingAction.skill"
                      placeholder="Piloting, Computers..."
                    />
                  </label>

                  <label class="field-label">
                    <span>vs Defense</span>
                    <select class="input select" v-model="editingAction.vsDefense">
                      <option v-for="d in defenseOptions" :key="d.value" :value="d.value || undefined">
                        {{ d.label }}
                      </option>
                    </select>
                  </label>
                </div>

                <div class="form-row">
                  <label class="field-label">
                    <span>DC (optional)</span>
                    <input
                      type="number"
                      class="input input-number"
                      v-model.number="editingAction.dc"
                      placeholder="DC"
                    />
                  </label>
                </div>
              </template>

              <!-- Ability fields -->
              <template v-if="editingAction.type === 'ability'">
                <div class="form-row two-col">
                  <label class="field-label">
                    <span>vs Defense</span>
                    <select class="input select" v-model="editingAction.vsDefense">
                      <option v-for="d in defenseOptions" :key="d.value" :value="d.value || undefined">
                        {{ d.label }}
                      </option>
                    </select>
                  </label>

                  <label class="field-label">
                    <span>DC (optional)</span>
                    <input
                      type="number"
                      class="input input-number"
                      v-model.number="editingAction.dc"
                      placeholder="DC"
                    />
                  </label>
                </div>

                <div class="form-row two-col">
                  <label class="field-label">
                    <span>Damage (optional)</span>
                    <input
                      type="text"
                      class="input"
                      v-model="editingAction.damage"
                      placeholder="3d6"
                    />
                  </label>

                  <label class="field-label">
                    <span>Damage Type</span>
                    <input
                      type="text"
                      class="input"
                      v-model="editingAction.damageType"
                      placeholder="fire, force..."
                    />
                  </label>
                </div>
              </template>

              <!-- Outcome effects (all types) -->
              <div class="outcomes-section">
                <h6 class="outcomes-title">Effects by Outcome</h6>
                <label class="field-label full-width">
                  <span class="outcome-label crit-success">Critical Success</span>
                  <textarea
                    class="input textarea outcome-textarea"
                    v-model="editingAction.effectOnCriticalSuccess"
                    placeholder="Effect on critical success..."
                    rows="1"
                  ></textarea>
                </label>
                <label class="field-label full-width">
                  <span class="outcome-label success">Success</span>
                  <textarea
                    class="input textarea outcome-textarea"
                    v-model="editingAction.effectOnSuccess"
                    placeholder="Effect on success..."
                    rows="1"
                  ></textarea>
                </label>
                <label class="field-label full-width">
                  <span class="outcome-label failure">Failure</span>
                  <textarea
                    class="input textarea outcome-textarea"
                    v-model="editingAction.effectOnFailure"
                    placeholder="Effect on failure..."
                    rows="1"
                  ></textarea>
                </label>
                <label class="field-label full-width">
                  <span class="outcome-label crit-failure">Critical Failure</span>
                  <textarea
                    class="input textarea outcome-textarea"
                    v-model="editingAction.effectOnCriticalFailure"
                    placeholder="Effect on critical failure..."
                    rows="1"
                  ></textarea>
                </label>
              </div>

              <!-- Conditional effects -->
              <div class="form-row two-col">
                <label class="field-label">
                  <span>Conditional Damage</span>
                  <input
                    type="text"
                    class="input"
                    v-model="editingAction.conditionalDamage"
                    placeholder="e.g. +1d6 vs flat-footed"
                  />
                </label>

                <label class="field-label">
                  <span>Conditional Effect</span>
                  <input
                    type="text"
                    class="input"
                    v-model="editingAction.conditionalEffect"
                    placeholder="e.g. Grab on hit"
                  />
                </label>
              </div>

              <!-- Save / Cancel -->
              <div class="action-edit-buttons">
                <button class="btn btn-save" @click="saveAction">Save Action</button>
                <button class="btn btn-cancel" @click="cancelAction">Cancel</button>
              </div>
            </div>
          </template>

          <!-- Collapsed action summary -->
          <template v-else>
            <div class="action-summary-row">
              <span class="action-type-icon">{{ getTypeIcon(action.type) }}</span>
              <span class="action-name">{{ action.name || '(unnamed)' }}</span>
              <span class="action-cost-badge">{{ action.actionCost }}A</span>
              <span class="action-type-label">{{ action.type }}</span>
              <div class="action-summary-controls">
                <button class="icon-btn" @click="moveAction(index, -1)" :disabled="index === 0" title="Move up">&uarr;</button>
                <button class="icon-btn" @click="moveAction(index, 1)" :disabled="index === editState.actions.length - 1" title="Move down">&darr;</button>
                <button class="icon-btn" @click="editAction(index)" title="Edit">&#9998;</button>
                <button class="icon-btn danger" @click="removeAction(index)" title="Remove">&times;</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- New action being added (not yet in list) -->
      <div v-if="editingActionIndex >= editState.actions.length && editingAction" class="action-edit-form new-action-form">
        <div class="form-row">
          <label class="field-label">
            <span>Name</span>
            <input
              type="text"
              class="input"
              v-model="editingAction.name"
              placeholder="Action name"
            />
          </label>
        </div>

        <div class="form-row two-col">
          <label class="field-label">
            <span>Type</span>
            <select class="input select" v-model="editingAction.type">
              <option v-for="t in actionTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </option>
            </select>
          </label>

          <label class="field-label">
            <span>Action Cost</span>
            <select class="input select" v-model.number="editingAction.actionCost">
              <option v-for="c in actionCosts" :key="c.value" :value="c.value">
                {{ c.label }}
              </option>
            </select>
          </label>
        </div>

        <label class="field-label full-width">
          <span>Description</span>
          <textarea
            class="input textarea"
            v-model="editingAction.description"
            placeholder="What this action does..."
            rows="2"
          ></textarea>
        </label>

        <!-- Attack-specific fields -->
        <template v-if="editingAction.type === 'attack'">
          <div class="form-row two-col">
            <label class="field-label">
              <span>Attack Bonus</span>
              <input
                type="number"
                class="input input-number"
                v-model.number="editingAction.attackBonus"
                placeholder="+0"
              />
            </label>

            <label class="field-label">
              <span>Damage</span>
              <input
                type="text"
                class="input"
                v-model="editingAction.damage"
                placeholder="2d10+8"
              />
            </label>
          </div>

          <div class="form-row two-col">
            <label class="field-label">
              <span>Damage Type</span>
              <input
                type="text"
                class="input"
                v-model="editingAction.damageType"
                placeholder="fire, bludgeoning..."
              />
            </label>

            <div class="field-label">
              <span>Traits</span>
              <div class="tag-input-container">
                <div class="tag-list" v-if="editingAction.traits?.length">
                  <span
                    v-for="(trait, ti) in editingAction.traits"
                    :key="ti"
                    class="trait-tag"
                  >
                    {{ trait }}
                    <button class="trait-remove" @click="removeTrait(ti)">&times;</button>
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
                  <button class="add-trait-btn" @click="addTrait">+</button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Skill check fields -->
        <template v-if="editingAction.type === 'skill_check'">
          <div class="form-row two-col">
            <label class="field-label">
              <span>Skill</span>
              <input
                type="text"
                class="input"
                v-model="editingAction.skill"
                placeholder="Piloting, Computers..."
              />
            </label>

            <label class="field-label">
              <span>vs Defense</span>
              <select class="input select" v-model="editingAction.vsDefense">
                <option v-for="d in defenseOptions" :key="d.value" :value="d.value || undefined">
                  {{ d.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="form-row">
            <label class="field-label">
              <span>DC (optional)</span>
              <input
                type="number"
                class="input input-number"
                v-model.number="editingAction.dc"
                placeholder="DC"
              />
            </label>
          </div>
        </template>

        <!-- Ability fields -->
        <template v-if="editingAction.type === 'ability'">
          <div class="form-row two-col">
            <label class="field-label">
              <span>vs Defense</span>
              <select class="input select" v-model="editingAction.vsDefense">
                <option v-for="d in defenseOptions" :key="d.value" :value="d.value || undefined">
                  {{ d.label }}
                </option>
              </select>
            </label>

            <label class="field-label">
              <span>DC (optional)</span>
              <input
                type="number"
                class="input input-number"
                v-model.number="editingAction.dc"
                placeholder="DC"
              />
            </label>
          </div>

          <div class="form-row two-col">
            <label class="field-label">
              <span>Damage (optional)</span>
              <input
                type="text"
                class="input"
                v-model="editingAction.damage"
                placeholder="3d6"
              />
            </label>

            <label class="field-label">
              <span>Damage Type</span>
              <input
                type="text"
                class="input"
                v-model="editingAction.damageType"
                placeholder="fire, force..."
              />
            </label>
          </div>
        </template>

        <!-- Outcome effects -->
        <div class="outcomes-section">
          <h6 class="outcomes-title">Effects by Outcome</h6>
          <label class="field-label full-width">
            <span class="outcome-label crit-success">Critical Success</span>
            <textarea
              class="input textarea outcome-textarea"
              v-model="editingAction.effectOnCriticalSuccess"
              placeholder="Effect on critical success..."
              rows="1"
            ></textarea>
          </label>
          <label class="field-label full-width">
            <span class="outcome-label success">Success</span>
            <textarea
              class="input textarea outcome-textarea"
              v-model="editingAction.effectOnSuccess"
              placeholder="Effect on success..."
              rows="1"
            ></textarea>
          </label>
          <label class="field-label full-width">
            <span class="outcome-label failure">Failure</span>
            <textarea
              class="input textarea outcome-textarea"
              v-model="editingAction.effectOnFailure"
              placeholder="Effect on failure..."
              rows="1"
            ></textarea>
          </label>
          <label class="field-label full-width">
            <span class="outcome-label crit-failure">Critical Failure</span>
            <textarea
              class="input textarea outcome-textarea"
              v-model="editingAction.effectOnCriticalFailure"
              placeholder="Effect on critical failure..."
              rows="1"
            ></textarea>
          </label>
        </div>

        <!-- Conditional effects -->
        <div class="form-row two-col">
          <label class="field-label">
            <span>Conditional Damage</span>
            <input
              type="text"
              class="input"
              v-model="editingAction.conditionalDamage"
              placeholder="e.g. +1d6 vs flat-footed"
            />
          </label>

          <label class="field-label">
            <span>Conditional Effect</span>
            <input
              type="text"
              class="input"
              v-model="editingAction.conditionalEffect"
              placeholder="e.g. Grab on hit"
            />
          </label>
        </div>

        <!-- Save / Cancel -->
        <div class="action-edit-buttons">
          <button class="btn btn-save" @click="saveAction">Save Action</button>
          <button class="btn btn-cancel" @click="cancelAction">Cancel</button>
        </div>
      </div>

      <button
        v-if="editingActionIndex === -1"
        class="add-action-btn"
        @click="addAction"
      >
        + Add Action
      </button>
    </div>

    <button class="btn btn-done" @click="emit('close')">
      Done
    </button>
  </div>
</template>

<style scoped>
.routine-editor {
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.editor-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.close-btn {
  padding: 0.125rem 0.375rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-danger);
}

/* Routine-level fields */
.routine-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
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

.full-width {
  grid-column: 1 / -1;
}

/* Inputs */
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

/* Actions section */
.actions-section {
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin: 0 0 0.5rem 0;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

/* Action summary row (collapsed) */
.action-summary {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.action-summary.is-editing {
  border-color: var(--color-accent);
}

.action-summary-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
}

.action-type-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

.action-name {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-cost-badge {
  padding: 0.0625rem 0.25rem;
  background: var(--color-accent);
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.action-type-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  flex-shrink: 0;
}

.action-summary-controls {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
}

.icon-btn {
  padding: 0.125rem 0.25rem;
  background: none;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.icon-btn:hover:not(:disabled) {
  border-color: var(--color-border);
  color: var(--color-text);
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn.danger:hover:not(:disabled) {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

/* Action edit form */
.action-edit-form {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.new-action-form {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
}

.form-row {
  display: flex;
  gap: 0.5rem;
}

.form-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Outcomes section */
.outcomes-section {
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: var(--color-bg);
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

/* Tag input for traits */
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

.trait-tag {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.125rem 0.25rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

.trait-remove {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
}

.trait-remove:hover {
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

.add-trait-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
}

.add-trait-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Buttons */
.action-edit-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.btn-save:hover {
  background: var(--color-accent-hover);
}

.btn-cancel {
  background: var(--color-bg);
  color: var(--color-text-dim);
}

.btn-cancel:hover {
  border-color: var(--color-text-muted);
}

.btn-done {
  width: 100%;
  background: var(--color-bg-surface);
  color: var(--color-accent);
  border-color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-done:hover {
  background: var(--color-accent);
  color: white;
}

.add-action-btn {
  width: 100%;
  padding: 0.5rem;
  background: var(--color-bg-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-action-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
