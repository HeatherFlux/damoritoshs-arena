<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface AsciiData {
  fps: number
  cols: number
  rows: number
  frameCount: number
  frames: string[]
}

const currentFrame = ref('')
const isLoaded = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const scale = ref(1)

let frames: string[] = []
let cols = 120
let rows = 60
let fps = 12
let frameIndex = 0
let animationId: number | null = null
let lastFrameTime = 0

function calculateScale() {
  if (!containerRef.value) return

  const container = containerRef.value
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight

  // Base size of ASCII art (approximate character dimensions)
  const charWidth = 7.2  // monospace char width in px at 12px font
  const charHeight = 14.4 // line height at 12px font

  const artWidth = cols * charWidth
  const artHeight = rows * charHeight

  // Scale to fill container (cover, not contain)
  const scaleX = containerWidth / artWidth
  const scaleY = containerHeight / artHeight
  scale.value = Math.max(scaleX, scaleY) * 1.1 // slightly larger to ensure coverage
}

async function loadFrames() {
  try {
    const response = await fetch('/custom-bg.json')
    const data: AsciiData = await response.json()
    frames = data.frames
    cols = data.cols
    rows = data.rows
    fps = 6 // Slow it down (original was 12)
    isLoaded.value = true
    currentFrame.value = frames[0]
    calculateScale()
    startAnimation()
  } catch (err) {
    console.error('Failed to load ASCII background:', err)
  }
}

function startAnimation() {
  const frameInterval = 1000 / fps

  function animate(timestamp: number) {
    if (timestamp - lastFrameTime >= frameInterval) {
      frameIndex = (frameIndex + 1) % frames.length
      currentFrame.value = frames[frameIndex]
      lastFrameTime = timestamp
    }
    animationId = requestAnimationFrame(animate)
  }

  animationId = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

onMounted(() => {
  loadFrames()
  window.addEventListener('resize', calculateScale)
})

onUnmounted(() => {
  stopAnimation()
  window.removeEventListener('resize', calculateScale)
})
</script>

<template>
  <div v-if="isLoaded" ref="containerRef" class="ascii-background">
    <pre class="ascii-art" :style="{ transform: `scale(${scale})` }">{{ currentFrame }}</pre>
  </div>
</template>

<style scoped>
.ascii-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ascii-art {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: 0.05em;
  color: var(--color-accent);
  opacity: 0.12;
  white-space: pre;
  margin: 0;
  user-select: none;
  transform-origin: center center;
}
</style>
