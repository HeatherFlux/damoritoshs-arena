<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onRoll } from '../utils/dice'
import AsciiPlayer from './AsciiPlayer.vue'

const isActive = ref(false)
const glitchType = ref<'nat20' | 'nat1' | null>(null)
const glitchText = ref('')
const currentAscii = ref('')
const asciiPlayerRef = ref<InstanceType<typeof AsciiPlayer> | null>(null)
let unsubscribe: (() => void) | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null

const nat20Asciis = [
  '/ascii-simpsons.json',
  '/ascii-stormtroopers.json',
  '/ascii-gatsby.json',
]

const nat20Messages = [
  'MAXIMUM OUTPUT',
  "IT'S OVER 9000",
  'FLAWLESS VICTORY',
  'FINISH THEM',
  'UNSTOPPABLE',
  'ALL SYSTEMS GO',
  'NEW HiGH SCORE',
]

const nat1Messages = [
  'SYSTEM FAILURE',
  'CRITICAL ERROR',
  'MALFUNCTION',
  'CORE BREACH',
  'FAILURE IMMINENT',
  'SYSTEM SHUTDOWN',
  "YOU'VE BEEN PWNED!", 
]

function triggerGlitch(type: 'nat20' | 'nat1') {
  if (timeoutId) clearTimeout(timeoutId)

  glitchType.value = type
  const messages = type === 'nat20' ? nat20Messages : nat1Messages
  glitchText.value = messages[Math.floor(Math.random() * messages.length)]
  isActive.value = true

  if (type === 'nat20') {
    // Pick random ASCII animation - component auto-plays on mount
    currentAscii.value = nat20Asciis[Math.floor(Math.random() * nat20Asciis.length)]
  }

  // Auto-dismiss
  const duration = type === 'nat20' ? 15000 : 2000
  timeoutId = setTimeout(() => {
    dismiss()
  }, duration)
}

function dismiss() {
  if (timeoutId) clearTimeout(timeoutId)
  if (asciiPlayerRef.value) {
    asciiPlayerRef.value.stop()
  }
  isActive.value = false
  glitchType.value = null
}

function onAsciiEnded() {
  setTimeout(dismiss, 300)
}

onMounted(() => {
  unsubscribe = onRoll((roll) => {
    if (roll.isNat20) {
      triggerGlitch('nat20')
    } else if (roll.isNat1) {
      triggerGlitch('nat1')
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<template>
  <Teleport to="body">
    <!-- NAT 20 - ASCII art celebration -->
    <Transition name="crit-overlay">
      <div
        v-if="isActive && glitchType === 'nat20'"
        class="overlay-container crit-container"
        @click="dismiss"
      >
        <div class="ascii-wrapper">
          <AsciiPlayer
            ref="asciiPlayerRef"
            :src="currentAscii"
            @ended="onAsciiEnded"
          />
        </div>
        <div class="crit-text-overlay">
          <span class="crit-label">{{ glitchText }}</span>
        </div>
        <div class="click-hint">click to dismiss</div>
      </div>
    </Transition>

    <!-- NAT 1 - Heavy glitch effect -->
    <Transition name="glitch-overlay">
      <div
        v-if="isActive && glitchType === 'nat1'"
        class="overlay-container glitch-container"
        @click="dismiss"
      >
        <div class="scanlines"></div>
        <div class="screen-tear tear-1"></div>
        <div class="screen-tear tear-2"></div>
        <div class="screen-tear tear-3"></div>

        <div class="glitch-text-wrapper">
          <span class="glitch-text glitch-r">{{ glitchText }}</span>
          <span class="glitch-text glitch-g">{{ glitchText }}</span>
          <span class="glitch-text glitch-b">{{ glitchText }}</span>
          <span class="glitch-text glitch-main">{{ glitchText }}</span>
        </div>

        <div class="noise"></div>
        <div class="glitch-bars">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>

        <div class="click-hint">click to dismiss</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay-container {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.click-hint {
  position: absolute;
  bottom: 2rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  z-index: 10;
}

/* ============================================
   NAT 20 - ASCII Art Animation
   ============================================ */
.crit-container {
  background: #000;
}

.ascii-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1rem;
}

.ascii-wrapper :deep(.ascii-player) {
  /* Scale to fill viewport - 160 cols at ~0.6vw = ~96% viewport width */
  font-size: clamp(6px, 0.58vw, 12px);
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: #00ff88;
  text-shadow:
    0 0 2px #00ff88,
    0 0 8px #00ff88,
    0 0 15px rgba(0, 255, 136, 0.6);
  filter: contrast(1.2) brightness(1.05);
}

.crit-text-overlay {
  position: absolute;
  bottom: 15%;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 5;
}

.crit-label {
  font-family: var(--font-mono, monospace);
  font-size: clamp(2rem, 8vw, 5rem);
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    0 0 10px #00ff88,
    0 0 20px #00ff88,
    0 0 40px #00ff88,
    0 0 80px #00ff88,
    2px 2px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000;
  animation: textPulse 0.3s ease-in-out infinite alternate;
}

@keyframes textPulse {
  from {
    transform: scale(1);
    text-shadow:
      0 0 10px #00ff88,
      0 0 20px #00ff88,
      0 0 40px #00ff88,
      2px 2px 0 #000,
      -2px -2px 0 #000;
  }
  to {
    transform: scale(1.02);
    text-shadow:
      0 0 20px #00ff88,
      0 0 40px #00ff88,
      0 0 80px #00ff88,
      0 0 120px #00ff88,
      2px 2px 0 #000,
      -2px -2px 0 #000;
  }
}

.crit-overlay-enter-active { animation: critIn 0.15s ease-out; }
.crit-overlay-leave-active { animation: critOut 0.3s ease-in; }

@keyframes critIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes critOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ============================================
   NAT 1 - Heavy Glitch Effect
   ============================================ */
.glitch-container {
  background: rgba(0, 0, 0, 0.9);
  animation: screenShake 0.08s ease-in-out infinite;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.3) 2px,
    rgba(0, 0, 0, 0.3) 4px
  );
  pointer-events: none;
  animation: scanlineScroll 0.1s linear infinite;
}

@keyframes scanlineScroll {
  from { transform: translateY(0); }
  to { transform: translateY(4px); }
}

.screen-tear {
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 0, 68, 0.15) 20%,
    rgba(0, 255, 255, 0.1) 40%,
    rgba(255, 0, 68, 0.2) 60%,
    transparent 100%
  );
  animation: tearMove 0.15s ease-in-out infinite alternate;
}

.tear-1 { top: 20%; animation-delay: 0s; }
.tear-2 { top: 50%; animation-delay: 0.05s; }
.tear-3 { top: 75%; animation-delay: 0.1s; }

@keyframes tearMove {
  from { transform: translateX(-10px) skewX(-3deg); }
  to { transform: translateX(10px) skewX(3deg); }
}

.glitch-text-wrapper {
  position: relative;
  font-family: var(--font-mono, monospace);
  font-size: clamp(2rem, 8vw, 5rem);
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.glitch-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  text-align: center;
}

.glitch-main {
  position: relative;
  color: #ff0044;
  text-shadow: 0 0 30px #ff0044;
  animation: glitchMain 0.1s ease-in-out infinite;
}

.glitch-r {
  color: #ff0000;
  opacity: 0.8;
  animation: glitchR 0.08s ease-in-out infinite;
}

.glitch-g {
  color: #00ff00;
  opacity: 0.8;
  animation: glitchG 0.08s ease-in-out infinite;
}

.glitch-b {
  color: #0000ff;
  opacity: 0.8;
  animation: glitchB 0.08s ease-in-out infinite;
}

@keyframes glitchMain {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-3px, 2px); }
  40% { transform: translate(3px, -2px); }
  60% { transform: translate(-2px, -2px); }
  80% { transform: translate(2px, 2px); }
}

@keyframes glitchR {
  0%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
  25% { transform: translate(-5px, 3px); clip-path: inset(10% 0 80% 0); }
  50% { transform: translate(4px, -2px); clip-path: inset(40% 0 40% 0); }
  75% { transform: translate(-3px, 2px); clip-path: inset(70% 0 10% 0); }
}

@keyframes glitchG {
  0%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
  25% { transform: translate(4px, -3px); clip-path: inset(20% 0 60% 0); }
  50% { transform: translate(-5px, 2px); clip-path: inset(50% 0 30% 0); }
  75% { transform: translate(3px, -2px); clip-path: inset(80% 0 5% 0); }
}

@keyframes glitchB {
  0%, 100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
  25% { transform: translate(-4px, -2px); clip-path: inset(5% 0 85% 0); }
  50% { transform: translate(3px, 3px); clip-path: inset(35% 0 55% 0); }
  75% { transform: translate(-2px, -3px); clip-path: inset(65% 0 25% 0); }
}

.noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.1;
  pointer-events: none;
  animation: noiseShift 0.05s steps(3) infinite;
}

@keyframes noiseShift {
  0% { transform: translate(0, 0); }
  33% { transform: translate(-2px, 2px); }
  66% { transform: translate(2px, -2px); }
}

.glitch-bars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, #ff0044, #00ffff, #ff0044, transparent);
  animation: barSweep 0.2s ease-out infinite;
}

.bar:nth-child(1) { top: 15%; animation-delay: 0s; }
.bar:nth-child(2) { top: 35%; animation-delay: 0.04s; }
.bar:nth-child(3) { top: 55%; animation-delay: 0.08s; }
.bar:nth-child(4) { top: 70%; animation-delay: 0.12s; }
.bar:nth-child(5) { top: 85%; animation-delay: 0.16s; }

@keyframes barSweep {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

@keyframes screenShake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  10% { transform: translate(-4px, 3px) rotate(-0.5deg); }
  30% { transform: translate(4px, -3px) rotate(0.5deg); }
  50% { transform: translate(-3px, -3px) rotate(-0.3deg); }
  70% { transform: translate(3px, 2px) rotate(0.3deg); }
  90% { transform: translate(-2px, 3px) rotate(-0.2deg); }
}

.glitch-overlay-enter-active { animation: glitchIn 0.1s ease-out; }
.glitch-overlay-leave-active { animation: glitchOut 0.15s ease-in; }

@keyframes glitchIn {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes glitchOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
