<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { CHASE_TYPE_LABELS } from '../../utils/chaseRules'
import ChaseTrack from './ChaseTrack.vue'

const store = useChaseStore()

const data = computed(() => store.state.playerData)
const party = computed(() => data.value?.sides.find(s => s.isPlayers) ?? null)
const others = computed(() => data.value?.sides.filter(s => !s.isPlayers) ?? [])

const roundText = computed(() => {
  const d = data.value
  if (!d) return ''
  return d.roundLimit !== null ? `${d.round} of ${d.roundLimit}` : String(d.round)
})

function gapText(position: number): string {
  if (!party.value) return ''
  const gap = party.value.position - position
  if (gap === 0) return 'right with you'
  const n = Math.abs(gap)
  return `${n} obstacle${n === 1 ? '' : 's'} ${gap > 0 ? 'behind you' : 'ahead of you'}`
}

const CONDITION_LABELS = { intact: 'Intact', damaged: 'Damaged', broken: 'Broken', destroyed: 'Destroyed' } as const

function onHashChange() {
  window.location.reload()
}

onMounted(() => {
  store.setGMView(false)
  store.ensureChannel()
  if (store.hasRemoteSyncInUrl()) store.joinRemoteSession(store.state.sessionId)
  store.requestStateFromGM()
  window.addEventListener('hashchange', onHashChange)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})
</script>

<template>
  <div class="chase-view">
    <template v-if="data">
      <header class="view-header">
        <div>
          <h1 class="view-title">{{ data.name }}</h1>
          <div class="view-subtitle">{{ CHASE_TYPE_LABELS[data.type] }}<span v-if="data.roundLength"> · a round is {{ data.roundLength }}</span></div>
        </div>
        <div class="view-round">
          <span class="view-round-label">Round</span>
          <span class="view-round-value">{{ roundText }}</span>
        </div>
      </header>

      <div v-if="data.outcome" class="view-outcome">{{ data.outcome.text }}</div>

      <section class="view-section">
        <ChaseTrack :obstacles="data.obstacles" :sides="data.sides" large />
      </section>

      <div class="view-columns">
        <section v-if="party" class="view-section">
          <h2 class="view-heading">{{ party.name }}</h2>
          <ul v-if="party.members.length" class="view-members">
            <li v-for="m in party.members" :key="m.name" :class="{ 'view-member-acted': m.hasActed }">
              <span>{{ m.name }}</span>
              <span class="view-member-state">{{ m.hasActed ? 'acted' : 'ready' }}</span>
            </li>
          </ul>
          <div v-for="v in party.vehicles" :key="v.label" class="view-vehicle">
            <div class="view-vehicle-head">
              <span class="font-semibold">{{ v.label }}</span>
              <span class="view-chip" :class="`chip-${v.condition}`">{{ CONDITION_LABELS[v.condition] }}</span>
              <span v-if="v.uncontrolled" class="view-chip chip-broken">Uncontrolled</span>
            </div>
            <div v-if="v.maxHP" class="hp-bar">
              <div class="hp-bar-fill" :style="{ width: Math.max(0, ((v.currentHP ?? 0) / v.maxHP) * 100) + '%', background: v.condition === 'intact' ? 'var(--color-success)' : v.condition === 'damaged' ? 'var(--color-warning)' : 'var(--color-danger)' }"></div>
              <div class="hp-bar-text">{{ v.currentHP }}<span class="opacity-50">/</span>{{ v.maxHP }} HP</div>
            </div>
            <div v-if="v.pilotName" class="view-dim">Pilot: {{ v.pilotName }}</div>
          </div>
        </section>

        <section v-for="side in others" :key="side.id" class="view-section">
          <h2 class="view-heading">{{ side.name }}</h2>
          <p class="view-gap">{{ gapText(side.position) }}</p>
          <div v-for="v in side.vehicles" :key="v.label" class="view-vehicle">
            <div class="view-vehicle-head">
              <span class="font-semibold">{{ v.label }}</span>
              <span class="view-chip" :class="`chip-${v.condition}`">{{ CONDITION_LABELS[v.condition] }}</span>
              <span v-if="v.uncontrolled" class="view-chip chip-broken">Uncontrolled</span>
            </div>
          </div>
        </section>

        <section class="view-section">
          <h2 class="view-heading">What just happened</h2>
          <ul class="view-log">
            <li v-for="entry in [...data.log].reverse()" :key="entry.id">
              <span class="view-dim font-mono">R{{ entry.round }}</span> {{ entry.text }}
            </li>
            <li v-if="data.log.length === 0" class="view-dim">Nothing yet.</li>
          </ul>
        </section>
      </div>
    </template>

    <div v-else class="view-waiting">
      <h1 class="view-title">Waiting for the chase</h1>
      <p class="view-dim">This screen fills in when the GM starts a chase.</p>
    </div>
  </div>
</template>

<style scoped>
.chase-view {
  min-height: 100vh;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--color-bg);
  color: var(--color-text);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
}

.view-title { font-size: 1.75rem; font-weight: 700; letter-spacing: 0.03em; }
.view-subtitle { font-size: 0.875rem; color: var(--color-text-dim); text-transform: uppercase; letter-spacing: 0.08em; }
.view-round { display: flex; flex-direction: column; align-items: center; padding: 0.375rem 1rem; background: var(--color-accent); color: var(--color-on-accent); }
.view-round-label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.view-round-value { font-size: 1.5rem; font-weight: 700; font-family: var(--font-mono); line-height: 1.1; }

.view-outcome {
  padding: 1rem;
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  background: var(--color-success);
  color: var(--color-on-success);
}

.view-section {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  min-width: 0;
}

.view-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; }
.view-heading { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-accent); }
.view-gap { font-size: 1.25rem; font-weight: 700; }
.view-dim { color: var(--color-text-dim); font-size: 0.875rem; }

.view-members { display: flex; flex-direction: column; gap: 0.25rem; }
.view-members li { display: flex; justify-content: space-between; padding: 0.375rem 0.5rem; background: var(--color-bg-elevated); font-weight: 600; }
.view-member-state { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-success); }
.view-member-acted { opacity: 0.6; }
.view-member-acted .view-member-state { color: var(--color-text-dim); }

.view-vehicle { display: flex; flex-direction: column; gap: 0.375rem; padding: 0.5rem; background: var(--color-bg-elevated); }
.view-vehicle-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.view-chip { padding: 0.0625rem 0.375rem; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.chip-intact { background: var(--color-success); color: var(--color-on-success); }
.chip-damaged { background: var(--color-warning); color: var(--color-on-warning); }
.chip-broken, .chip-destroyed { background: var(--color-danger); color: var(--color-on-danger); }

.view-log { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9375rem; }
.view-waiting { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; }
</style>
