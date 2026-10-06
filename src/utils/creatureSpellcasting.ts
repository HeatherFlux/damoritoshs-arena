/**
 * Spellcasting as printed on a statblock:
 * "Divine Prepared Spells DC 25, attack +17; 4th (3 slots); 3rd (2 slots); 1 Focus Point"
 */

import type { SpellEntry, SpellcastingConfig } from '../types/creature'

export interface SpellcastingLine {
  /** "Divine Prepared Spells" */
  label: string
  /** "DC 25, attack +17; 4th (3 slots); 1 Focus Point" */
  details: string
  /** The spells themselves, as the GM wrote them. */
  notes: string
}

function capitalize(word: string): string {
  return word ? word[0].toUpperCase() + word.slice(1) : ''
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

export function formatSpellcasting(spellcasting: SpellcastingConfig | undefined): SpellcastingLine | null {
  if (!spellcasting?.enabled) return null

  const label = [capitalize(spellcasting.tradition), capitalize(spellcasting.type), 'Spells'].filter(Boolean).join(' ')

  const stats = [
    spellcasting.dc > 0 ? `DC ${spellcasting.dc}` : '',
    spellcasting.attackMod > 0 ? `attack +${spellcasting.attackMod}` : '',
  ].filter(Boolean).join(', ')

  // Slot ranks are object keys, so they come back as strings after a save.
  const slots = Object.entries(spellcasting.slots ?? {})
    .map(([rank, count]) => [Number(rank), Number(count)] as const)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => b - a)
    .map(([rank, count]) => `${ordinal(rank)} (${count} ${count === 1 ? 'slot' : 'slots'})`)

  const focus = spellcasting.focusPoints > 0
    ? `${spellcasting.focusPoints} Focus ${spellcasting.focusPoints === 1 ? 'Point' : 'Points'}`
    : ''

  const details = [stats, ...slots, focus].filter(Boolean).join('; ')

  return { label, details, notes: spellcasting.notes?.trim() ?? '' }
}

/**
 * A creature's spell list (the `spells` field, used by imported creatures):
 * "DC 22, attack +14; 3rd heal, sanctuary; 1st bless; Cantrips detect magic"
 * The DC and attack come from the first entry that has them.
 */
export function formatSpellList(spells: SpellEntry[] | undefined): string | null {
  const entries = (spells ?? []).filter(e => e.spells?.length)
  if (entries.length === 0) return null

  const dc = entries.find(e => e.dc)?.dc
  const attack = entries.find(e => e.attack)?.attack
  const stats = [dc ? `DC ${dc}` : '', attack ? `attack +${attack}` : ''].filter(Boolean).join(', ')

  // Highest rank first, cantrips (level 0) last.
  const rankOrder = (level: number) => (level === 0 ? -1 : level)
  const ranks = [...entries]
    .sort((a, b) => rankOrder(b.level) - rankOrder(a.level))
    .map(e => `${e.level === 0 ? 'Cantrips' : ordinal(e.level)} ${e.spells.join(', ')}`)

  return [stats, ...ranks].filter(Boolean).join('; ')
}
