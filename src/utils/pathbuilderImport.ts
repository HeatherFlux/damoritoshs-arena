/**
 * Pathbuilder Character Import Utilities
 *
 * Parses Pathbuilder 2e JSON exports and converts them to combatants
 * for the combat tracker.
 */

import type {
  PathbuilderImport,
  PathbuilderBuild,
  ImportWarning,
  ImportResult,
} from '../types/pathbuilder'

// Re-export ImportResult for convenience
export type { ImportResult } from '../types/pathbuilder'
import { SF2E_CLASS_HP, PF2E_CLASS_HP } from '../types/pathbuilder'

/**
 * Calculate ability modifier from ability score
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Get class HP per level
 * Checks SF2e classes first, then PF2e classes, defaults to 8
 */
export function getClassHP(className: string): number {
  const normalizedClass = className.toLowerCase().trim()

  // Check SF2e classes first
  if (SF2E_CLASS_HP[normalizedClass]) {
    return SF2E_CLASS_HP[normalizedClass]
  }

  // Check PF2e classes
  if (PF2E_CLASS_HP[normalizedClass]) {
    return PF2E_CLASS_HP[normalizedClass]
  }

  // Default for unknown classes
  return 8
}

/**
 * Calculate total HP for a character
 *
 * Formula: ancestryhp + (classhp + conMod + bonushpPerLevel) × level + bonushp
 */
export function calculateHP(build: PathbuilderBuild): number {
  const conMod = getAbilityModifier(build.abilities.con)

  // Use Pathbuilder's stored class HP if available, otherwise look it up
  const classHP = build.attributes.classhp || getClassHP(build.class)
  const ancestryHP = build.attributes.ancestryhp || 0
  const bonusHP = build.attributes.bonushp || 0
  const bonusHPPerLevel = build.attributes.bonushpPerLevel || 0

  // Formula from Pathbuilder
  const totalHP = ancestryHP + (classHP + conMod + bonusHPPerLevel) * build.level + bonusHP

  return Math.max(1, totalHP)
}

/**
 * Calculate a modifier (perception, saves, etc.)
 *
 * Formula: abilityMod + level + (proficiency × 2)
 * Note: Pathbuilder stores proficiency as 0/2/4/6/8 already multiplied
 */
export function calculateModifier(
  proficiency: number,
  level: number,
  abilityMod: number
): number {
  // Pathbuilder proficiency is already the bonus (2/4/6/8), not the multiplier
  // So: modifier = abilityMod + level + proficiency
  return abilityMod + level + proficiency
}

/**
 * Calculate perception modifier
 */
export function calculatePerception(build: PathbuilderBuild): number {
  const wisMod = getAbilityModifier(build.abilities.wis)
  const proficiency = build.proficiencies.perception || 0
  return calculateModifier(proficiency, build.level, wisMod)
}

/**
 * Calculate Fortitude save
 */
export function calculateFortitude(build: PathbuilderBuild): number {
  const conMod = getAbilityModifier(build.abilities.con)
  const proficiency = build.proficiencies.fortitude || 0
  return calculateModifier(proficiency, build.level, conMod)
}

/**
 * Calculate Reflex save
 */
export function calculateReflex(build: PathbuilderBuild): number {
  const dexMod = getAbilityModifier(build.abilities.dex)
  const proficiency = build.proficiencies.reflex || 0
  return calculateModifier(proficiency, build.level, dexMod)
}

/**
 * Calculate Will save
 */
export function calculateWill(build: PathbuilderBuild): number {
  const wisMod = getAbilityModifier(build.abilities.wis)
  const proficiency = build.proficiencies.will || 0
  return calculateModifier(proficiency, build.level, wisMod)
}

/**
 * Validate that the JSON has the basic structure of a Pathbuilder export
 */
function validatePathbuilderStructure(data: unknown): data is PathbuilderImport {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Must have success field and build object
  if (typeof obj.success !== 'boolean') {
    return false
  }

  if (typeof obj.build !== 'object' || obj.build === null) {
    return false
  }

  const build = obj.build as Record<string, unknown>

  // Must have at minimum: name and level
  if (typeof build.name !== 'string' || build.name.trim() === '') {
    return false
  }

  if (typeof build.level !== 'number' || build.level < 1 || build.level > 30) {
    return false
  }

  return true
}

/**
 * Parse Pathbuilder JSON and extract combat-relevant stats
 */
export function parsePathbuilderJSON(json: string): ImportResult {
  const warnings: ImportWarning[] = []

  // Step 1: Parse JSON
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (e) {
    return {
      success: false,
      warnings: [],
      errors: ['Invalid JSON format. Please paste the complete Pathbuilder export.'],
    }
  }

  // Step 2: Validate structure
  if (!validatePathbuilderStructure(data)) {
    return {
      success: false,
      warnings: [],
      errors: ['This doesn\'t appear to be a valid Pathbuilder character export. Make sure you\'re using the JSON export feature.'],
    }
  }

  // Check if Pathbuilder reported success
  if (!data.success) {
    return {
      success: false,
      warnings: [],
      errors: ['Pathbuilder reported an error with this export. Try re-exporting the character.'],
    }
  }

  const build = data.build

  // Step 3: Extract stats with fallbacks

  // Name (required, already validated)
  const name = build.name.trim()

  // Level (required, already validated)
  const level = build.level

  // Class
  const characterClass = build.class || 'Unknown'
  if (!build.class) {
    warnings.push({
      field: 'class',
      message: 'Class not found',
      defaultValue: 'Unknown',
    })
  }

  // Ancestry
  const ancestry = build.ancestry || 'Unknown'
  if (!build.ancestry) {
    warnings.push({
      field: 'ancestry',
      message: 'Ancestry not found',
      defaultValue: 'Unknown',
    })
  }

  // Abilities - check each one
  const abilities = build.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  if (!build.abilities) {
    warnings.push({
      field: 'abilities',
      message: 'Ability scores not found, using defaults (10)',
    })
  }

  // Ensure all abilities exist
  const validatedAbilities = {
    str: abilities.str ?? 10,
    dex: abilities.dex ?? 10,
    con: abilities.con ?? 10,
    int: abilities.int ?? 10,
    wis: abilities.wis ?? 10,
    cha: abilities.cha ?? 10,
  }

  // Attributes for HP calculation
  const attributes = build.attributes || {
    ancestryhp: 0,
    classhp: getClassHP(characterClass),
    bonushp: 0,
    bonushpPerLevel: 0,
    speed: 25,
    speedBonus: 0,
  }

  if (!build.attributes) {
    warnings.push({
      field: 'attributes',
      message: 'HP attributes not found, calculating from class',
    })
  }

  // Proficiencies
  const proficiencies = build.proficiencies || {
    perception: 0,
    fortitude: 0,
    reflex: 0,
    will: 0,
  }

  if (!build.proficiencies) {
    warnings.push({
      field: 'proficiencies',
      message: 'Proficiencies not found, saves will be calculated as untrained',
    })
  }

  // AC
  let ac = 10
  if (build.acTotal && typeof build.acTotal.acTotal === 'number') {
    ac = build.acTotal.acTotal
  } else {
    // Calculate basic AC: 10 + Dex + level (if trained in unarmored)
    const dexMod = getAbilityModifier(validatedAbilities.dex)
    const unarmoredProf = proficiencies.unarmored || 0
    ac = 10 + dexMod + (unarmoredProf > 0 ? level + unarmoredProf : 0)
    warnings.push({
      field: 'ac',
      message: 'AC not found, calculated basic AC',
      defaultValue: ac,
    })
  }

  // Build the validated build object for calculations
  const validatedBuild: PathbuilderBuild = {
    ...build,
    abilities: validatedAbilities,
    attributes,
    proficiencies,
  }

  // Step 4: Calculate derived stats
  const maxHP = calculateHP(validatedBuild)
  const perception = calculatePerception(validatedBuild)
  const fortitude = calculateFortitude(validatedBuild)
  const reflex = calculateReflex(validatedBuild)
  const will = calculateWill(validatedBuild)

  // Step 5: Build result
  return {
    success: true,
    combatant: {
      name,
      maxHP,
      currentHP: maxHP,
      ac,
      isPlayer: true,
      level,
      class: characterClass,
      ancestry,
      perception,
      fortitude,
      reflex,
      will,
    },
    characterSummary: {
      name,
      level,
      class: characterClass,
      ancestry,
      hp: maxHP,
      ac,
    },
    warnings,
    errors: [],
  }
}

/**
 * Format a character summary for display
 */
export function formatCharacterSummary(result: ImportResult): string {
  if (!result.success || !result.characterSummary) {
    return 'Import failed'
  }

  const { name, level, class: charClass, ancestry, hp, ac } = result.characterSummary
  return `${name} - Level ${level} ${ancestry} ${charClass} (HP: ${hp}, AC: ${ac})`
}

/**
 * Format warnings for display
 */
export function formatWarnings(warnings: ImportWarning[]): string[] {
  return warnings.map((w) => {
    if (w.defaultValue !== undefined) {
      return `${w.message} (using ${w.defaultValue})`
    }
    return w.message
  })
}
