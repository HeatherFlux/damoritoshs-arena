/**
 * Expansion bays (Starfinder Tech Core pp. 194–195). Player starships have four
 * expansion-bay slots; universal bays (crew quarters, lounge, mess bay) do not
 * consume a slot.
 */

export interface ExpansionBay {
  id: string
  name: string
  /** Universal bays come with every Medium or larger starship and use no slot. */
  universal: boolean
  /** Variants share one slot type; only one variant of a group can be installed. */
  group?: string
  summary: string
}

export const TSC_EXPANSION_BAYS: ExpansionBay[] = [
  { id: 'data-center', name: 'Data Center', universal: false, summary: 'Speedy intranet that connects to any infosphere within star-system range; registered crew can Access Infosphere and perform downtime activities remotely from anywhere aboard. Unavailable while the scanners are malfunctioning.' },
  { id: 'fabrication-lab', name: 'Fabrication Lab', universal: false, summary: 'Craft and Repair aboard without setup time; includes commercial creator capsules, UPB storage, workshops, and formulas for all level 0 adventuring gear.' },
  { id: 'holo-den', name: 'Holo Den', universal: false, summary: 'Retrain during downtime without a mentor; view any visual data stored on a bot, computer, or construct.' },
  { id: 'medical-bay', name: 'Medical Bay', universal: false, summary: 'Counts as a tactical medkit (+1 item bonus to Medicine inside); long-term rest recovers Con modifier × triple level HP.' },
  { id: 'passenger-quarters-basic', name: 'Passenger Quarters (Basic)', universal: true, group: 'passenger-quarters', summary: 'Cots and bucket seats for non-crew travelers. Does not take up an expansion bay slot.' },
  { id: 'passenger-quarters-prison', name: 'Passenger Quarters (Prison)', universal: false, group: 'passenger-quarters', summary: 'Secure cells with elite locks keyed to registered crew; a locked-in creature is observed and restrained.' },
  { id: 'passenger-quarters-luxury', name: 'Passenger Quarters (Luxury)', universal: false, group: 'passenger-quarters', summary: 'Grand suites; creatures aboard reduce their Will DC against crew Diplomacy checks to Gather Information, Make an Impression, or make a Request.' },
  { id: 'science-lab', name: 'Science Lab', universal: false, summary: '+1 item bonus to Recall Knowledge to identify items and creatures (one check per downtime day with a specimen) and to Research previously identified creatures or items.' },
  // Universal bays
  { id: 'crew-quarters-bunks', name: 'Crew Quarters (Bunks)', universal: true, group: 'crew-quarters', summary: 'Stacked metal cots; +1 item bonus to Perception checks for initiative while resting in the bunks.' },
  { id: 'crew-quarters-budget', name: 'Crew Quarters (Budget)', universal: true, group: 'crew-quarters', summary: 'Cramped rooms with a secret cache (+1 item bonus to Conceal up to 10 Bulk; Medium and smaller creatures gain +1 to Hide in the cache).' },
  { id: 'crew-quarters-comfortable', name: 'Crew Quarters (Comfortable)', universal: true, group: 'crew-quarters', summary: 'Plush rooms around a common area; the starship gains 1 extra expansion bay slot.' },
  { id: 'crew-quarters-extravagant', name: 'Crew Quarters (Extravagant)', universal: true, group: 'crew-quarters', summary: 'Biosynced luxury suites; a full night\'s rest takes only 4 hours.' },
  { id: 'lounge', name: 'Lounge', universal: true, summary: 'Recreation space of any size. Does not take up an expansion bay slot.' },
  { id: 'mess-bay', name: 'Mess Bay', universal: true, summary: 'Food synthesizer or cafeteria; stores 30 days of travel rations, refilled at port.' },
]

export function getExpansionBay(id: string): ExpansionBay | undefined {
  return TSC_EXPANSION_BAYS.find(b => b.id === id)
}

/** Number of expansion-bay slots a set of bays consumes (universal bays are free). */
export function expansionBaySlotsUsed(ids: string[]): number {
  return ids.filter(id => getExpansionBay(id)?.universal === false).length
}

/** Extra slots granted by installed bays (comfortable crew quarters grant one). */
export function expansionBayBonusSlots(ids: string[]): number {
  return ids.includes('crew-quarters-comfortable') ? 1 : 0
}
