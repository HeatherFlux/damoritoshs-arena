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
    description: 'You can\'t see. All normal terrain is difficult terrain to you. You can\'t detect anything using vision. You automatically critically fail Perception checks that require you to be able to see, and if vision is your only precise sense, you take a –4 status penalty to Perception checks. You\'re immune to visual effects. Blinded overrides dazzled.',
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
    description: 'Your movements become clumsy and inexact. Clumsy always includes a value. You take a status penalty equal to the condition value to Dexterity-based rolls and DCs, including AC, Reflex saves, ranged attack rolls, and skill checks using Acrobatics, Stealth, and Thievery.',
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
    description: 'You\'re difficult for one or more creatures to see due to thick fog or some other obscuring feature. You can be concealed to some creatures but not others. While concealed, you can still be observed, but you\'re tougher to target. A creature that you\'re concealed from must succeed at a DC 5 flat check when targeting you with an attack, spell, or other effect. If the check fails, you aren\'t affected. Area effects aren\'t subject to this flat check.',
    shortDescription: 'DC 5 flat check to target',
    effects: {
      flatCheckToAct: 5,
    },
    group: 'senses',
  },

  confused: {
    name: 'Confused',
    hasValue: false,
    description: 'You don\'t have your wits about you, and you attack wildly. You\'re off-guard, you don\'t treat anyone as your ally (though they might still treat you as theirs), and you can\'t Delay, Ready, or use reactions. You use all your actions to Strike or cast offensive cantrips, though the GM can have you use other actions to facilitate your attacks, such as drawing a weapon, moving so that a target is in reach, and so forth. Your targets are determined randomly by the GM. If you have no other viable targets, you target yourself, automatically hitting but not scoring a critical hit. If it\'s impossible for you to attack or cast spells, you babble incoherently, wasting your actions. Each time you take damage from an attack or spell, you can attempt a DC 11 flat check to recover from your confusion and end the condition.',
    shortDescription: 'Off-guard; attack randomly',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  controlled: {
    name: 'Controlled',
    hasValue: false,
    description: 'You\'ve been commanded or magically dominated, or you otherwise had your will subverted. The controller dictates how you act and can make you use any of your actions, including attacks, reactions, or even Delay. The controller usually doesn\'t have to spend their own actions when controlling you.',
    shortDescription: 'Controller dictates actions',
    effects: {},
    group: 'other',
  },

  dazzled: {
    name: 'Dazzled',
    hasValue: false,
    description: 'Your eyes are overstimulated or your vision is swimming. If vision is your only precise sense, all creatures and objects are concealed from you.',
    shortDescription: 'Everything is concealed',
    effects: {},
    group: 'senses',
  },

  deafened: {
    name: 'Deafened',
    hasValue: false,
    description: 'You can\'t hear. You automatically critically fail Perception checks that require you to be able to hear. You take a –2 status penalty to Perception checks for initiative and checks that involve sound but also rely on other senses. If you perform an action that has the auditory trait, you must succeed at a DC 5 flat check or the action is lost; attempt the check after spending the action but before any effects are applied. You\'re immune to auditory effects while deafened.',
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
    description: 'Your soul has been gripped by a powerful force that calls you closer to death. Doomed always includes a value. The dying value at which you die is reduced by your doomed value. If your maximum dying value is reduced to 0, you instantly die. When you die, you\'re no longer doomed. Your doomed value decreases by 1 each time you get a full night\'s rest.',
    shortDescription: 'Closer to death',
    effects: {},
    group: 'death',
  },

  drained: {
    name: 'Drained',
    hasValue: true,
    description: 'Your health and vitality have been depleted as you\'ve lost blood, life force, or some other essence. Drained always includes a value. You take a status penalty equal to your drained value to Constitution-based rolls and DCs, such as Fortitude saves. You also lose a number of Hit Points equal to your level (minimum 1) times the drained value, and your maximum Hit Points are reduced by the same amount. For example, if you become drained 3 and you\'re a 3rd-level character, you lose 9 Hit Points and reduce your maximum Hit Points by 9. Losing these Hit Points doesn\'t count as taking damage. Each time you get a full night\'s rest, your drained value decreases by 1. This increases your maximum Hit Points, but you don\'t immediately recover the lost Hit Points.',
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
    description: 'You\'re bleeding out or otherwise at death\'s door. While you have this condition, you\'re unconscious. Dying always includes a value, and if it ever reaches dying 4, you die. When you\'re dying, you must attempt a recovery check at the start of your turn each round to determine whether you get better or worse. Your dying condition increases by 1 if you take damage while dying, or by 2 if you take damage from an enemy\'s critical hit or a critical failure on your save. If you lose the dying condition by succeeding at a recovery check and are still at 0 Hit Points, you remain unconscious, but you can wake up as described in that condition. You lose the dying condition automatically and wake up if you ever have 1 Hit Point or more. Any time you lose the dying condition, you gain the wounded 1 condition, or increase your wounded condition value by 1 if you already have that condition.',
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
    description: 'You\'re carrying more weight than you can manage. While you\'re encumbered, you are clumsy 1 and take a 10-foot penalty to all your Speeds. As with all penalties to your Speed, this can\'t reduce your Speed below 5 feet.',
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
    description: 'You\'re physically weakened. Enfeebled always includes a value. When you\'re enfeebled, you take a status penalty equal to the condition value to Strength-based rolls and DCs, including Strength-based melee attack rolls, Strength-based damage rolls, and Athletics checks.',
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
    description: 'You\'re compelled to focus your attention on something, distracting you from whatever else is going on around you. You take a –2 status penalty to Perception and skill checks, and you can\'t use concentrate actions unless they (or their intended consequences) are related to the subject of your fascination, as determined by the GM. For instance, you might be able to Seek and Recall Knowledge about the subject, but you likely couldn\'t cast a spell targeting a different creature. This condition ends if a creature uses hostile actions against you or any of your allies.',
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
    description: 'You are tired and can\'t summon much energy. You take a –1 status penalty to AC and saving throws. You can\'t use exploration activities performed while traveling You recover from fatigue after a full night\'s rest.',
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
    description: 'You\'re forced to run away due to fear or some other compulsion. On your turn, you must spend each of your actions trying to escape the source of the fleeing condition as expediently as possible (such as by using move actions to flee, or opening doors barring your escape). The source is usually the effect or creature that gave you the condition, though some effects might define something else as the source. You can\'t Delay or Ready while fleeing.',
    shortDescription: 'Must flee',
    effects: {},
    group: 'other',
  },

  frightened: {
    name: 'Frightened',
    hasValue: true,
    description: 'You\'re gripped by fear and struggle to control your nerves. The frightened condition always includes a value. You take a status penalty equal to this value to all your checks and DCs. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1.',
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
    description: 'You\'re held in place by another creature, giving you the offguard and immobilized conditions. If you attempt a manipulate action while grabbed, you must succeed at a DC 5 flat check or it\'s lost; roll the check after spending the action, but before any effects are applied.',
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
    description: 'you\'re hidden from a creature, that creature knows the space you\'re in but can\'t tell precisely where you are. You typically become hidden by using Stealth to Hide. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed. A creature you\'re hidden from is off-guard to you, and it must succeed at a DC 11 flat check when targeting you with an attack, spell, or other effect or it fails to affect you. Area effects aren\'t subject to this flat check. A creature might be able to use the Seek action to try to observe you.',
    shortDescription: 'Location known but unseen',
    effects: {},
    group: 'detection',
  },

  immobilized: {
    name: 'Immobilized',
    hasValue: false,
    description: 'You\'re incapable of movement. You can\'t use any actions that have the move trait. If you\'re immobilized by something holding you in place and an external force would move you out of your space, the force must succeed at a check against either the DC of the effect holding you in place or the relevant defense (usually Fortitude DC) of the creature holding you in place.',
    shortDescription: 'Cannot move',
    effects: {
      immobilized: true,
    },
    group: 'other',
  },

  invisible: {
    name: 'Invisible',
    hasValue: false,
    description: 'You can\'t be seen. You\'re undetected to everyone. Creatures can Seek to detect you; if a creature succeeds at its Perception check against your Stealth DC, you become hidden to that creature until you Sneak to become undetected again. If you become invisible while someone can already see you, you start out hidden to them (instead of undetected) until you successfully Sneak. You can\'t become observed while invisible except via special abilities or magic.',
    shortDescription: 'Undetected by all',
    effects: {},
    group: 'detection',
  },

  'off-guard': {
    name: 'Off-Guard',
    hasValue: false,
    description: 'Off-Guard Source Player Core pg. 438 Winter 2025 You\'re distracted or otherwise unable to focus your full attention on defense. You take a –2 circumstance penalty to AC. Some effects give you the off-guard condition only to certain creatures or against certain attacks. Others—especially conditions—can make you off-guard against everything. If a rule doesn\'t specify that the condition applies only to certain circumstances, it applies to all of them, such as “The target is off-guard.”',
    shortDescription: '-2 AC',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  paralyzed: {
    name: 'Paralyzed',
    hasValue: false,
    description: 'You\'re frozen in place. You have the off-guard condition and can\'t act except to Recall Knowledge and use actions that require only your mind (as determined by the GM). Your senses still function, but only in the areas you can perceive without moving, so you can\'t Seek.',
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
    description: 'Persistent Damage Source Player Core pg. 439 Winter 2025 You\'re taking damage from an ongoing effect, such as from being lit on fire. This appears as “X persistent [type] damage,” where “X” is the amount of damage dealt and “[type]” is the damage type. Like normal damage, it can be doubled or halved based on the results of an attack roll or saving throw. Instead of taking persistent damage immediately, you take it at the end of each of your turns as long as you have the condition, rolling any damage dice anew each time. After you take persistent damage, roll a DC 15 flat check to see if you recover from the persistent damage. If you succeed, the condition ends. Persistent Damage Rules The additional rules presented below apply to persistent damage in certain cases. Persistent damage runs its course and automatically ends after a certain amount of time as fire burns out, blood clots, and the like. The GM determines when this occurs, but it usually takes 1 minute. Assisted Recovery You can take steps to help yourself recover from persistent damage, or an ally can help you, allowing you to attempt an additional flat check before the end of your turn. This is usually an activity requiring 2 actions, and it must be something that would reasonably improve your chances (as determined by the GM). For example, you might try to smother a flame or wash off acid. This allows you to attempt an extra flat check immediately, but only once per round. The GM decides how your help works, using the following examples as guidelines when there\'s not a specific action that applies. The action to help might require a skill check or another roll to determine its effectiveness. Reduce the DC of the flat check to 10 for a particularly appropriate type of help, such as dousing you in water to put out flames. Automatically end the condition due to the type of help, such as healing that restores you to your maximum HP to end persistent bleed damage, or submerging yourself in a lake to end persistent fire damage. Alter the number of actions required to help you if the means the helper uses are especially efficient or remarkably inefficient. Immunities, Resistances, And Weaknesses Immunities, resistances, and weaknesses all apply to persistent damage. If an effect deals initial damage in addition to persistent damage, apply immunities, resistances, and weaknesses separately to the initial damage and to the persistent damage. Usually, if an effect negates the initial damage, it also negates the persistent damage, such as with a slashing weapon that also deals persistent bleed damage because it cut you. The GM might rule otherwise in some situations. Multiple Persistent Damage Conditions You can be simultaneously affected by multiple persistent damage conditions so long as they have different damage types. If you would gain more than one persistent damage condition with the same damage type, the higher amount of damage overrides the lower amount. If it\'s unclear which damage would be higher, such as if you\'re already taking 2 persistent fire damage and then begin taking 1d4 persistent fire damage, the GM decides which source of damage would better fit the scene. The damage you take from persistent damage occurs all at once, so if something triggers when you take damage, it triggers only once; for example, if you\'re dying with several types of persistent damage, the persistent damage increases your dying condition only once.',
    shortDescription: 'Ongoing damage each turn',
    effects: {},
    group: 'other',
  },

  petrified: {
    name: 'Petrified',
    hasValue: false,
    description: 'You\'ve been turned to stone. You can\'t act, nor can you sense anything. You become an object with a Bulk double your normal Bulk (typically 12 for a petrified Medium creature or 6 for a petrified Small creature), AC 9, Hardness 8, and the same current Hit Points you had when alive. You don\'t have a Broken Threshold. When the petrified condition ends, you have the same number of Hit Points you had as a statue. If the statue is destroyed, you immediately die. While petrified, your mind and body are in stasis, so you don\'t age or notice the passing of time.',
    shortDescription: 'Turned to stone',
    effects: {
      cannotAct: true,
    },
    group: 'other',
  },

  prone: {
    name: 'Prone',
    hasValue: false,
    description: 'You\'re lying on the ground. You are off-guard and take a –2 circumstance penalty to attack rolls. The only move actions you can use while you\'re prone are Crawl and Stand. Standing up ends the prone condition. You can Take Cover while prone to hunker down and gain greater cover against ranged attacks, even if you don\'t have an object to get behind, which grants you a +4 circumstance bonus to AC against ranged attacks (but you remain off-guard). If you would be knocked prone while you\'re Climbing or Flying, you fall. You can\'t be knocked prone when Swimming.',
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
    description: 'You\'re able to act more quickly. You gain 1 additional action at the start of your turn each round. Many effects that make you quickened require you use this extra action only in certain ways. If you become quickened from multiple sources, you can use the extra action you\'ve been granted for any single action allowed by any of the effects that made you quickened. Because quickened has its effect at the start of your turn, you don\'t immediately gain actions if you become quickened during your turn. Gaining and Losing Actions Quickened, slowed, and stunned are the primary ways you can gain or lose actions on a turn. The rules for how this works appear here. In brief, these conditions alter how many actions you regain at the start of your turn; thus, gaining the condition in the middle of your turn doesn\'t adjust your number of actions on that turn. If you have conflicting conditions that affect your number of actions, you choose which actions you lose. For instance, the action gained from haste lets you only Stride or Strike, so if you need to lose one action because you\'re also slowed, you might decide to lose the action from haste, letting you keep your other actions that can be used more flexibly. Some conditions prevent you from taking a certain subset of actions, typically reactions. Other conditions simply say you can\'t act. When you can\'t act, you\'re unable to take any actions at all. Unlike slowed or stunned, these don\'t change the number of actions you regain; they just prevent you from using them. That means if you\'re somehow cured of paralysis on your turn, you can act immediately.',
    shortDescription: '+1 action per turn',
    effects: {},
    group: 'other',
  },

  restrained: {
    name: 'Restrained',
    hasValue: false,
    description: 'You are tied up and can barely move, or a creature has you pinned. You have the off-guard and immobilized conditions, and you can\'t use any attack or manipulate actions except to attempt to Escape or Force Open your bonds. Restrained overrides grabbed.',
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
    description: 'You feel ill. Sickened always includes a value. You take a status penalty equal to this value on all your checks and DCs. You can\'t willingly ingest anything—including serums—while sickened. You can spend a single action retching in an attempt to recover, which lets you immediately attempt a Fortitude save against the DC of the effect that made you sickened. On a success, you reduce your sickened value by 1 (or by 2 on a critical success).',
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
    description: 'You have fewer actions. Slowed always includes a value. When you regain your actions, reduce the number of actions regained by your slowed value. Because you regain actions at the start of your turn, you don\'t immediately lose actions if you become slowed during your turn. Gaining and Losing Actions Quickened, slowed, and stunned are the primary ways you can gain or lose actions on a turn. The rules for how this works appear here. In brief, these conditions alter how many actions you regain at the start of your turn; thus, gaining the condition in the middle of your turn doesn\'t adjust your number of actions on that turn. If you have conflicting conditions that affect your number of actions, you choose which actions you lose. For instance, the action gained from haste lets you only Stride or Strike, so if you need to lose one action because you\'re also slowed, you might decide to lose the action from haste, letting you keep your other actions that can be used more flexibly. Some conditions prevent you from taking a certain subset of actions, typically reactions. Other conditions simply say you can\'t act. When you can\'t act, you\'re unable to take any actions at all. Unlike slowed or stunned, these don\'t change the number of actions you regain; they just prevent you from using them. That means if you\'re somehow cured of paralysis on your turn, you can act immediately.',
    shortDescription: 'Fewer actions per turn',
    effects: {},
    group: 'other',
  },

  stunned: {
    name: 'Stunned',
    hasValue: true,
    description: 'You\'ve become senseless. You can\'t act. Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns, from being stunned. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost. For example, if you were stunned 4, you would lose all 3 of your actions on your turn, reducing you to stunned 1; on your next turn, you would lose 1 more action, and then be able to use your remaining 2 actions normally. Stunned might also have a duration instead, such as “stunned for 1 minute,” causing you to lose all your actions for the duration. Stunned overrides slowed. If the duration of your stunned condition ends while you\'re slowed, you count the actions lost to the stunned condition toward those lost to being slowed. So, if you were stunned 1 and slowed 2 at the beginning of your turn, you would lose 1 action from stunned, and then lose only 1 additional action by being slowed, so you would still have 1 action remaining to use that turn. Gaining and Losing Actions Quickened, slowed, and stunned are the primary ways you can gain or lose actions on a turn. The rules for how this works appear here. In brief, these conditions alter how many actions you regain at the start of your turn; thus, gaining the condition in the middle of your turn doesn\'t adjust your number of actions on that turn. If you have conflicting conditions that affect your number of actions, you choose which actions you lose. For instance, the action gained from haste lets you only Stride or Strike, so if you need to lose one action because you\'re also slowed, you might decide to lose the action from haste, letting you keep your other actions that can be used more flexibly. Some conditions prevent you from taking a certain subset of actions, typically reactions. Other conditions simply say you can\'t act. When you can\'t act, you\'re unable to take any actions at all. Unlike slowed or stunned, these don\'t change the number of actions you regain; they just prevent you from using them. That means if you\'re somehow cured of paralysis on your turn, you can act immediately.',
    shortDescription: 'Cannot act; lose actions',
    effects: {
      cannotAct: true,
    },
    group: 'other',
  },

  stupefied: {
    name: 'Stupefied',
    hasValue: true,
    description: 'Your thoughts and instincts are clouded. Stupefied always includes a value. You take a status penalty equal to this value on Intelligence-, Wisdom-, and Charisma-based rolls and DCs, including Will saving throws, spell attack modifiers, spell DCs, and skill checks that use these attribute modifiers. Any time you attempt to Cast a Spell while stupefied, the spell is disrupted unless you succeed at a flat check with a DC equal to 5 + your stupefied value.',
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
    description: 'You are sleeping or have been knocked out. You can\'t act. You take a –4 status penalty to AC, Perception, and Reflex saves, and you have the blinded and off-guard conditions. When you gain this condition, you fall prone and drop items you\'re holding unless the effect states otherwise or the GM determines you\'re positioned so you wouldn\'t. If you\'re unconscious because you\'re dying, you can\'t wake up while you have 0 Hit Points. If you\'re restored to 1 Hit Point or more, you lose the dying and unconscious conditions and can act normally on your next turn. If you\'re unconscious and at 0 Hit Points, but not dying, you return to 1 Hit Point and awaken after sufficient time passes. The GM determines how long you remain unconscious, from a minimum of 10 minutes to several hours. If you\'re healed, you lose the unconscious condition and can act normally on your next turn. If you\'re unconscious and have more than 1 Hit Point (typically because you\'re asleep or unconscious due to an effect), you wake up in one of the following ways. You take damage, though if the damage reduces you to 0 Hit Points, you remain unconscious and gain the dying condition as normal. You receive healing, other than the natural healing you get from resting. Someone shakes you awake with an Interact action. Loud noise around you might wake you. At the start of your turn, you automatically attempt a Perception check against the noise\'s DC (or the lowest DC if there\'s more than one noise), waking up if you succeed. If creatures are attempting to stay quiet around you, this Perception check uses their Stealth DCs. Some effects make you sleep so deeply that they don\'t allow you this Perception check. If you\'re simply asleep, the GM decides you wake up either because you\'ve had a restful night\'s sleep or something disrupted that rest.',
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
    description: 'you\'re undetected by a creature, that creature can\'t see you at all, has no idea what space you occupy, and can\'t target you, though you still can be affected by abilities that target an area. When you\'re undetected by a creature, that creature is off-guard to you. A creature you\'re undetected by can guess which square you\'re in to try targeting you. It must pick a square and attempt an attack. This works like targeting a hidden creature (requiring a DC 11 flat check), but the flat check and attack roll are rolled in secret by the GM, who doesn\'t reveal whether the attack missed due to failing the flat check, failing the attack roll, or choosing the wrong square. They can Seek to try to find you.',
    shortDescription: 'Creature unaware of you',
    effects: {},
    group: 'detection',
  },

  wounded: {
    name: 'Wounded',
    hasValue: true,
    description: 'You\'ve been seriously injured. If you lose the dying condition and don\'t already have the wounded condition, you become wounded 1. If you already have the wounded condition when you lose the dying condition, your wounded condition value increases by 1. If you gain the dying condition while wounded, increase your dying condition value by your wounded value. The wounded condition ends if someone successfully restores Hit Points to you using Treat Wounds, or if you are restored to full Hit Points by any means and rest for 10 minutes.',
    shortDescription: 'Increases dying severity',
    effects: {},
    group: 'death',
  },

  // SF2e Specific Conditions
  glitching: {
    name: 'Glitching',
    hasValue: true,
    description: 'A glitching creature, hazard, or object with the tech trait experiences a combination of debilitating effects and moments of seizing up. The glitching condition always includes a value. If you have glitching equipment and take any action involving that equipment, you must attempt a flat check to see what occurs. If you have the glitching condition, you must attempt this flat check at the beginning of each of your turns. The DC of the flat check equals 5 plus your condition value or the item\'s condition value. Critical Success Reduce your glitching value by 1. Success You act as normal or use your equipment as normal. Failure You take an item penalty to all your checks and DCs equal to your glitching value or the glitching value of the item you\'re attempting to use, including saving throws, attack modifiers, and the DCs of abilities, effects, and spells you use. Critical Failure A glitching object you tried to use doesn\'t function, and you lose the actions you took to attempt to use it. A glitching creature uses the same effect as a failure and is also stunned 1. A glitching hazard uses the same effect as a failure.',
    shortDescription: 'Equipment malfunction',
    effects: {
      allChecksPerValue: -1,
    },
    group: 'other',
  },

  suppressed: {
    name: 'Suppressed',
    hasValue: false,
    description: 'You\'ve been affected by a high volume of incoming fire or a particularly dangerous attack that forces you to act less efficiently for your own safety. You take a –1 circumstance penalty to attack rolls and a –10-foot status penalty to all your Speeds.',
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
    description: 'You\'re in a zero gravity (or similar) environment without a means of movement and float without support. You can\'t take move actions unless they specify they can be used in your current environment. At the end of your turn, you move 5 feet in the last direction you moved. You can take the Push Off action (see below) to change directions and the distance moved. Once you gain a means of moving in your environment, you lose this condition. Typically, a creature with the untethered condition in zero-gravity also gains the clumsy 1 and off-guard conditions while untethered.',
    shortDescription: 'Confused; ongoing mental damage',
    effects: {
      offGuard: true,
    },
    group: 'other',
  },

  broken: {
    name: 'Broken',
    hasValue: false,
    description: 'a condition that affects only objects. An object is broken when damage has reduced its Hit Points to equal or less than its Broken Threshold. A broken object can\'t be used for its normal function, nor does it grant bonuses—with the exception of armor. Broken armor still grants its item bonus to AC, but it also imparts a status penalty to AC depending on its category: –1 for broken light armor, –2 for broken medium armor, or –3 for broken heavy armor. A broken item still imposes penalties and limitations normally incurred by carrying, holding, or wearing it. For example, broken armor would still impose its Dexterity modifier cap, check penalty, and so forth. If an effect makes an item broken automatically and the item has more HP than its Broken Threshold, that effect also reduces the item\'s current HP to the Broken Threshold.',
    shortDescription: 'Item cannot function',
    effects: {},
    group: 'other',
  },

  observed: {
    name: 'Observed',
    hasValue: false,
    description: 'you. If a creature takes measures to avoid detection, such as by using Stealth to Hide, it can become hidden or undetected instead of observed. If you have another precise sense besides sight, you might be able to observe a creature or object using that sense instead. You can observe a creature with only your precise senses. When Seeking a creature using only imprecise senses, it remains hidden, rather than observed.',
    shortDescription: 'Clearly visible',
    effects: {},
    group: 'detection',
  },

  unnoticed: {
    name: 'Unnoticed',
    hasValue: false,
    description: 'you\'re unnoticed by a creature, that creature has no idea you\'re present. When you\'re unnoticed, you\'re also undetected. This matters for abilities that can be used only against targets totally unaware of your presence.',
    shortDescription: 'Creature has no idea you exist',
    effects: {},
    group: 'detection',
  },

  friendly: {
    name: 'Friendly',
    hasValue: false,
    description: 'This condition reflects a creature\'s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that\'s friendly to a character likes that character. It\'s likely to agree to Requests from that character as long as they are simple, safe, and don\'t cost too much to fulfill. If the character (or one of their allies) uses hostile actions against the creature, the creature gains a worse attitude condition depending on the severity of the hostile action, as determined by the GM.',
    shortDescription: 'Positively disposed',
    effects: {},
    group: 'attitudes',
  },

  helpful: {
    name: 'Helpful',
    hasValue: false,
    description: 'This condition reflects a creature\'s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that\'s helpful to a character wishes to actively aid that character. It will accept reasonable Requests from that character, as long as such requests aren\'t at the expense of the helpful creature\'s goals or quality of life. If the character (or one of their allies) uses a hostile action against the creature, the creature gains a worse attitude condition depending on the severity of the hostile action, as determined by the GM.',
    shortDescription: 'Will go out of way to help',
    effects: {},
    group: 'attitudes',
  },

  hostile: {
    name: 'Hostile',
    hasValue: false,
    description: 'This condition reflects a creature\'s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature hostile to a character actively seeks to harm that character. It doesn\'t necessarily attack, but it won\'t accept Requests from the character.',
    shortDescription: 'Views you as enemy',
    effects: {},
    group: 'attitudes',
  },

  indifferent: {
    name: 'Indifferent',
    hasValue: false,
    description: 'This condition reflects a creature\'s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that\'s indifferent to a character doesn\'t really care one way or the other about that character. Assume a creature\'s attitude to a given character is indifferent unless specified otherwise.',
    shortDescription: 'Neutral toward you',
    effects: {},
    group: 'attitudes',
  },

  unfriendly: {
    name: 'Unfriendly',
    hasValue: false,
    description: 'This condition reflects a creature\'s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that\'s unfriendly to a character dislikes and distrusts that character. The unfriendly creature won\'t accept Requests from the character.',
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
