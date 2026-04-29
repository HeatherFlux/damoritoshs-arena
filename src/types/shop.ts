import type { GeneratedNPC } from './npc'

export interface ShopItem {
  id: string
  name: string
  level: number
  price: number | null
  priceRaw: string | null
  category: ItemCategory
  traits: string[]
  rarity: string
  bulk: string
  source: string
  summary: string
  url: string | null
  // Weapon fields
  damage: string | null
  range: string | null
  hands: string | null
  group: string | null
  weaponCategory: string | null
  weaponType: string | null
  // Armor fields
  ac: number | null
  dexCap: number | null
  checkPenalty: string | null
  speedPenalty: string | null
  armorCategory: string | null
  // Shield fields
  hardness: number | null
  hp: string | null
  // Equipment fields
  itemCategory: string | null
  itemSubcategory: string | null
  // Computed
  grade: ItemGrade
  baseName: string
}

export type ItemCategory = 'weapon' | 'armor' | 'shield' | 'equipment'

export type ItemGrade =
  | 'base'
  | 'commercial'
  | 'tactical'
  | 'advanced'
  | 'superior'
  | 'elite'
  | 'ultimate'
  | 'paragon'

export type ShopType =
  | 'general'
  | 'weapons'
  | 'armor'
  | 'tech'
  | 'medical'
  | 'grenades'
  | 'magic'
  | 'blackmarket'

export type SettlementSize =
  | 'outpost'
  | 'village'
  | 'city'
  | 'metropolis'
  | 'megacity'

export interface SettlementConfig {
  label: string
  maxLevelBonus: number
  stockMultiplier: number
  rarityChance: { uncommon: number; rare: number }
  maxItems: number
}

export interface GeneratedShop {
  name: string
  shopType: ShopType
  settlement: string
  partyLevel: number
  levelRange: string
  itemCount: number
  inventory: Record<string, ShopItem[]>
}

export interface ShopGeneratorOptions {
  partyLevel: number
  shopType: ShopType
  settlement: SettlementSize
  customName?: string | null
}

// A persisted shop snapshot, including the rolled inventory and shopkeeper.
// Distinct from GeneratedShop so a saved shop survives identification and
// can be loaded back without re-rolling random items.
export interface SavedShop {
  id: string
  name: string
  shop: GeneratedShop
  shopkeeper: GeneratedNPC | null
  savedAt: number
}
