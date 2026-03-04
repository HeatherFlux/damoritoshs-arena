<script setup lang="ts">
import { ref, computed } from 'vue'
import { useShopStore } from '../../stores/shopStore'
import ItemRow from './ItemRow.vue'

const store = useShopStore()

const searchQuery = ref('')
const categoryFilter = ref('all')
const levelMinFilter = ref<number | null>(null)
const levelMaxFilter = ref<number | null>(null)

const results = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const cat = categoryFilter.value
  const minLvl = levelMinFilter.value
  const maxLvl = levelMaxFilter.value

  if (!query && cat === 'all' && minLvl === null && maxLvl === null) return null

  let items = store.allItems.filter(i => i.price !== null && i.price > 0)
  if (query) items = items.filter(item => item.name.toLowerCase().includes(query))
  if (cat !== 'all') items = items.filter(item => item.category === cat)
  if (minLvl !== null) items = items.filter(item => item.level >= minLvl)
  if (maxLvl !== null) items = items.filter(item => item.level <= maxLvl)

  return items.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
})

const displayedResults = computed(() => {
  if (!results.value) return []
  return results.value.slice(0, 100)
})

function clearFilters() {
  searchQuery.value = ''
  categoryFilter.value = 'all'
  levelMinFilter.value = null
  levelMaxFilter.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base lg:text-lg font-semibold">Item Database</h2>
      <span class="text-xs text-dim">
        <template v-if="results">
          {{ results.length > 100 ? `100 / ${results.length}` : results.length }} results
        </template>
        <template v-else>{{ store.allItems.length }} items</template>
      </span>
    </div>

    <!-- Filters -->
    <div class="flex flex-col gap-2 mb-3">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search all items..."
        class="input"
      />

      <div class="grid grid-cols-3 gap-2">
        <select v-model="categoryFilter" class="input select">
          <option value="all">All Categories</option>
          <option value="weapon">Weapons</option>
          <option value="armor">Armor</option>
          <option value="shield">Shields</option>
          <option value="equipment">Equipment</option>
        </select>

        <select v-model.number="levelMinFilter" class="input select">
          <option :value="null">Min Level</option>
          <option v-for="n in 21" :key="n - 1" :value="n - 1">Lvl {{ n - 1 }}</option>
        </select>

        <select v-model.number="levelMaxFilter" class="input select">
          <option :value="null">Max Level</option>
          <option v-for="n in 21" :key="n - 1" :value="n - 1">Lvl {{ n - 1 }}</option>
        </select>
      </div>

      <button
        v-if="searchQuery || categoryFilter !== 'all' || levelMinFilter !== null || levelMaxFilter !== null"
        class="text-xs text-accent hover:text-accent-bright cursor-pointer self-start"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Results -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div v-if="!results" class="text-center text-dim text-sm py-12">
        Type a name or select filters to search items
      </div>
      <div v-else-if="results.length === 0" class="text-center text-dim text-sm py-12">
        No items found
      </div>
      <div v-else class="flex flex-col">
        <ItemRow
          v-for="item in displayedResults"
          :key="item.id"
          :item="item"
          show-category
        />
        <div v-if="results.length > 100" class="text-center text-dim text-xs py-3">
          Showing first 100 of {{ results.length }} results. Refine your search.
        </div>
      </div>
    </div>
  </div>
</template>
