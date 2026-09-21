/**
 * Vehicles (Starfinder Tech Core pp. 134–141). Browse-only library; vehicles use the
 * GM Core vehicle rules (feet, Hardness/HP/BT) and are not starships.
 */

import type { Vehicle } from '../types/tsc'
import vehiclesData from './vehicles.json'

export const VEHICLES: Vehicle[] = vehiclesData as unknown as Vehicle[]
