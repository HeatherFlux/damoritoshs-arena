<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import ThreatCard from './ThreatCard.vue'

const store = useStarshipStore()

const scene = computed(() => store.state.activeScene)
const starship = computed(() => scene.value?.starship)

// Quick damage input
const damageAmount = ref(0)

// HP percentage for bar
const hpPercent = computed(() => {
  if (!starship.value) return 100
  return Math.round((starship.value.currentHP / starship.value.maxHP) * 100)
})

const shieldPercent = computed(() => {
  if (!starship.value) return 100
  return Math.round((starship.value.currentShields / starship.value.maxShields) * 100)
})

const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

// Victory condition status
const victoryStatus = computed(() => {
  if (!scene.value) return null

  switch (scene.value.victoryCondition) {
    case 'defeat': {
      const remaining = scene.value.threats.filter(t => !t.isDefeated).length
      const total = scene.value.threats.length
      return {
        label: 'Threats Remaining',
        current: remaining,
        target: 0,
        display: `${remaining} / ${total} active`
      }
    }
    case 'victory_points': {
      const current = scene.value.currentVP
      const target = scene.value.vpRequired || 10
      return {
        label: 'Victory Points',
        current,
        target,
        display: `${current} / ${target} VP`
      }
    }
    case 'survival': {
      const current = scene.value.currentRound
      const target = scene.value.survivalRounds || 5
      return {
        label: 'Rounds Survived',
        current,
        target,
        display: `Round ${current} / ${target}`
      }
    }
    case 'escape':
      return {
        label: 'Objective',
        current: 0,
        target: 1,
        display: 'Escape the encounter'
      }
    case 'custom':
      return {
        label: 'Custom Objective',
        current: 0,
        target: 1,
        display: scene.value.customCondition || 'Complete the objective'
      }
    default:
      return null
  }
})

const isVictory = computed(() => {
  if (!scene.value || !victoryStatus.value) return false

  switch (scene.value.victoryCondition) {
    case 'defeat':
      return scene.value.threats.every(t => t.isDefeated)
    case 'victory_points':
      return scene.value.currentVP >= (scene.value.vpRequired || 10)
    case 'survival':
      return scene.value.currentRound > (scene.value.survivalRounds || 5)
    default:
      return false
  }
})

// Actions
function nextRound() {
  store.advanceRound()
}

function addVP(amount: number) {
  store.addVP(amount)
}

function applyDamage() {
  if (damageAmount.value > 0) {
    store.damageStarship(damageAmount.value)
    damageAmount.value = 0
  }
}

function healShip(amount: number) {
  store.healStarship(amount)
}

function setShields(amount: number) {
  const current = starship.value?.currentShields || 0
  store.setShields(current + amount)
}

function damageThreat(threatId: string, amount: number) {
  store.damageThreat(threatId, amount)
}

function healThreat(threatId: string, amount: number) {
  store.updateThreat(threatId, {
    currentHP: Math.min(
      (scene.value?.threats.find(t => t.id === threatId)?.maxHP || 0),
      (scene.value?.threats.find(t => t.id === threatId)?.currentHP || 0) + amount
    )
  })
}

function toggleThreatDefeated(threatId: string) {
  const threat = scene.value?.threats.find(t => t.id === threatId)
  if (threat) {
    store.updateThreat(threatId, { isDefeated: !threat.isDefeated })
  }
}

function endScene() {
  if (confirm('End this scene?')) {
    store.endScene()
  }
}
</script>

<template>
  <div v-if="scene && starship" class="scene-runner">
    <!-- Scene Header -->
    <div class="scene-header panel">
      <div class="scene-info">
        <h2 class="scene-name">{{ scene.name }}</h2>
        <span class="scene-level">Level {{ scene.level }}</span>
      </div>

      <div class="round-tracker">
        <span class="round-label">Round</span>
        <span class="round-number">{{ scene.currentRound }}</span>
        <button class="btn btn-primary btn-sm" @click="nextRound">Next Round</button>
      </div>
    </div>

    <div class="runner-content">
      <!-- Left Column: Ship Status -->
      <div class="ship-column">
        <!-- Ship Status Card -->
        <div class="ship-card panel">
          <h3 class="card-title">{{ starship.name }}</h3>

          <!-- HP -->
          <div class="stat-section">
            <div class="stat-header">
              <span class="stat-label">Hull Points</span>
              <span class="stat-value">{{ starship.currentHP }} / {{ starship.maxHP }}</span>
            </div>
            <div class="stat-bar-container">
              <div
                class="stat-bar"
                :style="{ width: hpPercent + '%', background: hpColor }"
              ></div>
            </div>
            <div class="stat-controls">
              <button class="stat-btn" @click="healShip(5)">+5 HP</button>
              <button class="stat-btn" @click="healShip(10)">+10 HP</button>
            </div>
          </div>

          <!-- Shields -->
          <div class="stat-section">
            <div class="stat-header">
              <span class="stat-label">Shields</span>
              <span class="stat-value">{{ starship.currentShields }} / {{ starship.maxShields }}</span>
            </div>
            <div class="stat-bar-container shields">
              <div
                class="stat-bar"
                :style="{ width: shieldPercent + '%' }"
              ></div>
            </div>
            <div class="stat-controls">
              <button class="stat-btn" @click="setShields(-5)">-5</button>
              <button class="stat-btn" @click="setShields(5)">+5</button>
              <button class="stat-btn regen" @click="store.regenerateShields()">Regen (+{{ starship.shieldRegen }})</button>
            </div>
          </div>

          <!-- Quick Damage -->
          <div class="damage-section">
            <span class="damage-label">Apply Damage</span>
            <div class="damage-input-row">
              <input
                type="number"
                class="input damage-input"
                v-model.number="damageAmount"
                min="0"
                placeholder="0"
                @keyup.enter="applyDamage"
              />
              <button class="btn btn-danger" @click="applyDamage">Damage</button>
            </div>
          </div>

          <!-- Defenses -->
          <div class="defense-stats">
            <div class="defense-stat">
              <span class="defense-label">AC</span>
              <span class="defense-value">{{ starship.ac }}</span>
            </div>
            <div class="defense-stat">
              <span class="defense-label">Fort</span>
              <span class="defense-value">{{ starship.fortitude }}</span>
            </div>
            <div class="defense-stat">
              <span class="defense-label">Ref</span>
              <span class="defense-value">{{ starship.reflex }}</span>
            </div>
          </div>
        </div>

        <!-- Victory Condition Card -->
        <div class="victory-card panel" :class="{ victory: isVictory }">
          <h3 class="card-title">{{ victoryStatus?.label }}</h3>
          <div class="victory-display">{{ victoryStatus?.display }}</div>

          <div v-if="scene.victoryCondition === 'victory_points'" class="vp-controls">
            <button class="btn btn-secondary btn-sm" @click="addVP(-1)">-1 VP</button>
            <button class="btn btn-primary btn-sm" @click="addVP(1)">+1 VP</button>
            <button class="btn btn-primary btn-sm" @click="addVP(2)">+2 VP</button>
          </div>

          <div v-if="isVictory" class="victory-message">
            VICTORY!
          </div>
        </div>
      </div>

      <!-- Right Column: Threats -->
      <div class="threats-column">
        <div class="threats-header">
          <h3 class="threats-title">Threats</h3>
          <span class="threats-count">
            {{ scene.threats.filter(t => !t.isDefeated).length }} / {{ scene.threats.length }} active
          </span>
        </div>

        <div class="threats-list">
          <ThreatCard
            v-for="threat in scene.threats"
            :key="threat.id"
            :threat="threat"
            @damage="(amt) => damageThreat(threat.id, amt)"
            @heal="(amt) => healThreat(threat.id, amt)"
            @toggle-defeated="toggleThreatDefeated(threat.id)"
          />
        </div>
      </div>
    </div>

    <!-- Scene Description -->
    <div v-if="scene.description" class="scene-description panel">
      <h4>Scene Description</h4>
      <p>{{ scene.description }}</p>
    </div>

    <!-- End Scene Button -->
    <div class="scene-actions">
      <button class="btn btn-danger" @click="endScene">End Scene</button>
    </div>
  </div>
</template>

<style scoped>
.scene-runner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

/* Scene Header */
.scene-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.scene-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.scene-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-accent);
}

.scene-level {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-tracker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.round-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  min-width: 2rem;
  text-align: center;
}

/* Content Layout */
.runner-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .runner-content {
    flex-direction: row;
  }
}

.ship-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .ship-column {
    flex: 0 0 350px;
  }
}

.threats-column {
  flex: 1;
  min-width: 0;
}

/* Ship Card */
.ship-card {
  padding: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-section {
  margin-bottom: 1rem;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.stat-bar-container {
  height: 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.stat-bar-container.shields .stat-bar {
  background: var(--color-info);
}

.stat-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.stat-controls {
  display: flex;
  gap: 0.375rem;
}

.stat-btn {
  flex: 1;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stat-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.stat-btn.regen {
  flex: 2;
}

/* Damage Section */
.damage-section {
  padding: 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
}

.damage-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-danger);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.damage-input-row {
  display: flex;
  gap: 0.5rem;
}

.damage-input {
  flex: 1;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
}

.btn-danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

/* Defense Stats */
.defense-stats {
  display: flex;
  gap: 0.5rem;
}

.defense-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.defense-label {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.defense-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Victory Card */
.victory-card {
  padding: 1rem;
  text-align: center;
}

.victory-card.victory {
  border-color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
}

.victory-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.vp-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.victory-message {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: var(--color-success);
  color: white;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: var(--radius-sm);
}

/* Threats */
.threats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.threats-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.threats-count {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.threats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Scene Description */
.scene-description {
  padding: 1rem;
}

.scene-description h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.scene-description p {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Scene Actions */
.scene-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* Input */
.input {
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Hide number input spinners */
.input[type="number"]::-webkit-inner-spin-button,
.input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}
</style>
