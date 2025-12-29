<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ThreatSearch from './components/ThreatSearch.vue'
import EncounterBuilder from './components/EncounterBuilder.vue'
import EncounterList from './components/EncounterList.vue'
import CombatTracker from './components/CombatTracker.vue'
import RollHistory from './components/RollHistory.vue'
import StatusBar from './components/StatusBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AnimatedBackground from './components/AnimatedBackground.vue'
import GlitchOverlay from './components/GlitchOverlay.vue'
import { useEncounterStore } from './stores/encounterStore'
import { useCombatStore } from './stores/combatStore'
import { usePartyStore } from './stores/partyStore'
import { useSettingsStore, themes } from './stores/settingsStore'
import { initDiscordIntegration, destroyDiscordIntegration } from './utils/discordIntegration'

const store = useEncounterStore()
const combatStore = useCombatStore()
const partyStore = usePartyStore()
const { settings } = useSettingsStore()

// Get current theme's accent color for the background animation
const currentAccentColor = computed(() => themes[settings.theme].accent)

// Initialize Discord webhook integration
onMounted(() => {
  initDiscordIntegration()
})

onUnmounted(() => {
  destroyDiscordIntegration()
})

const showSettingsModal = ref(false)

type Tab = 'builder' | 'combat'
const activeTab = ref<Tab>('builder')

const showImportModal = ref(false)
const importText = ref('')
const importError = ref('')

function handleExport() {
  const json = store.exportEncounters()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'damoritoshs-arena-encounters.json'
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport() {
  try {
    store.importEncounters(importText.value)
    showImportModal.value = false
    importText.value = ''
    importError.value = ''
  } catch (e) {
    importError.value = 'Invalid JSON data'
  }
}

function handleRunEncounter() {
  activeTab.value = 'combat'
}

</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Animated Background -->
    <AnimatedBackground
      v-if="settings.backgroundStyle !== 'none'"
      :style="settings.backgroundStyle"
      :accent-color="currentAccentColor"
    />

    <header class="header-bar flex justify-between items-center px-6 py-3 bg-surface border-b border-border relative">
      <!-- Accent line -->
      <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent to-transparent"></div>

      <div class="flex items-center gap-8">
        <div class="flex flex-col gap-0.5">
          <h1 class="text-lg font-bold leading-tight tracking-wider uppercase">
            <span class="text-accent">//</span>
            <span class="text-text">DAMORITOSH'S</span>
            <span class="text-accent">ARENA</span>
          </h1>
          <span class="text-[0.625rem] text-dim uppercase tracking-widest font-mono">&gt; SF2E ENCOUNTER SYSTEM v1.0</span>
        </div>
        <nav class="flex gap-1">
          <button
            class="nav-tab"
            :class="{ 'nav-tab-active': activeTab === 'builder' }"
            @click="activeTab = 'builder'"
          >
            <span class="text-accent mr-1">&gt;</span> ENCOUNTERS
          </button>
          <button
            class="nav-tab flex items-center gap-2"
            :class="{ 'nav-tab-active': activeTab === 'combat', 'nav-tab-live': combatStore.state.combat && activeTab !== 'combat' }"
            @click="activeTab = 'combat'"
          >
            <span class="text-accent mr-1">&gt;</span> COMBAT
            <span v-if="combatStore.state.combat" class="w-2 h-2 bg-success animate-pulse" title="Combat Active"></span>
          </button>
        </nav>
      </div>
      <div class="flex items-center gap-4">
        <button v-if="activeTab === 'builder'" class="btn btn-secondary" @click="showImportModal = true">Import</button>
        <button v-if="activeTab === 'builder'" class="btn btn-secondary" @click="handleExport">Export</button>
        <button
          class="btn btn-secondary btn-icon"
          @click="showSettingsModal = true"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>

    <main class="flex flex-1 overflow-hidden">
      <!-- Encounter Builder Tab -->
      <template v-if="activeTab === 'builder'">
        <aside class="w-70 bg-surface border-r border-border overflow-y-auto">
          <EncounterList />
        </aside>

        <section class="flex-1 overflow-hidden p-4">
          <div class="grid grid-cols-2 gap-4 h-full">
            <div class="overflow-y-auto h-full">
              <ThreatSearch />
            </div>
            <div class="overflow-y-auto h-full">
              <EncounterBuilder @run-encounter="handleRunEncounter" />
            </div>
          </div>
        </section>
      </template>

      <!-- Combat Tracker Tab -->
      <template v-else>
        <aside class="w-70 bg-surface border-r border-border overflow-y-auto p-4">
          <!-- Party Members -->
          <div class="mb-5">
            <h3 class="text-xs uppercase tracking-wide mb-2 text-dim">Party</h3>
            <div v-if="partyStore.activeParty.value?.players?.length" class="flex flex-col gap-1.5">
              <button
                v-for="player in partyStore.activeParty.value.players"
                :key="player.id"
                class="flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] text-left bg-elevated border border-success rounded-md cursor-pointer transition-all duration-150 hover:bg-success/15"
                @click="combatStore.addPlayer(player.name, player.perception || 0, player.maxHP, player.ac)"
              >
                <span class="text-xs">👤</span>
                {{ player.name }}
                <span class="text-[0.625rem] text-dim ml-auto">Lvl {{ player.level }}</span>
              </button>
            </div>
            <p v-else class="text-sm text-dim">No party members configured</p>
          </div>

          <!-- Creatures from Encounter -->
          <div class="mb-5">
            <h3 class="text-xs uppercase tracking-wide mb-2 text-dim">Creatures</h3>
            <div v-if="store.activeEncounter.value?.creatures?.length" class="flex flex-col gap-1.5">
              <button
                v-for="entry in store.activeEncounter.value.creatures"
                :key="`${entry.creature.id}-${entry.adjustment}`"
                class="flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] text-left bg-elevated border border-border rounded-md cursor-pointer transition-all duration-150 hover:border-accent hover:bg-accent/10"
                @click="combatStore.addCreature(entry.creature, entry.adjustment)"
              >
                <span class="font-bold text-accent">{{ entry.count }}×</span>
                <span v-if="entry.adjustment !== 'normal'" class="text-[0.625rem] font-bold px-1 py-0.5 rounded bg-dim text-white">{{ entry.adjustment === 'elite' ? 'E' : 'W' }}</span>
                {{ entry.creature.name }}
              </button>
            </div>
            <p v-else class="text-sm text-dim">No creatures in encounter</p>
          </div>

          <!-- Hazards from Encounter -->
          <div class="mb-5">
            <h3 class="text-xs uppercase tracking-wide mb-2 text-dim">Hazards</h3>
            <div v-if="store.activeEncounter.value?.hazards?.length" class="flex flex-col gap-1.5">
              <button
                v-for="entry in store.activeEncounter.value.hazards"
                :key="entry.hazard.id"
                class="flex items-center gap-1.5 px-3 py-2 text-[0.8125rem] text-left bg-elevated border border-hazard rounded-md cursor-pointer transition-all duration-150 hover:bg-hazard/15"
                @click="combatStore.addHazard(entry.hazard)"
              >
                <span class="font-bold text-accent">{{ entry.count }}×</span>
                <span class="text-xs text-hazard">⚠</span>
                {{ entry.hazard.name }}
              </button>
            </div>
            <p v-else class="text-sm text-dim">No hazards in encounter</p>
          </div>
        </aside>

        <section class="flex-1 overflow-hidden p-6">
          <CombatTracker />
        </section>
      </template>

      <!-- Roll History Panel (always visible) -->
      <aside class="w-70 bg-surface border-l border-border overflow-hidden flex flex-col">
        <RollHistory />
      </aside>
    </main>

    <!-- Status Bar -->
    <StatusBar :mode="activeTab" />

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <h3 class="mb-2">Import Encounters</h3>
        <p class="text-dim text-sm mb-4">Paste exported encounter JSON below:</p>
        <textarea
          v-model="importText"
          class="input w-full font-mono text-xs p-3 resize-y"
          placeholder='[{"id": "...", "name": "...", ...}]'
          rows="10"
        ></textarea>
        <p v-if="importError" class="text-danger mt-2">{{ importError }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn btn-secondary" @click="showImportModal = false">Cancel</button>
          <button class="btn btn-primary" @click="handleImport">Import</button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />

    <!-- Glitch Effect Overlay for Nat 20/1 -->
    <GlitchOverlay />
  </div>
</template>
