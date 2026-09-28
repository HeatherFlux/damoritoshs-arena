<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore, hullBand } from '../../stores/tscStore'
import type { TscNpcShipInstance } from '../../types/tsc'
import { CONDITIONS } from '../../data/conditions'
import { sizeLabel } from '../../utils/tscStatBlock'
import TscPositionEditor from './TscPositionEditor.vue'
import TscStarshipStatBlock from './TscStarshipStatBlock.vue'

const props = defineProps<{ instance: TscNpcShipInstance }>()
const store = useTscStore()

const scene = computed(() => store.state.activeScene!)
const target = computed(() => ({ kind: 'npc' as const, instanceId: props.instance.instanceId }))
const model = computed(() => props.instance.model)
const showStatBlock = ref(false)
const amount = ref<number | null>(null)
const bypassing = ref(false)
const conditionToAdd = ref('off-guard')
const conditionValue = ref<number | null>(null)
const COMMON_CONDITIONS = ['off-guard', 'stunned', 'clumsy', 'dazzled', 'concealed', 'hidden', 'undetected', 'invisible', 'glitching', 'slowed', 'immobilized', 'frightened']

const hpPercent = computed(() => model.value.hp ? Math.round((props.instance.currentHP / model.value.hp) * 100) : 0)
const spPercent = computed(() => model.value.sp ? Math.round((props.instance.currentSP / model.value.sp) * 100) : 0)
const hpColor = computed(() => hpPercent.value > 50 ? 'var(--color-success)' : hpPercent.value > 25 ? 'var(--color-warning)' : 'var(--color-danger)')
const band = computed(() => hullBand(props.instance.currentHP, model.value.hp))
const malfunctioning = computed(() => Object.entries(props.instance.stationState).filter(([, s]) => s.malfunctioning).map(([n]) => n))
const isCurrent = computed(() => store.currentEntry.value?.refId === props.instance.instanceId)

function applyDamage() {
  if (!amount.value || amount.value <= 0) return
  store.damageShip(target.value, amount.value, { bypassing: bypassing.value })
  amount.value = null
}

function applyHeal() {
  if (!amount.value || amount.value <= 0) return
  store.healShip(target.value, amount.value)
  amount.value = null
}

function fortify() {
  store.restoreShields(target.value, amount.value && amount.value > 0 ? amount.value : undefined)
  amount.value = null
}

function addCondition() {
  const def = CONDITIONS[conditionToAdd.value]
  store.addCondition(target.value, conditionToAdd.value, def?.hasValue ? (conditionValue.value ?? 1) : undefined)
  conditionValue.value = null
}

function toggleIdentified(stationName: string) {
  if (store.isStationIdentified(model.value.name, stationName)) {
    const remaining = (store.state.identifiedModels[model.value.name] ?? []).filter(n => n !== stationName)
    store.forgetModel(model.value.name)
    if (remaining.length) store.identifyModel(model.value.name, remaining)
  } else {
    store.identifyModel(model.value.name, [stationName])
  }
}

function identifyAll() {
  store.identifyModel(model.value.name, model.value.battleStations.map(s => s.name))
}

function renameLabel(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim()
  if (v) props.instance.label = v
}
</script>

<template>
  <div
    class="card p-3 flex flex-col gap-2 border-l-3"
    :class="[instance.destroyed ? 'border-l-danger opacity-60' : isCurrent ? 'border-l-accent card-glow' : 'border-l-danger', { 'opacity-70': instance.hiddenFromPlayers }]"
  >
    <div class="flex flex-wrap items-center gap-2">
      <input :value="instance.label" class="input input-sm font-semibold w-44" title="Label shown to players" @change="renameLabel" />
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">{{ model.name }} · Lvl {{ model.level }} · {{ sizeLabel(model.size) }}</span>
      <span v-if="instance.destroyed" class="trait bg-danger text-on-danger">DESTROYED</span>
      <span v-else class="trait" :class="{ 'bg-warning text-on-warning': band === 'damaged', 'bg-danger text-on-danger': band === 'critical' }">{{ band }}</span>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-xs" :class="instance.hiddenFromPlayers ? 'btn-danger' : 'btn-secondary'" :title="instance.hiddenFromPlayers ? 'Hidden from players (click to reveal)' : 'Visible to players (click to hide)'" @click="store.setHidden({ kind: 'npc', instanceId: instance.instanceId }, !instance.hiddenFromPlayers)">{{ instance.hiddenFromPlayers ? 'hidden' : 'shown' }}</button>
        <button class="btn-xs" :class="instance.detected ? 'btn-secondary' : 'btn-danger'" :title="instance.detected ? 'Detected by the crew' : 'Undetected: not on the player sensor feed'" @click="store.setDetected({ kind: 'npc', instanceId: instance.instanceId }, !instance.detected)">{{ instance.detected ? 'detected' : 'undetected' }}</button>
        <button class="btn-secondary btn-xs" @click="showStatBlock = !showStatBlock">{{ showStatBlock ? 'Hide' : 'Stat block' }}</button>
        <button class="btn-icon-sm text-danger" title="Remove from scene" @click="store.removeNpcShip(instance.instanceId)">×</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <TscPositionEditor :position="instance.position" :zones="scene.sensorMap.zones" @update="(p) => store.setPosition({ kind: 'npc', instanceId: instance.instanceId }, p)" />
      <span class="text-[0.6875rem] text-dim">AC {{ model.ac }} · Fort +{{ model.saves.fort }} · Ref +{{ model.saves.ref }} · Will +{{ model.saves.will }} · Perception +{{ model.perception }} · sensors {{ model.sensorRange }} · speed {{ model.speed }}</span>
    </div>

    <div class="flex flex-col gap-1">
      <div v-if="model.sp !== undefined" class="hp-bar">
        <div class="hp-bar-fill" :style="{ width: spPercent + '%', background: 'var(--color-accent)' }"></div>
        <div class="hp-bar-text">{{ instance.currentSP }}<span class="opacity-50">/</span>{{ model.sp }} Shields<span v-if="model.fortify" class="opacity-60"> · fortify {{ model.fortify }}</span></div>
      </div>
      <div class="hp-bar">
        <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
        <div class="hp-bar-text">{{ instance.currentHP }}<span class="opacity-50">/</span>{{ model.hp }} Hull</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-[0.6875rem]">
      <div class="hp-controls">
        <button class="hp-btn hp-btn-damage" title="Damage (shields first)" @click="applyDamage">−</button>
        <input v-model.number="amount" type="number" class="hp-input" placeholder="0" @keydown.enter.exact="applyDamage" @keydown.enter.shift="applyHeal" />
        <button class="hp-btn hp-btn-heal" title="Regain Hull Points" @click="applyHeal">+</button>
      </div>
      <label class="flex items-center gap-1"><input v-model="bypassing" type="checkbox" /> bypassing</label>
      <button v-if="model.sp !== undefined" class="btn-secondary btn-xs" :title="`Fortify Shield Points (+${model.fortify ?? 0} SP, or the amount entered)`" @click="fortify">Fortify</button>
      <button class="btn-secondary btn-xs" :disabled="instance.inoperable" :title="instance.inoperable ? 'Inoperable starships can\'t act' : 'Repair Self (3 actions): fix one malfunctioning station, regain HP equal to level'" @click="store.repairSelf(instance.instanceId)">Repair Self</button>
      <button class="trait" :class="instance.inoperable ? 'bg-warning text-on-warning' : 'bg-elevated text-dim'" @click="store.setInoperable(target, !instance.inoperable)">inoperable</button>
      <button class="trait" :class="instance.offKilter ? 'bg-warning text-on-warning' : 'bg-elevated text-dim'" @click="store.setOffKilter(target, !instance.offKilter)">off-kilter</button>
    </div>

    <!-- Stations: malfunction + identification -->
    <div class="flex flex-wrap items-center gap-1 text-[0.6875rem]">
      <span class="text-dim">Stations</span>
      <button
        v-for="st in model.battleStations"
        :key="st.name"
        class="trait"
        :class="instance.stationState[st.name]?.malfunctioning ? 'bg-danger text-on-danger line-through' : store.isStationIdentified(model.name, st.name) ? 'bg-accent text-on-accent' : ''"
        :title="`${st.entries.map(e => e.name + (e.shared ? '*' : '')).join(', ')}\nClick: toggle malfunctioning · Shift+click: toggle identified by the crew`"
        @click.exact="store.setStationMalfunction(target, st.name, !instance.stationState[st.name]?.malfunctioning)"
        @click.shift.prevent="toggleIdentified(st.name)"
      >{{ st.name }}<span v-if="store.isStationIdentified(model.name, st.name)" class="text-accent"> ✓</span></button>
      <button class="btn-secondary btn-xs" title="Scan Target success: identify all battle stations (remembered for this model)" @click="identifyAll">Identify all</button>
    </div>

    <div class="flex flex-wrap items-center gap-1 text-[0.6875rem]">
      <span v-for="c in instance.conditions" :key="c.name" class="trait border-accent cursor-pointer" :title="CONDITIONS[c.name]?.shortDescription ?? 'Remove'" @click="store.removeCondition(target, c.name)">{{ c.name }}<span v-if="c.value"> {{ c.value }}</span> ×</span>
      <select v-model="conditionToAdd" class="input input-sm select w-28">
        <option v-for="c in COMMON_CONDITIONS" :key="c" :value="c">{{ CONDITIONS[c]?.name ?? c }}</option>
      </select>
      <input v-if="CONDITIONS[conditionToAdd]?.hasValue" v-model.number="conditionValue" type="number" min="1" class="input input-sm w-12" placeholder="1" />
      <button class="btn-secondary btn-xs" @click="addCondition">+ condition</button>
    </div>

    <div v-if="showStatBlock" class="border-t border-[var(--color-border)] pt-2">
      <TscStarshipStatBlock :ship="model" compact :malfunctioning="malfunctioning" />
    </div>
  </div>
</template>
