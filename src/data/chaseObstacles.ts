/**
 * Sample chase obstacles (Starfinder GM Core p. 217), hand-transcribed.
 * Each base obstacle has a higher-level variant that keeps the same approaches with new DCs.
 * scripts/audit-chase.py checks every record against the book.
 */

import type { ChaseEnvironment, SampleChaseObstacle } from '../types/chase'

type Approach = [dc: number, skills: string[], description: string]

function sample(
  environment: ChaseEnvironment,
  name: string,
  level: number,
  approaches: Approach[],
  variantName: string,
  variantLevel: number,
  variantDcs: number[],
  /** Set when the variant prints different skills for an approach than the base does. */
  variantSkills: Record<number, string[]> = {},
): SampleChaseObstacle[] {
  const id = slug(name)
  const base: SampleChaseObstacle = {
    id,
    name,
    level,
    environment,
    options: approaches.map(([dc, skills, description]) => ({ dc, skills, description })),
  }
  const variant: SampleChaseObstacle = {
    id: slug(variantName),
    name: variantName,
    level: variantLevel,
    environment,
    baseId: id,
    options: approaches.map(([, skills, description], i) => ({
      dc: variantDcs[i],
      skills: variantSkills[i] ?? skills,
      description,
    })),
  }
  return [base, variant]
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const SAMPLE_CHASE_OBSTACLES: SampleChaseObstacle[] = [
  // ---- Underground ----
  ...sample('underground', 'Crumbling Corridor', 1, [
    [13, ['Acrobatics'], 'avoid damaging the walls'],
    [15, ['Crafting'], 'repair the walls'],
  ], 'Quaking Corridor', 11, [25, 30]),
  ...sample('underground', 'Fungal Grotto', 1, [
    [15, ['Fortitude'], 'endure poisonous spores'],
    [13, ['Survival'], 'avoid fruiting bodies'],
  ], 'Virulent Fungi', 5, [20, 18]),
  ...sample('underground', 'Collapsed Tunnel', 5, [
    [20, ['Athletics'], 'dig through'],
    [18, ['Perception'], 'find another path'],
  ], 'Ancient Collapse', 12, [30, 28]),
  ...sample('underground', 'Mining Drill', 5, [
    [20, ['Reflex'], 'dodge the drill'],
    [15, ['Thievery'], 'disable the drill'],
  ], 'Fleet of Drills', 12, [30, 28]),

  // ---- Urban ----
  ...sample('urban', 'Chain Link Fence', 1, [
    [13, ['Athletics'], 'climb'],
    [15, ['Thievery'], 'unlock the gate'],
  ], 'High Welded Wire Fence', 8, [20, 25]),
  ...sample('urban', 'Crowd', 1, [
    [15, ['Acrobatics', 'Athletics'], 'weave or push through'],
    [13, ['Society'], 'follow the flow'],
  ], 'Convention Crowd', 4, [20, 18], { 0: ['Athletics'] }),
  ...sample('urban', 'Illegally Parked Vehicle', 1, [
    [13, ['Crafting', 'Piloting'], 'cut the brakes'],
    [15, ['Intimidation'], 'make the owner move it'],
  ], 'Food Truck', 5, [20, 22]),
  ...sample('urban', 'Rickety Fire Escape', 1, [
    [15, ['Acrobatics'], 'slide down'],
    [13, ['Athletics'], 'swing from landing to landing'],
  ], 'Crumbling, Steep Fire Escape', 5, [18, 20]),
  ...sample('urban', 'Security Drone', 1, [
    [14, ['Computers'], 'reprogram'],
    [16, ['Stealth'], 'sneak past'],
  ], 'Security Robot', 9, [26, 28]),
  ...sample('urban', 'Viral Flash Mob', 2, [
    [15, ['Performance'], 'join in'],
    [13, ['Thievery'], 'disable the sound system'],
  ], 'Viral Surprise Concert', 12, [30, 28]),

  // ---- Vehicle ----
  ...sample('vehicle', 'Confusing Side Streets', 1, [
    [13, ['Society'], 'recall the street layout'],
    [15, ['Survival'], 'navigate through the tangle'],
  ], 'Twisting Back Alleys', 5, [18, 20]),
  ...sample('vehicle', 'Demonstration', 1, [
    [15, ['Intimidation'], 'part the crowd'],
    [13, ['Performance'], 'sway the masses'],
  ], 'Parade', 5, [20, 18]),
  ...sample('vehicle', 'Red Light', 1, [
    [13, ['Computers'], 'hack the lights'],
    [15, ['Piloting'], 'drive through oncoming traffic'],
  ], 'Busy Red Light', 11, [25, 30]),
  ...sample('vehicle', 'Spiked Rail', 1, [
    [15, ['Athletics', 'Crafting'], 'create an improvised ramp'],
    [13, ['Perception'], 'find a way around'],
  ], 'Blockaded Street', 5, [20, 18]),
  ...sample('vehicle', 'Traffic Jam', 1, [
    [13, ['Perception'], 'spot an opening'],
    [15, ['Piloting'], 'swerve through traffic'],
  ], 'Rush Hour', 5, [18, 20]),
  ...sample('vehicle', 'Construction Site', 2, [
    [17, ['Piloting'], 'swerve through the site'],
    [13, ['Society'], "understand the site's organization and layout"],
  ], 'Demolition Site', 5, [20, 18]),

  // ---- Wilderness ----
  ...sample('wilderness', 'Deep Mud', 1, [
    [15, ['Athletics'], 'slog through'],
    [13, ['Perception'], 'find a path'],
  ], 'Horrid Bog', 5, [20, 18]),
  ...sample('wilderness', 'Downpour', 1, [
    [13, ['Fortitude'], 'push through'],
    [15, ['Nature'], 'predict the weather'],
  ], 'Magical Thunderstorm', 11, [25, 30]),
  ...sample('wilderness', 'Rope Bridge', 1, [
    [15, ['Acrobatics'], 'cross carefully'],
    [13, ['Crafting'], 'make repairs'],
  ], 'Solitary Frayed Rope', 11, [30, 25]),
  ...sample('wilderness', 'Rushing River', 1, [
    [15, ['Athletics'], 'swim or hop across stones'],
    [13, ['Survival'], 'find a ford nearby'],
  ], 'Flash Flood', 5, [20, 18]),
  ...sample('wilderness', 'Tangled Forest', 2, [
    [17, ['Perception'], 'find the way'],
    [13, ['Survival'], 'plot a path'],
  ], 'Enchanted Forest', 5, [20, 18]),
]

/**
 * The book's one obstacle printed in full stat block form (GM Core p. 214).
 */
export const CROWD_EXAMPLE = {
  name: 'Crowd',
  level: 1,
  chasePoints: 3,
  description: 'Throngs of people crowd the space station corridors, making it difficult to continue the chase.',
}
