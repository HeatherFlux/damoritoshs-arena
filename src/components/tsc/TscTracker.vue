<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { usePartyStore } from '../../stores/partyStore'
import { TSC_EXPLORATION_ACTIVITIES } from '../../data/tscStations'
import { FRAMES } from '../../data/tscFrames'
import type { TscInitiativeEntry } from '../../types/tsc'
import TscPlayerShipCard from './TscPlayerShipCard.vue'
import TscNpcShipCard from './TscNpcShipCard.vue'
import TscHazardCard from './TscHazardCard.vue'
import TscInitiativeRoll from './TscInitiativeRoll.vue'

const emit = defineEmits<{ (e: 'open-library'): void; (e: 'open-ship'): void }>()

const store = useTscStore()
const partyStore = usePartyStore()

const scene = computed(() => store.state.activeScene)
const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const showInitiativeModal = ref(false)
const newPcName = ref('')
const newPcBonus = ref<number | null>(null)
const zonesText = ref('')
const shipTemplateId = ref('')
const playerViewMessage = ref('')

const currentEntry = computed(() => store.currentEntry.value)
const playerShipTurn = computed(() => !!scene.value?.playerShip && currentEntry.value?.kind === 'playerShip' && scene.value.playerShip.compromised > 0)
const stationOptions = computed(() => scene.value?.playerShip?.stations.map(s => ({ id: s.id, label: s.kind })) ?? [])

// ---- setup (no scene) ----
const draftName = ref('New Tactical Scene')

function startEmptyScene() {
  const saved = store.createEmptyTscScene()
  saved.name = draftName.value.trim() || saved.name
  saved.level = partyLevel.value
  store.startScene(saved)
}

// ---- crew ----
function addPartyMembers() {
  if (!scene.value) return
  for (const p of partyStore.getPartyPlayers()) {
    if (scene.value.pcs.some(pc => pc.playerId === p.id || pc.name === p.name)) continue
    store.addPc({ name: p.name, playerId: p.id, initiativeBonus: p.perception })
  }
}

function addPc() {
  const name = newPcName.value.trim()
  if (!name) return
  store.addPc({ name, initiativeBonus: newPcBonus.value ?? undefined })
  newPcName.value = ''
  newPcBonus.value = null
}

// ---- map ----
function applyZones() {
  const zones = zonesText.value.split(/[,\s]+/).map(z => z.trim()).filter(Boolean)
  if (zones.length) store.setSensorMapZones(zones)
  zonesText.value = ''
}

// ---- player view ----
async function openPlayerView() {
  const result = await store.openPlayerView()
  playerViewMessage.value = result.success ? 'Share link copied to clipboard' : 'Player view opened'
  setTimeout(() => { playerViewMessage.value = '' }, 4000)
}

function endScene() {
  if (!confirm('End this tactical scene? Ship damage is written back to the linked starship sheet.')) return
  store.endScene()
}

function entryClass(e: TscInitiativeEntry, i: number) {
  return {
    'is-current': i === scene.value?.currentTurnIndex,
    'text-danger': e.kind === 'npcShip' || e.kind === 'hazard',
    'text-accent': e.kind === 'playerShip',
    'opacity-50': e.hasActedThisRound && i !== scene.value?.currentTurnIndex,
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 h-full overflow-y-auto pr-1">
    <!-- No scene: setup -->
    <div v-if="!scene" class="card p-4 flex flex-col gap-3">
      <h3 class="font-semibold">New tactical scene</h3>
      <p class="text-dim text-xs">Enemy starships and complex hazards roll initiative alongside the crew; the player starship acts through its battle stations and only enters initiative if it becomes compromised.</p>
      <div class="flex flex-wrap gap-2 items-end">
        <label class="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span class="text-[0.625rem] uppercase tracking-widest text-dim">Scene name</span>
          <input v-model="draftName" class="input input-sm" />
        </label>
        <span class="text-xs text-dim">Party level {{ partyLevel }}</span>
        <button class="btn btn-primary" @click="startEmptyScene">Start scene</button>
        <button class="btn btn-secondary" @click="emit('open-library')">Add from Library</button>
      </div>
      <p class="text-dim text-xs">Or load a saved tactical scene from the sidebar.</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="card p-3 flex flex-wrap items-center gap-2">
        <input v-model="scene.name" class="input input-sm font-semibold w-52" />
        <label class="text-xs text-dim flex items-center gap-1">Lvl <input :value="scene.level" type="number" class="input input-sm w-14" @change="store.setSceneLevel(Number(($event.target as HTMLInputElement).value))" /></label>
        <span v-if="scene.initiativeRolled" class="badge-level badge-level-accent">Round {{ scene.round }}</span>
        <div class="ml-auto flex flex-wrap gap-1">
          <button v-if="!scene.initiativeRolled" class="btn btn-primary btn-sm" @click="showInitiativeModal = true">Roll Initiative</button>
          <template v-else>
            <button class="btn-secondary btn-sm" @click="store.previousTurn()">◀ Prev</button>
            <button class="btn btn-primary btn-sm" @click="store.nextTurn()">Next ▶</button>
            <button class="btn-secondary btn-sm" @click="store.endRound()">End Round</button>
            <button class="btn-secondary btn-sm" @click="showInitiativeModal = true">Re-roll</button>
          </template>
          <button class="btn-secondary btn-sm" title="Open the player sensor feed in a new tab and copy the share link" @click="openPlayerView">Player View</button>
          <button class="btn-secondary btn-sm" @click="store.saveActiveSceneAsTemplate()">Save</button>
          <button class="btn-danger btn-sm" @click="endScene">End Scene</button>
        </div>
        <span v-if="playerViewMessage" class="text-[0.6875rem] text-success w-full">{{ playerViewMessage }}</span>
      </div>

      <!-- Hull integrity prompt -->
      <div v-if="playerShipTurn" class="card p-3 border-l-3 border-l-danger bg-danger-subtle flex flex-wrap items-center gap-2">
        <span class="font-semibold text-danger">{{ scene.playerShip!.name }}'s turn: hull integrity check</span>
        <span class="text-xs text-dim">Flat check DC {{ 10 + scene.playerShip!.compromised }} (compromised {{ scene.playerShip!.compromised }}). Any crew member rolls; resolve before other actions on this count.</span>
        <button class="btn-danger btn-sm ml-auto" @click="store.hullIntegrityCheck()">Roll</button>
      </div>

      <!-- Initiative rail -->
      <div v-if="scene.initiativeRolled" class="card p-2 flex flex-wrap gap-1">
        <button
          v-for="(e, i) in scene.initiativeOrder"
          :key="e.id"
          class="initiative-chip"
          :class="entryClass(e, i)"
          :title="`${e.kind} · initiative ${e.initiative}`"
          @click="store.setTurn(i)"
        >
          <span class="text-[0.5625rem] font-mono opacity-70">{{ e.initiative }}</span>
          <span class="font-semibold">{{ e.name }}</span>
        </button>
        <span v-if="!scene.initiativeOrder.length" class="text-dim text-xs">Nobody in initiative.</span>
      </div>

      <!-- Crew -->
      <div class="card p-3 flex flex-col gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-semibold text-sm">Crew</h3>
          <button class="btn-secondary btn-xs" @click="addPartyMembers">Add active party</button>
          <input v-model="newPcName" class="input input-sm w-36" placeholder="PC name" @keydown.enter="addPc" />
          <input v-model.number="newPcBonus" type="number" class="input input-sm w-16" placeholder="init" title="Initiative bonus" @keydown.enter="addPc" />
          <button class="btn-secondary btn-xs" @click="addPc">+ PC</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
          <div v-for="pc in scene.pcs" :key="pc.id" class="bg-elevated p-1.5 flex flex-wrap items-center gap-2 text-[0.6875rem]" :class="{ 'card-glow': currentEntry?.refId === pc.id }">
            <span class="font-semibold flex-1 min-w-[5rem] truncate">{{ pc.name }}</span>
            <select :value="pc.stationId ?? ''" class="input input-sm select w-28" title="Helming" @change="store.setPcStation(pc.id, ($event.target as HTMLSelectElement).value || undefined)">
              <option value="">— no station —</option>
              <option v-for="st in stationOptions" :key="st.id" :value="st.id">{{ st.label }}</option>
            </select>
            <select :value="pc.explorationActivityId ?? ''" class="input input-sm select w-32" title="Exploration activity (free action at initiative)" @change="store.setPcExplorationActivity(pc.id, ($event.target as HTMLSelectElement).value || undefined)">
              <option value="">— exploring —</option>
              <option v-for="a in TSC_EXPLORATION_ACTIVITIES" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <button class="btn-icon-sm text-danger" title="Remove" @click="store.removePc(pc.id)">×</button>
          </div>
        </div>
      </div>

      <!-- Player ship -->
      <TscPlayerShipCard v-if="scene.playerShip" />
      <div v-else class="card p-3 flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold">Player starship</span>
        <select v-model="shipTemplateId" class="input input-sm select w-56">
          <option value="">— choose a starship sheet —</option>
          <option v-for="s in store.state.playerShips" :key="s.id" :value="s.id">{{ s.name }} ({{ FRAMES[s.frame].name }} {{ s.level }})</option>
        </select>
        <button class="btn-secondary btn-xs" :disabled="!shipTemplateId" @click="store.loadPlayerShipIntoScene(shipTemplateId)">Load</button>
        <button class="btn-secondary btn-xs" @click="emit('open-ship')">Build a sheet</button>
      </div>

      <!-- Sensor map -->
      <div class="card p-2 flex flex-wrap items-center gap-2 text-[0.6875rem]">
        <span class="font-semibold">Sensor map zones</span>
        <span class="text-dim">{{ scene.sensorMap.zones.join(' · ') }}</span>
        <input v-model="zonesText" class="input input-sm w-56 ml-auto" placeholder="e.g. 1, 2, 3, A, B, Nebula" @keydown.enter="applyZones" />
        <button class="btn-secondary btn-xs" @click="applyZones">Set zones</button>
      </div>

      <!-- Threats -->
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-sm">Sensor contacts</h3>
        <button class="btn-secondary btn-xs" @click="emit('open-library')">+ Add from Library</button>
      </div>
      <TscNpcShipCard v-for="n in scene.npcShips" :key="n.instanceId" :instance="n" />
      <TscHazardCard v-for="h in scene.hazards" :key="h.instanceId" :instance="h" />
      <div v-if="!scene.npcShips.length && !scene.hazards.length" class="text-dim text-xs">No enemy starships or hazards yet.</div>

      <!-- Log -->
      <div class="card p-2">
        <h3 class="text-[0.625rem] uppercase tracking-widest text-dim mb-1">Log</h3>
        <ul class="text-[0.6875rem] flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          <li v-for="e in [...scene.log].reverse()" :key="e.id" :class="{ 'text-dim': e.gmOnly }"><span class="font-mono text-accent mr-1">R{{ e.round }}</span>{{ e.text }}<span v-if="e.gmOnly" class="text-[0.5625rem] text-muted ml-1">(GM)</span></li>
        </ul>
      </div>
    </template>

    <TscInitiativeRoll v-if="showInitiativeModal && scene" @close="showInitiativeModal = false" />
  </div>
</template>

<style scoped>
.initiative-chip { display: inline-flex; flex-direction: column; align-items: center; padding: 0.25rem 0.625rem; background: var(--color-elevated); border: 1px solid var(--color-border); font-size: 0.6875rem; line-height: 1.1; cursor: pointer; }
.initiative-chip:hover { border-color: var(--color-accent); }
.initiative-chip.is-current { border-color: var(--color-accent); background: var(--color-accent-subtle, var(--color-elevated)); box-shadow: 0 0 0 1px var(--color-accent); }
</style>
