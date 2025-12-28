<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore, themes, type ThemeId } from '../stores/settingsStore'
import { useEncounterStore } from '../stores/encounterStore'

const { settings, toggleSetting, setTheme, setSetting, testDiscordWebhook } = useSettingsStore()
const encounterStore = useEncounterStore()

defineEmits<{
  (e: 'close'): void
}>()

const themeList = Object.entries(themes) as [ThemeId, typeof themes[ThemeId]][]

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

// Creature import state
const creatureCount = computed(() => encounterStore.getCreatureCount())
const showCreatureImport = ref(false)
const creatureImportText = ref('')
const creatureImportStatus = ref<'idle' | 'success' | 'error'>('idle')
const creatureImportMessage = ref('')

function handleCreatureImport() {
  try {
    const result = encounterStore.importCreatures(creatureImportText.value)
    creatureImportStatus.value = 'success'
    creatureImportMessage.value = `Added ${result.added} creatures${result.duplicates > 0 ? `, ${result.duplicates} duplicates skipped` : ''}`
    creatureImportText.value = ''
    setTimeout(() => {
      creatureImportStatus.value = 'idle'
      showCreatureImport.value = false
    }, 2000)
  } catch (e) {
    creatureImportStatus.value = 'error'
    creatureImportMessage.value = 'Invalid JSON data'
  }
}

function handleCreatureExport() {
  const json = encounterStore.exportCreatures()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sf2e-creatures.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleClearCreatures() {
  if (confirm('Delete all creatures? This cannot be undone.')) {
    encounterStore.clearAllCreatures()
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content w-full max-w-md">
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

        <!-- Data Section -->
        <div>
          <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Creature Data</h3>

          <div class="p-3 bg-elevated">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-text">Creatures Loaded</span>
              <span class="text-accent font-bold">{{ creatureCount }}</span>
            </div>
            <p class="text-xs text-dim mb-3">Import creature JSON to use in encounters</p>

            <div class="flex gap-2">
              <button
                class="btn-secondary text-sm flex-1"
                @click="showCreatureImport = !showCreatureImport"
              >
                Import
              </button>
              <button
                class="btn-secondary text-sm flex-1"
                :disabled="creatureCount === 0"
                @click="handleCreatureExport"
              >
                Export
              </button>
              <button
                class="btn-secondary text-sm px-3 text-danger"
                :disabled="creatureCount === 0"
                @click="handleClearCreatures"
                title="Clear all creatures"
              >
                Clear
              </button>
            </div>

            <!-- Import textarea -->
            <div v-if="showCreatureImport" class="mt-3">
              <textarea
                v-model="creatureImportText"
                class="input w-full font-mono text-xs p-2 resize-y"
                rows="6"
                placeholder='[{"id": "...", "name": "...", "level": 1, ...}]'
              ></textarea>
              <div class="flex items-center justify-between mt-2">
                <span
                  v-if="creatureImportStatus !== 'idle'"
                  class="text-xs"
                  :class="{ 'text-success': creatureImportStatus === 'success', 'text-danger': creatureImportStatus === 'error' }"
                >
                  {{ creatureImportMessage }}
                </span>
                <span v-else></span>
                <button
                  class="btn-primary text-sm"
                  :disabled="!creatureImportText"
                  @click="handleCreatureImport"
                >
                  Import Creatures
                </button>
              </div>
            </div>
          </div>
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
</style>
