<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useCombatStore } from '../stores/combatStore'
import { useEncounterStore } from '../stores/encounterStore'
import { useHackingStore } from '../stores/hackingStore'
import { useCustomPanelStore } from '../stores/customPanelStore'
import { getRollHistory, onRoll, type RollResult } from '../utils/dice'

const props = defineProps<{
  mode: 'builder' | 'combat' | 'hacking' | 'starship' | 'custom'
}>()

const combatStore = useCombatStore()
const encounterStore = useEncounterStore()
const hackingStore = useHackingStore()
const customPanelStore = useCustomPanelStore()

// Hacking sync status
const hackingSyncEnabled = computed(() => hackingStore.state.isRemoteSyncEnabled)
const hackingSyncState = computed(() => hackingStore.state.wsConnectionState)

// Hacking computer stats
const hackingComputer = computed(() => hackingStore.state.computer)
const hackingStats = computed(() => {
  const computer = hackingStore.state.computer
  if (!computer) return null
  const totalNodes = computer.accessPoints.length
  const breachedNodes = computer.accessPoints.filter(ap => ap.state === 'breached').length
  const alarmedNodes = computer.accessPoints.filter(ap => ap.state === 'alarmed').length
  return { totalNodes, breachedNodes, alarmedNodes }
})

const combat = computed(() => combatStore.state.combat)
const currentCombatant = computed(() => combatStore.currentCombatant.value)
const nextCombatant = computed(() => combatStore.nextCombatant.value)
const aliveCombatants = computed(() => combatStore.aliveCombatants.value)
const activeEncounter = computed(() => encounterStore.activeEncounter.value)

// Calculate party HP status for combat
const hpStatus = computed(() => {
  if (!combat.value) return null
  const combatants = combat.value.combatants
  const totalCurrent = combatants.reduce((sum, c) => sum + c.currentHP, 0)
  const totalMax = combatants.reduce((sum, c) => sum + c.maxHP, 0)
  const percentage = totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 0
  return { current: totalCurrent, max: totalMax, percentage }
})

// Terminal typing animation
const builderMessages = [
  'ENCOUNTER DESIGN SUITE ACTIVE',
  'THREAT CALCULATOR ONLINE',
  'XP BUDGET MONITORING...',
  'CREATURE DATABASE LOADED',
  'HAZARD SCANNER READY',
  'DIFFICULTY ANALYZER ARMED',
  'PARTY SYNC ESTABLISHED',
  'TACTICAL ASSESSMENT MODE',
  'BALANCE PROTOCOLS ENGAGED',
  'READY FOR ENCOUNTER BUILD',
  'SCENARIO PLANNER ONLINE',
  'ENVIRONMENT MODULES LOADED',
  'LOOT GENERATOR ACTIVE',
  'REWARD TRACKER INITIALIZED',
  'MISSION BRIEFING READY',
  'MAGI SYSTEMS FUNCTIONAL',
  'DATA NODES SYNCING',
]

const combatMessages = [
  'COMBAT SYSTEMS ENGAGED',
  'INITIATIVE TRACKER ARMED',
  'DAMAGE CALCULATOR ONLINE',
  'TURN SEQUENCER ACTIVE',
  'HP MONITOR TRACKING...',
  'CONDITION TRACKER READY',
  'DICE RANDOMIZER VERIFIED',
  'TACTICAL OVERLAY LIVE',
  'THREAT ASSESSMENT ACTIVE',
  'VICTORY CONDITIONS SET',
  'STATUS EFFECTS MONITORED',
  'ABILITY COOLDOWNS TRACKED',
  'ENEMY BEHAVIOR LOGGING',
  'S2 ENGINE ONLINE',
  'MAGI SYSTEMS FUNCTIONAL',
  'LOCKON STATUS: GREEN',
  'GN PARTICLES STABILIZED',
  'TACTICAL DATA UPLOADED',
  'READY FOR BOUNTY HUNTING',
  'SPACE COWBOY MODE ACTIVE',
]

const hackingMessages = [
  'INTRUSION SUITE ACTIVE',
  'ACCESS POINT SCAN READY',
  'ENCRYPTION ANALYZER LOADED',
  'COUNTERMEASURE DETECTOR ON',
  'TRACE PROTOCOLS STANDING BY',
  'VULNERABILITY SCANNER ARMED',
  'NEURAL INTERFACE ONLINE',
  'BACKDOOR PROTOCOLS READY',
  'ICE BREAKER MODULES LOADED',
  'DATA EXTRACTION QUEUED',
  'GHOST PROTOCOL ENGAGED',
  'FIREWALL MAPPER ACTIVE',
  'EXPLOIT DATABASE SYNCED',
  'STEALTH MODE: ENABLED',
  'DECK SYSTEMS: NOMINAL',
  'READY TO BREACH',
]

const customMessages = [
  'CREATURE FORGE ACTIVE',
  'STAT BLOCK COMPILER READY',
  'HAZARD DESIGNER ONLINE',
  'TRAIT ANALYZER LOADED',
  'ABILITY CALCULATOR ARMED',
  'DC TABLES SYNCHRONIZED',
  'DEFENSE OPTIMIZER ACTIVE',
  'ATTACK BUILDER STANDING BY',
  'XP CALCULATOR VERIFIED',
  'TEMPLATE ENGINE LOADED',
  'CUSTOM DATABASE READY',
  'EXPORT PROTOCOLS ONLINE',
  'VALIDATION SUITE ACTIVE',
  'FORGE SYSTEMS NOMINAL',
  'READY TO CREATE',
  'HOMEBREW MODE ENGAGED',
]

const starshipMessages = [
  'HELM CONTROLS ONLINE',
  'DRIFT ENGINE PRIMED',
  'SHIELDS AT MAXIMUM',
  'WEAPON SYSTEMS ARMED',
  'SCANNING FOR HOSTILES',
  'NAVIGATION CHARTS LOADED',
  'CREW STATIONS MANNED',
  'TACTICAL DISPLAY ACTIVE',
  'POWER CORE STABLE',
  'COMMS ARRAY OPERATIONAL',
  'TARGETING COMPUTER READY',
  'EVASIVE MANEUVERS QUEUED',
  'BROADSIDE CANNONS CHARGED',
  'JUMP COORDINATES SET',
  'ALL HANDS BATTLE STATIONS',
  'READY FOR VOID COMBAT',
]

const displayText = ref('')
const cursorVisible = ref(true)
let typeInterval: ReturnType<typeof setInterval> | null = null
let cursorInterval: ReturnType<typeof setInterval> | null = null
let messageIndex = 0
let charIndex = 0
let isDeleting = false
let pauseCount = 0

const currentMessages = computed(() => {
  if (props.mode === 'combat') return combatMessages
  if (props.mode === 'hacking') return hackingMessages
  if (props.mode === 'custom') return customMessages
  if (props.mode === 'starship') return starshipMessages
  return builderMessages
})

function typeEffect() {
  const messages = currentMessages.value
  const currentMessage = messages[messageIndex % messages.length]

  if (pauseCount > 0) {
    pauseCount--
    return
  }

  if (!isDeleting) {
    displayText.value = currentMessage.substring(0, charIndex + 1)
    charIndex++

    if (charIndex === currentMessage.length) {
      pauseCount = 40
      isDeleting = true
    }
  } else {
    displayText.value = currentMessage.substring(0, charIndex - 1)
    charIndex--

    if (charIndex === 0) {
      isDeleting = false
      messageIndex = (messageIndex + 1) % messages.length
      pauseCount = 8
    }
  }
}

// Reset animation when mode changes
watch(() => props.mode, () => {
  messageIndex = 0
  charIndex = 0
  isDeleting = false
  pauseCount = 0
  displayText.value = ''
})

onMounted(() => {
  typeInterval = setInterval(typeEffect, 50)
  cursorInterval = setInterval(() => {
    cursorVisible.value = !cursorVisible.value
  }, 530)
})

onUnmounted(() => {
  if (typeInterval) clearInterval(typeInterval)
  if (cursorInterval) clearInterval(cursorInterval)
})

// Encounter stats
const encounterStats = computed(() => {
  if (!activeEncounter.value) return null
  const creatures = activeEncounter.value.creatures?.length || 0
  const hazards = activeEncounter.value.hazards?.length || 0
  const totalXP = encounterStore.totalXP.value
  const difficulty = encounterStore.difficulty.value
  return { creatures, hazards, totalXP, difficulty }
})

// Custom mode stats
const customStats = computed(() => {
  const creatureStats = encounterStore.getCreatureStats()
  const hazardStats = encounterStore.getHazardStats()
  return {
    customCreatures: creatureStats.custom,
    customHazards: hazardStats.custom,
    totalCreatures: creatureStats.total,
    totalHazards: hazardStats.total,
  }
})

// Latest roll tracking with typewriter animation
const latestRoll = ref<RollResult | null>(null)
const rollDisplayText = ref('')
const rollCursorVisible = ref(true)
const rollSpecial = ref<{ isNat20: boolean; isNat1: boolean; isCrit: boolean } | null>(null)
let rollUnsubscribe: (() => void) | null = null
let rollTypeInterval: ReturnType<typeof setInterval> | null = null
let rollCursorInterval: ReturnType<typeof setInterval> | null = null
let rollCharIndex = 0
let fullRollText = ''

// Format a roll into display text
function formatRollText(r: RollResult): string {
  const source = r.source.length > 10 ? r.source.substring(0, 10) + '…' : r.source
  const name = r.name.length > 12 ? r.name.substring(0, 12) + '…' : r.name
  let text = `${source} :: ${name} → ${r.total}`
  if (r.isNat20) text += ' NAT20!'
  else if (r.isNat1) text += ' NAT1!'
  else if (r.isCriticalHit) text += ' CRIT!'
  return text
}

// Type out the roll text
function typeRollEffect() {
  if (rollCharIndex < fullRollText.length) {
    rollDisplayText.value = fullRollText.substring(0, rollCharIndex + 1)
    rollCharIndex++
  }
}

// Start typing a new roll
function startRollTypeAnimation(roll: RollResult) {
  // Clear any existing interval
  if (rollTypeInterval) {
    clearInterval(rollTypeInterval)
  }

  // Reset and start fresh
  rollCharIndex = 0
  rollDisplayText.value = ''
  fullRollText = formatRollText(roll)
  rollSpecial.value = {
    isNat20: roll.isNat20,
    isNat1: roll.isNat1,
    isCrit: roll.isCriticalHit || false
  }

  // Type at 30ms per character (fast but visible)
  rollTypeInterval = setInterval(typeRollEffect, 30)
}

// Initialize with most recent roll if any
const history = getRollHistory()
if (history.length > 0) {
  latestRoll.value = history[0]
  fullRollText = formatRollText(history[0])
  rollDisplayText.value = fullRollText
  rollSpecial.value = {
    isNat20: history[0].isNat20,
    isNat1: history[0].isNat1,
    isCrit: history[0].isCriticalHit || false
  }
}

// Subscribe to new rolls
onMounted(() => {
  // Cursor blink for roll display
  rollCursorInterval = setInterval(() => {
    rollCursorVisible.value = !rollCursorVisible.value
  }, 530)

  rollUnsubscribe = onRoll((roll) => {
    latestRoll.value = roll
    startRollTypeAnimation(roll)
  })
})

onUnmounted(() => {
  if (rollUnsubscribe) rollUnsubscribe()
  if (rollTypeInterval) clearInterval(rollTypeInterval)
  if (rollCursorInterval) clearInterval(rollCursorInterval)
})
</script>

<template>
  <footer class="status-bar">
    <!-- Terminal Animation -->
    <div class="terminal-display">
      <span class="terminal-prefix">&gt;</span>
      <span class="terminal-text">{{ displayText }}</span>
      <span class="terminal-cursor" :class="{ 'cursor-visible': cursorVisible }">_</span>
    </div>

    <!-- BUILDER MODE -->
    <template v-if="mode === 'builder'">
      <!-- Party Info -->
      <div class="status-section">
        <span class="status-label">PARTY</span>
        <span class="status-value">{{ encounterStore.effectivePartySize.value }}</span>
        <span class="status-divider">//</span>
        <span class="status-label">LVL</span>
        <span class="status-value text-accent">{{ encounterStore.effectivePartyLevel.value }}</span>
        <span v-if="encounterStore.state.useManualOverride" class="status-label text-warning" title="Using manual override">*</span>
      </div>

      <!-- Encounter Stats -->
      <div v-if="encounterStats" class="status-section">
        <span class="status-label">THREATS</span>
        <span class="status-value">{{ encounterStats.creatures }}C / {{ encounterStats.hazards }}H</span>
        <span class="status-divider">//</span>
        <span class="status-label">XP</span>
        <span class="status-badge" :class="'status-badge-' + encounterStats.difficulty">
          {{ encounterStats.totalXP }}
        </span>
      </div>

      <!-- No encounter -->
      <div v-if="!activeEncounter" class="status-section">
        <span class="status-muted">NO ENCOUNTER SELECTED</span>
      </div>
    </template>

    <!-- CUSTOM MODE -->
    <template v-else-if="mode === 'custom'">
      <!-- Current Editing -->
      <div class="status-section">
        <span class="status-label">{{ customPanelStore.state.mode === 'creature' ? 'CREATURE' : 'HAZARD' }}</span>
        <span v-if="customPanelStore.currentName.value" class="status-value text-accent">{{ customPanelStore.currentName.value }}</span>
        <span v-else class="status-muted">UNNAMED</span>
      </div>

      <!-- Validation Status -->
      <div class="status-section">
        <span v-if="customPanelStore.isValid.value" class="status-badge status-badge-success">READY</span>
        <span v-else class="status-badge status-badge-warning">INCOMPLETE</span>
      </div>

      <!-- Custom Creatures -->
      <div class="status-section">
        <span class="status-label">CREATURES</span>
        <span class="status-value text-accent">{{ customStats.customCreatures }}</span>
        <span class="status-muted">/ {{ customStats.totalCreatures }}</span>
      </div>

      <!-- Custom Hazards -->
      <div class="status-section">
        <span class="status-label">HAZARDS</span>
        <span class="status-value text-secondary">{{ customStats.customHazards }}</span>
        <span class="status-muted">/ {{ customStats.totalHazards }}</span>
      </div>
    </template>

    <!-- STARSHIP MODE -->
    <template v-else-if="mode === 'starship'">
      <div class="status-section">
        <span class="status-label">MODE</span>
        <span class="status-badge status-badge-starship">STARSHIP</span>
      </div>

      <div class="status-section">
        <span class="status-muted">VOID COMBAT SYSTEMS READY</span>
      </div>
    </template>

    <!-- HACKING MODE -->
    <template v-else-if="mode === 'hacking'">
      <!-- Computer Name -->
      <div v-if="hackingComputer" class="status-section">
        <span class="status-label">TARGET</span>
        <span class="status-value text-secondary">{{ hackingComputer.name }}</span>
        <span class="status-badge status-badge-hacking">LVL {{ hackingComputer.level }}</span>
      </div>

      <!-- Node Stats -->
      <div v-if="hackingStats" class="status-section">
        <span class="status-label">NODES</span>
        <span class="status-value" :class="{ 'text-success': hackingStats.breachedNodes === hackingStats.totalNodes }">
          {{ hackingStats.breachedNodes }}/{{ hackingStats.totalNodes }}
        </span>
        <span v-if="hackingStats.alarmedNodes > 0" class="status-badge status-badge-danger">
          {{ hackingStats.alarmedNodes }} ALARMED
        </span>
      </div>

      <!-- No Computer -->
      <div v-if="!hackingComputer" class="status-section">
        <span class="status-muted">NO TARGET LOADED</span>
      </div>
    </template>

    <!-- COMBAT MODE -->
    <template v-else>
      <!-- Combat Status -->
      <div v-if="combat" class="status-section">
        <span class="status-label">COMBAT</span>
        <span class="status-badge status-badge-accent">
          RND {{ combat.round }}
        </span>
        <span class="status-divider">//</span>
        <span class="status-value">{{ aliveCombatants.length }} ACTIVE</span>
      </div>

      <!-- Current Turn -->
      <div v-if="combat && currentCombatant" class="status-section">
        <span class="status-label">TURN</span>
        <span class="status-value text-accent">{{ currentCombatant.name }}</span>
        <span
          class="status-badge"
          :class="{
            'status-badge-success': currentCombatant.currentHP > currentCombatant.maxHP * 0.5,
            'status-badge-warning': currentCombatant.currentHP <= currentCombatant.maxHP * 0.5 && currentCombatant.currentHP > currentCombatant.maxHP * 0.25,
            'status-badge-danger': currentCombatant.currentHP <= currentCombatant.maxHP * 0.25
          }"
        >
          {{ currentCombatant.currentHP }}/{{ currentCombatant.maxHP }}
        </span>
      </div>

      <!-- On Deck -->
      <div v-if="combat && nextCombatant" class="status-section">
        <span class="status-label">ON DECK</span>
        <span class="status-value text-dim">{{ nextCombatant.name }}</span>
      </div>

      <!-- No Combat -->
      <div v-if="!combat" class="status-section">
        <span class="status-muted">NO ACTIVE COMBAT</span>
      </div>
    </template>

    <!-- Latest Roll Display (Typewriter Style) - positioned left of spacer -->
    <div v-if="latestRoll" class="roll-display" :class="{
      'roll-nat20': rollSpecial?.isNat20,
      'roll-nat1': rollSpecial?.isNat1,
      'roll-crit': rollSpecial?.isCrit && !rollSpecial?.isNat20 && !rollSpecial?.isNat1
    }">
      <span class="roll-prefix">&gt;</span>
      <span class="roll-text">{{ rollDisplayText }}</span>
      <span class="roll-cursor" :class="{ 'cursor-visible': rollCursorVisible }">_</span>
    </div>

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Quick Stats (Combat Only) -->
    <div v-if="mode === 'combat' && combat && hpStatus" class="status-section">
      <span class="status-label">HP</span>
      <div class="hp-mini-bar">
        <div
          class="hp-mini-fill"
          :style="{ width: hpStatus.percentage + '%' }"
        ></div>
      </div>
      <span class="status-value">{{ hpStatus.percentage }}%</span>
    </div>

    <!-- Difficulty Badge (Builder Only) -->
    <div v-if="mode === 'builder' && encounterStats" class="status-section">
      <span
        class="difficulty-badge"
        :class="'difficulty-' + encounterStats.difficulty"
      >
        {{ encounterStats.difficulty?.toUpperCase() || 'NONE' }}
      </span>
    </div>

    <!-- Hacking Sync Status (only in hacking mode when sync enabled) -->
    <div v-if="mode === 'hacking' && hackingSyncEnabled" class="status-section">
      <span class="sync-indicator" :class="'sync-' + hackingSyncState"></span>
      <span class="status-label">{{ hackingSyncState === 'connected' ? 'LIVE' : hackingSyncState === 'connecting' ? 'SYNC' : 'LOCAL' }}</span>
    </div>

    <!-- System Status -->
    <div class="status-section">
      <span class="status-indicator" :class="{
        'indicator-combat': mode === 'combat' && combat,
        'indicator-hacking': mode === 'hacking',
        'indicator-custom': mode === 'custom',
        'indicator-starship': mode === 'starship'
      }"></span>
      <span class="status-label">{{
        mode === 'combat' ? 'COMBAT' :
        mode === 'hacking' ? 'HACK' :
        mode === 'custom' ? 'FORGE' :
        mode === 'starship' ? 'HELM' :
        'BUILD'
      }}</span>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg) 100%);
  border-top: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  min-height: 2.25rem;
  position: sticky;
  bottom: 0;
  z-index: 100;
  flex-shrink: 0;
}

.status-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--color-accent), transparent 50%);
}

/* Terminal typing animation */
.terminal-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 260px;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.terminal-prefix {
  color: var(--color-accent);
  font-weight: bold;
}

.terminal-text {
  color: var(--color-text-dim);
}

.terminal-cursor {
  color: var(--color-accent);
  opacity: 0;
  transition: opacity 0.1s;
}

.terminal-cursor.cursor-visible {
  opacity: 1;
}

/* Status sections */
.status-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.5625rem;
}

.status-value {
  color: var(--color-text);
  font-weight: 600;
  text-transform: uppercase;
}

.status-muted {
  color: var(--color-text-muted);
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-divider {
  color: var(--color-border);
}

.status-badge {
  padding: 0.125rem 0.375rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge-accent {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.status-badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.status-badge-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.status-badge-danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.status-badge-trivial { background: rgba(74, 89, 104, 0.2); color: var(--color-trivial); }
.status-badge-low { background: var(--color-success-subtle); color: var(--color-success); }
.status-badge-moderate { background: var(--color-accent-subtle); color: var(--color-accent); }
.status-badge-severe { background: var(--color-warning-subtle); color: var(--color-warning); }
.status-badge-extreme { background: var(--color-danger-subtle); color: var(--color-danger); }
.status-badge-starship { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); }
.status-badge-hacking { background: var(--color-secondary-subtle, rgba(0, 255, 136, 0.15)); color: var(--color-secondary); border: 1px solid rgba(0, 255, 136, 0.3); }

/* Difficulty badge */
.difficulty-badge {
  padding: 0.125rem 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.625rem;
}

.difficulty-trivial { background: var(--color-trivial); color: white; }
.difficulty-low { background: var(--color-low); color: black; }
.difficulty-moderate { background: var(--color-moderate); color: black; }
.difficulty-severe { background: var(--color-severe); color: black; }
.difficulty-extreme { background: var(--color-extreme); color: white; }

/* Mini HP bar */
.hp-mini-bar {
  width: 3rem;
  height: 0.25rem;
  background: var(--color-bg);
  border-radius: 2px;
  overflow: hidden;
}

.hp-mini-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.3s ease;
}

/* System status indicator */
.status-indicator {
  width: 0.375rem;
  height: 0.375rem;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse-glow 2s ease-in-out infinite;
}

.status-indicator.indicator-combat {
  background: var(--color-danger);
  animation: pulse-glow-combat 1s ease-in-out infinite;
}

.status-indicator.indicator-hacking {
  background: var(--color-secondary);
  animation: pulse-glow-hacking 1.5s ease-in-out infinite;
}

.status-indicator.indicator-custom {
  background: var(--color-warning);
  animation: pulse-glow-custom 2s ease-in-out infinite;
}

.status-indicator.indicator-starship {
  background: #8b5cf6;
  animation: pulse-glow-starship 1.5s ease-in-out infinite;
}

@keyframes pulse-glow-hacking {
  0%, 100% { box-shadow: 0 0 4px var(--color-secondary); }
  50% { box-shadow: 0 0 12px var(--color-secondary); }
}

@keyframes pulse-glow-custom {
  0%, 100% { box-shadow: 0 0 4px var(--color-warning); }
  50% { box-shadow: 0 0 12px var(--color-warning); }
}

@keyframes pulse-glow-starship {
  0%, 100% { box-shadow: 0 0 4px #8b5cf6; }
  50% { box-shadow: 0 0 12px #8b5cf6; }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 2px var(--color-success), 0 0 4px var(--color-success);
  }
  50% {
    box-shadow: 0 0 4px var(--color-success), 0 0 8px var(--color-success);
  }
}

@keyframes pulse-glow-combat {
  0%, 100% {
    box-shadow: 0 0 2px var(--color-danger), 0 0 4px var(--color-danger);
  }
  50% {
    box-shadow: 0 0 6px var(--color-danger), 0 0 12px var(--color-danger);
  }
}

/* Sync status indicator for hacking mode */
.sync-indicator {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
}

.sync-indicator.sync-connected {
  background: var(--color-success);
  animation: pulse-glow-sync 2s ease-in-out infinite;
}

.sync-indicator.sync-connecting {
  background: var(--color-warning);
  animation: pulse-glow-connecting 1s ease-in-out infinite;
}

.sync-indicator.sync-disconnected,
.sync-indicator.sync-error {
  background: var(--color-text-muted);
}

@keyframes pulse-glow-sync {
  0%, 100% {
    box-shadow: 0 0 2px var(--color-success), 0 0 4px var(--color-success);
  }
  50% {
    box-shadow: 0 0 6px var(--color-success), 0 0 10px var(--color-success);
  }
}

@keyframes pulse-glow-connecting {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Roll display - typewriter terminal style */
.roll-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 200px;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.roll-display.roll-nat20 {
  color: var(--color-success);
}

.roll-display.roll-nat1 {
  color: var(--color-danger);
}

.roll-display.roll-crit {
  color: var(--color-warning);
}

.roll-prefix {
  color: var(--color-accent);
  font-weight: bold;
}

.roll-text {
  white-space: nowrap;
}

.roll-cursor {
  color: var(--color-accent);
  opacity: 0;
  transition: opacity 0.1s;
}

.roll-cursor.cursor-visible {
  opacity: 1;
}
</style>
