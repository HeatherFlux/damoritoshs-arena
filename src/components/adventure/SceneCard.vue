<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AdventureScene, SceneType, SceneTension } from '../../types/adventure'
import { useAdventureStore } from '../../stores/adventureStore'

const props = defineProps<{
  scene: AdventureScene
  allScenes: AdventureScene[]
  isEditing: boolean
}>()

const emit = defineEmits<{
  'start-edit': []
  'stop-edit': []
  delete: []
}>()

const store = useAdventureStore()
const showLinkDropdown = ref(false)

const editText = ref(props.scene.text)
const editNotes = ref(props.scene.notes || '')

watch(() => props.scene.text, (v) => { editText.value = v })
watch(() => props.scene.notes, (v) => { editNotes.value = v || '' })

const linkedScenes = computed(() => {
  return props.scene.leadsTo
    .map(id => props.allScenes.find(s => s.id === id))
    .filter(Boolean) as AdventureScene[]
})

const availableToLink = computed(() => {
  return props.allScenes.filter(
    s => s.id !== props.scene.id && !props.scene.leadsTo.includes(s.id)
  )
})

const typeColors: Record<SceneType, string> = {
  combat: 'bg-danger/15 text-danger',
  exploration: 'bg-success/15 text-success',
  social: 'bg-accent/15 text-accent',
  puzzle: 'bg-warning/15 text-warning',
  chase: 'bg-secondary/15 text-secondary',
  heist: 'bg-secondary/15 text-secondary',
  starship: 'bg-accent/15 text-accent',
}

const tensionColors: Record<SceneTension, string> = {
  low: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-danger/10 text-danger',
  climax: 'bg-danger/20 text-danger',
}

function truncate(text: string, max: number = 30): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function startEdit() {
  editText.value = props.scene.text
  editNotes.value = props.scene.notes || ''
  emit('start-edit')
}

function stopEdit() {
  const updates: Partial<AdventureScene> = {}
  if (editText.value.trim() !== props.scene.text) updates.text = editText.value.trim()
  if (editNotes.value.trim() !== (props.scene.notes || '')) updates.notes = editNotes.value.trim() || undefined
  if (Object.keys(updates).length) store.updateScene(props.scene.id, updates)
  emit('stop-edit')
}

function handleLink(targetId: string) {
  store.linkScenes(props.scene.id, targetId)
  showLinkDropdown.value = false
}

function handleUnlink(targetId: string) {
  store.unlinkScenes(props.scene.id, targetId)
}
</script>

<template>
  <div
    class="group bg-elevated border border-border rounded p-3 transition-all duration-150 hover:border-border-hover"
    :class="{ 'opacity-75': scene.generated && !isEditing }"
  >
    <!-- Header: type + tension badges + delete -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span
          v-if="scene.type"
          class="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
          :class="typeColors[scene.type] || 'bg-accent/15 text-accent'"
        >
          {{ scene.type }}
        </span>
        <span
          v-if="scene.tension"
          class="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
          :class="tensionColors[scene.tension] || ''"
        >
          {{ scene.tension }}
        </span>
        <span v-if="scene.generated" class="text-[0.55rem] uppercase tracking-wider text-dim italic">
          generated
        </span>
      </div>
      <button
        class="btn-icon-tiny opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-danger"
        @click="$emit('delete')"
        title="Delete scene"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
        </svg>
      </button>
    </div>

    <!-- Text: click to edit -->
    <div v-if="!isEditing" class="text-sm text-text cursor-pointer mb-2" @click="startEdit">
      {{ scene.text }}
    </div>

    <!-- Edit mode -->
    <div v-else class="mb-2">
      <textarea
        v-model="editText"
        class="input w-full text-sm resize-y min-h-[3rem] mb-2"
        rows="2"
        @blur="stopEdit"
        @keydown.escape="stopEdit"
        autofocus
      ></textarea>
      <textarea
        v-model="editNotes"
        class="input input-ghost w-full text-xs resize-y text-dim"
        rows="1"
        placeholder="GM notes (optional)..."
      ></textarea>
    </div>

    <!-- Notes (collapsed when not editing) -->
    <details v-if="scene.notes && !isEditing" class="mb-2">
      <summary class="text-[0.6rem] uppercase tracking-widest text-dim cursor-pointer hover:text-text transition-colors">
        Notes
      </summary>
      <p class="text-xs text-dim mt-1 pl-2 border-l-2 border-border">{{ scene.notes }}</p>
    </details>

    <!-- Connection pills -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[0.6rem] uppercase tracking-widest text-dim mr-1">Leads to:</span>
      <span
        v-for="linked in linkedScenes"
        :key="linked.id"
        class="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 cursor-default"
      >
        {{ truncate(linked.text) }}
        <button
          class="hover:text-danger transition-colors"
          @click.stop="handleUnlink(linked.id)"
          title="Remove connection"
        >
          &times;
        </button>
      </span>

      <!-- Add connection -->
      <div class="relative">
        <button
          v-if="availableToLink.length > 0"
          class="text-[0.65rem] px-2 py-0.5 rounded border border-dashed border-border text-dim hover:text-accent hover:border-accent transition-colors"
          @click.stop="showLinkDropdown = !showLinkDropdown"
        >
          +
        </button>
        <div
          v-if="showLinkDropdown"
          class="absolute top-full left-0 mt-1 bg-elevated border border-border rounded shadow-lg z-10 min-w-[12rem] max-h-[10rem] overflow-y-auto"
        >
          <button
            v-for="target in availableToLink"
            :key="target.id"
            class="block w-full text-left px-3 py-1.5 text-xs text-dim hover:text-text hover:bg-hover transition-colors"
            @click="handleLink(target.id)"
          >
            {{ truncate(target.text, 45) }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- Close dropdown on outside click -->
  <div v-if="showLinkDropdown" class="fixed inset-0 z-[5]" @click="showLinkDropdown = false"></div>
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
