<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import type { HackingEffectType } from '../../types/hacking'

const store = useHackingStore()

interface EffectButton {
  type: HackingEffectType
  label: string
  hotkey: string
  variant: 'success' | 'danger' | 'secondary' | 'primary'
}

// Organized by category
const successEffects: EffectButton[] = [
  { type: 'breach', label: 'Breach', hotkey: 'B', variant: 'success' },
  { type: 'vulnerability', label: 'Vuln', hotkey: 'V', variant: 'success' },
  { type: 'data-extract', label: 'Extract', hotkey: 'D', variant: 'success' },
]

const dangerEffects: EffectButton[] = [
  { type: 'alarm', label: 'Alarm', hotkey: 'A', variant: 'danger' },
  { type: 'countermeasure', label: 'ICE', hotkey: 'C', variant: 'danger' },
  { type: 'trace', label: 'Trace', hotkey: 'T', variant: 'danger' },
  { type: 'lockout', label: 'Lockout', hotkey: 'L', variant: 'danger' },
]

const utilityEffects: EffectButton[] = [
  { type: 'scan', label: 'Scan', hotkey: 'N', variant: 'primary' },
  { type: 'pulse', label: 'Pulse', hotkey: 'P', variant: 'secondary' },
]

const allEffects = [...successEffects, ...dangerEffects, ...utilityEffects]

function trigger(type: HackingEffectType) {
  store.triggerEffect(type)
}

function handleKeyDown(e: KeyboardEvent) {
  // Ignore if typing in input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const key = e.key.toLowerCase()

  // Find matching effect
  for (const btn of allEffects) {
    if (btn.hotkey.toLowerCase() === key) {
      e.preventDefault()
      trigger(btn.type)
      return
    }
  }

  // Full Breach shortcut
  if (key === 's') {
    e.preventDefault()
    trigger('success')
    return
  }

  // Special keys
  if (key === 'escape') {
    store.clearEffects()
    store.setFocus(null)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="control-panel panel p-4">
    <h3 class="text-lg font-semibold mb-3 text-accent">Quick Effects</h3>

    <!-- Success Effects (green) -->
    <div class="effect-category">
      <span class="category-label success">Success</span>
      <div class="effect-row">
        <button
          v-for="btn in successEffects"
          :key="btn.type"
          class="effect-btn btn btn-success"
          @click="trigger(btn.type)"
          :title="`${btn.label} (${btn.hotkey})`"
        >
          <span class="hotkey">{{ btn.hotkey }}</span>
          <span class="label">{{ btn.label }}</span>
        </button>
      </div>
    </div>

    <!-- Danger Effects (red) -->
    <div class="effect-category">
      <span class="category-label danger">Danger</span>
      <div class="effect-row">
        <button
          v-for="btn in dangerEffects"
          :key="btn.type"
          class="effect-btn btn btn-danger"
          @click="trigger(btn.type)"
          :title="`${btn.label} (${btn.hotkey})`"
        >
          <span class="hotkey">{{ btn.hotkey }}</span>
          <span class="label">{{ btn.label }}</span>
        </button>
      </div>
    </div>

    <!-- Utility Effects (cyan/purple) -->
    <div class="effect-category">
      <span class="category-label utility">Utility</span>
      <div class="effect-row">
        <button
          v-for="btn in utilityEffects"
          :key="btn.type"
          class="effect-btn btn"
          :class="`btn-${btn.variant}`"
          @click="trigger(btn.type)"
          :title="`${btn.label} (${btn.hotkey})`"
        >
          <span class="hotkey">{{ btn.hotkey }}</span>
          <span class="label">{{ btn.label }}</span>
        </button>
      </div>
    </div>

    <hr class="my-3 border-[var(--color-border)]" />

    <!-- Full Breach - Special Big Button -->
    <button
      class="btn btn-success w-full full-breach-btn"
      @click="trigger('success')"
    >
      <span class="hotkey">S</span>
      FULL BREACH!
    </button>

    <hr class="my-3 border-[var(--color-border)]" />

    <div class="intensity-control">
      <label class="text-xs text-dim mb-1 block">Intensity</label>
      <input
        type="range"
        :value="store.state.ambientIntensity * 100"
        min="0"
        max="100"
        @input="store.setAmbientIntensity(Number(($event.target as HTMLInputElement).value) / 100)"
        class="intensity-slider"
      />
    </div>

    <button
      class="btn btn-secondary w-full btn-sm mt-3"
      @click="store.clearEffects()"
    >
      <span class="hotkey">Esc</span>
      Clear
    </button>
  </div>
</template>

<style scoped>
.control-panel {
  width: 240px;
}

.effect-category {
  margin-bottom: 0.5rem;
}

.category-label {
  display: block;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
  padding-left: 0.25rem;
}

.category-label.success {
  color: var(--color-success);
}

.category-label.danger {
  color: var(--color-danger);
}

.category-label.utility {
  color: var(--color-accent);
}

.effect-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.effect-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  font-size: 11px;
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.effect-btn .hotkey {
  flex-shrink: 0;
  font-weight: 700;
  opacity: 0.7;
  font-size: 10px;
}

.effect-btn .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.full-breach-btn {
  font-weight: 700;
  padding: 0.75rem;
  font-size: var(--text-sm);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px var(--color-success-glow, rgba(106, 225, 30, 0.3)); }
  50% { box-shadow: 0 0 15px var(--color-success-glow, rgba(106, 225, 30, 0.6)); }
}

.intensity-slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: var(--color-bg-elevated);
  border-radius: 3px;
  outline: none;
}

.intensity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
}

.intensity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 8px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
}

.w-full {
  width: 100%;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 11px;
}

.mt-3 {
  margin-top: 0.75rem;
}
</style>
