<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpecialAbility } from '../../types/creature'
import AbilityTraitPicker from './AbilityTraitPicker.vue'

const emit = defineEmits<{
  add: [ability: SpecialAbility]
}>()

const isOpen = ref(false)

// Form state
const name = ref('')
const description = ref('')
const actions = ref<0 | 1 | 2 | 3 | 'reaction' | 'free' | undefined>(undefined)
const traits = ref<string[]>([])

const isValid = computed(() => {
  return name.value.trim() && description.value.trim()
})

function toggle() {
  isOpen.value = !isOpen.value
}

function reset() {
  name.value = ''
  description.value = ''
  actions.value = undefined
  traits.value = []
}

function handleAdd() {
  if (!isValid.value) return

  const ability: SpecialAbility = {
    name: name.value.trim(),
    description: description.value.trim(),
  }

  if (actions.value !== undefined) {
    ability.actions = actions.value
  }

  if (traits.value.length > 0) {
    ability.traits = [...traits.value]
  }

  emit('add', ability)
  reset()
  isOpen.value = false
}
</script>

<template>
  <div class="ability-editor">
    <button
      v-if="!isOpen"
      type="button"
      class="add-button"
      @click="toggle"
    >
      <span class="add-icon">+</span>
      Add Ability
    </button>

    <div v-else class="editor-form">
      <div class="editor-header">
        <span class="editor-title">New Ability</span>
        <button type="button" class="btn-icon btn-xs" @click="toggle">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input
          v-model="name"
          type="text"
          class="input input-sm"
          placeholder="Regeneration, Frightful Presence, etc."
        />
      </div>

      <div class="form-group">
        <label class="form-label">Actions</label>
        <select v-model="actions" class="input input-sm select">
          <option :value="undefined">None (passive)</option>
          <option value="free">Free</option>
          <option value="reaction">Reaction</option>
          <option :value="1">1 Action</option>
          <option :value="2">2 Actions</option>
          <option :value="3">3 Actions</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Description <span class="text-danger">*</span></label>
        <textarea
          v-model="description"
          class="input input-sm textarea"
          placeholder="Describe what this ability does..."
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Traits</label>
        <AbilityTraitPicker v-model="traits" />
      </div>

      <div class="editor-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="toggle">Cancel</button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="!isValid"
          @click="handleAdd"
        >
          Add Ability
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ability-editor {
  margin-top: 0.5rem;
}

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.add-icon {
  font-size: 1rem;
  font-weight: bold;
}

.editor-form {
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  animation: slide-in 0.15s ease;
}

@keyframes slide-in {
  0% { opacity: 0; transform: translateY(-0.5rem); }
  100% { opacity: 1; transform: translateY(0); }
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.editor-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.form-group {
  margin-bottom: 0.5rem;
}

.form-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 1.5rem;
}

.textarea {
  resize: vertical;
  min-height: 4rem;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}
</style>
