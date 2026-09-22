<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import type { TscHazardInstance } from '../../types/tsc'
import TscPositionEditor from './TscPositionEditor.vue'
import TscHazardStatBlock from './TscHazardStatBlock.vue'

const props = defineProps<{ instance: TscHazardInstance }>()
const store = useTscStore()

const scene = computed(() => store.state.activeScene!)
const hazard = computed(() => props.instance.hazard)
const showStatBlock = ref(false)
const amount = ref<number | null>(null)
const component = ref<string>('')
const isCurrent = computed(() => store.currentEntry.value?.refId === props.instance.instanceId)

function applyDamage() {
  if (!amount.value || amount.value <= 0) return
  store.damageHazard(props.instance.instanceId, amount.value, component.value || undefined)
  amount.value = null
}

function renameLabel(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim()
  if (v) props.instance.label = v
}
</script>

<template>
  <div
    class="card p-3 flex flex-col gap-2 border-l-3"
    :class="[instance.disabled ? 'border-l-dim opacity-60' : isCurrent ? 'border-l-accent card-glow' : 'border-l-warning', { 'opacity-70': instance.hiddenFromPlayers }]"
  >
    <div class="flex flex-wrap items-center gap-2">
      <input :value="instance.label" class="input input-sm font-semibold w-44" title="Label shown to players" @change="renameLabel" />
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">{{ hazard.name }} · Lvl {{ hazard.level }} · {{ hazard.complexity }} · {{ hazard.scale === 'starship' ? 'sensor map' : 'deck' }}</span>
      <span v-if="instance.disabled" class="trait">disabled</span>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-xs" :class="instance.hiddenFromPlayers ? 'btn-danger' : 'btn-secondary'" @click="store.setHidden({ kind: 'hazard', instanceId: instance.instanceId }, !instance.hiddenFromPlayers)">{{ instance.hiddenFromPlayers ? 'hidden' : 'shown' }}</button>
        <button class="btn-xs" :class="instance.detected ? 'btn-secondary' : 'btn-danger'" :title="instance.detected ? 'Detected by the crew' : `Undetected: Stealth ${hazard.stealth.text}`" @click="store.setDetected({ kind: 'hazard', instanceId: instance.instanceId }, !instance.detected)">{{ instance.detected ? 'detected' : 'undetected' }}</button>
        <button
          v-if="hazard.complexity === 'complex'"
          class="btn-xs"
          :class="instance.triggered ? 'btn-secondary' : 'btn-primary'"
          :title="instance.triggered ? 'Triggered: in initiative (click to withdraw)' : 'Its reaction fires: the hazard rolls initiative and joins the order'"
          @click="instance.triggered ? store.untriggerHazard(instance.instanceId) : store.triggerHazard(instance.instanceId)"
        >{{ instance.triggered ? 'Triggered' : 'Trigger' }}</button>
        <button class="btn-xs" :class="instance.disabled ? 'btn-secondary' : 'btn-danger'" @click="store.setHazardDisabled(instance.instanceId, !instance.disabled)">{{ instance.disabled ? 'Re-arm' : 'Disable' }}</button>
        <button class="btn-secondary btn-xs" @click="showStatBlock = !showStatBlock">{{ showStatBlock ? 'Hide' : 'Stat block' }}</button>
        <button class="btn-icon-sm text-danger" title="Remove from scene" @click="store.removeHazard(instance.instanceId)">×</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-[0.6875rem]">
      <TscPositionEditor v-if="hazard.scale === 'starship'" :position="instance.position" :zones="scene.sensorMap.zones" @update="(p) => store.setPosition({ kind: 'hazard', instanceId: instance.instanceId }, p)" />
      <span class="text-dim">Stealth {{ hazard.stealth.text }}</span>
      <span v-if="hazard.ac !== undefined" class="text-dim">· AC {{ hazard.ac }}</span>
      <span v-if="hazard.routine" class="text-dim">· routine {{ hazard.routine.actions }} action{{ hazard.routine.actions === 1 ? '' : 's' }}</span>
    </div>

    <div class="text-[0.6875rem]"><span class="font-semibold text-accent">Disable</span> {{ hazard.disableText }}</div>

    <div v-if="instance.currentHP !== undefined || instance.componentHP" class="flex flex-wrap items-center gap-2 text-[0.6875rem]">
      <span v-if="instance.currentHP !== undefined" class="trait">HP {{ instance.currentHP }}/{{ hazard.hp }}<span v-if="hazard.hardness !== undefined"> · hardness {{ hazard.hardness }}</span></span>
      <span v-for="(hp, name) in instance.componentHP" :key="name" class="trait">{{ name }} HP {{ hp }}/{{ hazard.components.find(c => c.name === name)?.hp }}</span>
      <div class="hp-controls">
        <button class="hp-btn hp-btn-damage" @click="applyDamage">−</button>
        <input v-model.number="amount" type="number" class="hp-input" placeholder="0" @keydown.enter="applyDamage" />
      </div>
      <select v-if="instance.componentHP" v-model="component" class="input input-sm select w-28">
        <option value="">— target —</option>
        <option v-for="(_, name) in instance.componentHP" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <div v-if="showStatBlock" class="border-t border-[var(--color-border)] pt-2">
      <TscHazardStatBlock :hazard="hazard" compact />
    </div>
  </div>
</template>
