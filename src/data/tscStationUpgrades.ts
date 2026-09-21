/**
 * Battle station upgrades (Starfinder Tech Core pp. 184–190) and escape pods.
 *
 * Only the bookkeeping fields are modelled here (which station takes the upgrade
 * and at what level each type becomes available); the station action text each
 * upgrade grants lives in the book. Escape pods replace the default pods and use
 * no upgrade slot.
 */

import type { StationGrade, StationKind } from '../types/tsc'

export interface UpgradeVariant {
  type: StationGrade
  level: number
}

export interface StationUpgrade {
  id: string
  name: string
  station: StationKind | 'escape pods'
  /** Item level of the base (lowest) type. */
  level: number
  /** Higher-grade types when the upgrade prints "Type …; Level …" entries. */
  variants?: UpgradeVariant[]
  traits: string[]
  /** Class feature or other prerequisite printed in the entry, if any. */
  prerequisite?: string
  summary: string
}

const T = ['starship', 'tech']
const MT = ['magical', 'starship', 'tech']

export const TSC_STATION_UPGRADES: StationUpgrade[] = [
  // Drone console
  { id: 'drone-shield-protocol', name: 'Drone Shield Protocol', station: 'drone console', level: 0, traits: T, summary: 'Drone Block up to twice per drone; grants Fetch and Fix.' },
  { id: 'mine-deployment-shell', name: 'Mine Deployment Shell', station: 'drone console', level: 0, traits: T, prerequisite: 'mine exocortex', summary: 'Grants Install Mine (Modify up to four pyrotechnics drone mines).' },
  { id: 'pet-drone-shell', name: 'Pet Drone Shell', station: 'drone console', level: 3, traits: T, summary: 'A Tiny minion assists with the drones; grants Onboard Pet (quickened for drone console actions).' },
  // Generator
  { id: 'gravity-toggle', name: 'Gravity Toggle', station: 'generator', level: 1, traits: T, summary: 'Grants Switch Gravity (toggle the starship\'s artificial gravity).' },
  { id: 'mechanic-generator-module', name: 'Mechanic Generator Module', station: 'generator', level: 1, traits: T, prerequisite: 'Modify (mechanic)', summary: 'Grants Modify Starship: apply one of six mods to another battle station until the end of your next turn.' },
  { id: 'operators-switchboard', name: "Operator's Switchboard", station: 'generator', level: 3, traits: T, summary: 'Grants Efficient Boost (Boost Battle Station twice, once per round).' },
  { id: 'primal-shielding', name: 'Primal Shielding', station: 'generator', level: 5, traits: ['primal', 'starship', 'tech'], summary: 'Life support persists while inoperable; grants Shielding Foliage (once per day resistance equal to level when SP are 0).' },
  { id: 'pulse-shield', name: 'Pulse Shield', station: 'generator', level: 1, variants: [{ type: 'commercial', level: 1 }, { type: 'tactical', level: 5 }, { type: 'advanced', level: 8 }], traits: T, summary: 'Grants Shield Pulse: spend Shield Points to deal that much electricity damage to other starships in your zone (tactical: exclude your zone or reach 1 zone; advanced: 2 zones).' },
  { id: 'solar-generator-crystal', name: 'Solar Generator Crystal', station: 'generator', level: 1, traits: MT, prerequisite: 'solar shield (solarian); ramming prow', summary: 'Grants Nova Shield (1d8 SP, +1d8 at 3rd and every 2 levels; +1 circumstance AC).' },
  { id: 'tractor-beam', name: 'Tractor Beam', station: 'generator', level: 4, traits: T, summary: 'Grants Pull Starship (Fortitude save vs. your Crafting DC; pull the target closer and slow it).' },
  // Gunnery
  { id: 'gunnery-turret-mount', name: 'Gunnery Turret Mount', station: 'gunnery', level: 0, traits: T, prerequisite: 'turret exocortex (mechanic)', summary: 'A mechanic can Deploy their turret into the gunnery as a starship weapon.' },
  { id: 'munitions-deflection-unit', name: 'Munitions Deflection Unit', station: 'gunnery', level: 0, traits: T, summary: 'Grants Deflect Munitions (+2 circumstance to Reflex saves for 1 round when targeted, requires an area or automatic weapon).' },
  { id: 'ordnance-hinges', name: 'Ordnance Hinges', station: 'gunnery', level: 0, traits: T, summary: 'Grants Rotate Armament (fire an ordnance weapon in any direction for the rest of the turn).' },
  { id: 'secondary-armaments', name: 'Secondary Armaments', station: 'gunnery', level: 0, traits: T, summary: 'Install a second weapon in the gunnery; switch the active weapon with an Interact station action.' },
  { id: 'starship-weapon-crystal', name: 'Starship Weapon Crystal', station: 'gunnery', level: 1, variants: [{ type: 'commercial', level: 1 }, { type: 'tactical', level: 2 }, { type: 'advanced', level: 4 }], traits: MT, prerequisite: 'stellar attunement (solarian)', summary: 'A solarian manifests a nova weapon: Nova Strike (commercial), Nova Blast with a nova flare (tactical), Nova Surge reaction (advanced).' },
  { id: 'towing-winch', name: 'Towing Winch', station: 'gunnery', level: 1, traits: T, summary: 'Grants Connect Tow Cable (a ranged Strike that tethers a starship in your zone).' },
  // Magic conduit
  { id: 'mystic-magic-module', name: 'Mystic Magic Module', station: 'magic conduit', level: 0, traits: MT, prerequisite: 'vitality network (mystic)', summary: 'The starship becomes a bonded creature; grants Transmute Vitality (Transfer Vitality restores Hull Points).' },
  { id: 'tangle-ward', name: 'Tangle Ward', station: 'magic conduit', level: 0, variants: [{ type: 'commercial', level: 0 }, { type: 'tactical', level: 5 }, { type: 'advanced', level: 11 }, { type: 'superior', level: 16 }], traits: ['primal', 'starship', 'tech'], summary: 'Grants Snare Boarders (difficult terrain in a 20-foot burst when a creature enters the ship; higher types add a Reflex save and longer durations).' },
  { id: 'technomancer-magic-module', name: 'Technomancer Magic Module', station: 'magic conduit', level: 0, variants: [{ type: 'commercial', level: 0 }, { type: 'tactical', level: 5 }], traits: MT, prerequisite: 'Overclock Gear (technomancer)', summary: 'Grants Overclock Magic Conduit (change starship spell damage types); tactical adds Overclock Shielding.' },
  { id: 'witchwarper-magic-module', name: 'Witchwarper Magic Module', station: 'magic conduit', level: 0, traits: ['magic', 'starship', 'tech'], prerequisite: 'Warp Reality (witchwarper)', summary: 'Grants Warp Space and Time (a 1-zone burst that reduces enemy Speed by 1 zone and always allows Stick to Cover).' },
  // Pilot's console
  { id: 'nova-prow', name: 'Nova Prow', station: "pilot's console", level: 5, variants: [{ type: 'commercial', level: 5 }, { type: 'tactical', level: 9 }, { type: 'advanced', level: 13 }, { type: 'superior', level: 16 }, { type: 'elite', level: 19 }], traits: MT, prerequisite: 'solarian class DC', summary: 'Grants Nova Ram (Boost Thrusters then collide: 2d8 graviton bludgeoning or photon fire, scaling to 10d8 at elite).' },
  { id: 'powerful-thrusters', name: 'Powerful Thrusters', station: "pilot's console", level: 0, traits: T, summary: 'Grants Overload Thrusters (free action, once per minute: +1-zone status bonus to Speed until the start of your next turn).' },
  { id: 'ramming-prow', name: 'Ramming Prow', station: "pilot's console", level: 5, variants: [{ type: 'commercial', level: 5 }, { type: 'tactical', level: 9 }, { type: 'advanced', level: 13 }, { type: 'superior', level: 16 }, { type: 'elite', level: 19 }], traits: T, summary: 'Grants Ram (Boost Thrusters then collide: 2d8 bludgeoning with a basic Fortitude save vs. your Piloting DC, scaling to 10d8 at elite).' },
  { id: 'rotational-thrusters', name: 'Rotational Thrusters', station: "pilot's console", level: 0, traits: T, summary: 'Grants Uncanny Turn (reaction, once per round: Change Heading before or after Boost Thrusters).' },
  { id: 'solar-thrusters', name: 'Solar Thrusters', station: "pilot's console", level: 2, traits: MT, prerequisite: 'solarian class DC', summary: 'Grants Nova Dash (Boost Thrusters up to twice your Speed with +1 zone; graviton: enemies in your zone save or become off-kilter; photon: a concealing photon field).' },
  { id: 'thasteron-afterburner', name: 'Thasteron Afterburner', station: "pilot's console", level: 1, variants: [{ type: 'commercial', level: 1 }, { type: 'tactical', level: 2 }, { type: 'advanced', level: 4 }, { type: 'superior', level: 10 }, { type: 'elite', level: 12 }, { type: 'ultimate', level: 12 }, { type: 'paragon', level: 19 }], traits: T, summary: 'Grants Thasteron Burst (once per 10 minutes: Boost Thrusters with +1-zone Speed and 1d12 fire to starships in your original zone, scaling to 14d12 and +2 zones at paragon).' },
  // Scanners
  { id: 'cloaking-unit', name: 'Cloaking Unit', station: 'scanners', level: 8, variants: [{ type: 'commercial', level: 8 }, { type: 'tactical', level: 10 }], traits: T, summary: 'Grants Cloak Starship (invisible for 1 hour, once per day; tactical: three times per day).' },
  { id: 'communications-overlay', name: 'Communications Overlay', station: 'scanners', level: 0, traits: T, summary: '+1 item bonus to Lie, Demoralize, Gather Information, and Make an Impression over Hacked Comms.' },
  { id: 'security-relay', name: 'Security Relay', station: 'scanners', level: 0, variants: [{ type: 'commercial', level: 0 }, { type: 'tactical', level: 6 }], traits: T, summary: 'Grants Security Scan (secret Computers check to locate intruders and disguised creatures aboard; tactical also detects onboard hazards).' },
  // Escape pods (replace default pods; no upgrade slot)
  { id: 'executive-escape-pod', name: 'Executive Escape Pod', station: 'escape pods', level: 0, traits: T, summary: 'Luxury pods with a sleep nook and fabricator; no mechanical benefit.' },
  { id: 'explorer-survival-pod', name: 'Explorer Survival Pod', station: 'escape pods', level: 0, traits: T, summary: 'Life support, food, and water for up to 6 months.' },
  { id: 'interplanar-pod', name: 'Interplanar Pod', station: 'escape pods', level: 15, traits: MT, summary: 'Returns passengers to a designated location in the Universe via a planar displacement ritual; single use.' },
  { id: 'magnepod', name: 'Magnepod', station: 'escape pods', level: 3, traits: T, summary: 'Attaches to other starships with boosters and magnets.' },
  { id: 'telepod', name: 'Telepod', station: 'escape pods', level: 13, traits: MT, summary: 'Translocates up to three times, each jump the distance a standard engine covers in 1d4 days.' },
]

export function getStationUpgrade(id: string): StationUpgrade | undefined {
  return TSC_STATION_UPGRADES.find(u => u.id === id)
}

export function upgradesForStation(kind: StationKind): StationUpgrade[] {
  return TSC_STATION_UPGRADES.filter(u => u.station === kind)
}

/** Highest variant type available at a starship level (undefined if below the base level). */
export function upgradeTypeAtLevel(upgrade: StationUpgrade, level: number): UpgradeVariant | undefined {
  if (!upgrade.variants) return level >= upgrade.level ? { type: 'commercial', level: upgrade.level } : undefined
  let best: UpgradeVariant | undefined
  for (const v of upgrade.variants) if (level >= v.level) best = v
  return best
}
