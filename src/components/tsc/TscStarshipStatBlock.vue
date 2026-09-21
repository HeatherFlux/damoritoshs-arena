<script setup lang="ts">
import { computed } from 'vue'
import type { NpcStarship, TscAttack } from '../../types/tsc'
import { TSC_DEFAULT_ABILITIES } from '../../data/tscSharedAbilities'
import {
  attackModeLabel, attackQualifiers, attackSaveText, defenseLine, formatMod, formatSaves, formatSkills,
  rarityTraitClass, sizeLabel, stationSummary,
} from '../../utils/tscStatBlock'
import { rollD20, rollDamage } from '../../utils/dice'
import ActionIcon from '../ActionIcon.vue'
import TscAbilityBlock from './TscAbilityBlock.vue'

const props = defineProps<{
  ship: NpcStarship
  /** Hide the flavor paragraph (e.g. inside the tracker card). */
  compact?: boolean
  /** Battle-station names to highlight as malfunctioning. */
  malfunctioning?: string[]
}>()

const defenseAbilities = computed(() => props.ship.specialAbilities.filter(a => a.placement === 'defense'))
const offenseAbilities = computed(() => props.ship.specialAbilities.filter(a => a.placement !== 'defense'))

function rollAttack(atk: TscAttack) {
  if (atk.bonus === undefined) return
  rollD20(atk.bonus, `${atk.name} (${attackModeLabel(atk)})`, props.ship.name)
}

function rollAttackDamage(atk: TscAttack, critical = false) {
  rollDamage(atk.damage, atk.name, props.ship.name, critical)
}

function isMalfunctioning(name: string): boolean {
  return !!props.malfunctioning?.includes(name)
}
</script>

<template>
  <div class="statblock text-[0.6875rem] lg:text-[0.8125rem] flex flex-col gap-1">
    <p v-if="!compact && ship.description" class="text-dim mb-1">{{ ship.description }}</p>

    <div class="flex flex-wrap gap-1 items-center">
      <span v-if="ship.rarity !== 'common'" :class="rarityTraitClass(ship.rarity)">{{ ship.rarity }}</span>
      <span class="trait trait-size">{{ sizeLabel(ship.size) }}</span>
      <span v-for="t in ship.traits" :key="t" class="trait">{{ t }}</span>
      <span v-if="ship.livingStarship" class="trait trait-creature-type">living starship</span>
    </div>

    <div><span class="font-semibold text-accent">Perception</span> {{ formatMod(ship.perception) }};
      <span class="font-semibold text-accent">Sensor Range</span> {{ ship.sensorRange }} zones<span v-if="ship.senses">; {{ ship.senses }}</span></div>
    <div><span class="font-semibold text-accent">Skills</span> {{ formatSkills(ship.skills) }}</div>

    <div>
      <span class="font-semibold text-accent">Battle Stations</span>
      <template v-for="(st, i) in ship.battleStations" :key="st.name">
        <span :class="{ 'line-through text-danger': isMalfunctioning(st.name) }">{{ stationSummary(st) }}</span><span v-if="i < ship.battleStations.length - 1">, </span>
      </template>
    </div>

    <div>
      <span class="font-semibold text-accent">Str</span> {{ formatMod(ship.abilities.str) }},
      <span class="font-semibold text-accent">Dex</span> {{ formatMod(ship.abilities.dex) }},
      <span class="font-semibold text-accent">Con</span> {{ formatMod(ship.abilities.con) }},
      <span class="font-semibold text-accent">Int</span> {{ formatMod(ship.abilities.int) }},
      <span class="font-semibold text-accent">Wis</span> {{ formatMod(ship.abilities.wis) }},
      <span class="font-semibold text-accent">Cha</span> {{ formatMod(ship.abilities.cha) }}
    </div>

    <div class="border-t border-[var(--color-border)] pt-1">
      <span class="font-semibold text-accent">AC</span> {{ ship.ac }}; {{ formatSaves(ship.saves) }}
    </div>
    <div>{{ defenseLine(ship) }}<span v-if="ship.hpNotes">; {{ ship.hpNotes }}</span></div>
    <TscAbilityBlock v-for="ab in defenseAbilities" :key="ab.name" :ability="ab" />

    <div class="border-t border-[var(--color-border)] pt-1">
      <span class="font-semibold text-accent">Speed</span> {{ ship.speed }} zones<span v-if="ship.speedNotes">; {{ ship.speedNotes }}</span>
    </div>

    <div v-for="atk in ship.attacks" :key="atk.mode + atk.name" class="flex flex-wrap items-center gap-x-1">
      <span class="font-semibold text-accent">{{ attackModeLabel(atk) }}</span>
      <ActionIcon :action="atk.actions" class="text-accent" />
      <span
        v-if="atk.bonus !== undefined"
        class="rollable"
        :title="`Roll ${atk.name} attack`"
        @click="rollAttack(atk)"
      >{{ atk.name }} <span class="roll-value">{{ formatMod(atk.bonus) }}</span></span>
      <span v-else>{{ atk.name }}</span>
      <span v-if="attackQualifiers(atk)" class="text-dim">({{ attackQualifiers(atk) }})</span>,
      <span class="rollable" title="Roll damage" @click="rollAttackDamage(atk)">
        <span class="font-semibold">Damage</span> <span class="roll-value">{{ atk.damage }}</span>
      </span>
      <span class="rollable text-danger text-[0.625rem]" title="Roll critical damage" @click="rollAttackDamage(atk, true)">×2</span>
      <span v-if="attackSaveText(atk)" class="text-dim">({{ attackSaveText(atk) }})</span>
    </div>

    <TscAbilityBlock v-for="ab in offenseAbilities" :key="ab.name" :ability="ab" />

    <div class="border-t border-[var(--color-border)] pt-1 text-muted">
      <span class="font-semibold">Default actions</span>
      <span v-for="(ab, i) in TSC_DEFAULT_ABILITIES" :key="ab.id"> {{ ab.name }}<ActionIcon v-if="ab.actions" :action="ab.actions" /><span v-if="i < TSC_DEFAULT_ABILITIES.length - 1">,</span></span>
      <span class="italic"> — every NPC starship can Repair Self (fix one station, regain HP = level) and Seek Starships.</span>
    </div>

    <div class="flex justify-between text-[0.5625rem] lg:text-[0.6875rem] text-muted pt-1">
      <span>{{ ship.source }}<span v-if="ship.page"> p. {{ ship.page }}</span> · {{ ship.faction }}</span>
    </div>
  </div>
</template>
