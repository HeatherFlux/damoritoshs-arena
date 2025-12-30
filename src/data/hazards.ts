/**
 * Hazard Database for Starfinder 2e / Pathfinder 2e
 *
 * Common hazards from the Archives of Nethys
 */

import type { Hazard } from '../types/hazard'

export const HAZARDS: Hazard[] = [
  // Level 0
  {
    id: 'spike-launcher',
    name: 'Spike Launcher',
    level: 0,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 19',
    stealthDC: 19,
    description: 'A jagged spike of metal shoots from a hidden launcher.',
    disable: 'DC 16 Thievery to disable one of the four launchers or DC 12 Acrobatics to step over a trip line',
    ac: 16,
    saves: { fortitude: 9, reflex: 3 },
    hardness: 3,
    hp: 16,
    bt: 8,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Spike',
      actionType: 'reaction',
      trigger: 'A creature crosses one of the trip lines',
      effect: 'A spike launches along the trip line\'s path against the triggering creature, making a ranged Strike.',
      damage: '2d6+3 piercing',
      damageType: 'piercing'
    }],
    source: 'Pathfinder #163: Ruins of Gauntlight'
  },
  {
    id: 'animal-pit',
    name: 'Animal Pit',
    level: 0,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 18',
    stealthDC: 18,
    description: 'A covered pit contains a dangerous animal that attacks anyone who falls in.',
    disable: 'DC 15 Thievery to jam the pit cover',
    ac: 10,
    hp: 20,
    actions: [{
      name: 'Pitfall',
      actionType: 'reaction',
      trigger: 'A creature walks onto the pit cover',
      effect: 'The triggering creature falls into the pit, taking falling damage and landing prone. An animal in the pit attacks.',
      damage: '1d6 falling plus animal attack'
    }],
    source: 'Core Rulebook'
  },
  // Level 1
  {
    id: 'hidden-crossbow-trap',
    name: 'Hidden Crossbow Trap',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 20',
    stealthDC: 20,
    description: 'A crossbow mounted behind a wall fires through a small hole when triggered.',
    disable: 'DC 17 Thievery (trained) to disable the trigger',
    ac: 18,
    saves: { fortitude: 7, reflex: 5 },
    hardness: 5,
    hp: 22,
    bt: 11,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Arrow',
      actionType: 'reaction',
      trigger: 'A creature enters the trap\'s trigger area',
      effect: 'The trap fires a crossbow bolt at the triggering creature.',
      damage: '1d8+4 piercing',
      damageType: 'piercing'
    }],
    source: 'Core Rulebook'
  },
  {
    id: 'falling-debris',
    name: 'Falling Debris',
    level: 1,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental'],
    stealth: 'DC 17',
    stealthDC: 17,
    description: 'Loose rubble or construction materials fall when disturbed.',
    disable: 'DC 15 Athletics to shore up the area or DC 17 Thievery to trigger safely',
    actions: [{
      name: 'Collapse',
      actionType: 'reaction',
      trigger: 'A creature enters the area or makes a loud noise',
      effect: 'Debris falls on creatures in a 10-foot area.',
      damage: '2d6 bludgeoning',
      damageType: 'bludgeoning',
      dc: 17,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  // Level 2
  {
    id: 'envenomed-thorns-trap',
    name: 'Envenomed Thorns Trap',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap', 'poison'],
    stealth: 'DC 21',
    stealthDC: 21,
    description: 'Poisoned thorns spring out from a concealed mechanism.',
    disable: 'DC 18 Thievery (trained) to disable the trigger',
    ac: 18,
    saves: { fortitude: 8, reflex: 6 },
    hardness: 4,
    hp: 24,
    bt: 12,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Poisoned Thorns',
      actionType: 'reaction',
      trigger: 'A creature steps on or touches the trigger',
      effect: 'Poisoned thorns stab the triggering creature.',
      damage: '2d8 piercing plus poison',
      damageType: 'piercing',
      dc: 18,
      save: 'fortitude'
    }],
    source: 'Core Rulebook'
  },
  {
    id: 'pouncing-tiger-haunt',
    name: 'Pouncing Tiger Haunt',
    level: 2,
    complexity: 'simple',
    type: 'haunt',
    traits: ['haunt'],
    stealth: 'DC 20',
    stealthDC: 20,
    description: 'The ghostly form of a tiger leaps at intruders.',
    disable: 'DC 18 Religion (trained) to put the spirit to rest or DC 20 Occultism to banish it',
    actions: [{
      name: 'Spectral Pounce',
      actionType: 'reaction',
      trigger: 'A creature enters the haunt\'s area',
      effect: 'A spectral tiger pounces on the triggering creature.',
      damage: '2d6+4 negative',
      damageType: 'negative',
      dc: 18,
      save: 'will'
    }],
    reset: 'The haunt resets after 1 hour.',
    source: 'Core Rulebook'
  },
  // Level 3
  {
    id: 'dart-barrage',
    name: 'Dart Barrage',
    level: 3,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 22',
    stealthDC: 22,
    description: 'Multiple darts fire from hidden launchers in the walls.',
    disable: 'DC 20 Thievery (trained) to disable each launcher (4 total)',
    ac: 20,
    saves: { fortitude: 10, reflex: 8 },
    hardness: 6,
    hp: 30,
    bt: 15,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Dart Storm',
      actionType: 'reaction',
      trigger: 'A creature enters the trap\'s trigger zone',
      effect: 'Darts fire at all creatures in a 20-foot area.',
      damage: '3d6 piercing',
      damageType: 'piercing',
      dc: 20,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  {
    id: 'summoning-rune',
    name: 'Summoning Rune',
    level: 3,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'trap'],
    stealth: 'DC 23',
    stealthDC: 23,
    description: 'A magical rune summons a creature when triggered.',
    disable: 'DC 20 Thievery (expert) to erase the rune without triggering it or Dispel Magic (2nd level)',
    actions: [{
      name: 'Summon',
      actionType: 'reaction',
      trigger: 'A creature enters the rune\'s area',
      effect: 'The rune summons a creature (typically a level 1-2 monster) that attacks intruders for 1 minute.',
    }],
    source: 'Core Rulebook'
  },
  // Level 4
  {
    id: 'scythe-blades',
    name: 'Scythe Blades',
    level: 4,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 23 (trained)',
    stealthDC: 23,
    description: 'Two blades, each hidden in a 15-foot-long ceiling groove, are both connected to a trip wire.',
    disable: 'DC 21 Thievery (trained) to disable each blade',
    ac: 21,
    saves: { fortitude: 12, reflex: 8 },
    hardness: 11,
    hp: 44,
    bt: 22,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Falling Scythes',
      actionType: 'reaction',
      trigger: 'The trip wire is pulled or severed',
      effect: 'Both blades swing down, each one attacking all creatures under the ceiling grooves.',
      damage: '2d12+4 slashing (deadly d12)',
      damageType: 'slashing'
    }],
    reset: 'The trap resets after 15 minutes.',
    source: 'Core Rulebook'
  },
  {
    id: 'spiky-pit-trap',
    name: 'Spiky Pit Trap',
    level: 4,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 23 (trained)',
    stealthDC: 23,
    description: 'A covered pit lined with metal spikes.',
    disable: 'DC 21 Thievery (trained) to jam the cover',
    ac: 21,
    hp: 40,
    bt: 20,
    actions: [{
      name: 'Spiked Pitfall',
      actionType: 'reaction',
      trigger: 'A creature walks onto the pit cover',
      effect: 'The triggering creature falls 20 feet into the spiked pit.',
      damage: '2d6 falling plus 2d8 piercing from spikes',
      damageType: 'piercing',
      dc: 21,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  // Level 5
  {
    id: 'gas-trap',
    name: 'Gas Trap',
    level: 5,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'trap', 'poison'],
    stealth: '+14 (trained)',
    stealthDC: 24,
    description: 'A spring slams and locks the room\'s door before four hidden gas vents begin pumping poison gas into the chamber.',
    disable: 'Four DC 20 Thievery checks to block the gas vents, or DC 26 Thievery to unlock the door',
    hardness: 13,
    hp: 52,
    bt: 26,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Toxic Gas',
      actionType: 'reaction',
      trigger: 'A creature opens one of the drawers',
      effect: 'The door slams shut and locks. The trap rolls initiative.'
    }],
    routine: 'Each round, the trap pumps more toxic gas into the room. Any breathing creature in the room takes 4d6 poison damage (DC 22 Fortitude half). Blocking one vent reduces damage by 1d6.',
    reset: 'The trap must be manually rearmed.',
    source: 'Pathfinder #157: Devil at the Dreaming Palace'
  },
  {
    id: 'prism-ray-trap',
    name: 'Prism Ray Trap',
    level: 5,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'trap', 'light'],
    stealth: 'DC 24 (trained)',
    stealthDC: 24,
    description: 'A magical prism fires a beam of concentrated light.',
    disable: 'DC 22 Thievery (trained) to cover the prism or DC 24 Arcana to suppress the magic',
    ac: 22,
    saves: { reflex: 10 },
    hardness: 8,
    hp: 36,
    bt: 18,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Prismatic Beam',
      actionType: 'reaction',
      trigger: 'A creature crosses the beam\'s path',
      effect: 'The prism fires a beam at the triggering creature.',
      damage: '4d6 fire',
      damageType: 'fire',
      dc: 22,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  // Level 6
  {
    id: 'hallucination-powder-trap',
    name: 'Hallucination Powder Trap',
    level: 6,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap', 'poison', 'mental'],
    stealth: 'DC 25 (expert)',
    stealthDC: 25,
    description: 'A pressure plate releases a cloud of hallucinogenic powder.',
    disable: 'DC 24 Thievery (expert) to disable the pressure plate',
    actions: [{
      name: 'Hallucinogenic Cloud',
      actionType: 'reaction',
      trigger: 'A creature steps on the pressure plate',
      effect: 'A 15-foot cloud of hallucinogenic powder is released. Creatures in the area must save.',
      damage: 'Confused for 1d4 rounds on failed save',
      dc: 24,
      save: 'fortitude'
    }],
    source: 'Core Rulebook'
  },
  {
    id: 'explosive-crystal-spheres',
    name: 'Explosive Crystal Spheres',
    level: 6,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'trap', 'fire'],
    stealth: 'DC 25 (expert)',
    stealthDC: 25,
    description: 'Crystal spheres shatter and explode when disturbed.',
    disable: 'DC 23 Thievery (expert) to carefully remove the spheres or DC 25 Arcana to drain their magic',
    ac: 23,
    hp: 30,
    bt: 15,
    weaknesses: [{ type: 'sonic', value: 10 }],
    actions: [{
      name: 'Crystal Explosion',
      actionType: 'reaction',
      trigger: 'A creature touches or disturbs the spheres',
      effect: 'The spheres explode in a 20-foot burst.',
      damage: '4d8 fire plus 4d8 piercing',
      damageType: 'fire',
      dc: 24,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  // Level 7
  {
    id: 'boulder-deadfall-trap',
    name: 'Boulder Deadfall Trap',
    level: 7,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 26 (expert)',
    stealthDC: 26,
    description: 'A massive boulder drops from the ceiling when triggered.',
    disable: 'DC 25 Thievery (expert) to jam the release mechanism',
    ac: 25,
    hp: 60,
    bt: 30,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Crushing Boulder',
      actionType: 'reaction',
      trigger: 'A creature enters the trap\'s area',
      effect: 'A boulder drops, crushing creatures in a 10-foot area.',
      damage: '6d10 bludgeoning',
      damageType: 'bludgeoning',
      dc: 25,
      save: 'reflex'
    }],
    source: 'Core Rulebook'
  },
  {
    id: 'falling-portcullis-trap',
    name: 'Falling Portcullis Trap',
    level: 7,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 26 (expert)',
    stealthDC: 26,
    description: 'A heavy iron portcullis drops to trap or crush creatures.',
    disable: 'DC 24 Thievery (expert) to jam the portcullis or DC 28 Athletics to hold it up',
    ac: 25,
    saves: { fortitude: 16 },
    hardness: 14,
    hp: 56,
    bt: 28,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Portcullis Drop',
      actionType: 'reaction',
      trigger: 'A creature passes under the portcullis',
      effect: 'The portcullis drops, potentially trapping or crushing the triggering creature.',
      damage: '5d8 bludgeoning and restrained',
      damageType: 'bludgeoning',
      dc: 25,
      save: 'reflex'
    }],
    reset: 'The portcullis must be manually raised (DC 28 Athletics).',
    source: 'Core Rulebook'
  },
  // Level 8
  {
    id: 'flame-jet-trap',
    name: 'Flame Jet Trap',
    level: 8,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap', 'fire'],
    stealth: 'DC 28 (expert)',
    stealthDC: 28,
    description: 'Jets of flame burst from concealed nozzles in the floor.',
    disable: 'DC 26 Thievery (expert) to block each of the four nozzles',
    ac: 26,
    saves: { reflex: 14 },
    hardness: 10,
    hp: 50,
    bt: 25,
    immunities: ['critical hits', 'fire', 'precision damage'],
    actions: [{
      name: 'Flame Burst',
      actionType: 'reaction',
      trigger: 'A creature enters the trap\'s area',
      effect: 'Flames burst from the floor in a 30-foot line.',
      damage: '6d6 fire plus 2d6 persistent fire',
      damageType: 'fire',
      dc: 26,
      save: 'reflex'
    }],
    reset: 'The trap resets after 1 minute.',
    source: 'Core Rulebook'
  },
  // Level 10
  {
    id: 'crushing-walls-trap',
    name: 'Crushing Walls Trap',
    level: 10,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: '+22 (master)',
    stealthDC: 32,
    description: 'The walls of the room begin slowly closing in to crush everything within.',
    disable: 'DC 30 Thievery (master) to jam the mechanism, or DC 32 Athletics to hold the walls apart (requires 2 successful checks)',
    ac: 30,
    saves: { fortitude: 22 },
    hardness: 18,
    hp: 100,
    bt: 50,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Seal and Crush',
      actionType: 'reaction',
      trigger: 'A creature steps on the central pressure plate',
      effect: 'Doors seal and the trap rolls initiative.'
    }],
    routine: 'The walls move 5 feet closer each round. Creatures caught between walls take 6d10 bludgeoning damage (DC 30 Reflex half) and are restrained. After 6 rounds, the walls meet and creatures are crushed (20d10 bludgeoning, DC 30 Reflex for half).',
    reset: 'The trap must be manually reset (1 hour of work).',
    source: 'Core Rulebook'
  },

  // === STARFINDER 2E TECH HAZARDS ===

  // Level 1
  {
    id: 'laser-tripwire',
    name: 'Laser Tripwire',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    traits: ['technological', 'trap'],
    stealth: 'DC 20',
    stealthDC: 20,
    description: 'An invisible laser beam triggers an alarm or attack when broken.',
    disable: 'DC 17 Computers to hack the control panel or DC 18 Thievery to redirect the beam',
    ac: 18,
    saves: { reflex: 8 },
    hardness: 4,
    hp: 20,
    bt: 10,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Laser Burst',
      actionType: 'reaction',
      trigger: 'A creature breaks the laser beam',
      effect: 'A concealed laser emitter fires at the triggering creature.',
      damage: '2d4 fire',
      damageType: 'fire'
    }],
    source: 'Starfinder 2e'
  },
  // Level 2
  {
    id: 'electrified-floor',
    name: 'Electrified Floor',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    traits: ['technological', 'trap', 'electricity'],
    stealth: 'DC 21',
    stealthDC: 21,
    description: 'Metal floor panels are charged with electricity when triggered.',
    disable: 'DC 19 Computers to disable the power or DC 18 Thievery to ground the panels',
    actions: [{
      name: 'Shock',
      actionType: 'reaction',
      trigger: 'A creature steps on the floor without the proper keycard',
      effect: 'Electricity courses through the floor.',
      damage: '2d6 electricity',
      damageType: 'electricity',
      dc: 18,
      save: 'reflex'
    }],
    reset: 'The trap resets automatically after 1 round.',
    source: 'Starfinder 2e'
  },
  // Level 3
  {
    id: 'security-turret',
    name: 'Security Turret',
    level: 3,
    complexity: 'complex',
    type: 'trap',
    traits: ['technological', 'trap'],
    stealth: '+12 (trained)',
    stealthDC: 22,
    description: 'An automated turret emerges from the ceiling and fires at intruders.',
    disable: 'DC 20 Computers to hack the turret or DC 22 Thievery to disable the targeting system',
    ac: 20,
    saves: { fortitude: 10, reflex: 12 },
    hardness: 8,
    hp: 40,
    bt: 20,
    immunities: ['critical hits', 'precision damage', 'mental'],
    actions: [{
      name: 'Deploy',
      actionType: 'reaction',
      trigger: 'A creature enters without proper authorization',
      effect: 'The turret deploys and rolls initiative.'
    }],
    routine: 'The turret makes two ranged Strikes against the nearest unauthorized creature. Ranged laser +14, Damage 2d6+2 fire.',
    reset: 'The turret retracts and resets 1 minute after all targets leave.',
    source: 'Starfinder 2e'
  },
  // Level 4
  {
    id: 'containment-field',
    name: 'Containment Field',
    level: 4,
    complexity: 'simple',
    type: 'trap',
    traits: ['technological', 'trap', 'force'],
    stealth: 'DC 23 (trained)',
    stealthDC: 23,
    description: 'A force field projects around intruders, trapping them in place.',
    disable: 'DC 22 Computers to override the field or destroy the projectors (AC 21, HP 30)',
    ac: 21,
    hp: 30,
    bt: 15,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Containment',
      actionType: 'reaction',
      trigger: 'A creature enters the designated area',
      effect: 'A force field surrounds the triggering creature, restraining them. DC 22 Reflex to avoid.',
      dc: 22,
      save: 'reflex'
    }],
    reset: 'The field deactivates after 1 minute or when disabled.',
    source: 'Starfinder 2e'
  },
  // Level 5
  {
    id: 'plasma-vent',
    name: 'Plasma Vent',
    level: 5,
    complexity: 'simple',
    type: 'trap',
    traits: ['technological', 'trap', 'fire'],
    stealth: 'DC 24 (trained)',
    stealthDC: 24,
    description: 'Vents in the walls release superheated plasma when triggered.',
    disable: 'DC 23 Computers to shut down the plasma system or DC 22 Thievery to block the vents',
    actions: [{
      name: 'Plasma Burst',
      actionType: 'reaction',
      trigger: 'A creature enters the area or trips a sensor',
      effect: 'Plasma erupts from the vents in a 20-foot cone.',
      damage: '4d6 fire plus 1d6 persistent fire',
      damageType: 'fire',
      dc: 22,
      save: 'reflex'
    }],
    reset: 'The trap resets after 1 minute.',
    source: 'Starfinder 2e'
  },
  // Level 6
  {
    id: 'neural-scrambler',
    name: 'Neural Scrambler',
    level: 6,
    complexity: 'simple',
    type: 'trap',
    traits: ['technological', 'trap', 'mental', 'incapacitation'],
    stealth: 'DC 25 (expert)',
    stealthDC: 25,
    description: 'A hidden device emits frequencies that scramble neural patterns.',
    disable: 'DC 24 Computers to disable or DC 25 Thievery to remove the power cell',
    actions: [{
      name: 'Neural Pulse',
      actionType: 'reaction',
      trigger: 'A creature enters the affected area',
      effect: 'A pulse of neural-disrupting energy affects all creatures in a 15-foot burst.',
      damage: 'Stunned 1 (Stunned 3 on critical failure)',
      dc: 24,
      save: 'will'
    }],
    source: 'Starfinder 2e'
  },
  // Level 8
  {
    id: 'antimatter-containment-breach',
    name: 'Antimatter Containment Breach',
    level: 8,
    complexity: 'complex',
    type: 'environmental',
    traits: ['technological', 'environmental'],
    stealth: '+18 (expert)',
    stealthDC: 28,
    description: 'A damaged antimatter containment unit begins leaking dangerous radiation and risks explosion.',
    disable: 'DC 28 Computers to reinitialize containment or DC 26 Crafting to repair the breach (3 successful checks required)',
    hp: 80,
    bt: 40,
    immunities: ['critical hits', 'precision damage'],
    actions: [{
      name: 'Containment Warning',
      actionType: 'reaction',
      trigger: 'The containment unit takes damage or loses power',
      effect: 'Alarms blare and the hazard rolls initiative. Explosion in 5 rounds.'
    }],
    routine: 'Each round, creatures within 30 feet take 3d6 radiation damage (DC 26 Fortitude half). The countdown decreases by 1. At 0, the unit explodes for 10d6 fire damage in a 60-foot burst (DC 28 Reflex half).',
    reset: 'Requires complete replacement of the antimatter containment unit.',
    source: 'Starfinder 2e'
  },

  // === GM CORE SIMPLE HAZARDS ===

  // Level 0
  {
    id: 'anti-gravity-pulse',
    name: 'Anti-Gravity Pulse',
    level: 0,
    complexity: 'simple',
    type: 'trap',
    traits: ['tech', 'trap'],
    stealth: 'DC 13',
    stealthDC: 13,
    description: 'A harmful pulse of anti-gravity is activated by a sensor that detects motion within 30 feet.',
    disable: 'DC 18 Computers (trained) to jam the motion detector\'s signal or DC 16 Thievery (trained) to deactivate the motion detector',
    actions: [{
      name: 'Gravity Pulse',
      actionType: 'reaction',
      trigger: 'A creature enters the sensor\'s detection area',
      effect: 'The trap releases a gravity pulse, dealing 2d6+3 force damage to the triggering creature (DC 15 basic Reflex save). The area within 30 feet of the sensor then becomes zero gravity for 1 minute.',
      damage: '2d6+3 force',
      damageType: 'force',
      dc: 15,
      save: 'reflex'
    }],
    reset: 'The trap resets after 15 minutes.',
    source: 'GM Core'
  },
  {
    id: 'caustic-nectar-spray',
    name: 'Caustic Nectar Spray',
    level: 0,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental'],
    stealth: 'DC 16',
    stealthDC: 16,
    description: 'An alien flower sprays a stream of caustic nectar.',
    disable: 'DC 13 Nature (trained) to lull the flower into a passive state, or DC 13 Survival (trained) to mislead the flower\'s senses; DC 16 Acrobatics to move by the flower without triggering it (this doesn\'t disable the trap)',
    ac: 16,
    saves: { fortitude: 9, reflex: 3 },
    hp: 20,
    immunities: ['acid', 'mental'],
    actions: [{
      name: 'Nectar Spray',
      actionType: 'reaction',
      trigger: 'A creature comes within 15 feet of the flower',
      effect: 'The flower makes a nectar Strike against the triggering creature. Ranged nectar +11 (acid, range increment 15 feet), Damage 2d6+3 acid.',
      damage: '2d6+3 acid',
      damageType: 'acid'
    }],
    reset: 'The flower\'s nectar reserve is refilled after 1 hour.',
    source: 'GM Core'
  },
  {
    id: 'phantom-communication',
    name: 'Phantom Communication',
    level: 0,
    complexity: 'simple',
    type: 'haunt',
    traits: ['haunt'],
    stealth: 'DC 16 (trained) to notice strange static',
    stealthDC: 16,
    description: 'Angry spirits utter haunting threats and condemnations through a nearby comm unit.',
    disable: 'DC 15 Religion (trained) to banish the spirits, or DC 18 Performance to drown out the spirits\' voices, or DC 16 Computers (trained) to disperse the ghostly signal',
    actions: [{
      name: 'Threatening Message',
      actionType: 'reaction',
      trigger: 'A creature with a comm unit enters the haunt\'s area',
      effect: 'The haunt utters threats through the triggering comm unit, dealing 1d6+4 mental damage to creatures within 20 feet of the comm unit (DC 19 basic Will save). On a failure, the creature is also frightened 1.',
      damage: '1d6+4 mental',
      damageType: 'mental',
      dc: 19,
      save: 'will'
    }],
    reset: '1 hour',
    source: 'GM Core'
  },
  // Level 1
  {
    id: 'venting-airlock',
    name: 'Venting Airlock',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 14 (trained)',
    stealthDC: 14,
    description: 'A malfunctioning airlock opens unexpectedly while creatures are inside.',
    disable: 'DC 17 Crafting (trained) to repair the airlock, or DC 17 Thievery (trained) to jam the airlock closed',
    actions: [{
      name: 'Vent',
      actionType: 'reaction',
      trigger: 'One or more creatures enters the airlock compartment',
      effect: 'The outer airlock door opens, venting breathable air out into the vacuum or harmful atmosphere beyond. The creature begins suffocating and must attempt a DC 20 Reflex save. Success: unaffected. Failure: sucked 10 feet out and takes 2d6 bludgeoning. Critical Failure: sucked 10 feet out and takes 4d6 bludgeoning.',
      damage: '2d6-4d6 bludgeoning',
      damageType: 'bludgeoning',
      dc: 20,
      save: 'reflex'
    }],
    source: 'GM Core'
  },
  // Level 2
  {
    id: 'explosive-overload',
    name: 'Explosive Overload',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 14',
    stealthDC: 14,
    description: 'A generator, engine, or other large immobile device overloads and is moments from catastrophically exploding.',
    disable: 'DC 19 Crafting (trained) to safely shut down the device, or DC 21 Thievery (trained) to quickly vent the device',
    actions: [{
      name: 'Explode',
      actionType: 'reaction',
      trigger: 'A creature moves within 30 feet of the device',
      effect: 'The trap makes a loud noise. At the end of the next round, the device explodes, dealing 2d6+5 piercing damage to all creatures within 15 feet of the device (DC 18 basic Reflex save). This explosion destroys the device.',
      damage: '2d6+5 piercing',
      damageType: 'piercing',
      dc: 18,
      save: 'reflex'
    }],
    source: 'GM Core'
  },
  {
    id: 'tranquilizer-darts-trap',
    name: 'Tranquilizer Darts Trap',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: 'DC 21 (trained)',
    stealthDC: 21,
    description: 'Weight-sensitive pressure plates in the floor trigger a hole at the hallway\'s end to fire tranquilizer darts at creatures in the hall.',
    disable: 'DC 18 Crafting (trained) or Thievery (trained) to disable the pressure plates',
    actions: [{
      name: 'Dart Volley',
      actionType: 'reaction',
      trigger: 'A creature steps on a pressure plate',
      effect: 'The trap makes a tranquilizer dart Strike against up to three creatures in the hall. Ranged tranquilizer dart +14, Damage 1d6 piercing and 1d6 poison plus tranquilizer. Tranquilizer (incapacitation, poison): Saving Throw DC 18 Fortitude, Maximum Duration 4 rounds; Stage 1 clumsy 1 (1 round); Stage 2 clumsy 1 and stunned 1 (1 round); Stage 3 clumsy 2 and asleep for 1 minute.',
      damage: '1d6 piercing + 1d6 poison + tranquilizer',
      damageType: 'piercing'
    }],
    source: 'GM Core'
  },
  // Level 3
  {
    id: 'laser-web',
    name: 'Laser Web',
    level: 3,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'tech', 'trap'],
    stealth: 'DC 15 (trained)',
    stealthDC: 15,
    description: 'Six sensors concealed in a 15-foot-long corridor fire lasers when they detect movement.',
    disable: 'DC 15 Computers (trained) or Thievery (trained) to disable each sensor, or DC 23 Acrobatics (expert) to slip past each sensor',
    ac: 22,
    saves: { fortitude: 12, reflex: 6 },
    hardness: 4,
    hp: 7,
    bt: 3,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Laser Web',
      actionType: 'reaction',
      trigger: 'A creature moves within 5 feet of a sensor',
      effect: 'The lasers fire, each one Striking a creature in the hallway. If there are more creatures than lasers, the lasers prioritize the triggering creature or creatures; if there are fewer creatures than lasers, the lasers prioritize Striking the triggering creature or creatures multiple times. Melee laser +16, Damage 2d10+7 fire; no multiple attack penalty.',
      damage: '2d10+7 fire',
      damageType: 'fire'
    }],
    reset: 'The trap resets after 15 minutes.',
    source: 'GM Core'
  },
  // Level 4
  {
    id: 'jolting-console',
    name: 'Jolting Console',
    level: 4,
    complexity: 'simple',
    type: 'trap',
    traits: ['electricity', 'tech', 'trap'],
    stealth: 'DC 22 (trained)',
    stealthDC: 22,
    description: 'A shock grid built into a computer console or door panel releases a powerful electric charge.',
    disable: 'DC 16 Computers (trained) to disable the console\'s programming, or DC 17 Crafting (trained) to rewire the shock grid, or DC 18 Thievery (trained) to deactivate the shock grid',
    actions: [{
      name: 'Jolt',
      actionType: 'reaction',
      trigger: 'A creature grasps the console directly or with a tool',
      effect: 'The trap deals 5d8 electricity damage to the triggering creature and creatures within 5 feet of the triggering creature (DC 25 basic Reflex save).',
      damage: '5d8 electricity',
      damageType: 'electricity',
      dc: 25,
      save: 'reflex'
    }],
    source: 'GM Core'
  },
  {
    id: 'psychotropic-spores',
    name: 'Psychotropic Spores',
    level: 4,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental'],
    stealth: 'DC 25 (trained)',
    stealthDC: 25,
    description: 'A colorful fungus releases psychotropic spores when a creature comes near.',
    disable: 'DC 20 Nature (trained) to force the fungus into a dormant state, or DC 22 Survival (trained) to safely remove the fungus',
    ac: 18,
    saves: { fortitude: 12, reflex: 8 },
    hp: 60,
    bt: 30,
    immunities: ['mental'],
    actions: [{
      name: 'Release Spores',
      actionType: 'reaction',
      trigger: 'A creature touches or damages the fungus',
      effect: 'The fungus releases psychotropic spores in a 30-foot emanation. All creatures in the area must succeed at a DC 21 Will save or be confused for 1 round and stupefied 1 for 10 minutes (stupefied 2 on a critical failure). Mind-Numbing Spores (aura, poison) 5 feet: Creatures in the aura take a –2 circumstance penalty to saves against poison.',
      dc: 21,
      save: 'will'
    }],
    reset: 'Dormant fungus reactivates in 1 hour; destroyed fungus regrows over the course of 2 weeks.',
    source: 'GM Core'
  },
  // Level 6
  {
    id: 'haywire-robotic-arm',
    name: 'Haywire Robotic Arm',
    level: 6,
    complexity: 'simple',
    type: 'trap',
    traits: ['mechanical', 'tech', 'trap'],
    stealth: 'DC 18',
    stealthDC: 18,
    description: 'A robotic manufacturing arm malfunctions, attacking nearby creatures.',
    disable: 'DC 20 Computers (trained) to debug the malfunctioning arm, or DC 25 Crafting (trained) to cause the arm\'s joints to seize, or DC 23 Thievery (trained) to disable the arm',
    ac: 24,
    saves: { fortitude: 11, reflex: 17 },
    hardness: 12,
    hp: 58,
    bt: 29,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    weaknesses: [{ type: 'electricity', value: 10 }],
    actions: [{
      name: 'Manufacture',
      actionType: 'reaction',
      trigger: 'A creature moves within reach of the robotic arm',
      effect: 'The trap makes an arm Strike against the triggering creature, then Grabs (+17 Athletics). A creature grabbed by the trap takes 1d6 persistent bludgeoning damage until they Escape (DC 27) or the trap is deactivated or destroyed. Melee arm +20 (reach 10 feet), Damage 4d6+15 bludgeoning plus Grab.',
      damage: '4d6+15 bludgeoning plus Grab',
      damageType: 'bludgeoning'
    }],
    source: 'GM Core'
  },
  {
    id: 'traumatic-moment',
    name: 'Traumatic Moment',
    level: 6,
    complexity: 'simple',
    type: 'haunt',
    traits: ['haunt'],
    stealth: 'DC 21 (expert)',
    stealthDC: 21,
    description: 'A psychic imprint of a horrific event replays in vivid detail.',
    disable: 'DC 28 Occultism (expert) or Religion (expert) to cleanse the area',
    actions: [{
      name: 'Jump Scare',
      actionType: 'reaction',
      trigger: 'A creature moves within 10 feet of the haunted area',
      effect: 'The haunt replays the traumatic moment that created it, vividly assaulting the creature\'s senses as though the creature was experiencing the event. The creature must attempt a DC 24 Will save. Critical Success: unaffected. Success: 2d8+5 mental damage and frightened 1. Failure: 4d8+10 mental damage and frightened 2. Critical Failure: 8d8+20 mental damage and frightened 3.',
      damage: '2d8+5 to 8d8+20 mental',
      damageType: 'mental',
      dc: 24,
      save: 'will'
    }],
    source: 'GM Core'
  },
  // Level 7
  {
    id: 'exploding-egg-sac',
    name: 'Exploding Egg Sac',
    level: 7,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental'],
    stealth: 'DC 21',
    stealthDC: 21,
    description: 'An ovular alien egg sac emerges from the ground or other surface; pulsing, veinlike filaments cover all surfaces in a 30-foot radius around the egg sac.',
    disable: 'DC 30 Nature (trained) to cause the egg sac to implode, or DC 23 Survival (expert) to safely destroy the filaments in an adjacent square',
    ac: 22,
    saves: { fortitude: 18, reflex: 12 },
    hardness: 14,
    hp: 60,
    bt: 30,
    immunities: ['mental'],
    actions: [{
      name: 'Explode',
      actionType: 'reaction',
      trigger: 'A creature touches the egg sac or touches a filament',
      effect: 'The trap makes a filament Strike against all creatures within 30 feet of the egg sac, then the egg sac explodes, dealing 2d10+9 acid damage to all creatures within 30 feet (DC 29 basic Reflex save). If the creature within the egg sac is viable, it hatches. Melee filament +18, Damage 2d10+9 slashing; no multiple attack penalty.',
      damage: '2d10+9 slashing + 2d10+9 acid',
      damageType: 'acid'
    }],
    reset: 'If the egg sac survives and hasn\'t hatched, filaments regrow in 1 day.',
    source: 'GM Core'
  },
  // Level 8
  {
    id: 'vision-of-manifold-realities',
    name: 'Vision of Manifold Realities',
    level: 8,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'mental', 'trap'],
    stealth: 'DC 31 (expert) or detect magic',
    stealthDC: 31,
    description: 'Wisps of reality-warping magic that flit through the room are drawn to intelligent creatures, filling their minds with visions of countless alternate realities.',
    disable: 'DC 26 Arcana (expert) to banish the visions, or DC 28 Occultism (expert) to exert your will over the visions, or dispel magic (4th rank; counteract DC 24) to counteract the visions',
    actions: [{
      name: 'Glimpse Manifold Realities',
      actionType: 'reaction',
      trigger: 'An intelligent creature enters the area',
      effect: 'The trap deals 4d8+18 mental damage to all intelligent creatures who can perceive the visions (DC 26 basic Will save). Creatures who critically fail additionally lose themselves in the visions, becoming confused for 1d4 rounds.',
      damage: '4d8+18 mental',
      damageType: 'mental',
      dc: 26,
      save: 'will'
    }],
    reset: '1 day',
    source: 'GM Core'
  },
  // Level 9
  {
    id: 'monument-to-the-devourer',
    name: 'Monument to the Devourer',
    level: 9,
    complexity: 'simple',
    type: 'haunt',
    traits: ['haunt'],
    stealth: 'DC 10',
    stealthDC: 10,
    description: 'This shrine has long served as an altar for sacrificial rites and foul magic. When non-believers approach the monument, the souls of all those killed here surge out to reap their lives.',
    disable: 'DC 33 Deception (master) to pose as a believer and command the monument to still, or DC 30 Religion (expert) to pray to the gods for protection, or DC 30 Occultism (expert) to soothe the trapped spirits; two successes are required to disable it',
    ac: 28,
    saves: { fortitude: 21, reflex: 15 },
    hardness: 18,
    hp: 80,
    bt: 40,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    weaknesses: [{ type: 'holy', value: 10 }, { type: 'spirit', value: 10 }, { type: 'vitality', value: 10 }],
    actions: [{
      name: 'Surge of Trapped Souls',
      actionType: 'reaction',
      trigger: 'A living creature moves within 15 feet of the monument',
      effect: 'The souls of all those killed by this monument surge outward, dealing 4d10+22 void damage to all living creatures within 60 feet of the monument (DC 28 basic Fortitude save). Creatures killed by this haunt have their soul trapped in the monument until the monument is destroyed.',
      damage: '4d10+22 void',
      damageType: 'void',
      dc: 28,
      save: 'fortitude'
    }],
    reset: '1 hour',
    source: 'GM Core'
  },
  // Level 10
  {
    id: 'cryo-mist',
    name: 'Cryo Mist',
    level: 10,
    complexity: 'simple',
    type: 'trap',
    traits: ['tech', 'trap'],
    stealth: 'DC 35 (master)',
    stealthDC: 35,
    description: 'Hidden nozzles in the ceiling release hyper-cold air, potentially freezing intruders in place.',
    disable: 'DC 27 Computers (master) to increase the air\'s temperature to safe levels, or DC 27 Thievery (master) to deactivate the nozzles',
    actions: [{
      name: 'Freeze!',
      actionType: 'reaction',
      trigger: 'A creature moves below the nozzles',
      effect: 'The trap sprays cold air on the triggering creature, dealing 4d10+26 cold damage (DC 33 Fortitude save). Critical Success: unaffected. Success: half damage and clumsy 1. Failure: full damage, clumsy 2, and slowed 1 for 1d4 rounds. Critical Failure: double damage, clumsy 2, and paralyzed for 1 minute. Creatures within 10 feet of the triggering creature take 2d12+13 cold damage (DC 29 basic Fortitude save).',
      damage: '4d10+26 cold',
      damageType: 'cold',
      dc: 33,
      save: 'fortitude'
    }],
    reset: 'The trap resets after 1 minute.',
    source: 'GM Core'
  },
  // Level 11
  {
    id: 'repulsing-force-field',
    name: 'Repulsing Force Field',
    level: 11,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'trap'],
    stealth: 'DC 33 (expert)',
    stealthDC: 33,
    description: 'A translucent force field appears to block a creature\'s path, shunting it and any other creature that attempts to pass it away.',
    disable: 'DC 33 Thievery (expert) to disable the force field, or dispel magic (6th rank; counteract DC 29) to counteract the force field',
    ac: 31,
    saves: { fortitude: 24, reflex: 18 },
    hardness: 20,
    hp: 80,
    bt: 40,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Forbid Entry',
      actionType: 'reaction',
      trigger: 'A creature attempts to pass the designated area',
      effect: 'The force field appears and shunts the creature away, making a Strike against the triggering creature. Melee force field +28, Damage 6d8+20 force damage plus the target is knocked back 10 feet (20 feet on a critical hit). The force field takes a –2 circumstance penalty to hit if the triggering creature Stepped or was moved by a forced movement effect.',
      damage: '6d8+20 force',
      damageType: 'force'
    }],
    reset: 'The force field deactivates and the trap resets after 1 minute.',
    source: 'GM Core'
  },
  // Level 12
  {
    id: 'mutation-fog',
    name: 'Mutation Fog',
    level: 12,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental'],
    stealth: 'DC 30 (expert)',
    stealthDC: 30,
    description: 'A fog of transmutative fumes fills a 30-foot radius area, painfully mutating creatures who enter.',
    disable: 'DC 35 Nature (master) to neutralize the fog, or DC 35 Survival (master) to disperse the fog',
    actions: [{
      name: 'Harmful Mutation',
      actionType: 'reaction',
      trigger: 'A creature begins its turn in the fog',
      effect: 'The fog surges with energy, dealing 6d10+27 bludgeoning damage to all creatures in the fog as it harmfully mutates their bodies. Creatures in the area must attempt a DC 32 Fortitude save. Critical Success: unaffected. Success: half damage, resists mutation. Failure: full damage, flesh becomes coated in foul-smelling blisters for 1 hour (sickened 1, can\'t reduce). Critical Failure: double damage, limbs become painfully twisted for 1d4 hours (sickened 2, can\'t reduce).',
      damage: '6d10+27 bludgeoning',
      damageType: 'bludgeoning',
      dc: 32,
      save: 'fortitude'
    }],
    source: 'GM Core'
  },
  // Level 13
  {
    id: 'temporal-rift',
    name: 'Temporal Rift',
    level: 13,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'trap'],
    stealth: 'DC 29 (trained)',
    stealthDC: 29,
    description: 'A rift in time rapidly ages and slows anyone who draws near.',
    disable: 'DC 36 Arcana (master) or Occultism (master) to magically mend time, DC 40 Thievery (master) to repair the time rift, or dispel magic (7th rank; counteract DC 31) to counteract the rift',
    actions: [{
      name: 'Time Shudder',
      actionType: 'reaction',
      trigger: 'A creature moves within 10 feet of the rift',
      effect: 'The triggering creature takes 6d10+20 damage as its body rapidly ages. It must attempt a DC 33 Will save. Critical Success: unaffected. Success: half damage, clumsy 1 and enfeebled 1. Failure: full damage, clumsy 2 and enfeebled 2. Critical Failure: double damage, clumsy 2 and enfeebled 2, and slowed for 1 minute.',
      damage: '6d10+20',
      dc: 33,
      save: 'will'
    }],
    source: 'GM Core'
  },
  // Level 15
  {
    id: 'soul-upload',
    name: 'Soul Upload',
    level: 15,
    complexity: 'simple',
    type: 'trap',
    traits: ['magical', 'tech', 'trap'],
    stealth: 'DC 40 (master)',
    stealthDC: 40,
    description: 'A computer is protected by a hybrid trap, which uploads the soul of all unauthorized users to an inert data module on the computer.',
    disable: 'DC 36 Arcana (expert) to drain the computer\'s magical energy, or DC 36 Computers (expert) to falsify authorized credentials, or DC 40 Thievery (expert) to disable the trap, or dispel magic (7th rank; counteract DC 34) to counteract the trap',
    actions: [{
      name: 'Upload Soul',
      actionType: 'reaction',
      trigger: 'An unauthorized creature grasps the computer directly or with a tool',
      effect: 'The trap attempts to upload the triggering creature\'s soul into the computer. The triggering creature must attempt a DC 40 Will save. Critical Success: unaffected. Success: 3d10+15 spirit damage. Failure: 6d10+30 spirit damage and stunned 3. Critical Failure: soul is pulled from body and uploaded to a data module on the computer. Body remains a soulless vessel, slowly dying over 1 week unless soul is returned. Destroying the computer destroys the soul.',
      damage: '3d10+15 to 6d10+30 spirit',
      damageType: 'spirit',
      dc: 40,
      save: 'will'
    }],
    source: 'GM Core'
  },
  // Level 17
  {
    id: 'devastating-collision',
    name: 'Devastating Collision',
    level: 17,
    complexity: 'simple',
    type: 'haunt',
    traits: ['haunt'],
    stealth: 'DC 43 (master) to hear the roar of hover jets',
    stealthDC: 43,
    description: 'A phantom hover truck collides with creatures, replaying an accident from the past in gory detail.',
    disable: 'DC 38 Occultism (master) to disperse the phantom truck, or DC 36 Religion (master) to ward yourself from harm',
    actions: [{
      name: 'Crash',
      actionType: 'reaction',
      trigger: 'A creature crosses the street',
      effect: 'A phantom hover truck crashes into all creatures crossing the street, dealing 6d12+37 bludgeoning damage (DC 43 Fortitude save). Critical Success: unaffected. Success: half damage, knocked prone, pushed 10 feet back. Failure: full damage, knocked prone, pushed 20 feet back. Critical Failure: double damage, knocked prone, pushed 30 feet back.',
      damage: '6d12+37 bludgeoning',
      damageType: 'bludgeoning',
      dc: 43,
      save: 'fortitude'
    }],
    reset: '1 day',
    source: 'GM Core'
  },
  // Level 20
  {
    id: 'memory-crystals',
    name: 'Memory Crystals',
    level: 20,
    complexity: 'simple',
    type: 'environmental',
    traits: ['environmental', 'magical', 'mental'],
    stealth: 'DC 38 (expert) or detect magic',
    stealthDC: 38,
    description: 'Glowing yellow crystals refract the blurred imprints of stolen memories within their facets.',
    disable: 'DC 48 Arcana (legendary) to erect mental wards, or DC 48 Occultism (legendary) to harmlessly feed surface thoughts to the crystals, or DC 51 Religion (legendary) to pray for protection from the crystals',
    ac: 42,
    saves: { fortitude: 36, reflex: 30 },
    hardness: 33,
    hp: 134,
    bt: 67,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Leech Memories',
      actionType: 'reaction',
      trigger: 'A non-mindless creature comes within 5 feet of the memory crystals',
      effect: 'The memory crystals expand into every square adjacent to their space. As they grow, they absorb memories and ambient thought from their surroundings, dealing 8d10 mental damage (DC 42 basic Will save) to creatures within 10 feet after they expand. Memory Field (aura, mental) 5 feet: Memory crystals deal 8d10 mental damage to nearby creatures.',
      damage: '8d10 mental',
      damageType: 'mental',
      dc: 42,
      save: 'will'
    }],
    reset: 'After expanding, the memory crystals can\'t grow again for 1 day.',
    source: 'GM Core'
  },

  // === GM CORE COMPLEX HAZARDS ===

  // Level 1 Complex
  {
    id: 'distracting-holo-ad',
    name: 'Distracting Holo Ad',
    level: 1,
    complexity: 'complex',
    type: 'trap',
    traits: ['magical', 'tech', 'trap'],
    stealth: '+7 (trained), or DC 20 (expert) to notice the holoprojector, or detect magic',
    stealthDC: 17,
    description: 'Colorful, lifelike figures flit in and out of a holographic advertisement in a barrage of pleasant sounds and sensations, enticing passersby to spend their credits.',
    disable: 'DC 17 Computers (trained) to deactivate the ad, or DC 20 Crafting (trained) or Thievery (trained) to disable the projector',
    ac: 16,
    saves: { fortitude: 4, reflex: 11 },
    hardness: 5,
    hp: 24,
    bt: 12,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Buy! Buy! Buy!',
      actionType: 'reaction',
      trigger: 'A creature in the area finishes an action',
      effect: 'The trap launches a targeted ad enticing viewers to spend credits. All creatures within 30 feet who can see, hear, or sense the ad must attempt a DC 17 Will save. The trap rolls initiative. Critical Success: unaffected. Success: dazzled. Failure: dazzled and slowed 1. Critical Failure: fascinated for 1 round and can\'t take any actions except to access the nearest computer or comm unit and make purchases as directed by the ad.',
      dc: 17,
      save: 'will'
    }],
    routine: 'The hazard plays a new ad each round, forcing all creatures that can sense it to attempt a new save.',
    reset: 'The trap deactivates and resets after 1 minute.',
    source: 'GM Core'
  },
  {
    id: 'laser-turret',
    name: 'Laser Turret',
    level: 1,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'tech', 'trap'],
    stealth: '+10 (trained)',
    stealthDC: 20,
    description: 'A concealed turret pops up and fires a laser when intruders enter a secure area.',
    disable: 'DC 18 Computers (trained) to reprogram the turret, or DC 17 Crafting (trained) to cut power to the turret, or DC 16 Thievery (trained) to disable the turret',
    ac: 16,
    saves: { fortitude: 10, reflex: 4 },
    hardness: 5,
    hp: 24,
    bt: 12,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Laser Blast',
      actionType: 'reaction',
      trigger: 'A creature moves within 30 feet of the turret',
      effect: 'The trap makes a laser Strike against the creature; the trap rolls initiative.',
      damage: '1d6+3 fire',
      damageType: 'fire'
    }],
    routine: '(3 actions) The trap makes a laser Strike against up to three creatures in range, or multiple Strikes against one creature in range if it has no additional targets. Ranged laser +9 (range increment 90 feet), Damage 1d6+3 fire.',
    reset: 'The trap resets after 1 minute.',
    source: 'GM Core'
  },
  {
    id: 'summoning-rune-gm',
    name: 'Summoning Rune',
    level: 1,
    complexity: 'complex',
    type: 'trap',
    traits: ['magical', 'trap'],
    stealth: '+7 (trained)',
    stealthDC: 17,
    description: 'A cloud of invisible magical sensors in a 10-foot radius surrounds an invisible rune on the wall or floor the size of the creature to be summoned.',
    disable: 'DC 15 Acrobatics to approach without triggering the trap followed by DC 17 Thievery (trained) to erase the rune, or dispel magic (1st rank; counteract DC 15) to counteract the rune',
    actions: [{
      name: 'Summon Monster',
      actionType: 'reaction',
      trigger: 'A creature enters the cloud of magical sensors',
      effect: 'This trap summons a specific 1st-level creature, determined when the trap is created. The creature rolls initiative and remains for 2d6 rounds, after which the spell ends and the creature disappears. The creature also disappears if someone disables the trap before the duration expires. The summoned creature can use 3 actions each round and can use reactions, unlike most summoned creatures.'
    }],
    reset: 'The trap resets each day at dawn.',
    source: 'GM Core'
  },
  // Level 2 Complex
  {
    id: 'hackers-folly',
    name: "Hacker's Folly",
    level: 2,
    complexity: 'complex',
    type: 'haunt',
    traits: ['haunt', 'tech'],
    stealth: '+15 (trained)',
    stealthDC: 25,
    description: 'A ghostly hacker haunts their computer and attempts to drain the spirit of anyone who accessed the computer.',
    disable: 'DC 16 Computers (trained) to partition the haunted code, or DC 18 Religion (trained) or Occultism (trained) to exorcise the spirit',
    ac: 15,
    saves: { fortitude: 11, reflex: 5 },
    hardness: 2,
    hp: 40,
    bt: 20,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: "Hacker's Fixation",
      actionType: 'reaction',
      trigger: 'A creature touches the console directly or with a tool',
      effect: 'The haunt distracts the user with colorful graphics and interesting data while lowering their mental defenses. The triggering creature must attempt a DC 22 Will save. The trap then rolls initiative. Critical Success: unaffected. Success: stupefied 1 for 1 round. Failure: stupefied 1. Critical Failure: stupefied 2. Additionally, they are fascinated with the computer and can\'t take any actions except to passively view the data on the computer. At the end of each of their turns, they can retry this saving throw to remove the fascinated condition.',
      dc: 22,
      save: 'will'
    }],
    routine: '(1 action) The haunt absorbs the spirits of the living, dealing 1d10+4 spirit damage to all living creatures within 10 feet of the computer (DC 18 basic Will save). On a critical failure, a creature is additionally drained 1. This routine doesn\'t count as a hostile action for the purposes of ending the fascinated condition.',
    reset: 'The trap resets after 1 hour.',
    source: 'GM Core'
  },
  // Level 3 Complex
  {
    id: 'electric-fence',
    name: 'Electric Fence',
    level: 3,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: '+10 (trained)',
    stealthDC: 20,
    description: 'A 15-foot-tall electrified fence electrocutes anyone who touches it.',
    disable: 'DC 17 Crafting (trained) to ground a 10-foot portion of the fence, or DC 18 Thievery (trained) to cut power to the fence',
    ac: 16,
    saves: { fortitude: 12, reflex: 6 },
    hardness: 10,
    hp: 40,
    bt: 20,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Shock',
      actionType: 'free',
      trigger: 'A creature touches the fence directly or with a tool',
      effect: 'The trap deals 1d10 electricity damage to the triggering creature. The trap rolls initiative if it hasn\'t already.',
      damage: '1d10 electricity',
      damageType: 'electricity'
    }],
    routine: '(1 action) The trap electrocutes each creature touching the fence directly or with a tool, dealing 1d10 electricity damage (DC 23 basic Fortitude save).',
    source: 'GM Core'
  },
  // Level 4 Complex
  {
    id: 'deadly-vidgame',
    name: 'Deadly Vidgame',
    level: 4,
    complexity: 'complex',
    type: 'trap',
    traits: ['tech', 'trap'],
    stealth: '+15 (expert)',
    stealthDC: 25,
    description: 'A hyperrealistic vidgame pulls players into a virtual world, transforming them into pixelated avatars and pitting them against deadly challenges.',
    disable: 'DC 22 Computers (trained) to reprogram the game, or DC 22 Thievery (trained) to exploit a glitch, or DC 17 Vidgame Lore (trained) to beat the game; four total successes are required to disable the trap',
    actions: [{
      name: 'New Game',
      actionType: 'reaction',
      trigger: 'A creature begins to play the vidgame',
      effect: 'The trap attempts to pull all players into the vidgame. Each player must attempt a DC 25 Will save. The trap then rolls initiative. Critical Success: unaffected and can play from reality. Success: pulled in for 1 round, then escapes. Failure: pulled in and can\'t escape until trap is disabled. Critical Failure: pulled in on hard mode (DC is 2 higher).',
      dc: 25,
      save: 'will'
    }],
    routine: '(1 action) The trap presents the game\'s players with deadly challenges. Each creature inside the game takes 2d8+5 slashing damage (DC 21 basic Reflex save). A creature can attempt a Vidgame Lore check in place of their saving throw.',
    reset: 'The trap resets after 1 hour. Auto-Save: If the console is turned off, creatures inside remain there, removed from reality until it\'s turned back on.',
    source: 'GM Core'
  },
  // Level 5 Complex
  {
    id: 'sentry-turret',
    name: 'Sentry Turret',
    level: 5,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: '+13 (trained)',
    stealthDC: 23,
    description: 'A mechanized turret attacks intruders.',
    disable: 'DC 20 Computers (trained) to reprogram the turret, or DC 19 Crafting (trained) to cut power to the turret, or DC 18 Thievery (trained) to disable the turret',
    ac: 19,
    saves: { fortitude: 15, reflex: 9 },
    hardness: 12,
    hp: 54,
    bt: 26,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Open Fire',
      actionType: 'reaction',
      trigger: 'A creature moves within 30 feet of the turret or attacks the turret',
      effect: 'The turret makes a ranged Strike against the triggering creature; the trap then rolls initiative.',
      damage: '2d8+7 piercing',
      damageType: 'piercing'
    }],
    routine: '(3 actions) The trap makes three oversized machine gun Strikes against a creature in range, or the trap makes an Auto-Fire attack followed by one Strike against a creature in range. Ranged oversized machine gun +15 (analog, automatic, range increment 90 feet), Damage 2d8+7 piercing. Auto-Fire (analog, 45-foot cone), Damage 2d8+7 piercing (DC 22 basic Reflex save).',
    reset: 'The trap resets after 1 minute.',
    source: 'GM Core'
  },
  // Level 6 Complex
  {
    id: 'trash-compactor',
    name: 'Trash Compactor',
    level: 6,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'trap'],
    stealth: '+21 (trained)',
    stealthDC: 31,
    description: 'When activated, the automated trash compactor slowly crushes everything inside it.',
    disable: 'DC 26 Crafting (expert) to jam the crushing mechanism, or DC 24 Thievery (expert) to deactivate the trap; DC 28 Athletics (trained) to Force Open the door (this doesn\'t disable the trap)',
    ac: 21,
    saves: { fortitude: 17, reflex: 11 },
    hardness: 12,
    hp: 54,
    bt: 27,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Commence Crushing',
      actionType: 'reaction',
      trigger: 'Two or more creatures end their turn in the room',
      effect: 'The doors slam shut, sealing the room. The trap then rolls initiative.'
    }],
    routine: '(1 action) Two of the room\'s walls move 5 feet toward the center of the room, automatically pushing any creatures in those spaces 5 feet closer to the room\'s center and dealing 2d8+9 bludgeoning damage to all creatures in the room (DC 24 basic Fortitude save). Creatures that die from this damage are crushed to a fine paste.',
    reset: 'The trap deactivates and resets after 1 minute.',
    source: 'GM Core'
  },
  // Level 7 Complex
  {
    id: 'reality-geyser',
    name: 'Reality Geyser',
    level: 7,
    complexity: 'complex',
    type: 'environmental',
    traits: ['environmental', 'magical'],
    stealth: '+17 (expert)',
    stealthDC: 27,
    description: 'A tear in reality emits a chaotic churn of energy into the air like a geyser, raining destruction down on an area.',
    disable: 'DC 27 Arcana (expert) to diffuse the magical energy, or DC 25 Nature (expert) to seal the tear, or DC 30 Survival (trained) to coax the earth back together',
    actions: [{
      name: 'Tear Reality',
      actionType: 'reaction',
      trigger: 'A creature moves within 30 feet of the dormant tear',
      effect: 'A tear opens in reality, gouging a 5-foot radius hole in the earth. The trap rolls initiative.'
    }],
    routine: '(2 actions) A chaotic churn of energy blasts out of the tear, dealing 2d10+5 acid damage to all creatures in a 30-foot-tall cylinder centered on the tear (DC 25 basic Reflex save). Creatures damaged by this energy are additionally pushed 10 feet into the air (20 feet on a critical failure). This dispersed energy then rains down, dealing 1d10 fire damage to all creatures within 60 feet of the tear (DC 23 basic Fortitude save).',
    source: 'GM Core'
  },
  // Level 8 Complex
  {
    id: 'disintegration-chamber',
    name: 'Disintegration Chamber',
    level: 8,
    complexity: 'complex',
    type: 'trap',
    traits: ['mechanical', 'tech', 'trap'],
    stealth: '+16 (expert) or DC 31 (expert) to notice the control panel',
    stealthDC: 26,
    description: 'When sensors detect movement in the trapped room, the doors seal shut, and four wall apertures open, releasing disintegrating nanites into the room.',
    disable: 'DC 22 Crafting (trained) or Thievery (trained) on the control panel to deactivate the trap, or DC 24 Computers (trained) to reprogram the control panel',
    ac: 27,
    saves: { fortitude: 19, reflex: 13 },
    hardness: 15,
    hp: 60,
    bt: 30,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Nanite Release',
      actionType: 'reaction',
      trigger: 'A creature enters the room or ends its turn in the room',
      effect: 'The trap makes a nanite Strike against the triggering creature, then rolls initiative.',
      damage: '1d10+5 acid',
      damageType: 'acid'
    }],
    routine: '(1 action) The trap launches nanites against every creature in the room. Because it launches nanites continuously, the trap can also use the Nanite Swarm free action. Ranged nanite +20, Damage 1d10+5 acid; no multiple attack penalty. Nanite Swarm [free-action] Trigger: A creature within the room ends its turn; Effect: The trap makes a nanite Strike against the triggering creature.',
    reset: 'The trap deactivates and resets after 1 minute.',
    source: 'GM Core'
  },
  // Level 9 Complex
  {
    id: 'haywire-autopilot',
    name: 'Haywire Autopilot',
    level: 9,
    complexity: 'complex',
    type: 'trap',
    traits: ['tech', 'trap'],
    stealth: '+20 (expert)',
    stealthDC: 30,
    description: 'A hovercar\'s autopilot goes haywire, causing it to run over nearby creatures.',
    disable: 'DC 26 Computers (expert) to remotely reprogram the autopilot, or DC 24 Piloting or Thievery (expert) to override the autopilot while aboard the car; three total successes are required to disable the trap; DC 23 Acrobatics or Athletics to board the car (boarding doesn\'t disable the trap)',
    ac: 28,
    saves: { fortitude: 15, reflex: 21 },
    hardness: 16,
    hp: 70,
    bt: 35,
    immunities: ['critical hits', 'object immunities', 'precision damage'],
    actions: [{
      name: 'Ram',
      actionType: 'reaction',
      trigger: 'A creature moves within 30 feet of the hovercar',
      effect: 'The hovercar drives 30 feet in a straight line, dealing 2d10+13 bludgeoning damage to all creatures in the area it passes through (DC 32 basic Reflex save). Creatures damaged by the car are additionally knocked prone. The trap then rolls initiative.',
      damage: '2d10+13 bludgeoning',
      damageType: 'bludgeoning',
      dc: 32,
      save: 'reflex'
    }],
    routine: '(3 actions) The trap loses 1 action each turn for each successful disable. The hovercar uses 1 action to drive 30 feet in a straight line, three times, changing direction between actions as desired. Creatures in the area the hovercar passes through take 2d10+13 bludgeoning damage (DC 32 basic Reflex save). Creatures damaged by the car are additionally knocked prone.',
    source: 'GM Core'
  },
  // Level 14 Complex
  {
    id: 'collapsing-building',
    name: 'Collapsing Building',
    level: 14,
    complexity: 'complex',
    type: 'environmental',
    traits: ['environmental'],
    stealth: '+28 (expert)',
    stealthDC: 38,
    description: 'A building collapses, harming everyone inside.',
    disable: 'DC 38 Arcana (expert) or Nature (expert) to magically prop up the building, DC 34 Crafting (master) or Survival (master) to stabilize the building, DC 38 Religion (expert) to pray for the collapse to cease; four total successes are required to stop the collapse',
    actions: [{
      name: 'Shudder',
      actionType: 'reaction',
      trigger: 'An effect damages the building, or the ground around the building shifts',
      effect: 'The building shudders and creaks, signaling an imminent collapse. The building\'s interior becomes difficult terrain. The trap rolls initiative.'
    }],
    routine: '(1 action) The building begins to collapse. All creatures in the building take 3d10+18 bludgeoning damage (DC 39 basic Reflex save). A creature that critically fails its save is additionally knocked prone and takes 1d6 persistent bleed damage.',
    source: 'GM Core'
  },
  // Level 16 Complex
  {
    id: 'quantum-clone',
    name: 'Quantum Clone',
    level: 16,
    complexity: 'complex',
    type: 'trap',
    traits: ['magical'],
    stealth: '+32 (expert)',
    stealthDC: 42,
    description: 'Quantum particles form an exact copy of a creature that can mimic its actions, speech, and thoughts with eerie perfection.',
    disable: 'DC 42 Intimidation (master) to frighten the clone away, or DC 42 Diplomacy (master) to reach an accord with the clone, or DC 45 Arcana (master) or Nature (master) to disperse the quantum particles; three total successes are required to disable the trap',
    actions: [{
      name: 'Materialize',
      actionType: 'reaction',
      trigger: 'A creature touches the quantum particles',
      effect: 'The quantum particles materialize a perfect copy of the triggering creature. The quantum clone is visually identical to the creature and mimics the creature\'s actions and speech until it has time to observe and learn the creature\'s patterns well enough to act entirely on its own, a process that takes 1 minute. The quantum clone materializes with no weapons or equipment but can use unarmed Strikes if the creature has them. The quantum clone rolls initiative.'
    }],
    routine: '(3 actions) The quantum clone observes the triggering creature and mimics the creature\'s behavior, taking hostile actions as soon as it takes damage. For the first 2 rounds, the quantum clone takes actions in the exact order the triggering creature did, but in the following rounds, it acts tactically, using actions and reactions it observed the creature using in any order. Mimic [one-action to three-actions]: The quantum clone mimics an action it\'s observed the triggering creature take, including class abilities, movements, spells, and speech. It attacks on its initiative, using the same statistics as the original creature.',
    source: 'GM Core'
  },
  // Level 19 Complex
  {
    id: 'reactor-meltdown',
    name: 'Reactor Meltdown',
    level: 19,
    complexity: 'complex',
    type: 'trap',
    traits: ['tech', 'trap'],
    stealth: '+27',
    stealthDC: 37,
    description: 'A nuclear reactor overloads, then explodes.',
    disable: 'DC 45 Computers (master) or Crafting (master) to initiate shutdown procedures, or DC 47 Thievery (master) to vent the reactor; three total successes are required to disable the trap',
    actions: [{
      name: 'Radiation Leak',
      actionType: 'reaction',
      trigger: 'A creature views the reactor\'s sensors or console',
      effect: 'Creatures within 60 feet of the reactor are exposed to incredible radiation (DC 32 Fortitude). The trap rolls initiative.'
    }],
    routine: '(1 action) As the reactor overheats, the trap deals 4d10+20 fire damage to creatures within 60 feet (DC 42 basic Fortitude save). All creatures in the area are exposed to incredible radiation. Each time the trap uses this routine, the area increases by 10 feet. When the routine\'s radius equals 100 feet, resolve the routine. Then, the reactor immediately explodes, using Nuclear Explosion. Nuclear Explosion [free-action]: The reactor explodes, dealing 4d10+20 fire damage in a 500-foot radius, bypassing the hardness of any items in the blast zone (DC 46 basic Fortitude save). Everything in the area is exposed to incredible radiation. The area becomes irradiated, leaking severe radiation for 50 years.',
    source: 'GM Core'
  }
]

/**
 * Search hazards by name
 */
export function searchHazards(query: string): Hazard[] {
  const lowerQuery = query.toLowerCase()
  return HAZARDS.filter(h =>
    h.name.toLowerCase().includes(lowerQuery) ||
    h.description.toLowerCase().includes(lowerQuery) ||
    h.traits.some(t => t.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Filter hazards by level range
 */
export function filterHazardsByLevel(minLevel: number, maxLevel: number): Hazard[] {
  return HAZARDS.filter(h => h.level >= minLevel && h.level <= maxLevel)
}

/**
 * Filter hazards by complexity
 */
export function filterHazardsByComplexity(complexity: 'simple' | 'complex'): Hazard[] {
  return HAZARDS.filter(h => h.complexity === complexity)
}

/**
 * Filter hazards by type
 */
export function filterHazardsByType(type: 'trap' | 'environmental' | 'haunt'): Hazard[] {
  return HAZARDS.filter(h => h.type === type)
}

/**
 * Get all unique hazard traits
 */
export function getAllHazardTraits(): string[] {
  const traits = new Set<string>()
  HAZARDS.forEach(h => h.traits.forEach(t => traits.add(t)))
  return Array.from(traits).sort()
}
