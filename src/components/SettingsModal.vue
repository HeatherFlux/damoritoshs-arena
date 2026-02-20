<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore, themes, backgroundStyles, type ThemeId, type BackgroundStyle } from '../stores/settingsStore'
import { useEncounterStore } from '../stores/encounterStore'
import { usePartyStore } from '../stores/partyStore'

const { settings, toggleSetting, setTheme, setSetting, testDiscordWebhook } = useSettingsStore()
const { getCreatureStats, importCustomCreatures, exportCustomCreatures, clearCustomCreatures, getHazardStats, importCustomHazards, exportCustomHazards, clearCustomHazards } = useEncounterStore()
const partyStore = usePartyStore()

defineEmits<{
  (e: 'close'): void
}>()

const themeList = Object.entries(themes) as [ThemeId, typeof themes[ThemeId]][]
const bgStyleList = Object.entries(backgroundStyles) as [BackgroundStyle, typeof backgroundStyles[BackgroundStyle]][]

// Discord webhook state
const webhookTestStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')

// Creature data state
const creatureStats = computed(() => getCreatureStats())
const importStatus = ref<'idle' | 'success' | 'error'>('idle')
const importMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// Hazard data state
const hazardStats = computed(() => getHazardStats())
const hazardImportStatus = ref<'idle' | 'success' | 'error'>('idle')
const hazardImportMessage = ref('')
const hazardFileInput = ref<HTMLInputElement | null>(null)

// Party data state
const partyImportStatus = ref<'idle' | 'success' | 'error'>('idle')
const partyImportMessage = ref('')
const partyFileInput = ref<HTMLInputElement | null>(null)
const partyCount = computed(() => partyStore.state.parties.length)

async function handleTestWebhook() {
  webhookTestStatus.value = 'testing'
  const success = await testDiscordWebhook()
  webhookTestStatus.value = success ? 'success' : 'error'
  setTimeout(() => {
    webhookTestStatus.value = 'idle'
  }, 3000)
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      const count = importCustomCreatures(json)
      importStatus.value = 'success'
      importMessage.value = `Imported ${count} creatures`
    } catch (err) {
      importStatus.value = 'error'
      importMessage.value = 'Invalid JSON file'
    }
    setTimeout(() => {
      importStatus.value = 'idle'
      importMessage.value = ''
    }, 3000)
  }
  reader.readAsText(file)
  target.value = '' // Reset so same file can be selected again
}

function handleExport() {
  const json = exportCustomCreatures()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'custom-creatures.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleClearCustom() {
  if (confirm('Clear all custom/imported creatures? Bundled creatures will remain.')) {
    clearCustomCreatures()
  }
}

// Hazard handlers
function handleHazardImportClick() {
  hazardFileInput.value?.click()
}

function handleHazardFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      const count = importCustomHazards(json)
      hazardImportStatus.value = 'success'
      hazardImportMessage.value = `Imported ${count} hazards`
    } catch (err) {
      hazardImportStatus.value = 'error'
      hazardImportMessage.value = 'Invalid JSON file'
    }
    setTimeout(() => {
      hazardImportStatus.value = 'idle'
      hazardImportMessage.value = ''
    }, 3000)
  }
  reader.readAsText(file)
  target.value = ''
}

function handleHazardExport() {
  const json = exportCustomHazards()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'custom-hazards.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleClearCustomHazards() {
  if (confirm('Clear all custom/imported hazards? Bundled hazards will remain.')) {
    clearCustomHazards()
  }
}

// Party handlers
function handlePartyImportClick() {
  partyFileInput.value?.click()
}

function handlePartyFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      const result = partyStore.importParties(json)
      if (result.success) {
        partyImportStatus.value = 'success'
        partyImportMessage.value = `Imported ${result.imported} parties`
      } else {
        partyImportStatus.value = 'error'
        partyImportMessage.value = result.error || 'Import failed'
      }
    } catch (err) {
      partyImportStatus.value = 'error'
      partyImportMessage.value = 'Invalid JSON file'
    }
    setTimeout(() => {
      partyImportStatus.value = 'idle'
      partyImportMessage.value = ''
    }, 3000)
  }
  reader.readAsText(file)
  target.value = ''
}

function handlePartyExport() {
  const json = partyStore.exportParties()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'parties.json'
  a.click()
  URL.revokeObjectURL(url)
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

      <div class="space-y-6">
        <!-- Theme Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Theme</h3>

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

        <!-- Background Animation Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Background Animation</h3>

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

        <!-- Dice Rolling Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Dice Rolling</h3>

          <label class="flex items-center justify-between p-3 bg-elevated cursor-pointer hover:bg-border transition-colors">
            <div class="flex-1">
              <span class="font-medium text-text">Auto-roll damage</span>
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

        <!-- Integrations Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Integrations</h3>

          <div class="space-y-3">
            <!-- Discord Webhook URL -->
            <div class="p-3 bg-elevated">
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-text">Discord Webhook</span>
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
              <p class="text-xs text-dim mb-3">Send combat logs and rolls to a Discord channel</p>

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
                  <span v-else-if="webhookTestStatus === 'success'">✓</span>
                  <span v-else-if="webhookTestStatus === 'error'">✗</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Creature Data Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Creature Data</h3>

          <div class="p-3 bg-elevated space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-text">Loaded Creatures</span>
                <p class="text-xs text-dim mt-0.5">
                  {{ creatureStats.total }} total ({{ creatureStats.bundled }} bundled, {{ creatureStats.custom }} custom/AoN)
                </p>
              </div>
            </div>

            <p class="text-xs text-dim">
              Bundled creatures from AoN. Import JSON to add your own custom creatures.
            </p>

            <div class="flex gap-2">
              <input
                ref="fileInput"
                type="file"
                accept=".json"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :class="{
                  'btn-success': importStatus === 'success',
                  'btn-danger': importStatus === 'error',
                }"
                @click="handleImportClick"
              >
                {{ importMessage || 'Import JSON' }}
              </button>
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :disabled="creatureStats.custom === 0"
                @click="handleExport"
              >
                Export Custom
              </button>
            </div>

            <button
              v-if="creatureStats.custom > 0"
              type="button"
              class="btn-danger text-sm w-full"
              @click="handleClearCustom"
            >
              Clear Custom Creatures
            </button>
          </div>
        </div>

        <!-- Hazard Data Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Hazard Data</h3>

          <div class="p-3 bg-elevated space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-text">Loaded Hazards</span>
                <p class="text-xs text-dim mt-0.5">
                  {{ hazardStats.total }} total ({{ hazardStats.bundled }} bundled, {{ hazardStats.custom }} custom)
                </p>
              </div>
            </div>

            <p class="text-xs text-dim">
              Bundled hazards from SF2e. Import JSON to add your own custom hazards.
            </p>

            <div class="flex gap-2">
              <input
                ref="hazardFileInput"
                type="file"
                accept=".json"
                class="hidden"
                @change="handleHazardFileSelect"
              />
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :class="{
                  'btn-success': hazardImportStatus === 'success',
                  'btn-danger': hazardImportStatus === 'error',
                }"
                @click="handleHazardImportClick"
              >
                {{ hazardImportMessage || 'Import JSON' }}
              </button>
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :disabled="hazardStats.custom === 0"
                @click="handleHazardExport"
              >
                Export Custom
              </button>
            </div>

            <button
              v-if="hazardStats.custom > 0"
              type="button"
              class="btn-danger text-sm w-full"
              @click="handleClearCustomHazards"
            >
              Clear Custom Hazards
            </button>
          </div>
        </div>

        <!-- Party Data Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Party Data</h3>

          <div class="p-3 bg-elevated space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-text">Saved Parties</span>
                <p class="text-xs text-dim mt-0.5">
                  {{ partyCount }} {{ partyCount === 1 ? 'party' : 'parties' }} saved
                </p>
              </div>
            </div>

            <p class="text-xs text-dim">
              Export and import party configurations with player data.
            </p>

            <div class="flex gap-2">
              <input
                ref="partyFileInput"
                type="file"
                accept=".json"
                class="hidden"
                @change="handlePartyFileSelect"
              />
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :class="{
                  'btn-success': partyImportStatus === 'success',
                  'btn-danger': partyImportStatus === 'error',
                }"
                @click="handlePartyImportClick"
              >
                {{ partyImportMessage || 'Import JSON' }}
              </button>
              <button
                type="button"
                class="btn-secondary text-sm flex-1"
                :disabled="partyCount === 0"
                @click="handlePartyExport"
              >
                Export Parties
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-border">
        <p class="text-xs text-muted text-center">Settings are saved automatically</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
