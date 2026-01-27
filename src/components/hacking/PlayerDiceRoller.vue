<script setup lang="ts">
import { ref, computed } from 'vue'
import { rollD20, type RollResult } from '../../utils/dice'

// State
const modifier = ref(0)
const lastRoll = ref<RollResult | null>(null)
const isRolling = ref(false)
const showResult = ref(false)

// Computed
const modifierDisplay = computed(() => {
  if (modifier.value === 0) return ''
  return modifier.value > 0 ? `+${modifier.value}` : `${modifier.value}`
})

const resultClass = computed(() => {
  if (!lastRoll.value) return ''
  if (lastRoll.value.isNat20) return 'nat20'
  if (lastRoll.value.isNat1) return 'nat1'
  return ''
})

// Methods
function adjustModifier(delta: number) {
  modifier.value = Math.max(-20, Math.min(50, modifier.value + delta))
}

function roll() {
  isRolling.value = true
  showResult.value = false

  // Brief delay for animation feel
  setTimeout(() => {
    const result = rollD20(modifier.value, 'Skill Check', 'Player')
    lastRoll.value = result
    isRolling.value = false
    showResult.value = true

    // Auto-hide result after delay
    setTimeout(() => {
      showResult.value = false
    }, 4000)
  }, 150)
}
</script>

<template>
  <div class="dice-roller-wrapper">
    <!-- Compact Roll Button with Modifier -->
    <div class="roll-controls">
      <button class="mod-btn" @click="adjustModifier(-1)" aria-label="Decrease modifier">−</button>
      <button
        class="roll-button"
        :class="{ rolling: isRolling }"
        @click="roll"
        :disabled="isRolling"
      >
        <span class="roll-label">D20</span>
        <span class="roll-mod">{{ modifierDisplay || '±0' }}</span>
      </button>
      <button class="mod-btn" @click="adjustModifier(1)" aria-label="Increase modifier">+</button>
    </div>

    <!-- Fullscreen Result Toast Overlay -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="showResult && lastRoll" class="result-toast" :class="resultClass">
          <div class="toast-number">{{ lastRoll.total }}</div>
          <div class="toast-breakdown">{{ lastRoll.breakdown }}</div>
          <div v-if="lastRoll.isNat20" class="toast-crit nat20">NATURAL 20</div>
          <div v-if="lastRoll.isNat1" class="toast-crit nat1">NATURAL 1</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dice-roller-wrapper {
  display: contents;
}

/* Roll Controls - compact inline */
.roll-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.mod-btn {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: 1rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mod-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow, rgba(30, 203, 225, 0.3));
}

.mod-btn:active {
  transform: scale(0.95);
}

/* Roll Button */
.roll-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0.375rem 0.75rem;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  box-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
  transition: all 0.2s ease;
}

.roll-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-shadow: 0 0 8px var(--color-accent);
}

.roll-mod {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  line-height: 1;
}

.roll-button:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-bg);
  box-shadow: 0 0 20px var(--color-accent-glow, rgba(30, 203, 225, 0.4));
}

.roll-button:hover:not(:disabled) .roll-label {
  text-shadow: none;
}

.roll-button:hover:not(:disabled) .roll-mod {
  color: var(--color-bg);
}

.roll-button:active:not(:disabled) {
  transform: scale(0.95);
}

.roll-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.roll-button.rolling {
  animation: pulse-glow 0.2s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  from { box-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.2)); }
  to { box-shadow: 0 0 25px var(--color-accent-glow, rgba(30, 203, 225, 0.5)); }
}

/* ========================================
   RESULT TOAST - Fullscreen overlay
   ======================================== */
.result-toast {
  position: fixed;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-number {
  font-size: 6rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--color-tertiary);
  text-shadow:
    0 0 20px var(--color-tertiary),
    0 0 40px var(--color-tertiary),
    0 0 80px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
  line-height: 1;
}

.result-toast.nat20 .toast-number {
  color: var(--color-warning);
  text-shadow:
    0 0 20px var(--color-warning),
    0 0 40px var(--color-warning),
    0 0 80px var(--color-warning),
    0 0 120px var(--color-warning);
  animation: crit-glow 0.5s ease-out;
}

.result-toast.nat1 .toast-number {
  color: var(--color-danger);
  text-shadow:
    0 0 20px var(--color-danger),
    0 0 40px var(--color-danger),
    0 0 80px var(--color-danger);
}

.toast-breakdown {
  font-size: 1rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-muted);
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.05em;
}

.toast-crit {
  margin-top: 0.5rem;
  font-size: 1.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.toast-crit.nat20 {
  color: var(--color-warning);
  text-shadow:
    0 0 10px var(--color-warning),
    0 0 30px var(--color-warning);
  animation: crit-text-pulse 0.3s ease-in-out 3;
}

.toast-crit.nat1 {
  color: var(--color-danger);
  text-shadow:
    0 0 10px var(--color-danger),
    0 0 30px var(--color-danger);
}

@keyframes crit-glow {
  0% { transform: scale(1.3); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes crit-text-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Toast Transitions */
.toast-enter-active {
  animation: toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(30px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .mod-btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.25rem;
  }

  .roll-button {
    padding: 0.5rem 1rem;
  }

  .roll-label {
    font-size: 0.875rem;
  }

  .roll-mod {
    font-size: 0.75rem;
  }

  .toast-number {
    font-size: 5rem;
  }

  .toast-breakdown {
    font-size: 0.875rem;
  }

  .toast-crit {
    font-size: 1rem;
  }
}
</style>
