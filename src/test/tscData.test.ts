import { describe, it, expect } from 'vitest'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import { TECH_CORE_VEHICLES as VEHICLES } from '../data/vehicles'
import { TSC_SHARED_ABILITIES, TSC_DEFAULT_ABILITIES } from '../data/tscSharedAbilities'
import inventory from '../../scripts/techcore-inventory.json'
import type { TscAbility } from '../types/tsc'

/**
 * Full-scan validation of the bundled Tech Core data. Every record is checked;
 * nothing is sampled. The inventory oracle in scripts/techcore-inventory.json
 * was transcribed from the book by hand and pins names, levels, and hazard
 * complexity so a parser regression cannot silently drop or mislabel a record.
 */

const STARSHIP_INVENTORY = inventory.starships as Record<string, number>
const HAZARD_INVENTORY = inventory.hazards as Record<string, [number, 'simple' | 'complex']>
const VEHICLE_INVENTORY = inventory.vehicles as Record<string, number>

const SIDEBAR_TOKENS = ['INTRODUCTION', 'GM’S ARSENAL', 'GLOSSARY', 'Tech CORE', 'STARSHIP SHEET']
const GLYPH_RE = /\[(one-action|two-actions|three-actions|reaction|free-action)\]/
const PAGE_REF_RE = /(See )?\(?page \d+\)?\.?$/
const STATION_ALIASES: Record<string, string> = { 'fortify-shields': 'fortify-shield-points' }

const slug = (s: string) => s.replace('’', "'").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function nameMatches(name: string, pool: Set<string>): boolean {
  const key = STATION_ALIASES[slug(name)] ?? slug(name)
  return pool.has(key) || pool.has(key.replace(/s$/, '')) || pool.has(key + 's')
}

function walkStrings(obj: unknown, path: string, visit: (text: string, path: string) => void) {
  if (typeof obj === 'string') visit(obj, path)
  else if (Array.isArray(obj)) obj.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit))
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) walkStrings(v, `${path}.${k}`, visit)
  }
}

function abilityProblems(label: string, abilities: TscAbility[]): string[] {
  const problems: string[] = []
  for (const ab of abilities) {
    if (!ab.name) problems.push(`${label}: ability without name`)
    if (ab.name.split(' ').length > 6) problems.push(`${label}: suspicious ability name "${ab.name}"`)
    if (!ab.effect && !ab.outcomes && !ab.trigger) problems.push(`${label}: "${ab.name}" has no effect`)
    if (PAGE_REF_RE.test(ab.effect ?? '')) problems.push(`${label}: "${ab.name}" has an unresolved page reference`)
    if (GLYPH_RE.test(ab.effect ?? '')) problems.push(`${label}: "${ab.name}" swallowed another entry`)
    if (ab.sharedRef && !TSC_SHARED_ABILITIES.some(s => s.id === ab.sharedRef)) {
      problems.push(`${label}: "${ab.name}" dangling sharedRef ${ab.sharedRef}`)
    }
  }
  return problems
}

describe('Tech Core NPC starships', () => {
  it('contains exactly the 74 archive starships at their printed levels', () => {
    expect(TSC_STARSHIPS).toHaveLength(74)
    const byName = new Map(TSC_STARSHIPS.map(s => [s.name, s]))
    const missing = Object.keys(STARSHIP_INVENTORY).filter(n => !byName.has(n))
    const extra = TSC_STARSHIPS.map(s => s.name).filter(n => !(n in STARSHIP_INVENTORY))
    const wrongLevel = Object.entries(STARSHIP_INVENTORY)
      .filter(([n, lvl]) => byName.get(n) && byName.get(n)!.level !== lvl)
      .map(([n, lvl]) => `${n}: ${byName.get(n)!.level} != ${lvl}`)
    expect({ missing, extra, wrongLevel }).toEqual({ missing: [], extra: [], wrongLevel: [] })
  })

  it('has unique slug ids and no level 15 or 20 ships', () => {
    const ids = TSC_STARSHIPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of TSC_STARSHIPS) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/)
      expect(s.level).toBeGreaterThanOrEqual(-1)
      expect(s.level).toBeLessThanOrEqual(19)
      expect(s.level).not.toBe(15)
    }
  })

  it('every ship has complete core statistics', () => {
    const problems: string[] = []
    for (const s of TSC_STARSHIPS) {
      const label = `ship "${s.name}"`
      for (const k of ['ac', 'hp', 'speed', 'sensorRange', 'perception', 'size', 'faction', 'description'] as const) {
        if (s[k] === undefined || s[k] === null || s[k] === '') problems.push(`${label}: missing ${k}`)
      }
      if (!s.saves || [s.saves.fort, s.saves.ref, s.saves.will].some(v => typeof v !== 'number')) problems.push(`${label}: incomplete saves`)
      if (!s.abilities || Object.keys(s.abilities).length !== 6) problems.push(`${label}: attribute modifiers`)
      if (!s.battleStations.length) problems.push(`${label}: no battle stations`)
      if (!s.attacks.length && !s.specialAbilities.length) problems.push(`${label}: no attacks or abilities`)
      if (s.sp !== undefined && s.fortify === undefined) problems.push(`${label}: SP without fortify value`)
      if (!Object.keys(s.skills).some(k => k === 'Piloting')) problems.push(`${label}: no Piloting skill`)
      problems.push(...abilityProblems(label, s.specialAbilities))
    }
    expect(problems).toEqual([])
  })

  it('every battle-station entry resolves to an attack or ability', () => {
    const sharedSlugs = new Set(TSC_SHARED_ABILITIES.map(a => slug(a.name)))
    const problems: string[] = []
    for (const s of TSC_STARSHIPS) {
      const attackSlugs = new Set(s.attacks.map(a => slug(a.name)))
      const abilitySlugs = new Set([...s.specialAbilities.map(a => slug(a.name)), ...sharedSlugs])
      const sharedCounts = new Map<string, number>()
      for (const st of s.battleStations) {
        for (const e of st.entries) {
          if (e.kind === 'weapon' && !nameMatches(e.name, attackSlugs)) problems.push(`${s.name}: weapon "${e.name}" has no attack line`)
          if (e.kind === 'action' && !nameMatches(e.name, abilitySlugs)) problems.push(`${s.name}: action "${e.name}" has no ability`)
          if (e.shared) sharedCounts.set(e.name, (sharedCounts.get(e.name) ?? 0) + 1)
        }
      }
      for (const [name, count] of sharedCounts) {
        if (count < 2) problems.push(`${s.name}: shared action "${name}" listed under only one station`)
      }
    }
    expect(problems).toEqual([])
  })

  it('living starships are flagged and have no generator', () => {
    const living = TSC_STARSHIPS.filter(s => s.livingStarship)
    expect(living.length).toBeGreaterThanOrEqual(8)
    for (const s of living) {
      expect(s.battleStations.some(st => st.name === 'generator')).toBe(false)
    }
  })
})

describe('Tech Core starship hazards', () => {
  it('contains exactly the 32 hazards at their printed levels and complexity', () => {
    expect(TSC_HAZARDS).toHaveLength(32)
    const byName = new Map(TSC_HAZARDS.map(h => [h.name, h]))
    const problems: string[] = []
    for (const [name, [level, complexity]] of Object.entries(HAZARD_INVENTORY)) {
      const h = byName.get(name)
      if (!h) problems.push(`missing ${name}`)
      else if (h.level !== level) problems.push(`${name}: level ${h.level} != ${level}`)
      else if (h.complexity !== complexity) problems.push(`${name}: ${h.complexity} != ${complexity}`)
    }
    for (const h of TSC_HAZARDS) if (!(h.name in HAZARD_INVENTORY)) problems.push(`unexpected ${h.name}`)
    expect(problems).toEqual([])
    // The by-level table on p. 247 lists Drift Beacon Malfunction as complex, but its
    // stat block has no COMPLEX trait and no routine; the stat block wins (14 simple, 18 complex).
    expect(TSC_HAZARDS.filter(h => h.complexity === 'simple')).toHaveLength(14)
    expect(TSC_HAZARDS.filter(h => h.complexity === 'complex')).toHaveLength(18)
  })

  it('every hazard has stealth, description, disable entries, and a routine when complex', () => {
    const problems: string[] = []
    for (const h of TSC_HAZARDS) {
      const label = `hazard "${h.name}"`
      if (!h.stealth?.dc) problems.push(`${label}: no stealth DC`)
      if (!h.description) problems.push(`${label}: no description`)
      if (!h.disable.length) problems.push(`${label}: no disable entries`)
      if (h.complexity === 'complex' && !h.routine) problems.push(`${label}: complex without routine`)
      if (h.complexity === 'simple' && !h.reactions.length) problems.push(`${label}: simple without reaction`)
      if (!['starship', 'deck'].includes(h.scale)) problems.push(`${label}: bad scale`)
      if ((h.scale === 'starship') !== h.traits.includes('starship')) problems.push(`${label}: scale/trait mismatch`)
      problems.push(...abilityProblems(label, [...h.reactions, ...h.abilities]))
    }
    expect(problems).toEqual([])
  })

  it('marks the deck-scale hazards that lack the starship trait', () => {
    const deck = TSC_HAZARDS.filter(h => h.scale === 'deck').map(h => h.name).sort()
    expect(deck).toEqual([
      'Cursed Relay',
      'Hacked Drift Beacon',
      'Hull Breach',
      'Pipe Breakage',
      'Possessed Battle Stations',
      'Rip in Reality',
      'Slime Infestation',
      'Unstable Munition',
    ])
  })
})

describe('Tech Core vehicles', () => {
  it('contains exactly the 30 vehicles at their printed levels', () => {
    expect(VEHICLES).toHaveLength(30)
    const byName = new Map(VEHICLES.map(v => [v.name, v]))
    const problems: string[] = []
    for (const [name, level] of Object.entries(VEHICLE_INVENTORY)) {
      const v = byName.get(name)
      if (!v) problems.push(`missing ${name}`)
      else if (v.level !== level) problems.push(`${name}: level ${v.level} != ${level}`)
    }
    for (const v of VEHICLES) if (!(v.name in VEHICLE_INVENTORY)) problems.push(`unexpected ${v.name}`)
    expect(problems).toEqual([])
  })

  it('every vehicle has complete statistics', () => {
    const problems: string[] = []
    for (const v of VEHICLES) {
      const label = `vehicle "${v.name}"`
      for (const k of ['price', 'space', 'crew', 'ac', 'hardness', 'hp', 'description'] as const) {
        if (v[k] === undefined || v[k] === '') problems.push(`${label}: missing ${k}`)
      }
      if (!v.pilotingChecks.length) problems.push(`${label}: no piloting check`)
      if (!v.speed.length) problems.push(`${label}: no speed`)
      if (!v.collision?.damage || !v.collision.dc) problems.push(`${label}: no collision`)
      problems.push(...abilityProblems(label, v.abilities))
    }
    expect(problems).toEqual([])
  })
})

describe('Tech Core shared abilities', () => {
  it('includes the global common actions and the two default actions', () => {
    const ids = TSC_SHARED_ABILITIES.map(a => a.id)
    for (const id of [
      'global:autonomous-starship',
      'global:engaged-strike',
      'global:living-starship',
      'global:fortify-shield-points',
      'global:tractor-beam',
      'global:boost-thrusters',
      'global:change-heading',
      'global:evade',
      'global:stick-to-cover',
      'default:repair-self',
      'default:seek-starships',
      'free-captains:piercing-harpoon',
      'azlanti-star-empire:lissala-s-eye',
    ]) {
      expect(ids).toContain(id)
    }
    expect(TSC_DEFAULT_ABILITIES.map(a => a.name).sort()).toEqual(['Repair Self', 'Seek Starships'])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Tech Core data hygiene', () => {
  it('no field contains page-furniture text or a raw stat-block header', () => {
    const problems: string[] = []
    const records = [
      ...TSC_STARSHIPS.map(r => ['ship', r] as const),
      ...TSC_HAZARDS.map(r => ['hazard', r] as const),
      ...VEHICLES.map(r => ['vehicle', r] as const),
      ...TSC_SHARED_ABILITIES.map(r => ['shared', r] as const),
    ]
    for (const [kind, r] of records) {
      walkStrings(r, '', (text, path) => {
        for (const tok of SIDEBAR_TOKENS) if (text.includes(tok)) problems.push(`${kind} ${r.name}${path}: "${tok}"`)
        if (/\b(STARSHIP|HAZARD|VEHICLE) [–-]?\d+\b/.test(text)) problems.push(`${kind} ${r.name}${path}: header text`)
        if (/(Simple|Complex)\s*\d{3}\b/.test(text)) problems.push(`${kind} ${r.name}${path}: hazard table text`)
        if (/\bCritical (Success|Failure)\b/.test(text) && !path.includes('outcomes') && !path.endsWith('.text')) {
          problems.push(`${kind} ${r.name}${path}: unsplit outcome`)
        }
      })
    }
    expect(problems).toEqual([])
  })
})
