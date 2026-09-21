<script setup lang="ts">
import { ref } from 'vue'
import CreatureSearch from './CreatureSearch.vue'
import HazardSearch from './HazardSearch.vue'
import PartyPanel from './PartyPanel.vue'
import TscStarshipSearch from './tsc/TscStarshipSearch.vue'
import TscHazardSearch from './tsc/TscHazardSearch.vue'
import { useEncounterStore } from '../stores/encounterStore'

const emit = defineEmits<{
  (e: 'edit-creature'): void
}>()

type SearchTab = 'creatures' | 'hazards' | 'starships' | 'starship-hazards' | 'party'
const activeTab = ref<SearchTab>('creatures')
const encounterStore = useEncounterStore()

function ensureEncounter() {
  if (!encounterStore.activeEncounter.value) encounterStore.createEncounter()
}
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
        :class="{ 'tab-active': activeTab === 'starships' }"
        title="Tech Core NPC starships (count as creatures for XP)"
        @click="activeTab = 'starships'"
      >
        Starships
      </button>
      <button
        class="tab"
        :class="{ 'tab-active': activeTab === 'starship-hazards' }"
        title="Tech Core starship hazards"
        @click="activeTab = 'starship-hazards'"
      >
        Ship Hazards
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
      <CreatureSearch v-if="activeTab === 'creatures'" class="h-full" @edit-creature="emit('edit-creature')" />
      <HazardSearch v-else-if="activeTab === 'hazards'" class="h-full" />
      <TscStarshipSearch
        v-else-if="activeTab === 'starships'"
        class="h-full"
        add-label="Add to encounter"
        :party-level="encounterStore.effectivePartyLevel.value"
        @add="(ship) => { ensureEncounter(); encounterStore.addStarshipToEncounter(ship) }"
      />
      <TscHazardSearch
        v-else-if="activeTab === 'starship-hazards'"
        class="h-full"
        add-label="Add to encounter"
        :party-level="encounterStore.effectivePartyLevel.value"
        @add="(hazard) => { ensureEncounter(); encounterStore.addStarshipHazardToEncounter(hazard) }"
      />
      <PartyPanel v-else class="h-full" />
    </div>
  </div>
</template>
