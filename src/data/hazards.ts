/**
 * Hazard Database for Starfinder 2e
 *
 * Data fetched from Archives of Nethys via `npm run fetch-hazards`
 */

import type { Hazard } from '../types/hazard'
import hazardsData from './hazards.json'

export const HAZARDS: Hazard[] = hazardsData as Hazard[]
