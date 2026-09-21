<script setup lang="ts">
import type { TscAbility } from '../../types/tsc'
import { abilityFields, actionCostIcon, OUTCOME_LABELS } from '../../utils/tscStatBlock'
import ActionIcon from '../ActionIcon.vue'

defineProps<{
  ability: TscAbility
  /** Source name for roll history (unused for now; abilities are prose). */
  source?: string
}>()
</script>

<template>
  <div class="text-[0.6875rem] lg:text-[0.8125rem] leading-snug">
    <span class="font-semibold text-accent">{{ ability.name }}</span>
    <ActionIcon v-if="actionCostIcon(ability.actions) !== null" :action="actionCostIcon(ability.actions)!" class="text-accent" />
    <template v-if="ability.actionsMax">
      <span class="text-dim text-[0.625rem]">to</span>
      <ActionIcon :action="actionCostIcon(ability.actionsMax)!" class="text-accent" />
    </template>
    <span v-if="ability.traits?.length" class="text-dim italic"> ({{ ability.traits.join(', ') }})</span>
    <template v-for="f in abilityFields(ability)" :key="f.label">
      <span class="font-semibold"> {{ f.label }}</span> {{ f.text }};
    </template>
    <span v-if="abilityFields(ability).length && ability.effect" class="font-semibold"> Effect</span>
    <span> {{ ability.effect }}</span>
    <div v-if="ability.outcomes" class="pl-2 lg:pl-3 mt-0.5">
      <div v-for="o in OUTCOME_LABELS" :key="o.key">
        <template v-if="ability.outcomes[o.key]">
          <span class="font-semibold">{{ o.label }}</span> {{ ability.outcomes[o.key] }}
        </template>
      </div>
    </div>
    <span v-if="ability.sharedRef" class="text-muted text-[0.625rem] italic"> (common action)</span>
  </div>
</template>
