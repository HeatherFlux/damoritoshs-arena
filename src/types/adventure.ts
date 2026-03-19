// Adventure Prep (Lazy DM / Sly Flourish style) types

export interface AdventureEntry {
  id: string
  text: string
  notes?: string           // GM-only notes (shown in collapsible)
  generated?: boolean      // subtle styling for auto-generated entries
}

export interface AdventureScene extends AdventureEntry {
  leadsTo: string[]        // IDs of connected scenes (directed graph as adjacency list)
  type?: SceneType
  tension?: SceneTension
}

export type SceneType = 'combat' | 'exploration' | 'social' | 'puzzle' | 'chase' | 'heist' | 'starship'
export type SceneTension = 'low' | 'medium' | 'high' | 'climax'

export interface AdventureSecret extends AdventureEntry {
  dangerLevel?: 'low' | 'medium' | 'high'
}

export interface AdventureLocation extends AdventureEntry {
  environment?: string     // free text: "space station", "alien jungle"
}

export interface AdventureNPC extends AdventureEntry {
  role?: 'ally' | 'questgiver' | 'rival' | 'wildcard' | 'innocent'
  ancestry?: string        // free text
}

export interface Adventure {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  strongStart: string      // single text block, not a list
  scenes: AdventureScene[]
  secrets: AdventureSecret[]
  locations: AdventureLocation[]
  npcs: AdventureNPC[]
}

export interface SavedAdventure {
  id: string
  name: string
  savedAt: number
  adventure: Adventure
}

export type AdventureSection = 'strongStart' | 'scenes' | 'secrets' | 'locations' | 'npcs'
