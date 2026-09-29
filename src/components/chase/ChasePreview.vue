<script setup lang="ts">
/** Live preview of a chase while it is being set up: the chase as the GM will run it. */
import { computed } from 'vue'
import type { SavedChase } from '../../types/chase'
import { CHASE_TYPE_LABELS, PLAY_TIME_BY_LENGTH, turnOrder } from '../../utils/chaseRules'
import ChaseTrack, { type TrackObstacle } from './ChaseTrack.vue'

const props = defineProps<{
  chase: SavedChase
  problems: string[]
}>()

const trackObstacles = computed<TrackObstacle[]>(() =>
  props.chase.obstacles.map((o, index) => ({
    id: o.id,
    index,
    revealed: true,
    name: o.name,
    level: o.level,
    environment: o.environment,
    chasePoints: o.chasePoints,
    description: o.description,
    options: o.options,
  })),
)

const trackSides = computed(() =>
  props.chase.sides.map(s => ({ id: s.id, name: s.name, role: s.role, isPlayers: s.isPlayers, position: s.position })),
)

const playTime = computed(() => (props.chase.length === 'custom' ? null : PLAY_TIME_BY_LENGTH[props.chase.length]))

/** The round, in order, in plain words. */
const roundSteps = computed(() =>
  turnOrder(props.chase.sides).map(side => {
    if (side.control === 'steady') {
      if (side.pace <= 0) return `${side.name} hold where they are.`
      return `${side.name} clear ${side.pace === 1 ? 'one obstacle' : `${side.pace} obstacles`} without rolling.`
    }
    return `${side.name} each attempt a check against the obstacle in front of them.`
  }),
)

const endings = computed(() => {
  const c = props.chase
  const list: string[] = []
  const pursued = c.sides.filter(s => s.role === 'pursued').map(s => s.name)
  const pursuers = c.sides.filter(s => s.role === 'pursuer').map(s => s.name)
  const competitors = c.sides.filter(s => s.role === 'competitor').map(s => s.name)
  const join = (names: string[]) => names.join(' or ')
  if (pursued.length) list.push(`${join(pursued)} clear the last obstacle and get away.`)
  if (competitors.length > 1) list.push(`Whoever clears the last obstacle first wins.`)
  else if (competitors.length === 1) list.push(`${competitors[0]} clear the last obstacle.`)
  if (c.end.catchEnds && pursued.length && pursuers.length) list.push(`${join(pursuers)} reach the obstacle ${join(pursued)} are on and catch them.`)
  if (c.end.leadToEscape !== null && pursued.length && pursuers.length) list.push(`${join(pursued)} end a round ${c.end.leadToEscape} obstacles ahead and lose ${join(pursuers)}.`)
  if (c.end.roundLimit !== null) list.push(`Round ${c.end.roundLimit} ends and time runs out.`)
  return list
})

const vehicles = computed(() => props.chase.sides.flatMap(s => s.vehicles.map(v => ({ side: s.name, label: v.label, level: v.vehicle.level }))))
</script>

<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-4">
    <h2 class="text-xs uppercase tracking-widest text-dim font-mono"><span class="text-accent">//</span> Live Preview</h2>

    <div class="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="min-w-0">
        <h3 class="text-xl font-semibold truncate">{{ chase.name || 'Unnamed chase' }}</h3>
        <div class="text-[0.75rem] text-dim">
          {{ CHASE_TYPE_LABELS[chase.type] }} · {{ chase.obstacles.length }} obstacle{{ chase.obstacles.length === 1 ? '' : 's' }}<span v-if="playTime"> · about {{ playTime }} of play</span> · party level {{ chase.level }}
        </div>
      </div>
      <div class="ml-auto">
        <span v-if="problems.length === 0" class="ready-badge ready-yes">✓ Ready to run</span>
        <span v-else class="ready-badge ready-no">{{ problems[0] }}</span>
      </div>
    </div>

    <ChaseTrack v-if="chase.obstacles.length" :obstacles="trackObstacles" :sides="trackSides" wrap />
    <div v-else class="card p-8 text-center text-dim">No obstacles yet. Use Reroll all in step 2 to fill the chase.</div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h4 class="preview-heading">Each round</h4>
        <ol class="preview-list list-decimal">
          <li v-for="step in roundSteps" :key="step">{{ step }}</li>
        </ol>
        <p class="text-[0.75rem] text-dim mt-2">Critical success 2 Chase Points, success 1, critical failure loses 1. Enough points and they move on; extra points are not kept.</p>
      </div>
      <div class="card p-4">
        <h4 class="preview-heading">It ends when</h4>
        <ul class="preview-list list-disc">
          <li v-for="e in endings" :key="e">{{ e }}</li>
        </ul>
      </div>
    </div>

    <div v-if="vehicles.length" class="card p-4">
      <h4 class="preview-heading">Vehicles</h4>
      <div class="flex flex-wrap gap-2 text-[0.8125rem]">
        <span v-for="v in vehicles" :key="v.side + v.label" class="bg-elevated px-2 py-1">{{ v.label }} <span class="text-dim">· {{ v.side }} · level {{ v.level }}</span></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-heading {
  margin-bottom: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-dim);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}

.ready-badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ready-yes {
  background: var(--color-success);
  color: var(--color-on-success);
}

.ready-no {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}
</style>
