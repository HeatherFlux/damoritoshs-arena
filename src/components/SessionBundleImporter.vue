<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseSessionBundle, previewSessionBundle, importSessionBundle, type SessionBundle, type ImportResult } from '../utils/sessionBundleImporter'
import { useEncounterStore } from '../stores/encounterStore'
import { useHackingStore } from '../stores/hackingStore'
import { useStarshipStore } from '../stores/starshipStore'
import { usePartyStore } from '../stores/partyStore'
import { useShopStore } from '../stores/shopStore'

defineEmits<{
  (e: 'close'): void
  (e: 'imported', result: ImportResult): void
}>()

const encounterStore = useEncounterStore()
const hackingStore = useHackingStore()
const starshipStore = useStarshipStore()
const partyStore = usePartyStore()
const shopStore = useShopStore()

const fileInput = ref<HTMLInputElement | null>(null)
const textContent = ref('')
const activeMode = ref<'file' | 'paste'>('file')
const fileName = ref('')

const parseError = ref('')
const parsedBundle = ref<SessionBundle | null>(null)
const importResult = ref<ImportResult | null>(null)
const importing = ref(false)

const preview = computed(() => {
  if (!parsedBundle.value) return null
  return previewSessionBundle(parsedBundle.value)
})

const totalItems = computed(() => {
  if (!preview.value) return 0
  return (preview.value.creatures +
    preview.value.hazards +
    (preview.value.party ? 1 : 0) +
    preview.value.encounters.length +
    preview.value.hacking.length +
    preview.value.starship.length +
    preview.value.shops.length)
})

function handleFileClick() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    textContent.value = content
    tryParse(content)
  }
  reader.readAsText(file)
  target.value = ''
}

function handlePasteInput() {
  if (textContent.value.trim()) {
    tryParse(textContent.value)
  } else {
    parsedBundle.value = null
    parseError.value = ''
  }
}

function tryParse(content: string) {
  parseError.value = ''
  parsedBundle.value = null
  importResult.value = null

  try {
    parsedBundle.value = parseSessionBundle(content)
    if (!parsedBundle.value.name) {
      parseError.value = 'Bundle must have a "name" field'
      parsedBundle.value = null
    }
  } catch (e) {
    parseError.value = (e as Error).message
  }
}

function doImport() {
  if (!parsedBundle.value) return

  importing.value = true
  try {
    const result = importSessionBundle(parsedBundle.value, {
      encounterStore,
      hackingStore,
      starshipStore,
      partyStore,
      shopStore,
    })
    importResult.value = result
  } catch (e) {
    parseError.value = `Import failed: ${(e as Error).message}`
  } finally {
    importing.value = false
  }
}

function reset() {
  textContent.value = ''
  fileName.value = ''
  parsedBundle.value = null
  parseError.value = ''
  importResult.value = null
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content w-full max-w-lg max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-text uppercase tracking-wide">
          <span class="text-accent">//</span> Import Session Bundle
        </h2>
        <button class="btn-secondary btn-icon" @click="$emit('close')" title="Close">&times;</button>
      </div>

      <!-- Import Result -->
      <div v-if="importResult" class="space-y-3">
        <div class="p-3 bg-elevated border-l-2"
             :class="importResult.warnings.length === 0 ? 'border-green-500' : 'border-yellow-500'">
          <h3 class="font-semibold text-text mb-2">
            {{ importResult.warnings.length === 0 ? 'Import Complete' : 'Import Complete (with warnings)' }}
          </h3>
          <p class="text-sm text-dim mb-2">Session: {{ importResult.sessionName }}</p>

          <div class="grid grid-cols-2 gap-1 text-sm">
            <span v-if="importResult.creatures" class="text-text">Creatures: {{ importResult.creatures }}</span>
            <span v-if="importResult.hazards" class="text-text">Hazards: {{ importResult.hazards }}</span>
            <span v-if="importResult.parties" class="text-text">Parties: {{ importResult.parties }}</span>
            <span v-if="importResult.encounters" class="text-text">Encounters: {{ importResult.encounters }}</span>
            <span v-if="importResult.hackingSessions" class="text-text">Hacking: {{ importResult.hackingSessions }}</span>
            <span v-if="importResult.starshipScenes" class="text-text">Starship: {{ importResult.starshipScenes }}</span>
            <span v-if="importResult.shops" class="text-text">Shops: {{ importResult.shops }}</span>
          </div>
        </div>

        <!-- Warnings -->
        <div v-if="importResult.warnings.length > 0" class="space-y-1">
          <h4 class="text-xs font-semibold text-yellow-400 uppercase">Warnings</h4>
          <div
            v-for="(w, i) in importResult.warnings"
            :key="i"
            class="text-xs text-dim p-2 bg-elevated"
          >
            <span class="text-yellow-400">[{{ w.section }}]</span>
            <span v-if="w.item" class="text-text"> {{ w.item }}:</span>
            {{ w.message }}
          </div>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary text-sm flex-1" @click="reset">Import Another</button>
          <button class="btn-primary text-sm flex-1" @click="$emit('close')">Done</button>
        </div>
      </div>

      <!-- Input Form -->
      <template v-else>
        <p class="text-xs text-dim mb-3">
          Import a YAML or JSON session bundle containing creatures, encounters, hacking sessions, starship scenes, and more.
        </p>

        <!-- Mode Toggle -->
        <div class="flex gap-1 mb-3">
          <button
            class="tab-btn text-xs px-3 py-1.5"
            :class="{ 'tab-btn-active': activeMode === 'file' }"
            @click="activeMode = 'file'; reset()"
          >
            Upload File
          </button>
          <button
            class="tab-btn text-xs px-3 py-1.5"
            :class="{ 'tab-btn-active': activeMode === 'paste' }"
            @click="activeMode = 'paste'; reset()"
          >
            Paste Content
          </button>
        </div>

        <!-- File Upload -->
        <div v-if="activeMode === 'file'" class="mb-3">
          <input
            ref="fileInput"
            type="file"
            accept=".yaml,.yml,.json"
            class="hidden"
            @change="handleFileSelect"
          />
          <button
            class="btn-secondary w-full py-3 text-sm border-dashed"
            @click="handleFileClick"
          >
            {{ fileName || 'Choose .yaml or .json file...' }}
          </button>
        </div>

        <!-- Paste Area -->
        <div v-else class="mb-3">
          <textarea
            v-model="textContent"
            @input="handlePasteInput"
            class="input w-full h-40 font-mono text-xs resize-y"
            placeholder="Paste YAML or JSON content here..."
          ></textarea>
        </div>

        <!-- Parse Error -->
        <div v-if="parseError" class="p-2 bg-elevated border-l-2 border-red-500 text-xs text-red-400 mb-3">
          {{ parseError }}
        </div>

        <!-- Preview -->
        <div v-if="preview" class="p-3 bg-elevated space-y-2 mb-3 flex-1 overflow-auto">
          <h3 class="font-semibold text-text text-sm">{{ parsedBundle?.name }}</h3>
          <p v-if="parsedBundle?.description" class="text-xs text-dim">{{ parsedBundle.description }}</p>

          <div class="grid grid-cols-2 gap-1 text-xs">
            <div v-if="preview.creatures" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">{{ preview.creatures }} creature{{ preview.creatures !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="preview.hazards" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">{{ preview.hazards }} hazard{{ preview.hazards !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="preview.party" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">Party: {{ preview.party }}</span>
            </div>
            <div v-for="name in preview.encounters" :key="'enc-' + name" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">Enc: {{ name }}</span>
            </div>
            <div v-for="name in preview.hacking" :key="'hack-' + name" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">Hack: {{ name }}</span>
            </div>
            <div v-for="name in preview.starship" :key="'ship-' + name" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">Ship: {{ name }}</span>
            </div>
            <div v-for="name in preview.shops" :key="'shop-' + name" class="flex items-center gap-1">
              <span class="text-accent">+</span>
              <span class="text-text">Shop: {{ name }}</span>
            </div>
          </div>
        </div>

        <!-- Import Button -->
        <button
          class="btn-primary w-full text-sm"
          :disabled="!parsedBundle || importing"
          @click="doImport"
        >
          {{ importing ? 'Importing...' : `Import ${totalItems} item${totalItems !== 1 ? 's' : ''}` }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.tab-btn-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-bg);
}
</style>
