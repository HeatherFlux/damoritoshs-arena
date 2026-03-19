<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore, themes, backgroundStyles, type ThemeId, type BackgroundStyle } from '../stores/settingsStore'
import { useEncounterStore } from '../stores/encounterStore'
import { usePartyStore } from '../stores/partyStore'
import { useHackingStore } from '../stores/hackingStore'
import { useStarshipStore } from '../stores/starshipStore'
import SchemaViewerModal from './SchemaViewerModal.vue'
import SessionBundleImporter from './SessionBundleImporter.vue'

const { settings, toggleSetting, setTheme, setSetting, testDiscordWebhook } = useSettingsStore()
const encounterStore = useEncounterStore()
const { getCreatureStats, importCustomCreatures, exportCustomCreatures, clearCustomCreatures, getHazardStats, importCustomHazards, exportCustomHazards, clearCustomHazards } = encounterStore
const partyStore = usePartyStore()
const hackingStore = useHackingStore()
const starshipStore = useStarshipStore()

defineEmits<{
  (e: 'close'): void
}>()

// Schema viewer state
const showSchemaViewer = ref(false)
const viewingSchemaId = ref('')
const showBundleImporter = ref(false)

function openSchemaViewer(schemaId: string) {
  viewingSchemaId.value = schemaId
  showSchemaViewer.value = true
}

function openBundleImporter() {
  showBundleImporter.value = true
}

const themeList = Object.entries(themes) as [ThemeId, typeof themes[ThemeId]][]
const bgStyleList = Object.entries(backgroundStyles) as [BackgroundStyle, typeof backgroundStyles[BackgroundStyle]][]

// Collapsible sections
const expandedSections = ref<Set<string>>(new Set())

function toggleSection(id: string) {
  if (expandedSections.value.has(id)) {
    expandedSections.value.delete(id)
  } else {
    expandedSections.value.add(id)
  }
}

function isSectionOpen(id: string) {
  return expandedSections.value.has(id)
}

// Discord webhook state
const webhookTestStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')

async function handleTestWebhook() {
  webhookTestStatus.value = 'testing'
  const success = await testDiscordWebhook()
  webhookTestStatus.value = success ? 'success' : 'error'
  setTimeout(() => {
    webhookTestStatus.value = 'idle'
  }, 3000)
}

// ---- Data import/export ----

// Status tracking per data type
const importStatuses = ref<Record<string, { status: 'idle' | 'success' | 'error'; message: string }>>({})
function getImportStatus(key: string) {
  return importStatuses.value[key] || { status: 'idle', message: '' }
}

function setImportResult(key: string, status: 'success' | 'error', message: string) {
  importStatuses.value[key] = { status, message }
  setTimeout(() => {
    importStatuses.value[key] = { status: 'idle', message: '' }
  }, 3000)
}

function triggerImport(key: string) {
  const el = document.getElementById(`file-input-${key}`) as HTMLInputElement | null
  el?.click()
}

function downloadJson(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Computed stats
const creatureStats = computed(() => getCreatureStats())
const hazardStats = computed(() => getHazardStats())
const partyCount = computed(() => partyStore.state.parties.length)
const encounterCount = computed(() => encounterStore.state.encounters.length)
const hackingCount = computed(() => hackingStore.state.savedEncounters.length)
const starshipCount = computed(() => starshipStore.state.savedScenes.length)

// Data row definitions
interface DataRow {
  key: string
  label: string
  count: string
  schemaId?: string
  schemaFile?: string
  canExport: boolean
  canClear?: boolean
  onImport: (json: string) => void
  onExport: () => void
  onClear?: () => void
  exportFilename: string
}

const dataRows = computed<DataRow[]>(() => [
  {
    key: 'creatures',
    label: 'Creatures',
    count: `${creatureStats.value.total} (${creatureStats.value.custom} custom)`,
    schemaId: 'creatures',
    schemaFile: 'creatures.schema.json',
    canExport: creatureStats.value.custom > 0,
    canClear: creatureStats.value.custom > 0,
    onImport: (json: string) => {
      const n = importCustomCreatures(json)
      setImportResult('creatures', 'success', `+${n}`)
    },
    onExport: () => downloadJson(exportCustomCreatures(), 'custom-creatures.json'),
    onClear: () => {
      if (confirm('Clear all custom/imported creatures? Bundled creatures will remain.')) {
        clearCustomCreatures()
      }
    },
    exportFilename: 'custom-creatures.json',
  },
  {
    key: 'hazards',
    label: 'Hazards',
    count: `${hazardStats.value.total} (${hazardStats.value.custom} custom)`,
    schemaId: 'hazards',
    schemaFile: 'hazards.schema.json',
    canExport: hazardStats.value.custom > 0,
    canClear: hazardStats.value.custom > 0,
    onImport: (json: string) => {
      const n = importCustomHazards(json)
      setImportResult('hazards', 'success', `+${n}`)
    },
    onExport: () => downloadJson(exportCustomHazards(), 'custom-hazards.json'),
    onClear: () => {
      if (confirm('Clear all custom/imported hazards? Bundled hazards will remain.')) {
        clearCustomHazards()
      }
    },
    exportFilename: 'custom-hazards.json',
  },
  {
    key: 'parties',
    label: 'Parties',
    count: `${partyCount.value}`,
    schemaId: 'parties',
    schemaFile: 'parties.schema.json',
    canExport: partyCount.value > 0,
    onImport: (json: string) => {
      const result = partyStore.importParties(json)
      if (result.success) {
        setImportResult('parties', 'success', `+${result.imported}`)
      } else {
        throw new Error(result.error)
      }
    },
    onExport: () => downloadJson(partyStore.exportParties(), 'parties.json'),
    exportFilename: 'parties.json',
  },
  {
    key: 'encounters',
    label: 'Encounters',
    count: `${encounterCount.value}`,
    schemaId: 'encounters',
    schemaFile: 'encounters.schema.json',
    canExport: encounterCount.value > 0,
    onImport: (json: string) => {
      encounterStore.importEncounters(json)
      setImportResult('encounters', 'success', 'Imported')
    },
    onExport: () => downloadJson(encounterStore.exportEncounters(), 'encounters.json'),
    exportFilename: 'encounters.json',
  },
  {
    key: 'hacking',
    label: 'Hacking',
    count: `${hackingCount.value}`,
    schemaId: 'hacking-sessions',
    schemaFile: 'hacking-sessions.schema.json',
    canExport: hackingCount.value > 0,
    onImport: (json: string) => {
      const n = hackingStore.importEncounters(json)
      setImportResult('hacking', 'success', `+${n}`)
    },
    onExport: () => downloadJson(hackingStore.exportEncounters(), 'hacking-sessions.json'),
    exportFilename: 'hacking-sessions.json',
  },
  {
    key: 'starship',
    label: 'Starship',
    count: `${starshipCount.value}`,
    schemaId: 'starship-scenes',
    schemaFile: 'starship-scenes.schema.json',
    canExport: starshipCount.value > 0,
    onImport: (json: string) => {
      starshipStore.importScenes(json)
      setImportResult('starship', 'success', 'Imported')
    },
    onExport: () => downloadJson(starshipStore.exportScenes(), 'starship-scenes.json'),
    exportFilename: 'starship-scenes.json',
  },
])

function handleFileSelect(event: Event, row: DataRow) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      row.onImport(json)
    } catch (err) {
      setImportResult(row.key, 'error', 'Invalid')
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content w-full max-w-md max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-text uppercase tracking-wide">
          <span class="text-accent">//</span> Settings
        </h2>
        <button
          class="btn-secondary btn-icon"
          @click="$emit('close')"
          title="Close"
        >
          &times;
        </button>
      </div>

      <div class="space-y-4">

        <!-- Dice Rolling -->
        <div>
          <label class="flex items-center justify-between p-2.5 bg-elevated cursor-pointer hover:bg-border transition-colors">
            <div class="flex-1">
              <span class="text-sm font-medium text-text">Auto-roll damage</span>
              <p class="text-xs text-dim mt-0.5">Automatically roll damage when rolling to hit</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settings.autoRollDamage"
              @click="toggleSetting('autoRollDamage')"
              class="toggle-switch"
              :class="{ 'toggle-on': settings.autoRollDamage }"
            >
              <span class="toggle-thumb" :class="{ 'toggle-thumb-on': settings.autoRollDamage }"></span>
            </button>
          </label>
        </div>
        
        <!-- Theme Section (collapsible) -->
        <div>
          <button class="section-header" @click="toggleSection('theme')">
            <span class="section-chevron" :class="{ open: isSectionOpen('theme') }">&rsaquo;</span>
            <span>&gt; Theme</span>
          </button>

          <div v-if="isSectionOpen('theme')" class="section-body">
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="[id, theme] in themeList"
                :key="id"
                @click="setTheme(id)"
                class="theme-option"
                :class="{ 'theme-option-active': settings.theme === id }"
                :style="{ '--theme-color': theme.accent }"
              >
                <span class="theme-swatch" :style="{ background: theme.accent }"></span>
                <div class="flex-1 text-left">
                  <span class="block text-sm font-semibold">{{ theme.name }}</span>
                  <span class="block text-xs text-dim">{{ theme.description }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Background Animation (collapsible) -->
        <div>
          <button class="section-header" @click="toggleSection('bg')">
            <span class="section-chevron" :class="{ open: isSectionOpen('bg') }">&rsaquo;</span>
            <span>&gt; Background</span>
          </button>

          <div v-if="isSectionOpen('bg')" class="section-body">
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="[id, bgStyle] in bgStyleList"
                :key="id"
                @click="setSetting('backgroundStyle', id)"
                class="bg-option"
                :class="{ 'bg-option-active': settings.backgroundStyle === id }"
              >
                <span class="bg-icon" :class="`bg-icon-${id}`"></span>
                <div class="flex-1 text-left">
                  <span class="block text-sm font-semibold">{{ bgStyle.name }}</span>
                  <span class="block text-xs text-dim">{{ bgStyle.description }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Discord (collapsible) -->
        <div>
          <button class="section-header" @click="toggleSection('discord')">
            <span class="section-chevron" :class="{ open: isSectionOpen('discord') }">&rsaquo;</span>
            <span>&gt; Discord Webhook</span>
            <span v-if="settings.discordWebhookEnabled" class="ml-auto text-xs text-accent">ON</span>
          </button>

          <div v-if="isSectionOpen('discord')" class="section-body space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs text-dim">Send combat logs and rolls to Discord</p>
              <button
                type="button"
                role="switch"
                :aria-checked="settings.discordWebhookEnabled"
                @click="toggleSetting('discordWebhookEnabled')"
                class="toggle-switch"
                :class="{ 'toggle-on': settings.discordWebhookEnabled }"
                :disabled="!settings.discordWebhookUrl"
              >
                <span class="toggle-thumb" :class="{ 'toggle-thumb-on': settings.discordWebhookEnabled }"></span>
              </button>
            </div>

            <div class="flex gap-2">
              <input
                type="url"
                :value="settings.discordWebhookUrl"
                @input="setSetting('discordWebhookUrl', ($event.target as HTMLInputElement).value)"
                placeholder="https://discord.com/api/webhooks/..."
                class="input flex-1 text-sm"
              />
              <button
                type="button"
                class="btn-secondary text-sm px-3 whitespace-nowrap"
                :class="{
                  'btn-success': webhookTestStatus === 'success',
                  'btn-danger': webhookTestStatus === 'error',
                }"
                :disabled="!settings.discordWebhookUrl || webhookTestStatus === 'testing'"
                @click="handleTestWebhook"
              >
                <span v-if="webhookTestStatus === 'idle'">Test</span>
                <span v-else-if="webhookTestStatus === 'testing'">...</span>
                <span v-else-if="webhookTestStatus === 'success'">OK</span>
                <span v-else-if="webhookTestStatus === 'error'">Fail</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Data Management (collapsible) -->
        <div>
          <button class="section-header" @click="toggleSection('homebrew')">
            <span class="section-chevron" :class="{ open: isSectionOpen('homebrew') }">&rsaquo;</span>
            <span>&gt; Homebrew Upload</span>
          </button>

          <div v-if="isSectionOpen('homebrew')" class="section-body">
            <!-- Compact data rows -->
            <div class="data-list">
              <div
                v-for="row in dataRows"
                :key="row.key"
                class="data-row"
              >
                <input
                  :id="`file-input-${row.key}`"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="handleFileSelect($event, row)"
                />

                <div class="data-row-label">
                  <span class="text-sm font-medium text-text">{{ row.label }}</span>
                  <span class="data-row-count">{{ row.count }}</span>
                </div>

                <div class="data-row-actions">
                  <!-- Import status flash -->
                  <span
                    v-if="getImportStatus(row.key).status !== 'idle'"
                    class="text-xs px-1"
                    :class="{
                      'text-green-400': getImportStatus(row.key).status === 'success',
                      'text-red-400': getImportStatus(row.key).status === 'error',
                    }"
                  >
                    {{ getImportStatus(row.key).message }}
                  </span>

                  <!-- Import -->
                  <button
                    type="button"
                    class="data-btn"
                    title="Import JSON"
                    @click="triggerImport(row.key)"
                  >
                    &uarr;
                  </button>

                  <!-- Export -->
                  <button
                    type="button"
                    class="data-btn"
                    :class="{ disabled: !row.canExport }"
                    :disabled="!row.canExport"
                    title="Export JSON"
                    @click="row.onExport()"
                  >
                    &darr;
                  </button>

                  <!-- Schema -->
                  <button
                    v-if="row.schemaId"
                    type="button"
                    class="data-btn"
                    title="View schema"
                    @click="openSchemaViewer(row.schemaId!)"
                  >
                    { }
                  </button>

                  <!-- Clear (creatures/hazards only) -->
                  <button
                    v-if="row.onClear && row.canClear"
                    type="button"
                    class="data-btn data-btn-danger"
                    title="Clear custom data"
                    @click="row.onClear!()"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>

            <!-- Session Bundle -->
            <div class="mt-3 pt-3 border-t border-border">
              <div class="data-row">
                <div class="data-row-label">
                  <span class="text-sm font-medium text-text">Session Bundle</span>
                  <span class="data-row-count">YAML/JSON</span>
                </div>
                <div class="data-row-actions">
                  <button
                    type="button"
                    class="data-btn"
                    title="View schema"
                    @click="openSchemaViewer('session-bundle')"
                  >
                    { }
                  </button>
                  <button
                    type="button"
                    class="btn-primary text-xs px-2.5 py-1"
                    @click="openBundleImporter"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-border space-y-3">
        <a
          href="https://discord.gg/ABaEmFuyjs"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-secondary w-full text-sm py-2 text-center block"
        >
          Join the Community
        </a>
        <p class="text-xs text-muted text-center">Settings are saved automatically</p>
      </div>
    </div>

    <!-- Schema Viewer Modal -->
    <SchemaViewerModal
      v-if="showSchemaViewer"
      :schema-id="viewingSchemaId"
      @close="showSchemaViewer = false"
    />

    <!-- Session Bundle Importer Modal -->
    <SessionBundleImporter
      v-if="showBundleImporter"
      @close="showBundleImporter = false"
      @imported="showBundleImporter = false"
    />
  </div>
</template>

<style scoped>
/* Collapsible sections */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-dim);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.15s;
}

.section-header:hover {
  color: var(--color-accent);
}

.section-chevron {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.15s;
  font-weight: bold;
}

.section-chevron.open {
  transform: rotate(90deg);
}

.section-body {
  padding: 0.75rem 0;
}

/* Theme options */
.theme-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
}

.theme-option:hover {
  background: var(--color-bg-hover);
  border-color: var(--theme-color);
}

.theme-option-active {
  border-color: var(--theme-color);
  box-shadow:
    inset 0 2px 0 var(--theme-color),
    inset 2px 0 0 var(--theme-color),
    inset -2px 0 0 var(--theme-color),
    inset 0 -2px 0 var(--theme-color);
}

.theme-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 0 10px var(--theme-color);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  background: var(--color-border);
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.toggle-switch.toggle-on {
  background: var(--color-accent);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;
  height: 1.25rem;
  background: white;
  border-radius: 9999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.toggle-thumb.toggle-thumb-on {
  transform: translateX(1.25rem);
}

/* Background Options */
.bg-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
}

.bg-option:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

.bg-option-active {
  border-color: var(--color-accent);
  box-shadow:
    inset 0 2px 0 var(--color-accent),
    inset 2px 0 0 var(--color-accent),
    inset -2px 0 0 var(--color-accent),
    inset 0 -2px 0 var(--color-accent);
}

.bg-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 2px;
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
}

/* Mini previews for each background style */
.bg-icon-none {
  background: var(--color-bg);
}

.bg-icon-gradient-wave {
  background: linear-gradient(-45deg, var(--color-bg), var(--color-accent-subtle), var(--color-bg));
  background-size: 200% 200%;
  animation: miniGradient 2s ease infinite;
}

.bg-icon-dot-matrix::before {
  content: '···';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-accent);
  font-size: 8px;
  letter-spacing: -1px;
  animation: miniPulse 1.5s ease infinite;
}

.bg-icon-particle-field::before,
.bg-icon-particle-field::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 3px;
  background: var(--color-accent);
  border-radius: 50%;
  opacity: 0.7;
}
.bg-icon-particle-field::before {
  top: 4px;
  left: 5px;
}
.bg-icon-particle-field::after {
  bottom: 5px;
  right: 4px;
}

.bg-icon-cyber-grid {
  background-image:
    linear-gradient(var(--color-accent-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-accent-subtle) 1px, transparent 1px);
  background-size: 6px 6px;
}

.bg-icon-floating-blobs::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 8px;
  background: var(--color-accent);
  opacity: 0.3;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: blur(2px);
}

.bg-icon-random-dots::before,
.bg-icon-random-dots::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: miniBlink 1s ease infinite;
}
.bg-icon-random-dots::before {
  top: 6px;
  left: 8px;
  animation-delay: 0.2s;
}
.bg-icon-random-dots::after {
  bottom: 8px;
  right: 6px;
  animation-delay: 0.5s;
}

@keyframes miniGradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes miniPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes miniBlink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}

/* Data list */
.data-list {
  display: flex;
  flex-direction: column;
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.1s;
}

.data-row:last-child {
  border-bottom: none;
}

.data-row:hover {
  background: var(--color-bg-elevated);
}

.data-row-label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.data-row-count {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.data-row-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.data-btn {
  padding: 0.2rem 0.4rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  font-size: 0.7rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.1s;
  line-height: 1;
}

.data-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.data-btn.disabled {
  opacity: 0.3;
  cursor: default;
}

.data-btn.disabled:hover {
  border-color: var(--color-border);
  color: var(--color-text-dim);
}

.data-btn-danger:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
