/**
 * Tactical Starship Combat: starship hazards (Starfinder Tech Core pp. 246–255).
 *
 * Kept separate from `hazards.json` (Archives of Nethys creature-scale hazards),
 * which is regenerated wholesale by `npm run fetch-hazards`.
 */

import type { StarshipHazard } from '../types/tsc'
import hazardsData from './tscHazards.json'

export const TSC_HAZARDS: StarshipHazard[] = hazardsData as unknown as StarshipHazard[]

export function getTscHazardById(id: string): StarshipHazard | undefined {
  return TSC_HAZARDS.find(h => h.id === id)
}
