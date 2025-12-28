<script setup lang="ts">
import { ref } from 'vue'
import EncounterList from './EncounterList.vue'
import PartyManager from './PartyManager.vue'

type SidebarTab = 'encounters' | 'party'
const activeTab = ref<SidebarTab>('encounters')
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex border-b border-[var(--color-border)] bg-elevated">
      <button
        class="flex-1 py-2.5 px-3 text-[0.8125rem] font-medium bg-transparent border-none border-b-2 border-transparent text-dim cursor-pointer transition-all duration-150 hover:text-[var(--color-text)] hover:bg-surface"
        :class="{
          'text-accent border-b-[var(--color-accent)] !border-b-2 bg-surface': activeTab === 'encounters'
        }"
        @click="activeTab = 'encounters'"
      >
        Encounters
      </button>
      <button
        class="flex-1 py-2.5 px-3 text-[0.8125rem] font-medium bg-transparent border-none border-b-2 border-transparent text-dim cursor-pointer transition-all duration-150 hover:text-[var(--color-text)] hover:bg-surface"
        :class="{
          'text-accent border-b-[var(--color-accent)] !border-b-2 bg-surface': activeTab === 'party'
        }"
        @click="activeTab = 'party'"
      >
        Party
      </button>
    </div>

    <div class="flex-1 overflow-hidden [&>*]:h-full">
      <EncounterList v-if="activeTab === 'encounters'" />
      <PartyManager v-else />
    </div>
  </div>
</template>
