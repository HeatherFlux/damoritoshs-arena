// Hacking Encounter Types for SF2e

export type ComputerType = 'tech' | 'magic' | 'hybrid'
export type AccessPointType = 'physical' | 'remote' | 'magical'
export type NodeState = 'locked' | 'active' | 'breached' | 'alarmed'
export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'

export interface Position {
  x: number  // 0-1 normalized
  y: number  // 0-1 normalized
}

// Skill check with DC and optional proficiency requirement
export interface SkillCheck {
  skill: string          // e.g., "Computers", "Arcana", "Deception"
  dc: number
  proficiency?: ProficiencyRank  // Minimum proficiency required
}

// Vulnerability that can lower the hacking DC
export interface Vulnerability {
  id: string
  name: string           // e.g., "Deduce username", "Bribe server admin"
  skills: SkillCheck[]   // Skills that can exploit this vulnerability
  dcReduction: number    // How much it lowers the access point's DC (1-3)
}

// Countermeasure that triggers on failures
export interface Countermeasure {
  id: string
  name: string           // e.g., "Account locked", "Alarm triggered"
  failureThreshold: number  // Number of failures to trigger (e.g., 2)
  noticeDC?: number      // DC to notice before triggering
  noticeSkills?: string[]  // Skills to notice (e.g., ["Perception", "Computers"])
  disableSkills: SkillCheck[]  // Skills/DCs to disable
  description: string    // What happens when triggered
  isPersistent?: boolean // If true, triggers each round until disabled
}

export interface AccessPoint {
  id: string
  name: string
  type: AccessPointType
  state: NodeState
  position: Position
  connectedTo: string[]  // IDs of connected access points

  // Primary hacking DC for this node
  dc?: number

  // SF2e stat block fields
  successesRequired?: number  // Number of successes to hack (default 1)
  hackSkills?: SkillCheck[]   // Skills/DCs to hack this access point
  vulnerabilities?: Vulnerability[]
  countermeasures?: Countermeasure[]
  currentFailures?: number    // Track failures toward countermeasure threshold

  // GM notes for effects when breached/alarmed
  notes?: string
}

export interface Computer {
  id: string
  name: string
  level: number
  type: ComputerType
  description?: string
  accessPoints: AccessPoint[]

  // SF2e outcome descriptions
  successDescription?: string       // What players get on success
  criticalSuccessDescription?: string  // Bonus for crit success
  failureDescription?: string       // What happens on failure
}

// Effect Types
export type HackingEffectType =
  | 'breach'           // Access point successfully breached
  | 'alarm'            // Countermeasure triggered - alarm
  | 'vulnerability'    // Vulnerability exploited - DC lowered
  | 'countermeasure'   // ICE/countermeasure activated
  | 'lockout'          // System lockout - hack failed
  | 'success'          // Full system breach - victory
  | 'data-extract'     // Pulled data from system
  | 'scan'             // Scanning for vulnerabilities
  | 'trace'            // System tracing hacker location
  | 'pulse'            // Generic node pulse

export interface HackingEffect {
  id: string
  type: HackingEffectType
  targetNodeId?: string
  startTime: number
  duration: number
  intensity?: number
}

export const HACKING_EFFECT_DURATIONS: Record<HackingEffectType, number> = {
  breach: 2000,
  alarm: 2000,
  vulnerability: 1500,
  countermeasure: 2000,
  lockout: 2000,
  success: 2000,
  'data-extract': 2000,
  scan: 1000,
  trace: 2000,
  pulse: 2000
}

export function createHackingEffect(type: HackingEffectType, targetNodeId?: string): HackingEffect {
  return {
    id: crypto.randomUUID(),
    type,
    targetNodeId,
    startTime: Date.now(),
    duration: HACKING_EFFECT_DURATIONS[type],
    intensity: 1
  }
}

// Saved encounter interface
export interface SavedHackingEncounter {
  id: string
  name: string
  computer: Computer
  savedAt: number
}

// Default sample computer for testing - matches SF2e Zo! Media Server example
export function createSampleComputer(): Computer {
  return {
    id: crypto.randomUUID(),
    name: 'Zo! Media Server',
    level: 4,
    type: 'tech',
    description: 'This server contains unreleased information and trailers on upcoming Zo! Media shows.',
    successDescription: "You get access to Zo!'s schedule for the next week, which features a number of planned tapings with a series title that has been blacked out.",
    criticalSuccessDescription: "You gain access to all production schedules, financials, and personnel files, giving you a +2 circumstance bonus to Deception checks to Impersonate, Intimidation checks to Coerce, and Survival checks to Track a Zo! media employee for 1 week.",
    accessPoints: [
      {
        id: 'ap-1',
        name: "Zo!'s Personal Account",
        type: 'physical',
        dc: 25,
        state: 'locked',
        position: { x: 0.25, y: 0.35 },
        connectedTo: ['ap-2'],
        successesRequired: 1,
        hackSkills: [
          { skill: 'Computers', dc: 25, proficiency: 'trained' }
        ],
        vulnerabilities: [
          {
            id: 'v1',
            name: 'Deduce username',
            skills: [
              { skill: 'Performance', dc: 18 },
              { skill: 'Society', dc: 18 }
            ],
            dcReduction: 1
          },
          {
            id: 'v2',
            name: 'Call assistant for password',
            skills: [
              { skill: 'Deception', dc: 22 },
              { skill: 'Diplomacy', dc: 22 }
            ],
            dcReduction: 2
          },
          {
            id: 'v3',
            name: 'Clone or steal comm unit',
            skills: [
              { skill: 'Crafting', dc: 25 },
              { skill: 'Thievery', dc: 25 }
            ],
            dcReduction: 3
          }
        ],
        countermeasures: [
          {
            id: 'c1',
            name: 'Account blocked',
            failureThreshold: 2,
            noticeDC: 16,
            noticeSkills: ['Computers', 'Perception'],
            disableSkills: [
              { skill: 'Deception', dc: 22 },
              { skill: 'Intimidation', dc: 22 }
            ],
            description: "The account is blocked, and Zo's Personal Account can't be used."
          }
        ]
      },
      {
        id: 'ap-2',
        name: 'Unpatched Backdoor',
        type: 'remote',
        dc: 22,
        state: 'locked',
        position: { x: 0.7, y: 0.55 },
        connectedTo: ['ap-1'],
        successesRequired: 2,
        hackSkills: [
          { skill: 'Computers', dc: 22, proficiency: 'trained' }
        ],
        vulnerabilities: [
          {
            id: 'v4',
            name: 'Program script or find Zo! fan to program',
            skills: [
              { skill: 'Computers', dc: 22 },
              { skill: 'Society', dc: 22 }
            ],
            dcReduction: 2
          },
          {
            id: 'v5',
            name: 'Bribe or threaten server admin',
            skills: [
              { skill: 'Diplomacy', dc: 25 },
              { skill: 'Intimidation', dc: 25 }
            ],
            dcReduction: 3
          }
        ],
        countermeasures: [
          {
            id: 'c2',
            name: 'Data deletion',
            failureThreshold: 3,
            noticeDC: 20,
            noticeSkills: ['Crafting'],
            disableSkills: [
              { skill: 'Computers', dc: 24 },
              { skill: 'Crafting', dc: 24 }
            ],
            description: 'The information is deleted, resulting in no benefit for Success.'
          }
        ]
      }
    ]
  }
}
