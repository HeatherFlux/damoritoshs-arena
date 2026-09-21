<script setup lang="ts">
import type { Vehicle } from '../../types/tsc'
import { formatSaves, rarityTraitClass, sizeLabel } from '../../utils/tscStatBlock'
import { rollDamage } from '../../utils/dice'
import TscAbilityBlock from './TscAbilityBlock.vue'

const props = defineProps<{
  vehicle: Vehicle
  compact?: boolean
}>()

function rollCollision() {
  rollDamage(props.vehicle.collision.damage, 'Collision', props.vehicle.name)
}
</script>

<template>
  <div class="statblock text-[0.6875rem] lg:text-[0.8125rem] flex flex-col gap-1">
    <div class="flex flex-wrap gap-1 items-center">
      <span v-if="vehicle.rarity !== 'common'" :class="rarityTraitClass(vehicle.rarity)">{{ vehicle.rarity }}</span>
      <span class="trait trait-size">{{ sizeLabel(vehicle.size) }}</span>
      <span v-for="t in vehicle.traits" :key="t" class="trait">{{ t }}</span>
    </div>
    <div><span class="font-semibold text-accent">Price</span> {{ vehicle.price }}</div>
    <p v-if="!compact && vehicle.description" class="text-dim">{{ vehicle.description }}</p>
    <div><span class="font-semibold text-accent">Space</span> {{ vehicle.space }}</div>
    <div><span class="font-semibold text-accent">Crew</span> {{ vehicle.crew }}<span v-if="vehicle.passengers !== undefined">; <span class="font-semibold text-accent">Passengers</span> {{ vehicle.passengers }}</span></div>
    <div><span class="font-semibold text-accent">Piloting Check</span> {{ vehicle.pilotingCheckText }}</div>
    <div class="border-t border-[var(--color-border)] pt-1"><span class="font-semibold text-accent">AC</span> {{ vehicle.ac }}; {{ formatSaves(vehicle.saves) }}</div>
    <div>
      <span class="font-semibold text-accent">Hardness</span> {{ vehicle.hardness }}, <span class="font-semibold text-accent">HP</span> {{ vehicle.hp }}<span v-if="vehicle.bt !== undefined"> (BT {{ vehicle.bt }})</span>
      <template v-if="vehicle.immunities.length">; <span class="font-semibold text-accent">Immunities</span> {{ vehicle.immunities.join(', ') }}</template>
      <template v-if="vehicle.resistances?.length">; <span class="font-semibold text-accent">Resistances</span> {{ vehicle.resistances.join(', ') }}</template>
      <template v-if="vehicle.weaknesses?.length">; <span class="font-semibold text-accent">Weaknesses</span> {{ vehicle.weaknesses.join(', ') }}</template>
    </div>
    <div class="border-t border-[var(--color-border)] pt-1"><span class="font-semibold text-accent">Speed</span> {{ vehicle.speedText }}</div>
    <div>
      <span class="rollable" title="Roll collision damage" @click="rollCollision"><span class="font-semibold">Collision</span> <span class="roll-value">{{ vehicle.collision.damage }}</span></span>
      <span class="text-dim"> ({{ vehicle.collision.type ? `${vehicle.collision.type}; ` : '' }}DC {{ vehicle.collision.dc }})</span>
    </div>
    <TscAbilityBlock v-for="ab in vehicle.abilities" :key="ab.name" :ability="ab" />
    <div v-if="!compact" class="text-[0.5625rem] lg:text-[0.6875rem] text-muted pt-1">{{ vehicle.source }}<span v-if="vehicle.page"> p. {{ vehicle.page }}</span></div>
  </div>
</template>
