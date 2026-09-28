/**
 * Vehicles. They use the GM Core vehicle rules (feet, Hardness/HP/BT) and are not starships.
 *
 * - vehicles.json: Starfinder Tech Core pp. 134–141, parsed from the PDF (scripts/parse-techcore.py)
 * - aonVehicles.json: GM Core and later books, from Archives of Nethys (npm run fetch-vehicles)
 */

import type { Vehicle } from '../types/tsc'
import vehiclesData from './vehicles.json'
import aonVehiclesData from './aonVehicles.json'

export const TECH_CORE_VEHICLES: Vehicle[] = vehiclesData as unknown as Vehicle[]
export const AON_VEHICLES: Vehicle[] = aonVehiclesData as unknown as Vehicle[]

export const VEHICLES: Vehicle[] = [...TECH_CORE_VEHICLES, ...AON_VEHICLES]
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

export function getVehicleById(id: string): Vehicle | undefined {
  return VEHICLES.find(v => v.id === id)
}
