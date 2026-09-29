/**
 * Fills a tactical starship scene with enemy ships for a chosen difficulty, so a GM can start
 * from something playable. The ships are the ones printed in Tech Core; only the selection is
 * generated. Budgets follow the encounter rules: starships count as creatures (Tech Core p. 208).
 */

import type { NpcStarship, StarshipHazard, TscHazardInstance, TscNpcShipInstance } from '../types/tsc'
import {
  DIFFICULTY_BUDGETS,
  SMALL_CREW_REDUCTION,
  calculateStarshipHazardXP,
  getAdjustedBudget,
  getCreatureXP,
  getDifficulty,
  type Difficulty,
} from '../types/encounter'

type Random = () => number

/** A crew of three or fewer gets a smaller budget (Tech Core p. 208). */
export const SMALL_CREW_SIZE = 3

/** How far above the party's level the toughest ship may be at each difficulty. */
const MAX_LEVEL_ABOVE: Record<Difficulty, number> = {
  trivial: 0,
  low: 1,
  moderate: 2,
  severe: 3,
  extreme: 4,
}

const MAX_SHIPS = 6
const MAX_OF_ONE_MODEL = 4

export interface OppositionOptions {
  level: number
  partySize: number
  difficulty: Difficulty
  /** Faction to draw from, or '' for any. */
  faction: string
  ships: NpcStarship[]
  random?: Random
}

export function isSmallCrew(partySize: number): boolean {
  return partySize <= SMALL_CREW_SIZE
}

/** XP to spend at this difficulty for this party. */
export function oppositionBudget(difficulty: Difficulty, partySize: number): number {
  const reduction = isSmallCrew(partySize) ? SMALL_CREW_REDUCTION[difficulty] : 0
  return Math.max(0, getAdjustedBudget(partySize, DIFFICULTY_BUDGETS[difficulty]) - reduction)
}

export function shipXP(ship: Pick<NpcStarship, 'level'>, partyLevel: number): number {
  return getCreatureXP(ship.level - partyLevel)
}

function pick<T>(items: T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

/**
 * Enemy ships worth about the budget. One faction where possible, led by a ship that takes a
 * good share of the budget, with smaller ships alongside.
 */
export function generateOpposition(options: OppositionOptions): NpcStarship[] {
  const random = options.random ?? Math.random
  const budget = oppositionBudget(options.difficulty, options.partySize)
  const top = options.level + MAX_LEVEL_ABOVE[options.difficulty]
  const cost = (s: NpcStarship) => shipXP(s, options.level)
  // Ships more than four levels below the party are not worth putting on the map
  const usable = options.ships.filter(s => s.level >= options.level - 4 && s.level <= top && cost(s) > 0 && cost(s) <= budget)
  if (usable.length === 0) return []

  const inFaction = options.faction ? usable.filter(s => s.faction === options.faction) : usable
  const pool = inFaction.length > 0 ? inFaction : usable

  // The lead ship sets the faction for the rest. One that takes a good share of the budget
  // but leaves room for escorts makes a better fight than a lone ship.
  const withEscorts = pool.filter(s => cost(s) >= budget * 0.4 && cost(s) <= budget * 0.75)
  const leads = withEscorts.length > 0 ? withEscorts : pool.filter(s => cost(s) >= budget * 0.4)
  const lead = pick(leads.length > 0 ? leads : pool, random)
  const result = [lead]
  let remaining = budget - cost(lead)

  const sameFaction = usable.filter(s => s.faction === lead.faction)
  while (result.length < MAX_SHIPS) {
    const affordable = (list: NpcStarship[]) => list.filter(s =>
      cost(s) <= remaining && result.filter(r => r.id === s.id).length < MAX_OF_ONE_MODEL)
    const options1 = affordable(sameFaction)
    const next = options1.length > 0 ? options1 : affordable(usable)
    if (next.length === 0) break
    // Spend most of what is left each time, so the scene is a few ships rather than a swarm
    const biggest = Math.max(...next.map(cost))
    const chosen = pick(next.filter(s => cost(s) >= biggest / 2), random)
    result.push(chosen)
    remaining -= cost(chosen)
  }
  return result.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
}

export interface SceneThreat {
  xp: number
  difficulty: Difficulty
  budget: Record<Difficulty, number>
  smallCrew: boolean
}

/** Total XP and difficulty of the ships and hazards in a scene. */
export function sceneThreat(
  npcShips: Pick<TscNpcShipInstance, 'model'>[],
  hazards: Pick<TscHazardInstance, 'hazard'>[],
  partyLevel: number,
  partySize: number,
): SceneThreat {
  const xp = npcShips.reduce((sum, n) => sum + shipXP(n.model, partyLevel), 0)
    + hazards.reduce((sum, h) => sum + calculateStarshipHazardXP(h.hazard as StarshipHazard, partyLevel), 0)
  const smallCrew = isSmallCrew(partySize)
  const budget = Object.fromEntries(
    (Object.keys(DIFFICULTY_BUDGETS) as Difficulty[]).map(d => [d, oppositionBudget(d, partySize)]),
  ) as Record<Difficulty, number>
  return { xp, difficulty: getDifficulty(xp, partySize, smallCrew), budget, smallCrew }
}

/** "Raider Trident", "Raider Trident 2", ... in the order given. */
export function labelInstances<T extends { label: string }>(instances: T[], nameOf: (instance: T) => string): void {
  const seen: Record<string, number> = {}
  for (const instance of instances) {
    const name = nameOf(instance)
    seen[name] = (seen[name] ?? 0) + 1
    instance.label = seen[name] === 1 ? name : `${name} ${seen[name]}`
  }
}
