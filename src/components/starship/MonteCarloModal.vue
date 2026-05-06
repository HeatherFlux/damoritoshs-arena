<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SavedScene, StarshipScene } from '../../types/starship'
import { simulateScene, type SimSummary, type SimOutcome } from '../../utils/simulateScene'

// Accept either the running StarshipScene or a saved template — both
// expose the same fields the simulator needs.
const props = defineProps<{
  scene: SavedScene | StarshipScene
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Tunables — sensible defaults derived from the scene.
const iterations = ref(1000)
const crewBonus = ref<number>(props.scene.level + 6)
const gunnerBonus = ref<number>(props.scene.level + 8)
const roundCap = ref(20)

const summary = ref<SimSummary | null>(null)
const running = ref(false)

const outcomeLabels: Record<SimOutcome, string> = {
  victory_vp: 'Victory — VP target hit',
  victory_defeat: 'Victory — all threats down',
  victory_survival: 'Victory — survived rounds',
  defeat_ship_destroyed: 'Defeat — ship destroyed',
  stalled: 'Stalled (round cap reached)',
}

const outcomeColors: Record<SimOutcome, string> = {
  victory_vp: 'var(--color-success)',
  victory_defeat: 'var(--color-success)',
  victory_survival: 'var(--color-success)',
  defeat_ship_destroyed: 'var(--color-danger)',
  stalled: 'var(--color-text-dim)',
}

function run() {
  running.value = true
  // Slight defer so the spinner renders before the heavy loop runs.
  setTimeout(() => {
    summary.value = simulateScene(props.scene as SavedScene, {
      iterations: iterations.value,
      crewBonus: crewBonus.value,
      gunnerBonus: gunnerBonus.value,
      roundCap: roundCap.value,
    })
    running.value = false
  }, 30)
}

const sortedOutcomes = computed(() => {
  if (!summary.value) return []
  // Show outcomes in a predictable order, biggest bucket first (any victory > defeat > stalled).
  const order: SimOutcome[] = [
    'victory_vp', 'victory_defeat', 'victory_survival',
    'defeat_ship_destroyed', 'stalled',
  ]
  return order
    .map(k => ({ key: k, count: summary.value!.outcomes[k], pct: summary.value!.outcomePercents[k] }))
    .filter(o => o.count > 0)
})

const tuningHint = computed(() => {
  if (!summary.value) return ''
  const s = summary.value
  if (s.survivalRate < 50) {
    return 'Most runs end in defeat — consider lowering threat damage / attack bonus, or buffing ship HP/shields.'
  }
  if (s.outcomePercents.stalled > 25) {
    return 'A quarter+ of runs stall out — consider making the win condition reachable sooner (lower VP target, or fewer threat HP).'
  }
  if (s.outcomePercents.defeat_ship_destroyed < 5 && s.medianRounds < 4) {
    return 'Scene resolves in under 4 rounds with almost no risk — could be too easy. Consider buffing threats.'
  }
  if (s.outcomePercents.defeat_ship_destroyed > 15 && s.outcomePercents.defeat_ship_destroyed < 30) {
    return 'A meaningful risk of defeat (15-30%) — feels like a good cinematic tension level.'
  }
  return 'Balanced. Survival rate ' + s.survivalRate + '% across ' + s.iterations + ' runs.'
})
</script>

<template>
  <div class="mc-overlay" @click.self="emit('close')">
    <div class="mc-modal">
      <div class="mc-header">
        <h2>Monte Carlo Preview — {{ scene.name }}</h2>
        <button class="mc-close" @click="emit('close')">&times;</button>
      </div>

      <p class="mc-blurb">
        Runs the scene many times with averaged crew rolls to estimate how
        often it ends in victory vs defeat. Use this as a tuning aid before
        the table sees it. Threat attacks and damage are simulated; crew
        attacks assume the bonus you set below.
      </p>

      <div class="mc-controls">
        <label class="mc-field">
          <span>Iterations</span>
          <input v-model.number="iterations" type="number" min="50" max="5000" step="50" />
        </label>
        <label class="mc-field" :title="`Avg PC skill modifier for non-attack rolls. Default ${scene.level + 6} ≈ trained at scene level.`">
          <span>Crew bonus</span>
          <input v-model.number="crewBonus" type="number" />
        </label>
        <label class="mc-field" :title="`Avg gunner attack bonus. Default ${scene.level + 8} ≈ trained gunner with weapon proficiency.`">
          <span>Gunner bonus</span>
          <input v-model.number="gunnerBonus" type="number" />
        </label>
        <label class="mc-field">
          <span>Round cap</span>
          <input v-model.number="roundCap" type="number" min="5" max="50" />
        </label>
        <button class="btn btn-primary" :disabled="running" @click="run">
          {{ running ? 'Simulating...' : 'Run Simulation' }}
        </button>
      </div>

      <div v-if="summary" class="mc-results">
        <!-- Outcome distribution bars -->
        <div class="mc-outcomes">
          <div v-for="o in sortedOutcomes" :key="o.key" class="mc-outcome-row">
            <span class="mc-outcome-label">{{ outcomeLabels[o.key] }}</span>
            <div class="mc-bar-track">
              <div
                class="mc-bar-fill"
                :style="{ width: o.pct + '%', background: outcomeColors[o.key] }"
              ></div>
              <span class="mc-bar-value">{{ o.count }} ({{ o.pct.toFixed(1) }}%)</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="mc-stats">
          <div class="mc-stat">
            <span class="mc-stat-label">Survival rate</span>
            <span class="mc-stat-value">{{ summary.survivalRate }}%</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-label">Median rounds</span>
            <span class="mc-stat-value">{{ summary.medianRounds }}</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-label">Mean rounds</span>
            <span class="mc-stat-value">{{ summary.meanRounds }}</span>
          </div>
          <div class="mc-stat">
            <span class="mc-stat-label">Median ending HP</span>
            <span class="mc-stat-value">{{ summary.medianEndingShipHP }}</span>
          </div>
        </div>

        <p class="mc-hint">{{ tuningHint }}</p>
      </div>

      <div v-else-if="!running" class="mc-empty">
        <em>Click "Run Simulation" to model {{ iterations }} runs of this scene.</em>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.mc-modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
}

.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.mc-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mc-close {
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.mc-blurb {
  font-size: 0.8125rem;
  color: var(--color-text-dim);
  margin: 0.5rem 0 1rem;
  line-height: 1.5;
}

.mc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
}

.mc-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.mc-field input {
  padding: 0.25rem 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  width: 80px;
  text-transform: none;
  letter-spacing: 0;
}

.mc-results {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.mc-outcomes {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.mc-outcome-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.mc-outcome-label {
  color: var(--color-text-dim);
}

.mc-bar-track {
  position: relative;
  height: 18px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.mc-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.mc-bar-value {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text);
  text-shadow: 0 0 3px var(--color-bg);
}

.mc-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
}

.mc-stat {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.mc-stat-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.mc-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.mc-hint {
  margin: 0;
  padding: 0.5rem 0.625rem;
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg));
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text);
}

.mc-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.875rem;
}
</style>
