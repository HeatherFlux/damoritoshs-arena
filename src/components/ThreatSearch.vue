<script setup lang="ts">
import { ref } from 'vue'
import CreatureSearch from './CreatureSearch.vue'
import HazardSearch from './HazardSearch.vue'
import PartyPanel from './PartyPanel.vue'

type SearchTab = 'creatures' | 'hazards' | 'party'
const activeTab = ref<SearchTab>('creatures')
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="tabs mb-4 pb-2">
      <button
        class="tab"
        :class="{ 'tab-active': activeTab === 'creatures' }"
        @click="activeTab = 'creatures'"
      >
        Creatures
      </button>
      <button
        class="tab"
        :class="{ 'tab-active': activeTab === 'hazards' }"
        @click="activeTab = 'hazards'"
      >
        Hazards
      </button>
      <button
        class="tab"
        :class="{ 'tab-active': activeTab === 'party' }"
        @click="activeTab = 'party'"
      >
        Party
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden">
      <CreatureSearch v-if="activeTab === 'creatures'" class="h-full" />
      <HazardSearch v-else-if="activeTab === 'hazards'" class="h-full" />
      <PartyPanel v-else class="h-full" />
    </div>
  </div>
</template>
