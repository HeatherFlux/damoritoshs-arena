<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import StrongStartSection from './StrongStartSection.vue'
import SceneSection from './SceneSection.vue'
import SecretSection from './SecretSection.vue'
import LocationSection from './LocationSection.vue'
import NPCSection from './NPCSection.vue'

const store = useAdventureStore()

const adventure = computed(() => store.state.currentAdventure)
const editingName = ref(false)
const nameInput = ref('')

// Collapsible section state
const sections = ref({
  strongStart: true,
  scenes: true,
  secrets: true,
  locations: true,
  npcs: true,
})

function toggleSection(key: keyof typeof sections.value) {
  sections.value[key] = !sections.value[key]
}

function startRenamingAdventure() {
  if (!adventure.value) return
  nameInput.value = adventure.value.name
  editingName.value = true
}

function finishRenamingAdventure() {
  if (nameInput.value.trim()) {
    store.renameAdventure(nameInput.value.trim())
  }
  editingName.value = false
}

function handleCopyMarkdown() {
  const md = store.adventureToMarkdown()
  navigator.clipboard.writeText(md)
}

function handleExportJson() {
  if (!adventure.value) return
  const json = JSON.stringify(adventure.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${adventure.value.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleNew() {
  store.createAdventure()
}
</script>

<template>
  <section class="flex-1 overflow-y-auto p-4 lg:p-6">
    <!-- No adventure loaded -->
    <div v-if="!adventure" class="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div class="text-dim">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" class="opacity-30 mb-4 mx-auto">
          <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2zM4.5 8a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"/>
        </svg>
        <h2 class="text-lg text-text mb-2 font-bold uppercase tracking-wider">Adventure Prep</h2>
        <p class="text-sm text-dim mb-4">Lazy DM style session prep.<br>Create a new adventure or load a saved one from the sidebar.</p>
      </div>
      <button class="btn btn-primary" @click="handleNew">
        + New Adventure
      </button>
    </div>

    <!-- Adventure loaded -->
    <div v-else class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 pb-3 border-b border-border">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-accent text-lg font-bold">//</span>
          <h2
            v-if="!editingName"
            class="text-lg font-bold text-text uppercase tracking-wider cursor-pointer truncate hover:text-accent transition-colors"
            @click="startRenamingAdventure"
            title="Click to rename"
          >
            {{ adventure.name }}
          </h2>
          <input
            v-else
            v-model="nameInput"
            class="input text-lg font-bold uppercase tracking-wider flex-1"
            @blur="finishRenamingAdventure"
            @keydown.enter="finishRenamingAdventure"
            @keydown.escape="editingName = false"
            autofocus
          />
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            class="btn btn-secondary btn-xs"
            @click="handleExportJson"
            title="Export as JSON"
          >
            Export
          </button>
          <button
            class="btn btn-secondary btn-xs"
            @click="handleCopyMarkdown"
            title="Copy Lazy DM markdown to clipboard"
          >
            Copy MD
          </button>
        </div>
      </div>

      <!-- Sections -->
      <div class="flex flex-col gap-6">
        <!-- Strong Start -->
        <div>
          <button
            class="w-full text-left mb-0"
            @click="toggleSection('strongStart')"
          >
            <span class="text-xs text-dim">{{ sections.strongStart ? '▼' : '▶' }}</span>
          </button>
          <StrongStartSection v-if="sections.strongStart" />
        </div>

        <!-- Scenes -->
        <div>
          <button
            class="w-full text-left mb-0"
            @click="toggleSection('scenes')"
          >
            <span class="text-xs text-dim">{{ sections.scenes ? '▼' : '▶' }}</span>
          </button>
          <SceneSection v-if="sections.scenes" />
        </div>

        <!-- Secrets -->
        <div>
          <button
            class="w-full text-left mb-0"
            @click="toggleSection('secrets')"
          >
            <span class="text-xs text-dim">{{ sections.secrets ? '▼' : '▶' }}</span>
          </button>
          <SecretSection v-if="sections.secrets" />
        </div>

        <!-- Locations -->
        <div>
          <button
            class="w-full text-left mb-0"
            @click="toggleSection('locations')"
          >
            <span class="text-xs text-dim">{{ sections.locations ? '▼' : '▶' }}</span>
          </button>
          <LocationSection v-if="sections.locations" />
        </div>

        <!-- NPCs -->
        <div>
          <button
            class="w-full text-left mb-0"
            @click="toggleSection('npcs')"
          >
            <span class="text-xs text-dim">{{ sections.npcs ? '▼' : '▶' }}</span>
          </button>
          <NPCSection v-if="sections.npcs" />
        </div>
      </div>

      <!-- Bottom spacing -->
      <div class="h-12"></div>
    </div>
  </section>
</template>
