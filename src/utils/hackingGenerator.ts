import type { Computer, AccessPoint, ComputerType, AccessPointType, SkillCheck, Vulnerability, Countermeasure } from '../types/hacking'
import { getDCForLevel } from './dcTable'

// Starfinder-themed word lists

// Factions, corporations, and organizations
const COMPUTER_FACTIONS = [
  'AbadarCorp', 'Zo!', 'Steward', 'Starfinder', 'Hellknight', 'Aspis',
  'Azlanti', 'Veskarium', 'Pact Worlds', 'Corpse Fleet', 'Free Captains',
  'Xenowarden', 'Android Abolitionist', 'Augmented', 'Starstone'
]

// Planets and locations
const COMPUTER_LOCATIONS = [
  'Absalom', 'Akiton', 'Verces', 'Aballon', 'Eox', 'Castrovel', 'Triaxus',
  'Bretheda', 'Apostae', 'Diaspora', 'Idari', 'Drift', 'Liavara', 'Preluria'
]

// Tech/sci-fi prefixes
const COMPUTER_TECH_PREFIXES = [
  'Stellar', 'Quantum', 'Neural', 'Cyber', 'Void', 'Drift', 'Aeon',
  'Plasma', 'Ion', 'Nexus', 'Core', 'Prime', 'Shadow', 'Ghost',
  'Hyperspace', 'Infosphere', 'Holographic', 'Encrypted', 'Orbital',
  'Satellite', 'Gravitic', 'Photonic', 'Subspace', 'Tachyon'
]

// Magic prefixes for hybrid/magic computers
const COMPUTER_MAGIC_PREFIXES = [
  'Arcane', 'Mystic', 'Thaumic', 'Eldritch', 'Runic', 'Aetheric',
  'First World', 'Planar', 'Divine', 'Occult', 'Psionic', 'Bound',
  'Interdimensional', 'Spirit', 'Aeon Stone', 'Spell Chip'
]

const COMPUTER_PREFIXES = [
  ...COMPUTER_FACTIONS,
  ...COMPUTER_LOCATIONS,
  ...COMPUTER_TECH_PREFIXES
]

const COMPUTER_TYPES_NAMES = [
  'Mainframe', 'Terminal', 'Core', 'Hub', 'Node', 'Matrix', 'Grid',
  'Server', 'Nexus', 'Archive', 'Databank', 'Interface', 'Cortex',
  'Module', 'Array', 'Cluster', 'Network', 'System', 'Unit', 'Engine',
  'Database', 'Account', 'Console', 'Relay', 'Uplink', 'Gateway'
]

const COMPUTER_SUFFIXES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Zero',
  'One', 'X', 'MK-II', 'MK-III', 'V7', 'X9', '2.0', '3.1', 'Plus',
  'Secure', 'Encrypted', 'Pro', 'Enterprise', 'Military'
]

// Node name components by type
const NODE_NAMES = {
  physical: {
    prefixes: ['Access', 'Console', 'Terminal', 'Port', 'Jack', 'Panel', 'Deck', 'Station',
               'Dongle', 'Autopilot', 'Comm Unit', 'Credstick', 'Keypad', 'Biometric'],
    suffixes: ['A', 'B', 'C', 'Primary', 'Secondary', 'Main', 'Aux', 'Backup', '01', '02', '03',
               'Alpha', 'Beta', 'Override', 'Emergency']
  },
  remote: {
    prefixes: ['Wireless', 'Remote', 'Cloud', 'Drift', 'Satellite', 'Orbital', 'Signal', 'Broadcast',
               'Infosphere', 'Cross-Site', 'Backdoor', 'Unpatched', 'Phishing', 'Keylogger'],
    suffixes: ['Link', 'Relay', 'Node', 'Gateway', 'Bridge', 'Beacon', 'Uplink', 'Channel',
               'Attack', 'Vector', 'Exploit', 'Vulnerability']
  },
  magical: {
    prefixes: ['Arcane', 'Mystic', 'Eldritch', 'Runic', 'Thaumic', 'Aether', 'Spirit', 'Psionic',
               'Attunement', 'Ritual', 'Aeon Stone', 'Machine Spirit', 'Divination', 'Magitech'],
    suffixes: ['Conduit', 'Nexus', 'Focus', 'Anchor', 'Sigil', 'Matrix', 'Core', 'Weave',
               'Crystal', 'Barrier', 'Ward', 'Binding']
  }
}

// Descriptive modifiers for node names
const NODE_MODIFIERS = [
  'Primary', 'Secondary', 'Tertiary', 'Hidden', 'Secured', 'Open', 'Encrypted',
  'Public', 'Private', 'Admin', 'Root', 'Guest', 'Executive', 'Engineering',
  'Medical', 'Security', 'Cargo', 'Bridge', 'Engine', 'Weapons', 'Comms', 'Life Support',
  'Personal', 'Corporate', 'Military', 'Classified', 'Restricted', 'Customer'
]

// Purpose-based node names (inspired by GM Core examples)
const NODE_PURPOSES = [
  // Standard starship/station systems
  'Data Storage', 'Comms Hub', 'Security Grid', 'Life Support', 'Navigation',
  'Weapons Control', 'Engine Core', 'Shield Matrix', 'Cargo Manifest',
  'Personnel Records', 'Financial Logs', 'Sensor Array', 'AI Core',
  'Backup Systems', 'Emergency Override', 'Captain\'s Log', 'Crew Quarters',
  'Medical Bay', 'Research Lab', 'Armory Access', 'Docking Controls',
  // Corporate/account systems (from AbadarCorp example)
  'Customer Database', 'Payment Processing', 'Account Records', 'Order History',
  'Employee Directory', 'Investor Portal', 'Compliance Logs', 'Audit Trail',
  // Media/entertainment (from Zo! example)
  'Production Schedules', 'Unreleased Content', 'Personnel Files', 'Show Archives',
  'Talent Contracts', 'Broadcast Queue', 'Media Library', 'Rating Analytics',
  // Prison/security (from Azlanti example)
  'Door Controls', 'Sentry Turrets', 'Alarm Systems', 'Prisoner Records',
  'Guard Schedules', 'Lockdown Protocol', 'Surveillance Feeds', 'Cell Blocks',
  // Misc systems
  'Autopilot Module', 'Gravtrain Controls', 'Server Farm', 'Credstick Access',
  'Two-Factor Auth', 'Password Vault', 'Encryption Keys', 'Backup Server'
]

// Sample vulnerability templates from GM Core
export const VULNERABILITY_TEMPLATES = [
  // Social engineering
  { name: 'Deduce username or password', skills: ['Perception', 'Society', 'Lore'] },
  { name: 'Call customer service for access', skills: ['Deception', 'Diplomacy'] },
  { name: 'Pretend to be investor or regulator', skills: ['Deception', 'Lore'] },
  { name: 'Bribe or threaten administrator', skills: ['Diplomacy', 'Intimidation'] },
  { name: 'Find traces of another hacker', skills: ['Diplomacy', 'Society'] },
  // Technical exploits
  { name: 'Steal or spoof two-factor auth device', skills: ['Crafting', 'Thievery'] },
  { name: 'Program keylogger in media file', skills: ['Computers', 'Performance'] },
  { name: 'Create fake site to phish password', skills: ['Computers', 'Society'] },
  { name: 'Clone or steal comm unit', skills: ['Crafting', 'Thievery'] },
  { name: 'Denial-of-service attack', skills: ['Computers', 'Performance'] },
  { name: 'Jury-rig electromagnetic winch', skills: ['Crafting', 'Piloting'] },
  // Physical access
  { name: 'Survey outside to find buried cable', skills: ['Nature', 'Survival'] },
  { name: 'Join cleaning crew for building access', skills: ['Deception', 'Society'] },
  { name: 'Steal comm unit from employee', skills: ['Stealth', 'Thievery'] },
  { name: 'Scale communication tower', skills: ['Acrobatics', 'Athletics'] },
  { name: 'Retrieve data from gravtrain autopilot', skills: ['Acrobatics', 'Piloting'] },
  { name: 'Fake fingerprint authentication', skills: ['Deception', 'Medicine'] },
  // Magical approaches
  { name: 'Cast ritual to access magitech', skills: ['Arcana', 'Nature', 'Occultism', 'Religion'] },
  { name: 'Use divination for password', skills: ['Occultism', 'Religion'] },
  { name: 'Phreak server with arcane whistle', skills: ['Crafting', 'Performance'] },
  // Fun/unusual
  { name: 'Play vidgame to find hidden zone', skills: ['Piloting', 'Lore'] },
  { name: 'Rally other hackers to aid', skills: ['Diplomacy', 'Performance'] }
]

// Sample countermeasure templates from GM Core
export const COUNTERMEASURE_TEMPLATES = [
  // Account/access denial
  { name: 'Account banned or locked', noticeSkills: ['Computers', 'Perception'], disableSkills: ['Deception', 'Intimidation'] },
  { name: 'Account blocked until identity verified', noticeSkills: ['Perception'], disableSkills: ['Crafting', 'Thievery', 'Lore'] },
  { name: 'Account blocked until in-person visit', noticeSkills: ['Computers', 'Perception'], disableSkills: ['Computers', 'Deception'] },
  // Deception/misdirection
  { name: 'Misleading information planted', noticeSkills: ['Computers', 'Crafting', 'Perception'], disableSkills: ['Stealth', 'Thievery'] },
  { name: 'Files deleted or corrupted', noticeSkills: ['Society', 'Survival'], disableSkills: ['Computers', 'Crafting'] },
  // Alerts and tracking
  { name: 'Admin notices and blocks access', noticeSkills: ['Perception'], disableSkills: ['Computers', 'Diplomacy', 'Intimidation'] },
  { name: 'Alarm triggered, authorities notified', noticeSkills: ['Computers', 'Perception'], disableSkills: ['Stealth', 'Thievery'] },
  { name: 'Security guard asks for ID', noticeSkills: ['Perception'], disableSkills: ['Deception', 'Stealth'] },
  { name: 'Hellknight hacker tracks your location', noticeSkills: ['Society'], disableSkills: ['Stealth', 'Survival'] },
  { name: 'Admin threatens to report you', noticeSkills: ['Perception'], disableSkills: ['Deception', 'Diplomacy', 'Intimidation'] },
  // Technical countermeasures
  { name: 'Counter-scam drains credits', noticeSkills: ['Computers'], disableSkills: ['Thievery', 'Computers'], isPersistent: true },
  { name: 'EMP takes out entire database', noticeSkills: ['Perception'], disableSkills: ['Athletics', 'Thievery'] },
  { name: 'Need dongle or comm unit to authorize', noticeSkills: ['Perception'], disableSkills: ['Crafting', 'Thievery', 'Lore'] },
  // Magical countermeasures
  { name: 'Magitech virus flashes hypnotic visuals', noticeSkills: ['Arcana', 'Occultism'], disableSkills: ['Arcana', 'Occultism'] },
  { name: 'First World viral curse sprouts plants', noticeSkills: ['Perception'], disableSkills: ['Nature', 'Survival'] }
]

// Computer description templates
export const COMPUTER_DESCRIPTIONS = [
  'A secure database accessed via holographic interface.',
  'An encrypted server storing sensitive corporate data.',
  'A magitech console controlled by bound machine spirits.',
  'A satellite-based server with multiple redundant backups.',
  'An ancient construct commanded by programmable aeon stones.',
  'A personal comm unit with administrator access.',
  'A military-grade terminal with biometric authentication.',
  'An infosphere node connecting multiple planetary networks.',
  'A research station mainframe with classified experiment logs.',
  'A prison security system controlling doors and turrets.',
  'A media server containing unreleased entertainment content.',
  'A financial database with encrypted customer records.',
  'An autopilot module mounted on a high-speed gravtrain.',
  'A spell chip archive protected by arcane barriers.',
  'An interdimensional data store accessed through lucid dreaming.'
]

// Utility functions
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate a random computer name based on type
export function generateComputerName(type?: ComputerType): string {
  const style = Math.random()

  // Select appropriate prefix pool based on computer type
  const prefixes = type === 'magic' ? COMPUTER_MAGIC_PREFIXES :
                   type === 'hybrid' ? [...COMPUTER_TECH_PREFIXES, ...COMPUTER_MAGIC_PREFIXES] :
                   COMPUTER_PREFIXES

  if (style < 0.3) {
    return `${pick(prefixes)} ${pick(COMPUTER_TYPES_NAMES)}`
  } else if (style < 0.6) {
    return `${pick(prefixes)} ${pick(COMPUTER_TYPES_NAMES)} ${pick(COMPUTER_SUFFIXES)}`
  } else if (style < 0.8) {
    return `${pick(COMPUTER_TYPES_NAMES)} ${pick(COMPUTER_SUFFIXES)}`
  } else {
    return `${pick(prefixes)}-${pick(prefixes)} ${pick(COMPUTER_TYPES_NAMES)}`
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

// Generate hack skills for a node
function generateHackSkills(nodeType: AccessPointType, computerType: ComputerType, baseDC: number): SkillCheck[] {
  const skills: SkillCheck[] = []

  // Primary skill is always Computers for tech, varies for magic
  if (computerType === 'magic') {
    skills.push({ skill: pick(['Arcana', 'Occultism']), dc: baseDC, proficiency: 'trained' })
  } else if (computerType === 'hybrid') {
    skills.push({ skill: 'Computers', dc: baseDC, proficiency: 'trained' })
    if (Math.random() < 0.5) {
      skills.push({ skill: pick(['Arcana', 'Occultism']), dc: baseDC + 2, proficiency: 'trained' })
    }
  } else {
    skills.push({ skill: 'Computers', dc: baseDC, proficiency: 'trained' })
  }

  // Sometimes add alternative skill based on node type
  if (Math.random() < 0.3) {
    const altSkill = nodeType === 'magical' ? pick(['Arcana', 'Occultism', 'Religion']) :
                     nodeType === 'physical' ? pick(['Crafting', 'Engineering']) :
                     pick(['Society', 'Deception'])
    if (!skills.some(s => s.skill === altSkill)) {
      skills.push({ skill: altSkill, dc: baseDC + 2 })
    }
  }

  return skills
}

// Generate vulnerabilities for a node
function generateVulnerabilities(baseDC: number, count: number): Vulnerability[] {
  if (count === 0) return []

  const vulnerabilities: Vulnerability[] = []
  const usedTemplates = new Set<number>()

  for (let i = 0; i < count; i++) {
    let templateIndex: number
    let attempts = 0
    do {
      templateIndex = randomInt(0, VULNERABILITY_TEMPLATES.length - 1)
      attempts++
    } while (usedTemplates.has(templateIndex) && attempts < 10)

    usedTemplates.add(templateIndex)
    const template = VULNERABILITY_TEMPLATES[templateIndex]!

    // DC reduction increases with each vulnerability (1, 2, 3)
    const dcReduction = i + 1
    // Vulnerability DC is lower than base (easier to find/exploit)
    const vulnDC = baseDC - 2 - i * 2

    vulnerabilities.push({
      id: `v-${Date.now()}-${i}`,
      name: template.name,
      skills: template.skills.slice(0, 2).map(skill => ({ skill, dc: vulnDC })),
      dcReduction
    })
  }

  return vulnerabilities
}

// Generate countermeasures for a node
function generateCountermeasures(baseDC: number, count: number): Countermeasure[] {
  if (count === 0) return []

  const countermeasures: Countermeasure[] = []
  const usedTemplates = new Set<number>()

  for (let i = 0; i < count; i++) {
    let templateIndex: number
    let attempts = 0
    do {
      templateIndex = randomInt(0, COUNTERMEASURE_TEMPLATES.length - 1)
      attempts++
    } while (usedTemplates.has(templateIndex) && attempts < 10)

    usedTemplates.add(templateIndex)
    const template = COUNTERMEASURE_TEMPLATES[templateIndex]!

    // Failure threshold: 2-3 failures to trigger
    const failureThreshold = randomInt(2, 3)
    // Notice DC is lower than base
    const noticeDC = baseDC - 4
    // Disable DC is higher than base
    const disableDC = baseDC + 2

    countermeasures.push({
      id: `c-${Date.now()}-${i}`,
      name: template.name,
      failureThreshold,
      noticeDC,
      noticeSkills: template.noticeSkills,
      disableSkills: template.disableSkills.map(skill => ({ skill, dc: disableDC })),
      description: `${template.name}. The hacker must overcome this to continue.`,
      isPersistent: template.isPersistent
    })
  }

  return countermeasures
}

// Generate outcome descriptions based on computer purpose
function generateOutcomeDescriptions(): { success: string; critSuccess: string; failure: string } {
  const successTemplates = [
    'You gain access to the restricted data and can extract the information you need.',
    'The system grants you user-level access, revealing its contents.',
    'You successfully breach the security and can now manipulate the system.',
    'Access granted. You can download files and review logs.',
    'The firewall falls and the system\'s secrets are laid bare.'
  ]

  const critSuccessTemplates = [
    'You gain administrator access with full system control. +2 circumstance bonus to related skill checks for 1 week.',
    'Complete system breach. You can plant backdoors for future access and cover your tracks entirely.',
    'Root access achieved. You discover additional hidden data and gain a +2 bonus to Gather Information about this organization.',
    'Total system compromise. You can modify logs, plant false evidence, or lock out other users.',
    'Masterful hack. The system thinks you\'re a trusted admin, granting ongoing access without further checks.'
  ]

  const failureTemplates = [
    'The system locks you out and may alert security.',
    'Access denied. Your intrusion attempt has been logged.',
    'The hack fails and countermeasures activate.',
    'You\'re detected and ejected from the system.',
    'Critical failure. The system traces your location and alerts authorities.'
  ]

  return {
    success: pick(successTemplates),
    critSuccess: pick(critSuccessTemplates),
    failure: pick(failureTemplates)
  }
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
  const name = options.name ?? generateComputerName(type)

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

    // Generate advanced node properties
    const hackSkills = generateHackSkills(nodeType, type, nodeDC)

    // Successes required: usually 1, sometimes 2 for important nodes
    const successesRequired = (i === 0 || Math.random() < 0.3) ? randomInt(1, 2) : 1

    // Vulnerabilities: 0-2 per node, more likely on later nodes
    const vulnCount = Math.random() < 0.4 ? 0 : randomInt(1, 2)
    const vulnerabilities = generateVulnerabilities(nodeDC, vulnCount)

    // Countermeasures: 0-1 per node, more likely on important nodes
    const cmCount = (i === 0 || Math.random() < 0.4) ? randomInt(0, 1) : 0
    const countermeasures = generateCountermeasures(nodeDC, cmCount)

    accessPoints.push({
      id: nodeId,
      name: nodeName,
      type: nodeType,
      state: 'locked',
      position: positions[i]!,
      connectedTo: [],
      dc: nodeDC,
      successesRequired,
      hackSkills,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
      countermeasures: countermeasures.length > 0 ? countermeasures : undefined
    })
  }

  for (let i = 0; i < nodeCount; i++) {
    const nodeConnections = connectionMap.get(i) || []
    accessPoints[i]!.connectedTo = nodeConnections
      .map(idx => accessPoints[idx]?.id)
      .filter((id): id is string => id !== undefined)
  }

  // Generate computer-level descriptions
  const description = pick(COMPUTER_DESCRIPTIONS)
  const outcomes = generateOutcomeDescriptions()

  return {
    id: crypto.randomUUID(),
    name,
    level,
    type,
    description,
    accessPoints,
    successDescription: outcomes.success,
    criticalSuccessDescription: outcomes.critSuccess,
    failureDescription: outcomes.failure
  }
}

export function generateQuickComputer(): Computer {
  return generateRandomComputer({
    nodeCount: randomInt(4, 6),
    level: randomInt(1, 10)
  })
}
