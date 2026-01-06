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
      const progress = (Date.now() - effect.startTime) / effect.duration
      if (progress >= 0 && progress <= 1) {
        return { effect, progress }
      }
    }
  }
  return null
})

const effectClass = computed(() => {
  if (!overlayEffect.value) return ''
  return `effect-${overlayEffect.value.effect.type}`
})

const effectText = computed(() => {
  if (!overlayEffect.value) return ''
  switch (overlayEffect.value.effect.type) {
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
</script>

<template>
  <Teleport to="body">
    <Transition name="effect-fade">
      <div
        v-if="overlayEffect"
        class="effect-overlay"
        :class="effectClass"
      >
        <!-- Alarm / Countermeasure: Red vignette + scanlines -->
        <template v-if="overlayEffect.effect.type === 'alarm' || overlayEffect.effect.type === 'countermeasure'">
          <div class="alarm-vignette"></div>
          <div class="alarm-scanlines"></div>
          <div class="alarm-text">{{ effectText }}</div>
        </template>

        <!-- Lockout: Static + denied text -->
        <template v-else-if="overlayEffect.effect.type === 'lockout'">
          <div class="lockout-static"></div>
          <div class="lockout-text">{{ effectText }}</div>
        </template>

        <!-- Success: Green celebration -->
        <template v-else-if="overlayEffect.effect.type === 'success'">
          <div class="success-glow"></div>
          <div class="success-text">{{ effectText }}</div>
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
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Alarm effect */
.alarm-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 150px 50px var(--color-danger-glow, rgba(225, 52, 30, 0.5));
  animation: alarmPulse 0.3s ease-in-out infinite;
}

@keyframes alarmPulse {
  0%, 100% { box-shadow: inset 0 0 100px 30px var(--color-danger-glow, rgba(225, 52, 30, 0.4)); }
  50% { box-shadow: inset 0 0 200px 80px var(--color-danger-glow, rgba(225, 52, 30, 0.6)); }
}

.alarm-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.2) 2px,
    rgba(0, 0, 0, 0.2) 4px
  );
  animation: scanlineScroll 0.1s linear infinite;
}

@keyframes scanlineScroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
}

.alarm-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-danger, #ff5c47);
  text-shadow:
    0 0 20px var(--color-danger-glow, rgba(225, 52, 30, 0.8)),
    0 0 40px var(--color-danger-glow, rgba(225, 52, 30, 0.6)),
    0 0 60px var(--color-danger-glow, rgba(225, 52, 30, 0.4));
  animation: glitchText 0.1s linear infinite;
  text-align: center;
  letter-spacing: 0.1em;
}

@keyframes glitchText {
  0%, 90%, 100% { transform: translateX(0); opacity: 1; }
  92% { transform: translateX(-5px); opacity: 0.8; }
  94% { transform: translateX(5px); opacity: 0.9; }
  96% { transform: translateX(-3px); opacity: 0.7; }
  98% { transform: translateX(3px); opacity: 1; }
}

/* Lockout effect */
.lockout-static {
  position: absolute;
  inset: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23111" width="100" height="100"/><circle fill="%23222" cx="50" cy="50" r="1"/></svg>');
  background-size: 4px 4px;
  opacity: 0.8;
  animation: staticNoise 0.05s steps(10) infinite;
}

@keyframes staticNoise {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-1%, -1%); }
  20% { transform: translate(1%, 1%); }
  30% { transform: translate(-1%, 1%); }
  40% { transform: translate(1%, -1%); }
  50% { transform: translate(-0.5%, 0.5%); }
  60% { transform: translate(0.5%, -0.5%); }
  70% { transform: translate(-0.5%, -0.5%); }
  80% { transform: translate(0.5%, 0.5%); }
  90% { transform: translate(0, 0); }
}

.lockout-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 4rem;
  font-weight: 700;
  color: var(--color-danger, #ff3333);
  text-shadow:
    0 0 30px var(--color-danger, rgba(255, 51, 51, 1)),
    0 0 60px var(--color-danger-glow, rgba(255, 51, 51, 0.8));
  animation: lockoutPulse 0.5s ease-in-out infinite;
  text-align: center;
  letter-spacing: 0.2em;
}

@keyframes lockoutPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
}

/* Success effect */
.success-glow {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 200px 50px var(--color-success-glow, rgba(106, 225, 30, 0.3));
  animation: successPulse 0.5s ease-out;
}

@keyframes successPulse {
  0% { box-shadow: inset 0 0 0 0 rgba(106, 225, 30, 0); }
  50% { box-shadow: inset 0 0 300px 100px var(--color-success-glow, rgba(106, 225, 30, 0.5)); }
  100% { box-shadow: inset 0 0 200px 50px var(--color-success-glow, rgba(106, 225, 30, 0.3)); }
}

.success-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 4rem;
  font-weight: 700;
  color: var(--color-success, #8fff5c);
  text-shadow:
    0 0 30px var(--color-success, rgba(106, 225, 30, 1)),
    0 0 60px var(--color-success-glow, rgba(106, 225, 30, 0.8)),
    0 0 100px var(--color-success-glow, rgba(106, 225, 30, 0.5));
  animation: successText 0.5s ease-out;
  text-align: center;
  letter-spacing: 0.15em;
}

@keyframes successText {
  0% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
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
