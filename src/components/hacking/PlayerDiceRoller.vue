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
  <div class="dice-roller">
    <!-- Modifier Controls -->
    <div class="modifier-row">
      <button class="mod-btn" @click="adjustModifier(-1)" aria-label="Decrease modifier">−</button>
      <div class="modifier-display">
        <span class="mod-label">MOD</span>
        <span class="mod-value">{{ modifierDisplay || '±0' }}</span>
      </div>
      <button class="mod-btn" @click="adjustModifier(1)" aria-label="Increase modifier">+</button>
    </div>

    <!-- Roll Button -->
    <button
      class="roll-button"
      :class="{ rolling: isRolling }"
      @click="roll"
      :disabled="isRolling"
    >
      <span class="roll-text">{{ isRolling ? 'ROLLING...' : 'ROLL D20' }}</span>
    </button>

    <!-- Result Display -->
    <Transition name="result-fade">
      <div v-if="showResult && lastRoll" class="result-container">
        <div class="result-number" :class="resultClass">
          {{ lastRoll.total }}
        </div>
        <div class="result-breakdown">
          {{ lastRoll.breakdown }}
        </div>
        <div v-if="lastRoll.isNat20" class="result-crit nat20">NATURAL 20!</div>
        <div v-if="lastRoll.isNat1" class="result-crit nat1">NATURAL 1!</div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dice-roller {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(5, 6, 8, 0.95);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow:
    0 0 20px var(--color-accent-glow, rgba(30, 203, 225, 0.3)),
    inset 0 0 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
}

/* Modifier Row */
.modifier-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mod-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 1.25rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mod-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.3));
}

.mod-btn:active {
  transform: scale(0.95);
}

.modifier-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 4rem;
}

.mod-label {
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.mod-value {
  font-size: 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow: 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.3));
}

/* Roll Button */
.roll-button {
  width: 100%;
  padding: 1rem 2rem;
  background: transparent;
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  box-shadow:
    0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.3)),
    inset 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
  text-shadow: 0 0 10px var(--color-accent);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.roll-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-accent-glow, rgba(30, 203, 225, 0.2)),
    transparent
  );
  transition: left 0.5s ease;
}

.roll-button:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-bg);
  box-shadow: 0 0 30px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
  text-shadow: none;
}

.roll-button:hover:not(:disabled)::before {
  left: 100%;
}

.roll-button:active:not(:disabled) {
  transform: scale(0.98);
}

.roll-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.roll-button.rolling {
  animation: pulse-glow 0.3s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  from {
    box-shadow:
      0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.3)),
      inset 0 0 10px var(--color-accent-glow, rgba(30, 203, 225, 0.2));
  }
  to {
    box-shadow:
      0 0 25px var(--color-accent-glow, rgba(30, 203, 225, 0.5)),
      inset 0 0 20px var(--color-accent-glow, rgba(30, 203, 225, 0.3));
  }
}

/* Result Display */
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding-top: 0.5rem;
}

.result-number {
  font-size: 4rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow:
    0 0 10px var(--color-accent),
    0 0 30px var(--color-accent-glow, rgba(30, 203, 225, 0.5));
  line-height: 1;
}

.result-number.nat20 {
  color: var(--color-warning);
  text-shadow:
    0 0 10px var(--color-warning),
    0 0 30px var(--color-warning),
    0 0 50px var(--color-warning);
  animation: crit-pulse 0.5s ease-out;
}

.result-number.nat1 {
  color: var(--color-danger);
  text-shadow:
    0 0 10px var(--color-danger),
    0 0 30px var(--color-danger);
  animation: crit-pulse 0.5s ease-out;
}

@keyframes crit-pulse {
  0% {
    transform: scale(1.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.result-breakdown {
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-dim);
  letter-spacing: 0.05em;
}

.result-crit {
  margin-top: 0.25rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: var(--radius-sm);
}

.result-crit.nat20 {
  background: var(--color-warning);
  color: var(--color-bg);
}

.result-crit.nat1 {
  background: var(--color-danger);
  color: white;
}

/* Transitions */
.result-fade-enter-active {
  animation: result-appear 0.3s ease-out;
}

.result-fade-leave-active {
  animation: result-appear 0.2s ease-in reverse;
}

@keyframes result-appear {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
