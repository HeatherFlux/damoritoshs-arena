<script setup lang="ts">
/** Edits one obstacle. Opened from the obstacle list in chase setup. */
import { computed, ref } from 'vue'
import type { ChaseEnvironment, ChaseObstacle } from '../../types/chase'
import { suggestedChasePoints } from '../../utils/chaseRules'
import { DC_ADJUSTMENTS, SIMPLE_DCS, getDCForLevel, type DCDifficulty, type SimpleDCRank } from '../../utils/dcTable'

const props = defineProps<{
  obstacle: ChaseObstacle
  index: number
  partySize: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const CHECKS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Computers', 'Crafting', 'Deception', 'Diplomacy', 'Intimidation',
  'Medicine', 'Nature', 'Occultism', 'Performance', 'Piloting', 'Religion', 'Society', 'Stealth', 'Survival',
  'Thievery', 'Perception', 'Fortitude', 'Reflex', 'Will',
]
const ENVIRONMENTS: ChaseEnvironment[] = ['underground', 'urban', 'vehicle', 'wilderness', 'custom']

const dcBasis = ref<'simple' | 'level'>('simple')
const dcRank = ref<SimpleDCRank>('trained')
const dcLevel = ref(props.obstacle.level)
const dcDifficulty = ref<DCDifficulty>('standard')
const showHelper = ref(false)

const helperDC = computed(() =>
  (dcBasis.value === 'simple' ? SIMPLE_DCS[dcRank.value] : getDCForLevel(dcLevel.value)) + DC_ADJUSTMENTS[dcDifficulty.value],
)
const suggested = computed(() => suggestedChasePoints(props.partySize, props.index))

function addOption() {
  props.obstacle.options.push({ id: crypto.randomUUID(), dc: helperDC.value, skills: [], description: '' })
}

function toggleSkill(skills: string[], skill: string) {
  const i = skills.indexOf(skill)
  if (i >= 0) skills.splice(i, 1)
  else skills.push(skill)
}

function setNoCheck(index: number, noCheck: boolean) {
  const opt = props.obstacle.options[index]
  if (noCheck) { opt.dc = undefined; opt.skills = [] }
  else opt.dc = helperDC.value
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold uppercase tracking-wide"><span class="text-accent">//</span> Obstacle {{ index + 1 }}</h3>
        <button class="btn-secondary btn-icon btn-sm" title="Close" @click="emit('close')">×</button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[0.75rem]">
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Name</span><input v-model="obstacle.name" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Level</span><input v-model.number="obstacle.level" type="number" min="0" max="20" class="input input-sm" /></label>
        <label class="flex flex-col gap-1">
          <span class="uppercase text-dim">Chase Points</span>
          <input v-model.number="obstacle.chasePoints" type="number" min="1" class="input input-sm" />
        </label>
        <p class="col-span-2 lg:col-span-4 text-dim">
          A party of {{ partySize }} usually needs {{ suggested }} here. Use more for an obstacle that should be especially hard.
        </p>
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Environment</span>
          <select v-model="obstacle.environment" class="input input-sm select capitalize">
            <option v-for="e in ENVIRONMENTS" :key="e" :value="e">{{ e[0].toUpperCase() + e.slice(1) }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 col-span-2 lg:col-span-4"><span class="uppercase text-dim">What the players see</span><textarea v-model="obstacle.description" rows="2" class="input input-sm" placeholder="Throngs of people crowd the corridors..."></textarea></label>
        <label class="flex flex-col gap-1 col-span-2 lg:col-span-4"><span class="uppercase text-dim">GM notes, never shown to players</span><textarea v-model="obstacle.notes" rows="1" class="input input-sm"></textarea></label>
      </div>

      <div class="flex items-center gap-2 mt-4 mb-2">
        <h4 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">Ways past it</h4>
        <button class="text-[0.6875rem] text-accent ml-auto" @click="showHelper = !showHelper">{{ showHelper ? 'Hide' : 'Help me pick a DC' }}</button>
      </div>

      <div v-if="showHelper" class="bg-elevated p-2 mb-2 flex flex-col gap-2 text-[0.75rem]">
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="dcBasis" class="input input-sm select w-36">
            <option value="simple">Simple DC</option>
            <option value="level">Level-based DC</option>
          </select>
          <select v-if="dcBasis === 'simple'" v-model="dcRank" class="input input-sm select w-36">
            <option v-for="(dc, rank) in SIMPLE_DCS" :key="rank" :value="rank">{{ rank }} ({{ dc }})</option>
          </select>
          <label v-else class="flex items-center gap-1">level <input v-model.number="dcLevel" type="number" min="0" max="20" class="input input-sm w-14" /></label>
          <select v-model="dcDifficulty" class="input input-sm select w-44">
            <option v-for="(adj, name) in DC_ADJUSTMENTS" :key="name" :value="name">{{ name }} ({{ adj > 0 ? '+' : '' }}{{ adj }})</option>
          </select>
          <span class="font-mono font-bold text-base text-rollable">DC {{ helperDC }}</span>
        </div>
        <p class="text-dim">The book uses simple DCs at a rank that fits the party's level. Give one approach an easy or very easy DC and the other a standard or hard one.</p>
      </div>

      <div class="flex flex-col gap-2 text-[0.75rem]">
        <div v-for="(opt, oi) in obstacle.options" :key="opt.id" class="bg-elevated p-2 flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <label v-if="opt.dc !== undefined" class="flex items-center gap-1">DC <input v-model.number="opt.dc" type="number" min="0" class="input input-sm w-16" /></label>
            <button v-if="opt.dc !== undefined && showHelper" class="btn-secondary btn-xs" @click="opt.dc = helperDC">Use {{ helperDC }}</button>
            <label class="flex items-center gap-1"><input type="checkbox" :checked="opt.dc === undefined" @change="setNoCheck(oi, ($event.target as HTMLInputElement).checked)" /> no check needed</label>
            <button class="btn-icon-tiny text-danger ml-auto" title="Remove this approach" @click="obstacle.options.splice(oi, 1)">×</button>
          </div>
          <div v-if="opt.dc !== undefined" class="flex flex-wrap gap-1">
            <button
              v-for="c in CHECKS"
              :key="c"
              class="trait cursor-pointer"
              :class="opt.skills.includes(c) ? 'bg-accent text-on-accent' : 'bg-surface text-dim'"
              @click="toggleSkill(opt.skills, c)"
            >{{ c }}</button>
          </div>
          <label class="flex items-center gap-1"><span class="text-dim shrink-0">to</span><input v-model="opt.description" class="input input-sm flex-1" placeholder="weave or push through" /></label>
        </div>
        <button class="btn-secondary btn-xs self-start" @click="addOption">+ Another way past</button>
      </div>

      <div class="flex justify-end mt-4">
        <button class="btn btn-primary" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>
