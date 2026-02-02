/**
 * Starfinder 2E Cinematic Starship Role Metadata
 *
 * Roles are just identity/metadata. Actions are defined per-scene, not per-role,
 * because every published scene has unique bespoke actions tied to the scenario.
 *
 * This file provides: display names, colors, initiative skill suggestions.
 */

import type { StarshipRole } from '../types/starship'

export const STARSHIP_ROLES: StarshipRole[] = [
  {
    id: 'captain',
    type: 'captain',
    name: 'Captain',
    description: 'Provides instruction and guidance. Inspires crew and demoralizes enemies.',
    primarySkills: ['Diplomacy', 'Intimidation', 'Performance']
  },
  {
    id: 'engineer',
    type: 'engineer',
    name: 'Engineer',
    description: 'Keeps the starship running. Diverts power and performs battlefield repairs.',
    primarySkills: ['Crafting', 'Athletics']
  },
  {
    id: 'gunner',
    type: 'gunner',
    name: 'Gunner',
    description: 'Operates weapon systems and targets threats.',
    primarySkills: [] // Gunners use attack rolls, not skill-based initiative
  },
  {
    id: 'magic_officer',
    type: 'magic_officer',
    name: 'Magic Officer',
    description: 'Operates esoteric systems powered by magical traditions.',
    primarySkills: ['Arcana', 'Occultism', 'Religion', 'Nature']
  },
  {
    id: 'pilot',
    type: 'pilot',
    name: 'Pilot',
    description: 'Moves the ship and dictates its course through maneuvers and navigation.',
    primarySkills: ['Piloting', 'Perception']
  },
  {
    id: 'science_officer',
    type: 'science_officer',
    name: 'Science Officer',
    description: 'Manages sensors, scanning, and technical aspects of the ship.',
    primarySkills: ['Computers', 'Perception']
  }
]

/** Get a role by its ID */
export function getRoleById(roleId: string): StarshipRole | undefined {
  return STARSHIP_ROLES.find(r => r.id === roleId)
}

/** Get a role by its type */
export function getRoleByType(type: string): StarshipRole | undefined {
  return STARSHIP_ROLES.find(r => r.type === type)
}

/** Get the display name for a role type string */
export function getRoleName(roleType: string): string {
  const role = STARSHIP_ROLES.find(r => r.type === roleType || r.id === roleType)
  return role?.name ?? roleType.charAt(0).toUpperCase() + roleType.slice(1).replace(/_/g, ' ')
}

/** Get the role color for visual display */
export function getRoleColor(roleType: string): string {
  switch (roleType) {
    case 'captain': return '#FFD700'
    case 'pilot': return '#00CED1'
    case 'gunner': return '#FF4444'
    case 'engineer': return '#22C55E'
    case 'magic_officer': return '#A855F7'
    case 'science_officer': return '#3B82F6'
    default: return '#94A3B8'
  }
}
