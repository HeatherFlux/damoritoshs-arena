<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { getRoleName, getRoleColor } from '../../data/starshipRoles'
import type { StarshipAction } from '../../types/starship'
import { normalizeObjective } from '../../types/starship'

const store = useStarshipStore()

// Local damage/heal entry for the ship. Player view runs with
// state.isGMView = false, so store.damageStarship / store.healStarship
// mutate the local activeScene snapshot only — broadcast() bails on the
// non-GM check so the GM's screen is unaffected. The next round-change /
// scene-update broadcast from the GM will overwrite local values, which
// is the agreed behavior (shield regen flows from GM).
const damageAmount = ref<number | null>(null)

function applyDamage() {
  const amt = damageAmount.value
  if (!amt || amt <= 0) return
  store.damageStarship(amt)
  damageAmount.value = null
}

function applyHeal() {
  const amt = damageAmount.value
  if (!amt || amt <= 0) return
  store.healStarship(amt)
  damageAmount.value = null
}

// Sync status — derived from store's WebSocket state
const syncStatus = computed(() => {
  if (store.state.isRemoteSyncEnabled) {
    return store.state.wsConnectionState === 'connected' ? 'connected' as const
      : store.state.wsConnectionState === 'connecting' ? 'connecting' as const
      : 'local-only' as const
  }
  // BroadcastChannel only (same device)
  return 'connected' as const
})

const statusLabel = computed(() => {
  if (store.state.isRemoteSyncEnabled) {
    switch (store.state.wsConnectionState) {
      case 'connected': return 'LIVE (REMOTE)'
      case 'connecting': return 'SYNC...'
      case 'error': return 'ERROR'
      default: return 'OFFLINE'
    }
  }
  return 'LIVE'
})

// Deduplicated unique role types from the scene's availableRoles
const uniqueRoles = computed(() => {
  if (!scene.value) return []
  const seen = new Set<string>()
  const roles: { id: string; name: string; color: string }[] = []
  for (const roleId of scene.value.availableRoles) {
    if (!seen.has(roleId)) {
      seen.add(roleId)
      roles.push({
        id: roleId,
        name: getRoleName(roleId),
        color: getRoleColor(roleId)
      })
    }
  }
  return roles
})

// Actions grouped by role
function getActionsForRole(roleId: string): StarshipAction[] {
  if (!scene.value) return []
  return scene.value.starshipActions.filter(action => {
    if (action.role === 'any') return true
    const allowedRoles = action.role.split('|')
    return allowedRoles.includes(roleId)
  })
}

// Count how many seats this role has
function getRoleCount(roleId: string): number {
  if (!scene.value) return 0
  return scene.value.availableRoles.filter(r => r === roleId).length
}

onMounted(async () => {
  store.setGMView(false)
  store.ensureChannel()

  // If URL indicates WebSocket sync, join the remote session
  if (store.hasRemoteSyncInUrl()) {
    const hash = window.location.hash
    const sessionMatch = hash.match(/[?&]session=([^&]+)/)
    if (sessionMatch) {
      await store.joinRemoteSession(sessionMatch[1])
    }
  }
})

onUnmounted(() => {
  store.disableRemoteSync()
})

// Computed values from active scene
const scene = computed(() => store.state.activeScene)
const starship = computed(() => scene.value?.starship)

// Filter objectives the GM has toggled hidden via the eye icon.
const visibleObjectives = computed(() => {
  return (scene.value?.additionalObjectives ?? [])
    .map(o => normalizeObjective(o))
    .filter(o => !o.hidden)
})

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
</script>

<template>
  <div class="player-layout">
    <div class="player-content">
      <!-- Ship Status -->
      <section v-if="starship" class="ship-section">
        <div class="ship-header">
          <h2 class="ship-name">{{ starship.name }}</h2>
          <div v-if="scene" class="round-badge">
            <span class="round-label">Round</span>
            <span class="round-number">{{ scene.currentRound }}</span>
          </div>
        </div>

        <!-- HP/Shield bars + damage/heal — combat-tab `hp-bar flex-1`
             pattern. One control row shared by both bars: damage cascades
             shields-then-hull via store.damageStarship; heal targets
             hull via store.healStarship. Local-only — does not sync to
             the GM (player-view broadcasts are no-ops). -->
        <div class="ship-stats-row">
          <div class="ship-bars">
            <div class="hp-bar ship-bar-shields">
              <div class="hp-bar-fill shield-fill" :style="{ width: shieldPercent + '%' }"></div>
              <div class="hp-bar-text">
                {{ starship.currentShields }}<span class="opacity-50">/</span>{{ starship.maxShields }} Shields
              </div>
            </div>
            <div class="hp-bar ship-bar-hull">
              <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
              <div class="hp-bar-text">
                {{ starship.currentHP }}<span class="opacity-50">/</span>{{ starship.maxHP }} Hull
              </div>
            </div>
          </div>
          <div class="hp-controls shrink-0">
            <button class="hp-btn hp-btn-damage" @click="applyDamage">−</button>
            <input
              v-model.number="damageAmount"
              type="number"
              class="hp-input"
              placeholder="0"
              @keydown.enter.exact="applyDamage"
              @keydown.enter.shift="applyHeal"
            />
            <button class="hp-btn hp-btn-heal" @click="applyHeal">+</button>
          </div>
        </div>

        <div class="ship-defenses">
          <div class="defense">
            <span class="defense-label">AC</span>
            <span class="defense-value">{{ starship.ac }}</span>
          </div>
          <div class="defense">
            <span class="defense-label">Fort</span>
            <span class="defense-value">+{{ starship.fortitude }}</span>
          </div>
          <div class="defense">
            <span class="defense-label">Ref</span>
            <span class="defense-value">+{{ starship.reflex }}</span>
          </div>
        </div>
      </section>

      <!-- No ship, waiting state -->
      <section v-else class="waiting-section">
        <div class="waiting-icon">[*]</div>
        <p>Waiting for GM to start a scene...</p>
      </section>

      <!-- Additional Objectives — filter out objectives the GM has
           toggled hidden via the eye icon. -->
      <section v-if="visibleObjectives.length > 0" class="objectives-section">
        <h3 class="section-title">Objectives</h3>
        <ul class="objectives-list">
          <li v-for="(obj, idx) in visibleObjectives" :key="idx" class="objective-item">
            {{ obj.text }}
          </li>
        </ul>
      </section>

      <!-- Role Action Cards -->
      <section v-if="uniqueRoles.length > 0" class="roles-section">
        <h3 class="section-title">Crew Roles &amp; Actions</h3>

        <div class="role-cards">
          <div
            v-for="role in uniqueRoles"
            :key="role.id"
            class="role-card"
            :style="{ borderColor: role.color }"
          >
            <div class="role-card-header" :style="{ color: role.color }">
              <span class="role-card-name">{{ role.name }}</span>
              <span v-if="getRoleCount(role.id) > 1" class="role-card-count">&times;{{ getRoleCount(role.id) }}</span>
            </div>

            <p v-if="scene?.roleDescriptions?.[role.id]" class="role-description">
              {{ scene.roleDescriptions[role.id] }}
            </p>

            <div class="role-card-actions">
              <div
                v-for="action in getActionsForRole(role.id)"
                :key="action.id"
                class="action-card"
              >
                <div class="action-card-header">
                  <span class="action-card-name">{{ action.name }}</span>
                  <span class="action-card-cost">{{ action.actionCost }}A</span>
                </div>
                <p class="action-card-desc">{{ action.description }}</p>
                <div v-if="action.outcomes" class="action-outcomes">
                  <div v-if="action.outcomes.criticalSuccess" class="outcome crit-success">
                    <span class="outcome-label">Crit</span>
                    <span class="outcome-text">{{ action.outcomes.criticalSuccess }}</span>
                  </div>
                  <div v-if="action.outcomes.success" class="outcome success">
                    <span class="outcome-label">Pass</span>
                    <span class="outcome-text">{{ action.outcomes.success }}</span>
                  </div>
                  <div v-if="action.outcomes.failure" class="outcome failure">
                    <span class="outcome-label">Fail</span>
                    <span class="outcome-text">{{ action.outcomes.failure }}</span>
                  </div>
                  <div v-if="action.outcomes.criticalFailure" class="outcome crit-failure">
                    <span class="outcome-label">Fumble</span>
                    <span class="outcome-text">{{ action.outcomes.criticalFailure }}</span>
                  </div>
                </div>
              </div>

              <div v-if="getActionsForRole(role.id).length === 0" class="no-actions">
                No scene-specific actions
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Sync Badge -->
    <div class="sync-badge" :class="'sync-' + syncStatus">
      <span class="sync-indicator"></span>
      <span class="sync-label">{{ statusLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.player-layout {
  position: fixed;
  inset: 0;
  background: var(--color-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.player-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* Ship Section */
.ship-section {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: 1.25rem;
}

.ship-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.ship-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.round-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.round-label {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Ship stats row: bars stack vertically on the left (combat hp-bar
   pattern with overlaid numbers), shared damage/heal controls on the
   right. The combat .hp-bar / .hp-bar-fill / .hp-bar-text /
   .hp-controls / .hp-btn / .hp-input classes are global (style.css). */
.ship-stats-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ship-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.shield-fill {
  background: var(--color-info);
}

.ship-defenses {
  display: flex;
  gap: 0.75rem;
}

.defense {
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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Waiting Section */
.waiting-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--color-text-dim);
}

.waiting-icon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 4rem;
  color: var(--color-accent);
  opacity: 0.4;
  margin-bottom: 1rem;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Objectives */
.objectives-section {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.objective-item {
  padding: 0.375rem 0.625rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-info);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text);
}

/* Role descriptions */
.role-description {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  line-height: 1.4;
  margin: 0 0 0.5rem 0;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-style: italic;
}

/* Roles Section */
.roles-section {
  flex: 1;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

/* Role Cards */
.role-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
}

.role-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.role-card-name {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-card-count {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.7;
}

.role-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Action Cards */
.action-card {
  padding: 0.625rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.action-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.action-card-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.action-card-cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-accent);
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
}

.action-card-desc {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  line-height: 1.4;
  margin: 0 0 0.375rem 0;
}

/* Outcomes */
.action-outcomes {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.outcome {
  display: flex;
  gap: 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.3;
}

.outcome-label {
  flex-shrink: 0;
  width: 3rem;
  font-weight: 700;
  text-transform: uppercase;
}

.outcome-text {
  color: var(--color-text-dim);
}

.outcome.crit-success .outcome-label {
  color: var(--color-success);
}

.outcome.success .outcome-label {
  color: var(--color-info);
}

.outcome.failure .outcome-label {
  color: var(--color-warning);
}

.outcome.crit-failure .outcome-label {
  color: var(--color-danger);
}

.no-actions {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-style: italic;
  padding: 0.375rem 0;
}

/* Sync Badge */
.sync-badge {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(5, 6, 8, 0.9);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  z-index: 101;
}

.sync-indicator {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
}

.sync-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.sync-connected .sync-indicator {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
  animation: sync-pulse 2s ease-in-out infinite;
}

.sync-connected .sync-label {
  color: var(--color-success);
}

.sync-connecting .sync-indicator {
  background: var(--color-warning);
  animation: sync-pulse-fast 1s ease-in-out infinite;
}

.sync-connecting .sync-label {
  color: var(--color-warning);
}

.sync-local-only .sync-indicator {
  background: var(--color-text-muted);
}

.sync-local-only .sync-label {
  color: var(--color-text-muted);
}

@keyframes sync-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--color-success); }
  50% { box-shadow: 0 0 10px var(--color-success); }
}

@keyframes sync-pulse-fast {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
