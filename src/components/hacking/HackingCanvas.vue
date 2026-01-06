<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import { useSettingsStore, themes } from '../../stores/settingsStore'
import type { AccessPoint, HackingEffectType } from '../../types/hacking'
import { hexToRgb } from '../../utils/colors'

const props = defineProps<{
  fullscreen?: boolean
}>()

const store = useHackingStore()
const { settings } = useSettingsStore()

// Get theme colors reactively
const themeColors = computed(() => {
  const theme = themes[settings.theme]
  const root = getComputedStyle(document.documentElement)

  return {
    accent: hexToRgb(root.getPropertyValue('--color-accent').trim() || theme.accent),
    success: hexToRgb(root.getPropertyValue('--color-success').trim() || '#6AE11E'),
    danger: hexToRgb(root.getPropertyValue('--color-danger').trim() || '#E1341E'),
    secondary: hexToRgb(root.getPropertyValue('--color-secondary').trim() || '#961EE1'),
  }
})

// Effect colors based on theme
function getEffectColor(type: HackingEffectType): { r: number; g: number; b: number } {
  const colors = themeColors.value
  switch (type) {
    case 'breach':
    case 'success':
    case 'data-extract':
      return colors.success
    case 'alarm':
    case 'countermeasure':
    case 'lockout':
    case 'trace':
      return colors.danger
    case 'vulnerability':
      return colors.secondary
    case 'scan':
    case 'pulse':
    default:
      return colors.accent
  }
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// Particle system for data flow
interface Particle {
  x: number
  y: number
  progress: number
  speed: number
  connectionIndex: number
  alpha: number
}

let particles: Particle[] = []

function getCanvasDimensions() {
  if (!canvasRef.value) return { width: 800, height: 600 }
  return {
    width: canvasRef.value.width,
    height: canvasRef.value.height
  }
}

function toCanvasCoords(pos: { x: number; y: number }) {
  const { width, height } = getCanvasDimensions()
  const padding = 60
  return {
    x: padding + pos.x * (width - padding * 2),
    y: padding + pos.y * (height - padding * 2)
  }
}

function getNodeColor(state: string): { r: number; g: number; b: number } {
  const colors = themeColors.value
  switch (state) {
    case 'breached':
      return colors.success
    case 'alarmed':
      return colors.danger
    case 'active':
      return { r: colors.accent.r + 40, g: colors.accent.g + 20, b: colors.accent.b + 30 }
    default:
      return colors.accent
  }
}

function initParticles() {
  if (!store.state.computer) return

  particles = []
  const connections = getConnections()
  const particleCount = Math.floor(connections.length * 3 * store.state.ambientIntensity)

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: 0,
      y: 0,
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      connectionIndex: Math.floor(Math.random() * connections.length),
      alpha: 0.3 + Math.random() * 0.5
    })
  }
}

function getConnections(): Array<{ from: AccessPoint; to: AccessPoint }> {
  if (!store.state.computer) return []

  const connections: Array<{ from: AccessPoint; to: AccessPoint }> = []
  const seen = new Set<string>()

  for (const node of store.state.computer.accessPoints) {
    for (const targetId of node.connectedTo) {
      const key = [node.id, targetId].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        const target = store.state.computer.accessPoints.find(ap => ap.id === targetId)
        if (target) {
          connections.push({ from: node, to: target })
        }
      }
    }
  }

  return connections
}

function drawCyberGrid(time: number) {
  if (!ctx) return
  const { width, height } = getCanvasDimensions()
  const rgb = themeColors.value.accent

  const gridSize = 40
  const offset = (time * 0.01) % gridSize

  for (let x = -gridSize + offset; x < width + gridSize; x += gridSize) {
    const pulse = Math.sin(time * 0.001 + x * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 + pulse * 0.05})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let y = -gridSize + offset; y < height + gridSize; y += gridSize) {
    const pulse = Math.sin(time * 0.001 + y * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 + pulse * 0.05})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let x = -gridSize + offset; x < width + gridSize; x += gridSize) {
    for (let y = -gridSize + offset; y < height + gridSize; y += gridSize) {
      const pulse = Math.sin(time * 0.002 + x * 0.02 + y * 0.02) * 0.5 + 0.5
      if (pulse > 0.6) {
        ctx.beginPath()
        ctx.arc(x, y, 1 + pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pulse * 0.3})`
        ctx.fill()
      }
    }
  }
}

function drawConnections(time: number) {
  if (!ctx || !store.state.computer) return

  const connections = getConnections()

  for (const conn of connections) {
    const from = toCanvasCoords(conn.from.position)
    const to = toCanvasCoords(conn.to.position)

    const fromColor = getNodeColor(conn.from.state)
    const toColor = getNodeColor(conn.to.state)

    const color = {
      r: (fromColor.r + toColor.r) / 2,
      g: (fromColor.g + toColor.g) / 2,
      b: (fromColor.b + toColor.b) / 2
    }

    const pulse = Math.sin(time * 0.002) * 0.3 + 0.7
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.2 * pulse})`
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.05 * pulse})`
    ctx.lineWidth = 6
    ctx.stroke()
  }
}

function drawParticles(_time: number) {
  if (!ctx || !store.state.computer) return

  const connections = getConnections()

  for (const particle of particles) {
    if (particle.connectionIndex >= connections.length) continue

    const conn = connections[particle.connectionIndex]
    if (!conn) continue
    const from = toCanvasCoords(conn.from.position)
    const to = toCanvasCoords(conn.to.position)

    particle.progress += particle.speed
    if (particle.progress > 1) {
      particle.progress = 0
      particle.connectionIndex = Math.floor(Math.random() * connections.length)
    }

    particle.x = from.x + (to.x - from.x) * particle.progress
    particle.y = from.y + (to.y - from.y) * particle.progress

    const color = getNodeColor(conn!.from.state)

    ctx.beginPath()
    ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.alpha})`
    ctx.fill()
  }
}

function drawNodes(time: number) {
  if (!ctx || !store.state.computer) return

  for (const node of store.state.computer.accessPoints) {
    const pos = toCanvasCoords(node.position)
    const color = getNodeColor(node.state)
    const isFocused = store.state.focusedNodeId === node.id

    let pulse = Math.sin(time * 0.003 + node.position.x * 10) * 0.5 + 0.5
    if (node.state === 'alarmed') {
      pulse = Math.sin(time * 0.02) * 0.5 + 0.5
    }

    const baseRadius = props.fullscreen ? 25 : 18
    const radius = baseRadius + pulse * 5

    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2)
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${isFocused ? 0.4 : 0.2})`)
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${isFocused ? 0.15 : 0.05})`)
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.3 + pulse * 0.3})`
    ctx.fill()
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8 + pulse * 0.2})`
    ctx.lineWidth = isFocused ? 3 : 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
    ctx.fill()

    if (props.fullscreen) {
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
      ctx.textAlign = 'center'
      ctx.fillText(node.name, pos.x, pos.y + radius + 20)
    }
  }
}

function drawEffects(time: number) {
  if (!ctx || !store.state.computer) return

  for (const effect of store.state.activeEffects) {
    const progress = (Date.now() - effect.startTime) / effect.duration
    if (progress < 0 || progress > 1) continue

    const color = getEffectColor(effect.type)

    let pos = { x: canvasRef.value!.width / 2, y: canvasRef.value!.height / 2 }
    if (effect.targetNodeId) {
      const node = store.state.computer.accessPoints.find(ap => ap.id === effect.targetNodeId)
      if (node) {
        pos = toCanvasCoords(node.position)
      }
    }

    switch (effect.type) {
      case 'breach':
      case 'success':
        const ringRadius = progress * 150
        const ringAlpha = 1 - progress

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`
        ctx.lineWidth = 4 * (1 - progress)
        ctx.stroke()

        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          const distance = progress * 120
          const px = pos.x + Math.cos(angle) * distance
          const py = pos.y + Math.sin(angle) * distance

          ctx.beginPath()
          ctx.arc(px, py, 4 * (1 - progress), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`
          ctx.fill()
        }
        break

      case 'alarm':
      case 'countermeasure':
      case 'lockout':
        const pulseIntensity = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5

        for (const node of store.state.computer!.accessPoints) {
          const nodePos = toCanvasCoords(node.position)

          ctx.beginPath()
          ctx.arc(nodePos.x, nodePos.y, 40 + pulseIntensity * 20, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulseIntensity * 0.3 * (1 - progress)})`
          ctx.fill()
        }
        break

      case 'vulnerability':
        const vulnRing = progress * 80
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, vulnRing, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${1 - progress})`
        ctx.lineWidth = 3
        ctx.stroke()

        if (progress < 0.7) {
          ctx.font = 'bold 16px "JetBrains Mono", monospace'
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${1 - progress})`
          ctx.textAlign = 'center'
          ctx.fillText('DC -2', pos.x, pos.y - 50 - progress * 30)
        }
        break

      case 'scan':
        const sweepAngle = progress * Math.PI * 2
        const sweepLength = 150

        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(
          pos.x + Math.cos(sweepAngle) * sweepLength,
          pos.y + Math.sin(sweepAngle) * sweepLength
        )
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8})`
        ctx.lineWidth = 2
        ctx.stroke()
        break

      case 'trace':
        const { height } = getCanvasDimensions()

        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.lineTo(
          pos.x * progress,
          height - (height - pos.y) * progress
        )
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
        ctx.lineWidth = 3
        ctx.setLineDash([10, 5])
        ctx.stroke()
        ctx.setLineDash([])

        if (Math.sin(time * 0.01) > 0) {
          ctx.beginPath()
          ctx.arc(pos.x * progress, height - (height - pos.y) * progress, 5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
          ctx.fill()
        }
        break
    }
  }
}

function animate(time: number) {
  if (!ctx || !canvasRef.value) return

  const { width, height } = getCanvasDimensions()

  // Use theme background color
  const root = getComputedStyle(document.documentElement)
  const bgColor = root.getPropertyValue('--color-bg').trim() || '#050608'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  drawCyberGrid(time)
  drawConnections(time)
  drawParticles(time)
  drawNodes(time)
  drawEffects(time)

  animationId = requestAnimationFrame(animate)
}

function resizeCanvas() {
  if (!canvasRef.value) return

  if (props.fullscreen) {
    canvasRef.value.width = window.innerWidth
    canvasRef.value.height = window.innerHeight
  } else {
    const container = canvasRef.value.parentElement
    if (container) {
      canvasRef.value.width = container.clientWidth
      canvasRef.value.height = container.clientHeight
    }
  }

  initParticles()
}

function handleClick(event: MouseEvent) {
  if (!store.state.isGMView || !store.state.computer || !canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  for (const node of store.state.computer.accessPoints) {
    const pos = toCanvasCoords(node.position)
    const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)

    if (distance < 30) {
      store.setFocus(node.id)
      return
    }
  }

  store.setFocus(null)
}

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resizeCanvas()
    animationId = requestAnimationFrame(animate)
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
})

watch(
  () => store.state.computer,
  () => initParticles(),
  { deep: true }
)

watch(
  () => store.state.ambientIntensity,
  () => initParticles()
)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="hacking-canvas"
    :class="{ fullscreen }"
    @click="handleClick"
  ></canvas>
</template>

<style scoped>
.hacking-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.hacking-canvas.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100;
}
</style>
