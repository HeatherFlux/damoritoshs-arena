<script setup lang="ts">
import type { ShopItem } from '../../types/shop'

defineProps<{
  item: ShopItem
  showCategory?: boolean
}>()

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'WPN',
  armor: 'ARM',
  shield: 'SHD',
  equipment: 'EQP',
}

function formatPrice(credits: number | null): string {
  if (!credits) return '\u2014'
  return credits.toLocaleString() + ' cr'
}
</script>

<template>
  <div
    class="grid items-center gap-2 lg:gap-4 px-3 py-2 border-b border-border hover:bg-hover transition-colors duration-100"
    :class="{
      'text-warning': item.rarity === 'uncommon',
      'text-secondary': item.rarity === 'rare',
      'text-danger': item.rarity === 'unique',
    }"
    :style="{ gridTemplateColumns: 'minmax(0,1fr) auto auto' }"
  >
    <!-- Name + details -->
    <div class="min-w-0">
      <div class="flex items-center gap-1.5 min-w-0">
        <span
          v-if="showCategory"
          class="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0"
        >
          {{ CATEGORY_LABELS[item.category] || item.category }}
        </span>
        <a
          v-if="item.url"
          :href="item.url"
          target="_blank"
          class="text-sm font-medium truncate hover:text-accent transition-colors"
          :title="item.name"
        >
          {{ item.name }}
        </a>
        <span v-else class="text-sm font-medium truncate">{{ item.name }}</span>
      </div>
      <div class="flex gap-1.5 mt-0.5 flex-wrap">
        <span
          v-for="trait in item.traits.filter(t => !['Common', 'Standard'].includes(t)).slice(0, 3)"
          :key="trait"
          class="text-[0.625rem] px-1.5 py-0.5 rounded border leading-tight"
          :class="{
            'border-warning bg-warning/10 text-warning': trait.toLowerCase() === 'uncommon',
            'border-secondary bg-secondary/10 text-secondary': trait.toLowerCase() === 'rare',
            'border-danger bg-danger/10 text-danger': trait.toLowerCase() === 'unique',
            'border-border bg-elevated text-dim': !['uncommon', 'rare', 'unique'].includes(trait.toLowerCase()),
          }"
        >
          {{ trait.toLowerCase() }}
        </span>
        <span v-if="item.damage" class="text-[0.625rem] text-dim">{{ item.damage }}</span>
        <span v-if="item.range" class="text-[0.625rem] text-dim">Range {{ item.range }}</span>
        <span v-if="item.bulk && item.bulk !== '\u2014'" class="text-[0.625rem] text-dim">Bulk {{ item.bulk }}</span>
      </div>
    </div>

    <!-- Level -->
    <div class="text-xs text-dim text-center w-12 shrink-0">
      Lvl <span class="font-bold text-text">{{ item.level }}</span>
    </div>

    <!-- Price -->
    <div class="text-sm font-bold text-success text-right w-20 lg:w-24 shrink-0">
      {{ formatPrice(item.price) }}
    </div>
  </div>
</template>
