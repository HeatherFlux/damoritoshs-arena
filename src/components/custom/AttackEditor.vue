<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Attack } from '../../types/creature'
import WeaponTraitPicker from './WeaponTraitPicker.vue'

const emit = defineEmits<{
  add: [attack: Attack]
}>()

const isOpen = ref(false)

// Form state
const name = ref('')
const type = ref<'melee' | 'ranged' | 'area'>('melee')
const bonus = ref(5)
const damage = ref('')
const traits = ref<string[]>([])
const actions = ref<1 | 2 | 3>(1)
const range = ref('')
const area = ref('')

const isValid = computed(() => {
  return name.value.trim() && damage.value.trim()
})

function toggle() {
  isOpen.value = !isOpen.value
}

function reset() {
  name.value = ''
  type.value = 'melee'
  bonus.value = 5
  damage.value = ''
  traits.value = []
  actions.value = 1
  range.value = ''
  area.value = ''
}

function handleAdd() {
  if (!isValid.value) return

  const attack: Attack = {
    name: name.value.trim(),
    type: type.value,
    bonus: bonus.value,
    damage: damage.value.trim(),
    traits: [...traits.value],
    actions: actions.value,
  }

  if (type.value === 'ranged' && range.value.trim()) {
    attack.range = range.value.trim()
  }

  if (type.value === 'area' && area.value.trim()) {
    attack.area = area.value.trim()
  }

  emit('add', attack)
  reset()
  isOpen.value = false
}
</script>

<template>
  <div class="attack-editor">
    <button
      v-if="!isOpen"
      type="button"
      class="add-button"
      @click="toggle"
    >
      <span class="add-icon">+</span>
      Add Attack
    </button>

    <div v-else class="editor-form">
      <div class="editor-header">
        <span class="editor-title">New Attack</span>
        <button type="button" class="btn-icon btn-xs" @click="toggle">×</button>
      </div>

      <div class="form-group">
        <label class="form-label">Name <span class="text-danger">*</span></label>
        <input
          v-model="name"
          type="text"
          class="input input-sm"
          placeholder="Claw, Laser Rifle, etc."
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select v-model="type" class="input input-sm select">
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
            <option value="area">Area</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Bonus</label>
          <input
            v-model.number="bonus"
            type="number"
            class="input input-sm"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Actions</label>
          <select v-model.number="actions" class="input input-sm select">
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Damage <span class="text-danger">*</span></label>
        <input
          v-model="damage"
          type="text"
          class="input input-sm"
          placeholder="2d6+4 slashing"
        />
      </div>

      <div v-if="type === 'ranged'" class="form-group">
        <label class="form-label">Range</label>
        <input
          v-model="range"
          type="text"
          class="input input-sm"
          placeholder="60 feet"
        />
      </div>

      <div v-if="type === 'area'" class="form-group">
        <label class="form-label">Area</label>
        <input
          v-model="area"
          type="text"
          class="input input-sm"
          placeholder="15-foot cone"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Traits</label>
        <WeaponTraitPicker v-model="traits" />
      </div>

      <div class="editor-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="toggle">Cancel</button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="!isValid"
          @click="handleAdd"
        >
          Add Attack
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attack-editor {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 1.5rem;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

/* Hide number input spinners */
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
