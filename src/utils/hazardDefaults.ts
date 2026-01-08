/**
 * GM Core Hazard Building Tables
 * Provides level-appropriate defaults for hazard statistics
 */

// Stealth and Disable DCs by Level
// From GM Core "Stealth and Disable DCs" table
const STEALTH_DISABLE_DCS: Record<number, { extreme: number; high: number; low: number }> = {
  [-1]: { extreme: 18, high: 15, low: 12 },
  [0]: { extreme: 19, high: 16, low: 13 },
  [1]: { extreme: 20, high: 17, low: 14 },
  [2]: { extreme: 21, high: 18, low: 15 },
  [3]: { extreme: 23, high: 20, low: 17 },
  [4]: { extreme: 25, high: 22, low: 18 },
  [5]: { extreme: 26, high: 23, low: 20 },
  [6]: { extreme: 28, high: 25, low: 21 },
  [7]: { extreme: 30, high: 27, low: 23 },
  [8]: { extreme: 31, high: 28, low: 24 },
  [9]: { extreme: 33, high: 30, low: 26 },
  [10]: { extreme: 35, high: 32, low: 27 },
  [11]: { extreme: 36, high: 33, low: 29 },
  [12]: { extreme: 38, high: 35, low: 30 },
  [13]: { extreme: 40, high: 37, low: 32 },
  [14]: { extreme: 41, high: 38, low: 33 },
  [15]: { extreme: 43, high: 40, low: 35 },
  [16]: { extreme: 45, high: 42, low: 36 },
  [17]: { extreme: 46, high: 43, low: 38 },
  [18]: { extreme: 48, high: 45, low: 39 },
  [19]: { extreme: 50, high: 47, low: 41 },
  [20]: { extreme: 51, high: 48, low: 42 },
  [21]: { extreme: 53, high: 50, low: 44 },
  [22]: { extreme: 55, high: 52, low: 45 },
  [23]: { extreme: 56, high: 53, low: 46 },
  [24]: { extreme: 58, high: 55, low: 48 },
}

// Hazard Defenses by Level
// EAC = Extreme AC, HAC = High AC, LAC = Low AC
const HAZARD_DEFENSES: Record<number, {
  eAC: number; hAC: number; lAC: number;
  eSave: number; hSave: number; lSave: number;
  hardness: [number, number]; // range
  hp: [number, number]; // range
}> = {
  [-1]: { eAC: 18, hAC: 15, lAC: 12, eSave: 9, hSave: 8, lSave: 2, hardness: [2, 4], hp: [11, 13] },
  [0]: { eAC: 19, hAC: 16, lAC: 13, eSave: 10, hSave: 9, lSave: 3, hardness: [3, 5], hp: [15, 17] },
  [1]: { eAC: 19, hAC: 16, lAC: 13, eSave: 11, hSave: 10, lSave: 4, hardness: [5, 7], hp: [23, 25] },
  [2]: { eAC: 21, hAC: 18, lAC: 15, eSave: 12, hSave: 11, lSave: 5, hardness: [7, 9], hp: [30, 34] },
  [3]: { eAC: 22, hAC: 19, lAC: 16, eSave: 14, hSave: 12, lSave: 6, hardness: [10, 12], hp: [42, 46] },
  [4]: { eAC: 24, hAC: 21, lAC: 18, eSave: 15, hSave: 14, lSave: 8, hardness: [11, 13], hp: [46, 50] },
  [5]: { eAC: 25, hAC: 22, lAC: 19, eSave: 17, hSave: 15, lSave: 9, hardness: [12, 14], hp: [50, 54] },
  [6]: { eAC: 27, hAC: 24, lAC: 21, eSave: 18, hSave: 17, lSave: 11, hardness: [13, 15], hp: [54, 58] },
  [7]: { eAC: 28, hAC: 25, lAC: 22, eSave: 20, hSave: 18, lSave: 12, hardness: [14, 16], hp: [58, 62] },
  [8]: { eAC: 30, hAC: 27, lAC: 24, eSave: 21, hSave: 19, lSave: 13, hardness: [15, 17], hp: [62, 66] },
  [9]: { eAC: 31, hAC: 28, lAC: 25, eSave: 23, hSave: 21, lSave: 15, hardness: [16, 18], hp: [66, 70] },
  [10]: { eAC: 33, hAC: 30, lAC: 27, eSave: 24, hSave: 22, lSave: 16, hardness: [17, 19], hp: [70, 74] },
  [11]: { eAC: 34, hAC: 31, lAC: 28, eSave: 26, hSave: 24, lSave: 18, hardness: [19, 21], hp: [78, 82] },
  [12]: { eAC: 36, hAC: 33, lAC: 30, eSave: 27, hSave: 25, lSave: 19, hardness: [20, 22], hp: [82, 86] },
  [13]: { eAC: 37, hAC: 34, lAC: 31, eSave: 29, hSave: 26, lSave: 20, hardness: [21, 23], hp: [86, 90] },
  [14]: { eAC: 39, hAC: 36, lAC: 33, eSave: 30, hSave: 27, lSave: 22, hardness: [22, 24], hp: [90, 94] },
  [15]: { eAC: 40, hAC: 37, lAC: 34, eSave: 32, hSave: 29, lSave: 23, hardness: [23, 25], hp: [94, 98] },
  [16]: { eAC: 42, hAC: 39, lAC: 36, eSave: 33, hSave: 30, lSave: 25, hardness: [25, 27], hp: [101, 107] },
  [17]: { eAC: 43, hAC: 40, lAC: 37, eSave: 35, hSave: 32, lSave: 26, hardness: [27, 29], hp: [109, 115] },
  [18]: { eAC: 45, hAC: 42, lAC: 39, eSave: 36, hSave: 33, lSave: 27, hardness: [29, 31], hp: [117, 123] },
  [19]: { eAC: 46, hAC: 43, lAC: 40, eSave: 38, hSave: 35, lSave: 29, hardness: [31, 33], hp: [125, 131] },
  [20]: { eAC: 48, hAC: 45, lAC: 42, eSave: 39, hSave: 36, lSave: 30, hardness: [33, 35], hp: [133, 139] },
  [21]: { eAC: 49, hAC: 46, lAC: 43, eSave: 41, hSave: 38, lSave: 32, hardness: [36, 38], hp: [144, 152] },
  [22]: { eAC: 51, hAC: 48, lAC: 45, eSave: 43, hSave: 39, lSave: 33, hardness: [39, 41], hp: [156, 164] },
  [23]: { eAC: 52, hAC: 49, lAC: 46, eSave: 44, hSave: 40, lSave: 34, hardness: [44, 46], hp: [168, 176] },
  [24]: { eAC: 54, hAC: 51, lAC: 48, eSave: 46, hSave: 42, lSave: 36, hardness: [46, 50], hp: [180, 188] },
}

// Hazard Offense by Level
// Simple hazards have higher attack but lower damage per hit
// Complex hazards have lower attack but hit multiple times
const HAZARD_OFFENSE: Record<number, {
  simpleAtk: number;
  complexAtk: number;
  simpleDamage: string;
  simpleDamageAvg: number;
  complexDamage: string;
  complexDamageAvg: number;
  extremeDC: number;
  highDC: number;
}> = {
  [-1]: { simpleAtk: 10, complexAtk: 8, simpleDamage: '2d4+1', simpleDamageAvg: 6, complexDamage: '1d4+1', complexDamageAvg: 3, extremeDC: 19, highDC: 16 },
  [0]: { simpleAtk: 11, complexAtk: 8, simpleDamage: '2d6+3', simpleDamageAvg: 10, complexDamage: '1d6+2', complexDamageAvg: 5, extremeDC: 19, highDC: 16 },
  [1]: { simpleAtk: 13, complexAtk: 9, simpleDamage: '2d6+5', simpleDamageAvg: 12, complexDamage: '1d6+3', complexDamageAvg: 6, extremeDC: 20, highDC: 17 },
  [2]: { simpleAtk: 14, complexAtk: 11, simpleDamage: '2d10+7', simpleDamageAvg: 18, complexDamage: '1d10+4', complexDamageAvg: 9, extremeDC: 22, highDC: 18 },
  [3]: { simpleAtk: 16, complexAtk: 12, simpleDamage: '2d10+13', simpleDamageAvg: 24, complexDamage: '1d10+6', complexDamageAvg: 12, extremeDC: 23, highDC: 20 },
  [4]: { simpleAtk: 17, complexAtk: 14, simpleDamage: '4d8+10', simpleDamageAvg: 28, complexDamage: '2d8+5', complexDamageAvg: 14, extremeDC: 25, highDC: 21 },
  [5]: { simpleAtk: 19, complexAtk: 15, simpleDamage: '4d8+14', simpleDamageAvg: 32, complexDamage: '2d8+7', complexDamageAvg: 16, extremeDC: 26, highDC: 22 },
  [6]: { simpleAtk: 20, complexAtk: 17, simpleDamage: '4d8+18', simpleDamageAvg: 36, complexDamage: '2d8+9', complexDamageAvg: 18, extremeDC: 27, highDC: 24 },
  [7]: { simpleAtk: 22, complexAtk: 18, simpleDamage: '4d10+18', simpleDamageAvg: 40, complexDamage: '2d10+9', complexDamageAvg: 20, extremeDC: 29, highDC: 25 },
  [8]: { simpleAtk: 23, complexAtk: 20, simpleDamage: '4d10+22', simpleDamageAvg: 44, complexDamage: '2d10+11', complexDamageAvg: 22, extremeDC: 30, highDC: 26 },
  [9]: { simpleAtk: 25, complexAtk: 21, simpleDamage: '4d10+26', simpleDamageAvg: 48, complexDamage: '2d10+13', complexDamageAvg: 24, extremeDC: 32, highDC: 28 },
  [10]: { simpleAtk: 26, complexAtk: 23, simpleDamage: '4d12+26', simpleDamageAvg: 52, complexDamage: '2d12+13', complexDamageAvg: 26, extremeDC: 33, highDC: 29 },
  [11]: { simpleAtk: 28, complexAtk: 24, simpleDamage: '4d12+30', simpleDamageAvg: 56, complexDamage: '2d12+15', complexDamageAvg: 28, extremeDC: 34, highDC: 30 },
  [12]: { simpleAtk: 29, complexAtk: 26, simpleDamage: '6d10+27', simpleDamageAvg: 60, complexDamage: '3d10+14', complexDamageAvg: 30, extremeDC: 36, highDC: 32 },
  [13]: { simpleAtk: 31, complexAtk: 27, simpleDamage: '6d10+31', simpleDamageAvg: 64, complexDamage: '3d10+16', complexDamageAvg: 32, extremeDC: 37, highDC: 33 },
  [14]: { simpleAtk: 32, complexAtk: 29, simpleDamage: '6d10+35', simpleDamageAvg: 68, complexDamage: '3d10+18', complexDamageAvg: 34, extremeDC: 39, highDC: 34 },
  [15]: { simpleAtk: 34, complexAtk: 30, simpleDamage: '6d12+33', simpleDamageAvg: 72, complexDamage: '3d12+17', complexDamageAvg: 36, extremeDC: 40, highDC: 36 },
  [16]: { simpleAtk: 35, complexAtk: 32, simpleDamage: '6d12+35', simpleDamageAvg: 74, complexDamage: '3d12+18', complexDamageAvg: 37, extremeDC: 41, highDC: 37 },
  [17]: { simpleAtk: 37, complexAtk: 33, simpleDamage: '6d12+37', simpleDamageAvg: 76, complexDamage: '3d12+19', complexDamageAvg: 38, extremeDC: 43, highDC: 38 },
  [18]: { simpleAtk: 38, complexAtk: 35, simpleDamage: '6d12+41', simpleDamageAvg: 80, complexDamage: '3d12+20', complexDamageAvg: 40, extremeDC: 44, highDC: 40 },
  [19]: { simpleAtk: 40, complexAtk: 36, simpleDamage: '8d10+40', simpleDamageAvg: 84, complexDamage: '4d10+20', complexDamageAvg: 42, extremeDC: 46, highDC: 41 },
  [20]: { simpleAtk: 41, complexAtk: 38, simpleDamage: '8d10+44', simpleDamageAvg: 88, complexDamage: '4d10+22', complexDamageAvg: 44, extremeDC: 47, highDC: 42 },
  [21]: { simpleAtk: 43, complexAtk: 39, simpleDamage: '8d10+48', simpleDamageAvg: 92, complexDamage: '4d10+24', complexDamageAvg: 46, extremeDC: 48, highDC: 44 },
  [22]: { simpleAtk: 44, complexAtk: 41, simpleDamage: '8d10+52', simpleDamageAvg: 96, complexDamage: '4d10+26', complexDamageAvg: 48, extremeDC: 50, highDC: 45 },
  [23]: { simpleAtk: 46, complexAtk: 42, simpleDamage: '8d12+48', simpleDamageAvg: 100, complexDamage: '4d12+24', complexDamageAvg: 50, extremeDC: 51, highDC: 46 },
  [24]: { simpleAtk: 47, complexAtk: 44, simpleDamage: '8d12+52', simpleDamageAvg: 104, complexDamage: '4d12+26', complexDamageAvg: 52, extremeDC: 52, highDC: 48 },
}

// Minimum proficiency requirements by level
const MIN_PROFICIENCY: Record<string, { high: string; moderate: string }> = {
  '0-': { high: 'untrained', moderate: 'untrained' },
  '1-4': { high: 'trained', moderate: 'untrained' },
  '5-8': { high: 'expert', moderate: 'trained' },
  '9-18': { high: 'master', moderate: 'expert' },
  '19+': { high: 'legendary', moderate: 'master' },
}

export type HazardRoadmap = 'extreme' | 'high' | 'low'

export interface HazardDefaults {
  stealthDC: { extreme: number; high: number; low: number }
  disableDC: { extreme: number; high: number; low: number }
  ac: { extreme: number; high: number; low: number }
  save: { extreme: number; high: number; low: number }
  hardness: [number, number]
  hp: [number, number]
  attack: { simple: number; complex: number }
  damage: { simple: string; complex: string }
  effectDC: { extreme: number; high: number }
  minProficiency: { high: string; moderate: string }
}

/**
 * Get all hazard defaults for a given level
 */
export function getHazardDefaults(level: number): HazardDefaults {
  const lvl = Math.max(-1, Math.min(24, level))

  const stealth = STEALTH_DISABLE_DCS[lvl] || STEALTH_DISABLE_DCS[0]
  const defense = HAZARD_DEFENSES[lvl] || HAZARD_DEFENSES[0]
  const offense = HAZARD_OFFENSE[lvl] || HAZARD_OFFENSE[0]

  // Determine proficiency bracket
  let profBracket: string
  if (lvl <= 0) profBracket = '0-'
  else if (lvl <= 4) profBracket = '1-4'
  else if (lvl <= 8) profBracket = '5-8'
  else if (lvl <= 18) profBracket = '9-18'
  else profBracket = '19+'

  return {
    stealthDC: stealth,
    disableDC: stealth, // Same table
    ac: { extreme: defense.eAC, high: defense.hAC, low: defense.lAC },
    save: { extreme: defense.eSave, high: defense.hSave, low: defense.lSave },
    hardness: defense.hardness,
    hp: defense.hp,
    attack: { simple: offense.simpleAtk, complex: offense.complexAtk },
    damage: { simple: offense.simpleDamage, complex: offense.complexDamage },
    effectDC: { extreme: offense.extremeDC, high: offense.highDC },
    minProficiency: MIN_PROFICIENCY[profBracket],
  }
}

/**
 * Get suggested stealth DC based on roadmap
 */
export function getSuggestedStealthDC(level: number, roadmap: HazardRoadmap): number {
  const defaults = getHazardDefaults(level)
  return defaults.stealthDC[roadmap]
}

/**
 * Get suggested disable DC based on roadmap
 */
export function getSuggestedDisableDC(level: number, roadmap: HazardRoadmap): number {
  const defaults = getHazardDefaults(level)
  return defaults.disableDC[roadmap]
}

/**
 * Get suggested AC based on roadmap
 */
export function getSuggestedAC(level: number, roadmap: HazardRoadmap): number {
  const defaults = getHazardDefaults(level)
  return defaults.ac[roadmap]
}

/**
 * Get suggested save modifier based on roadmap
 */
export function getSuggestedSave(level: number, roadmap: HazardRoadmap): number {
  const defaults = getHazardDefaults(level)
  return defaults.save[roadmap]
}

/**
 * Get suggested hardness (returns middle of range)
 */
export function getSuggestedHardness(level: number): number {
  const defaults = getHazardDefaults(level)
  return Math.floor((defaults.hardness[0] + defaults.hardness[1]) / 2)
}

/**
 * Get suggested HP (returns middle of range)
 */
export function getSuggestedHP(level: number): number {
  const defaults = getHazardDefaults(level)
  return Math.floor((defaults.hp[0] + defaults.hp[1]) / 2)
}

/**
 * Get suggested attack bonus based on complexity
 */
export function getSuggestedAttack(level: number, isComplex: boolean): number {
  const defaults = getHazardDefaults(level)
  return isComplex ? defaults.attack.complex : defaults.attack.simple
}

/**
 * Get suggested damage based on complexity
 */
export function getSuggestedDamage(level: number, isComplex: boolean): string {
  const defaults = getHazardDefaults(level)
  return isComplex ? defaults.damage.complex : defaults.damage.simple
}

/**
 * Get suggested effect DC based on roadmap (for saves against hazard effects)
 */
export function getSuggestedEffectDC(level: number, roadmap: 'extreme' | 'high'): number {
  const defaults = getHazardDefaults(level)
  return defaults.effectDC[roadmap]
}

/**
 * Get minimum proficiency requirement
 */
export function getMinProficiency(level: number): { high: string; moderate: string } {
  const defaults = getHazardDefaults(level)
  return defaults.minProficiency
}
