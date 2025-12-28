<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore, themes, type ThemeId } from '../stores/settingsStore'

const { settings, toggleSetting, setTheme, setSetting, testDiscordWebhook } = useSettingsStore()

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
