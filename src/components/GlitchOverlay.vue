<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onRoll } from '../utils/dice'
import AsciiPlayer from './AsciiPlayer.vue'

const isActive = ref(false)
const glitchType = ref<'nat20' | 'nat1' | null>(null)
const glitchText = ref('')
const currentAscii = ref('')
const asciiPlayerRef = ref<InstanceType<typeof AsciiPlayer> | null>(null)
const glitchPhase = ref<'scramble' | 'message' | null>(null)
const retroModeManual = ref(false)  // Toggled by secret shortcut
const retroModeTheme = ref(false)   // Set by CRT theme

// Show CRT effects if either manual toggle or theme is active
const showRetroOverlay = computed(() => retroModeManual.value || retroModeTheme.value)
let unsubscribe: (() => void) | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null
let phaseTimeouts: ReturnType<typeof setTimeout>[] = []

const nat20Asciis = [
  '/ascii-gundam.json',
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
  'FATAL EXCEPTION',
  'STACK OVERFLOW',
  "YOU'VE BEEN PWNED!",
]

function triggerGlitch(type: 'nat20' | 'nat1') {
  if (timeoutId) clearTimeout(timeoutId)
  phaseTimeouts.forEach(t => clearTimeout(t))
  phaseTimeouts = []

  glitchType.value = type
  const messages = type === 'nat20' ? nat20Messages : nat1Messages
  glitchText.value = messages[Math.floor(Math.random() * messages.length)]
  isActive.value = true

  if (type === 'nat20') {
    // Pick random ASCII animation - component auto-plays on mount
    currentAscii.value = nat20Asciis[Math.floor(Math.random() * nat20Asciis.length)]

    // Auto-dismiss after animation
    timeoutId = setTimeout(dismiss, 15000)
  } else {
    // NAT 1 - Glitch the whole app
    glitchPhase.value = 'scramble'
    document.body.classList.add('glitch-mode')

    // Phase 1: Scramble (0-500ms) - just the glitched app
    phaseTimeouts.push(setTimeout(() => {
      glitchPhase.value = 'message'
    }, 500))

    // Phase 2: Message visible, then dismiss
    phaseTimeouts.push(setTimeout(() => {
      dismiss()
    }, 2500))
  }
}

function dismiss() {
  if (timeoutId) clearTimeout(timeoutId)
  phaseTimeouts.forEach(t => clearTimeout(t))
  phaseTimeouts = []

  if (asciiPlayerRef.value) {
    asciiPlayerRef.value.stop()
  }

  // Remove glitch mode from body
  document.body.classList.remove('glitch-mode')

  isActive.value = false
  glitchType.value = null
  glitchPhase.value = null
}

function onAsciiEnded() {
  setTimeout(dismiss, 300)
}

function toggleRetroMode() {
  retroModeManual.value = !retroModeManual.value
  // Only toggle body class if not already set by theme
  if (retroModeManual.value && !retroModeTheme.value) {
    document.body.classList.add('retro-mode')
  } else if (!retroModeManual.value && !retroModeTheme.value) {
    document.body.classList.remove('retro-mode')
  }
}

// Watch for theme changes that add/remove retro-mode class
function checkRetroTheme() {
  retroModeTheme.value = document.body.classList.contains('retro-mode')
}

// Secret keyboard shortcuts: Shift+Option+1 = crit fail, +2 = crit success, +3 = retro mode
function handleSecretKeys(e: KeyboardEvent) {
  if (e.shiftKey && e.altKey) {
    if (e.code === 'Digit1') {
      e.preventDefault()
      triggerGlitch('nat1')
    } else if (e.code === 'Digit2') {
      e.preventDefault()
      triggerGlitch('nat20')
    } else if (e.code === 'Digit3') {
      e.preventDefault()
      toggleRetroMode()
    }
  }
}

let classObserver: MutationObserver | null = null

onMounted(() => {
  unsubscribe = onRoll((roll) => {
    if (roll.isNat20) {
      triggerGlitch('nat20')
    } else if (roll.isNat1) {
      triggerGlitch('nat1')
    }
  })

  window.addEventListener('keydown', handleSecretKeys)

  // Check initial state and watch for theme changes
  checkRetroTheme()
  classObserver = new MutationObserver(() => checkRetroTheme())
  classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (timeoutId) clearTimeout(timeoutId)
  if (classObserver) classObserver.disconnect()
  phaseTimeouts.forEach(t => clearTimeout(t))
  document.body.classList.remove('glitch-mode')
  // Only remove retro-mode if it was set manually, not by theme
  if (retroModeManual.value) document.body.classList.remove('retro-mode')
  window.removeEventListener('keydown', handleSecretKeys)
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

    <!-- NAT 1 - App-wide glitch + message overlay -->
    <Transition name="glitch-overlay">
      <div
        v-if="isActive && glitchType === 'nat1'"
        class="failure-overlay"
        :class="{
          'phase-scramble': glitchPhase === 'scramble',
          'phase-message': glitchPhase === 'message'
        }"
        @click="dismiss"
      >
        <!-- Scanlines over everything -->
        <div class="failure-scanlines"></div>

        <!-- The error message -->
        <div v-if="glitchPhase === 'message'" class="failure-message-container">
          <div class="failure-message">
            <span class="failure-icon">⚠</span>
            <span class="failure-text">{{ glitchText }}</span>
          </div>
        </div>

        <div class="click-hint">click to dismiss</div>
      </div>
    </Transition>

    <!-- Retro CRT Mode overlay -->
    <div v-if="showRetroOverlay" class="retro-overlay">
      <div class="retro-scanlines"></div>
      <div class="retro-scanline-sweep"></div>
      <div class="retro-flicker"></div>
    </div>
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
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  z-index: 10;
}

/* ============================================
   NAT 20 - ASCII Art Animation
   ============================================ */
.crit-container {
  background: #000;  /* Always dark for ASCII glow effect */
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
  font-size: clamp(6px, 0.58vw, 12px);
  line-height: 1.15;
  letter-spacing: 0.02em;
  color: var(--color-quaternary);
  text-shadow:
    0 0 2px var(--color-quaternary),
    0 0 8px var(--color-quaternary),
    0 0 15px var(--color-quaternary-subtle);
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
    0 0 10px var(--color-quaternary),
    0 0 20px var(--color-quaternary),
    0 0 40px var(--color-quaternary),
    0 0 80px var(--color-quaternary),
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
      0 0 10px var(--color-quaternary),
      0 0 20px var(--color-quaternary),
      0 0 40px var(--color-quaternary),
      2px 2px 0 #000,
      -2px -2px 0 #000;
  }
  to {
    transform: scale(1.02);
    text-shadow:
      0 0 20px var(--color-quaternary),
      0 0 40px var(--color-quaternary),
      0 0 80px var(--color-quaternary),
      0 0 120px var(--color-quaternary),
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
   NAT 1 - App-Wide Glitch + Failure Message
   ============================================ */
.failure-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: all;
}

.phase-scramble {
  background: transparent;
}

.phase-message {
  background: var(--color-bg-surface);
  opacity: 0.9;
}

.failure-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    var(--color-bg) 2px,
    var(--color-bg) 4px
  );
  opacity: 0.15;
  pointer-events: none;
  animation: scanlineScroll 0.1s linear infinite;
}

@keyframes scanlineScroll {
  from { transform: translateY(0); }
  to { transform: translateY(4px); }
}

.failure-message-container {
  position: relative;
  z-index: 10;
  animation: messageAppear 0.15s ease-out;
}

@keyframes messageAppear {
  from {
    opacity: 0;
    transform: scale(1.1);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.failure-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 4rem;
  background: var(--color-bg-elevated);
  border: 3px solid var(--color-tertiary);
  box-shadow:
    0 0 20px var(--color-tertiary-subtle),
    0 0 40px var(--color-tertiary-subtle),
    inset 0 0 20px var(--color-tertiary-subtle);
  animation: messageGlitch 0.1s ease-in-out infinite;
}

@keyframes messageGlitch {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 1px); }
  50% { transform: translate(2px, -1px); }
  75% { transform: translate(-1px, -1px); }
}

.failure-icon {
  font-size: 4rem;
  color: var(--color-tertiary);
  animation: iconPulse 0.5s ease-in-out infinite;
  text-shadow: 0 0 20px var(--color-tertiary);
}

@keyframes iconPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.failure-text {
  font-family: var(--font-mono, monospace);
  font-size: clamp(1.5rem, 6vw, 3.5rem);
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-tertiary);
  text-shadow:
    0 0 10px var(--color-tertiary),
    0 0 20px var(--color-tertiary),
    0 0 40px var(--color-tertiary-subtle),
    2px 2px 0 var(--color-bg),
    -2px -2px 0 var(--color-bg);
}

.glitch-overlay-enter-active { animation: glitchIn 0.05s ease-out; }
.glitch-overlay-leave-active { animation: glitchOut 0.2s ease-in; }

@keyframes glitchIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes glitchOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ============================================
   RETRO CRT MODE
   ============================================ */
.retro-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  pointer-events: none;
  overflow: hidden;
}

.retro-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: scanlineScroll 0.1s linear infinite;
}

.retro-scanline-sweep {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(100, 255, 100, 0.15),
    rgba(150, 255, 150, 0.25),
    rgba(100, 255, 100, 0.15),
    transparent
  );
  animation: scanlineSweep 4s linear infinite;
  filter: blur(1px);
}

@keyframes scanlineSweep {
  0% { top: -10px; }
  100% { top: 100%; }
}

.retro-flicker {
  position: absolute;
  inset: 0;
  background: transparent;
  animation: crtFlicker 0.15s infinite;
}

@keyframes crtFlicker {
  0% { opacity: 0.97; }
  50% { opacity: 1; }
  100% { opacity: 0.98; }
}
</style>

<!-- Global styles for glitch mode - affects entire app -->
<style>
/* Glitch mode - swap all text to unreadable symbols */
body.glitch-mode {
  animation: bodyShake 0.05s ease-in-out infinite;
}

body.glitch-mode * {
  font-family: 'Wingdings', 'Webdings', 'Symbol', fantasy !important;
}

/* Keep the failure message readable */
body.glitch-mode .failure-message,
body.glitch-mode .failure-message * {
  font-family: var(--font-mono, 'Courier New', monospace) !important;
}

body.glitch-mode .click-hint {
  font-family: var(--font-mono, 'Courier New', monospace) !important;
}

@keyframes bodyShake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  60% { transform: translate(-1px, -2px); }
  80% { transform: translate(1px, 2px); }
}

/* ============================================
   RETRO CRT MODE - Global Effects
   ============================================ */
body.retro-mode {
  background: #0a0a0a !important;
  filter: sepia(100%) saturate(300%) brightness(70%) hue-rotate(70deg);
}

body.retro-mode::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    rgba(0, 0, 0, 0.3) 90%,
    rgba(0, 0, 0, 0.6) 100%
  );
  z-index: 9998;
}

/* Add subtle screen curvature effect */
body.retro-mode #app {
  transform: perspective(1000px) rotateX(1deg);
  transform-origin: center center;
}

/* Make text more pixelated/blocky */
body.retro-mode * {
  text-shadow: 0 0 2px currentColor !important;
  font-smooth: never;
  -webkit-font-smoothing: none;
}

/* Phosphor glow on interactive elements */
body.retro-mode button,
body.retro-mode input,
body.retro-mode select,
body.retro-mode .card {
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.3) !important;
}
</style>
