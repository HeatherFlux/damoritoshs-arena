import type { Computer, AccessPoint, ComputerType, AccessPointType } from '../types/hacking'

// Starfinder-themed word lists
const COMPUTER_PREFIXES = [
  'Stellar', 'Quantum', 'Neural', 'Cyber', 'Void', 'Drift', 'Aeon',
  'Plasma', 'Ion', 'Nexus', 'Core', 'Prime', 'Shadow', 'Ghost',
  'Vesk', 'Azlanti', 'Eoxian', 'Kasathan', 'Shirren', 'Lashunta',
  'Veskarium', 'Pact', 'Corpse', 'Dark', 'Steward', 'Starfinder',
  'Absalom', 'Drift', 'Hyperspace', 'Akiton', 'Verces', 'Aballon'
]

const COMPUTER_TYPES_NAMES = [
  'Mainframe', 'Terminal', 'Core', 'Hub', 'Node', 'Matrix', 'Grid',
  'Server', 'Nexus', 'Archive', 'Databank', 'Interface', 'Cortex',
  'Module', 'Array', 'Cluster', 'Network', 'System', 'Unit', 'Engine'
]

const COMPUTER_SUFFIXES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Zero',
  'One', 'X', 'MK-II', 'MK-III', 'V7', 'X9', '2.0', '3.1', 'Plus'
]

// Node name components by type
const NODE_NAMES = {
  physical: {
    prefixes: ['Access', 'Console', 'Terminal', 'Port', 'Jack', 'Panel', 'Deck', 'Station'],
    suffixes: ['A', 'B', 'C', 'Primary', 'Secondary', 'Main', 'Aux', 'Backup', '01', '02', '03']
  },
  remote: {
    prefixes: ['Wireless', 'Remote', 'Cloud', 'Drift', 'Satellite', 'Orbital', 'Signal', 'Broadcast'],
    suffixes: ['Link', 'Relay', 'Node', 'Gateway', 'Bridge', 'Beacon', 'Uplink', 'Channel']
  },
  magical: {
    prefixes: ['Arcane', 'Mystic', 'Eldritch', 'Runic', 'Thaumic', 'Aether', 'Spirit', 'Psionic'],
    suffixes: ['Conduit', 'Nexus', 'Focus', 'Anchor', 'Sigil', 'Matrix', 'Core', 'Weave']
  }
}

// Descriptive modifiers for node names
const NODE_MODIFIERS = [
  'Primary', 'Secondary', 'Tertiary', 'Hidden', 'Secured', 'Open', 'Encrypted',
  'Public', 'Private', 'Admin', 'Root', 'Guest', 'Executive', 'Engineering',
  'Medical', 'Security', 'Cargo', 'Bridge', 'Engine', 'Weapons', 'Comms', 'Life Support'
]

// Purpose-based node names
const NODE_PURPOSES = [
  'Data Storage', 'Comms Hub', 'Security Grid', 'Life Support', 'Navigation',
  'Weapons Control', 'Engine Core', 'Shield Matrix', 'Cargo Manifest',
  'Personnel Records', 'Financial Logs', 'Sensor Array', 'AI Core',
  'Backup Systems', 'Emergency Override', 'Captain\'s Log', 'Crew Quarters',
  'Medical Bay', 'Research Lab', 'Armory Access', 'Docking Controls'
]

// Utility functions
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a random computer name
export function generateComputerName(): string {
  const style = Math.random()

  if (style < 0.3) {
    return `${pick(COMPUTER_PREFIXES)} ${pick(COMPUTER_TYPES_NAMES)}`
  } else if (style < 0.6) {
    return `${pick(COMPUTER_PREFIXES)} ${pick(COMPUTER_TYPES_NAMES)} ${pick(COMPUTER_SUFFIXES)}`
  } else if (style < 0.8) {
    return `${pick(COMPUTER_TYPES_NAMES)} ${pick(COMPUTER_SUFFIXES)}`
  } else {
    return `${pick(COMPUTER_PREFIXES)}-${pick(COMPUTER_PREFIXES)} ${pick(COMPUTER_TYPES_NAMES)}`
  }
}

// Generate a random node name based on type
export function generateNodeName(type: AccessPointType, _index: number): string {
  const style = Math.random()
  const typeNames = NODE_NAMES[type]

  if (style < 0.4) {
    return `${pick(typeNames.prefixes)} ${pick(typeNames.suffixes)}`
  } else if (style < 0.7) {
    return `${pick(NODE_MODIFIERS)} ${pick(typeNames.prefixes)}`
  } else {
    return pick(NODE_PURPOSES)
  }
}

// Generate node positions in an interesting layout
function generateNodePositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const layouts = ['grid', 'ring', 'star', 'cascade']
  const layout = pick(layouts)

  switch (layout) {
    case 'ring': {
      const hasCenter = count >= 4 && Math.random() > 0.5
      const ringCount = hasCenter ? count - 1 : count

      if (hasCenter) {
        positions.push({ x: 0.5, y: 0.5 })
      }

      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2 - Math.PI / 2
        const radius = 0.32
        positions.push({
          x: 0.5 + Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius
        })
      }
      break
    }

    case 'star': {
      positions.push({ x: 0.5, y: 0.5 })

      for (let i = 1; i < count; i++) {
        const angle = ((i - 1) / (count - 1)) * Math.PI * 2 - Math.PI / 2
        const radius = 0.28 + Math.random() * 0.1
        positions.push({
          x: 0.5 + Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius
        })
      }
      break
    }

    case 'cascade': {
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 3)
        const col = i % 3
        const jitter = () => (Math.random() - 0.5) * 0.08
        positions.push({
          x: 0.2 + col * 0.3 + jitter(),
          y: 0.2 + row * 0.25 + jitter()
        })
      }
      break
    }

    case 'grid':
    default: {
      const cols = count <= 4 ? 2 : 3
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const jitter = () => (Math.random() - 0.5) * 0.1
        positions.push({
          x: 0.25 + col * 0.25 + jitter(),
          y: 0.25 + row * 0.25 + jitter()
        })
      }
      break
    }
  }

  return positions.map(p => ({
    x: Math.max(0.1, Math.min(0.9, p.x)),
    y: Math.max(0.1, Math.min(0.9, p.y))
  }))
}

// Generate connections between nodes
function generateConnections(nodeCount: number): Map<number, number[]> {
  const connections = new Map<number, number[]>()

  for (let i = 0; i < nodeCount; i++) {
    connections.set(i, [])
  }

  const patterns = ['chain', 'mesh', 'hub', 'tree']
  const pattern = pick(patterns)

  switch (pattern) {
    case 'chain': {
      for (let i = 0; i < nodeCount - 1; i++) {
        connections.get(i)!.push(i + 1)
        connections.get(i + 1)!.push(i)
      }
      const crossLinks = randomInt(1, 2)
      for (let c = 0; c < crossLinks; c++) {
        const from = randomInt(0, nodeCount - 1)
        const to = randomInt(0, nodeCount - 1)
        if (from !== to && !connections.get(from)!.includes(to)) {
          connections.get(from)!.push(to)
          connections.get(to)!.push(from)
        }
      }
      break
    }

    case 'mesh': {
      for (let i = 0; i < nodeCount; i++) {
        const targetConnections = randomInt(2, 3)
        while (connections.get(i)!.length < targetConnections) {
          const target = randomInt(0, nodeCount - 1)
          if (target !== i && !connections.get(i)!.includes(target)) {
            connections.get(i)!.push(target)
            connections.get(target)!.push(i)
          }
        }
      }
      break
    }

    case 'hub': {
      for (let i = 1; i < nodeCount; i++) {
        connections.get(0)!.push(i)
        connections.get(i)!.push(0)
      }
      const extras = randomInt(1, 3)
      for (let e = 0; e < extras; e++) {
        const from = randomInt(1, nodeCount - 1)
        const to = randomInt(1, nodeCount - 1)
        if (from !== to && !connections.get(from)!.includes(to)) {
          connections.get(from)!.push(to)
          connections.get(to)!.push(from)
        }
      }
      break
    }

    case 'tree':
    default: {
      for (let i = 1; i < nodeCount; i++) {
        const parent = randomInt(0, i - 1)
        connections.get(parent)!.push(i)
        connections.get(i)!.push(parent)
      }
      break
    }
  }

  return connections
}

// DC by level table (PF2e/SF2e standard)
const DC_BY_LEVEL: Record<number, number> = {
  0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
  6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
  11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
  16: 35, 17: 36, 18: 38, 19: 39, 20: 40
}

function getDCForLevel(level: number): number {
  const clampedLevel = Math.max(0, Math.min(20, level))
  return DC_BY_LEVEL[clampedLevel] ?? 15
}

// Main generator function
export interface GeneratorOptions {
  nodeCount?: number
  level?: number        // Computer level (for display)
  partyLevel?: number   // Party level (for DC calculation)
  type?: ComputerType
  name?: string
}

export function generateRandomComputer(options: GeneratorOptions = {}): Computer {
  const nodeCount = options.nodeCount ?? randomInt(5, 6)
  const partyLevel = options.partyLevel ?? options.level ?? randomInt(1, 10)
  const level = options.level ?? partyLevel
  const type = options.type ?? pick(['tech', 'magic', 'hybrid'] as ComputerType[])
  const name = options.name ?? generateComputerName()

  // Base DC from party level
  const baseDC = getDCForLevel(partyLevel)

  const positions = generateNodePositions(nodeCount)
  const connectionMap = generateConnections(nodeCount)

  const getNodeType = (): AccessPointType => {
    if (type === 'tech') {
      return Math.random() < 0.7 ? pick(['physical', 'remote']) : 'magical'
    } else if (type === 'magic') {
      return Math.random() < 0.7 ? 'magical' : pick(['physical', 'remote'])
    } else {
      return pick(['physical', 'remote', 'magical'])
    }
  }

  const accessPoints: AccessPoint[] = []
  const usedNames = new Set<string>()

  for (let i = 0; i < nodeCount; i++) {
    const nodeType = getNodeType()

    let nodeName = generateNodeName(nodeType, i)
    let attempts = 0
    while (usedNames.has(nodeName) && attempts < 10) {
      nodeName = generateNodeName(nodeType, i)
      attempts++
    }
    usedNames.add(nodeName)

    const nodeId = `ap-${Date.now()}-${i}`

    // Vary DC slightly per node (-2 to +2)
    const dcVariation = randomInt(-2, 2)
    const nodeDC = baseDC + dcVariation

    accessPoints.push({
      id: nodeId,
      name: nodeName,
      type: nodeType,
      state: 'locked',
      position: positions[i]!,
      connectedTo: [],
      dc: nodeDC
    })
  }

  for (let i = 0; i < nodeCount; i++) {
    const nodeConnections = connectionMap.get(i) || []
    accessPoints[i]!.connectedTo = nodeConnections
      .map(idx => accessPoints[idx]?.id)
      .filter((id): id is string => id !== undefined)
  }

  return {
    id: crypto.randomUUID(),
    name,
    level,
    type,
    accessPoints
  }
}

export function generateQuickComputer(): Computer {
  return generateRandomComputer({
    nodeCount: randomInt(4, 6),
    level: randomInt(1, 10)
  })
}
