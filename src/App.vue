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
import HackingPanel from './components/hacking/HackingPanel.vue'
import HackingPlayerView from './components/hacking/HackingPlayerView.vue'
import CustomPanel from './components/custom/CustomPanel.vue'
import CollapsibleSidebar from './components/CollapsibleSidebar.vue'
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

// Check if we're on the hacking player view route
const isHackingPlayerView = ref(false)

function checkRoute() {
  const hash = window.location.hash
  isHackingPlayerView.value = hash.includes('/hacking/view')
}

// Initialize Discord webhook integration
onMounted(() => {
  initDiscordIntegration()
  checkRoute()
  window.addEventListener('hashchange', checkRoute)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', checkRoute)
  destroyDiscordIntegration()
})

const showSettingsModal = ref(false)
const showMobileNav = ref(false)

type Tab = 'builder' | 'combat' | 'hacking' | 'starship' | 'custom'
const activeTab = ref<Tab>('builder')

function setTab(tab: Tab) {
  activeTab.value = tab
  showMobileNav.value = false
}

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
  <!-- Hacking Player View (fullscreen, no chrome) -->
  <HackingPlayerView v-if="isHackingPlayerView" />

  <!-- Main App -->
  <div v-else class="flex flex-col h-screen overflow-hidden max-w-[100vw]">
    <!-- Animated Background -->
    <AnimatedBackground
      v-if="settings.backgroundStyle !== 'none'"
      :style="settings.backgroundStyle"
      :accent-color="currentAccentColor"
    />

    <header class="header-bar flex justify-between items-center px-4 lg:px-6 py-3 bg-surface border-b border-border relative">
      <!-- Accent line -->
      <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent to-transparent"></div>

      <div class="flex items-center gap-4 lg:gap-8">
        <div class="flex flex-col gap-0.5">
          <h1 class="text-base lg:text-lg font-bold leading-tight tracking-wider uppercase">
            <span class="text-accent">//</span>
            <span class="text-text">DAMORITOSH'S</span>
            <span class="text-accent">ARENA</span>
          </h1>
          <span class="hidden sm:block text-[0.625rem] text-dim uppercase tracking-widest font-mono">&gt; SF2E ENCOUNTER SYSTEM v1.0</span>
        </div>

        <!-- Desktop Nav -->
        <nav class="hidden lg:flex gap-1">
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
          <button
            class="nav-tab"
            :class="{ 'nav-tab-active': activeTab === 'hacking' }"
            @click="activeTab = 'hacking'"
          >
            <span class="text-accent mr-1">&gt;</span> HACKING
          </button>
          <button
            class="nav-tab"
            :class="{ 'nav-tab-active': activeTab === 'starship' }"
            @click="activeTab = 'starship'"
          >
            <span class="text-accent mr-1">&gt;</span> STARSHIP
          </button>
          <button
            class="nav-tab"
            :class="{ 'nav-tab-active': activeTab === 'custom' }"
            @click="activeTab = 'custom'"
          >
            <span class="text-accent mr-1">&gt;</span> CUSTOM
          </button>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <!-- Hamburger Menu Button (mobile) -->
        <button
          class="lg:hidden btn btn-secondary btn-icon"
          @click="showMobileNav = !showMobileNav"
          title="Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
          </svg>
        </button>
        <button
          class="btn btn-secondary btn-icon"
          @click="showSettingsModal = true"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
          </svg>
        </button>
      </div>

      <!-- Mobile Nav Dropdown -->
      <nav
        v-if="showMobileNav"
        class="lg:hidden absolute top-full left-0 right-0 bg-surface border-b border-border z-50 flex flex-col p-2 gap-1 animate-slide-down"
      >
        <button
          class="nav-tab w-full text-left"
          :class="{ 'nav-tab-active': activeTab === 'builder' }"
          @click="setTab('builder')"
        >
          <span class="text-accent mr-1">&gt;</span> ENCOUNTERS
        </button>
        <button
          class="nav-tab w-full text-left flex items-center gap-2"
          :class="{ 'nav-tab-active': activeTab === 'combat', 'nav-tab-live': combatStore.state.combat && activeTab !== 'combat' }"
          @click="setTab('combat')"
        >
          <span class="text-accent mr-1">&gt;</span> COMBAT
          <span v-if="combatStore.state.combat" class="w-2 h-2 bg-success animate-pulse" title="Combat Active"></span>
        </button>
        <button
          class="nav-tab w-full text-left"
          :class="{ 'nav-tab-active': activeTab === 'hacking' }"
          @click="setTab('hacking')"
        >
          <span class="text-accent mr-1">&gt;</span> HACKING
        </button>
        <button
          class="nav-tab w-full text-left"
          :class="{ 'nav-tab-active': activeTab === 'starship' }"
          @click="setTab('starship')"
        >
          <span class="text-accent mr-1">&gt;</span> STARSHIP
        </button>
        <button
          class="nav-tab w-full text-left"
          :class="{ 'nav-tab-active': activeTab === 'custom' }"
          @click="setTab('custom')"
        >
          <span class="text-accent mr-1">&gt;</span> CUSTOM
        </button>
      </nav>
    </header>

    <main class="flex flex-1 overflow-hidden min-w-0">
      <!-- Encounter Builder Tab -->
      <template v-if="activeTab === 'builder'">
        <CollapsibleSidebar side="left" storageKey="builderLeft">
          <EncounterList @import="showImportModal = true" @export="handleExport" />
        </CollapsibleSidebar>

        <section class="flex-1 min-w-0 overflow-hidden p-2 lg:p-4">
          <div class="flex flex-col lg:grid lg:grid-cols-2 gap-4 h-full">
            <div class="overflow-y-auto flex-1 lg:h-full min-w-0">
              <ThreatSearch />
            </div>
            <div class="overflow-y-auto flex-1 lg:h-full min-w-0">
              <EncounterBuilder @run-encounter="handleRunEncounter" />
            </div>
          </div>
        </section>
      </template>

      <!-- Combat Tracker Tab -->
      <template v-else-if="activeTab === 'combat'">
        <CollapsibleSidebar side="left" storageKey="combatLeft">
          <div class="p-4">
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
          </div>
        </CollapsibleSidebar>

        <section class="flex-1 overflow-hidden p-6">
          <CombatTracker />
        </section>

        <!-- Roll History Panel (for combat) -->
        <CollapsibleSidebar side="right" storageKey="combatRight">
          <RollHistory />
        </CollapsibleSidebar>
      </template>

      <!-- Hacking Encounter Tab -->
      <template v-else-if="activeTab === 'hacking'">
        <HackingPanel />
      </template>

      <!-- Starship Encounter Tab -->
      <template v-else-if="activeTab === 'starship'">
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="text-6xl mb-4 text-accent font-mono">[*]</div>
            <h2 class="text-2xl font-bold text-accent mb-2">CINEMATIC STARSHIP SCENES</h2>
            <p class="text-dim text-lg">Coming Soon</p>
          </div>
        </div>
      </template>

      <!-- Custom Creature/Hazard Builder Tab -->
      <template v-else-if="activeTab === 'custom'">
        <CustomPanel />
      </template>

      <!-- Roll History Panel (for builder only) -->
      <CollapsibleSidebar v-if="activeTab === 'builder'" side="right" storageKey="builderRight">
        <RollHistory />
      </CollapsibleSidebar>
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
