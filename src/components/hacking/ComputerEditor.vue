<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHackingStore } from '../../stores/hackingStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { Computer, AccessPoint, ComputerType, AccessPointType, NodeState } from '../../types/hacking'

const store = useHackingStore()
const { settings, themes } = useSettingsStore()

const emit = defineEmits<{
  close: []
}>()

// Editor state
const editMode = ref<'select' | 'add' | 'connect' | 'disconnect' | 'delete'>('select')
const selectedNodeId = ref<string | null>(null)
const connectingFromId = ref<string | null>(null)

// Computer form
const computerName = ref('')
const computerLevel = ref(1)
const computerType = ref<ComputerType>('tech')
const computerDescription = ref('')
const successDescription = ref('')
const criticalSuccessDescription = ref('')
const failureDescription = ref('')
const showOutcomeDescriptions = ref(false)

// Node advanced options collapse state
const showHackSkills = ref(false)
const showVulnerabilities = ref(false)
const showCountermeasures = ref(false)

// New node form
const newNodeName = ref('')
const newNodeType = ref<AccessPointType>('remote')
const newNodeDC = ref<number | undefined>(undefined)

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// Dragging state
const isDragging = ref(false)
const dragNodeId = ref<string | null>(null)

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 30, g: 203, b: 225 }
}

// Get theme colors from CSS variables
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

// Initialize from current computer
onMounted(() => {
  if (store.state.computer) {
    computerName.value = store.state.computer.name
    computerLevel.value = store.state.computer.level
    computerType.value = store.state.computer.type
    computerDescription.value = store.state.computer.description || ''
    successDescription.value = store.state.computer.successDescription || ''
    criticalSuccessDescription.value = store.state.computer.criticalSuccessDescription || ''
    failureDescription.value = store.state.computer.failureDescription || ''
  }

  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resizeCanvas()
    animationId = requestAnimationFrame(animate)
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resizeCanvas)
})

// Access points
const accessPoints = computed(() => store.state.computer?.accessPoints || [])

// Get canvas position from mouse event
function getCanvasPos(e: MouseEvent) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  }
}

// Convert normalized to canvas coords
function toCanvasCoords(pos: { x: number; y: number }) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const padding = 40
  return {
    x: padding + pos.x * (canvasRef.value.width - padding * 2),
    y: padding + pos.y * (canvasRef.value.height - padding * 2)
  }
}

// Find node at position
function findNodeAtPos(pos: { x: number; y: number }): AccessPoint | null {
  for (const node of accessPoints.value) {
    const nodePos = node.position
    const dx = pos.x - nodePos.x
    const dy = pos.y - nodePos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.05) return node
  }
  return null
}

// Canvas click handler
function handleCanvasClick(e: MouseEvent) {
  const pos = getCanvasPos(e)
  const clickedNode = findNodeAtPos(pos)

  switch (editMode.value) {
    case 'select':
      selectedNodeId.value = clickedNode?.id || null
      store.setFocus(clickedNode?.id || null)
      break

    case 'add':
      if (!clickedNode && newNodeName.value.trim()) {
        addNode(pos)
      }
      break

    case 'connect':
      if (clickedNode) {
        if (!connectingFromId.value) {
          connectingFromId.value = clickedNode.id
        } else if (connectingFromId.value !== clickedNode.id) {
          connectNodes(connectingFromId.value, clickedNode.id)
          connectingFromId.value = null
        }
      } else {
        connectingFromId.value = null
      }
      break

    case 'disconnect':
      if (clickedNode) {
        if (!connectingFromId.value) {
          connectingFromId.value = clickedNode.id
        } else if (connectingFromId.value !== clickedNode.id) {
          disconnectNodes(connectingFromId.value, clickedNode.id)
          connectingFromId.value = null
        }
      } else {
        connectingFromId.value = null
      }
      break

    case 'delete':
      if (clickedNode) {
        deleteNode(clickedNode.id)
      }
      break
  }
}

// Mouse down for dragging
function handleMouseDown(e: MouseEvent) {
  if (editMode.value !== 'select') return

  const pos = getCanvasPos(e)
  const clickedNode = findNodeAtPos(pos)

  if (clickedNode) {
    isDragging.value = true
    dragNodeId.value = clickedNode.id
    selectedNodeId.value = clickedNode.id
    store.setFocus(clickedNode.id)
  }
}

// Mouse move for dragging
function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || !dragNodeId.value || !store.state.computer) return

  const pos = getCanvasPos(e)
  const node = store.state.computer.accessPoints.find(ap => ap.id === dragNodeId.value)
  if (node) {
    node.position.x = Math.max(0.05, Math.min(0.95, pos.x))
    node.position.y = Math.max(0.05, Math.min(0.95, pos.y))
  }
}

// Mouse up
function handleMouseUp() {
  isDragging.value = false
  dragNodeId.value = null
}

// Add new node
function addNode(pos: { x: number; y: number }) {
  if (!store.state.computer || !newNodeName.value.trim()) return

  const newNode: AccessPoint = {
    id: `ap-${Date.now()}`,
    name: newNodeName.value.trim(),
    type: newNodeType.value,
    state: 'locked',
    position: { x: pos.x, y: pos.y },
    connectedTo: [],
    dc: newNodeDC.value
  }

  store.state.computer.accessPoints.push(newNode)
  newNodeName.value = ''
  newNodeDC.value = undefined
  selectedNodeId.value = newNode.id
  store.setFocus(newNode.id)
}

// Connect two nodes
function connectNodes(fromId: string, toId: string) {
  if (!store.state.computer) return

  const fromNode = store.state.computer.accessPoints.find(ap => ap.id === fromId)
  const toNode = store.state.computer.accessPoints.find(ap => ap.id === toId)

  if (fromNode && toNode) {
    // Add connection if not already exists
    if (!fromNode.connectedTo.includes(toId)) {
      fromNode.connectedTo.push(toId)
    }
    if (!toNode.connectedTo.includes(fromId)) {
      toNode.connectedTo.push(fromId)
    }
  }
}

// Delete node
function deleteNode(nodeId: string) {
  if (!store.state.computer) return

  // Remove from other nodes' connections
  for (const node of store.state.computer.accessPoints) {
    node.connectedTo = node.connectedTo.filter(id => id !== nodeId)
  }

  // Remove the node
  store.state.computer.accessPoints = store.state.computer.accessPoints.filter(
    ap => ap.id !== nodeId
  )

  if (selectedNodeId.value === nodeId) {
    selectedNodeId.value = null
    store.setFocus(null)
  }
}

// Disconnect selected node from another
function disconnectNodes(fromId: string, toId: string) {
  if (!store.state.computer) return

  const fromNode = store.state.computer.accessPoints.find(ap => ap.id === fromId)
  const toNode = store.state.computer.accessPoints.find(ap => ap.id === toId)

  if (fromNode) {
    fromNode.connectedTo = fromNode.connectedTo.filter(id => id !== toId)
  }
  if (toNode) {
    toNode.connectedTo = toNode.connectedTo.filter(id => id !== fromId)
  }
}

// Update computer metadata
function updateComputer() {
  if (!store.state.computer) return
  store.state.computer.name = computerName.value
  store.state.computer.level = computerLevel.value
  store.state.computer.type = computerType.value
  store.state.computer.description = computerDescription.value || undefined
  store.state.computer.successDescription = successDescription.value || undefined
  store.state.computer.criticalSuccessDescription = criticalSuccessDescription.value || undefined
  store.state.computer.failureDescription = failureDescription.value || undefined
}

// Hack Skills helpers
function addHackSkill(node: AccessPoint) {
  if (!node.hackSkills) node.hackSkills = []
  node.hackSkills.push({ skill: 'Computers', dc: node.dc || 20 })
}

function removeHackSkill(node: AccessPoint, index: number) {
  if (node.hackSkills) {
    node.hackSkills.splice(index, 1)
    if (node.hackSkills.length === 0) node.hackSkills = undefined
  }
}

// Vulnerability helpers
function addVulnerability(node: AccessPoint) {
  if (!node.vulnerabilities) node.vulnerabilities = []
  node.vulnerabilities.push({
    id: `v-${Date.now()}`,
    name: 'New Vulnerability',
    skills: [{ skill: 'Society', dc: (node.dc || 20) - 2 }],
    dcReduction: 1
  })
}

function removeVulnerability(node: AccessPoint, index: number) {
  if (node.vulnerabilities) {
    node.vulnerabilities.splice(index, 1)
    if (node.vulnerabilities.length === 0) node.vulnerabilities = undefined
  }
}

function addVulnerabilitySkill(node: AccessPoint, vulnIndex: number) {
  if (node.vulnerabilities?.[vulnIndex]) {
    node.vulnerabilities[vulnIndex].skills.push({ skill: 'Diplomacy', dc: (node.dc || 20) - 2 })
  }
}

function removeVulnerabilitySkill(node: AccessPoint, vulnIndex: number, skillIndex: number) {
  if (node.vulnerabilities?.[vulnIndex]?.skills) {
    node.vulnerabilities[vulnIndex].skills.splice(skillIndex, 1)
  }
}

// Countermeasure helpers
function addCountermeasure(node: AccessPoint) {
  if (!node.countermeasures) node.countermeasures = []
  node.countermeasures.push({
    id: `c-${Date.now()}`,
    name: 'New Countermeasure',
    failureThreshold: 2,
    noticeDC: (node.dc || 20) - 4,
    noticeSkills: ['Computers', 'Perception'],
    disableSkills: [{ skill: 'Computers', dc: (node.dc || 20) + 2 }],
    description: 'Describe what happens when triggered...'
  })
}

function removeCountermeasure(node: AccessPoint, index: number) {
  if (node.countermeasures) {
    node.countermeasures.splice(index, 1)
    if (node.countermeasures.length === 0) node.countermeasures = undefined
  }
}

function addDisableSkill(node: AccessPoint, cmIndex: number) {
  if (node.countermeasures?.[cmIndex]) {
    node.countermeasures[cmIndex].disableSkills.push({ skill: 'Computers', dc: (node.dc || 20) + 2 })
  }
}

function removeDisableSkill(node: AccessPoint, cmIndex: number, skillIndex: number) {
  if (node.countermeasures?.[cmIndex]?.disableSkills) {
    node.countermeasures[cmIndex].disableSkills.splice(skillIndex, 1)
  }
}

function toggleNoticeSkill(node: AccessPoint, cmIndex: number, skill: string) {
  if (!node.countermeasures?.[cmIndex]) return
  const cm = node.countermeasures[cmIndex]
  if (!cm.noticeSkills) cm.noticeSkills = []
  const idx = cm.noticeSkills.indexOf(skill)
  if (idx >= 0) {
    cm.noticeSkills.splice(idx, 1)
  } else {
    cm.noticeSkills.push(skill)
  }
}

// Create new computer
function createNewComputer() {
  const newComputer: Computer = {
    id: crypto.randomUUID(),
    name: 'New Computer',
    level: 1,
    type: 'tech',
    accessPoints: []
  }
  store.loadComputer(newComputer)
  computerName.value = newComputer.name
  computerLevel.value = newComputer.level
  computerType.value = newComputer.type
}

// Get node color from theme
function getNodeColor(state: NodeState): { r: number; g: number; b: number } {
  const colors = themeColors.value
  switch (state) {
    case 'breached': return colors.success
    case 'alarmed': return colors.danger
    case 'active': return { r: colors.accent.r + 40, g: colors.accent.g + 20, b: colors.accent.b + 30 }
    default: return colors.accent
  }
}

// Canvas resize
function resizeCanvas() {
  if (!canvasRef.value) return
  const container = canvasRef.value.parentElement
  if (container) {
    canvasRef.value.width = container.clientWidth
    canvasRef.value.height = container.clientHeight
  }
}

// Animation loop
function animate(_time: number) {
  if (!ctx || !canvasRef.value) {
    animationId = requestAnimationFrame(animate)
    return
  }

  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const colors = themeColors.value

  // Clear
  ctx.fillStyle = '#050608'
  ctx.fillRect(0, 0, width, height)

  // Draw grid with theme color
  ctx.strokeStyle = `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, 0.1)`
  ctx.lineWidth = 1
  const gridSize = 30
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Draw connections
  for (const node of accessPoints.value) {
    const from = toCanvasCoords(node.position)
    for (const targetId of node.connectedTo) {
      const target = accessPoints.value.find(ap => ap.id === targetId)
      if (target && node.id < targetId) { // Draw each connection once
        const to = toCanvasCoords(target.position)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, 0.4)`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }

  // Draw "connecting from" indicator
  if (connectingFromId.value && canvasRef.value) {
    const fromNode = accessPoints.value.find(ap => ap.id === connectingFromId.value)
    if (fromNode) {
      const from = toCanvasCoords(fromNode.position)
      // Draw a pulsing ring around the selected node
      const pulseSize = 30 + Math.sin(_time / 200) * 5
      ctx.beginPath()
      ctx.arc(from.x, from.y, pulseSize, 0, Math.PI * 2)
      ctx.setLineDash([5, 5])
      // Green for connect, red for disconnect
      const isDisconnect = editMode.value === 'disconnect'
      const ringColor = isDisconnect ? colors.danger : colors.success
      ctx.strokeStyle = `rgba(${ringColor.r}, ${ringColor.g}, ${ringColor.b}, 0.8)`
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // Draw nodes
  for (const node of accessPoints.value) {
    const pos = toCanvasCoords(node.position)
    const color = getNodeColor(node.state)
    const isSelected = selectedNodeId.value === node.id
    const isConnecting = connectingFromId.value === node.id

    const radius = 20

    // Outer glow
    if (isSelected || isConnecting) {
      const glowColor = isConnecting
        ? `${colors.secondary.r}, ${colors.secondary.g}, ${colors.secondary.b}`
        : `${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}`
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius + 10, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${glowColor}, 0.3)`
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`
    ctx.fill()
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${isSelected ? 1 : 0.7})`
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()

    // Center dot
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
    ctx.fill()

    // Label
    ctx.font = '11px "JetBrains Mono", monospace'
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
    ctx.textAlign = 'center'
    ctx.fillText(node.name, pos.x, pos.y + radius + 16)

    // Type indicator
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(122, 139, 154, 0.8)'
    ctx.fillText(node.type, pos.x, pos.y + radius + 28)
  }

  // Mode indicator
  ctx.font = '12px "JetBrains Mono", monospace'
  ctx.fillStyle = `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, 0.8)`
  ctx.textAlign = 'left'
  const modeText: Record<string, string> = {
    select: 'SELECT MODE - Click to select, drag to move',
    add: 'ADD MODE - Click to place node',
    connect: 'LINK MODE - Click two nodes to connect',
    disconnect: 'UNLINK MODE - Click two nodes to disconnect',
    delete: 'DELETE MODE - Click node to delete'
  }
  ctx.fillText(modeText[editMode.value] || '', 10, height - 10)

  animationId = requestAnimationFrame(animate)
}

// Selected node info
const selectedNode = computed(() =>
  accessPoints.value.find(ap => ap.id === selectedNodeId.value)
)

// Watch for computer changes
watch(() => store.state.computer, (newComputer) => {
  if (newComputer) {
    computerName.value = newComputer.name
    computerLevel.value = newComputer.level
    computerType.value = newComputer.type
    computerDescription.value = newComputer.description || ''
    successDescription.value = newComputer.successDescription || ''
    criticalSuccessDescription.value = newComputer.criticalSuccessDescription || ''
    failureDescription.value = newComputer.failureDescription || ''
  }
}, { immediate: true })
</script>

<template>
  <div class="computer-editor">
    <!-- Left Panel: Tools & Properties -->
    <div class="editor-sidebar panel">
      <div class="sidebar-section">
        <h3 class="section-title">Computer</h3>
        <div class="form-group">
          <label>Name</label>
          <input
            v-model="computerName"
            class="input"
            @change="updateComputer"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Level</label>
            <input
              v-model.number="computerLevel"
              type="number"
              min="0"
              max="25"
              class="input"
              @change="updateComputer"
            />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="computerType" class="input" @change="updateComputer">
              <option value="tech">Tech</option>
              <option value="magic">Magic</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="computerDescription"
            class="input description-textarea"
            placeholder="What is this computer and what does it control?"
            rows="2"
            @change="updateComputer"
          ></textarea>
        </div>

        <button
          class="collapsible-header"
          @click="showOutcomeDescriptions = !showOutcomeDescriptions"
        >
          <span>Outcome Descriptions</span>
          <span class="collapse-icon">{{ showOutcomeDescriptions ? '▼' : '▶' }}</span>
        </button>
        <div v-if="showOutcomeDescriptions" class="collapsible-content">
          <div class="form-group">
            <label>Critical Success</label>
            <textarea
              v-model="criticalSuccessDescription"
              class="input description-textarea"
              placeholder="Bonus rewards for critical success..."
              rows="2"
              @change="updateComputer"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Success</label>
            <textarea
              v-model="successDescription"
              class="input description-textarea"
              placeholder="What players get on success..."
              rows="2"
              @change="updateComputer"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Failure</label>
            <textarea
              v-model="failureDescription"
              class="input description-textarea"
              placeholder="What happens on failure..."
              rows="2"
              @change="updateComputer"
            ></textarea>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm w-full" @click="createNewComputer">
          New Computer
        </button>
      </div>

      <hr class="divider" />

      <div class="sidebar-section">
        <h3 class="section-title">Edit Mode</h3>
        <div class="mode-buttons">
          <button
            class="mode-btn"
            :class="{ active: editMode === 'select' }"
            @click="editMode = 'select'; connectingFromId = null"
          >
            Select
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'add' }"
            @click="editMode = 'add'; connectingFromId = null"
          >
            Add
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'connect' }"
            @click="editMode = 'connect'"
          >
            Link
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'disconnect' }"
            @click="editMode = 'disconnect'"
          >
            Unlink
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'delete' }"
            @click="editMode = 'delete'; connectingFromId = null"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Add Node Form (visible in Add mode) -->
      <div v-if="editMode === 'add'" class="sidebar-section">
        <h3 class="section-title">New Node</h3>
        <div class="form-group">
          <label>Name</label>
          <input v-model="newNodeName" class="input" placeholder="Terminal Alpha" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="newNodeType" class="input">
              <option value="physical">Physical</option>
              <option value="remote">Remote</option>
              <option value="magical">Magical</option>
            </select>
          </div>
          <div class="form-group">
            <label>DC</label>
            <input
              v-model.number="newNodeDC"
              type="number"
              min="0"
              max="50"
              class="input"
              placeholder="20"
            />
          </div>
        </div>
        <p class="hint">Click on the canvas to place the node</p>
      </div>

      <!-- Selected Node (visible in Select mode) -->
      <div v-if="editMode === 'select' && selectedNode" class="sidebar-section">
        <h3 class="section-title">Selected Node</h3>
        <div class="form-group">
          <label>Name</label>
          <input
            v-model="selectedNode.name"
            class="input"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="selectedNode.type" class="input">
              <option value="physical">Physical</option>
              <option value="remote">Remote</option>
              <option value="magical">Magical</option>
            </select>
          </div>
          <div class="form-group">
            <label>State</label>
            <select v-model="selectedNode.state" class="input state-select-editor" :class="`select-${selectedNode.state}`">
              <option value="locked">Locked</option>
              <option value="active">Active</option>
              <option value="breached">Breached</option>
              <option value="alarmed">Alarmed</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>DC</label>
            <input
              v-model.number="selectedNode.dc"
              type="number"
              min="0"
              max="50"
              class="input"
              placeholder="Auto"
            />
          </div>
          <div class="form-group">
            <label>Successes</label>
            <input
              v-model.number="selectedNode.successesRequired"
              type="number"
              min="1"
              max="10"
              class="input"
              placeholder="1"
            />
          </div>
        </div>

        <!-- Hack Skills -->
        <button
          class="collapsible-header"
          @click="showHackSkills = !showHackSkills"
        >
          <span>Hack Skills ({{ selectedNode.hackSkills?.length || 0 }})</span>
          <span class="collapse-icon">{{ showHackSkills ? '▼' : '▶' }}</span>
        </button>
        <div v-if="showHackSkills" class="collapsible-content">
          <div
            v-for="(skill, index) in selectedNode.hackSkills || []"
            :key="index"
            class="skill-row"
          >
            <input
              v-model="skill.skill"
              class="input skill-input"
              placeholder="Skill"
            />
            <input
              v-model.number="skill.dc"
              type="number"
              class="input dc-input"
              placeholder="DC"
            />
            <button
              class="btn btn-xs btn-danger"
              @click="removeHackSkill(selectedNode, index)"
            >
              ✕
            </button>
          </div>
          <button
            class="btn btn-xs btn-secondary w-full"
            @click="addHackSkill(selectedNode)"
          >
            + Add Skill
          </button>
        </div>

        <!-- Vulnerabilities -->
        <button
          class="collapsible-header"
          @click="showVulnerabilities = !showVulnerabilities"
        >
          <span>Vulnerabilities ({{ selectedNode.vulnerabilities?.length || 0 }})</span>
          <span class="collapse-icon">{{ showVulnerabilities ? '▼' : '▶' }}</span>
        </button>
        <div v-if="showVulnerabilities" class="collapsible-content">
          <div
            v-for="(vuln, vIndex) in selectedNode.vulnerabilities || []"
            :key="vuln.id"
            class="vulnerability-item"
          >
            <div class="vuln-header">
              <input
                v-model="vuln.name"
                class="input"
                placeholder="Vulnerability name"
              />
              <button
                class="btn btn-xs btn-danger"
                @click="removeVulnerability(selectedNode, vIndex)"
              >
                ✕
              </button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>DC Reduction</label>
                <input
                  v-model.number="vuln.dcReduction"
                  type="number"
                  min="1"
                  max="5"
                  class="input"
                />
              </div>
            </div>
            <label class="sub-label">Skills to exploit:</label>
            <div
              v-for="(skill, sIndex) in vuln.skills"
              :key="sIndex"
              class="skill-row"
            >
              <input
                v-model="skill.skill"
                class="input skill-input"
                placeholder="Skill"
              />
              <input
                v-model.number="skill.dc"
                type="number"
                class="input dc-input"
                placeholder="DC"
              />
              <button
                class="btn btn-xs btn-danger"
                @click="removeVulnerabilitySkill(selectedNode, vIndex, sIndex)"
              >
                ✕
              </button>
            </div>
            <button
              class="btn btn-xs btn-secondary w-full"
              @click="addVulnerabilitySkill(selectedNode, vIndex)"
            >
              + Add Skill
            </button>
          </div>
          <button
            class="btn btn-xs btn-secondary w-full"
            @click="addVulnerability(selectedNode)"
          >
            + Add Vulnerability
          </button>
        </div>

        <!-- Countermeasures -->
        <button
          class="collapsible-header"
          @click="showCountermeasures = !showCountermeasures"
        >
          <span>Countermeasures ({{ selectedNode.countermeasures?.length || 0 }})</span>
          <span class="collapse-icon">{{ showCountermeasures ? '▼' : '▶' }}</span>
        </button>
        <div v-if="showCountermeasures" class="collapsible-content">
          <div
            v-for="(cm, cIndex) in selectedNode.countermeasures || []"
            :key="cm.id"
            class="countermeasure-item"
          >
            <div class="cm-header">
              <input
                v-model="cm.name"
                class="input"
                placeholder="Countermeasure name"
              />
              <button
                class="btn btn-xs btn-danger"
                @click="removeCountermeasure(selectedNode, cIndex)"
              >
                ✕
              </button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Failures</label>
                <input
                  v-model.number="cm.failureThreshold"
                  type="number"
                  min="1"
                  max="10"
                  class="input"
                  title="Triggers after this many failures"
                />
              </div>
              <div class="form-group">
                <label>Notice DC</label>
                <input
                  v-model.number="cm.noticeDC"
                  type="number"
                  class="input"
                  placeholder="—"
                />
              </div>
            </div>
            <div class="form-group">
              <label>Notice Skills</label>
              <div class="notice-skills-row">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="cm.noticeSkills?.includes('Computers')"
                    @change="toggleNoticeSkill(selectedNode, cIndex, 'Computers')"
                  />
                  Computers
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="cm.noticeSkills?.includes('Perception')"
                    @change="toggleNoticeSkill(selectedNode, cIndex, 'Perception')"
                  />
                  Perception
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="cm.noticeSkills?.includes('Crafting')"
                    @change="toggleNoticeSkill(selectedNode, cIndex, 'Crafting')"
                  />
                  Crafting
                </label>
              </div>
            </div>
            <label class="sub-label">Disable Skills:</label>
            <div
              v-for="(skill, sIndex) in cm.disableSkills"
              :key="sIndex"
              class="skill-row"
            >
              <input
                v-model="skill.skill"
                class="input skill-input"
                placeholder="Skill"
              />
              <input
                v-model.number="skill.dc"
                type="number"
                class="input dc-input"
                placeholder="DC"
              />
              <button
                class="btn btn-xs btn-danger"
                @click="removeDisableSkill(selectedNode, cIndex, sIndex)"
              >
                ✕
              </button>
            </div>
            <button
              class="btn btn-xs btn-secondary w-full"
              @click="addDisableSkill(selectedNode, cIndex)"
            >
              + Add Disable Skill
            </button>
            <div class="form-group">
              <label>Effect Description</label>
              <textarea
                v-model="cm.description"
                class="input description-textarea"
                placeholder="What happens when triggered..."
                rows="2"
              ></textarea>
            </div>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="cm.isPersistent"
              />
              Persistent (triggers each round)
            </label>
          </div>
          <button
            class="btn btn-xs btn-secondary w-full"
            @click="addCountermeasure(selectedNode)"
          >
            + Add Countermeasure
          </button>
        </div>

        <div class="form-group">
          <label>GM Notes</label>
          <textarea
            v-model="selectedNode.notes"
            class="input notes-textarea"
            placeholder="Effects when breached/alarmed..."
            rows="3"
          ></textarea>
        </div>

        <div v-if="selectedNode.connectedTo.length > 0" class="connections-list">
          <label>Connections</label>
          <div
            v-for="connId in selectedNode.connectedTo"
            :key="connId"
            class="connection-item"
          >
            <span>{{ accessPoints.find(ap => ap.id === connId)?.name }}</span>
            <button
              class="btn btn-xs btn-danger"
              @click="disconnectNodes(selectedNode.id, connId)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <hr class="divider" />

      <div class="sidebar-section">
        <button class="btn btn-primary w-full" @click="emit('close')">
          Done Editing
        </button>
      </div>
    </div>

    <!-- Canvas Area -->
    <div class="editor-canvas">
      <canvas
        ref="canvasRef"
        @click="handleCanvasClick"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.computer-editor {
  display: flex;
  height: 100%;
  gap: 1rem;
}

.editor-sidebar {
  width: 280px;
  flex-shrink: 0;
  padding: 1rem;
  overflow-y: auto;
}

.editor-canvas {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.editor-canvas canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.sidebar-section {
  margin-bottom: 1rem;
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-row {
  display: flex;
  gap: 0.5rem;
}

.form-row .form-group {
  flex: 1;
}

.notes-textarea,
.description-textarea {
  resize: vertical;
  min-height: 3rem;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.collapsible-header:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
  color: var(--color-text);
}

.collapse-icon {
  font-size: 0.6rem;
  color: var(--color-text-muted);
}

.collapsible-content {
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.skill-row {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  align-items: center;
}

.skill-input {
  flex: 1;
}

.dc-input {
  width: 60px;
  flex-shrink: 0;
}

.vulnerability-item,
.countermeasure-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.vuln-header,
.cm-header {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.vuln-header .input,
.cm-header .input {
  flex: 1;
}

.sub-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  margin-bottom: 0.375rem;
  margin-top: 0.5rem;
}

.notice-skills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--color-accent);
}

/* Hide number input spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1rem 0;
}

.mode-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
  color: var(--color-text);
}

.mode-btn.active {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.selected-node-info {
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  margin-bottom: 0.75rem;
}

.node-name {
  font-weight: 600;
  color: var(--color-text);
}

.node-meta {
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  text-transform: capitalize;
}

.connections-list {
  margin-top: 0.75rem;
}

.connections-list label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.connection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  margin-bottom: 0.25rem;
  font-size: var(--text-sm);
}

.w-full {
  width: 100%;
}

.state-select-editor.select-breached {
  border-color: var(--color-success);
  color: var(--color-success);
}

.state-select-editor.select-alarmed {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.state-select-editor.select-active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.state-select-editor.select-locked {
  color: var(--color-text-dim);
}
</style>
