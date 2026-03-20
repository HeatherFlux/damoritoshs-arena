<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useCombatStore, type CombatPlayerData } from '../../stores/combatStore'

const combatStore = useCombatStore()
const remoteStatus = ref('')

onMounted(async () => {
  combatStore.setGMView(false)
  combatStore.ensureChannel()
  // Load state immediately from localStorage + request fresh state from GM (same-device)
  combatStore.requestStateFromGM()

  // If URL has ?sync=ws, attempt cross-device WebSocket connection
  if (combatStore.hasCombatRemoteSyncInUrl()) {
    const sessionId = combatStore.getCombatSessionFromUrl()
    if (sessionId) {
      remoteStatus.value = 'Connecting to GM...'
      const success = await combatStore.joinCombatRemoteSession(sessionId)
      remoteStatus.value = success ? 'Connected' : 'Connection failed — using local data'
      if (success) {
        // Clear status after a moment
        setTimeout(() => { remoteStatus.value = '' }, 3000)
      }
    }
  }
})

const data = computed((): CombatPlayerData | null => {
  return combatStore.playerViewData.value
})

const combatants = computed(() => data.value?.combatants ?? [])
const round = computed(() => data.value?.round ?? 0)
const turn = computed(() => data.value?.turn ?? 0)
const combatName = computed(() => data.value?.combatName ?? 'Combat')
const isActive = computed(() => data.value?.isActive ?? false)

const currentName = computed(() => {
  return combatants.value[turn.value]?.name ?? ''
})

const nextName = computed(() => {
  if (combatants.value.length <= 1) return ''
  const nextIndex = (turn.value + 1) % combatants.value.length
  return combatants.value[nextIndex]?.name ?? ''
})

</script>

<template>
  <div class="combat-player-view">
    <!-- Waiting state -->
    <div v-if="!data || !isActive" class="waiting">
      <div class="waiting-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
        </svg>
      </div>
      <h1 class="waiting-title">COMBAT TRACKER</h1>
      <p class="waiting-sub">Waiting for GM to start combat...</p>
      <p class="waiting-hint">This view syncs automatically with the GM's combat tracker.</p>
      <p v-if="remoteStatus" class="waiting-hint" style="color: #6366f1; margin-top: 0.5rem;">{{ remoteStatus }}</p>
    </div>

    <!-- Active combat -->
    <div v-else class="combat-active">
      <!-- Header -->
      <header class="combat-header">
        <div class="header-left">
          <h1 class="combat-title">{{ combatName }}</h1>
          <div class="round-badge">ROUND {{ round }}</div>
        </div>
        <div class="header-right">
          <div class="up-next" v-if="nextName">
            <span class="up-next-label">UP NEXT</span>
            <span class="up-next-name">{{ nextName }}</span>
          </div>
        </div>
      </header>

      <!-- Initiative List -->
      <div class="initiative-list">
        <div
          v-for="(combatant, index) in combatants"
          :key="index"
          class="initiative-row"
          :class="{
            'initiative-current': index === turn,
            'initiative-dead': combatant.isDead,
            'initiative-player': combatant.isPlayer,
          }"
        >
          <div class="init-indicator">
            <div v-if="index === turn" class="current-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
              </svg>
            </div>
            <div v-else class="init-dot" :class="{ 'init-dot-dead': combatant.isDead }"></div>
          </div>

          <div class="init-name">
            <span class="name-text" :class="{ 'name-dead': combatant.isDead }">
              {{ combatant.name }}
            </span>
            <span v-if="combatant.isDead" class="dead-tag">DEFEATED</span>
          </div>

          <div class="init-conditions" v-if="combatant.conditions.length > 0">
            <span
              v-for="(cond, ci) in combatant.conditions"
              :key="ci"
              class="condition-tag"
            >
              {{ cond.value ? `${cond.name} ${cond.value}` : cond.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Current Turn Banner -->
      <div class="current-banner" v-if="currentName">
        <span class="banner-label">CURRENT TURN</span>
        <span class="banner-name">{{ currentName }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.combat-player-view {
  width: 100vw;
  height: 100vh;
  background: #0a0a0f;
  color: #e0e0e8;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Waiting State */
.waiting {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  opacity: 0.6;
}

.waiting-icon {
  color: #6366f1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.waiting-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.waiting-sub {
  font-size: 1rem;
  color: #888;
}

.waiting-hint {
  font-size: 0.75rem;
  color: #555;
  max-width: 400px;
  text-align: center;
}

/* Active Combat */
.combat-active {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #1e1e2e;
  background: linear-gradient(180deg, #12121a 0%, #0a0a0f 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.combat-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.round-badge {
  background: #6366f1;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.header-right {
  display: flex;
  align-items: center;
}

.up-next {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.up-next-label {
  font-size: 0.625rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.up-next-name {
  font-size: 1rem;
  color: #888;
  font-weight: 500;
}

/* Initiative List */
.initiative-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.initiative-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.initiative-current {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
}

.initiative-dead {
  opacity: 0.35;
}

.initiative-player {
  /* Subtle distinction for player characters */
}

.init-indicator {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.current-arrow {
  color: #6366f1;
  animation: arrow-pulse 1.5s ease-in-out infinite;
}

@keyframes arrow-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.init-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #444;
}

.init-dot-dead {
  background: #dc2626;
  opacity: 0.5;
}

.init-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.name-text {
  font-size: 1.125rem;
  font-weight: 500;
}

.initiative-current .name-text {
  font-weight: 700;
  color: white;
  font-size: 1.25rem;
}

.name-dead {
  text-decoration: line-through;
  color: #666;
}

.dead-tag {
  font-size: 0.625rem;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.15);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.init-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.condition-tag {
  font-size: 0.75rem;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  text-transform: capitalize;
  font-weight: 500;
}

/* Current Turn Banner */
.current-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
  border-top: 2px solid #1e1e2e;
}

.banner-label {
  font-size: 0.75rem;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 600;
}

.banner-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: 0.05em;
}
</style>
