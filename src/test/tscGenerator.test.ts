import { describe, it, expect } from 'vitest'
import { generateOpposition, isSmallCrew, labelInstances, oppositionBudget, sceneThreat, shipXP } from '../utils/tscGenerator'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import type { Difficulty } from '../types/encounter'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const DIFFICULTIES: Difficulty[] = ['trivial', 'low', 'moderate', 'severe', 'extreme']
const FACTIONS = [...new Set(TSC_STARSHIPS.map(s => s.faction))]
const total = (ships: { level: number }[], level: number) => ships.reduce((sum, s) => sum + shipXP(s, level), 0)

describe('tactical scene generator', () => {
  it('uses the encounter budgets, smaller for a small crew', () => {
    expect(DIFFICULTIES.map(d => oppositionBudget(d, 4))).toEqual([40, 60, 80, 120, 160])
    // Three players: 20 less for the missing player, then the small-crew reduction
    expect(DIFFICULTIES.map(d => oppositionBudget(d, 3))).toEqual([10, 30, 40, 80, 120])
    expect(oppositionBudget('moderate', 5)).toBe(100)
    expect(isSmallCrew(3)).toBe(true)
    expect(isSmallCrew(4)).toBe(false)
  })

  it('never goes over budget, at any level, difficulty, party size or faction', () => {
    const problems: string[] = []
    let scenes = 0
    for (let level = 1; level <= 20; level++) {
      for (const difficulty of DIFFICULTIES) {
        for (const partySize of [3, 4, 6]) {
          for (const faction of ['', ...FACTIONS]) {
            const budget = oppositionBudget(difficulty, partySize)
            const ships = generateOpposition({ level, partySize, difficulty, faction, ships: TSC_STARSHIPS, random: seeded(level * 31 + partySize) })
            scenes++
            const where = `L${level} ${difficulty} party ${partySize} ${faction || 'any'}`
            const xp = total(ships, level)
            if (xp > budget) problems.push(`${where}: ${xp} XP over a budget of ${budget}`)
            if (ships.length > 6) problems.push(`${where}: ${ships.length} ships`)
            if (ships.some(s => s.level < level - 4)) problems.push(`${where}: a ship more than 4 levels below the party`)
            const counts: Record<string, number> = {}
            for (const s of ships) counts[s.id] = (counts[s.id] ?? 0) + 1
            if (Object.values(counts).some(n => n > 4)) problems.push(`${where}: more than 4 of one model`)
          }
        }
      }
    }
    expect(problems).toEqual([])
    expect(scenes).toBe(20 * 5 * 3 * 13)
  })

  it('fills most of the budget when ships of the right level exist', () => {
    const thin: string[] = []
    for (let level = 1; level <= 14; level++) {
      for (const difficulty of ['moderate', 'severe'] as Difficulty[]) {
        for (let seed = 1; seed <= 5; seed++) {
          const ships = generateOpposition({ level, partySize: 4, difficulty, faction: '', ships: TSC_STARSHIPS, random: seeded(seed * 97 + level) })
          const budget = oppositionBudget(difficulty, 4)
          if (total(ships, level) < budget * 0.75) thin.push(`L${level} ${difficulty} seed ${seed}: ${total(ships, level)} of ${budget}`)
        }
      }
    }
    expect(thin).toEqual([])
  })

  it('keeps to one faction when that faction has ships to offer', () => {
    const ships = generateOpposition({ level: 3, partySize: 4, difficulty: 'severe', faction: 'Free Captains', ships: TSC_STARSHIPS, random: seeded(4) })
    expect(ships.length).toBeGreaterThan(0)
    expect(new Set(ships.map(s => s.faction))).toEqual(new Set(['Free Captains']))
  })

  it('falls back to other factions when the chosen one has nothing at that level', () => {
    // The Swarm's ships are levels 2, 4, 10 and 17. A trivial scene for a 9th-level party
    // takes ships of levels 5 to 9, so the Swarm has nothing to offer
    expect(TSC_STARSHIPS.filter(x => x.faction === 'Swarm').map(x => x.level).sort((a, b) => a - b)).toEqual([2, 4, 10, 17])
    const ships = generateOpposition({ level: 9, partySize: 4, difficulty: 'trivial', faction: 'Swarm', ships: TSC_STARSHIPS, random: seeded(5) })
    expect(ships.length).toBeGreaterThan(0)
    expect(ships.every(s => s.faction !== 'Swarm')).toBe(true)
  })

  it('returns nothing when there is nothing to choose from', () => {
    expect(generateOpposition({ level: 5, partySize: 4, difficulty: 'moderate', faction: '', ships: [] })).toEqual([])
  })

  it('caps the toughest ship by difficulty', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const low = generateOpposition({ level: 5, partySize: 4, difficulty: 'low', faction: '', ships: TSC_STARSHIPS, random: seeded(seed) })
      expect(Math.max(...low.map(s => s.level))).toBeLessThanOrEqual(6)
      const severe = generateOpposition({ level: 5, partySize: 4, difficulty: 'severe', faction: '', ships: TSC_STARSHIPS, random: seeded(seed) })
      expect(Math.max(...severe.map(s => s.level))).toBeLessThanOrEqual(8)
    }
  })

  it('rates a scene from its ships and hazards', () => {
    const trident = TSC_STARSHIPS.find(s => s.name === 'Raider Trident')! // level -1
    const buccaneer = TSC_STARSHIPS.find(s => s.name === 'Dread Buccaneer')! // level 3
    const field = TSC_HAZARDS.find(h => h.name === 'Asteroid Field')! // simple, level 5
    const threat = sceneThreat([{ model: buccaneer }, { model: trident }, { model: trident }], [{ hazard: field }], 3, 4)
    // Level 3 ship 40, two level -1 ships 10 each, simple hazard two levels up 16
    expect(threat.xp).toBe(76)
    expect(threat.difficulty).toBe('low')
    expect(threat.smallCrew).toBe(false)
    expect(sceneThreat([{ model: buccaneer }], [], 3, 3)).toMatchObject({ xp: 40, difficulty: 'moderate', smallCrew: true })
    expect(sceneThreat([], [], 3, 4).xp).toBe(0)
  })

  it('numbers repeated ships', () => {
    const list = ['Trident', 'Buccaneer', 'Trident', 'Trident'].map(name => ({ name, label: '' }))
    labelInstances(list, i => i.name)
    expect(list.map(i => i.label)).toEqual(['Trident', 'Buccaneer', 'Trident 2', 'Trident 3'])
  })
})
