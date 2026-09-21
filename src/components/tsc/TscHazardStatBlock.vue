<script setup lang="ts">
import type { StarshipHazard, TscAttack } from '../../types/tsc'
import { attackModeLabel, attackQualifiers, attackSaveText, formatMod, formatSaves, rarityTraitClass } from '../../utils/tscStatBlock'
import { rollD20, rollDamage } from '../../utils/dice'
import ActionIcon from '../ActionIcon.vue'
import TscAbilityBlock from './TscAbilityBlock.vue'

const props = defineProps<{
  hazard: StarshipHazard
  compact?: boolean
}>()

function rollAttack(atk: TscAttack) {
  if (atk.bonus === undefined) return
  rollD20(atk.bonus, `${atk.name} (${attackModeLabel(atk)})`, props.hazard.name)
}

function rollAttackDamage(atk: TscAttack, critical = false) {
  rollDamage(atk.damage, atk.name, props.hazard.name, critical)
}

function componentLine(c: StarshipHazard['components'][number]): string {
  const parts: string[] = []
  if (c.hardness !== undefined) parts.push(`${c.name} Hardness ${c.hardness}`)
  if (c.hp !== undefined) parts.push(`${c.name} HP ${c.hp}${c.each ? ' each' : ''}${c.bt !== undefined ? ` (BT ${c.bt})` : ''}`)
  return parts.join('; ')
}
</script>

<template>
  <div class="statblock text-[0.6875rem] lg:text-[0.8125rem] flex flex-col gap-1">
    <div class="flex flex-wrap gap-1 items-center">
      <span v-if="hazard.rarity !== 'common'" :class="rarityTraitClass(hazard.rarity)">{{ hazard.rarity }}</span>
      <span class="trait" :class="hazard.complexity === 'complex' ? 'badge-complex' : 'badge-simple'">{{ hazard.complexity }}</span>
      <span v-for="t in hazard.traits" :key="t" class="trait">{{ t }}</span>
      <span class="text-[0.625rem] text-muted italic ml-1">{{ hazard.scale === 'starship' ? 'sensor map' : 'starship deck map' }}</span>
    </div>

    <div><span class="font-semibold text-accent">Stealth</span> {{ hazard.stealth.text }}</div>
    <div><span class="font-semibold text-accent">Description</span> {{ hazard.description }}</div>
    <div><span class="font-semibold text-accent">Disable</span> {{ hazard.disableText }}</div>

    <div v-if="hazard.ac !== undefined" class="border-t border-[var(--color-border)] pt-1">
      <span class="font-semibold text-accent">{{ hazard.acLabel ? `${hazard.acLabel} AC` : 'AC' }}</span> {{ hazard.ac }}<span v-if="hazard.saves">; {{ formatSaves(hazard.saves) }}</span>
    </div>
    <div v-if="hazard.hardness !== undefined || hazard.hp !== undefined || hazard.components.length || hazard.immunities.length">
      <template v-if="hazard.hardness !== undefined"><span class="font-semibold text-accent">Hardness</span> {{ hazard.hardness }}; </template>
      <template v-if="hazard.hp !== undefined"><span class="font-semibold text-accent">HP</span> {{ hazard.hp }}<span v-if="hazard.bt !== undefined"> (BT {{ hazard.bt }})</span>; </template>
      <template v-for="c in hazard.components" :key="c.name">{{ componentLine(c) }}; </template>
      <template v-if="hazard.immunities.length"><span class="font-semibold text-accent">Immunities</span> {{ hazard.immunities.join(', ') }}; </template>
      <template v-if="hazard.weaknesses.length"><span class="font-semibold text-accent">Weaknesses</span> {{ hazard.weaknesses.join(', ') }}; </template>
      <template v-if="hazard.resistances.length"><span class="font-semibold text-accent">Resistances</span> {{ hazard.resistances.join(', ') }}</template>
    </div>

    <TscAbilityBlock v-for="ab in hazard.reactions" :key="ab.name" :ability="ab" />

    <div v-if="hazard.routine" class="border-t border-[var(--color-border)] pt-1">
      <span class="font-semibold text-accent">Routine</span> ({{ hazard.routine.actions }} action{{ hazard.routine.actions === 1 ? '' : 's' }}) {{ hazard.routine.text }}
    </div>

    <TscAbilityBlock v-for="ab in hazard.abilities" :key="ab.name" :ability="ab" />

    <div v-for="atk in hazard.attacks" :key="atk.mode + atk.name" class="flex flex-wrap items-center gap-x-1">
      <span class="font-semibold text-accent">{{ attackModeLabel(atk) }}</span>
      <ActionIcon v-if="atk.mode !== 'melee' || atk.actions !== 1" :action="atk.actions" class="text-accent" />
      <span v-if="atk.bonus !== undefined" class="rollable" title="Roll attack" @click="rollAttack(atk)">{{ atk.name }} <span class="roll-value">{{ formatMod(atk.bonus) }}</span></span>
      <span v-else>{{ atk.name }}</span>
      <span v-if="attackQualifiers(atk)" class="text-dim">({{ attackQualifiers(atk) }})</span>,
      <span class="rollable" title="Roll damage" @click="rollAttackDamage(atk)"><span class="font-semibold">Damage</span> <span class="roll-value">{{ atk.damage }}</span></span>
      <span class="rollable text-danger text-[0.625rem]" title="Roll critical damage" @click="rollAttackDamage(atk, true)">×2</span>
      <span v-if="attackSaveText(atk)" class="text-dim">({{ attackSaveText(atk) }})</span>
    </div>

    <div v-if="hazard.reset"><span class="font-semibold text-accent">Reset</span> {{ hazard.reset }}</div>
    <div v-if="hazard.special"><span class="font-semibold text-accent">Special</span> {{ hazard.special }}</div>

    <div v-if="!compact" class="text-[0.5625rem] lg:text-[0.6875rem] text-muted pt-1">{{ hazard.source }}<span v-if="hazard.page"> p. {{ hazard.page }}</span></div>
  </div>
</template>
