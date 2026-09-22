/**
 * Battle stations (Starfinder Tech Core pp. 178–183): grade advancement,
 * helmed bonuses, and the station actions each grade unlocks.
 */

import type { ActionCost, StationGrade, StationKind } from '../types/tsc'

export const STATION_KINDS: StationKind[] = [
  'drone console',
  'generator',
  'gunnery',
  'magic conduit',
  "pilot's console",
  'scanners',
]

export const STATION_GRADES: StationGrade[] = [
  'commercial',
  'tactical',
  'advanced',
  'superior',
  'elite',
  'ultimate',
  'paragon',
]

/**
 * Starship level at which a station reaches each grade (index-aligned with STATION_GRADES).
 * Drone console and gunnery advance on the fast track; the other four on the slow track.
 */
export const GRADE_LEVEL_TRACKS = {
  fast: [1, 2, 4, 10, 12, 16, 19],
  slow: [1, 2, 5, 8, 11, 14, 18],
} as const

export const STATION_TRACK: Record<StationKind, keyof typeof GRADE_LEVEL_TRACKS> = {
  'drone console': 'fast',
  gunnery: 'fast',
  generator: 'slow',
  'magic conduit': 'slow',
  "pilot's console": 'slow',
  scanners: 'slow',
}

export const UPGRADE_SLOTS_BY_GRADE: Record<StationGrade, number> = {
  commercial: 0,
  tactical: 1,
  advanced: 2,
  superior: 2,
  elite: 3,
  ultimate: 3,
  paragon: 4,
}

/** Item bonuses and other per-grade values a battle station grants while helmed. */
export interface HelmedBonus {
  ac?: number
  fort?: number
  ref?: number
  will?: number
  /** Increase to sensor range in zones (scanners; applies whether or not helmed). */
  sensorRange?: number
  /** Number of weapon damage dice (gunnery). */
  damageDice?: number
  /** Tracking bonus value (gunnery). */
  tracking?: number
  /** Drones the console can control (drone console). */
  drones?: number
}

/** Per-station bonus rows, index-aligned with STATION_GRADES. */
export const STATION_HELMED_BONUS: Record<StationKind, HelmedBonus[]> = {
  'drone console': [
    { drones: 1 }, { drones: 2 }, { drones: 3 }, { drones: 4 }, { drones: 4 }, { drones: 5 }, { drones: 5 },
  ],
  generator: [
    { fort: 0 }, { fort: 0 }, { fort: 0 }, { fort: 1 }, { fort: 1 }, { fort: 2 }, { fort: 3 },
  ],
  gunnery: [
    { damageDice: 1, tracking: 0 },
    { damageDice: 1, tracking: 1 },
    { damageDice: 2, tracking: 1 },
    { damageDice: 2, tracking: 2 },
    { damageDice: 3, tracking: 2 },
    { damageDice: 3, tracking: 3 },
    { damageDice: 4, tracking: 3 },
  ],
  'magic conduit': [
    { will: 0 }, { will: 0 }, { will: 0 }, { will: 1 }, { will: 1 }, { will: 2 }, { will: 3 },
  ],
  "pilot's console": [
    { ac: 0, ref: 0 }, { ac: 0, ref: 0 }, { ac: 1, ref: 0 }, { ac: 1, ref: 1 }, { ac: 2, ref: 1 }, { ac: 2, ref: 2 }, { ac: 3, ref: 3 },
  ],
  scanners: [
    { will: 0, sensorRange: 1 },
    { will: 0, sensorRange: 1 },
    { will: 0, sensorRange: 2 },
    { will: 1, sensorRange: 2 },
    { will: 1, sensorRange: 3 },
    { will: 2, sensorRange: 3 },
    { will: 3, sensorRange: 4 },
  ],
}

/** Exploration activities that grant a free action when initiative is rolled (p. 174–175). */
export interface ExplorationActivity {
  id: string
  name: string
  station: StationKind
  freeAction: string
  summary: string
}

export const TSC_EXPLORATION_ACTIVITIES: ExplorationActivity[] = [
  { id: 'fly-the-ship', name: 'Fly the Ship', station: "pilot's console", freeAction: 'Evade', summary: 'Evade as a free action when you roll initiative (+2 circumstance to AC until your first turn), and your first-turn Evade gains +1.' },
  { id: 'lock-and-load', name: 'Lock and Load', station: 'gunnery', freeAction: 'Lock On', summary: 'Lock On as a free action when you roll initiative.' },
  { id: 'power-up', name: 'Power Up', station: 'generator', freeAction: 'Boost Battle Station', summary: 'Boost Battle Station as a free action when you roll initiative.' },
  { id: 'operate-drone', name: 'Operate Drone', station: 'drone console', freeAction: 'Deploy Drone', summary: 'Deploy Drone as a free action when you roll initiative.' },
  { id: 'scan-for-magic', name: 'Scan for Magic', station: 'magic conduit', freeAction: 'Scan for Magic', summary: 'Scan for Magic at regular intervals; you never overlook a magical aura during travel.' },
  { id: 'scan-surroundings', name: 'Scan Surroundings', station: 'scanners', freeAction: 'Seek Starships, then Scan Target', summary: 'At the start of an encounter, Seek Starships and then Scan Target against one starship in sensor range.' },
]

/** A station action available to crew helming a player-starship battle station. */
export interface StationAction {
  id: string
  name: string
  /** Station that grants the action; 'any' for actions usable from several stations. */
  station: StationKind | 'any'
  /** Minimum grade of the station. */
  grade: StationGrade
  actions: ActionCost
  actionsMax?: ActionCost
  traits?: string[]
  frequency?: string
  prerequisites?: string
  requirements?: string
  trigger?: string
  summary: string
}

export const TSC_STATION_ACTIONS: StationAction[] = [
  // Drone console
  { id: 'deploy-drone', name: 'Deploy Drone', station: 'drone console', grade: 'commercial', actions: 1, traits: ['manipulate', 'station'], summary: 'Deploy a drone that is docked on your starship.' },
  { id: 'drone-block', name: 'Drone Block', station: 'drone console', grade: 'commercial', actions: 'reaction', traits: ['manipulate', 'station'], trigger: 'Your starship would be hit by a Strike.', requirements: 'You have at least one drone deployed.', summary: 'Your starship gains resistance equal to half your level against the triggering Strike; the drone is retrieved and cannot be deployed again for 10 minutes.' },
  { id: 'retrieve-drone', name: 'Retrieve Drone', station: 'drone console', grade: 'commercial', actions: 1, traits: ['manipulate', 'station'], requirements: 'You have at least one drone deployed.', summary: 'Retrieve a deployed drone, returning it to the starship.' },
  // Generator
  { id: 'boost-battle-station', name: 'Boost Battle Station', station: 'generator', grade: 'commercial', actions: 1, traits: ['manipulate', 'station'], summary: 'Station actions at a battle station of your choice gain a +1 status bonus to checks and damage rolls for 1 round.' },
  { id: 'generate-shields', name: 'Generate Shields', station: 'generator', grade: 'commercial', actions: 1, traits: ['manipulate', 'station'], summary: 'Gain 1d4 Shield Points; +1d4 at 3rd level and every 2 levels thereafter.' },
  { id: 'reposition-shield', name: 'Reposition Shield', station: 'generator', grade: 'tactical', actions: 'reaction', traits: ['manipulate', 'station'], trigger: 'Your starship is hit by a Strike.', requirements: 'Your starship has at least 1 Shield Point.', summary: 'Crafting or Perception check vs. the attacker\'s Reflex DC. Crit success: shields absorb damage up to remaining SP without consuming them. Success: up to half. Crit failure: damage goes directly to Hull Points.' },
  { id: 'vent-power', name: 'Vent Power', station: 'generator', grade: 'advanced', actions: 2, traits: ['manipulate', 'station'], frequency: 'once per round', summary: 'A starship within 0 zones takes 1d10 fire damage (basic Reflex vs. your Crafting DC); +1d10 at 6th level and every 2 levels thereafter.' },
  // Gunnery
  { id: 'lock-on', name: 'Lock On', station: 'gunnery', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], summary: 'Until the end of your turn, a target within sensor range takes −1 status to AC against your Strikes and −1 circumstance to Reflex saves against your Area Fire and Auto-Fire.' },
  { id: 'target-battle-station', name: 'Target Battle Station', station: 'gunnery', grade: 'tactical', actions: 1, traits: ['concentrate', 'incapacitation', 'manipulate', 'station'], requirements: 'You have identified one or more battle stations on the target starship.', summary: 'Your next Strike against the target before the end of your next turn: on a success that damages Hull Points the station becomes malfunctioning; on a critical success the target is also stunned 1.' },
  // Magic conduit
  { id: 'counter-magic', name: 'Counter Magic', station: 'magic conduit', grade: 'commercial', actions: 2, traits: ['concentrate', 'manipulate', 'station'], summary: 'Counteract a spell or magical effect within sensor range (rank = half your level rounded up). Counteracting a magical hazard disables it.' },
  { id: 'scan-for-magic', name: 'Scan for Magic', station: 'magic conduit', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], summary: 'Detect the presence or absence of magic within sensor range.' },
  // Pilot's console
  { id: 'boost-thrusters', name: 'Boost Thrusters', station: "pilot's console", grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], frequency: 'once per round', summary: 'The starship moves up to its Speed in the direction of its current heading.' },
  { id: 'evade', name: 'Evade', station: "pilot's console", grade: 'commercial', actions: 1, actionsMax: 2, traits: ['concentrate', 'manipulate', 'station'], summary: 'Your starship gains a +1 circumstance bonus to AC for 1 round (+2 if you spend 2 actions).' },
  { id: 'change-heading', name: 'Change Heading', station: "pilot's console", grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], requirements: 'The starship is not immobilized.', summary: 'The starship reverses its heading and is no longer off-kilter.' },
  { id: 'juke', name: 'Juke', station: "pilot's console", grade: 'tactical', actions: 1, traits: ['concentrate', 'manipulate', 'station'], requirements: 'Your target is within sensor range.', summary: 'Piloting check vs. the target\'s Perception DC. Success: the target is off-guard for 1 round. Crit success: it is also off-kilter.' },
  { id: 'stick-to-cover', name: 'Stick to Cover', station: "pilot's console", grade: 'tactical', actions: 1, traits: ['concentrate', 'manipulate', 'station'], requirements: 'Your starship is in the same zone as a starship or object one or more sizes larger.', summary: '+2 circumstance bonus to AC and Reflex saves against attacks originating in your zone or a chosen direction while you stay in the same zone as your cover.' },
  { id: 'clear-a-path', name: 'Clear a Path', station: "pilot's console", grade: 'advanced', actions: 1, traits: ['concentrate', 'manipulate', 'station'], frequency: 'once per round', requirements: 'The target is within 0 zones.', summary: 'Piloting check vs. the target\'s Reflex DC. Success: an ally can Strike the target as a reaction (−1) or the next Strike gains +1; crit success: no penalty / +2.' },
  { id: 'smoke-and-mirrors', name: 'Smoke and Mirrors', station: "pilot's console", grade: 'advanced', actions: 'reaction', traits: ['concentrate', 'manipulate', 'station'], trigger: 'A Strike misses your starship.', requirements: 'You are within 0 zones of another starship.', summary: 'The triggering Strike is rerolled against another starship of your choice within 0 zones.' },
  // Scanners
  { id: 'hack-comms', name: 'Hack Comms', station: 'scanners', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], requirements: 'A tech starship is within sensor range.', summary: 'Open a channel to a tech starship for 1 minute; crew helming stations can use auditory or verbal actions (such as Demoralize) against it.' },
  { id: 'seek-starships', name: 'Seek Starships', station: 'scanners', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], summary: 'The GM rolls a secret Computers or Perception check against the Stealth DCs of hidden or undetected starships and hazards within sensor range.' },
  { id: 'target-lock', name: 'Target Lock', station: 'scanners', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate', 'station'], summary: 'The target attempts a Will save vs. your Computers DC. Crit success: unaffected. Success: off-guard to the next Strike from your starship within 1 round. Failure: off-guard to your starship for 1 round. Crit failure: off-guard for 2 rounds and can\'t benefit from cover against your starship while off-guard this way.' },
  { id: 'hack-battle-station', name: 'Hack Battle Station', station: 'scanners', grade: 'tactical', actions: 1, traits: ['concentrate', 'flourish', 'manipulate', 'station'], prerequisites: 'trained in Computers', requirements: 'You target a tech starship within sensor range that has a battle station you have identified.', summary: 'Computers check vs. the target\'s Fortitude DC. Crit success: the station becomes malfunctioning and the target takes −1 circumstance to Will saves while it is. Success: the station becomes malfunctioning. Failure: malfunctioning until the start of the target\'s turn. Crit failure: your starship takes −1 circumstance to Will saves for 1 round.' },
  { id: 'scan-target', name: 'Scan Target', station: 'scanners', grade: 'tactical', actions: 1, traits: ['concentrate', 'manipulate', 'station'], summary: 'Computers check vs. the target\'s Will DC. Success: learn its model name, sensor range, and identify its battle stations. Failure: learn the model and identify one station. Identified stations are remembered for that model.' },
  { id: 'hack-munition', name: 'Hack Munition', station: 'scanners', grade: 'advanced', actions: 'reaction', traits: ['concentrate', 'manipulate', 'station'], trigger: 'You would be hit by a Strike from a tech starship within sensor range.', summary: 'Computers check vs. the target\'s Will DC. Success: the Strike takes −2 (failure −1); crit success: the granting station also becomes malfunctioning.' },
  // Other
  { id: 'jump-start', name: 'Jump Start', station: 'any', grade: 'commercial', actions: 2, traits: ['concentrate', 'healing', 'manipulate'], frequency: 'once per hour', requirements: 'The starship is inoperable, and you are helming the generator, magic conduit, or scanners.', summary: 'DC 15 check (Crafting at the generator; Arcana, Occultism, Nature, or Religion at the magic conduit; Computers at the scanners). Crit success: all stations stop malfunctioning and the ship regains 4d6 HP and 4d6 SP. Success: as crit success but 2d6 each. Failure: all stations stop malfunctioning. On a success or crit success, Jump Start can\'t restore Hull Points again for 1 hour. Special: an expert can instead attempt DC 20 to add 8 HP and SP, a master DC 30 to add 24, a legendary DC 40 to add 40.' },
  { id: 'repair-station', name: 'Repair Station', station: 'any', grade: 'commercial', actions: 1, traits: ['concentrate', 'manipulate'], requirements: 'You are helming a malfunctioning battle station.', summary: 'Computers or Crafting check vs. the DC of the effect that caused the malfunction (typically its save DC or a level-based DC). Success: the station stops malfunctioning; crit success: it is also immune to malfunctioning for 1 round. Crit failure: the station is immune to Repair Station until the start of your next turn.' },
]

/** Starship spells in every magic conduit's repository (p. 181). */
export interface StarshipSpell {
  id: string
  name: string
  rank: number
  cantrip?: boolean
  actions: ActionCost
  actionsMax?: ActionCost
  summary: string
}

export const TSC_STARSHIP_SPELLS: StarshipSpell[] = [
  { id: 'cosmic-bombardment', name: 'Cosmic Bombardment', rank: 1, actions: 1, actionsMax: 3, summary: 'Fire one magical missile per action (max 3) that automatically hits a starship in sensor range for 1d4+1 force each. Heightened (+2): one additional missile per action.' },
  { id: 'cosmic-cannon', name: 'Cosmic Cannon', rank: 1, cantrip: true, actions: 2, summary: 'Ranged spell attack vs. AC; 2d4 force damage (double on a crit). Heightened (+1): +1d4.' },
  { id: 'cosmic-fortification', name: 'Cosmic Fortification', rank: 1, actions: 1, summary: 'Grant 1d4+4 Shield Points to a starship in sensor range. Heightened (+1): +1d4+4.' },
  { id: 'cosmic-repairs', name: 'Cosmic Repairs', rank: 1, actions: 2, summary: 'Restore 1d8+8 Hull Points to a starship in sensor range. Heightened (+1): +1d8+8.' },
]

/** NPC starship Speed and sensor range by size (Tech Core p. 207); raise one by lowering the other. */
export const NPC_SIZE_DEFAULTS: Record<string, { speed: number; sensorRange: number }> = {
  tiny: { speed: 5, sensorRange: 3 },
  small: { speed: 4, sensorRange: 4 },
  medium: { speed: 4, sensorRange: 4 },
  large: { speed: 3, sensorRange: 5 },
  huge: { speed: 2, sensorRange: 6 },
  gargantuan: { speed: 2, sensorRange: 7 },
}

/** Fortify value for an NPC generator: half max SP, or 5 when max SP is 10 or less (p. 207). */
export function npcFortifyFor(sp: number): number {
  return sp <= 10 ? 5 : Math.floor(sp / 2)
}
