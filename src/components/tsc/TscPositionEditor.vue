<script setup lang="ts">
import type { Heading, TscPosition } from '../../types/tsc'

/**
 * Zone + heading picker. This is the one tracker piece a visual sensor-map
 * grid would replace later; the TscPosition model already reserves gridX/gridY.
 */
defineProps<{
  position: TscPosition
  zones: string[]
  compact?: boolean
}>()

const emit = defineEmits<{ (e: 'update', position: Partial<TscPosition>): void }>()

const HEADINGS: { value: Heading; label: string; arrow: string }[] = [
  { value: 'fore', label: 'Fore', arrow: '▲' },
  { value: 'starboard', label: 'Starboard', arrow: '▶' },
  { value: 'aft', label: 'Aft', arrow: '▼' },
  { value: 'port', label: 'Port', arrow: '◀' },
]
</script>

<template>
  <div class="flex items-center gap-1 text-[0.6875rem]">
    <span class="text-dim">Zone</span>
    <select :value="position.zone" class="input input-sm select w-16" @change="emit('update', { zone: ($event.target as HTMLSelectElement).value })">
      <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
      <option v-if="!zones.includes(position.zone)" :value="position.zone">{{ position.zone }}</option>
    </select>
    <div class="flex">
      <button
        v-for="h in HEADINGS"
        :key="h.value"
        class="w-6 h-6 flex items-center justify-center border border-border text-xs"
        :class="position.heading === h.value ? 'bg-accent text-white border-accent' : 'bg-elevated text-dim hover:text-text'"
        :title="`Heading: ${h.label}`"
        @click="emit('update', { heading: h.value })"
      >{{ h.arrow }}</button>
    </div>
  </div>
</template>
