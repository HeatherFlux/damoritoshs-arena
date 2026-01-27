/**
 * Sample Starship Scenes for SF2e
 * Based on examples from the rules
 */

import type { SavedScene, StarshipThreat, Starship } from '../types/starship'

// Sample PC starship templates
export const SAMPLE_STARSHIPS: Record<string, Starship> = {
  explorer: {
    id: 'sample-explorer',
    name: 'The Wanderer',
    level: 5,
    ac: 18,
    fortitude: 14,
    reflex: 16,
    maxShields: 30,
    currentShields: 30,
    shieldRegen: 5,
    maxHP: 60,
    currentHP: 60,
    bonuses: {
      'Piloting': 2,
      'Computers': 1
    }
  },
  warship: {
    id: 'sample-warship',
    name: 'The Vindicator',
    level: 8,
    ac: 22,
    fortitude: 18,
    reflex: 14,
    maxShields: 50,
    currentShields: 50,
    shieldRegen: 8,
    maxHP: 100,
    currentHP: 100,
    bonuses: {
      'Piloting': 1,
      'Gunnery': 3
    }
  },
  freighter: {
    id: 'sample-freighter',
    name: 'The Lucky Break',
    level: 3,
    ac: 15,
    fortitude: 16,
    reflex: 12,
    maxShields: 20,
    currentShields: 20,
    shieldRegen: 4,
    maxHP: 80,
    currentHP: 80,
    bonuses: {
      'Crafting': 2,
      'Diplomacy': 1
    }
  }
}

// Sample threat templates
export const SAMPLE_THREATS: Record<string, StarshipThreat> = {
  pirate_fighter: {
    id: 'pirate-fighter',
    name: 'Pirate Fighter',
    type: 'enemy_ship',
    level: 2,
    maxHP: 25,
    currentHP: 25,
    ac: 16,
    description: 'A nimble single-pilot fighter favored by pirates for hit-and-run tactics.',
    abilities: ['Evasive', 'Light Weapons'],
    isDefeated: false
  },
  pirate_corvette: {
    id: 'pirate-corvette',
    name: 'Pirate Corvette',
    type: 'enemy_ship',
    level: 4,
    maxHP: 45,
    currentHP: 45,
    ac: 18,
    description: 'A mid-sized pirate vessel with decent firepower and a small crew.',
    abilities: ['Boarding Party', 'Medium Weapons'],
    isDefeated: false
  },
  vesk_destroyer: {
    id: 'vesk-destroyer',
    name: 'Vesk Destroyer',
    type: 'enemy_ship',
    level: 7,
    maxHP: 80,
    currentHP: 80,
    ac: 21,
    description: 'A heavily armed Vesk military vessel built for ship-to-ship combat.',
    abilities: ['Heavy Weapons', 'Reinforced Hull', 'Marine Complement'],
    isDefeated: false
  },
  asteroid_field: {
    id: 'asteroid-field',
    name: 'Dense Asteroid Field',
    type: 'hazard',
    level: 3,
    description: 'A treacherous field of tumbling rocks that requires careful navigation.',
    abilities: ['Collision Damage 2d6', 'Concealment'],
    isDefeated: false
  },
  solar_flare: {
    id: 'solar-flare',
    name: 'Solar Flare',
    type: 'environmental',
    level: 5,
    description: 'Intense radiation and electromagnetic interference from a nearby star.',
    abilities: ['Shield Drain', 'Sensor Interference', '1d6 radiation damage/round'],
    isDefeated: false
  },
  debris_cloud: {
    id: 'debris-cloud',
    name: 'Debris Cloud',
    type: 'hazard',
    level: 2,
    description: 'Wreckage from a destroyed ship, potentially hiding salvage or danger.',
    abilities: ['Collision Damage 1d6', 'Hidden Salvage', 'Possible Survivors'],
    isDefeated: false
  },
  plasma_storm: {
    id: 'plasma-storm',
    name: 'Plasma Storm',
    type: 'environmental',
    level: 6,
    description: 'A violent stellar phenomenon of superheated plasma and electromagnetic chaos.',
    abilities: ['2d6 fire damage/round', 'Communications Blackout', 'Navigation Hazard'],
    isDefeated: false
  },
  songbird_interceptor: {
    id: 'songbird-interceptor',
    name: 'Songbird Interceptor',
    type: 'enemy_ship',
    level: 10,
    maxHP: 90,
    currentHP: 90,
    ac: 24,
    description: 'An elite Songbird-class interceptor crewed by veteran pilots.',
    abilities: ['Ace Pilot', 'Advanced Targeting', 'Heavy Weapons', 'Shield Overcharge'],
    isDefeated: false
  }
}

// Sample scenes
export const SAMPLE_SCENES: SavedScene[] = [
  {
    id: 'asteroid-ambush',
    name: 'Asteroid Ambush',
    level: 2,
    description: 'Your ship has been lured into an asteroid field by a distress signal, only to discover it was a pirate trap! Two pirate fighters emerge from the rocks, weapons hot. You must defeat them or escape through the asteroid field.',
    victoryCondition: 'defeat',
    starship: {
      ...SAMPLE_STARSHIPS.freighter,
      id: crypto.randomUUID(),
      currentShields: 20,
      currentHP: 80
    },
    threats: [
      { ...SAMPLE_THREATS.pirate_fighter, id: crypto.randomUUID(), name: 'Pirate Fighter Alpha' },
      { ...SAMPLE_THREATS.pirate_fighter, id: crypto.randomUUID(), name: 'Pirate Fighter Beta' },
      { ...SAMPLE_THREATS.asteroid_field, id: crypto.randomUUID() }
    ],
    roles: [],
    savedAt: Date.now()
  },
  {
    id: 'scanning-dying-sun',
    name: 'Scanning a Dying Sun',
    level: 7,
    description: 'Your crew has been hired to collect scientific data from a star in its final death throes. The solar flares are intensifying, and you must complete your scans before the star goes supernova. Accumulate 10 Victory Points worth of scan data to complete the mission.',
    victoryCondition: 'victory_points',
    vpRequired: 10,
    starship: {
      ...SAMPLE_STARSHIPS.explorer,
      id: crypto.randomUUID(),
      level: 7,
      ac: 20,
      fortitude: 16,
      reflex: 18,
      maxShields: 40,
      currentShields: 40,
      maxHP: 75,
      currentHP: 75
    },
    threats: [
      { ...SAMPLE_THREATS.solar_flare, id: crypto.randomUUID() },
      { ...SAMPLE_THREATS.plasma_storm, id: crypto.randomUUID() }
    ],
    roles: [],
    savedAt: Date.now()
  },
  {
    id: 'songbird-sortie',
    name: 'Songbird Sortie',
    level: 12,
    description: 'Intelligence has revealed that a Songbird-class interceptor, the "Crimson Talon," will be passing through this sector carrying vital enemy intelligence. Your mission: disable and board the Crimson Talon before it can escape or destroy its data banks. Survival is secondary to the mission.',
    victoryCondition: 'defeat',
    starship: {
      ...SAMPLE_STARSHIPS.warship,
      id: crypto.randomUUID(),
      level: 12,
      ac: 26,
      fortitude: 22,
      reflex: 18,
      maxShields: 70,
      currentShields: 70,
      maxHP: 140,
      currentHP: 140
    },
    threats: [
      {
        ...SAMPLE_THREATS.songbird_interceptor,
        id: crypto.randomUUID(),
        name: 'Crimson Talon',
        level: 12,
        maxHP: 110,
        currentHP: 110,
        ac: 27
      },
      {
        ...SAMPLE_THREATS.pirate_corvette,
        id: crypto.randomUUID(),
        name: 'Escort Corvette',
        level: 10,
        maxHP: 70,
        currentHP: 70,
        ac: 24
      }
    ],
    roles: [],
    savedAt: Date.now()
  },
  {
    id: 'escape-pursuit',
    name: 'Escape the Blockade',
    level: 5,
    description: 'Your ship carries vital refugees fleeing persecution. A military blockade stands between you and freedom. You don\'t need to win the fight - just survive 6 rounds until you can jump to hyperspace.',
    victoryCondition: 'survival',
    survivalRounds: 6,
    starship: {
      ...SAMPLE_STARSHIPS.freighter,
      id: crypto.randomUUID(),
      level: 5,
      ac: 17,
      fortitude: 18,
      reflex: 14,
      maxShields: 25,
      currentShields: 25,
      maxHP: 90,
      currentHP: 90,
      name: 'The Hopeful Dawn'
    },
    threats: [
      { ...SAMPLE_THREATS.pirate_corvette, id: crypto.randomUUID(), name: 'Patrol Corvette Alpha', level: 5 },
      { ...SAMPLE_THREATS.pirate_corvette, id: crypto.randomUUID(), name: 'Patrol Corvette Beta', level: 5 },
      { ...SAMPLE_THREATS.vesk_destroyer, id: crypto.randomUUID(), name: 'Command Ship', level: 8 }
    ],
    roles: [],
    savedAt: Date.now()
  },
  {
    id: 'salvage-run',
    name: 'Salvage Run',
    level: 4,
    description: 'A derelict ship has been detected in a debris cloud. Get in, salvage valuable components (5 VP), and get out before scavenger ships arrive. But watch out for the debris - and whatever destroyed the original ship.',
    victoryCondition: 'victory_points',
    vpRequired: 5,
    starship: {
      ...SAMPLE_STARSHIPS.freighter,
      id: crypto.randomUUID(),
      level: 4,
      ac: 16,
      fortitude: 17,
      reflex: 13,
      maxShields: 22,
      currentShields: 22,
      maxHP: 85,
      currentHP: 85,
      name: 'Salvage Hawk'
    },
    threats: [
      { ...SAMPLE_THREATS.debris_cloud, id: crypto.randomUUID() },
      { ...SAMPLE_THREATS.pirate_fighter, id: crypto.randomUUID(), name: 'Scavenger 1', level: 3 },
      { ...SAMPLE_THREATS.pirate_fighter, id: crypto.randomUUID(), name: 'Scavenger 2', level: 3 }
    ],
    roles: [],
    savedAt: Date.now()
  }
]

// Helper to get a sample scene by ID
export function getSampleSceneById(sceneId: string): SavedScene | undefined {
  return SAMPLE_SCENES.find(s => s.id === sceneId)
}

// Helper to get a sample starship by key
export function getSampleStarship(key: string): Starship | undefined {
  return SAMPLE_STARSHIPS[key]
}

// Helper to get a sample threat by key
export function getSampleThreat(key: string): StarshipThreat | undefined {
  return SAMPLE_THREATS[key]
}
