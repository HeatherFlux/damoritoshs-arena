/**
 * Shared DC-by-Level table for PF2e/SF2e
 * Used by hacking generator, starship scene runner, and any skill check resolution.
 */

export const DC_BY_LEVEL: Record<number, number> = {
  0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
  6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
  11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
  16: 35, 17: 36, 18: 38, 19: 39, 20: 40
}

/**
 * Get the standard DC for a given level, clamped to 0-20.
 */
export function getDCForLevel(level: number): number {
  const clamped = Math.max(0, Math.min(20, level))
  return DC_BY_LEVEL[clamped] ?? 15
}

/**
 * Starship scene XP uses the Complex Hazard XP table from PF2e/SF2e.
 * Key difference from creature XP: +3 diff = 100 (not 120), +4 diff = 120 (not 160).
 */
export const STARSHIP_SCENE_XP_BY_LEVEL_DIFF: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  [0]: 40,
  [1]: 60,
  [2]: 80,
  [3]: 100,
  [4]: 120,
}

/**
 * Creature XP by level difference (standard encounter math).
 */
export const CREATURE_XP_BY_LEVEL_DIFF: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  [0]: 40,
  [1]: 60,
  [2]: 80,
  [3]: 120,
  [4]: 160,
}

/**
 * Get XP for a starship scene threat (uses complex hazard XP).
 */
export function getStarshipSceneXP(threatLevel: number, sceneLevel: number): number {
  const diff = Math.max(-4, Math.min(4, threatLevel - sceneLevel))
  return STARSHIP_SCENE_XP_BY_LEVEL_DIFF[diff] ?? 40
}
