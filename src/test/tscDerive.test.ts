import { describe, it, expect } from 'vitest'
import {
  createPlayerStarship,
  degreeOfSuccess,
  deriveStarshipStats,
  generateShieldsDice,
  hullIntegrityDC,
  hullIntegrityDelta,
  setPlayerStarshipLevel,
  stationGradeForLevel,
  upgradeSlotsForGrade,
} from '../utils/tscDerive'
import { FRAMES, getFrameRow } from '../data/tscFrames'
import { STATION_KINDS, STATION_GRADES, TSC_STATION_ACTIONS } from '../data/tscStations'
import { TSC_WEAPONS } from '../data/tscWeapons'
import { TSC_STATION_UPGRADES, upgradeTypeAtLevel } from '../data/tscStationUpgrades'
import { TSC_EXPANSION_BAYS, expansionBaySlotsUsed, expansionBayBonusSlots } from '../data/tscExpansionBays'
import { CONDITIONS, COMBAT_CONDITIONS, TSC_CONDITIONS } from '../data/conditions'
import type { FrameId, PlayerStarship, StationGrade } from '../types/tsc'

/**
 * Oracle for the frame tables, transcribed independently from Tech Core pp. 197–199
 * (HP / SP / AC / Fort / Ref / Will / Speed). Kept separate from tscFrames.ts on
 * purpose: if either transcription has a typo the two disagree and this fails.
 */
const ORACLE: Record<FrameId, string> = {
  bulwark:
    '27/10/17/9/6/8/2 42/14/18/10/7/9/2 57/18/19/11/10/10/2 72/22/20/12/11/11/2 92/31/21/14/13/13/2 108/36/22/15/14/14/2 ' +
    '124/41/25/18/15/15/2 140/46/26/19/16/16/2 156/51/27/20/17/17/2 172/66/28/21/18/19/3 188/72/29/22/19/22/3 204/78/30/23/20/23/3 ' +
    '220/84/33/24/21/24/3 236/90/34/25/22/25/3 267/96/35/29/24/26/3 284/102/36/30/25/27/3 301/108/39/31/26/28/3 318/114/40/32/27/29/3 ' +
    '335/120/41/33/28/30/4 372/146/42/35/29/32/4',
  explorer:
    '24/11/15/8/6/9/3 36/16/16/9/7/10/3 48/21/17/10/10/11/3 60/26/18/11/11/12/3 77/36/20/13/13/14/3 90/42/21/14/14/15/3 ' +
    '103/48/24/15/15/18/4 116/54/25/16/16/19/4 129/60/26/17/17/20/4 142/66/28/18/19/21/4 155/72/29/21/20/22/4 168/78/30/22/21/23/4 ' +
    '181/84/33/23/22/24/4 194/90/34/24/23/25/4 222/111/35/26/24/29/5 236/118/36/27/25/30/5 250/125/39/28/26/31/5 264/132/40/29/27/32/5 ' +
    '278/139/41/30/28/33/5 292/166/43/31/30/35/5',
  skirmisher:
    '22/8/16/6/9/8/5 32/12/17/7/10/9/5 42/16/18/10/11/10/5 52/20/19/11/12/11/5 67/29/21/13/14/13/5 78/34/22/14/15/14/5 ' +
    '89/39/25/15/18/15/6 100/44/26/16/19/16/6 111/49/27/17/20/17/6 122/64/28/18/21/19/6 133/70/29/19/22/22/6 144/76/30/20/23/23/6 ' +
    '155/82/33/21/24/24/6 166/88/34/22/25/25/6 192/94/36/24/29/26/7 204/100/37/25/30/27/7 216/106/40/26/31/28/7 228/112/41/27/32/29/7 ' +
    '240/118/42/28/33/30/7 252/144/44/29/35/32/7',
}

function oracleRows(frame: FrameId) {
  return ORACLE[frame].split(' ').map((row, i) => {
    const [hp, sp, ac, fort, ref, will, speed] = row.split('/').map(Number)
    return { level: i + 1, hp, sp, ac, fort, ref, will, speed }
  })
}

describe('frame tables', () => {
  it('match the book for every frame at every level 1–20', () => {
    for (const frame of ['bulwark', 'explorer', 'skirmisher'] as FrameId[]) {
      const rows = oracleRows(frame)
      expect(rows).toHaveLength(20)
      expect(FRAMES[frame].levels).toEqual(rows)
      rows.forEach(r => expect(getFrameRow(frame, r.level)).toEqual(r))
    }
  })

  it('clamps levels outside 1–20', () => {
    expect(getFrameRow('bulwark', 0)).toEqual(FRAMES.bulwark.levels[0])
    expect(getFrameRow('bulwark', 25)).toEqual(FRAMES.bulwark.levels[19])
  })

  it('frames have the printed sensor ranges and default stations', () => {
    expect(FRAMES.bulwark.sensorRange).toBe(5)
    expect(FRAMES.explorer.sensorRange).toBe(6)
    expect(FRAMES.skirmisher.sensorRange).toBe(4)
    expect(FRAMES.bulwark.defaultStations).toEqual([{ kind: "pilot's console", upgradeId: 'ramming-prow' }, { kind: 'generator' }])
    expect(FRAMES.explorer.defaultStations).toEqual([{ kind: "pilot's console" }, { kind: 'generator', upgradeId: 'pulse-shield' }])
    expect(FRAMES.skirmisher.defaultStations).toEqual([{ kind: "pilot's console", upgradeId: 'rotational-thrusters' }, { kind: 'generator' }])
    for (const f of Object.values(FRAMES)) {
      for (const d of f.defaultStations) {
        if (d.upgradeId) expect(TSC_STATION_UPGRADES.some(u => u.id === d.upgradeId)).toBe(true)
      }
    }
  })
})

describe('battle station grades', () => {
  const expectGrades = (kind: 'gunnery' | 'generator', breakpoints: number[]) => {
    STATION_GRADES.forEach((grade, i) => {
      expect(stationGradeForLevel(kind, breakpoints[i])).toBe(grade)
      if (i > 0) expect(stationGradeForLevel(kind, breakpoints[i] - 1)).toBe(STATION_GRADES[i - 1])
    })
  }

  it('drone console and gunnery advance at 1/2/4/10/12/16/19', () => {
    expectGrades('gunnery', [1, 2, 4, 10, 12, 16, 19])
    expect(stationGradeForLevel('drone console', 4)).toBe('advanced')
    expect(stationGradeForLevel('drone console', 20)).toBe('paragon')
  })

  it('generator, magic conduit, pilot\'s console, scanners advance at 1/2/5/8/11/14/18', () => {
    expectGrades('generator', [1, 2, 5, 8, 11, 14, 18])
    expect(stationGradeForLevel('magic conduit', 4)).toBe('tactical')
    expect(stationGradeForLevel("pilot's console", 5)).toBe('advanced')
    expect(stationGradeForLevel('scanners', 17)).toBe('ultimate')
  })

  it('upgrade slots are 0/1/2/2/3/3/4 by grade', () => {
    const slots = STATION_GRADES.map(g => upgradeSlotsForGrade(g as StationGrade))
    expect(slots).toEqual([0, 1, 2, 2, 3, 3, 4])
  })

  it('every station has a station action at commercial grade', () => {
    for (const kind of STATION_KINDS) {
      expect(TSC_STATION_ACTIONS.some(a => a.station === kind && a.grade === 'commercial')).toBe(true)
    }
    expect(new Set(TSC_STATION_ACTIONS.map(a => a.id)).size).toBe(TSC_STATION_ACTIONS.length)
  })
})

describe('deriveStarshipStats', () => {
  const explorer5 = (): PlayerStarship => createPlayerStarship('explorer', 5, 'Test')

  it('a level-5 explorer has HP 77, SP 36, AC 20, +13/+13/+14, speed 3, sensors 6', () => {
    const d = deriveStarshipStats(explorer5())
    expect(d).toMatchObject({ maxHP: 77, maxSP: 36, ac: 20, fort: 13, ref: 13, will: 14, speed: 3, sensorRange: 6 })
    expect(d.stations.map(s => [s.kind, s.grade, s.upgradeSlots])).toEqual([
      ["pilot's console", 'advanced', 2],
      ['generator', 'advanced', 2],
    ])
  })

  it('helmed stations add their item bonuses; unhelmed ones do not', () => {
    const ship = explorer5()
    ship.level = 8
    const base = deriveStarshipStats(ship)
    expect(base.ac).toBe(25)
    ship.stations[0].helmedBy = 'pilot'   // pilot's console at L8 is superior: +1 AC, +1 Ref
    ship.stations[1].helmedBy = 'engineer' // generator at L8 is superior: +1 Fort
    const helmed = deriveStarshipStats(ship)
    expect(helmed.ac).toBe(26)
    expect(helmed.ref).toBe(base.ref + 1)
    expect(helmed.fort).toBe(base.fort + 1)
    expect(helmed.will).toBe(base.will)
  })

  it('uses the pilot\'s Piloting DC as AC when higher and the pilot\'s console is helmed', () => {
    const ship = explorer5()
    ship.pilotingDC = 27
    expect(deriveStarshipStats(ship).ac).toBe(20)
    ship.stations[0].helmedBy = 'pilot'
    // p. 181: AC becomes the Piloting DC when higher, and the helmed item bonus (+1 at advanced) still applies.
    expect(deriveStarshipStats(ship).ac).toBe(28)
    ship.pilotingDC = 12 // lower than the frame's AC 20; the +1 helmed bonus still applies
    expect(deriveStarshipStats(ship).ac).toBe(21)
  })

  it('scanners increase sensor range whether or not helmed, and Will only when helmed', () => {
    const ship = explorer5()
    ship.level = 11
    ship.stations.push({ id: 's', kind: 'scanners', slot: 'custom', upgrades: [], malfunctioning: false })
    const d = deriveStarshipStats(ship)
    expect(d.sensorRange).toBe(6 + 3) // elite scanners: +3 zones
    expect(d.will).toBe(22)
    ship.stations[2].helmedBy = 'science'
    expect(deriveStarshipStats(ship).will).toBe(23)
  })

  it('gunnery damage dice and tracking follow the fast track', () => {
    const ship = explorer5()
    ship.stations.push({ id: 'g', kind: 'gunnery', slot: 'custom', upgrades: [], malfunctioning: false })
    const at = (level: number) => {
      ship.level = level
      const g = deriveStarshipStats(ship).stations.find(s => s.kind === 'gunnery')!
      return [g.grade, g.damageDice, g.tracking]
    }
    expect(at(1)).toEqual(['commercial', 1, 0])
    expect(at(2)).toEqual(['tactical', 1, 1])
    expect(at(4)).toEqual(['advanced', 2, 1])
    expect(at(10)).toEqual(['superior', 2, 2])
    expect(at(12)).toEqual(['elite', 3, 2])
    expect(at(16)).toEqual(['ultimate', 3, 3])
    expect(at(19)).toEqual(['paragon', 4, 3])
  })

  it('inoperable applies −4 status to AC, Reflex and Perception and makes the ship off-guard', () => {
    const ship = explorer5()
    ship.inoperable = true
    const d = deriveStarshipStats(ship)
    expect(d.ac).toBe(16)
    expect(d.ref).toBe(9)
    expect(d.statusPenalties.perception).toBe(-4)
    expect(d.offGuard).toBe(true)
  })

  it('off-kilter applies −2 circumstance to Reflex saves and attack rolls', () => {
    const ship = explorer5()
    ship.offKilter = true
    const d = deriveStarshipStats(ship)
    expect(d.ref).toBe(11)
    expect(d.circumstancePenalties).toEqual({ ref: -2, attackRolls: -2 })
  })

  it('setPlayerStarshipLevel keeps damage proportional', () => {
    const ship = explorer5()
    ship.currentHP = 38 // roughly half of 77
    const leveled = setPlayerStarshipLevel(ship, 10)
    expect(leveled.level).toBe(10)
    expect(leveled.currentHP).toBe(Math.round((38 / 77) * 142))
    expect(leveled.currentSP).toBe(66)
  })
})

describe('rules formulas', () => {
  it('hull integrity DC is 10 + compromised value', () => {
    expect(hullIntegrityDC(1)).toBe(11)
    expect(hullIntegrityDC(9)).toBe(19)
  })

  it('hull integrity outcomes move the value by −2/−1/+1/+2', () => {
    expect(hullIntegrityDelta('criticalSuccess')).toBe(-2)
    expect(hullIntegrityDelta('success')).toBe(-1)
    expect(hullIntegrityDelta('failure')).toBe(1)
    expect(hullIntegrityDelta('criticalFailure')).toBe(2)
  })

  it('Generate Shields adds 1d4 at 3rd level and every 2 levels after', () => {
    expect(generateShieldsDice(1)).toBe('1d4')
    expect(generateShieldsDice(2)).toBe('1d4')
    expect(generateShieldsDice(3)).toBe('2d4')
    expect(generateShieldsDice(4)).toBe('2d4')
    expect(generateShieldsDice(5)).toBe('3d4')
    expect(generateShieldsDice(20)).toBe('10d4')
  })

  it('degree of success follows the ±10 bands and natural 1/20 shift', () => {
    expect(degreeOfSuccess(25, 15)).toBe('criticalSuccess')
    expect(degreeOfSuccess(24, 15)).toBe('success')
    expect(degreeOfSuccess(15, 15)).toBe('success')
    expect(degreeOfSuccess(14, 15)).toBe('failure')
    expect(degreeOfSuccess(5, 15)).toBe('criticalFailure')
    expect(degreeOfSuccess(14, 15, 20)).toBe('success')
    expect(degreeOfSuccess(15, 15, 1)).toBe('failure')
    expect(degreeOfSuccess(30, 15, 20)).toBe('criticalSuccess')
    expect(degreeOfSuccess(2, 15, 1)).toBe('criticalFailure')
  })
})

describe('reference tables', () => {
  it('lists the 17 starship weapons with unique ids', () => {
    expect(TSC_WEAPONS).toHaveLength(17)
    expect(new Set(TSC_WEAPONS.map(w => w.id)).size).toBe(17)
    expect(TSC_WEAPONS.filter(w => w.proficiency === 'simple')).toHaveLength(7)
    expect(TSC_WEAPONS.filter(w => w.proficiency === 'martial')).toHaveLength(6)
    expect(TSC_WEAPONS.filter(w => w.proficiency === 'advanced')).toHaveLength(4)
  })

  it('station upgrades have unique ids and resolve variant types by level', () => {
    expect(new Set(TSC_STATION_UPGRADES.map(u => u.id)).size).toBe(TSC_STATION_UPGRADES.length)
    const prow = TSC_STATION_UPGRADES.find(u => u.id === 'ramming-prow')!
    expect(upgradeTypeAtLevel(prow, 4)).toBeUndefined()
    expect(upgradeTypeAtLevel(prow, 5)?.type).toBe('commercial')
    expect(upgradeTypeAtLevel(prow, 12)?.type).toBe('tactical')
    expect(upgradeTypeAtLevel(prow, 20)?.type).toBe('elite')
    const thrusters = TSC_STATION_UPGRADES.find(u => u.id === 'powerful-thrusters')!
    expect(upgradeTypeAtLevel(thrusters, 1)?.type).toBe('commercial')
  })

  it('expansion bays: universal bays use no slot, comfortable quarters add one', () => {
    expect(TSC_EXPANSION_BAYS.filter(b => !b.universal && !b.group)).toHaveLength(5)
    expect(expansionBaySlotsUsed(['passenger-quarters-basic', 'holo-den'])).toBe(1)
    expect(expansionBaySlotsUsed(['data-center', 'lounge', 'medical-bay', 'crew-quarters-bunks'])).toBe(2)
    expect(expansionBayBonusSlots(['crew-quarters-comfortable'])).toBe(1)
    expect(expansionBayBonusSlots(['crew-quarters-bunks'])).toBe(0)
  })
})

describe('starship conditions', () => {
  it('defines the five Tech Core starship conditions without touching the combat picker', () => {
    for (const key of TSC_CONDITIONS) {
      expect(CONDITIONS[key]).toBeDefined()
      expect(CONDITIONS[key].group).toBe('starship')
      expect(COMBAT_CONDITIONS as readonly string[]).not.toContain(key)
    }
    expect(CONDITIONS.compromised.hasValue).toBe(true)
    expect(CONDITIONS.wrecked.hasValue).toBe(true)
    expect(CONDITIONS.inoperable.effects).toMatchObject({ ac: -4, perception: -4, reflex: -4, offGuard: true, cannotAct: true })
    expect(CONDITIONS['off-kilter'].effects).toMatchObject({ attackRolls: -2, reflex: -2 })
  })
})
