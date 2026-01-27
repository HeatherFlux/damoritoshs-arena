<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { STARSHIP_ROLES } from '../../data/starshipRoles'
import type { StarshipRole } from '../../types/starship'
import RoleCard from './RoleCard.vue'

const store = useStarshipStore()

// Sync status
type SyncStatus = 'connecting' | 'connected' | 'local-only'
const syncStatus = ref<SyncStatus>('connecting')

const statusLabel = computed(() => {
  switch (syncStatus.value) {
    case 'connected': return 'LIVE'
    case 'connecting': return 'SYNC...'
    default: return 'SNAPSHOT'
  }
})

// Role deck loaded from localStorage
interface RoleInstance {
  instanceId: string
  role: StarshipRole
}
const roleDeck = ref<RoleInstance[]>([])
const expandedRoleId = ref<string | null>(null)

function loadRoleDeck() {
  const allRoles = [...STARSHIP_ROLES, ...store.state.customRoles]
  const saved = localStorage.getItem('sf2e-role-deck')
  if (!saved) {
    roleDeck.value = []
    return
  }

  try {
    const parsed = JSON.parse(saved) as { instanceId: string; roleId: string }[]
    roleDeck.value = parsed
      .map(item => {
        const role = allRoles.find(r => r.id === item.roleId)
        if (!role) return null
        return { instanceId: item.instanceId, role }
      })
      .filter((item): item is RoleInstance => item !== null)
  } catch (e) {
    console.warn('Failed to load role deck:', e)
    roleDeck.value = []
  }
}

function toggleRole(instanceId: string) {
  if (expandedRoleId.value === instanceId) {
    expandedRoleId.value = null
  } else {
    expandedRoleId.value = instanceId
  }
}

// Listen for storage changes (when GM updates the deck)
function handleStorageChange(e: StorageEvent) {
  if (e.key === 'sf2e-role-deck') {
    loadRoleDeck()
  }
}

onMounted(() => {
  store.setGMView(false)
  store.ensureChannel()
  loadRoleDeck()
  window.addEventListener('storage', handleStorageChange)
  syncStatus.value = 'connected'
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})

// Reload when custom roles change
watch(() => store.state.customRoles, () => {
  loadRoleDeck()
}, { deep: true })

// Computed values from active scene
const scene = computed(() => store.state.activeScene)
const starship = computed(() => scene.value?.starship)

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

        <div class="ship-bars">
          <!-- Shields -->
          <div class="bar-group">
            <div class="bar-header">
              <span class="bar-label">Shields</span>
              <span class="bar-numbers">{{ starship.currentShields }} / {{ starship.maxShields }}</span>
            </div>
            <div class="bar-track">
              <div
                class="bar-fill shields"
                :style="{ width: shieldPercent + '%' }"
              ></div>
            </div>
          </div>

          <!-- Hull -->
          <div class="bar-group">
            <div class="bar-header">
              <span class="bar-label">Hull</span>
              <span class="bar-numbers">{{ starship.currentHP }} / {{ starship.maxHP }}</span>
            </div>
            <div class="bar-track">
              <div
                class="bar-fill hull"
                :style="{ width: hpPercent + '%', background: hpColor }"
              ></div>
            </div>
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

      <!-- Roles Section -->
      <section class="roles-section">
        <h3 class="section-title">Crew Roles</h3>

        <div v-if="roleDeck.length === 0" class="no-roles">
          No roles assigned yet.
        </div>

        <div v-else class="role-list">
          <div
            v-for="instance in roleDeck"
            :key="instance.instanceId"
            class="role-item"
            :class="{ expanded: expandedRoleId === instance.instanceId }"
          >
            <button
              class="role-button"
              @click="toggleRole(instance.instanceId)"
            >
              <span class="role-name">{{ instance.role.name }}</span>
              <span class="role-skills">{{ instance.role.primarySkills.join(', ') }}</span>
              <span class="expand-icon">{{ expandedRoleId === instance.instanceId ? '▼' : '▶' }}</span>
            </button>

            <div v-if="expandedRoleId === instance.instanceId" class="role-card-wrapper">
              <RoleCard :role="instance.role" :show-actions="true" />
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

.ship-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.bar-label {
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.bar-numbers {
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text);
}

.bar-track {
  height: 1.25rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.bar-fill.shields {
  background: var(--color-info);
}

.bar-fill.hull {
  background: var(--color-success);
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

.no-roles {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-dim);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-item {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.role-item.expanded {
  border-color: var(--color-accent);
}

.role-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.role-button:hover {
  background: var(--color-bg-hover);
}

.role-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.role-skills {
  flex: 1;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.expand-icon {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.role-card-wrapper {
  padding: 0 0.75rem 0.75rem;
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
