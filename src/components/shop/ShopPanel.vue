<script setup lang="ts">
import { ref } from 'vue'
import ShopGenerator from './ShopGenerator.vue'
import ItemSearch from './ItemSearch.vue'

type ShopTab = 'generator' | 'search'
const activeTab = ref<ShopTab>('generator')
</script>

<template>
  <section class="flex-1 overflow-hidden p-2 lg:p-4">
    <div class="flex flex-col h-full">
      <!-- Sub-tabs -->
      <div class="tabs mb-4 pb-2">
        <button
          class="tab"
          :class="{ 'tab-active': activeTab === 'generator' }"
          @click="activeTab = 'generator'"
        >
          Shop Generator
        </button>
        <button
          class="tab"
          :class="{ 'tab-active': activeTab === 'search' }"
          @click="activeTab = 'search'"
        >
          Item Search
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-hidden">
        <ShopGenerator v-if="activeTab === 'generator'" class="h-full" />
        <ItemSearch v-else class="h-full" />
      </div>
    </div>
  </section>
</template>
