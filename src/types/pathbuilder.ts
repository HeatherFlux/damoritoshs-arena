/**
 * Pathbuilder Character Import Types
 *
 * Supports importing characters from Pathbuilder 2e JSON exports
 * for both Pathfinder 2e and Starfinder 2e characters.
 */

import type { Combatant } from './combat'

// Starfinder 2e class HP values
export const SF2E_CLASS_HP: Record<string, number> = {
  'envoy': 8,
  'mechanic': 8,
  'mystic': 6,
  'operative': 8,
  'solarian': 10,
  'soldier': 10,
  'technomancer': 6,
  'witchwarper': 6,
  // Playtest/additional classes
  'biohacker': 8,
  'vanguard': 10,
  'nanocyte': 8,
  'precog': 6,
}

// Pathfinder 2e class HP values (for compatibility)
export const PF2E_CLASS_HP: Record<string, number> = {
  'alchemist': 8,
  'barbarian': 12,
  'bard': 8,
  'champion': 10,
  'cleric': 8,
  'druid': 8,
  'fighter': 10,
  'investigator': 8,
  'kineticist': 8,
  'magus': 8,
  'monk': 10,
  'oracle': 8,
  'psychic': 6,
  'ranger': 10,
  'rogue': 8,
  'sorcerer': 6,
  'summoner': 10,
  'swashbuckler': 10,
  'thaumaturge': 8,
  'witch': 6,
  'wizard': 6,
  'gunslinger': 8,
  'inventor': 8,
  'animist': 8,
  'commander': 8,
  'guardian': 12,
  'exemplar': 10,
  'necromancer': 6,
}

export interface PathbuilderAbilities {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface PathbuilderAttributes {
  ancestryhp: number
  classhp: number
  bonushp: number
  bonushpPerLevel: number
  speed: number
  speedBonus: number
}

export interface PathbuilderProficiencies {
  perception: number  // 0=untrained, 2=trained, 4=expert, 6=master, 8=legendary
  fortitude: number
  reflex: number
  will: number
  classDC?: number
  heavy?: number
  medium?: number
  light?: number
  unarmored?: number
  advanced?: number
  martial?: number
  simple?: number
  unarmed?: number
}

export interface PathbuilderACTotal {
  acTotal: number
  acProfBonus: number
  shieldBonus?: number
}

export interface PathbuilderBuild {
  name: string
  class: string
  dualClass?: string
  level: number
  ancestry: string
  heritage: string
  background: string
  alignment?: string
  gender?: string
  age?: string
  deity?: string
  size: number  // 0=tiny, 1=small, 2=medium, 3=large, 4=huge, 5=gargantuan
  keyability: string
  languages: string[]
  abilities: PathbuilderAbilities
  attributes: PathbuilderAttributes
  proficiencies: PathbuilderProficiencies
  acTotal: PathbuilderACTotal
  feats?: Array<[string, string, string, number]>  // [name, source, type, level]
  specials?: string[]
  lores?: Array<[string, number]>  // [name, proficiency]
  equipment?: Array<[string, number, string?]>  // [name, quantity, notes?]
  weapons?: PathbuilderWeapon[]
  money?: { pp: number; gp: number; sp: number; cp: number }
  spellCasters?: PathbuilderSpellcaster[]
  focusPoints?: number
  focus?: { [tradition: string]: { abilityBonus: number; proficiency: number; spells: string[] } }
}

export interface PathbuilderWeapon {
  name: string
  qty: number
  prof: string
  die: string
  pot: number  // potency rune
  str: string  // striking rune
  mat?: string  // material
  display: string
  runes: string[]
  damageType: string
  attack: number
  damageBonus: number
}

export interface PathbuilderSpellcaster {
  name: string
  magicTradition: string
  spellcastingType: string
  ability: string
  proficiency: number
  focusPoints?: number
  spells: Array<{ spellLevel: number; list: string[] }>
  perDay: number[]
}

export interface PathbuilderImport {
  success: boolean
  build: PathbuilderBuild
}

export interface ImportWarning {
  field: string
  message: string
  defaultValue?: string | number
}

export interface ImportResult {
  success: boolean
  combatant?: Combatant | {
    name: string
    maxHP: number
    currentHP: number
    ac: number
    isPlayer: boolean
    // Extended stats from Pathbuilder
    level?: number
    class?: string
    ancestry?: string
    perception?: number
    fortitude?: number
    reflex?: number
    will?: number
  }
  characterSummary?: {
    name: string
    level: number
    class: string
    ancestry: string
    hp: number
    ac: number
  }
  warnings: ImportWarning[]
  errors: string[]
}

/**
 * Extended combatant type for player characters with full stats
 */
export interface PlayerCombatant extends Combatant {
  level?: number
  class?: string
  ancestry?: string
  perception?: number
  fortitude?: number
  reflex?: number
  will?: number
  pathbuilderData?: PathbuilderBuild
}
