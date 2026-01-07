<script setup lang="ts">
import { computed } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import type { HackingEffectType } from '../../types/hacking'

const store = useHackingStore()

// Get the most dramatic active effect for overlay
const overlayEffect = computed(() => {
  const dramaticTypes: HackingEffectType[] = ['alarm', 'lockout', 'success', 'countermeasure']

  for (const effect of store.state.activeEffects) {
    if (dramaticTypes.includes(effect.type)) {
      return effect
    }
  }
  return null
})

const effectClass = computed(() => {
  if (!overlayEffect.value) return ''
  return `effect-${overlayEffect.value.type}`
})

const effectText = computed(() => {
  if (!overlayEffect.value) return ''
  switch (overlayEffect.value.type) {
    case 'alarm':
      return '! COUNTERMEASURE TRIGGERED !'
    case 'lockout':
      return 'ACCESS DENIED'
    case 'success':
      return 'SYSTEM BREACHED'
    case 'countermeasure':
      return '! ICE ACTIVATED !'
    default:
      return ''
  }
})

// Click to dismiss
function dismissEffect() {
  if (overlayEffect.value) {
    const index = store.state.activeEffects.findIndex(e => e.id === overlayEffect.value!.id)
    if (index !== -1) {
      store.state.activeEffects.splice(index, 1)
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="effect-fade">
      <div
        v-if="overlayEffect"
        class="effect-overlay"
        :class="effectClass"
        @click="dismissEffect"
      >
        <!-- Alarm / Countermeasure: Red vignette -->
        <template v-if="overlayEffect.type === 'alarm' || overlayEffect.type === 'countermeasure'">
          <div class="alarm-vignette"></div>
          <div class="effect-text alarm-text">{{ effectText }}</div>
          <div class="dismiss-hint">click to dismiss</div>
        </template>

        <!-- Lockout: denied text -->
        <template v-else-if="overlayEffect.type === 'lockout'">
          <div class="lockout-vignette"></div>
          <div class="effect-text lockout-text">{{ effectText }}</div>
          <div class="dismiss-hint">click to dismiss</div>
        </template>

        <!-- Success: Green glow -->
        <template v-else-if="overlayEffect.type === 'success'">
          <div class="success-glow"></div>
          <div class="effect-text success-text">{{ effectText }}</div>
          <div class="dismiss-hint">click to dismiss</div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.effect-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

/* Shared text styles */
.effect-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.1em;
  z-index: 1;
}

.dismiss-hint {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  z-index: 1;
}

/* Alarm / Countermeasure effect - red */
.alarm-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 150px 50px var(--color-danger-glow, rgba(225, 52, 30, 0.5));
  background: rgba(225, 52, 30, 0.15);
}

.alarm-text {
  color: var(--color-danger, #ff5c47);
  text-shadow:
    0 0 20px var(--color-danger-glow, rgba(225, 52, 30, 0.8)),
    0 0 40px var(--color-danger-glow, rgba(225, 52, 30, 0.6));
}

/* Lockout effect - darker red */
.lockout-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 150px 50px rgba(180, 30, 30, 0.6);
  background: rgba(100, 20, 20, 0.4);
}

.lockout-text {
  color: var(--color-danger, #ff3333);
  text-shadow:
    0 0 30px var(--color-danger, rgba(255, 51, 51, 1)),
    0 0 60px var(--color-danger-glow, rgba(255, 51, 51, 0.8));
  letter-spacing: 0.2em;
}

/* Success effect - green */
.success-glow {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 200px 50px var(--color-success-glow, rgba(106, 225, 30, 0.3));
  background: rgba(106, 225, 30, 0.1);
}

.success-text {
  color: var(--color-success, #8fff5c);
  text-shadow:
    0 0 30px var(--color-success, rgba(106, 225, 30, 1)),
    0 0 60px var(--color-success-glow, rgba(106, 225, 30, 0.8));
  letter-spacing: 0.15em;
}

/* Fade transition */
.effect-fade-enter-active,
.effect-fade-leave-active {
  transition: opacity 0.3s ease;
}

.effect-fade-enter-from,
.effect-fade-leave-to {
  opacity: 0;
}
</style>
