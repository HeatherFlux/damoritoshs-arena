/**
 * Ranged starship weapons that can be installed in a gunnery (Starfinder Tech Core p. 192).
 *
 * A gunnery weapon's damage dice scale with the gunnery's grade (see
 * STATION_HELMED_BONUS in tscStations.ts) and it gains the tracking trait from
 * tactical grade onward. Ranges are in zones. Starship weapons never need to be
 * reloaded and cannot be disarmed.
 */

export type StarshipWeaponProficiency = 'simple' | 'martial' | 'advanced'

export interface StarshipWeapon {
  id: string
  name: string
  proficiency: StarshipWeaponProficiency
  /** Base damage die at commercial grade, e.g. "1d8". */
  damageDie: string
  damageType: string
  /** Range in zones. */
  range: number
  /** Weapon upgrade slots. */
  upgrades: number
  group: string
  traits: string[]
  description: string
}

export const TSC_WEAPONS: StarshipWeapon[] = [
  // Simple
  { id: 'acid-capsule-launcher', name: 'Acid capsule launcher', proficiency: 'simple', damageDie: '1d8', damageType: 'acid', range: 4, upgrades: 1, group: 'corrosive', traits: ['analog'], description: 'Capsules of treated waste that explode on impact and eat away at hull and crew.' },
  { id: 'asteroid-breacher', name: 'Asteroid breacher', proficiency: 'simple', damageDie: '1d6', damageType: 'piercing', range: 3, upgrades: 1, group: 'projectile', traits: ['concussive', 'razing', 'tech', 'unwieldy'], description: 'Designed to blast holes in asteroids; just as capable of puncturing hulls.' },
  { id: 'coilgun', name: 'Coilgun', proficiency: 'simple', damageDie: '1d6', damageType: 'piercing', range: 3, upgrades: 1, group: 'projectile', traits: ['agile', 'analog'], description: 'Accelerates projectiles through an aligned magnetic field for accuracy.' },
  { id: 'fragment-launcher', name: 'Fragment launcher', proficiency: 'simple', damageDie: '1d8', damageType: 'piercing', range: 2, upgrades: 1, group: 'projectile', traits: ['analog', 'area (cone)', 'concussive'], description: 'Launches trash, scrap, and debris at high velocity.' },
  { id: 'light-laser-cannon', name: 'Light laser cannon', proficiency: 'simple', damageDie: '1d8', damageType: 'fire', range: 5, upgrades: 1, group: 'laser', traits: ['tech'], description: 'The most common artillery in the Pact Worlds: a ray of concentrated light.' },
  { id: 'pulsecaster-cannon', name: 'Pulsecaster cannon', proficiency: 'simple', damageDie: '1d6', damageType: 'electricity', range: 3, upgrades: 1, group: 'shock', traits: ['agile', 'tech'], description: 'A scintillating ray of crackling electricity.' },
  { id: 'starballista', name: 'Starballista', proficiency: 'simple', damageDie: '1d10', damageType: 'piercing', range: 6, upgrades: 1, group: 'projectile', traits: ['analog', 'ordnance', 'unwieldy'], description: 'Torsion-spring ammunition accelerator; surprisingly reliable.' },
  // Martial
  { id: 'chain-repeater', name: 'Chain repeater', proficiency: 'martial', damageDie: '1d8', damageType: 'piercing', range: 2, upgrades: 1, group: 'projectile', traits: ['analog', 'automatic'], description: 'A machine gun firing massive bullets at an astounding pace.' },
  { id: 'disruptor-rifle', name: 'Disruptor rifle', proficiency: 'martial', damageDie: '1d10', damageType: 'electricity', range: 8, upgrades: 1, group: 'shock', traits: ['tech', 'volley 2 zones'], description: 'Turret-mounted cannon of concentrated electromagnetic pulses.' },
  { id: 'farseeker-missiles', name: 'Farseeker missiles', proficiency: 'martial', damageDie: '1d8', damageType: 'piercing', range: 6, upgrades: 1, group: 'projectile', traits: ['area (burst 1 zone)', 'razing', 'tech'], description: 'Missiles that track a target after being fired.' },
  { id: 'hypervelocity-macron-accelerator', name: 'Hypervelocity macron accelerator', proficiency: 'martial', damageDie: '1d10', damageType: 'electricity', range: 2, upgrades: 1, group: 'shock', traits: ['area (cone)', 'concussive', 'tech'], description: 'Accelerates macroscopic particles into a directional metallic hurricane.' },
  { id: 'polarizing-beam', name: 'Polarizing beam', proficiency: 'martial', damageDie: '1d8', damageType: 'electricity', range: 2, upgrades: 1, group: 'shock', traits: ['boost d8', 'ordnance', 'tech'], description: 'A circuit of lightning between two polarized prongs and the target.' },
  { id: 'pulse-beam-cannon', name: 'Pulse beam cannon', proficiency: 'martial', damageDie: '1d8', damageType: 'electricity', range: 3, upgrades: 1, group: 'shock', traits: ['area (line)', 'nonlethal', 'tech'], description: 'Electromagnetic pulses designed to disable a starship without destroying it.' },
  // Advanced
  { id: 'aeon-cannon', name: 'Aeon cannon', proficiency: 'advanced', damageDie: '1d6', damageType: 'fire', range: 4, upgrades: 0, group: 'laser', traits: ['aeon', 'agile', 'caster', 'tech'], description: 'Azlanti prism of calibrated aeon stones that can be charged with magic.' },
  { id: 'artillery-cannon', name: 'Artillery cannon', proficiency: 'advanced', damageDie: '1d10', damageType: 'fire', range: 6, upgrades: 1, group: 'laser', traits: ['critical (flame)', 'forceful', 'razing', 'tech'], description: 'Devastating lasers that blast holes in armored space stations.' },
  { id: 'gravity-cannon', name: 'Gravity cannon', proficiency: 'advanced', damageDie: '1d10', damageType: 'bludgeoning', range: 5, upgrades: 1, group: 'shock', traits: ['area (line)', 'ordnance', 'tech'], description: 'A beam of gravitational waves fired at one or more targets.' },
  { id: 'magnetar-rail', name: 'Magnetar rail', proficiency: 'advanced', damageDie: '1d12', damageType: 'piercing', range: 6, upgrades: 1, group: 'projectile', traits: ['analog', 'automatic', 'ordnance'], description: 'Fires solid metal rods at incredible speed to pierce any hull.' },
]

export function getTscWeapon(id: string): StarshipWeapon | undefined {
  return TSC_WEAPONS.find(w => w.id === id)
}

/** Trait descriptions used by the stat blocks: arc and ordnance are starship weapon traits (p. 191); bypassing is a general trait (p. 174). */
export const TSC_WEAPON_TRAIT_DESCRIPTIONS: Record<string, string> = {
  arc: 'The attack arcs to the closest non-allied starship in the initial target\'s zone. If the secondary target\'s AC is lower than your attack roll result, you deal electricity damage to that starship equal to 1 per weapon damage die.',
  ordnance: 'You can only fire ordnance weapons in the direction of your heading.',
  bypassing: 'An effect with the bypassing trait ignores Shield Points when dealing damage to a starship, instead affecting Hull Points directly.',
}
