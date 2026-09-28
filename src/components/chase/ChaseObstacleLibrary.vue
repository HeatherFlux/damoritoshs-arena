<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAMPLE_CHASE_OBSTACLES } from '../../data/chaseObstacles'
import type { ChaseEnvironment, SampleChaseObstacle } from '../../types/chase'

const props = defineProps<{
  addLabel?: string
  partyLevel?: number
}>()

const emit = defineEmits<{
  (e: 'add', obstacle: SampleChaseObstacle): void
}>()

const searchQuery = ref('')
const environment = ref<'' | ChaseEnvironment>('')
const levelBand = ref<'' | 'low' | 'mid' | 'high'>('')
const justAdded = ref<string | null>(null)

const ENVIRONMENTS: ChaseEnvironment[] = ['underground', 'urban', 'vehicle', 'wilderness']

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return SAMPLE_CHASE_OBSTACLES.filter(o => {
    if (environment.value && o.environment !== environment.value) return false
    if (levelBand.value === 'low' && o.level > 2) return false
    if (levelBand.value === 'mid' && (o.level < 3 || o.level > 9)) return false
    if (levelBand.value === 'high' && o.level < 10) return false
    if (!q) return true
    return o.name.toLowerCase().includes(q)
      || o.options.some(opt => opt.description.toLowerCase().includes(q) || opt.skills.some(s => s.toLowerCase().includes(q)))
  })
})

function baseName(o: SampleChaseObstacle): string | undefined {
  return o.baseId ? SAMPLE_CHASE_OBSTACLES.find(b => b.id === o.baseId)?.name : undefined
}

function add(o: SampleChaseObstacle) {
  emit('add', o)
  justAdded.value = o.id
  setTimeout(() => { if (justAdded.value === o.id) justAdded.value = null }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base lg:text-lg font-semibold">Sample Obstacles</h2>
      <span class="text-xs text-dim">{{ filtered.length }} / {{ SAMPLE_CHASE_OBSTACLES.length }} · GM Core p. 217</span>
    </div>

    <div class="flex flex-col gap-2 mb-3">
      <input v-model="searchQuery" type="text" placeholder="Search by name, skill, or approach..." class="input input-sm lg:input" />
      <div class="grid grid-cols-2 lg:flex gap-2">
        <select v-model="environment" class="input input-sm lg:input select flex-1">
          <option value="">Any Environment</option>
          <option v-for="e in ENVIRONMENTS" :key="e" :value="e" class="capitalize">{{ e[0].toUpperCase() + e.slice(1) }}</option>
        </select>
        <select v-model="levelBand" class="input input-sm lg:input select flex-1">
          <option value="">Any Level</option>
          <option value="low">Levels 1 to 2</option>
          <option value="mid">Levels 3 to 9</option>
          <option value="high">Levels 10 and up</option>
        </select>
      </div>
      <p v-if="props.partyLevel" class="text-[0.6875rem] text-dim">The party is level {{ props.partyLevel }}. The level is the group an obstacle suits best.</p>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">
      <div v-for="o in filtered" :key="o.id" class="card p-2 lg:p-3 flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-1.5 mb-1">
            <span class="font-semibold text-sm">{{ o.name }}</span>
            <span class="badge-level text-[0.5625rem]">Lvl {{ o.level }}</span>
            <span class="text-[0.5625rem] px-1 py-0.5 rounded bg-elevated text-dim capitalize">{{ o.environment }}</span>
            <span v-if="baseName(o)" class="text-[0.5625rem] text-dim">tougher {{ baseName(o) }}</span>
          </div>
          <ul class="text-[0.75rem] flex flex-col gap-0.5">
            <li v-for="(opt, i) in o.options" :key="i">
              <span class="font-mono font-bold text-rollable">DC {{ opt.dc }}</span>
              <span class="font-semibold"> {{ opt.skills.join(' or ') }}</span>
              <span class="text-dim"> to {{ opt.description }}</span>
            </li>
          </ul>
        </div>
        <button v-if="props.addLabel" class="btn-xs shrink-0" :class="justAdded === o.id ? 'btn-success' : 'btn-primary'" @click="add(o)">{{ justAdded === o.id ? 'Added' : props.addLabel }}</button>
      </div>
      <div v-if="filtered.length === 0" class="text-center py-6 text-dim text-sm">No obstacles match your filters.</div>
    </div>
  </div>
</template>
