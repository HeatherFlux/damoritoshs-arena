/**
 * Fills a chase with sample obstacles so a GM can start from something playable.
 * The obstacles themselves are the ones printed in GM Core; only the selection is generated.
 */

import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import type { ChaseEnvironment, ChaseObstacle, SampleChaseObstacle } from '../types/chase'
import { obstacleFromSample, suggestedChasePoints } from './chaseRules'

export type ObstaclePool = Exclude<ChaseEnvironment, 'custom'> | 'any'

type Random = () => number

/** Each printed obstacle and its tougher variant, as one family. */
function families(): SampleChaseObstacle[][] {
  const bases = SAMPLE_CHASE_OBSTACLES.filter(o => !o.baseId)
  return bases.map(base => [base, ...SAMPLE_CHASE_OBSTACLES.filter(o => o.baseId === base.id)])
}

/** The version of a family closest to the party's level; the easier one wins a tie. */
export function closestToLevel(family: SampleChaseObstacle[], level: number): SampleChaseObstacle {
  return [...family].sort((a, b) =>
    Math.abs(a.level - level) - Math.abs(b.level - level) || a.level - b.level)[0]
}

function shuffle<T>(items: T[], random: Random): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** Obstacles this close to the party's level are a fair match for it. */
const LEVEL_REACH = 2

/**
 * Samples to draw from, best first. A fitting level matters more than the environment, so a
 * low-level party is not handed a DC 20 obstacle just because it is underground. Never repeats
 * a family that is already in use; when every family is used up it starts over.
 */
function candidates(pool: ObstaclePool, level: number, inUse: Set<string>, random: Random): SampleChaseObstacle[] {
  const all = families().map(f => closestToLevel(f, level))
  const familyId = (o: SampleChaseObstacle) => o.baseId ?? o.id
  const fresh = all.filter(o => !inUse.has(familyId(o)))
  const source = fresh.length > 0 ? fresh : all
  const inPool = (o: SampleChaseObstacle) => pool === 'any' || o.environment === pool
  const fits = (o: SampleChaseObstacle) => Math.abs(o.level - level) <= LEVEL_REACH
  // Furthest from the party's level last, so a poor match is only used when nothing else is left
  const byDistance = (list: SampleChaseObstacle[]) =>
    shuffle(list, random).sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))
  return [
    ...shuffle(source.filter(o => inPool(o) && fits(o)), random),
    ...shuffle(source.filter(o => !inPool(o) && fits(o)), random),
    ...byDistance(source.filter(o => inPool(o) && !fits(o))),
    ...byDistance(source.filter(o => !inPool(o) && !fits(o))),
  ]
}

function familiesInUse(obstacles: ChaseObstacle[]): Set<string> {
  const used = new Set<string>()
  for (const o of obstacles) {
    const sample = SAMPLE_CHASE_OBSTACLES.find(s => s.id === o.sampleId)
    if (sample) used.add(sample.baseId ?? sample.id)
  }
  return used
}

export interface GenerateOptions {
  level: number
  pool: ObstaclePool
  partySize: number
  random?: Random
}

/** `count` more obstacles to follow the ones already in the chase. */
export function generateObstacles(count: number, existing: ChaseObstacle[], options: GenerateOptions): ChaseObstacle[] {
  const random = options.random ?? Math.random
  const result: ChaseObstacle[] = []
  const inUse = familiesInUse(existing)
  while (result.length < count) {
    const next = candidates(options.pool, options.level, inUse, random)[0]
    if (!next) break
    inUse.add(next.baseId ?? next.id)
    result.push(obstacleFromSample(next, suggestedChasePoints(options.partySize, existing.length + result.length)))
  }
  return result
}

/** A different obstacle for one slot, keeping the slot's Chase Points. */
export function swapObstacle(obstacles: ChaseObstacle[], index: number, options: GenerateOptions): ChaseObstacle | null {
  const current = obstacles[index]
  if (!current) return null
  const random = options.random ?? Math.random
  const next = candidates(options.pool, options.level, familiesInUse(obstacles), random)[0]
  if (!next) return null
  return obstacleFromSample(next, current.chasePoints)
}

/** "DC 15 / 13" */
export function dcSummary(obstacle: ChaseObstacle): string {
  const dcs = obstacle.options.map(o => (o.dc === undefined ? 'no check' : String(o.dc)))
  if (dcs.length === 0) return 'no approach'
  return (dcs.some(d => d !== 'no check') ? 'DC ' : '') + dcs.join(' / ')
}
