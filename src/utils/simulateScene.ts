/**
 * Cinematic Starship Scene — Monte Carlo simulator.
 *
 * Estimates how a scene plays out by simulating it many times with
 * configurable assumptions about the crew's average roll bonus and
 * action mix. Returns a distribution of outcomes the GM can use to
 * tune DC and threat counts before the table sees the scene.
 *
 * What it models (intentionally coarse — this is a tuning aid, not a
 * physics engine):
 *  - Each round, every non-defeated threat performs its full routine.
 *    Attack actions roll d20 + attackBonus vs the PC ship's AC; on
 *    hit, damage rolls (averaged) reduce shields then HP.
 *  - The PC ship uses one crew "attack action" per round per gunner-
 *    role action (rough heuristic: actions whose role tag matches
 *    'gunner' OR isAttack=true). Crew rolls d20 + assumed bonus vs
 *    each threat's AC; hits roll average damage (shields then HP).
 *  - Crew actions tagged with damage that don't target a threat — and
 *    actions resolved against a static DC — accrue VP at the rate of
 *    1 per success / 2 per critical success on the assumed crew bonus.
 *  - Shields regenerate at the start of each round.
 *
 * What it does NOT model:
 *  - Individual PC bonuses (uses one assumed average modifier)
 *  - Threat skill_check actions vs PC defenses (treated as info-only)
 *  - Crit-fail consequences from the GM's outcome text
 *  - Special abilities, conditional damage, persistent damage, traits
 *
 * Pass `iterations` higher for tighter distributions; default 1000 is
 * fine for a tuning gut-check.
 */

import type { SavedScene, StarshipAction, ThreatRoutineAction } from '../types/starship'

export type SimOutcome =
  | 'victory_vp'           // Hit the VP target (or the customCondition VP path)
  | 'victory_defeat'       // All threats reduced to 0 HP
  | 'victory_survival'     // Survived the required rounds
  | 'defeat_ship_destroyed'// PC ship at 0 HP
  | 'stalled'              // Hit the round cap without an outcome

export interface SimResult {
  outcome: SimOutcome
  rounds: number
  endingShipHP: number
  endingShipShields: number
  endingVP: number
  remainingThreats: number
}

export interface SimOptions {
  iterations?: number       // default 1000
  roundCap?: number         // default 20 — anything past this is "stalled"
  /**
   * Average crew skill bonus the PCs add to their d20. Defaults to a
   * scene-level-appropriate value. Per SF2e DC table, a level-N PC's
   * trained-master modifier is roughly N + 4..10, so we default to
   * (sceneLevel + 6) which approximates a moderate-trained crew.
   */
  crewBonus?: number
  /**
   * Average gunner attack bonus (separate from crewBonus because
   * attacks are typically the highest-trained skill). Defaults to
   * crewBonus + 2.
   */
  gunnerBonus?: number
}

export interface SimSummary {
  iterations: number
  outcomes: Record<SimOutcome, number>
  outcomePercents: Record<SimOutcome, number>
  medianRounds: number
  meanRounds: number
  medianEndingShipHP: number
  /** How often the ship survived to the end (any victory + stalled). */
  survivalRate: number
}

// ---- Dice helpers ----

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

/** Parse a damage expression like "2d6+3" or "1d10". Returns the
 *  AVERAGE roll. We use averages (not full random) for damage to keep
 *  simulations stable; the d20 is the dominant variance source. */
function avgDamage(expr: string | undefined): number {
  if (!expr) return 0
  const m = expr.replace(/[a-zA-Z]+$/g, '').trim().match(/^(\d+)d(\d+)([+-]\d+)?/)
  if (!m) return 0
  const dice = parseInt(m[1])
  const sides = parseInt(m[2])
  const mod = m[3] ? parseInt(m[3]) : 0
  // Avg of NdS = N*(S+1)/2
  return dice * (sides + 1) / 2 + mod
}

// ---- Outcome resolution ----

type Tier = 'critical_success' | 'success' | 'failure' | 'critical_failure'

function tier(roll: number, total: number, dc: number): Tier {
  let t: Tier
  if (total >= dc + 10) t = 'critical_success'
  else if (total >= dc) t = 'success'
  else if (total <= dc - 10) t = 'critical_failure'
  else t = 'failure'
  if (roll === 20) {
    if (t === 'failure') t = 'success'
    else if (t === 'success') t = 'critical_success'
    else if (t === 'critical_failure') t = 'failure'
  } else if (roll === 1) {
    if (t === 'success') t = 'failure'
    else if (t === 'critical_success') t = 'success'
    else if (t === 'failure') t = 'critical_failure'
  }
  return t
}

// ---- Single iteration ----

interface SimState {
  shipHP: number
  shipMaxHP: number
  shipShields: number
  shipMaxShields: number
  shipShieldRegen: number
  shipAC: number
  threats: Array<{
    hp: number
    maxHP: number
    shields: number
    maxShields: number
    shieldRegen: number
    ac: number
    routine: ThreatRoutineAction[]
    defeated: boolean
  }>
  vp: number
}

function applyDamage(target: { hp: number; shields: number; defeated: boolean; maxHP: number }, dmg: number): boolean {
  if (target.shields > 0) {
    const absorbed = Math.min(target.shields, dmg)
    target.shields -= absorbed
    dmg -= absorbed
  }
  if (dmg > 0) {
    target.hp = Math.max(0, target.hp - dmg)
    if (target.hp === 0) target.defeated = true
  }
  return target.defeated
}

function gunnerActions(scene: SavedScene): StarshipAction[] {
  return (scene.starshipActions ?? []).filter(a =>
    a.isAttack || a.role.split('|').includes('gunner'),
  )
}

function vpActions(scene: SavedScene): StarshipAction[] {
  // Actions with a fixed DC that aren't gunner attacks — these accrue VP.
  return (scene.starshipActions ?? []).filter(a => a.dc != null && !a.isAttack)
}

function simulateOnce(scene: SavedScene, opts: Required<SimOptions>): SimResult {
  const ship = scene.starship
  const state: SimState = {
    shipHP: ship.maxHP,
    shipMaxHP: ship.maxHP,
    shipShields: ship.maxShields,
    shipMaxShields: ship.maxShields,
    shipShieldRegen: ship.shieldRegen,
    shipAC: ship.ac,
    threats: scene.threats.map(t => ({
      hp: t.maxHP ?? Infinity,
      maxHP: t.maxHP ?? Infinity,
      shields: t.maxShields ?? 0,
      maxShields: t.maxShields ?? 0,
      shieldRegen: t.shieldRegen ?? 0,
      ac: t.ac ?? 15,
      routine: t.routine?.actions ?? [],
      defeated: false,
    })),
    vp: 0,
  }

  const gunners = gunnerActions(scene)
  const vpRollers = vpActions(scene)
  const target = scene.vpRequired ?? Infinity
  const survivalTarget = scene.survivalRounds ?? Infinity
  const winByDefeat = scene.victoryCondition === 'defeat' || scene.victoryCondition === 'custom'
  const winByVP = scene.victoryCondition === 'victory_points' || scene.victoryCondition === 'custom'
  const winBySurvival = scene.victoryCondition === 'survival'

  for (let round = 1; round <= opts.roundCap; round++) {
    // Start of round: regen shields
    state.shipShields = Math.min(state.shipMaxShields, state.shipShields + state.shipShieldRegen)
    for (const t of state.threats) {
      if (!t.defeated) t.shields = Math.min(t.maxShields, t.shields + t.shieldRegen)
    }

    // Threats act
    for (const t of state.threats) {
      if (t.defeated) continue
      for (const action of t.routine) {
        if (action.type !== 'attack' || action.attackBonus == null) continue
        const r = rollD20()
        const total = r + action.attackBonus
        const out = tier(r, total, state.shipAC)
        if (out === 'critical_success' || out === 'success') {
          let dmg = avgDamage(action.damage)
          if (out === 'critical_success') dmg *= 2
          applyDamage({
            hp: state.shipHP, shields: state.shipShields, defeated: false, maxHP: state.shipMaxHP,
          } as { hp: number; shields: number; defeated: boolean; maxHP: number }, dmg)
          // Manual reflection because we can't pass primitives by reference
          if (state.shipShields > 0) {
            const absorb = Math.min(state.shipShields, dmg)
            state.shipShields -= absorb
            dmg -= absorb
          }
          if (dmg > 0) state.shipHP = Math.max(0, state.shipHP - dmg)
        }
      }
    }
    if (state.shipHP <= 0) {
      return {
        outcome: 'defeat_ship_destroyed',
        rounds: round, endingShipHP: 0, endingShipShields: state.shipShields,
        endingVP: state.vp, remainingThreats: state.threats.filter(t => !t.defeated).length,
      }
    }

    // Crew acts: pick the lowest-HP non-defeated threat as gunner target.
    const aliveThreats = state.threats.filter(t => !t.defeated)
    if (aliveThreats.length > 0 && gunners.length > 0) {
      // Two gunner shots per round (pretty common scene composition).
      const shots = Math.min(2, gunners.length)
      for (let i = 0; i < shots; i++) {
        const action = gunners[i % gunners.length]
        const target = aliveThreats.reduce((lo, t) => t.hp < lo.hp ? t : lo, aliveThreats[0])
        const r = rollD20()
        const total = r + opts.gunnerBonus
        const out = tier(r, total, target.ac)
        if (out === 'critical_success' || out === 'success') {
          let dmg = avgDamage(action.damage)
          if (out === 'critical_success') dmg *= 2
          if (target.shields > 0) {
            const absorb = Math.min(target.shields, dmg)
            target.shields -= absorb
            dmg -= absorb
          }
          if (dmg > 0) {
            target.hp = Math.max(0, target.hp - dmg)
            if (target.hp === 0) target.defeated = true
          }
        }
      }
    }

    // Skill-check crew actions accrue VP. Assume one per round attempted
    // by a non-gunner PC (pilot evasion, science scan, captain rally...)
    if (vpRollers.length > 0 && winByVP) {
      const action = vpRollers[round % vpRollers.length]
      const r = rollD20()
      const total = r + opts.crewBonus
      const out = tier(r, total, action.dc ?? 15)
      if (out === 'critical_success') state.vp += 2
      else if (out === 'success') state.vp += 1
      else if (out === 'critical_failure') state.vp = Math.max(0, state.vp - 1)
    }

    // Win checks (in priority order)
    const allDown = state.threats.every(t => t.defeated)
    if (winByDefeat && allDown) {
      return {
        outcome: 'victory_defeat',
        rounds: round, endingShipHP: state.shipHP, endingShipShields: state.shipShields,
        endingVP: state.vp, remainingThreats: 0,
      }
    }
    if (winByVP && state.vp >= target) {
      return {
        outcome: 'victory_vp',
        rounds: round, endingShipHP: state.shipHP, endingShipShields: state.shipShields,
        endingVP: state.vp, remainingThreats: state.threats.filter(t => !t.defeated).length,
      }
    }
    if (winBySurvival && round >= survivalTarget) {
      return {
        outcome: 'victory_survival',
        rounds: round, endingShipHP: state.shipHP, endingShipShields: state.shipShields,
        endingVP: state.vp, remainingThreats: state.threats.filter(t => !t.defeated).length,
      }
    }
  }

  return {
    outcome: 'stalled',
    rounds: opts.roundCap, endingShipHP: state.shipHP, endingShipShields: state.shipShields,
    endingVP: state.vp, remainingThreats: state.threats.filter(t => !t.defeated).length,
  }
}

// ---- Public API ----

export function simulateScene(scene: SavedScene, options: SimOptions = {}): SimSummary {
  const opts: Required<SimOptions> = {
    iterations: options.iterations ?? 1000,
    roundCap: options.roundCap ?? 20,
    crewBonus: options.crewBonus ?? scene.level + 6,
    gunnerBonus: options.gunnerBonus ?? (scene.level + 6 + 2),
  }

  const results: SimResult[] = []
  for (let i = 0; i < opts.iterations; i++) {
    results.push(simulateOnce(scene, opts))
  }

  const counts: Record<SimOutcome, number> = {
    victory_vp: 0, victory_defeat: 0, victory_survival: 0,
    defeat_ship_destroyed: 0, stalled: 0,
  }
  for (const r of results) counts[r.outcome]++

  const percents: Record<SimOutcome, number> = {} as Record<SimOutcome, number>
  for (const k of Object.keys(counts) as SimOutcome[]) {
    percents[k] = (counts[k] / opts.iterations) * 100
  }

  const sortedRounds = results.map(r => r.rounds).sort((a, b) => a - b)
  const median = sortedRounds[Math.floor(sortedRounds.length / 2)]
  const mean = sortedRounds.reduce((s, n) => s + n, 0) / sortedRounds.length

  const sortedHP = results.map(r => r.endingShipHP).sort((a, b) => a - b)
  const medianHP = sortedHP[Math.floor(sortedHP.length / 2)]

  const survival = results.filter(r => r.outcome !== 'defeat_ship_destroyed').length / opts.iterations

  return {
    iterations: opts.iterations,
    outcomes: counts,
    outcomePercents: percents,
    medianRounds: median,
    meanRounds: Math.round(mean * 10) / 10,
    medianEndingShipHP: medianHP,
    survivalRate: Math.round(survival * 1000) / 10,
  }
}
