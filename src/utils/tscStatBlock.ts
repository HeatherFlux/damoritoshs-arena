/**
 * Formatting helpers shared by the Tech Core stat-block components
 * (NPC starships, starship hazards, vehicles).
 */

import type { ActionCost, NpcBattleStation, StarshipSize, TscAbility, TscAttack } from '../types/tsc'

/** Map a printed action cost onto ActionIcon's prop; null when there is no icon to show. */
export function actionCostIcon(cost?: ActionCost): number | 'reaction' | 'free' | null {
  if (cost === undefined) return null
  return cost
}

export function formatMod(n: number | undefined): string {
  if (n === undefined || n === null) return '—'
  return n >= 0 ? `+${n}` : `${n}`
}

export function formatSaves(saves: { fort: number; ref?: number; will?: number } | undefined): string {
  if (!saves) return ''
  const parts = [`Fort ${formatMod(saves.fort)}`]
  if (saves.ref !== undefined) parts.push(`Ref ${formatMod(saves.ref)}`)
  if (saves.will !== undefined) parts.push(`Will ${formatMod(saves.will)}`)
  return parts.join(', ')
}

export function formatSkills(skills: Record<string, number>): string {
  return Object.entries(skills).map(([k, v]) => `${k} ${formatMod(v)}`).join(', ')
}

export function attackModeLabel(atk: TscAttack): string {
  switch (atk.mode) {
    case 'melee': return 'Melee'
    case 'ranged': return 'Ranged'
    case 'areaFire': return 'Area Fire'
    case 'autoFire': return 'Auto-Fire'
  }
}

/** Parenthetical after the attack name: area, range, then traits, as the book prints them. */
export function attackQualifiers(atk: TscAttack): string {
  const parts: string[] = []
  if (atk.area) parts.push(atk.area)
  if (atk.rangeIncrement !== undefined) parts.push(`range increment ${atk.rangeIncrement} zone${atk.rangeIncrement === 1 ? '' : 's'}`)
  if (atk.range !== undefined) parts.push(`range ${atk.range} zone${atk.range === 1 ? '' : 's'}`)
  parts.push(...atk.traits)
  return parts.join(', ')
}

export function attackSaveText(atk: TscAttack): string {
  if (!atk.saveDC || !atk.saveType) return ''
  const save = atk.saveType.charAt(0).toUpperCase() + atk.saveType.slice(1)
  return `DC ${atk.saveDC} basic ${save} save`
}

/** "gunnery (Jousting Charge*, warlance)" */
export function stationSummary(st: NpcBattleStation): string {
  const entries = st.entries.map(e => `${e.name}${e.count ? ` ×${e.count}` : ''}${e.shared ? '*' : ''}`)
  return entries.length ? `${st.name} (${entries.join(', ')})` : st.name
}

/** Inline "Frequency …; Requirements …; Trigger …; Effect …" fields, excluding the effect body. */
export function abilityFields(ab: TscAbility): { label: string; text: string }[] {
  const fields: { label: string; text: string }[] = []
  if (ab.frequency) fields.push({ label: 'Frequency', text: ab.frequency })
  if (ab.prerequisites) fields.push({ label: 'Prerequisites', text: ab.prerequisites })
  if (ab.requirements) fields.push({ label: 'Requirements', text: ab.requirements })
  if (ab.trigger) fields.push({ label: 'Trigger', text: ab.trigger })
  return fields
}

export const OUTCOME_LABELS: { key: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'; label: string }[] = [
  { key: 'criticalSuccess', label: 'Critical Success' },
  { key: 'success', label: 'Success' },
  { key: 'failure', label: 'Failure' },
  { key: 'criticalFailure', label: 'Critical Failure' },
]

export function sizeLabel(size: StarshipSize): string {
  return size.charAt(0).toUpperCase() + size.slice(1)
}

export function rarityTraitClass(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'trait trait-rarity-uncommon'
    case 'rare': return 'trait trait-rarity-rare'
    case 'unique': return 'trait trait-rarity-unique'
    default: return ''
  }
}

/** Defense line: "HP 100; SP 20 (fortify 10); Immunities …; Weaknesses …; Resistances …" */
export function defenseLine(rec: {
  hp?: number; sp?: number; fortify?: number; hardness?: number; bt?: number
  immunities?: string[]; weaknesses?: string[]; resistances?: string[]
}): string {
  const parts: string[] = []
  if (rec.hardness !== undefined) parts.push(`Hardness ${rec.hardness}`)
  if (rec.hp !== undefined) parts.push(`HP ${rec.hp}${rec.bt !== undefined ? ` (BT ${rec.bt})` : ''}`)
  if (rec.sp !== undefined) parts.push(`SP ${rec.sp}${rec.fortify !== undefined ? ` (fortify ${rec.fortify})` : ''}`)
  if (rec.immunities?.length) parts.push(`Immunities ${rec.immunities.join(', ')}`)
  if (rec.weaknesses?.length) parts.push(`Weaknesses ${rec.weaknesses.join(', ')}`)
  if (rec.resistances?.length) parts.push(`Resistances ${rec.resistances.join(', ')}`)
  return parts.join('; ')
}

/** Distinct faction labels in display order. */
export function factionOptions(ships: { faction: string }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of ships) {
    if (!seen.has(s.faction)) {
      seen.add(s.faction)
      out.push(s.faction)
    }
  }
  return out
}
