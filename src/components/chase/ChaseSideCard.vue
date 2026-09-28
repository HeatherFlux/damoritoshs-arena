<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { usePartyStore } from '../../stores/partyStore'
import type { ChaseDegree, ChaseSide } from '../../types/chase'
import { STUCK_ROUNDS, currentObstacle, effectiveVehicleStats, hasFinished } from '../../utils/chaseRules'
import ChaseVehicleCard from './ChaseVehicleCard.vue'

const props = defineProps<{
  side: ChaseSide
}>()

const emit = defineEmits<{
  (e: 'add-vehicle', sideId: string): void
}>()

const store = useChaseStore()
const partyStore = usePartyStore()

const newMember = ref('')
const modifier = ref<number | null>(null)
/** The approach picked for the obstacle with this id; a new obstacle starts on its first approach. */
const picked = ref<{ obstacleId: string; optionId: string } | null>(null)

const scene = computed(() => store.state.activeScene!)
const obstacle = computed(() => currentObstacle(scene.value, props.side))
const finished = computed(() => hasFinished(scene.value, props.side))
const locked = computed(() => !!scene.value.outcome)
const stuck = computed(() => !!obstacle.value && props.side.roundsAtObstacle >= STUCK_ROUNDS)

const option = computed(() => {
  const o = obstacle.value
  if (!o) return null
  const chosen = picked.value?.obstacleId === o.id ? picked.value.optionId : null
  return o.options.find(x => x.id === chosen) ?? o.options[0] ?? null
})

const chosenOptionId = computed({
  get: () => option.value?.id ?? '',
  set: (optionId: string) => {
    if (obstacle.value) picked.value = { obstacleId: obstacle.value.id, optionId }
  },
})

const roleLabel = computed(() => ({ pursued: 'Pursued, acts first', pursuer: 'Pursuer, acts second', competitor: 'Competitor' }[props.side.role]))

/** Piloting DCs of this side's vehicles, shown when the chosen approach can use Piloting. */
const pilotingAids = computed(() => {
  if (!option.value?.skills.some(s => s.toLowerCase() === 'piloting')) return []
  return props.side.vehicles.map(v => ({
    label: v.label,
    checks: effectiveVehicleStats(v).pilotingChecks,
  }))
})

const DEGREES: { degree: ChaseDegree; label: string; points: string; cls: string }[] = [
  { degree: 'criticalSuccess', label: 'Crit', points: '+2', cls: 'btn-success' },
  { degree: 'success', label: 'Success', points: '+1', cls: 'btn-success' },
  { degree: 'failure', label: 'Fail', points: '0', cls: 'btn-secondary' },
  { degree: 'criticalFailure', label: 'Crit fail', points: '−1', cls: 'btn-danger' },
]

function resolve(memberId: string | null, degree: ChaseDegree) {
  store.resolveCheck(props.side.id, memberId, degree, { optionId: option.value?.id })
}

function roll(memberId: string | null) {
  if (!option.value || option.value.dc === undefined) return
  store.rollCheck(props.side.id, memberId, option.value.id, modifier.value ?? props.side.rollModifier)
}

function addMember() {
  store.addMember(props.side.id, newMember.value)
  newMember.value = ''
}

function addParty() {
  const added = store.addMembersFromParty(props.side.id, partyStore.getPartyPlayers())
  if (!added) alert('Everyone in the active party is already on this side.')
}
</script>

<template>
  <div class="card p-3 flex flex-col gap-2 border-l-3" :class="side.isPlayers ? 'border-l-accent' : 'border-l-danger'">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="font-semibold text-base">{{ side.name }}</h3>
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">{{ roleLabel }}</span>
      <span v-if="finished" class="trait bg-success text-on-success">Past the last obstacle</span>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-secondary btn-xs" title="Move back one obstacle" :disabled="locked" @click="store.nudgeSide(side.id, -1)">Back</button>
        <button class="btn-secondary btn-xs" title="Move ahead one obstacle: a shortcut, or another way around" :disabled="locked" @click="store.nudgeSide(side.id, 1)">Ahead</button>
      </div>
    </div>

    <!-- Where it is -->
    <div v-if="obstacle" class="flex flex-wrap items-center gap-2 text-[0.75rem]">
      <span class="text-dim">Facing</span>
      <span class="font-semibold">{{ side.position + 1 }}. {{ obstacle.name }}</span>
      <template v-if="side.control === 'checks'">
        <span class="text-dim">Chase Points</span>
        <input
          :value="side.chasePoints"
          type="number"
          min="0"
          class="input input-sm w-14"
          :disabled="locked"
          @change="store.setChasePoints(side.id, Number(($event.target as HTMLInputElement).value))"
        />
        <span class="text-dim">of {{ obstacle.chasePoints }}</span>
      </template>
    </div>
    <div v-else-if="side.position < 0" class="text-[0.75rem] text-dim">At the start, before the first obstacle.</div>

    <!-- Steady pace -->
    <div v-if="side.control === 'steady'" class="flex flex-wrap items-center gap-2 text-[0.75rem]">
      <span class="text-dim">Steady pace:</span>
      <input v-model.number="side.pace" type="number" min="0" max="5" class="input input-sm w-14" />
      <span class="text-dim">obstacle{{ side.pace === 1 ? '' : 's' }} each round, {{ side.role === 'pursued' ? 'at the start of the round' : 'at the end of the round' }}.</span>
      <button class="btn-secondary btn-xs" title="Roll checks for this side instead" @click="side.control = 'checks'">Roll for them instead</button>
    </div>

    <!-- Checks -->
    <template v-else-if="obstacle">
      <div v-if="stuck" class="bg-warning-subtle border border-warning p-2 text-[0.75rem]">
        <span class="font-semibold">Stuck for {{ side.roundsAtObstacle }} rounds.</span>
        <span class="text-dim"> The book suggests letting them find another way around, or bringing in outside help at a cost.</span>
        <button class="btn-secondary btn-xs ml-2" @click="store.nudgeSide(side.id, 1)">Move them on</button>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-[0.75rem]">
        <span class="text-dim">Approach</span>
        <select v-model="chosenOptionId" class="input input-sm select flex-1 min-w-[12rem]">
          <option v-for="o in obstacle.options" :key="o.id" :value="o.id">
            {{ o.dc !== undefined ? `DC ${o.dc} ` : '' }}{{ o.skills.join(' or ') || 'No check' }}{{ o.description ? ` to ${o.description}` : '' }}
          </option>
        </select>
        <label class="flex items-center gap-1" title="Used when you press Roll">modifier
          <input v-model.number="modifier" type="number" class="input input-sm w-14" :placeholder="String(side.rollModifier)" />
        </label>
      </div>

      <div v-if="pilotingAids.length" class="text-[0.6875rem] bg-elevated p-1.5">
        <span class="trait bg-surface text-dim mr-1" title="The chase rules do not use vehicle statistics. This is shown for reference.">table aid</span>
        <span v-for="aid in pilotingAids" :key="aid.label" class="mr-3">
          <span class="font-semibold">{{ aid.label }}</span>
          <span v-for="c in aid.checks" :key="c.skill" class="text-dim"> · {{ c.skill }} DC {{ c.dc }}</span>
        </span>
      </div>

      <div class="flex flex-col gap-1">
        <div v-for="m in side.members" :key="m.id" class="flex flex-wrap items-center gap-1 bg-elevated p-1.5 text-[0.75rem]" :class="{ 'opacity-60': m.hasActed }">
          <input
            type="checkbox"
            :checked="m.hasActed"
            :title="m.hasActed ? 'Has acted this round' : 'Has not acted yet'"
            @change="store.setMemberActed(side.id, m.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="font-semibold w-28 truncate" :title="m.name">{{ m.name }}</span>
          <button
            v-for="d in DEGREES"
            :key="d.degree"
            class="btn-xs"
            :class="d.cls"
            :disabled="locked"
            :title="`${d.points} Chase Point${d.points === '+1' || d.points === '−1' ? '' : 's'}`"
            @click="resolve(m.id, d.degree)"
          >{{ d.label }}</button>
          <button class="btn-secondary btn-xs" :disabled="locked || option?.dc === undefined" title="Roll d20 plus the modifier against the chosen approach" @click="roll(m.id)">Roll</button>
          <button class="btn-secondary btn-xs" :disabled="locked" title="Helps without a check: +1 Chase Point" @click="store.grantPoints(side.id, m.id, 1, 'no check needed')">+1 no check</button>
          <button class="btn-secondary btn-xs" :disabled="locked" title="Passes or can't act: the group loses 1 Chase Point" @click="store.passTurn(side.id, m.id)">Pass</button>
          <button class="btn-icon-tiny text-danger ml-auto" title="Remove from the chase" @click="store.removeMember(side.id, m.id)">×</button>
        </div>

        <div v-if="side.members.length === 0" class="flex flex-wrap items-center gap-1 bg-elevated p-1.5 text-[0.75rem]">
          <span class="text-dim w-28">Whole group</span>
          <button v-for="d in DEGREES" :key="d.degree" class="btn-xs" :class="d.cls" :disabled="locked" @click="resolve(null, d.degree)">{{ d.label }}</button>
          <button class="btn-secondary btn-xs" :disabled="locked || option?.dc === undefined" @click="roll(null)">Roll</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1 text-[0.75rem]">
        <input v-model="newMember" type="text" class="input input-sm w-40" placeholder="Name" @keydown.enter="addMember" />
        <button class="btn-secondary btn-xs" @click="addMember">+ Member</button>
        <button v-if="side.isPlayers" class="btn-secondary btn-xs" @click="addParty">Add active party</button>
        <button v-if="!side.isPlayers" class="btn-secondary btn-xs ml-auto" title="Go back to a steady pace" @click="side.control = 'steady'">Use steady pace</button>
      </div>
    </template>

    <!-- Vehicles -->
    <div class="flex flex-col gap-1.5">
      <ChaseVehicleCard v-for="v in side.vehicles" :key="v.instanceId" :instance="v" :members="side.members" />
      <button class="btn-secondary btn-xs self-start" @click="emit('add-vehicle', side.id)">+ Vehicle</button>
    </div>
  </div>
</template>
