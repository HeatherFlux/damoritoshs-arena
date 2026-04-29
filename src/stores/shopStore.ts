import { reactive, computed, watch } from 'vue'
import itemsData from '../data/items.json'
import type {
  ShopItem,
  ShopType,
  SettlementSize,
  SettlementConfig,
  GeneratedShop,
  SavedShop,
} from '../types/shop'
import type { GeneratedNPC } from '../types/npc'
import { generateShopkeeper, npcToText } from '../utils/npcGenerator'

const STORAGE_KEY = 'sf2e-shops'

function generateShopId(): string {
  return `shop-${Math.random().toString(36).substring(2, 10)}`
}

function loadShopsFromStorage(): SavedShop[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SavedShop[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('Failed to load saved shops:', e)
  }
  return []
}

function saveShopsToStorage(shops: SavedShop[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shops))
  } catch (e) {
    console.error('Failed to save shops:', e)
  }
}

// ===== SHOP NAME GENERATION =====
const SHOP_PREFIXES: Record<ShopType, string[]> = {
  general: ['Pact Worlds', 'Absalom Station', 'Drift', 'Galactic', 'Stellar', 'Quantum', 'Frontier', 'Spaceport'],
  weapons: ['Iron Fist', 'Nova', 'Sharpshot', 'Vesk Arms', "Damoritosh's", 'Killshot', 'Vanguard', 'Arsenal'],
  armor: ['Aegis', 'Bulwark', 'Ironhide', 'Fortress', 'Shell', 'Sentinel', 'Bastion', 'Warden'],
  tech: ['Nanotech', 'Synapse', 'Circuit', 'Data', 'Cortex', 'Neural', 'Quantum', 'Nexus'],
  medical: ['MedBay', 'BioStar', 'LifeLine', 'Vitalis', 'Cure-All', "Mender's", 'Patch-Up'],
  grenades: ['Boom Box', 'Blast Zone', 'Thunder', 'Kaboom', 'Demolition', 'Ordinance', 'Payload'],
  magic: ['Arcane', 'Mystic', 'Void', 'Astral', 'Ethereal', 'Cosmic', "Starweaver's", 'Witchlight'],
  blackmarket: ['Shadow', 'Ghost', 'Underbelly', 'Back Alley', 'Whisper', 'No Questions', 'Midnight', 'Off-Grid'],
}

const SHOP_SUFFIXES: Record<ShopType, string[]> = {
  general: ['Supply Co.', 'Trading Post', 'General Goods', 'Emporium', 'Outfitters', 'Provisions'],
  weapons: ['Arms', 'Weaponry', 'Armory', 'Arsenal', 'Combat Supply', 'Firearms', 'Blades & Blasters'],
  armor: ['Armor Works', 'Defense Systems', 'Protective Gear', 'Shield Shop', 'Plating Co.'],
  tech: ['Technologies', 'Solutions', 'Systems', 'Labs', 'Innovations', 'Upgrades'],
  medical: ['Medical Supply', 'Pharmaceuticals', 'Clinic Supply', 'Health Tech', 'Biolab'],
  grenades: ['Munitions', 'Explosives', 'Ordnance Co.', 'Demolitions', 'Ammo Depot'],
  magic: ['Mysteries', 'Arcana', 'Enchantments', 'Wonders', 'Curios', 'Relics'],
  blackmarket: ['Deals', 'Connections', 'Exchange', 'Acquisitions', 'Imports'],
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateShopName(shopType: ShopType): string {
  return `${randomPick(SHOP_PREFIXES[shopType])} ${randomPick(SHOP_SUFFIXES[shopType])}`
}

// ===== SETTLEMENT CONFIG =====
const SETTLEMENT_CONFIG: Record<SettlementSize, SettlementConfig> = {
  outpost: { label: 'Outpost', maxLevelBonus: -2, stockMultiplier: 0.4, rarityChance: { uncommon: 0.05, rare: 0 }, maxItems: 15 },
  village: { label: 'Small Town', maxLevelBonus: -1, stockMultiplier: 0.6, rarityChance: { uncommon: 0.1, rare: 0.02 }, maxItems: 22 },
  city: { label: 'City', maxLevelBonus: 0, stockMultiplier: 0.8, rarityChance: { uncommon: 0.2, rare: 0.05 }, maxItems: 30 },
  metropolis: { label: 'Metropolis', maxLevelBonus: 1, stockMultiplier: 1.0, rarityChance: { uncommon: 0.3, rare: 0.1 }, maxItems: 40 },
  megacity: { label: 'Megacity / Space Station', maxLevelBonus: 2, stockMultiplier: 1.2, rarityChance: { uncommon: 0.4, rare: 0.15 }, maxItems: 50 },
}

// ===== CATEGORY WEIGHTS =====
const SHOP_CATEGORY_WEIGHTS: Record<ShopType, Record<string, number>> = {
  general:     { weapon: 0.25, armor: 0.2, shield: 0.1, equipment: 0.45 },
  weapons:     { weapon: 0.85, armor: 0, shield: 0, equipment: 0.15 },
  armor:       { weapon: 0, armor: 0.6, shield: 0.25, equipment: 0.15 },
  tech:        { weapon: 0, armor: 0, shield: 0, equipment: 1.0 },
  medical:     { weapon: 0, armor: 0, shield: 0, equipment: 1.0 },
  grenades:    { weapon: 0.1, armor: 0, shield: 0, equipment: 0.9 },
  magic:       { weapon: 0.1, armor: 0, shield: 0, equipment: 0.9 },
  blackmarket: { weapon: 0.3, armor: 0.15, shield: 0.05, equipment: 0.5 },
}

const EQUIPMENT_FILTERS: Record<string, string[]> = {
  medical: ['medkit', 'medpatch', 'serum', 'hypopen', 'sprayflesh', 'marrow', 'bone', 'auto-cpr',
            'regenerat', 'cellular', 'cardiac', 'radiation buffer', 'force field', 'dermal'],
  grenades: ['grenade', 'missile', 'ammunition', 'launcher', 'incendiary', 'frag', 'smoke',
             'flash', 'electromag', 'degradation', 'maratan headache'],
  magic: ['spell', 'gem', 'chip', 'amp', 'aeon stone', 'holy', 'module', 'rune', 'arcane',
          'mystic', 'shimmerstone', 'skull', 'infinity deck', 'congealer', 'pain journal',
          'portable amp', 'shrouding', 'sunburst'],
  tech: ['datajack', 'datapad', 'comm', 'hacking', 'cloaking', 'jetpack', 'jump jets',
         'darkvision', 'holoskin', 'holospark', 'autorecog', 'microgoggles', 'magboots',
         'load lifter', 'speed suspension', 'null space', 'bipod', 'sniper', 'silencer',
         'toolkit', 'flashlight', 'lock', 'cable', 'climbing', 'antigrav', 'maneuvering',
         'retinal', 'thermal capacitor', 'programmer', 'mobility', 'electroencephalon',
         'animated intelligence', 'energy shielding', 'smuggler', 'uniclamp'],
}

function getLevelWeight(itemLevel: number, partyLevel: number, maxLevel: number): number {
  if (itemLevel > maxLevel) return 0
  const diff = itemLevel - partyLevel
  if (diff <= -6) return 0.02
  if (diff <= -4) return 0.05
  if (diff <= -3) return 0.1
  if (diff <= -2) return 0.2
  if (diff <= -1) return 0.35
  if (diff === 0) return 0.4
  if (diff === 1) return 0.25
  if (diff === 2) return 0.1
  if (diff === 3) return 0.03
  return 0.01
}

function weightedSample(items: ShopItem[], count: number, partyLevel: number, maxLevel: number): ShopItem[] {
  if (items.length <= count) return [...items]
  const weighted = items.map(item => ({ item, weight: getLevelWeight(item.level, partyLevel, maxLevel) }))
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  if (totalWeight === 0) return items.slice(0, count)

  const selected = new Set<string>()
  const result: ShopItem[] = []
  let attempts = 0

  while (result.length < count && attempts < count * 10) {
    attempts++
    let r = Math.random() * totalWeight
    for (const { item, weight } of weighted) {
      r -= weight
      if (r <= 0) {
        const key = item.id || item.name
        if (!selected.has(key)) {
          selected.add(key)
          result.push(item)
        }
        break
      }
    }
  }
  return result
}

// ===== STORE =====
const allItems = itemsData as unknown as ShopItem[]

const state = reactive({
  currentShop: null as GeneratedShop | null,
  currentShopkeeper: null as GeneratedNPC | null,
  searchQuery: '',
  searchCategory: 'all' as string,
  searchLevelMin: null as number | null,
  searchLevelMax: null as number | null,
  // Generator settings
  partyLevel: 5,
  shopType: 'general' as ShopType,
  settlement: 'city' as SettlementSize,
  customName: '',
  // Sub-tab
  activeView: 'generator' as 'generator' | 'search',
  // Persisted saved shops
  savedShops: loadShopsFromStorage() as SavedShop[],
  // Tracks which saved shop is currently loaded into currentShop (if any)
  activeShopId: null as string | null,
})

// Auto-save savedShops to localStorage on any change
watch(
  () => state.savedShops,
  (shops) => saveShopsToStorage(shops),
  { deep: true }
)

const searchResults = computed(() => {
  const query = state.searchQuery.trim().toLowerCase()
  const cat = state.searchCategory
  const minLvl = state.searchLevelMin
  const maxLvl = state.searchLevelMax

  if (!query && cat === 'all' && minLvl === null && maxLvl === null) return null

  let results = allItems
  if (query) results = results.filter(item => item.name.toLowerCase().includes(query))
  if (cat !== 'all') results = results.filter(item => item.category === cat)
  if (minLvl !== null) results = results.filter(item => item.level >= minLvl)
  if (maxLvl !== null) results = results.filter(item => item.level <= maxLvl)

  return results.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
})

function generateShop(): GeneratedShop {
  const config = SETTLEMENT_CONFIG[state.settlement]
  const maxLevel = Math.min(20, state.partyLevel + 2 + config.maxLevelBonus)
  const minLevel = Math.max(0, state.partyLevel - 5)
  const categoryWeights = SHOP_CATEGORY_WEIGHTS[state.shopType]

  let availableItems = allItems.filter(item => {
    if (item.level < minLevel || item.level > maxLevel) return false
    if (item.price === null || item.price <= 0) return false
    if (item.rarity === 'rare' && Math.random() > config.rarityChance.rare) return false
    if (item.rarity === 'uncommon' && Math.random() > config.rarityChance.uncommon) return false
    return true
  })

  const inventory: Record<string, ShopItem[]> = {}
  const categories = Object.keys(categoryWeights).filter(c => categoryWeights[c] > 0)
  const totalItems = Math.round(config.maxItems * config.stockMultiplier)

  for (const cat of categories) {
    const weight = categoryWeights[cat]
    const targetCount = Math.max(1, Math.round(totalItems * weight))
    let catItems = availableItems.filter(item => item.category === cat)

    if (cat === 'equipment' && EQUIPMENT_FILTERS[state.shopType]) {
      const filters = EQUIPMENT_FILTERS[state.shopType]
      catItems = catItems.filter(item => filters.some(kw => item.name.toLowerCase().includes(kw)))
    }

    if (state.shopType === 'blackmarket') {
      catItems = catItems.filter(item => item.level >= state.partyLevel - 2)
    }

    if (catItems.length === 0) continue
    const selected = weightedSample(catItems, targetCount, state.partyLevel, maxLevel)
    if (selected.length > 0) {
      inventory[cat] = selected.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    }
  }

  const shop: GeneratedShop = {
    name: state.customName.trim() || generateShopName(state.shopType),
    shopType: state.shopType,
    settlement: config.label,
    partyLevel: state.partyLevel,
    levelRange: `Lvl ${minLevel}-${maxLevel}`,
    itemCount: Object.values(inventory).reduce((sum, items) => sum + items.length, 0),
    inventory,
  }

  state.currentShop = shop
  state.activeShopId = null
  generateNewShopkeeper()
  return shop
}

function generateNewShopkeeper() {
  state.currentShopkeeper = generateShopkeeper(state.shopType)
}

function shopToText(shop: GeneratedShop): string {
  const LABELS: Record<string, string> = { weapon: 'Weapons', armor: 'Armor', shield: 'Shields', equipment: 'Equipment & Gear' }
  let text = `# ${shop.name}\n`
  text += `${shop.settlement} | Party Level ${shop.partyLevel} | ${shop.levelRange} | ${shop.itemCount} items\n\n`

  if (state.currentShopkeeper) {
    text += npcToText(state.currentShopkeeper) + '\n'
  }

  for (const [cat, items] of Object.entries(shop.inventory)) {
    text += `## ${LABELS[cat] || cat}\n`
    for (const item of items) {
      text += `- ${item.name} (Lvl ${item.level}) - ${item.price?.toLocaleString() ?? '?'} cr\n`
    }
    text += '\n'
  }
  return text
}

// ===== SAVED SHOPS =====

function saveCurrentShop(name?: string): SavedShop | null {
  if (!state.currentShop) return null

  // Deep clone so editing the active shop later doesn't mutate the saved snapshot
  const cloned: SavedShop = {
    id: generateShopId(),
    name: (name?.trim() || state.currentShop.name).slice(0, 100),
    shop: JSON.parse(JSON.stringify(state.currentShop)),
    shopkeeper: state.currentShopkeeper
      ? JSON.parse(JSON.stringify(state.currentShopkeeper))
      : null,
    savedAt: Date.now(),
  }

  state.savedShops.push(cloned)
  state.activeShopId = cloned.id
  return cloned
}

function loadShop(shopId: string): SavedShop | null {
  const saved = state.savedShops.find(s => s.id === shopId)
  if (!saved) return null

  // Deep clone on load too so edits to currentShop don't bleed into the saved entry
  state.currentShop = JSON.parse(JSON.stringify(saved.shop))
  state.currentShopkeeper = saved.shopkeeper ? JSON.parse(JSON.stringify(saved.shopkeeper)) : null
  state.activeShopId = saved.id
  return saved
}

function deleteShop(shopId: string) {
  const idx = state.savedShops.findIndex(s => s.id === shopId)
  if (idx !== -1) {
    state.savedShops.splice(idx, 1)
    if (state.activeShopId === shopId) {
      state.activeShopId = null
    }
  }
}

function renameShop(shopId: string, name: string) {
  const saved = state.savedShops.find(s => s.id === shopId)
  if (saved) {
    saved.name = name.trim().slice(0, 100) || saved.name
  }
}

function clearAllShops() {
  state.savedShops.splice(0, state.savedShops.length)
  state.activeShopId = null
  localStorage.removeItem(STORAGE_KEY)
}

function exportShops(): string {
  return JSON.stringify(state.savedShops, null, 2)
}

function importShops(json: string): number {
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Invalid format: expected SavedShop[]')

  let imported = 0
  for (const entry of parsed as SavedShop[]) {
    if (!entry || typeof entry !== 'object' || !entry.shop || !entry.shop.inventory) {
      continue
    }
    // Avoid id collisions; assign a fresh id on every import
    state.savedShops.push({
      ...entry,
      id: generateShopId(),
      savedAt: entry.savedAt ?? Date.now(),
    })
    imported++
  }
  return imported
}

export function useShopStore() {
  return {
    state,
    allItems,
    searchResults,
    generateShop,
    generateNewShopkeeper,
    shopToText,
    // Saved shops
    saveCurrentShop,
    loadShop,
    deleteShop,
    renameShop,
    clearAllShops,
    exportShops,
    importShops,
  }
}
