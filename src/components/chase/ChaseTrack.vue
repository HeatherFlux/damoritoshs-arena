<script setup lang="ts">
/**
 * The chase as a row of obstacle cards with a marker for each side.
 * Used by the GM tracker (everything face up, with a reveal toggle) and the player view
 * (unrevealed obstacles face down).
 */
import { computed } from 'vue'
import type { ChasePlayerObstacle, ChaseSideRole } from '../../types/chase'

export interface TrackObstacle extends ChasePlayerObstacle {
  id?: string
  /** GM view only: whether players can see this card. */
  shownToPlayers?: boolean
}

export interface TrackSide {
  id: string
  name: string
  role: ChaseSideRole
  isPlayers: boolean
  position: number
  chasePoints?: number
}

const props = defineProps<{
  obstacles: TrackObstacle[]
  sides: TrackSide[]
  gm?: boolean
  large?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-reveal', obstacle: TrackObstacle): void
}>()

const showStart = computed(() => props.sides.some(s => s.position < 0))

function sidesAt(position: number): TrackSide[] {
  return props.sides.filter(s => s.position === position)
}

function isCurrent(index: number): boolean {
  return props.sides.some(s => s.isPlayers && s.position === index)
}

function isBehind(index: number): boolean {
  const players = props.sides.find(s => s.isPlayers)
  return !!players && index < players.position
}

function progressFor(obstacle: TrackObstacle): { side: TrackSide; percent: number }[] {
  if (!obstacle.chasePoints) return []
  return sidesAt(obstacle.index)
    .filter(s => s.chasePoints !== undefined)
    .map(side => ({ side, percent: Math.min(100, ((side.chasePoints ?? 0) / obstacle.chasePoints!) * 100) }))
}
</script>

<template>
  <div class="chase-track" :class="{ 'chase-track-large': large }">
    <div v-if="showStart" class="track-pad">
      <span class="track-pad-label">Start</span>
      <div class="track-markers">
        <span v-for="s in sidesAt(-1)" :key="s.id" class="track-marker" :class="s.isPlayers ? 'marker-players' : 'marker-others'">{{ s.name }}</span>
      </div>
    </div>

    <div
      v-for="o in obstacles"
      :key="o.index"
      class="track-card"
      :class="{
        'track-card-current': isCurrent(o.index),
        'track-card-behind': isBehind(o.index),
        'track-card-facedown': !o.revealed,
      }"
    >
      <div class="track-card-head">
        <span class="track-card-number">{{ o.index + 1 }}</span>
        <template v-if="o.revealed">
          <span class="track-card-name">{{ o.name }}</span>
          <span class="badge-level track-card-level">Lvl {{ o.level }}</span>
        </template>
        <span v-else class="track-card-name text-dim">Unknown</span>
        <button
          v-if="gm"
          class="track-eye"
          :class="o.shownToPlayers ? 'text-success' : 'text-dim'"
          :title="o.shownToPlayers ? 'Players can see this obstacle. Click to turn it face down.' : 'Face down for players. Click to reveal it, as if scouted.'"
          @click="emit('toggle-reveal', o)"
        >{{ o.shownToPlayers ? 'shown' : 'hidden' }}</button>
      </div>

      <template v-if="o.revealed">
        <p v-if="o.description" class="track-card-text">{{ o.description }}</p>
        <ul class="track-options">
          <li v-for="(opt, i) in o.options" :key="i">
            <span v-if="opt.dc !== undefined" class="track-dc">DC {{ opt.dc }}</span>
            <span class="font-semibold">{{ opt.skills.join(' or ') || (opt.dc === undefined ? 'No check' : 'Check') }}</span>
            <span v-if="opt.description" class="text-dim"> to {{ opt.description }}</span>
          </li>
        </ul>
        <div class="track-points">
          <span class="text-dim">Chase Points</span>
          <span class="font-bold">{{ o.chasePoints }}</span>
        </div>
        <div v-for="p in progressFor(o)" :key="p.side.id" class="track-progress" :title="`${p.side.name}: ${p.side.chasePoints} of ${o.chasePoints}`">
          <div class="track-progress-fill" :class="p.side.isPlayers ? 'bg-accent' : 'bg-danger'" :style="{ width: p.percent + '%' }"></div>
          <span class="track-progress-text">{{ p.side.name }} {{ p.side.chasePoints }} / {{ o.chasePoints }}</span>
        </div>
      </template>
      <div v-else class="track-facedown-art">?</div>

      <div class="track-markers">
        <span v-for="s in sidesAt(o.index)" :key="s.id" class="track-marker" :class="s.isPlayers ? 'marker-players' : 'marker-others'">{{ s.name }}</span>
      </div>
    </div>

    <div class="track-pad">
      <span class="track-pad-label">Finish</span>
      <div class="track-markers">
        <span v-for="s in sidesAt(obstacles.length)" :key="s.id" class="track-marker" :class="s.isPlayers ? 'marker-players' : 'marker-others'">{{ s.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chase-track {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.125rem 0.75rem;
  align-items: stretch;
}

.track-card,
.track-pad {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cut-md)), calc(100% - var(--cut-md)) 100%, 0 100%);
}

.track-card {
  width: 15rem;
  font-size: 0.75rem;
}

.track-pad {
  width: 6rem;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elevated);
}

.track-pad-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-dim);
}

.track-card-current {
  border-color: var(--color-accent);
  box-shadow: inset 0 3px 0 var(--color-accent);
}

.track-card-behind {
  background: var(--color-bg-elevated);
  border-style: dashed;
}

.track-card-behind .track-card-number {
  background: var(--color-text-muted);
  color: var(--color-on-muted);
}

.track-card-facedown {
  background: var(--color-bg-elevated);
}

.track-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
}

.track-card-number {
  flex-shrink: 0;
  min-width: 1.375rem;
  padding: 0.0625rem 0.25rem;
  text-align: center;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.track-card-facedown .track-card-number {
  background: var(--color-text-muted);
  color: var(--color-on-muted);
}

.track-card-name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-size: 0.8125rem;
  line-height: 1.2;
}

.track-card-level {
  flex-shrink: 0;
  font-size: 0.5625rem;
  min-width: 0;
}

.track-eye {
  flex-shrink: 0;
  background: none;
  border: 1px solid currentColor;
  padding: 0 0.25rem;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.track-card-text {
  color: var(--color-text-dim);
  line-height: 1.35;
}

.track-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  line-height: 1.35;
}

.track-dc {
  display: inline-block;
  margin-right: 0.25rem;
  padding: 0 0.25rem;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-rollable);
}

.track-points {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.6875rem;
}

.track-progress {
  position: relative;
  height: 1.125rem;
  background: #050608;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.track-progress-fill {
  position: absolute;
  inset: 0;
  right: auto;
  transition: width 0.3s ease;
}

.track-progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

.track-facedown-art {
  flex: 1;
  min-height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
}

.track-markers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-height: 1.25rem;
}

.track-marker {
  padding: 0.0625rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.marker-players {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.marker-others {
  background: var(--color-danger);
  color: var(--color-on-danger);
}

/* Player view: bigger cards for a shared screen */
.chase-track-large .track-card {
  width: 18rem;
  font-size: 0.9375rem;
  padding: 0.875rem;
}

.chase-track-large .track-card-name {
  font-size: 1.0625rem;
}

.chase-track-large .track-marker {
  font-size: 0.8125rem;
  padding: 0.125rem 0.5rem;
}

.chase-track-large .track-pad {
  width: 8rem;
}

.chase-track-large .track-progress {
  height: 1.5rem;
}

.chase-track-large .track-progress-text {
  font-size: 0.8125rem;
}
</style>
