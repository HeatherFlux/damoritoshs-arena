/**
 * Party Management Types
 * For saving and reusing player characters across encounters
 */

export interface Player {
  id: string
  name: string
  maxHP: number
  ac: number

  // Optional extended stats (from Pathbuilder import)
  level?: number
  class?: string
  ancestry?: string
  perception?: number
  fortitude?: number
  reflex?: number
  will?: number

  // Notes for the GM
  notes?: string

  // Track if imported from Pathbuilder (for re-import)
  pathbuilderData?: string  // Store raw JSON for re-import
}

export interface Party {
  id: string
  name: string
  players: Player[]
  createdAt: Date
  updatedAt: Date
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
