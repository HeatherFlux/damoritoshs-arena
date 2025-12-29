<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { BackgroundStyle } from '../stores/settingsStore'

const props = defineProps<{
  style: BackgroundStyle
  accentColor: string
}>()

// Canvas ref for particle-based backgrounds
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let ctx: CanvasRenderingContext2D | null = null

// Dot matrix state
const dotCount = 40
const dotRows = 25

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 212, b: 255 }
}

// ========== PARTICLE FIELD ==========
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  pulse: number
}

let particles: Particle[] = []

function initParticles() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  particles = []
  const count = Math.floor((canvas.width * canvas.height) / 15000)

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2
    })
  }
}

function drawParticles(_time: number) {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rgb = hexToRgb(props.accentColor)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles.forEach((p, i) => {
    // Update position
    p.x += p.vx
    p.y += p.vy
    p.pulse += 0.02

    // Wrap around screen
    if (p.x < 0) p.x = canvas.width
    if (p.x > canvas.width) p.x = 0
    if (p.y < 0) p.y = canvas.height
    if (p.y > canvas.height) p.y = 0

    // Pulsing alpha
    const alpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse))

    // Draw particle
    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx!.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
    ctx!.fill()

    // Draw connections to nearby particles
    for (let j = i + 1; j < particles.length; j++) {
      const p2 = particles[j]
      const dx = p.x - p2.x
      const dy = p.y - p2.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 120) {
        ctx!.beginPath()
        ctx!.moveTo(p.x, p.y)
        ctx!.lineTo(p2.x, p2.y)
        ctx!.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.1 * (1 - dist / 120)})`
        ctx!.stroke()
      }
    }
  })
}

// ========== CYBER GRID ==========
function drawCyberGrid(time: number) {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rgb = hexToRgb(props.accentColor)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const gridSize = 60
  const offset = (time * 0.02) % gridSize

  // Draw vertical lines
  for (let x = -gridSize + offset; x < canvas.width + gridSize; x += gridSize) {
    const pulse = Math.sin(time * 0.001 + x * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 + pulse * 0.08})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = -gridSize + offset; y < canvas.height + gridSize; y += gridSize) {
    const pulse = Math.sin(time * 0.001 + y * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 + pulse * 0.08})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw glowing dots at intersections
  for (let x = -gridSize + offset; x < canvas.width + gridSize; x += gridSize) {
    for (let y = -gridSize + offset; y < canvas.height + gridSize; y += gridSize) {
      const pulse = Math.sin(time * 0.002 + x * 0.02 + y * 0.02) * 0.5 + 0.5

      ctx.beginPath()
      ctx.arc(x, y, 1.5 + pulse, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 + pulse * 0.3})`
      ctx.fill()

      // Glow effect
      if (pulse > 0.7) {
        ctx.beginPath()
        ctx.arc(x, y, 4 + pulse * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(pulse - 0.7) * 0.2})`
        ctx.fill()
      }
    }
  }
}

// ========== FLOATING BLOBS ==========
interface Blob {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
}

let blobs: Blob[] = []

function initBlobs() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  blobs = []

  for (let i = 0; i < 6; i++) {
    blobs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 150 + 100,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01
    })
  }
}

function drawFloatingBlobs(_time: number) {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rgb = hexToRgb(props.accentColor)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  blobs.forEach(blob => {
    // Update position
    blob.x += blob.vx
    blob.y += blob.vy
    blob.rotation += blob.rotationSpeed

    // Bounce off edges
    if (blob.x < -blob.size || blob.x > canvas.width + blob.size) blob.vx *= -1
    if (blob.y < -blob.size || blob.y > canvas.height + blob.size) blob.vy *= -1

    // Draw blob with gradient
    const gradient = ctx!.createRadialGradient(
      blob.x, blob.y, 0,
      blob.x, blob.y, blob.size
    )
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    ctx!.beginPath()
    ctx!.ellipse(blob.x, blob.y, blob.size, blob.size * 0.6, blob.rotation, 0, Math.PI * 2)
    ctx!.fillStyle = gradient
    ctx!.fill()
  })
}

// ========== RANDOM DOTS (Shutterstock style) ==========
interface RandomDot {
  x: number
  y: number
  targetAlpha: number
  currentAlpha: number
  flickerSpeed: number
  nextFlicker: number
}

let randomDots: RandomDot[] = []

function initRandomDots() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  randomDots = []

  const spacing = 20
  const cols = Math.ceil(canvas.width / spacing)
  const rows = Math.ceil(canvas.height / spacing)

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      randomDots.push({
        x: i * spacing + spacing / 2,
        y: j * spacing + spacing / 2,
        targetAlpha: Math.random() * 0.4,
        currentAlpha: Math.random() * 0.4,
        flickerSpeed: Math.random() * 0.02 + 0.01,
        nextFlicker: Math.random() * 2000
      })
    }
  }
}

function drawRandomDots(time: number) {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rgb = hexToRgb(props.accentColor)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  randomDots.forEach(dot => {
    // Random flicker timing
    if (time > dot.nextFlicker) {
      dot.targetAlpha = Math.random() * 0.5
      dot.nextFlicker = time + Math.random() * 3000 + 500
    }

    // Smooth transition to target
    dot.currentAlpha += (dot.targetAlpha - dot.currentAlpha) * dot.flickerSpeed

    if (dot.currentAlpha > 0.05) {
      ctx!.beginPath()
      ctx!.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dot.currentAlpha})`
      ctx!.fill()
    }
  })
}

// ========== ANIMATION LOOP ==========
function animate(time: number) {
  if (props.style === 'particle-field') {
    drawParticles(time)
  } else if (props.style === 'cyber-grid') {
    drawCyberGrid(time)
  } else if (props.style === 'floating-blobs') {
    drawFloatingBlobs(time)
  } else if (props.style === 'random-dots') {
    drawRandomDots(time)
  }

  animationId = requestAnimationFrame(animate)
}

function resizeCanvas() {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight

  // Reinitialize particles/blobs on resize
  if (props.style === 'particle-field') initParticles()
  if (props.style === 'floating-blobs') initBlobs()
  if (props.style === 'random-dots') initRandomDots()
}

function startCanvasAnimation() {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  resizeCanvas()

  if (props.style === 'particle-field') initParticles()
  if (props.style === 'floating-blobs') initBlobs()
  if (props.style === 'random-dots') initRandomDots()

  animationId = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// Watch for style changes
watch(() => props.style, (newStyle) => {
  stopAnimation()
  if (['particle-field', 'cyber-grid', 'floating-blobs', 'random-dots'].includes(newStyle)) {
    startCanvasAnimation()
  }
})

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  if (['particle-field', 'cyber-grid', 'floating-blobs', 'random-dots'].includes(props.style)) {
    startCanvasAnimation()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  stopAnimation()
})

// Computed classes for CSS-based animations
const showGradientWave = computed(() => props.style === 'gradient-wave')
const showDotMatrix = computed(() => props.style === 'dot-matrix')
const showCanvas = computed(() => ['particle-field', 'cyber-grid', 'floating-blobs', 'random-dots'].includes(props.style))
</script>

<template>
  <div class="animated-background" :class="`bg-${style}`">
    <!-- Gradient Wave (CSS) -->
    <div v-if="showGradientWave" class="gradient-wave"></div>

    <!-- Dot Matrix Wave (CSS) -->
    <div v-if="showDotMatrix" class="dot-matrix">
      <div
        v-for="row in dotRows"
        :key="`row-${row}`"
        class="dot-row"
      >
        <span
          v-for="col in dotCount"
          :key="`dot-${row}-${col}`"
          class="dot-char"
          :style="{
            animationDelay: `${(row * 0.05) + (col * 0.03)}s`,
          }"
        >×</span>
      </div>
    </div>

    <!-- Canvas-based animations -->
    <canvas
      v-if="showCanvas"
      ref="canvasRef"
      class="canvas-bg"
    ></canvas>
  </div>
</template>

<style scoped>
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

/* ========== GRADIENT WAVE ========== */
.gradient-wave {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    -45deg,
    var(--color-bg) 0%,
    var(--color-bg-surface) 25%,
    color-mix(in srgb, var(--color-accent) 8%, var(--color-bg)) 50%,
    var(--color-bg-surface) 75%,
    var(--color-bg) 100%
  );
  background-size: 400% 400%;
  animation: gradientWave 15s ease infinite;
}

@keyframes gradientWave {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ========== DOT MATRIX ========== */
.dot-matrix {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  padding: 20px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1;
  overflow: hidden;
}

.dot-row {
  display: flex;
  justify-content: space-evenly;
}

.dot-char {
  color: var(--color-accent);
  opacity: 0.1;
  animation: dotPulse 3s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% {
    opacity: 0.08;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.2);
    text-shadow: 0 0 8px var(--color-accent);
  }
}

/* ========== CANVAS ========== */
.canvas-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
