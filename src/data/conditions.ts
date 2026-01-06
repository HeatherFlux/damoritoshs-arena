/**
 * PF2e/SF2e Conditions with full mechanical effects
 * Based on Archives of Nethys / Remaster rules
 */

export interface ConditionEffect {
  // Flat penalties (not based on value)
  ac?: number
  allChecks?: number        // All checks and DCs
  allSaves?: number
  perception?: number
  attackRolls?: number
  reflex?: number
  fortitude?: number
  will?: number

  // Value-based penalties (multiplied by condition value)
  acPerValue?: number
  allChecksPerValue?: number
  perceptionPerValue?: number
  attackRollsPerValue?: number
  reflexPerValue?: number
  fortitudePerValue?: number
  willPerValue?: number
  damagePerValue?: number

  // Specific ability-based penalties per value
  strChecksPerValue?: number
  dexChecksPerValue?: number
  conChecksPerValue?: number
  intChecksPerValue?: number
  wisChecksPerValue?: number
  chaChecksPerValue?: number

  // HP effects
  maxHPPerLevelPerValue?: number  // Drained reduces max HP by level × value

  // Special flags
  offGuard?: boolean        // -2 circumstance to AC
  immobilized?: boolean     // Can't use move actions
  cannotAct?: boolean       // Cannot take actions
  cannotSee?: boolean       // Blinded
  cannotHear?: boolean      // Deafened
  flatCheckToAct?: number   // DC for flat check to take certain actions
}

export interface ConditionDefinition {
  name: string
  hasValue: boolean
  description: string
  shortDescription: string
  effects: ConditionEffect
  decreasesAtEndOfTurn?: boolean
  group?: 'detection' | 'senses' | 'death' | 'attitudes' | 'lowered-abilities' | 'other'
}

export const CONDITIONS: Record<string, ConditionDefinition> = {
  blinded: {
    name: 'Blinded',
    hasValue: false,
    description: 'You cannot see. All terrain is difficult terrain. You automatically critically fail Perception checks requiring sight. You take a -4 status penalty to Perception if vision is your only precise sense. You are immune to visual effects.',
    shortDescription: 'Cannot see; -4 Perception',
    effects: {
      perception: -4,
      cannotSee: true,
    },
    group: 'senses',
  },

  clumsy: {
    name: 'Clumsy',
    hasValue: true,
    description: 'You take a status penalty equal to the condition value on Dexterity-based checks and DCs, including AC, Reflex saves, ranged attack rolls, and Acrobatics, Stealth, and Thievery checks.',
    shortDescription: 'Penalty to Dex checks, AC, Reflex',
    effects: {
      acPerValue: -1,
      reflexPerValue: -1,
      dexChecksPerValue: -1,
    },
    group: 'lowered-abilities',
  },

  concealed: {
    name: 'Concealed',
    hasValue: false,
    description: 'You are difficult to see due to fog or similar obscuration. Creatures targeting you must succeed at a DC 5 flat check or the attack fails.',
    shortDescription: 'DC 5 flat check to target',
    effects: {
      flatCheckToAct: 5,
    },
    group: 'senses',
  },

  confused: {
    name: 'Confused',
    hasValue: false,
    description: 'You are off-guard, don\'t treat anyone as an ally, and must spend actions attacking randomly. You take damage to attempt a DC 11 flat check to end the condition.',
    shortDescription: 'Off-guard; attack randomly',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  controlled: {
    name: 'Controlled',
    hasValue: false,
    description: 'Another creature dictates all your actions, including attacks and reactions.',
    shortDescription: 'Controller dictates actions',
    effects: {},
    group: 'other',
  },

  dazzled: {
    name: 'Dazzled',
    hasValue: false,
    description: 'All creatures and objects are concealed from you if vision is your only precise sense.',
    shortDescription: 'Everything is concealed',
    effects: {},
    group: 'senses',
  },

  deafened: {
    name: 'Deafened',
    hasValue: false,
    description: 'You cannot hear. You automatically critically fail Perception checks requiring hearing and take a -2 status penalty to Perception. You are immune to auditory effects.',
    shortDescription: 'Cannot hear; -2 Perception',
    effects: {
      perception: -2,
      cannotHear: true,
    },
    group: 'senses',
  },

  doomed: {
    name: 'Doomed',
    hasValue: true,
    description: 'Your dying value at which you die is reduced by your doomed value. If your maximum dying value is reduced to 0, you instantly die. Doomed decreases by 1 after a full night\'s rest.',
    shortDescription: 'Closer to death',
    effects: {},
    group: 'death',
  },

  drained: {
    name: 'Drained',
    hasValue: true,
    description: 'You take a status penalty equal to your drained value on Constitution-based checks and lose Hit Points equal to your level times the drained value (your maximum HP is also reduced). Drained decreases by 1 after a full night\'s rest.',
    shortDescription: 'Penalty to Con; reduced max HP',
    effects: {
      conChecksPerValue: -1,
      fortitudePerValue: -1,
      maxHPPerLevelPerValue: -1,
    },
    group: 'lowered-abilities',
  },

  dying: {
    name: 'Dying',
    hasValue: true,
    description: 'You are unconscious and near death. You must attempt recovery checks each turn. At dying 4 (or lower if doomed), you die.',
    shortDescription: 'Near death; recovery checks',
    effects: {
      cannotAct: true,
      offGuard: true,
      ac: -4,
      perception: -4,
      reflex: -4,
    },
    group: 'death',
  },

  encumbered: {
    name: 'Encumbered',
    hasValue: false,
    description: 'You are clumsy 1 and take a -10-foot penalty to all your Speeds.',
    shortDescription: 'Clumsy 1; -10 ft Speed',
    effects: {
      acPerValue: -1,
      reflexPerValue: -1,
      dexChecksPerValue: -1,
    },
    group: 'other',
  },

  enfeebled: {
    name: 'Enfeebled',
    hasValue: true,
    description: 'You take a status penalty equal to the condition value on Strength-based rolls and DCs, including melee attack and damage rolls and Athletics checks.',
    shortDescription: 'Penalty to Str checks and damage',
    effects: {
      strChecksPerValue: -1,
      damagePerValue: -1,
    },
    group: 'lowered-abilities',
  },

  fascinated: {
    name: 'Fascinated',
    hasValue: false,
    description: 'You take a -2 status penalty to Perception and skill checks, and cannot use concentrate actions unless related to the source of fascination.',
    shortDescription: '-2 Perception and skills',
    effects: {
      perception: -2,
      allChecks: -2,
    },
    group: 'other',
  },

  fatigued: {
    name: 'Fatigued',
    hasValue: false,
    description: 'You take a -1 status penalty to AC and saving throws. You cannot use exploration activities while traveling.',
    shortDescription: '-1 AC and saves',
    effects: {
      ac: -1,
      allSaves: -1,
    },
    group: 'other',
  },

  fleeing: {
    name: 'Fleeing',
    hasValue: false,
    description: 'You must spend all your actions trying to escape the source of the condition. You cannot Delay or Ready.',
    shortDescription: 'Must flee',
    effects: {},
    group: 'other',
  },

  frightened: {
    name: 'Frightened',
    hasValue: true,
    description: 'You take a status penalty equal to the condition value on all checks and DCs. Unless otherwise specified, frightened decreases by 1 at the end of each of your turns.',
    shortDescription: 'Penalty to all checks and DCs',
    effects: {
      allChecksPerValue: -1,
      acPerValue: -1,
    },
    decreasesAtEndOfTurn: true,
    group: 'other',
  },

  grabbed: {
    name: 'Grabbed',
    hasValue: false,
    description: 'You are off-guard and immobilized. If you attempt a manipulate action, you must succeed at a DC 5 flat check or the action is lost.',
    shortDescription: 'Off-guard; immobilized',
    effects: {
      offGuard: true,
      immobilized: true,
      flatCheckToAct: 5,
    },
    group: 'other',
  },

  hidden: {
    name: 'Hidden',
    hasValue: false,
    description: 'A creature knows roughly where you are but cannot see you. You are off-guard to them, and they must succeed at a DC 11 flat check to target you.',
    shortDescription: 'Location known but unseen',
    effects: {},
    group: 'detection',
  },

  immobilized: {
    name: 'Immobilized',
    hasValue: false,
    description: 'You cannot use actions with the move trait. If something tries to move you, it must succeed at a check against your Fortitude DC.',
    shortDescription: 'Cannot move',
    effects: {
      immobilized: true,
    },
    group: 'other',
  },

  invisible: {
    name: 'Invisible',
    hasValue: false,
    description: 'You are undetected by all creatures. Creatures can attempt to Seek you against your Stealth DC.',
    shortDescription: 'Undetected by all',
    effects: {},
    group: 'detection',
  },

  'off-guard': {
    name: 'Off-Guard',
    hasValue: false,
    description: 'You take a -2 circumstance penalty to AC. Some effects make you off-guard only to certain creatures or attacks.',
    shortDescription: '-2 AC',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  paralyzed: {
    name: 'Paralyzed',
    hasValue: false,
    description: 'You are off-guard and cannot act except to Recall Knowledge and take purely mental actions.',
    shortDescription: 'Cannot act; off-guard',
    effects: {
      offGuard: true,
      cannotAct: true,
    },
    group: 'other',
  },

  'persistent-damage': {
    name: 'Persistent Damage',
    hasValue: true,
    description: 'You take the specified damage at the end of each turn. At the end of your turn, roll a DC 15 flat check to end this condition.',
    shortDescription: 'Ongoing damage each turn',
    effects: {},
    group: 'other',
  },

  petrified: {
    name: 'Petrified',
    hasValue: false,
    description: 'You have been turned to stone. You cannot act or sense anything. You become an object with AC 9 and Hardness 8.',
    shortDescription: 'Turned to stone',
    effects: {
      cannotAct: true,
    },
    group: 'other',
  },

  prone: {
    name: 'Prone',
    hasValue: false,
    description: 'You are lying on the ground. You are off-guard and take a -2 circumstance penalty to attack rolls. You can only Crawl or Stand. You can Take Cover for a +4 bonus to AC vs ranged attacks.',
    shortDescription: 'Off-guard; -2 attacks',
    effects: {
      offGuard: true,
      attackRolls: -2,
    },
    group: 'other',
  },

  quickened: {
    name: 'Quickened',
    hasValue: false,
    description: 'You gain 1 additional action at the start of each turn. The source of this condition may limit what the action can be used for.',
    shortDescription: '+1 action per turn',
    effects: {},
    group: 'other',
  },

  restrained: {
    name: 'Restrained',
    hasValue: false,
    description: 'You are off-guard and immobilized, and you cannot use any attack or manipulate actions except to Escape or Force Open.',
    shortDescription: 'Off-guard; immobilized; limited actions',
    effects: {
      offGuard: true,
      immobilized: true,
    },
    group: 'other',
  },

  sickened: {
    name: 'Sickened',
    hasValue: true,
    description: 'You take a status penalty equal to the value on all checks and DCs. You cannot willingly ingest anything. You can spend an action to Retch and attempt a Fortitude save to reduce the value.',
    shortDescription: 'Penalty to all checks; cannot ingest',
    effects: {
      allChecksPerValue: -1,
      acPerValue: -1,
    },
    group: 'other',
  },

  slowed: {
    name: 'Slowed',
    hasValue: true,
    description: 'You have fewer actions. When you regain actions at the start of your turn, reduce the number by your slowed value.',
    shortDescription: 'Fewer actions per turn',
    effects: {},
    group: 'other',
  },

  stunned: {
    name: 'Stunned',
    hasValue: true,
    description: 'You cannot act. Stunned usually has a value indicating how many actions you lose. Stunned overrides slowed.',
    shortDescription: 'Cannot act; lose actions',
    effects: {
      cannotAct: true,
    },
    group: 'other',
  },

  stupefied: {
    name: 'Stupefied',
    hasValue: true,
    description: 'You take a status penalty equal to the value on Intelligence-, Wisdom-, and Charisma-based checks and DCs. When you cast a spell, you must succeed at a flat check (DC 5 + value) or the spell fails.',
    shortDescription: 'Penalty to mental checks; spell disruption',
    effects: {
      intChecksPerValue: -1,
      wisChecksPerValue: -1,
      chaChecksPerValue: -1,
      willPerValue: -1,
      perceptionPerValue: -1,
    },
    group: 'lowered-abilities',
  },

  unconscious: {
    name: 'Unconscious',
    hasValue: false,
    description: 'You are asleep or knocked out. You take a -4 status penalty to AC, Perception, and Reflex saves. You are blinded and off-guard, and you fall prone and drop items.',
    shortDescription: '-4 AC/Perception/Reflex; cannot act',
    effects: {
      ac: -4,
      perception: -4,
      reflex: -4,
      offGuard: true,
      cannotAct: true,
      cannotSee: true,
    },
    group: 'death',
  },

  undetected: {
    name: 'Undetected',
    hasValue: false,
    description: 'A creature is entirely unaware of your presence and cannot see or precisely locate you.',
    shortDescription: 'Creature unaware of you',
    effects: {},
    group: 'detection',
  },

  wounded: {
    name: 'Wounded',
    hasValue: true,
    description: 'You have been brought back from dying. If you gain the dying condition, increase its value by your wounded value. Wounded ends when you are restored to full HP.',
    shortDescription: 'Increases dying severity',
    effects: {},
    group: 'death',
  },

  // SF2e Specific Conditions
  glitching: {
    name: 'Glitching',
    hasValue: true,
    description: 'Your equipment is malfunctioning. At value 1, take -1 to checks with the item. At value 2, the item becomes unusable. At value 3, the item is broken.',
    shortDescription: 'Equipment malfunction',
    effects: {
      allChecksPerValue: -1,
    },
    group: 'other',
  },

  suppressed: {
    name: 'Suppressed',
    hasValue: false,
    description: 'You are being targeted by suppressive fire. You are off-guard and take a -2 circumstance penalty to attack rolls while in the suppressed area.',
    shortDescription: 'Off-guard; -2 attacks in area',
    effects: {
      offGuard: true,
      attackRolls: -2,
    },
    group: 'other',
  },

  untethered: {
    name: 'Untethered',
    hasValue: false,
    description: 'You have lost your connection to reality, typically from exposure to the Gap. You are confused and take 1d6 mental damage at the start of each turn until the condition ends.',
    shortDescription: 'Confused; ongoing mental damage',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  broken: {
    name: 'Broken',
    hasValue: false,
    description: 'This item has been damaged. It cannot be used for its normal function until Repaired.',
    shortDescription: 'Item cannot function',
    effects: {},
    group: 'other',
  },

  observed: {
    name: 'Observed',
    hasValue: false,
    description: 'You are in plain view. Creatures can see you clearly with no special effort.',
    shortDescription: 'Clearly visible',
    effects: {},
    group: 'detection',
  },

  unnoticed: {
    name: 'Unnoticed',
    hasValue: false,
    description: 'A creature is entirely unaware of your presence. You are undetected by them and they have no idea you exist.',
    shortDescription: 'Creature has no idea you exist',
    effects: {},
    group: 'detection',
  },

  friendly: {
    name: 'Friendly',
    hasValue: false,
    description: 'This creature views you positively and will help you if it doesn\'t cost them much.',
    shortDescription: 'Positively disposed',
    effects: {},
    group: 'attitudes',
  },

  helpful: {
    name: 'Helpful',
    hasValue: false,
    description: 'This creature will go out of their way to help you.',
    shortDescription: 'Will go out of way to help',
    effects: {},
    group: 'attitudes',
  },

  hostile: {
    name: 'Hostile',
    hasValue: false,
    description: 'This creature views you as an enemy and will actively work against you.',
    shortDescription: 'Views you as enemy',
    effects: {},
    group: 'attitudes',
  },

  indifferent: {
    name: 'Indifferent',
    hasValue: false,
    description: 'This creature doesn\'t care about you one way or another.',
    shortDescription: 'Neutral toward you',
    effects: {},
    group: 'attitudes',
  },

  unfriendly: {
    name: 'Unfriendly',
    hasValue: false,
    description: 'This creature dislikes you and won\'t help unless given a good reason.',
    shortDescription: 'Dislikes you',
    effects: {},
    group: 'attitudes',
  },
}

// Combat-relevant conditions for the condition picker (alphabetized)
export const COMBAT_CONDITIONS = [
  'blinded',
  'clumsy',
  'concealed',
  'confused',
  'controlled',
  'dazzled',
  'deafened',
  'doomed',
  'drained',
  'dying',
  'encumbered',
  'enfeebled',
  'fascinated',
  'fatigued',
  'fleeing',
  'frightened',
  'glitching',
  'grabbed',
  'hidden',
  'immobilized',
  'invisible',
  'observed',
  'off-guard',
  'paralyzed',
  'persistent-damage',
  'petrified',
  'prone',
  'quickened',
  'restrained',
  'sickened',
  'slowed',
  'stunned',
  'stupefied',
  'suppressed',
  'unconscious',
  'undetected',
  'unnoticed',
  'untethered',
  'wounded',
] as const

export type CombatCondition = typeof COMBAT_CONDITIONS[number]

/**
 * Calculate the total stat modifications from a list of conditions
 */
export function calculateConditionEffects(
  conditions: Array<{ name: string; value?: number }>,
  creatureLevel: number = 1
): {
  ac: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  attackRolls: number
  damage: number
  maxHPReduction: number
  isOffGuard: boolean
  isImmobilized: boolean
  cannotAct: boolean
  cannotSee: boolean
  cannotHear: boolean
} {
  const result = {
    ac: 0,
    perception: 0,
    fortitude: 0,
    reflex: 0,
    will: 0,
    attackRolls: 0,
    damage: 0,
    maxHPReduction: 0,
    isOffGuard: false,
    isImmobilized: false,
    cannotAct: false,
    cannotSee: false,
    cannotHear: false,
  }

  for (const cond of conditions) {
    const def = CONDITIONS[cond.name.toLowerCase().replace(/\s+/g, '-')]
    if (!def) continue

    const value = cond.value || 1
    const effects = def.effects

    // Flat penalties
    if (effects.ac) result.ac += effects.ac
    if (effects.perception) result.perception += effects.perception
    if (effects.fortitude) result.fortitude += effects.fortitude
    if (effects.reflex) result.reflex += effects.reflex
    if (effects.will) result.will += effects.will
    if (effects.attackRolls) result.attackRolls += effects.attackRolls
    if (effects.allChecks) {
      result.perception += effects.allChecks
      result.attackRolls += effects.allChecks
    }
    if (effects.allSaves) {
      result.fortitude += effects.allSaves
      result.reflex += effects.allSaves
      result.will += effects.allSaves
    }

    // Value-based penalties
    if (effects.acPerValue) result.ac += effects.acPerValue * value
    if (effects.perceptionPerValue) result.perception += effects.perceptionPerValue * value
    if (effects.fortitudePerValue) result.fortitude += effects.fortitudePerValue * value
    if (effects.reflexPerValue) result.reflex += effects.reflexPerValue * value
    if (effects.willPerValue) result.will += effects.willPerValue * value
    if (effects.attackRollsPerValue) result.attackRolls += effects.attackRollsPerValue * value
    if (effects.damagePerValue) result.damage += effects.damagePerValue * value
    if (effects.allChecksPerValue) {
      result.ac += effects.allChecksPerValue * value
      result.perception += effects.allChecksPerValue * value
      result.attackRolls += effects.allChecksPerValue * value
      result.fortitude += effects.allChecksPerValue * value
      result.reflex += effects.allChecksPerValue * value
      result.will += effects.allChecksPerValue * value
    }

    // Dex-based (clumsy)
    if (effects.dexChecksPerValue) {
      result.ac += effects.dexChecksPerValue * value
      result.reflex += effects.dexChecksPerValue * value
    }

    // Con-based (drained)
    if (effects.conChecksPerValue) {
      result.fortitude += effects.conChecksPerValue * value
    }

    // Wis-based (stupefied affects perception and will)
    if (effects.wisChecksPerValue) {
      result.perception += effects.wisChecksPerValue * value
      result.will += effects.wisChecksPerValue * value
    }

    // Str-based (enfeebled)
    if (effects.strChecksPerValue) {
      // Affects melee attack rolls (not ranged)
      // We'll apply to all attacks for simplicity
    }

    // Max HP reduction (drained)
    if (effects.maxHPPerLevelPerValue) {
      result.maxHPReduction += Math.abs(effects.maxHPPerLevelPerValue) * value * creatureLevel
    }

    // Off-guard gives -2 circumstance to AC
    if (effects.offGuard) {
      result.isOffGuard = true
      result.ac -= 2 // Circumstance penalty
    }

    // Flags
    if (effects.immobilized) result.isImmobilized = true
    if (effects.cannotAct) result.cannotAct = true
    if (effects.cannotSee) result.cannotSee = true
    if (effects.cannotHear) result.cannotHear = true
  }

  return result
}

/**
 * Get a condition definition by name
 */
export function getCondition(name: string): ConditionDefinition | undefined {
  const key = name.toLowerCase().replace(/\s+/g, '-')
  return CONDITIONS[key]
}

/**
 * Check if a condition has a value component
 */
export function conditionHasValue(name: string): boolean {
  const def = getCondition(name)
  return def?.hasValue ?? false
}
