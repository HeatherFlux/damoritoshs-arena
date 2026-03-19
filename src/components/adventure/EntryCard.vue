<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  id: string
  text: string
  notes?: string
  generated?: boolean
  badges?: Array<{ label: string; color?: string }>
  isEditing?: boolean
}>()

const emit = defineEmits<{
  'update:text': [text: string]
  'update:notes': [notes: string]
  delete: []
  'start-edit': []
  'stop-edit': []
}>()

const editText = ref(props.text)
const editNotes = ref(props.notes || '')

watch(() => props.text, (v) => { editText.value = v })
watch(() => props.notes, (v) => { editNotes.value = v || '' })

function startEdit() {
  editText.value = props.text
  editNotes.value = props.notes || ''
  emit('start-edit')
}

function stopEdit() {
  if (editText.value.trim() !== props.text) {
    emit('update:text', editText.value.trim())
  }
  if (editNotes.value.trim() !== (props.notes || '')) {
    emit('update:notes', editNotes.value.trim())
  }
  emit('stop-edit')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    stopEdit()
  }
}
</script>

<template>
  <div
    class="group bg-elevated border border-border rounded p-3 transition-all duration-150 hover:border-border-hover"
    :class="{ 'opacity-75': generated && !isEditing }"
  >
    <!-- Header: badges + delete -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span
          v-for="badge in badges"
          :key="badge.label"
          class="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
          :class="badge.color || 'bg-accent/15 text-accent'"
        >
          {{ badge.label }}
        </span>
        <span v-if="generated" class="text-[0.55rem] uppercase tracking-wider text-dim italic">
          generated
        </span>
      </div>
      <button
        class="btn-icon-tiny opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-danger"
        @click="$emit('delete')"
        title="Delete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>
      </button>
    </div>

    <!-- Text: click to edit -->
    <div v-if="!isEditing" class="text-sm text-text cursor-pointer" @click="startEdit">
      {{ text }}
    </div>

    <!-- Edit mode -->
    <div v-else>
      <textarea
        v-model="editText"
        class="input w-full text-sm resize-y min-h-[3rem] mb-2"
        rows="2"
        @blur="stopEdit"
        @keydown="handleKeydown"
        ref="editInput"
        autofocus
      ></textarea>
      <textarea
        v-model="editNotes"
        class="input input-ghost w-full text-xs resize-y text-dim"
        rows="1"
        placeholder="GM notes (optional)..."
        @keydown="handleKeydown"
      ></textarea>
    </div>

    <!-- Notes (collapsed when not editing) -->
    <details v-if="notes && !isEditing" class="mt-2">
      <summary class="text-[0.6rem] uppercase tracking-widest text-dim cursor-pointer hover:text-text transition-colors">
        Notes
      </summary>
      <p class="text-xs text-dim mt-1 pl-2 border-l-2 border-border">{{ notes }}</p>
    </details>

    <!-- Slot for extra content (scene connections etc.) -->
    <slot />
  </div>
</template>

<style scoped>
.btn-icon-tiny {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-icon-tiny:hover {
  background: var(--color-bg-hover);
}
</style>
