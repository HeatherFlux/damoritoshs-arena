<script setup lang="ts">
import type { GeneratedNPC } from '../../types/npc'

defineProps<{
  npc: GeneratedNPC
}>()

defineEmits<{
  reroll: []
  copy: []
}>()
</script>

<template>
  <div class="bg-surface border border-border rounded-lg p-3 lg:p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-primary/60 text-[0.6rem] uppercase tracking-widest font-medium">Shopkeeper</span>
      <div class="flex gap-1.5">
        <button class="btn btn-secondary text-xs !py-1 !px-2" @click="$emit('reroll')">
          Re-roll NPC
        </button>
        <button class="btn btn-secondary text-xs !py-1 !px-2" @click="$emit('copy')">
          Copy
        </button>
      </div>
    </div>

    <!-- Name + badges -->
    <div class="flex items-center gap-2 flex-wrap mb-2">
      <span class="text-accent font-bold text-lg">{{ npc.name }}</span>
      <span class="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
        {{ npc.ancestryLabel }}
      </span>
      <span class="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded"
            :class="{
              'bg-success/20 text-success': npc.pricingTendency === 'fair',
              'bg-warning/20 text-warning': npc.pricingTendency === 'haggler' || npc.pricingTendency === 'overcharger',
              'bg-danger/20 text-danger': npc.pricingTendency === 'gouger',
            }">
        {{ npc.pricingTendency }}
      </span>
    </div>

    <!-- Appearance -->
    <p class="text-dim text-sm italic mb-3">{{ npc.appearance }}</p>

    <!-- Flavor text -->
    <p class="text-text text-sm mb-3">{{ npc.flavorText }}</p>

    <!-- Trait grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
      <div class="bg-elevated border border-border rounded p-2">
        <span class="text-dim text-[0.6rem] uppercase tracking-widest block mb-0.5">Disposition</span>
        <span class="text-text text-sm">{{ npc.disposition }}</span>
      </div>
      <div class="bg-elevated border border-border rounded p-2">
        <span class="text-dim text-[0.6rem] uppercase tracking-widest block mb-0.5">Motivation</span>
        <span class="text-text text-sm">{{ npc.motivation }}</span>
      </div>
      <div class="bg-elevated border border-border rounded p-2">
        <span class="text-dim text-[0.6rem] uppercase tracking-widest block mb-0.5">Quirk</span>
        <span class="text-text text-sm">{{ npc.quirk }}</span>
      </div>
      <div class="bg-elevated border border-border rounded p-2">
        <span class="text-dim text-[0.6rem] uppercase tracking-widest block mb-0.5">Specialty</span>
        <span class="text-text text-sm">{{ npc.specialtyKnowledge }}</span>
      </div>
      <div class="bg-elevated border border-border rounded p-2 sm:col-span-2">
        <span class="text-dim text-[0.6rem] uppercase tracking-widest block mb-0.5">Role</span>
        <span class="text-text text-sm">{{ npc.shopRelationship }}</span>
      </div>
    </div>

    <!-- Secret (collapsible) -->
    <details>
      <summary class="text-danger text-[0.65rem] uppercase tracking-widest cursor-pointer hover:text-danger/80 select-none">
        Reveal Secret
      </summary>
      <p class="text-dim text-sm mt-1.5 pl-2 border-l-2 border-danger/30">{{ npc.secret }}</p>
    </details>
  </div>
</template>
