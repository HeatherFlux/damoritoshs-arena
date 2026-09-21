<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { FRAMES } from '../../data/tscFrames'
import { CONDITIONS } from '../../data/conditions'
import { generateShieldsDice, hullIntegrityDC } from '../../utils/tscDerive'
import { formatMod } from '../../utils/tscStatBlock'
import TscPositionEditor from './TscPositionEditor.vue'

const store = useTscStore()

const scene = computed(() => store.state.activeScene!)
const ship = computed(() => scene.value.playerShip!)
const derived = computed(() => store.derivedPlayerShip.value!)
const crewNames = computed(() => scene.value.pcs.map(p => p.name))
const entries = computed(() => scene.value.initiativeOrder)

const amount = ref<number | null>(null)
const bypassing = ref(false)
const critical = ref(false)
const sourceEntryId = ref<string>('')
const conditionToAdd = ref('off-guard')
const conditionValue = ref<number | null>(null)

const COMMON_CONDITIONS = ['off-guard', 'stunned', 'clumsy', 'dazzled', 'concealed', 'hidden', 'undetected', 'invisible', 'glitching', 'slowed', 'immobilized', 'frightened']

const hpPercent = computed(() => derived.value.maxHP ? Math.round((ship.value.currentHP / derived.value.maxHP) * 100) : 0)
const spPercent = computed(() => derived.value.maxSP ? Math.round((ship.value.currentSP / derived.value.maxSP) * 100) : 0)
const hpColor = computed(() => hpPercent.value > 50 ? 'var(--color-success)' : hpPercent.value > 25 ? 'var(--color-warning)' : 'var(--color-danger)')

function applyDamage() {
  if (!amount.value || amount.value <= 0) return
  store.damageShip({ kind: 'player' }, amount.value, {
    bypassing: bypassing.value,
    critical: critical.value,
    sourceEntryId: sourceEntryId.value || undefined,
  })
  amount.value = null
  critical.value = false
}

function applyHeal() {
  if (!amount.value || amount.value <= 0) return
  store.healShip({ kind: 'player' }, amount.value)
  amount.value = null
}

function addShields() {
  if (amount.value && amount.value > 0) store.restoreShields({ kind: 'player' }, amount.value)
  else store.restoreShields({ kind: 'player' })
  amount.value = null
}

function addCondition() {
  const def = CONDITIONS[conditionToAdd.value]
  store.addCondition({ kind: 'player' }, conditionToAdd.value, def?.hasValue ? (conditionValue.value ?? 1) : undefined)
  conditionValue.value = null
}
</script>

<template>
  <div class="card p-3 flex flex-col gap-2 border-l-3" :class="ship.compromised ? 'border-l-danger' : scene.playerShipDestroyed ? 'border-l-danger opacity-60' : 'border-l-accent'">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="font-semibold text-base">{{ ship.name }}</h3>
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">{{ FRAMES[ship.frame].name }} · Lvl {{ ship.level }}</span>
      <span v-if="scene.playerShipDestroyed" class="trait border-danger text-danger">DESTROYED</span>
      <TscPositionEditor class="ml-auto" :position="scene.playerShipPosition" :zones="scene.sensorMap.zones" @update="(p) => store.setPosition({ kind: 'player' }, p)" />
    </div>

    <div class="flex flex-col gap-1">
      <div class="hp-bar">
        <div class="hp-bar-fill" :style="{ width: spPercent + '%', background: 'var(--color-accent)' }"></div>
        <div class="hp-bar-text">{{ ship.currentSP }}<span class="opacity-50">/</span>{{ derived.maxSP }} Shields</div>
      </div>
      <div class="hp-bar">
        <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
        <div class="hp-bar-text">{{ ship.currentHP }}<span class="opacity-50">/</span>{{ derived.maxHP }} Hull</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-[0.6875rem]">
      <div class="hp-controls">
        <button class="hp-btn hp-btn-damage" title="Damage (shields first)" @click="applyDamage">−</button>
        <input v-model.number="amount" type="number" class="hp-input" placeholder="0" @keydown.enter.exact="applyDamage" @keydown.enter.shift="applyHeal" />
        <button class="hp-btn hp-btn-heal" title="Regain Hull Points" @click="applyHeal">+</button>
      </div>
      <label class="flex items-center gap-1"><input v-model="bypassing" type="checkbox" /> bypassing</label>
      <label class="flex items-center gap-1"><input v-model="critical" type="checkbox" /> crit</label>
      <label v-if="entries.length" class="flex items-center gap-1">from
        <select v-model="sourceEntryId" class="input input-sm select w-36">
          <option value="">current turn</option>
          <option v-for="e in entries" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
      </label>
      <button class="btn-secondary btn-xs" :title="`Generate Shields: roll ${generateShieldsDice(ship.level)} (or add the amount entered)`" @click="addShields">Generate Shields ({{ generateShieldsDice(ship.level) }})</button>
    </div>

    <div class="grid grid-cols-4 md:grid-cols-8 gap-1 text-center text-[0.6875rem]">
      <div v-for="stat in [['AC', String(derived.ac)], ['Fort', formatMod(derived.fort)], ['Ref', formatMod(derived.ref)], ['Will', formatMod(derived.will)], ['Speed', String(derived.speed)], ['Sensors', String(derived.sensorRange)], ['Piloting DC', ship.pilotingDC ? String(ship.pilotingDC) : '—'], ['Wrecked', String(ship.wrecked)]]" :key="stat[0]" class="bg-elevated p-1">
        <div class="text-[0.5625rem] uppercase text-dim">{{ stat[0] }}</div>
        <div class="font-bold">{{ stat[1] }}</div>
      </div>
    </div>

    <!-- Compromised state -->
    <div v-if="ship.compromised" class="bg-danger-subtle border border-danger p-2 text-[0.75rem] flex flex-wrap items-center gap-2">
      <span class="font-semibold text-danger">Compromised {{ ship.compromised }}</span>
      <span class="text-dim">Hull integrity check each round on the ship's turn: flat DC {{ hullIntegrityDC(ship.compromised) }}. Crit −2 / success −1 / fail +1 / crit fail +2. Destroyed at 10.</span>
      <button class="btn-danger btn-xs" @click="store.hullIntegrityCheck()">Roll hull integrity</button>
      <label class="flex items-center gap-1">value <input :value="ship.compromised" type="number" min="0" max="10" class="input input-sm w-14" @change="store.setCompromised(Number(($event.target as HTMLInputElement).value))" /></label>
    </div>

    <!-- Starship conditions -->
    <div class="flex flex-wrap items-center gap-1 text-[0.6875rem]">
      <button class="trait" :class="ship.inoperable ? 'border-warning text-warning' : 'text-dim'" title="Inoperable: can't act, −4 status to AC/Perception/Reflex, off-guard" @click="store.setInoperable({ kind: 'player' }, !ship.inoperable)">inoperable</button>
      <button class="trait" :class="ship.offKilter ? 'border-warning text-warning' : 'text-dim'" title="Off-kilter: −2 circumstance to attacks, Area/Auto-Fire DCs, Reflex; no moving station actions" @click="store.setOffKilter({ kind: 'player' }, !ship.offKilter)">off-kilter</button>
      <label class="flex items-center gap-1">wrecked <input :value="ship.wrecked" type="number" min="0" class="input input-sm w-12" @change="store.setWrecked(Number(($event.target as HTMLInputElement).value))" /></label>
      <span v-for="c in ship.conditions" :key="c.name" class="trait border-accent cursor-pointer" :title="CONDITIONS[c.name]?.shortDescription ?? 'Remove'" @click="store.removeCondition({ kind: 'player' }, c.name)">{{ c.name }}<span v-if="c.value"> {{ c.value }}</span> ×</span>
      <select v-model="conditionToAdd" class="input input-sm select w-28">
        <option v-for="c in COMMON_CONDITIONS" :key="c" :value="c">{{ CONDITIONS[c]?.name ?? c }}</option>
      </select>
      <input v-if="CONDITIONS[conditionToAdd]?.hasValue" v-model.number="conditionValue" type="number" min="1" class="input input-sm w-12" placeholder="1" />
      <button class="btn-secondary btn-xs" @click="addCondition">+ condition</button>
    </div>

    <!-- Stations -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
      <div v-for="st in ship.stations" :key="st.id" class="bg-elevated p-1.5 flex items-center gap-2 text-[0.6875rem] border-l-3" :class="st.malfunctioning ? 'border-l-danger' : 'border-l-success'">
        <div class="flex flex-col min-w-0">
          <span class="font-semibold capitalize">{{ st.kind }}</span>
          <span class="text-[0.5625rem] uppercase text-dim">{{ derived.stations.find(s => s.id === st.id)?.grade }}<span v-if="st.upgrades.length"> · {{ st.upgrades.length }} upgrade{{ st.upgrades.length === 1 ? '' : 's' }}</span></span>
        </div>
        <select :value="st.helmedBy ?? ''" class="input input-sm select flex-1 min-w-0" title="Helmed by" @change="store.setHelmedBy(st.id, ($event.target as HTMLSelectElement).value || undefined)">
          <option value="">— unhelmed —</option>
          <option v-for="n in crewNames" :key="n" :value="n">{{ n }}</option>
        </select>
        <button
          class="btn-xs"
          :class="st.malfunctioning ? 'btn-danger' : 'btn-secondary'"
          :title="st.malfunctioning ? 'Repair Station (clear malfunctioning)' : 'Mark malfunctioning'"
          @click="store.setStationMalfunction({ kind: 'player' }, st.id, !st.malfunctioning)"
        >{{ st.malfunctioning ? 'Repair' : 'OK' }}</button>
      </div>
    </div>

    <label class="flex items-center gap-1 text-[0.6875rem]">Piloting DC
      <input :value="ship.pilotingDC ?? ''" type="number" class="input input-sm w-16" placeholder="—" @change="store.setPilotingDC(Number(($event.target as HTMLInputElement).value) || undefined)" />
      <span class="text-dim">replaces AC when higher while the pilot's console is helmed</span>
    </label>
  </div>
</template>
