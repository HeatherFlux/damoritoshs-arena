import { describe, it, expect } from 'vitest'
import { closestToLevel, dcSummary, generateObstacles, swapObstacle, type ObstaclePool } from '../utils/chaseGenerator'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { createEmptyObstacle } from '../utils/chaseRules'

/** Repeatable stand-in for Math.random */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const familyOf = (sampleId?: string) => {
  const s = SAMPLE_CHASE_OBSTACLES.find(o => o.id === sampleId)!
  return s.baseId ?? s.id
}

describe('chase generator', () => {
  it('picks the version of an obstacle closest to the party level', () => {
    const crowd = SAMPLE_CHASE_OBSTACLES.filter(o => o.id === 'crowd' || o.baseId === 'crowd')
    expect(closestToLevel(crowd, 1).name).toBe('Crowd')
    expect(closestToLevel(crowd, 2).name).toBe('Crowd')
    expect(closestToLevel(crowd, 3).name).toBe('Convention Crowd')
    expect(closestToLevel(crowd, 12).name).toBe('Convention Crowd')
    const drone = SAMPLE_CHASE_OBSTACLES.filter(o => o.id === 'security-drone' || o.baseId === 'security-drone')
    expect(closestToLevel(drone, 5).name).toBe('Security Drone') // 4 away from both: the easier one
    expect(closestToLevel(drone, 6).name).toBe('Security Robot')
  })

  it('fills every length from every pool without repeating an obstacle', () => {
    const problems: string[] = []
    for (const pool of ['any', 'underground', 'urban', 'vehicle', 'wilderness'] as ObstaclePool[]) {
      for (const count of [6, 8, 10]) {
        for (const level of [1, 5, 10, 15, 20]) {
          const made = generateObstacles(count, [], { level, pool, partySize: 4, random: seeded(count * 100 + level) })
          if (made.length !== count) problems.push(`${pool} ${count} L${level}: got ${made.length}`)
          const used = made.map(o => familyOf(o.sampleId))
          if (new Set(used).size !== used.length) problems.push(`${pool} ${count} L${level}: repeats`)
          if (made.some(o => o.options.length < 2)) problems.push(`${pool} ${count} L${level}: obstacle with one approach`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('prefers obstacles near the party level', () => {
    const problems: string[] = []
    for (let seed = 1; seed <= 25; seed++) {
      const low = generateObstacles(8, [], { level: 1, pool: 'any', partySize: 4, random: seeded(seed) })
      const hard = low.filter(o => o.level > 3)
      if (hard.length) problems.push(`seed ${seed}: level 1 party given ${hard.map(o => `${o.name} (${o.level})`).join(', ')}`)
    }
    expect(problems).toEqual([])
  })

  it('uses the chosen environment first and tops up from the others', () => {
    // Underground has four obstacles near level 5: Virulent Fungi, Collapsed Tunnel, Mining Drill, and none other
    const made = generateObstacles(6, [], { level: 5, pool: 'underground', partySize: 4, random: seeded(7) })
    const underground = made.filter(o => o.environment === 'underground').map(o => o.name).sort()
    expect(underground).toEqual(['Collapsed Tunnel', 'Mining Drill', 'Virulent Fungi'])
    expect(made.slice(0, 3).every(o => o.environment === 'underground')).toBe(true)
    expect(made.slice(3).every(o => Math.abs(o.level - 5) <= 2)).toBe(true)
  })

  it('suggests Chase Points for the party size, continuing the pattern', () => {
    const first = generateObstacles(4, [], { level: 1, pool: 'urban', partySize: 4, random: seeded(1) })
    expect(first.map(o => o.chasePoints)).toEqual([3, 2, 3, 2])
    const more = generateObstacles(2, first.slice(0, 3), { level: 1, pool: 'urban', partySize: 5, random: seeded(2) })
    expect(more.map(o => o.chasePoints)).toEqual([3, 4])
  })

  it('does not repeat what is already in the chase', () => {
    const first = generateObstacles(6, [], { level: 1, pool: 'urban', partySize: 4, random: seeded(3) })
    const more = generateObstacles(6, first, { level: 1, pool: 'any', partySize: 4, random: seeded(4) })
    const before = new Set(first.map(o => familyOf(o.sampleId)))
    expect(more.some(o => before.has(familyOf(o.sampleId)))).toBe(false)
  })

  it('starts over once every obstacle has been used', () => {
    const all = generateObstacles(21, [], { level: 1, pool: 'any', partySize: 4, random: seeded(5) })
    expect(new Set(all.map(o => familyOf(o.sampleId))).size).toBe(21)
    expect(generateObstacles(3, all, { level: 1, pool: 'any', partySize: 4, random: seeded(6) })).toHaveLength(3)
  })

  it('swaps one obstacle for a new one and keeps its Chase Points', () => {
    const chase = generateObstacles(6, [], { level: 1, pool: 'vehicle', partySize: 4, random: seeded(8) })
    chase[2].chasePoints = 5
    const swapped = swapObstacle(chase, 2, { level: 1, pool: 'vehicle', partySize: 4, random: seeded(9) })!
    expect(swapped.chasePoints).toBe(5)
    expect(chase.map(o => familyOf(o.sampleId))).not.toContain(familyOf(swapped.sampleId))
    expect(swapObstacle(chase, 99, { level: 1, pool: 'any', partySize: 4 })).toBeNull()
  })

  it('leaves hand-made obstacles out of the no-repeat check', () => {
    const custom = createEmptyObstacle(1, 3)
    expect(generateObstacles(2, [custom], { level: 1, pool: 'any', partySize: 4, random: seeded(10) })).toHaveLength(2)
  })

  it('summarizes DCs', () => {
    const [o] = generateObstacles(1, [], { level: 1, pool: 'urban', partySize: 4, random: seeded(11) })
    expect(dcSummary(o)).toMatch(/^DC \d+ \/ \d+$/)
    expect(dcSummary({ ...o, options: [{ id: 'a', skills: [], description: '' }] })).toBe('no check')
    expect(dcSummary({ ...o, options: [] })).toBe('no approach')
  })
})
