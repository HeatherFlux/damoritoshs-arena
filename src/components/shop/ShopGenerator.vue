<script setup lang="ts">
import { ref } from 'vue'
import { useShopStore } from '../../stores/shopStore'
import type { ShopType, SettlementSize } from '../../types/shop'
import { npcToText } from '../../utils/npcGenerator'
import ItemRow from './ItemRow.vue'
import ShopkeeperCard from './ShopkeeperCard.vue'

const store = useShopStore()

const partyLevel = ref(5)
const shopType = ref<ShopType>('general')
const settlement = ref<SettlementSize>('city')
const customName = ref('')
const collapsedCategories = ref<Set<string>>(new Set())

const SHOP_TYPE_OPTIONS: { value: ShopType; label: string }[] = [
  { value: 'general', label: 'General Store' },
  { value: 'weapons', label: 'Weapons Dealer' },
  { value: 'armor', label: 'Armor & Shields' },
  { value: 'tech', label: 'Tech Shop' },
  { value: 'medical', label: 'Medical Supply' },
  { value: 'grenades', label: 'Munitions Depot' },
  { value: 'magic', label: 'Mystic Emporium' },
  { value: 'blackmarket', label: 'Black Market' },
]

const SETTLEMENT_OPTIONS: { value: SettlementSize; label: string }[] = [
  { value: 'outpost', label: 'Outpost' },
  { value: 'village', label: 'Small Town' },
  { value: 'city', label: 'City' },
  { value: 'metropolis', label: 'Metropolis' },
  { value: 'megacity', label: 'Megacity / Station' },
]

const CATEGORY_ICONS: Record<string, string> = {
  weapon: '',
  armor: '',
  shield: '',
  equipment: '',
}

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'Weapons',
  armor: 'Armor',
  shield: 'Shields',
  equipment: 'Equipment & Gear',
}

function doGenerate() {
  store.state.partyLevel = partyLevel.value
  store.state.shopType = shopType.value
  store.state.settlement = settlement.value
  store.state.customName = customName.value
  collapsedCategories.value.clear()
  store.generateShop()
}

function doReroll() {
  customName.value = ''
  store.state.customName = ''
  doGenerate()
}

async function doCopy() {
  if (!store.state.currentShop) return
  const text = store.shopToText(store.state.currentShop)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

function toggleCategory(cat: string) {
  if (collapsedCategories.value.has(cat)) {
    collapsedCategories.value.delete(cat)
  } else {
    collapsedCategories.value.add(cat)
  }
}

function rerollShopkeeper() {
  store.generateNewShopkeeper()
}

async function copyShopkeeper() {
  if (!store.state.currentShopkeeper) return
  const text = npcToText(store.state.currentShopkeeper)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

// Auto-generate on mount
doGenerate()
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <!-- Controls -->
    <div class="bg-surface border border-border rounded-lg p-3 lg:p-4 mb-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div class="flex flex-col gap-1">
          <label class="text-[0.625rem] uppercase tracking-widest text-dim">Party Level</label>
          <input
            v-model.number="partyLevel"
            type="number"
            min="1"
            max="20"
            class="input"
            @keydown.enter="doGenerate"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[0.625rem] uppercase tracking-widest text-dim">Shop Type</label>
          <select v-model="shopType" class="input select">
            <option v-for="opt in SHOP_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[0.625rem] uppercase tracking-widest text-dim">Settlement</label>
          <select v-model="settlement" class="input select">
            <option v-for="opt in SETTLEMENT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[0.625rem] uppercase tracking-widest text-dim">Shop Name</label>
          <input
            v-model="customName"
            type="text"
            placeholder="Auto-generated..."
            class="input"
            @keydown.enter="doGenerate"
          />
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-primary" @click="doGenerate">
          Generate Shop
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!store.state.currentShop"
          @click="doReroll"
        >
          Re-roll
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!store.state.currentShop"
          @click="doCopy"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>

    <!-- Generated Shop -->
    <template v-if="store.state.currentShop">
      <div class="flex items-center gap-3 mb-3">
        <h2 class="text-lg lg:text-xl font-bold text-accent">
          {{ store.state.currentShop.name }}
        </h2>
      </div>
      <div class="flex gap-2 mb-4 flex-wrap">
        <span class="text-[0.625rem] uppercase tracking-wider px-2 py-1 rounded bg-elevated border border-border text-dim">
          {{ store.state.currentShop.settlement }}
        </span>
        <span class="text-[0.625rem] uppercase tracking-wider px-2 py-1 rounded bg-elevated border border-border text-dim">
          {{ store.state.currentShop.levelRange }}
        </span>
        <span class="text-[0.625rem] uppercase tracking-wider px-2 py-1 rounded bg-elevated border border-border text-dim">
          {{ store.state.currentShop.itemCount }} items
        </span>
      </div>

      <!-- Shopkeeper -->
      <ShopkeeperCard
        v-if="store.state.currentShopkeeper"
        :npc="store.state.currentShopkeeper"
        class="mb-4"
        @reroll="rerollShopkeeper"
        @copy="copyShopkeeper"
      />

      <!-- Category sections -->
      <div class="flex flex-col gap-3">
        <div
          v-for="(items, cat) in store.state.currentShop.inventory"
          :key="cat"
          class="bg-surface border border-border rounded-lg overflow-hidden"
        >
          <!-- Category header -->
          <button
            class="w-full flex items-center gap-2 px-3 py-2.5 bg-elevated hover:bg-hover transition-colors text-left cursor-pointer"
            @click="toggleCategory(cat)"
          >
            <span class="text-xs font-bold uppercase tracking-wider text-accent flex-1">
              {{ CATEGORY_LABELS[cat] || cat }}
            </span>
            <span class="text-[0.625rem] text-dim">{{ items.length }} items</span>
          </button>

          <!-- Items list -->
          <div v-show="!collapsedCategories.has(cat)">
            <ItemRow v-for="item in items" :key="item.id" :item="item" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
