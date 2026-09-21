/**
 * "Common Actions and Features" blocks from the Starship Archive: the global block
 * (p. 208), the default actions every NPC starship has, and per-faction blocks.
 * Ships reference these by `sharedRef`; the parser inlines a copy, so this list is
 * mainly for the custom starship builder's picker and for stat-block footnotes.
 */

import type { TscSharedAbility } from '../types/tsc'
import sharedData from './tscSharedAbilities.json'

export const TSC_SHARED_ABILITIES: TscSharedAbility[] = sharedData as unknown as TscSharedAbility[]

/** Repair Self and Seek Starships: every NPC starship can use these even when not printed. */
export const TSC_DEFAULT_ABILITIES: TscSharedAbility[] = TSC_SHARED_ABILITIES.filter(a => a.scope === 'default')

export function getTscSharedAbility(id: string): TscSharedAbility | undefined {
  return TSC_SHARED_ABILITIES.find(a => a.id === id)
}
