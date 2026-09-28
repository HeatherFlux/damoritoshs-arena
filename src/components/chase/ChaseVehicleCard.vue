<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import type { ChaseMember, ChaseVehicleInstance } from '../../types/chase'
import {
  BROKEN_PILOTING_DC_INCREASE,
  MOVING_ATTACK_PENALTY,
  RECKLESS_ATTACK_PENALTY,
  effectiveVehicleStats,
  vehicleCondition,
} from '../../utils/chaseRules'
import VehicleStatBlock from '../tsc/VehicleStatBlock.vue'

const props = defineProps<{
  instance: ChaseVehicleInstance
  members: ChaseMember[]
}>()

const store = useChaseStore()

const amount = ref<number | null>(null)
const ignoreHardness = ref(false)
const showStatBlock = ref(false)

const condition = computed(() => vehicleCondition(props.instance))
const stats = computed(() => effectiveVehicleStats(props.instance))
const hpPercent = computed(() => Math.max(0, Math.min(100, (props.instance.currentHP / props.instance.vehicle.hp) * 100)))
const hpColor = computed(() => {
  if (condition.value === 'broken' || condition.value === 'destroyed') return 'var(--color-danger)'
  if (condition.value === 'damaged') return 'var(--color-warning)'
  return 'var(--color-success)'
})

function applyDamage() {
  if (!amount.value || amount.value <= 0) return
  store.damageVehicle(props.instance.instanceId, amount.value, { ignoreHardness: ignoreHardness.value })
  amount.value = null
}

function applyRepair() {
  if (!amount.value || amount.value <= 0) return
  store.repairVehicle(props.instance.instanceId, amount.value)
  amount.value = null
}

function remove() {
  if (confirm(`Remove ${props.instance.label} from the chase?`)) store.detachVehicle(props.instance.instanceId)
}
</script>

<template>
  <div class="bg-elevated p-2 flex flex-col gap-1.5 border-l-3" :class="condition === 'destroyed' ? 'border-l-danger opacity-70' : condition === 'broken' ? 'border-l-danger' : 'border-l-accent'">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-semibold text-sm">{{ instance.label }}</span>
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">Vehicle {{ instance.vehicle.level }}</span>
      <span v-if="condition === 'destroyed'" class="trait bg-danger text-on-danger">Destroyed</span>
      <span v-else-if="condition === 'broken'" class="trait bg-danger text-on-danger" :title="`Broken: −2 to AC, saves and collision DC; piloting DCs +${BROKEN_PILOTING_DC_INCREASE}; Speeds halved`">Broken</span>
      <button
        class="trait"
        :class="instance.uncontrolled ? 'bg-warning text-on-warning' : 'bg-surface text-dim'"
        title="Uncontrolled: keeps moving in a straight line, 10 feet less each round, until someone Takes Control"
        @click="store.setUncontrolled(instance.instanceId, !instance.uncontrolled)"
      >uncontrolled</button>
      <button class="btn-icon-tiny text-danger ml-auto" title="Remove vehicle" @click="remove">×</button>
    </div>

    <div class="hp-bar">
      <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
      <div class="hp-bar-text">{{ instance.currentHP }}<span class="opacity-50">/</span>{{ instance.vehicle.hp }} HP<span v-if="instance.vehicle.bt !== undefined" class="opacity-60"> · BT {{ instance.vehicle.bt }}</span></div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-[0.6875rem]">
      <div class="hp-controls">
        <button class="hp-btn hp-btn-damage" :title="`Damage (Hardness ${instance.vehicle.hardness} comes off first)`" @click="applyDamage">−</button>
        <input v-model.number="amount" type="number" min="0" class="hp-input" placeholder="0" @keydown.enter.exact="applyDamage" @keydown.enter.shift="applyRepair" />
        <button class="hp-btn hp-btn-heal" title="Repair" @click="applyRepair">+</button>
      </div>
      <label class="flex items-center gap-1" title="For damage that gets past Hardness"><input v-model="ignoreHardness" type="checkbox" /> ignore Hardness {{ instance.vehicle.hardness }}</label>
      <label class="flex items-center gap-1">pilot
        <select
          :value="instance.pilotMemberId ?? ''"
          class="input input-sm select w-32"
          @change="store.setPilot(instance.instanceId, ($event.target as HTMLSelectElement).value || undefined)"
        >
          <option value="">none</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem]">
      <span><span class="text-dim">Piloting</span>
        <span v-for="(c, i) in stats.pilotingChecks" :key="c.skill">
          {{ i ? ', ' : ' ' }}<span class="font-semibold">{{ c.skill }}</span> DC {{ c.dc }}<span v-if="c.note" class="text-dim"> ({{ c.note }})</span>
        </span>
      </span>
      <span><span class="text-dim">AC</span> {{ stats.ac }}</span>
      <span><span class="text-dim">Fort</span> +{{ stats.fort }}</span>
      <span><span class="text-dim">Speed</span>
        <span v-if="stats.speed.length">
          <span v-for="(s, i) in stats.speed" :key="i">{{ i ? ', ' : ' ' }}{{ s.kind ? s.kind + ' ' : '' }}{{ s.feet }} ft</span>
        </span>
        <span v-else> {{ instance.vehicle.speedText }}</span>
      </span>
      <span><span class="text-dim">Collision</span> {{ instance.vehicle.collision.damage }} (DC {{ stats.collisionDC }})</span>
    </div>
    <p v-if="stats.broken" class="text-[0.625rem] text-danger">Broken penalties are included in the numbers above.</p>
    <p class="text-[0.625rem] text-dim">
      Attacks from a vehicle that moved: {{ instance.uncontrolled ? RECKLESS_ATTACK_PENALTY : MOVING_ATTACK_PENALTY }}<span v-if="!instance.uncontrolled"> ({{ RECKLESS_ATTACK_PENALTY }} after a reckless action)</span>.
    </p>

    <button class="text-[0.6875rem] text-accent text-left" @click="showStatBlock = !showStatBlock">{{ showStatBlock ? 'Hide' : 'Show' }} stat block</button>
    <VehicleStatBlock v-if="showStatBlock" :vehicle="instance.vehicle" compact />
  </div>
</template>
