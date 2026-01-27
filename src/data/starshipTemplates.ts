// Pre-built starship templates based on SF2e rules
// Stats scale with level using Building Creatures guidelines

export interface StarshipTemplate {
  id: string
  name: string
  type: 'fighter' | 'shuttle' | 'explorer' | 'transport' | 'cruiser' | 'battleship'
  description: string
  crewCapacity: string
  availableRoles: string[]
  // Base stats (at level 1, scale with level)
  baseAC: number
  baseFort: number
  baseRef: number
  baseHP: number
  baseShields: number
  shieldRegen: number
  // Skill bonuses provided by ship
  bonuses: Record<string, number>
}

export const STARSHIP_TEMPLATES: StarshipTemplate[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    type: 'fighter',
    description: 'The smallest starship available, seating one or two creatures. Fast and maneuverable.',
    crewCapacity: '1-2',
    availableRoles: ['pilot', 'gunner'],
    baseAC: 16,
    baseFort: 5,
    baseRef: 8,
    baseHP: 20,
    baseShields: 5,
    shieldRegen: 2,
    bonuses: { Piloting: 2 }
  },
  {
    id: 'shuttle',
    name: 'Shuttle',
    type: 'shuttle',
    description: 'A smaller starship that can contain up to six or eight creatures. Travels between locations.',
    crewCapacity: '6-8',
    availableRoles: ['pilot', 'gunner', 'engineer', 'science_officer'],
    baseAC: 14,
    baseFort: 6,
    baseRef: 6,
    baseHP: 30,
    baseShields: 5,
    shieldRegen: 3,
    bonuses: { Piloting: 1 }
  },
  {
    id: 'explorer',
    name: 'Explorer',
    type: 'explorer',
    description: 'A vessel used by adventurers and mercenaries to explore. Operates with up to 12 crew.',
    crewCapacity: 'Up to 12',
    availableRoles: ['captain', 'pilot', 'gunner', 'gunner', 'engineer', 'science_officer', 'science_officer'],
    baseAC: 15,
    baseFort: 7,
    baseRef: 7,
    baseHP: 50,
    baseShields: 8,
    shieldRegen: 4,
    bonuses: { Computers: 2, Piloting: 1 }
  },
  {
    id: 'transport',
    name: 'Transport',
    type: 'transport',
    description: 'A larger vessel used primarily to move crew and cargo. Some amenities but not for long missions.',
    crewCapacity: '20+',
    availableRoles: ['captain', 'pilot', 'gunner', 'gunner', 'engineer', 'engineer', 'science_officer'],
    baseAC: 13,
    baseFort: 8,
    baseRef: 5,
    baseHP: 80,
    baseShields: 10,
    shieldRegen: 5,
    bonuses: { Crafting: 1 }
  },
  {
    id: 'cruiser',
    name: 'Cruiser',
    type: 'cruiser',
    description: 'A starship intended for war. Fast vanguards of most fleets.',
    crewCapacity: '50+',
    availableRoles: ['captain', 'pilot', 'gunner', 'gunner', 'gunner', 'engineer', 'science_officer', 'magic_officer'],
    baseAC: 16,
    baseFort: 8,
    baseRef: 6,
    baseHP: 100,
    baseShields: 12,
    shieldRegen: 6,
    bonuses: { Piloting: 1, Intimidation: 1 }
  },
  {
    id: 'battleship',
    name: 'Battleship',
    type: 'battleship',
    description: 'Enormous vessels that act as the mainstay of militaries. Projects power across regions of space.',
    crewCapacity: '200+',
    availableRoles: ['captain', 'pilot', 'gunner', 'gunner', 'gunner', 'gunner', 'engineer', 'engineer', 'science_officer', 'magic_officer'],
    baseAC: 14,
    baseFort: 10,
    baseRef: 4,
    baseHP: 150,
    baseShields: 18,
    shieldRegen: 8,
    bonuses: { Intimidation: 2 }
  }
]

// Scale stats based on level (following Building Creatures guidelines)
export function getScaledStats(template: StarshipTemplate, level: number) {
  // AC scales +1 per level
  const ac = template.baseAC + (level - 1)

  // Saves scale roughly +1 per 2 levels
  const fort = template.baseFort + Math.floor((level - 1) * 0.6)
  const ref = template.baseRef + Math.floor((level - 1) * 0.6)

  // HP scales significantly with level
  const hpMultiplier = 1 + (level - 1) * 0.4
  const hp = Math.round(template.baseHP * hpMultiplier)

  // Shields scale with level (matching resistance scaling from Building Creatures)
  const shieldsByLevel: Record<number, number> = {
    1: 2, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 13,
    11: 14, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19, 17: 19, 18: 20, 19: 21, 20: 22
  }
  const baseShieldScale = shieldsByLevel[level] || 10
  const shields = Math.round(template.baseShields * (baseShieldScale / 5))

  const shieldRegen = Math.max(2, Math.round(template.shieldRegen * (1 + (level - 1) * 0.15)))

  return {
    ac,
    fortitude: fort,
    reflex: ref,
    maxHP: hp,
    currentHP: hp,
    maxShields: shields,
    currentShields: shields,
    shieldRegen,
    bonuses: { ...template.bonuses }
  }
}

export function getTemplateById(id: string): StarshipTemplate | undefined {
  return STARSHIP_TEMPLATES.find(t => t.id === id)
}

// Custom ship for user-created starships
export interface CustomShip {
  id: string
  name: string
  level: number
  ac: number
  fortitude: number
  reflex: number
  maxHP: number
  maxShields: number
  shieldRegen: number
  bonuses: Record<string, number>
  availableRoles: string[]
}

export function createEmptyCustomShip(): CustomShip {
  return {
    id: crypto.randomUUID(),
    name: 'Custom Ship',
    level: 1,
    ac: 15,
    fortitude: 6,
    reflex: 6,
    maxHP: 40,
    maxShields: 5,
    shieldRegen: 3,
    bonuses: {},
    availableRoles: ['captain', 'pilot', 'gunner', 'engineer', 'science_officer', 'magic_officer']
  }
}
