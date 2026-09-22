/**
 * Derivation helpers for Tactical Starship Combat: frame statistics by level,
 * battle-station grades, helmed bonuses, and the small rules formulas the
 * tracker needs (hull integrity DC, Generate Shields dice, degree of success).
 */

import type {
  DerivedStarshipStats,
  DerivedStationStats,
  FrameId,
  PlayerStarship,
  PlayerStation,
  StationGrade,
  StationKind,
} from '../types/tsc'
import { FRAMES, getFrameRow } from '../data/tscFrames'
import {
  GRADE_LEVEL_TRACKS,
  STATION_GRADES,
  STATION_HELMED_BONUS,
  STATION_TRACK,
  UPGRADE_SLOTS_BY_GRADE,
} from '../data/tscStations'

export type DegreeOfSuccess = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'

/** Grade a battle station has at a starship level (both advancement tracks start at commercial). */
export function stationGradeForLevel(kind: StationKind, level: number): StationGrade {
  const thresholds = GRADE_LEVEL_TRACKS[STATION_TRACK[kind]]
  let grade: StationGrade = 'commercial'
  thresholds.forEach((minLevel, i) => {
    if (level >= minLevel) grade = STATION_GRADES[i]
  })
  return grade
}

export function upgradeSlotsForGrade(grade: StationGrade): number {
  return UPGRADE_SLOTS_BY_GRADE[grade]
}

export function gradeIndex(grade: StationGrade): number {
  return STATION_GRADES.indexOf(grade)
}

/** Flat check DC for a compromised starship's hull integrity check (p. 173). */
export function hullIntegrityDC(compromised: number): number {
  return 10 + compromised
}

/** Generate Shields dice: 1d4, plus 1d4 at 3rd level and every 2 levels thereafter. */
export function generateShieldsDice(level: number): string {
  const dice = 1 + Math.max(0, Math.floor((Math.max(1, level) - 1) / 2))
  return `${dice}d4`
}

/**
 * Degree of success with the natural 1 / natural 20 step (Player Core).
 * `natural` is the d20 face; omit it when only the total is known.
 */
export function degreeOfSuccess(total: number, dc: number, natural?: number): DegreeOfSuccess {
  let step: number
  if (total >= dc + 10) step = 3
  else if (total >= dc) step = 2
  else if (total <= dc - 10) step = 0
  else step = 1
  if (natural === 20) step = Math.min(3, step + 1)
  else if (natural === 1) step = Math.max(0, step - 1)
  return (['criticalFailure', 'failure', 'success', 'criticalSuccess'] as const)[step]
}

/** Change to the compromised value from a hull integrity check result. */
export function hullIntegrityDelta(degree: DegreeOfSuccess): number {
  switch (degree) {
    case 'criticalSuccess': return -2
    case 'success': return -1
    case 'failure': return 1
    case 'criticalFailure': return 2
  }
}

function deriveStation(station: PlayerStation, level: number): DerivedStationStats {
  const grade = stationGradeForLevel(station.kind, level)
  const bonus = STATION_HELMED_BONUS[station.kind][gradeIndex(grade)]
  return {
    id: station.id,
    kind: station.kind,
    grade,
    upgradeSlots: upgradeSlotsForGrade(grade),
    damageDice: bonus.damageDice ?? 0,
    tracking: bonus.tracking ?? 0,
    drones: bonus.drones ?? 0,
    helmed: !!station.helmedBy,
  }
}

/**
 * Derive a player starship's combat statistics from its frame, level, and
 * helmed battle stations. Item bonuses only apply while a crew member helms
 * the station, except the scanners' sensor-range increase, which is a
 * property of the ship. The pilot's Piloting DC replaces AC when higher.
 */
export function deriveStarshipStats(ship: PlayerStarship): DerivedStarshipStats {
  const row = getFrameRow(ship.frame, ship.level)
  const frame = FRAMES[ship.frame]
  const itemBonuses = { ac: 0, fort: 0, ref: 0, will: 0, sensorRange: 0 }
  const stations = ship.stations.map(s => {
    const derived = deriveStation(s, ship.level)
    const bonus = STATION_HELMED_BONUS[s.kind][gradeIndex(derived.grade)]
    if (s.kind === 'scanners') itemBonuses.sensorRange = Math.max(itemBonuses.sensorRange, bonus.sensorRange ?? 0)
    if (derived.helmed) {
      // Item bonuses of the same kind don't stack; keep the best.
      itemBonuses.ac = Math.max(itemBonuses.ac, bonus.ac ?? 0)
      itemBonuses.fort = Math.max(itemBonuses.fort, bonus.fort ?? 0)
      itemBonuses.ref = Math.max(itemBonuses.ref, bonus.ref ?? 0)
      itemBonuses.will = Math.max(itemBonuses.will, bonus.will ?? 0)
    }
    return derived
  })
  // Inoperable (p. 173): -4 status penalty to AC, Perception, and Reflex saves, and off-guard.
  const statusPenalties = { ac: ship.inoperable ? -4 : 0, ref: ship.inoperable ? -4 : 0, perception: ship.inoperable ? -4 : 0 }
  // Off-kilter (p. 174): -2 circumstance penalty to attack rolls, Area Fire and Auto-Fire DCs, and Reflex saves.
  const circumstancePenalties = { ref: ship.offKilter ? -2 : 0, attackRolls: ship.offKilter ? -2 : 0 }
  // Helmed pilot's console (p. 181): "The starship's AC is equal to your Piloting DC if it's higher. It gains an
  // item bonus to its AC equal to its Helmed AC Bonus" — the substitution happens first, then the item bonus applies.
  const pilotHelmed = ship.stations.some(s => s.kind === "pilot's console" && s.helmedBy)
  const baseAC = pilotHelmed && ship.pilotingDC ? Math.max(row.ac, ship.pilotingDC) : row.ac
  const ac = baseAC + itemBonuses.ac + statusPenalties.ac
  return {
    maxHP: row.hp,
    maxSP: row.sp,
    ac,
    fort: row.fort + itemBonuses.fort,
    ref: row.ref + itemBonuses.ref + statusPenalties.ref + circumstancePenalties.ref,
    will: row.will + itemBonuses.will,
    speed: row.speed,
    sensorRange: frame.sensorRange + itemBonuses.sensorRange,
    stations,
    itemBonuses,
    statusPenalties,
    circumstancePenalties,
    offGuard: ship.inoperable,
  }
}

/** Build a fresh player starship of a frame at a level with its default stations installed. */
export function createPlayerStarship(frame: FrameId, level = 1, name = 'New Starship'): PlayerStarship {
  const def = FRAMES[frame]
  const row = getFrameRow(frame, level)
  return {
    id: crypto.randomUUID(),
    name,
    frame,
    level,
    stations: def.defaultStations.map(d => ({
      id: crypto.randomUUID(),
      kind: d.kind,
      slot: 'default',
      upgrades: [],
      malfunctioning: false,
    })),
    expansionBays: [],
    currentHP: row.hp,
    currentSP: row.sp,
    compromised: 0,
    wrecked: 0,
    inoperable: false,
    offKilter: false,
    conditions: [],
  }
}

/**
 * Re-level a player starship: recompute max HP/SP from the frame table and
 * keep current values proportional so a damaged ship stays damaged.
 */
export function setPlayerStarshipLevel(ship: PlayerStarship, level: number): PlayerStarship {
  const before = getFrameRow(ship.frame, ship.level)
  const after = getFrameRow(ship.frame, level)
  const scale = (current: number, oldMax: number, newMax: number) =>
    oldMax <= 0 ? newMax : Math.max(0, Math.min(newMax, Math.round((current / oldMax) * newMax)))
  return {
    ...ship,
    level,
    currentHP: scale(ship.currentHP, before.hp, after.hp),
    currentSP: scale(ship.currentSP, before.sp, after.sp),
  }
}
