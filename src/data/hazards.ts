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
