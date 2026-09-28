<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { CHASE_TYPE_LABELS, CHASE_TYPE_SUMMARIES, turnOrder } from '../../utils/chaseRules'
import ChaseTrack, { type TrackObstacle } from './ChaseTrack.vue'
import ChaseSideCard from './ChaseSideCard.vue'

const emit = defineEmits<{
  (e: 'open-builder'): void
  (e: 'add-vehicle', sideId: string): void
}>()

const store = useChaseStore()
const scene = computed(() => store.state.activeScene)
const shareNote = ref('')
const showGmLog = ref(true)

const trackObstacles = computed<TrackObstacle[]>(() =>
  (scene.value?.obstacles ?? []).map((o, index) => ({
    id: o.id,
    index,
    revealed: true,
    shownToPlayers: o.revealedToPlayers,
    name: o.name,
    level: o.level,
    environment: o.environment,
    chasePoints: o.chasePoints,
    description: o.description,
    options: o.options,
  })),
)

const orderedSides = computed(() => (scene.value ? turnOrder(scene.value.sides) : []))

const gapText = computed(() => {
  const gap = store.gap.value
  if (gap === null) return ''
  if (gap === 0) return 'Level with the other side'
  const n = Math.abs(gap)
  return `${n} obstacle${n === 1 ? '' : 's'} ${gap > 0 ? 'ahead' : 'behind'}`
})

const roundText = computed(() => {
  const s = scene.value
  if (!s) return ''
  return s.end.roundLimit !== null ? `Round ${s.round} of ${s.end.roundLimit}` : `Round ${s.round}`
})

const logEntries = computed(() => {
  const entries = scene.value?.log ?? []
  return (showGmLog.value ? entries : entries.filter(e => !e.gmOnly)).slice(-40).reverse()
})

function toggleReveal(o: TrackObstacle) {
  if (o.id) store.revealObstacle(o.id, !o.shownToPlayers)
}

async function openPlayerView() {
  const result = await store.openPlayerView()
  shareNote.value = result.success ? 'Link copied' : 'Opened in a new window'
  setTimeout(() => { shareNote.value = '' }, 2500)
}

function endChase() {
  if (confirm('End this chase? Its progress will be cleared.')) store.endChase()
}
</script>

<template>
  <div v-if="scene" class="h-full overflow-y-auto flex flex-col gap-3 pr-1">
    <!-- Header -->
    <div class="card p-3 flex flex-wrap items-center gap-3">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold truncate">{{ scene.name }}</h2>
        <div class="text-[0.6875rem] text-dim" :title="CHASE_TYPE_SUMMARIES[scene.type]">
          {{ CHASE_TYPE_LABELS[scene.type] }} · {{ scene.obstacles.length }} obstacles · a round is {{ scene.roundLength || 'not set' }}
        </div>
      </div>
      <div class="flex items-center gap-3 ml-auto">
        <div class="text-center">
          <div class="text-[0.5625rem] uppercase tracking-widest text-dim">Round</div>
          <div class="font-bold text-base">{{ roundText.replace('Round ', '') }}</div>
        </div>
        <div v-if="gapText" class="text-center">
          <div class="text-[0.5625rem] uppercase tracking-widest text-dim">Party</div>
          <div class="font-bold text-sm">{{ gapText }}</div>
        </div>
        <button class="btn-primary btn-sm" :disabled="!!scene.outcome || !!scene.pendingOutcome" title="Steady sides move, end conditions are checked, and the next round begins" @click="store.endRound()">End round</button>
        <button class="btn-secondary btn-sm" @click="openPlayerView">Player View</button>
        <span v-if="shareNote" class="text-[0.6875rem] text-success">{{ shareNote }}</span>
        <button class="btn-danger btn-sm" @click="endChase">End Chase</button>
      </div>
    </div>

    <!-- An end condition has been met -->
    <div v-if="scene.pendingOutcome" class="card p-3 border-l-3 border-l-warning bg-warning-subtle flex flex-wrap items-center gap-2">
      <span class="font-semibold">{{ scene.pendingOutcome.text }}</span>
      <span class="text-dim text-[0.75rem]">End the chase here?</span>
      <button class="btn-primary btn-xs ml-auto" @click="store.confirmOutcome()">Yes, it ends</button>
      <button class="btn-secondary btn-xs" title="Carry on with the chase" @click="store.continueAfterDismiss()">No, play on</button>
    </div>
    <div v-else-if="scene.outcome" class="card p-3 border-l-3 border-l-success bg-success-subtle flex flex-wrap items-center gap-2">
      <span class="font-semibold">Chase over.</span>
      <span>{{ scene.outcome.text }}</span>
      <button class="btn-secondary btn-xs ml-auto" title="Reopen the chase" @click="store.setOutcome(null)">Reopen</button>
    </div>

    <!-- Track -->
    <ChaseTrack :obstacles="trackObstacles" :sides="scene.sides" gm @toggle-reveal="toggleReveal" />

    <!-- Sides, in the order they act -->
    <div class="grid grid-cols-1 2xl:grid-cols-2 gap-3">
      <ChaseSideCard v-for="side in orderedSides" :key="side.id" :side="side" @add-vehicle="(id) => emit('add-vehicle', id)" />
    </div>

    <!-- Log -->
    <div class="card p-3">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">Log</h3>
        <label class="flex items-center gap-1 text-[0.6875rem] text-dim ml-auto"><input v-model="showGmLog" type="checkbox" /> show GM-only lines</label>
      </div>
      <ul class="flex flex-col gap-0.5 text-[0.75rem] max-h-48 overflow-y-auto">
        <li v-for="entry in logEntries" :key="entry.id" :class="{ 'text-dim': entry.gmOnly }">
          <span class="text-muted font-mono mr-1">R{{ entry.round }}</span>{{ entry.text }}<span v-if="entry.gmOnly" class="text-muted"> (GM only)</span>
        </li>
        <li v-if="logEntries.length === 0" class="text-dim">Nothing yet.</li>
      </ul>
    </div>
  </div>

  <div v-else class="h-full flex flex-col items-center justify-center text-center gap-3">
    <h2 class="text-xl font-semibold">No chase running</h2>
    <p class="text-dim text-sm max-w-md">Build a chase from obstacles, or pick a saved one from the sidebar, then start it to track Chase Points round by round.</p>
    <button class="btn-primary" @click="emit('open-builder')">Build a chase</button>
  </div>
</template>
