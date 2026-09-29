/**
 * Example chases, one for each type in GM Core p. 215–216.
 *
 * These are written for this app, not taken from a book. Obstacles with a `sample` are the
 * GM Core samples, copied from chaseObstacles.ts so they cannot drift. The rest are original
 * and follow the book's guidance for a 1st-level party: one easier approach (DC 13) and one
 * standard approach (DC 15), using different kinds of skill.
 */

import type { ChaseObstacle, ChaseSide, ChaseType, SavedChase } from '../types/chase'
import { SAMPLE_CHASE_OBSTACLES } from './chaseObstacles'
import { getVehicleById } from './vehicles'
import { createVehicleInstance, defaultSetup, obstacleFromSample, suggestedChasePoints } from '../utils/chaseRules'

/** The examples assume the usual party of four. */
const PARTY_SIZE = 4

type Approach = [dc: number, skills: string[], description: string]

interface ObstacleSpec {
  /** Name of a GM Core sample obstacle to use as printed. */
  sample?: string
  name?: string
  approaches?: Approach[]
  /** What the players see. */
  text: string
}

interface ExampleSpec {
  type: ChaseType
  name: string
  description: string
  roundLength: string
  sideNames: Record<'party' | 'other', string>
  vehicles: { party?: string; other?: string }
  obstacles: ObstacleSpec[]
}

function buildObstacle(chaseId: string, spec: ObstacleSpec, index: number): ChaseObstacle {
  const id = `${chaseId}-obstacle-${index + 1}`
  const chasePoints = suggestedChasePoints(PARTY_SIZE, index)
  if (spec.sample) {
    const sample = SAMPLE_CHASE_OBSTACLES.find(o => o.name === spec.sample)
    if (!sample) throw new Error(`Example chase uses unknown sample obstacle "${spec.sample}"`)
    const obstacle = obstacleFromSample(sample, chasePoints)
    obstacle.id = id
    obstacle.options.forEach((o, i) => { o.id = `${id}-approach-${i + 1}` })
    obstacle.description = spec.text
    return obstacle
  }
  return {
    id,
    name: spec.name ?? 'Obstacle',
    level: 1,
    environment: 'custom',
    chasePoints,
    options: (spec.approaches ?? []).map(([dc, skills, description], i) => ({
      id: `${id}-approach-${i + 1}`,
      dc,
      skills,
      description,
    })),
    description: spec.text,
    revealedToPlayers: false,
  }
}

function buildExample(spec: ExampleSpec): SavedChase {
  const id = `example-${spec.type}`
  const obstacles = spec.obstacles.map((o, i) => buildObstacle(id, o, i))
  const setup = defaultSetup(spec.type, obstacles.length)
  const sides: ChaseSide[] = setup.sides.map(side => {
    const which = side.isPlayers ? 'party' : 'other'
    const vehicleId = spec.vehicles[which]
    const vehicle = vehicleId ? getVehicleById(vehicleId) : undefined
    if (vehicleId && !vehicle) throw new Error(`Example chase uses unknown vehicle "${vehicleId}"`)
    return {
      ...side,
      id: `${id}-${which}`,
      name: spec.sideNames[which],
      vehicles: vehicle ? [{ ...createVehicleInstance(vehicle), instanceId: `${id}-${which}-vehicle` }] : [],
    }
  })
  return {
    id,
    name: spec.name,
    type: spec.type,
    length: 'short',
    level: 1,
    roundLength: spec.roundLength,
    description: spec.description,
    obstacles,
    sides,
    end: setup.end,
    savedAt: 0,
    isExample: true,
  }
}

export const EXAMPLE_CHASES: SavedChase[] = [
  buildExample({
    type: 'chase-down',
    name: 'Chase Down Example',
    description: 'A courier on an enercycle has the data the party was hired to recover, and is tearing through the city to get it off-world. The party gives chase in an urban cruiser.',
    roundLength: '3 actions',
    sideNames: { party: 'Party', other: 'Courier' },
    vehicles: { party: 'urban-cruiser', other: 'enercycle' },
    obstacles: [
      { sample: 'Red Light', text: 'The courier blows through a red light. Cross traffic closes behind them like a gate.' },
      { sample: 'Traffic Jam', text: 'Six lanes of stopped haulers, horns blaring. The enercycle is already threading the gaps.' },
      { sample: 'Confusing Side Streets', text: 'The courier ducks into the old quarter, where the streets were laid out by nobody in particular.' },
      { sample: 'Construction Site', text: 'Barriers, scaffolds and a crane swinging a girder. The courier rides straight through it.' },
      { sample: 'Spiked Rail', text: 'Someone has dropped a spike rail across the road, and it was not meant for the courier.' },
      {
        name: 'Spaceport Gate',
        approaches: [
          [15, ['Piloting'], 'slip through the gate before it closes'],
          [13, ['Deception', 'Diplomacy'], 'talk the gate crew into waving you through'],
        ],
        text: 'The spaceport gate is grinding shut. Past it, a shuttle is warming its engines.',
      },
    ],
  }),
  buildExample({
    type: 'run-away',
    name: 'Run Away Example',
    description: 'The job went wrong and station security is right behind the party. They grab hoverboards off a rental rack and run for the mag-train.',
    roundLength: '3 actions',
    sideNames: { party: 'Party', other: 'Station Security' },
    vehicles: { party: 'hoverboard' },
    obstacles: [
      {
        name: 'Night Market Stalls',
        approaches: [
          [15, ['Acrobatics', 'Piloting'], 'weave between the stalls at speed'],
          [13, ['Society'], 'cut through the service lane the vendors use'],
        ],
        text: 'Noodle carts, knockoff comm units and a hundred shoppers, all in the way.',
      },
      { sample: 'Security Drone', text: 'A drone drops out of the ceiling grid and starts reading out your rights.' },
      {
        name: 'Maintenance Shaft',
        approaches: [
          [15, ['Athletics'], 'ride the drop and catch the ledge below'],
          [13, ['Perception'], 'spot the cargo lift going the same way'],
        ],
        text: 'The walkway ends at an open shaft, four decks straight down.',
      },
      {
        name: 'Holo-Ad Gauntlet',
        approaches: [
          [15, ['Perception'], 'pick the real walls out from the holograms'],
          [13, ['Computers'], 'shut the projectors off'],
        ],
        text: 'Wall-to-wall holograms, each one brighter and louder than the last. Somewhere in there is the way through.',
      },
      { sample: 'Crowd', text: 'Shift change. The corridor fills with tired workers heading the other way.' },
      {
        name: 'Departing Mag-Train',
        approaches: [
          [15, ['Acrobatics'], 'leap aboard as it pulls out'],
          [13, ['Deception'], 'fold in with the passengers before the doors close'],
        ],
        text: 'The mag-train is already moving. Make it aboard and security is left on the platform.',
      },
    ],
  }),
  buildExample({
    type: 'beat-the-clock',
    name: 'Beat the Clock Example',
    description: 'The reactor is going critical and the ship has six rounds left. The party is on the wrong deck, and the last shuttle is in the hangar.',
    roundLength: '1 minute',
    sideNames: { party: 'Party', other: '' },
    vehicles: {},
    obstacles: [
      {
        name: 'Buckled Bulkhead',
        approaches: [
          [15, ['Athletics'], 'force the door along its warped track'],
          [13, ['Crafting'], 'bypass the door motor'],
        ],
        text: 'The blast door closed halfway and stuck. The frame around it has twisted.',
      },
      {
        name: 'Venting Coolant',
        approaches: [
          [15, ['Fortitude'], 'push through the freezing cloud'],
          [13, ['Crafting'], 'close the ruptured line'],
        ],
        text: 'White vapor fills the corridor, cold enough to burn.',
      },
      {
        name: 'Failing Gravity',
        approaches: [
          [15, ['Acrobatics'], 'push off the walls and sail down the corridor'],
          [13, ['Computers'], 'bring the deck plating back online'],
        ],
        text: 'The deck lets go of your boots. Loose cargo drifts up around you.',
      },
      {
        name: 'Corridor Fire',
        approaches: [
          [15, ['Reflex'], 'dash through between the bursts'],
          [13, ['Perception'], 'find the suppression controls'],
        ],
        text: 'A fuel line has caught. Flame rolls along the ceiling in waves.',
      },
      {
        name: 'Hangar Lockdown',
        approaches: [
          [15, ['Computers'], 'override the lockdown'],
          [13, ['Thievery'], 'hotwire the door panel'],
        ],
        text: 'The hangar has sealed itself. The panel flashes EVACUATION COMPLETE, which it is not.',
      },
      {
        name: 'Launch Through the Debris',
        approaches: [
          [15, ['Piloting'], 'fly the shuttle out through the wreckage'],
          [13, ['Computers'], 'plot a clear path for the pilot'],
        ],
        text: 'The shuttle is fueled and the hangar doors are open. Between you and open space is a cloud of the ship itself.',
      },
    ],
  }),
  buildExample({
    type: 'competitive',
    name: 'Competitive Chase Example',
    description: 'An illegal enercycle race through the undercity. A rival crew has bet everything on winning, and so has the party.',
    roundLength: '3 actions',
    sideNames: { party: 'Party', other: 'Rival Crew' },
    vehicles: { party: 'enercycle', other: 'enercycle' },
    obstacles: [
      { sample: 'Traffic Jam', text: 'The race starts on a public road, at rush hour, on purpose.' },
      {
        name: 'Hairpin Turn',
        approaches: [
          [15, ['Piloting'], 'drift it without losing speed'],
          [13, ['Perception'], 'find the racing line'],
        ],
        text: 'The road doubles back on itself over a long drop. There is no barrier.',
      },
      {
        name: 'Dirty Trick',
        approaches: [
          [15, ['Reflex'], 'dodge what they throw at you'],
          [13, ['Intimidation'], 'make them think twice about trying it'],
        ],
        text: 'The rivals pull alongside. One of them is holding a length of chain.',
      },
      {
        name: 'Tunnel Blackout',
        approaches: [
          [15, ['Perception'], 'ride it blind'],
          [13, ['Computers'], 'bring the tunnel lights back'],
        ],
        text: 'The lights in the tunnel go out all at once. Someone paid for that.',
      },
      {
        name: 'Broken Overpass',
        approaches: [
          [15, ['Piloting', 'Acrobatics'], 'jump the gap'],
          [13, ['Survival'], 'find the way down and around'],
        ],
        text: 'The overpass ends in open air. The far side is a long way off, and a little lower.',
      },
      {
        name: 'Final Straight',
        approaches: [
          [15, ['Piloting'], 'hold the throttle open to the line'],
          [13, ['Performance'], 'get the crowd to clear the road for you'],
        ],
        text: 'A kilometer of open road and a crowd leaning over the barriers. The finish is a line of flares.',
      },
    ],
  }),
]
