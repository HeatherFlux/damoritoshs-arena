/**
 * Creature building defaults based on SF2e GM Core guidelines
 * Statistics use: extreme, high, moderate, low, terrible scale
 */

export type StatScale = 'extreme' | 'high' | 'moderate' | 'low' | 'terrible'

// Attribute Modifier Scales (GM Core p.118)
export const ATTRIBUTE_MODIFIERS: Record<number, Record<StatScale, number>> = {
  [-1]: { extreme: 0, high: 3, moderate: 2, low: 0, terrible: -5 },
  0: { extreme: 0, high: 3, moderate: 2, low: 0, terrible: -5 },
  1: { extreme: 5, high: 4, moderate: 2, low: 0, terrible: -5 },
  2: { extreme: 5, high: 4, moderate: 3, low: 1, terrible: -5 },
  3: { extreme: 5, high: 4, moderate: 3, low: 1, terrible: -5 },
  4: { extreme: 6, high: 5, moderate: 3, low: 1, terrible: -5 },
  5: { extreme: 6, high: 5, moderate: 3, low: 2, terrible: -5 },
  6: { extreme: 7, high: 5, moderate: 3, low: 2, terrible: -5 },
  7: { extreme: 7, high: 6, moderate: 4, low: 2, terrible: -5 },
  8: { extreme: 7, high: 6, moderate: 4, low: 2, terrible: -5 },
  9: { extreme: 7, high: 6, moderate: 4, low: 3, terrible: -5 },
  10: { extreme: 8, high: 7, moderate: 4, low: 3, terrible: -5 },
  11: { extreme: 8, high: 7, moderate: 5, low: 3, terrible: -5 },
  12: { extreme: 8, high: 7, moderate: 5, low: 3, terrible: -5 },
  13: { extreme: 9, high: 8, moderate: 5, low: 4, terrible: -5 },
  14: { extreme: 9, high: 8, moderate: 5, low: 4, terrible: -5 },
  15: { extreme: 9, high: 8, moderate: 5, low: 4, terrible: -5 },
  16: { extreme: 10, high: 9, moderate: 6, low: 4, terrible: -5 },
  17: { extreme: 10, high: 9, moderate: 6, low: 5, terrible: -5 },
  18: { extreme: 10, high: 9, moderate: 6, low: 5, terrible: -5 },
  19: { extreme: 11, high: 10, moderate: 6, low: 5, terrible: -5 },
  20: { extreme: 11, high: 10, moderate: 6, low: 5, terrible: -5 },
  21: { extreme: 11, high: 10, moderate: 7, low: 6, terrible: -5 },
  22: { extreme: 12, high: 10, moderate: 7, low: 6, terrible: -5 },
  23: { extreme: 12, high: 10, moderate: 8, low: 6, terrible: -5 },
  24: { extreme: 13, high: 12, moderate: 9, low: 7, terrible: -5 },
}

// Perception (GM Core p.119)
export const PERCEPTION: Record<number, Record<StatScale, number>> = {
  [-1]: { extreme: 9, high: 8, moderate: 5, low: 2, terrible: 0 },
  0: { extreme: 10, high: 9, moderate: 6, low: 3, terrible: 1 },
  1: { extreme: 11, high: 10, moderate: 7, low: 4, terrible: 2 },
  2: { extreme: 12, high: 11, moderate: 8, low: 5, terrible: 3 },
  3: { extreme: 14, high: 12, moderate: 9, low: 6, terrible: 4 },
  4: { extreme: 15, high: 14, moderate: 11, low: 8, terrible: 6 },
  5: { extreme: 17, high: 15, moderate: 12, low: 9, terrible: 7 },
  6: { extreme: 18, high: 17, moderate: 14, low: 11, terrible: 8 },
  7: { extreme: 20, high: 18, moderate: 15, low: 12, terrible: 10 },
  8: { extreme: 21, high: 19, moderate: 16, low: 13, terrible: 11 },
  9: { extreme: 23, high: 21, moderate: 18, low: 15, terrible: 12 },
  10: { extreme: 24, high: 22, moderate: 19, low: 16, terrible: 14 },
  11: { extreme: 26, high: 24, moderate: 21, low: 18, terrible: 15 },
  12: { extreme: 27, high: 25, moderate: 22, low: 19, terrible: 16 },
  13: { extreme: 29, high: 26, moderate: 23, low: 20, terrible: 18 },
  14: { extreme: 30, high: 28, moderate: 25, low: 22, terrible: 19 },
  15: { extreme: 32, high: 29, moderate: 26, low: 23, terrible: 20 },
  16: { extreme: 33, high: 30, moderate: 28, low: 25, terrible: 22 },
  17: { extreme: 35, high: 32, moderate: 29, low: 26, terrible: 23 },
  18: { extreme: 36, high: 33, moderate: 30, low: 27, terrible: 24 },
  19: { extreme: 38, high: 35, moderate: 32, low: 29, terrible: 26 },
  20: { extreme: 39, high: 36, moderate: 33, low: 30, terrible: 27 },
  21: { extreme: 41, high: 38, moderate: 35, low: 32, terrible: 28 },
  22: { extreme: 43, high: 39, moderate: 36, low: 33, terrible: 30 },
  23: { extreme: 44, high: 40, moderate: 37, low: 34, terrible: 31 },
  24: { extreme: 46, high: 42, moderate: 38, low: 36, terrible: 32 },
}

// Armor Class (GM Core p.121)
export const ARMOR_CLASS: Record<number, Record<Exclude<StatScale, 'terrible'>, number>> = {
  [-1]: { extreme: 18, high: 15, moderate: 14, low: 12 },
  0: { extreme: 19, high: 16, moderate: 15, low: 13 },
  1: { extreme: 19, high: 16, moderate: 15, low: 13 },
  2: { extreme: 21, high: 18, moderate: 17, low: 15 },
  3: { extreme: 22, high: 19, moderate: 18, low: 16 },
  4: { extreme: 24, high: 21, moderate: 20, low: 18 },
  5: { extreme: 25, high: 22, moderate: 21, low: 19 },
  6: { extreme: 27, high: 24, moderate: 23, low: 21 },
  7: { extreme: 28, high: 25, moderate: 24, low: 22 },
  8: { extreme: 30, high: 27, moderate: 26, low: 24 },
  9: { extreme: 31, high: 28, moderate: 27, low: 25 },
  10: { extreme: 33, high: 30, moderate: 29, low: 27 },
  11: { extreme: 34, high: 31, moderate: 30, low: 28 },
  12: { extreme: 36, high: 33, moderate: 32, low: 30 },
  13: { extreme: 37, high: 34, moderate: 33, low: 31 },
  14: { extreme: 39, high: 36, moderate: 35, low: 33 },
  15: { extreme: 40, high: 37, moderate: 36, low: 34 },
  16: { extreme: 42, high: 39, moderate: 38, low: 36 },
  17: { extreme: 43, high: 40, moderate: 39, low: 37 },
  18: { extreme: 45, high: 42, moderate: 41, low: 39 },
  19: { extreme: 46, high: 43, moderate: 42, low: 40 },
  20: { extreme: 48, high: 45, moderate: 44, low: 42 },
  21: { extreme: 49, high: 46, moderate: 45, low: 43 },
  22: { extreme: 51, high: 48, moderate: 47, low: 45 },
  23: { extreme: 52, high: 49, moderate: 48, low: 46 },
  24: { extreme: 54, high: 51, moderate: 50, low: 48 },
}

// Saving Throws (GM Core p.122)
export const SAVING_THROWS: Record<number, Record<StatScale, number>> = {
  [-1]: { extreme: 9, high: 8, moderate: 5, low: 2, terrible: 0 },
  0: { extreme: 10, high: 9, moderate: 6, low: 3, terrible: 1 },
  1: { extreme: 11, high: 10, moderate: 7, low: 4, terrible: 2 },
  2: { extreme: 12, high: 11, moderate: 8, low: 5, terrible: 3 },
  3: { extreme: 14, high: 12, moderate: 9, low: 6, terrible: 4 },
  4: { extreme: 15, high: 14, moderate: 11, low: 8, terrible: 6 },
  5: { extreme: 17, high: 15, moderate: 12, low: 9, terrible: 7 },
  6: { extreme: 18, high: 17, moderate: 14, low: 11, terrible: 8 },
  7: { extreme: 20, high: 18, moderate: 15, low: 12, terrible: 10 },
  8: { extreme: 21, high: 19, moderate: 16, low: 13, terrible: 11 },
  9: { extreme: 23, high: 21, moderate: 18, low: 15, terrible: 12 },
  10: { extreme: 24, high: 22, moderate: 19, low: 16, terrible: 14 },
  11: { extreme: 26, high: 24, moderate: 21, low: 18, terrible: 15 },
  12: { extreme: 27, high: 25, moderate: 22, low: 19, terrible: 16 },
  13: { extreme: 29, high: 26, moderate: 23, low: 20, terrible: 18 },
  14: { extreme: 30, high: 28, moderate: 25, low: 22, terrible: 19 },
  15: { extreme: 32, high: 29, moderate: 26, low: 23, terrible: 20 },
  16: { extreme: 33, high: 30, moderate: 28, low: 25, terrible: 22 },
  17: { extreme: 35, high: 32, moderate: 29, low: 26, terrible: 23 },
  18: { extreme: 36, high: 33, moderate: 30, low: 27, terrible: 24 },
  19: { extreme: 38, high: 35, moderate: 32, low: 29, terrible: 26 },
  20: { extreme: 39, high: 36, moderate: 33, low: 30, terrible: 27 },
  21: { extreme: 41, high: 38, moderate: 35, low: 32, terrible: 28 },
  22: { extreme: 43, high: 39, moderate: 36, low: 33, terrible: 30 },
  23: { extreme: 44, high: 40, moderate: 37, low: 34, terrible: 31 },
  24: { extreme: 46, high: 42, moderate: 38, low: 36, terrible: 32 },
}

// Hit Points (GM Core p.122) - using midpoint of ranges
export const HIT_POINTS: Record<number, { high: number; moderate: number; low: number }> = {
  [-1]: { high: 9, moderate: 7, low: 5 },
  0: { high: 18, moderate: 15, low: 12 },
  1: { high: 25, moderate: 20, low: 15 },
  2: { high: 38, moderate: 30, low: 23 },
  3: { high: 56, moderate: 45, low: 34 },
  4: { high: 75, moderate: 60, low: 45 },
  5: { high: 94, moderate: 75, low: 56 },
  6: { high: 119, moderate: 95, low: 71 },
  7: { high: 144, moderate: 115, low: 86 },
  8: { high: 169, moderate: 135, low: 101 },
  9: { high: 194, moderate: 155, low: 116 },
  10: { high: 219, moderate: 175, low: 131 },
  11: { high: 244, moderate: 195, low: 146 },
  12: { high: 269, moderate: 215, low: 161 },
  13: { high: 294, moderate: 235, low: 176 },
  14: { high: 319, moderate: 255, low: 191 },
  15: { high: 344, moderate: 275, low: 206 },
  16: { high: 369, moderate: 295, low: 221 },
  17: { high: 394, moderate: 315, low: 236 },
  18: { high: 419, moderate: 335, low: 251 },
  19: { high: 444, moderate: 355, low: 266 },
  20: { high: 469, moderate: 375, low: 281 },
  21: { high: 505, moderate: 404, low: 303 },
  22: { high: 545, moderate: 436, low: 327 },
  23: { high: 575, moderate: 460, low: 345 },
  24: { high: 625, moderate: 500, low: 375 },
}

// Strike Attack Bonus (GM Core p.124)
export const STRIKE_ATTACK: Record<number, Record<Exclude<StatScale, 'terrible'>, number>> = {
  [-1]: { extreme: 10, high: 8, moderate: 6, low: 4 },
  0: { extreme: 10, high: 8, moderate: 6, low: 4 },
  1: { extreme: 11, high: 9, moderate: 7, low: 5 },
  2: { extreme: 13, high: 11, moderate: 9, low: 7 },
  3: { extreme: 14, high: 12, moderate: 10, low: 8 },
  4: { extreme: 16, high: 14, moderate: 12, low: 9 },
  5: { extreme: 17, high: 15, moderate: 13, low: 11 },
  6: { extreme: 19, high: 17, moderate: 15, low: 12 },
  7: { extreme: 20, high: 18, moderate: 16, low: 13 },
  8: { extreme: 22, high: 20, moderate: 18, low: 15 },
  9: { extreme: 23, high: 21, moderate: 19, low: 16 },
  10: { extreme: 25, high: 23, moderate: 21, low: 17 },
  11: { extreme: 27, high: 24, moderate: 22, low: 19 },
  12: { extreme: 28, high: 26, moderate: 24, low: 20 },
  13: { extreme: 29, high: 27, moderate: 25, low: 21 },
  14: { extreme: 31, high: 29, moderate: 27, low: 23 },
  15: { extreme: 32, high: 30, moderate: 28, low: 24 },
  16: { extreme: 34, high: 32, moderate: 30, low: 25 },
  17: { extreme: 35, high: 33, moderate: 31, low: 27 },
  18: { extreme: 37, high: 35, moderate: 33, low: 28 },
  19: { extreme: 38, high: 36, moderate: 34, low: 29 },
  20: { extreme: 40, high: 38, moderate: 36, low: 31 },
  21: { extreme: 41, high: 39, moderate: 37, low: 32 },
  22: { extreme: 43, high: 41, moderate: 39, low: 33 },
  23: { extreme: 44, high: 42, moderate: 40, low: 35 },
  24: { extreme: 46, high: 44, moderate: 42, low: 36 },
}

// Strike Damage - average values (GM Core p.125)
export const STRIKE_DAMAGE: Record<number, Record<Exclude<StatScale, 'terrible'>, number>> = {
  [-1]: { extreme: 4, high: 3, moderate: 3, low: 2 },
  0: { extreme: 6, high: 5, moderate: 4, low: 3 },
  1: { extreme: 8, high: 6, moderate: 5, low: 4 },
  2: { extreme: 11, high: 9, moderate: 8, low: 6 },
  3: { extreme: 15, high: 12, moderate: 10, low: 8 },
  4: { extreme: 18, high: 14, moderate: 12, low: 9 },
  5: { extreme: 20, high: 16, moderate: 13, low: 11 },
  6: { extreme: 23, high: 18, moderate: 15, low: 12 },
  7: { extreme: 25, high: 20, moderate: 17, low: 13 },
  8: { extreme: 28, high: 22, moderate: 18, low: 15 },
  9: { extreme: 30, high: 24, moderate: 20, low: 16 },
  10: { extreme: 33, high: 26, moderate: 22, low: 17 },
  11: { extreme: 35, high: 28, moderate: 23, low: 19 },
  12: { extreme: 38, high: 30, moderate: 25, low: 20 },
  13: { extreme: 40, high: 32, moderate: 27, low: 21 },
  14: { extreme: 43, high: 34, moderate: 28, low: 23 },
  15: { extreme: 45, high: 36, moderate: 30, low: 24 },
  16: { extreme: 48, high: 37, moderate: 31, low: 25 },
  17: { extreme: 50, high: 38, moderate: 32, low: 26 },
  18: { extreme: 53, high: 40, moderate: 33, low: 27 },
  19: { extreme: 55, high: 42, moderate: 35, low: 28 },
  20: { extreme: 58, high: 44, moderate: 37, low: 29 },
  21: { extreme: 60, high: 46, moderate: 38, low: 31 },
  22: { extreme: 63, high: 48, moderate: 40, low: 32 },
  23: { extreme: 65, high: 50, moderate: 42, low: 33 },
  24: { extreme: 68, high: 52, moderate: 44, low: 35 },
}

// Skills (GM Core p.120)
export const SKILLS: Record<number, Record<Exclude<StatScale, 'terrible'>, number>> = {
  [-1]: { extreme: 8, high: 5, moderate: 4, low: 2 },
  0: { extreme: 9, high: 6, moderate: 5, low: 3 },
  1: { extreme: 10, high: 7, moderate: 6, low: 4 },
  2: { extreme: 11, high: 8, moderate: 7, low: 5 },
  3: { extreme: 13, high: 10, moderate: 9, low: 6 },
  4: { extreme: 15, high: 12, moderate: 10, low: 8 },
  5: { extreme: 16, high: 13, moderate: 12, low: 9 },
  6: { extreme: 18, high: 15, moderate: 13, low: 11 },
  7: { extreme: 20, high: 17, moderate: 15, low: 12 },
  8: { extreme: 21, high: 18, moderate: 16, low: 14 },
  9: { extreme: 23, high: 20, moderate: 18, low: 15 },
  10: { extreme: 25, high: 22, moderate: 19, low: 17 },
  11: { extreme: 26, high: 23, moderate: 21, low: 18 },
  12: { extreme: 28, high: 25, moderate: 22, low: 20 },
  13: { extreme: 30, high: 27, moderate: 24, low: 21 },
  14: { extreme: 31, high: 28, moderate: 25, low: 23 },
  15: { extreme: 33, high: 30, moderate: 27, low: 24 },
  16: { extreme: 35, high: 32, moderate: 28, low: 26 },
  17: { extreme: 36, high: 33, moderate: 30, low: 27 },
  18: { extreme: 38, high: 35, moderate: 31, low: 29 },
  19: { extreme: 40, high: 37, moderate: 33, low: 30 },
  20: { extreme: 41, high: 38, moderate: 34, low: 32 },
  21: { extreme: 43, high: 40, moderate: 36, low: 33 },
  22: { extreme: 45, high: 42, moderate: 37, low: 35 },
  23: { extreme: 46, high: 43, moderate: 38, low: 36 },
  24: { extreme: 48, high: 45, moderate: 40, low: 38 },
}

/**
 * Road map presets for common creature types
 */
export type CreatureRoadMap = 'brute' | 'soldier' | 'skirmisher' | 'sniper' | 'spellcaster' | 'skillParagon' | 'balanced'

export interface CreatureDefaults {
  ac: number
  hp: number
  fort: number
  ref: number
  will: number
  perception: number
  attackBonus: number
  damage: number
}

/**
 * Get default stats for a creature based on level and road map
 */
export function getCreatureDefaults(level: number, roadMap: CreatureRoadMap = 'balanced'): CreatureDefaults {
  // Clamp level to valid range
  const lvl = Math.max(-1, Math.min(24, level))

  switch (roadMap) {
    case 'brute':
      // High HP, low AC, high Fort, low Ref/Will, high damage
      return {
        ac: ARMOR_CLASS[lvl]?.low ?? 15,
        hp: HIT_POINTS[lvl]?.high ?? 20,
        fort: SAVING_THROWS[lvl]?.high ?? 5,
        ref: SAVING_THROWS[lvl]?.low ?? 2,
        will: SAVING_THROWS[lvl]?.low ?? 2,
        perception: PERCEPTION[lvl]?.low ?? 3,
        attackBonus: STRIKE_ATTACK[lvl]?.moderate ?? 6,
        damage: STRIKE_DAMAGE[lvl]?.extreme ?? 8,
      }

    case 'soldier':
      // High AC, high Fort, moderate HP, high attack
      return {
        ac: ARMOR_CLASS[lvl]?.high ?? 16,
        hp: HIT_POINTS[lvl]?.moderate ?? 15,
        fort: SAVING_THROWS[lvl]?.high ?? 5,
        ref: SAVING_THROWS[lvl]?.moderate ?? 4,
        will: SAVING_THROWS[lvl]?.high ?? 5,
        perception: PERCEPTION[lvl]?.moderate ?? 5,
        attackBonus: STRIKE_ATTACK[lvl]?.high ?? 8,
        damage: STRIKE_DAMAGE[lvl]?.high ?? 6,
      }

    case 'skirmisher':
      // Moderate AC, low Fort, high Ref, fast and mobile
      return {
        ac: ARMOR_CLASS[lvl]?.moderate ?? 15,
        hp: HIT_POINTS[lvl]?.moderate ?? 15,
        fort: SAVING_THROWS[lvl]?.low ?? 2,
        ref: SAVING_THROWS[lvl]?.high ?? 5,
        will: SAVING_THROWS[lvl]?.moderate ?? 4,
        perception: PERCEPTION[lvl]?.high ?? 6,
        attackBonus: STRIKE_ATTACK[lvl]?.high ?? 8,
        damage: STRIKE_DAMAGE[lvl]?.moderate ?? 5,
      }

    case 'sniper':
      // High ranged attack/damage, low Fort, high Ref, moderate HP
      return {
        ac: ARMOR_CLASS[lvl]?.moderate ?? 15,
        hp: HIT_POINTS[lvl]?.low ?? 12,
        fort: SAVING_THROWS[lvl]?.low ?? 2,
        ref: SAVING_THROWS[lvl]?.high ?? 5,
        will: SAVING_THROWS[lvl]?.moderate ?? 4,
        perception: PERCEPTION[lvl]?.high ?? 6,
        attackBonus: STRIKE_ATTACK[lvl]?.high ?? 8,
        damage: STRIKE_DAMAGE[lvl]?.extreme ?? 8,
      }

    case 'spellcaster':
      // Low AC, low HP, low Fort, high Will, low attack
      return {
        ac: ARMOR_CLASS[lvl]?.low ?? 13,
        hp: HIT_POINTS[lvl]?.low ?? 12,
        fort: SAVING_THROWS[lvl]?.low ?? 2,
        ref: SAVING_THROWS[lvl]?.moderate ?? 4,
        will: SAVING_THROWS[lvl]?.high ?? 5,
        perception: PERCEPTION[lvl]?.moderate ?? 5,
        attackBonus: STRIKE_ATTACK[lvl]?.low ?? 4,
        damage: STRIKE_DAMAGE[lvl]?.low ?? 3,
      }

    case 'skillParagon':
      // Moderate combat stats, focused on skills
      return {
        ac: ARMOR_CLASS[lvl]?.moderate ?? 15,
        hp: HIT_POINTS[lvl]?.moderate ?? 15,
        fort: SAVING_THROWS[lvl]?.moderate ?? 4,
        ref: SAVING_THROWS[lvl]?.high ?? 5,
        will: SAVING_THROWS[lvl]?.high ?? 5,
        perception: PERCEPTION[lvl]?.high ?? 6,
        attackBonus: STRIKE_ATTACK[lvl]?.moderate ?? 6,
        damage: STRIKE_DAMAGE[lvl]?.moderate ?? 5,
      }

    case 'balanced':
    default:
      // Moderate across the board
      return {
        ac: ARMOR_CLASS[lvl]?.moderate ?? 15,
        hp: HIT_POINTS[lvl]?.moderate ?? 15,
        fort: SAVING_THROWS[lvl]?.moderate ?? 4,
        ref: SAVING_THROWS[lvl]?.moderate ?? 4,
        will: SAVING_THROWS[lvl]?.moderate ?? 4,
        perception: PERCEPTION[lvl]?.moderate ?? 5,
        attackBonus: STRIKE_ATTACK[lvl]?.moderate ?? 6,
        damage: STRIKE_DAMAGE[lvl]?.moderate ?? 5,
      }
  }
}

/**
 * Get suggested attribute modifiers for a level
 */
export function getAttributeDefaults(level: number): { high: number; moderate: number; low: number } {
  const lvl = Math.max(-1, Math.min(24, level))
  return {
    high: ATTRIBUTE_MODIFIERS[lvl]?.high ?? 3,
    moderate: ATTRIBUTE_MODIFIERS[lvl]?.moderate ?? 2,
    low: ATTRIBUTE_MODIFIERS[lvl]?.low ?? 0,
  }
}

/**
 * Get suggested skill modifiers for a level (GM Core p.120)
 */
export function getSkillDefaults(level: number): { low: number; moderate: number; high: number; extreme: number } {
  const lvl = Math.max(-1, Math.min(24, level))
  return {
    low: SKILLS[lvl]?.low ?? 4,
    moderate: SKILLS[lvl]?.moderate ?? 6,
    high: SKILLS[lvl]?.high ?? 7,
    extreme: SKILLS[lvl]?.extreme ?? 10,
  }
}

/**
 * Format a damage expression from an average value
 */
export function formatDamageExpression(avgDamage: number): string {
  if (avgDamage <= 3) return '1d4'
  if (avgDamage <= 5) return '1d6+2'
  if (avgDamage <= 8) return '1d8+4'
  if (avgDamage <= 12) return '2d6+5'
  if (avgDamage <= 16) return '2d8+7'
  if (avgDamage <= 20) return '2d10+9'
  if (avgDamage <= 25) return '2d12+12'
  if (avgDamage <= 30) return '3d10+14'
  if (avgDamage <= 35) return '3d12+16'
  if (avgDamage <= 40) return '4d10+18'
  if (avgDamage <= 50) return '4d12+24'
  return '5d12+28'
}

/**
 * Road map descriptions for UI
 */
export const ROAD_MAP_DESCRIPTIONS: Record<CreatureRoadMap, { name: string; description: string }> = {
  brute: {
    name: 'Brute',
    description: 'High HP, extreme damage, low AC. Like ogres and trolls.',
  },
  soldier: {
    name: 'Soldier',
    description: 'High AC, high Fort/Will, balanced damage. Armored fighters.',
  },
  skirmisher: {
    name: 'Skirmisher',
    description: 'High Ref, mobile, moderate damage. Darting enemies.',
  },
  sniper: {
    name: 'Sniper',
    description: 'High ranged damage, low HP/Fort. Deadly at range.',
  },
  spellcaster: {
    name: 'Spellcaster',
    description: 'Low combat stats, high Will. Relies on magic.',
  },
  skillParagon: {
    name: 'Skill Paragon',
    description: 'High skills and Perception. Social or stealth focused.',
  },
  balanced: {
    name: 'Balanced',
    description: 'Moderate across the board. Good starting point.',
  },
}
