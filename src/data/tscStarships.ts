/**
 * Tactical Starship Combat: NPC starship archive (Starfinder Tech Core pp. 210–245).
 *
 * Data extracted from the PDF via `npm run parse-techcore -- <pdf>`.
 */

import type { NpcStarship } from '../types/tsc'
import starshipsData from './tscStarships.json'

export const TSC_STARSHIPS: NpcStarship[] = starshipsData as unknown as NpcStarship[]

export function getTscStarshipById(id: string): NpcStarship | undefined {
  return TSC_STARSHIPS.find(s => s.id === id)
}
