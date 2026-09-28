/**
 * Chase rules (Starfinder GM Core pp. 214–217) and the vehicle condition rules a chase leans
 * on (GM Core pp. 234–237). Pure functions; chaseStore owns the state.
 */

import type {
  ChaseDegree,
  ChaseEndConditions,
  ChaseLength,
  ChaseObstacle,
  ChaseOutcome,
  ChaseScene,
  ChaseSide,
  ChaseType,
  ChaseVehicleInstance,
  SampleChaseObstacle,
  SavedChase,
  VehicleCondition,
} from '../types/chase'
import type { Vehicle } from '../types/tsc'

// ============ Chase Points ============

/** Chase Points gained or lost for a check result (p. 214). A plain failure changes nothing. */
export function chasePointsForDegree(degree: ChaseDegree): number {
  switch (degree) {
    case 'criticalSuccess': return 2
    case 'success': return 1
    case 'failure': return 0
    case 'criticalFailure': return -1
  }
}

/** A character who passes their turn or can't act costs the group 1 Chase Point (p. 214). */
export const PASS_PENALTY = -1

/** Rounds stuck on one obstacle before the book suggests offering another way around (p. 216). */
export const STUCK_ROUNDS = 3

/**
 * Typical Chase Points for an obstacle: half need one fewer than the party size, half need two
 * fewer, never less than 1 (p. 214). Alternates by position in the chase.
 */
export function suggestedChasePoints(partySize: number, index: number): number {
  return Math.max(1, partySize - (index % 2 === 0 ? 1 : 2))
}

/** Obstacles in a chase of each length (p. 215). */
export const OBSTACLES_BY_LENGTH: Record<Exclude<ChaseLength, 'custom'>, number> = {
  short: 6,
  medium: 8,
  long: 10,
}

export const PLAY_TIME_BY_LENGTH: Record<Exclude<ChaseLength, 'custom'>, string> = {
  short: '10–20 minutes',
  medium: '15–25 minutes',
  long: '20–30 minutes',
}

export function lengthForCount(count: number): ChaseLength {
  const match = (Object.keys(OBSTACLES_BY_LENGTH) as Exclude<ChaseLength, 'custom'>[])
    .find(k => OBSTACLES_BY_LENGTH[k] === count)
  return match ?? 'custom'
}

// ============ Setup ============

export const CHASE_TYPE_LABELS: Record<ChaseType, string> = {
  'chase-down': 'Chase Down',
  'run-away': 'Run Away',
  'beat-the-clock': 'Beat the Clock',
  competitive: 'Competitive Chase',
}

export const CHASE_TYPE_SUMMARIES: Record<ChaseType, string> = {
  'chase-down': 'The PCs pursue. Their quarry acts first and starts one obstacle ahead. It ends when the PCs catch up or the quarry reaches safety.',
  'run-away': 'The PCs flee and act first, starting one obstacle ahead. It ends when they reach safety, get three obstacles ahead, or are caught.',
  'beat-the-clock': 'The PCs must clear every obstacle before the rounds run out.',
  competitive: 'Both sides race for the same goal. Whoever clears the last obstacle first wins.',
}

function newId(): string {
  return crypto.randomUUID()
}

export function createSide(partial: Partial<ChaseSide> & Pick<ChaseSide, 'name' | 'role'>): ChaseSide {
  return {
    id: newId(),
    control: 'checks',
    isPlayers: false,
    position: 0,
    chasePoints: 0,
    pace: 1,
    rollModifier: 0,
    members: [],
    vehicles: [],
    roundsAtObstacle: 0,
    ...partial,
  }
}

/**
 * Starting sides and end conditions for each type of chase (p. 215–216).
 * The opposing side moves at a steady pace by default; switch its control to `checks` to roll.
 */
export function defaultSetup(type: ChaseType, obstacleCount: number): { sides: ChaseSide[]; end: ChaseEndConditions } {
  switch (type) {
    case 'chase-down':
      return {
        sides: [
          createSide({ name: 'Quarry', role: 'pursued', control: 'steady', position: 1 }),
          createSide({ name: 'Party', role: 'pursuer', isPlayers: true, position: 0 }),
        ],
        end: { catchEnds: true, leadToEscape: null, roundLimit: null },
      }
    case 'run-away':
      return {
        sides: [
          createSide({ name: 'Party', role: 'pursued', isPlayers: true, position: 0 }),
          createSide({ name: 'Pursuers', role: 'pursuer', control: 'steady', position: -1 }),
        ],
        end: { catchEnds: true, leadToEscape: 3, roundLimit: null },
      }
    case 'beat-the-clock':
      return {
        sides: [createSide({ name: 'Party', role: 'competitor', isPlayers: true, position: 0 })],
        end: { catchEnds: false, leadToEscape: null, roundLimit: obstacleCount },
      }
    case 'competitive':
      return {
        sides: [
          createSide({ name: 'Party', role: 'competitor', isPlayers: true, position: 0 }),
          createSide({ name: 'Rivals', role: 'competitor', control: 'steady', position: 0 }),
        ],
        end: { catchEnds: false, leadToEscape: null, roundLimit: null },
      }
  }
}

/** Sides in the order they act each round: the pursued first, then the pursuers (p. 214). */
export function turnOrder(sides: ChaseSide[]): ChaseSide[] {
  const rank = (s: ChaseSide) => (s.role === 'pursued' ? 0 : s.role === 'competitor' ? 1 : 2)
  return [...sides].sort((a, b) => rank(a) - rank(b))
}

export function obstacleFromSample(sample: SampleChaseObstacle, chasePoints: number): ChaseObstacle {
  return {
    id: newId(),
    name: sample.name,
    level: sample.level,
    environment: sample.environment,
    chasePoints,
    options: sample.options.map(o => ({ id: newId(), dc: o.dc, skills: [...o.skills], description: o.description })),
    description: '',
    revealedToPlayers: false,
    sampleId: sample.id,
  }
}

export function createEmptyObstacle(level: number, chasePoints: number): ChaseObstacle {
  return {
    id: newId(),
    name: 'New Obstacle',
    level,
    environment: 'custom',
    chasePoints,
    options: [
      { id: newId(), dc: 15, skills: [], description: '' },
      { id: newId(), dc: 15, skills: [], description: '' },
    ],
    description: '',
    revealedToPlayers: false,
  }
}

export function createEmptyChase(type: ChaseType = 'run-away'): SavedChase {
  const { sides, end } = defaultSetup(type, 0)
  return {
    id: newId(),
    name: 'New Chase',
    type,
    length: 'custom',
    level: 1,
    roundLength: '3 actions',
    description: '',
    obstacles: [],
    sides,
    end,
    savedAt: Date.now(),
  }
}

/** A running copy of a saved chase, with all progress reset. */
export function createSceneFromSaved(saved: SavedChase): ChaseScene {
  const copy: SavedChase = JSON.parse(JSON.stringify(saved))
  const scene: ChaseScene = {
    ...copy,
    id: newId(),
    templateId: saved.id,
    round: 1,
    isActive: true,
    pendingOutcome: null,
    outcome: null,
    log: [],
  }
  for (const side of scene.sides) {
    side.chasePoints = 0
    side.roundsAtObstacle = 0
    for (const m of side.members) m.hasActed = false
  }
  for (const o of scene.obstacles) o.revealedToPlayers = false
  revealReached(scene)
  return scene
}

// ============ Progress ============

export function currentObstacle(scene: Pick<ChaseScene, 'obstacles'>, side: ChaseSide): ChaseObstacle | null {
  return scene.obstacles[side.position] ?? null
}

export function hasFinished(scene: Pick<ChaseScene, 'obstacles'>, side: ChaseSide): boolean {
  return scene.obstacles.length > 0 && side.position >= scene.obstacles.length
}

/** Turn face up every obstacle the players' side has reached. */
export function revealReached(scene: Pick<ChaseScene, 'obstacles' | 'sides'>): void {
  for (const side of scene.sides) {
    if (!side.isPlayers) continue
    for (let i = 0; i <= side.position && i < scene.obstacles.length; i++) {
      if (i >= 0) scene.obstacles[i].revealedToPlayers = true
    }
  }
}

/** Move a side by whole obstacles, resetting its progress on the obstacle it leaves. */
export function moveSide(scene: Pick<ChaseScene, 'obstacles' | 'sides'>, side: ChaseSide, delta: number): void {
  const next = Math.max(-1, Math.min(scene.obstacles.length, side.position + delta))
  if (next === side.position) return
  side.position = next
  side.chasePoints = 0
  side.roundsAtObstacle = 0
  revealReached(scene)
}

/**
 * Add or remove Chase Points. The total never drops below 0, and once it reaches the
 * obstacle's requirement the side moves on; extra points do not carry over (p. 214).
 */
export function applyChasePoints(
  scene: Pick<ChaseScene, 'obstacles' | 'sides'>,
  side: ChaseSide,
  delta: number,
): { advanced: boolean; overcame?: ChaseObstacle } {
  const obstacle = currentObstacle(scene, side)
  if (!obstacle) return { advanced: false }
  side.chasePoints = Math.max(0, side.chasePoints + delta)
  if (side.chasePoints < obstacle.chasePoints) return { advanced: false }
  moveSide(scene, side, 1)
  return { advanced: true, overcame: obstacle }
}

// ============ Ending ============

/**
 * The end condition met by the current positions, if any (p. 215).
 * Getting far enough ahead and running out of time are only judged at the end of a round.
 */
export function checkOutcome(scene: ChaseScene, atEndOfRound: boolean): ChaseOutcome | null {
  const pursued = scene.sides.filter(s => s.role === 'pursued')
  const pursuers = scene.sides.filter(s => s.role === 'pursuer')
  const competitors = scene.sides.filter(s => s.role === 'competitor')

  const winners = competitors.filter(s => hasFinished(scene, s))
  if (winners.length > 1) {
    return { kind: 'tie', text: `${winners.map(s => s.name).join(' and ')} clear the last obstacle in the same round.` }
  }
  if (winners.length === 1) {
    return { kind: 'finished', winnerSideId: winners[0].id, text: `${winners[0].name} clear the last obstacle.` }
  }

  for (const runner of pursued) {
    if (hasFinished(scene, runner)) {
      return { kind: 'escaped', winnerSideId: runner.id, text: `${runner.name} clear the last obstacle and get away.` }
    }
  }

  if (scene.end.catchEnds) {
    for (const runner of pursued) {
      const catcher = pursuers.find(p => p.position >= runner.position)
      if (catcher) {
        return { kind: 'caught', winnerSideId: catcher.id, text: `${catcher.name} catch up with ${runner.name}.` }
      }
    }
  }

  if (!atEndOfRound) return null

  if (scene.end.leadToEscape !== null && pursuers.length > 0) {
    for (const runner of pursued) {
      const closest = Math.max(...pursuers.map(p => p.position))
      if (runner.position - closest >= scene.end.leadToEscape) {
        return {
          kind: 'trail-lost',
          winnerSideId: runner.id,
          text: `${runner.name} are ${runner.position - closest} obstacles ahead; the pursuers lose the trail.`,
        }
      }
    }
  }

  if (scene.end.roundLimit !== null && scene.round >= scene.end.roundLimit) {
    return { kind: 'out-of-time', text: `Round ${scene.round} ends and time runs out.` }
  }

  return null
}

// ============ Vehicles ============

/** Penalty to a broken vehicle's AC, saves and collision DC (GM Core p. 237). */
export const BROKEN_PENALTY = -2
/** Increase to every piloting check DC while the vehicle is broken (GM Core p. 237). */
export const BROKEN_PILOTING_DC_INCREASE = 5
/** Penalty to attacks made from a vehicle that moved in the last round (GM Core p. 237). */
export const MOVING_ATTACK_PENALTY = -2
/** The same penalty when the vehicle is uncontrolled or a reckless action was used (GM Core p. 237). */
export const RECKLESS_ATTACK_PENALTY = -4

export function createVehicleInstance(vehicle: Vehicle, label?: string): ChaseVehicleInstance {
  return {
    instanceId: newId(),
    label: label ?? vehicle.name,
    vehicle: JSON.parse(JSON.stringify(vehicle)),
    currentHP: vehicle.hp,
    uncontrolled: false,
  }
}

export function isDestroyed(instance: ChaseVehicleInstance): boolean {
  return instance.currentHP <= 0
}

/** Broken at or below the Broken Threshold; a destroyed vehicle is past broken. */
export function isBroken(instance: ChaseVehicleInstance): boolean {
  const bt = instance.vehicle.bt
  return !isDestroyed(instance) && bt !== undefined && instance.currentHP <= bt
}

export function vehicleCondition(instance: ChaseVehicleInstance): VehicleCondition {
  if (isDestroyed(instance)) return 'destroyed'
  if (isBroken(instance)) return 'broken'
  return instance.currentHP < instance.vehicle.hp ? 'damaged' : 'intact'
}

/** Damage after Hardness. Returns what actually came off the vehicle's Hit Points. */
export function applyVehicleDamage(
  instance: ChaseVehicleInstance,
  amount: number,
  options: { ignoreHardness?: boolean } = {},
): number {
  const afterHardness = options.ignoreHardness ? amount : amount - instance.vehicle.hardness
  const dealt = Math.max(0, Math.min(instance.currentHP, Math.floor(afterHardness)))
  instance.currentHP -= dealt
  return dealt
}

export function repairVehicle(instance: ChaseVehicleInstance, amount: number): number {
  const restored = Math.max(0, Math.min(instance.vehicle.hp - instance.currentHP, Math.floor(amount)))
  instance.currentHP += restored
  return restored
}

/** A vehicle's numbers with the broken penalties applied. */
export function effectiveVehicleStats(instance: ChaseVehicleInstance) {
  const broken = isBroken(instance)
  const penalty = broken ? BROKEN_PENALTY : 0
  const v = instance.vehicle
  return {
    broken,
    ac: v.ac + penalty,
    fort: v.saves.fort + penalty,
    collisionDC: v.collision.dc + penalty,
    pilotingChecks: v.pilotingChecks.map(c => ({
      ...c,
      dc: c.dc + (broken ? BROKEN_PILOTING_DC_INCREASE : 0),
    })),
    speed: v.speed.map(s => ({ ...s, feet: broken ? Math.floor(s.feet / 2) : s.feet })),
  }
}
