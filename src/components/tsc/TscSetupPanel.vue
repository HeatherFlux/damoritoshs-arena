<script setup lang="ts">
/**
 * Tactical starship scene setup as a side panel: pick the party's ship, get enemies filled
 * in for a difficulty, start. Everything else has a working default under "Adjust details".
 */
import { computed, ref } from 'vue'
import { useTscStore, createNpcShipInstance } from '../../stores/tscStore'
import { usePartyStore } from '../../stores/partyStore'
import type { FrameId, NpcStarship, PlayerStarship, TscSavedScene } from '../../types/tsc'
import { calculateStarshipHazardXP, type Difficulty } from '../../types/encounter'
import { FRAMES, FRAME_LIST } from '../../data/tscFrames'
import { TSC_EXPLORATION_ACTIVITIES } from '../../data/tscStations'
import { createPlayerStarship, setPlayerStarshipLevel } from '../../utils/tscDerive'
import { factionOptions } from '../../utils/tscStatBlock'
import { generateOpposition, labelInstances, sceneThreat, shipXP } from '../../utils/tscGenerator'
import SetupSection from '../SetupSection.vue'

const props = defineProps<{
  scene: TscSavedScene
  difficulty: Difficulty
  faction: string
  /** True once the GM has changed the list of enemies by hand. */
  handEdited: boolean
  problems: string[]
}>()

const emit = defineEmits<{
  (e: 'update:difficulty', value: Difficulty): void
  (e: 'update:faction', value: string): void
  (e: 'update:handEdited', value: boolean): void
  (e: 'save'): void
  (e: 'start'): void
  (e: 'new'): void
  (e: 'load', scene: TscSavedScene): void
  (e: 'pick-threat'): void
  (e: 'edit-ship'): void
  (e: 'import'): void
  (e: 'export'): void
}>()

const store = useTscStore()
const partyStore = usePartyStore()
const partySize = computed(() => partyStore.partySize.value || 4)

const open = ref({ saved: store.state.savedScenes.length > 0, ship: true, enemies: true, crew: false, map: false })
const newPcName = ref('')
const zonesText = ref('')

// Trivial scenes are rare enough to build by hand
const DIFFICULTIES: Difficulty[] = ['low', 'moderate', 'severe', 'extreme']
const factions = computed(() => factionOptions(store.allStarships.value))
const threat = computed(() => sceneThreat(props.scene.npcShips, props.scene.hazards, props.scene.level, partySize.value))
const isSaved = computed(() => !!store.getSavedScene(props.scene.id))

// ---- The party's ship ----

/** The saved sheet the scene's ship came from, '' for a ship made here. */
const sheetId = computed(() => {
  const ship = props.scene.playerShip
  return ship?.templateId && store.state.playerShips.some(p => p.id === ship.templateId) ? ship.templateId : ''
})

const shipSummary = computed(() => {
  const ship = props.scene.playerShip
  return ship ? `${ship.name}, ${FRAMES[ship.frame].name} ${ship.level}` : 'none'
})

function chooseSheet(id: string) {
  const c = props.scene
  if (!id) {
    c.playerShip = createPlayerStarship(c.playerShip?.frame ?? 'explorer', c.level, 'Party Starship')
    return
  }
  const sheet = store.state.playerShips.find(p => p.id === id)
  if (!sheet) return
  c.playerShip = { ...JSON.parse(JSON.stringify(sheet)), id: crypto.randomUUID(), templateId: sheet.id }
  clearStaleStations()
  // The sheet knows the party's level better than a blank scene does
  if (sheet.level !== c.level) setLevel(sheet.level)
}

function setFrame(frame: FrameId) {
  const ship = props.scene.playerShip
  if (!ship || ship.frame === frame) return
  const fresh = createPlayerStarship(frame, ship.level, ship.name)
  // Keep custom stations and bays; default stations come from the new frame
  props.scene.playerShip = {
    ...ship,
    frame,
    templateId: undefined,
    stations: [...fresh.stations, ...ship.stations.filter(s => s.slot === 'custom')],
    currentHP: fresh.currentHP,
    currentSP: fresh.currentSP,
  }
  clearStaleStations()
}


function renameShip(name: string) {
  const ship = props.scene.playerShip
  if (ship) ship.name = name
}

/** A crew member can only helm a station the ship still has. */
function clearStaleStations() {
  const ids = new Set(props.scene.playerShip?.stations.map(s => s.id))
  for (const pc of props.scene.pcs) if (pc.stationId && !ids.has(pc.stationId)) pc.stationId = undefined
}

// ---- Who's out there ----

interface ThreatRow {
  key: string
  kind: 'ship' | 'hazard'
  name: string
  level: number
  count: number
  xp: number
  note: string
}

const rows = computed<ThreatRow[]>(() => {
  const list: ThreatRow[] = []
  for (const n of props.scene.npcShips) {
    const row = list.find(r => r.kind === 'ship' && r.key === n.model.id)
    if (row) row.count++
    else list.push({ key: n.model.id, kind: 'ship', name: n.model.name, level: n.model.level, count: 1, xp: shipXP(n.model, props.scene.level), note: n.model.faction })
  }
  for (const h of props.scene.hazards) {
    const row = list.find(r => r.kind === 'hazard' && r.key === h.hazard.id)
    if (row) row.count++
    else list.push({ key: h.hazard.id, kind: 'hazard', name: h.hazard.name, level: h.hazard.level, count: 1, xp: calculateStarshipHazardXP(h.hazard, props.scene.level), note: `${h.hazard.complexity} hazard` })
  }
  return list
})

function touched() {
  emit('update:handEdited', true)
}

function relabel() {
  labelInstances(props.scene.npcShips, n => n.model.name)
  labelInstances(props.scene.hazards, h => h.hazard.name)
}

function fill(overrides: { difficulty?: Difficulty; faction?: string } = {}) {
  const ships = generateOpposition({
    level: props.scene.level,
    partySize: partySize.value,
    difficulty: overrides.difficulty ?? props.difficulty,
    faction: overrides.faction ?? props.faction,
    ships: store.allStarships.value,
  })
  props.scene.npcShips = ships.map(s => createNpcShipInstance(s))
  relabel()
  emit('update:handEdited', false)
}

function setDifficulty(difficulty: Difficulty) {
  emit('update:difficulty', difficulty)
  if (!props.handEdited) fill({ difficulty })
}

function setFaction(faction: string) {
  emit('update:faction', faction)
  if (!props.handEdited) fill({ faction })
}

/**
 * One level for the whole scene: a starship's level is the party's level (Tech Core p. 196),
 * and the enemies are picked to suit it.
 */
function setLevel(level: number) {
  const clamped = Math.max(1, Math.min(20, Math.floor(level) || 1))
  props.scene.level = clamped
  const ship = props.scene.playerShip
  if (ship && ship.level !== clamped) props.scene.playerShip = setPlayerStarshipLevel(ship, clamped)
  if (!props.handEdited) fill()
}

function addOne(row: ThreatRow) {
  if (row.kind === 'ship') {
    const model = props.scene.npcShips.find(n => n.model.id === row.key)?.model as NpcStarship | undefined
    if (model) props.scene.npcShips.push(createNpcShipInstance(model))
  } else {
    const existing = props.scene.hazards.find(h => h.hazard.id === row.key)
    if (existing) props.scene.hazards.push({ ...JSON.parse(JSON.stringify(existing)), instanceId: crypto.randomUUID() })
  }
  relabel()
  touched()
}

function removeOne(row: ThreatRow) {
  const list: { instanceId: string }[] = row.kind === 'ship' ? props.scene.npcShips : props.scene.hazards
  const ids = row.kind === 'ship'
    ? props.scene.npcShips.filter(n => n.model.id === row.key).map(n => n.instanceId)
    : props.scene.hazards.filter(h => h.hazard.id === row.key).map(h => h.instanceId)
  const last = ids[ids.length - 1]
  const index = list.findIndex(i => i.instanceId === last)
  if (index >= 0) list.splice(index, 1)
  relabel()
  touched()
}

function removeAll(row: ThreatRow) {
  if (row.kind === 'ship') props.scene.npcShips = props.scene.npcShips.filter(n => n.model.id !== row.key)
  else props.scene.hazards = props.scene.hazards.filter(h => h.hazard.id !== row.key)
  relabel()
  touched()
}

// ---- Crew and map ----

function addParty() {
  for (const p of partyStore.getPartyPlayers()) {
    if (props.scene.pcs.some(pc => pc.playerId === p.id || pc.name === p.name)) continue
    props.scene.pcs.push({ id: crypto.randomUUID(), name: p.name, playerId: p.id, initiativeBonus: p.perception })
  }
}

function addPc() {
  const name = newPcName.value.trim()
  if (!name) return
  props.scene.pcs.push({ id: crypto.randomUUID(), name })
  newPcName.value = ''
}

function removePc(id: string) {
  props.scene.pcs = props.scene.pcs.filter(p => p.id !== id)
}

function applyZones() {
  const zones = zonesText.value.split(/[,\n]+/).map(z => z.trim()).filter(Boolean)
  if (zones.length) props.scene.sensorMap.zones = zones
  zonesText.value = ''
}

const crewSummary = computed(() => {
  const n = props.scene.pcs.length
  return n ? `${n} aboard` : 'your party'
})

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

function savedSummary(saved: TscSavedScene): string {
  const parts = [`Level ${saved.level}`]
  if (saved.npcShips.length) parts.push(`${saved.npcShips.length} ship${saved.npcShips.length === 1 ? '' : 's'}`)
  if (saved.hazards.length) parts.push(`${saved.hazards.length} hazard${saved.hazards.length === 1 ? '' : 's'}`)
  parts.push(formatDate(saved.savedAt))
  return parts.join(' · ')
}

function deleteSaved(saved: TscSavedScene) {
  if (confirm(`Delete "${saved.name}"?`)) store.deleteScene(saved.id)
}

function shipOf(scene: TscSavedScene): PlayerStarship | null {
  return scene.playerShip
}

defineExpose({ fill })
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      <!-- Saved scenes -->
      <SetupSection v-model:open="open.saved" title="Saved scenes" :summary="`${store.state.savedScenes.length}`">
        <div class="saved-list">
          <div v-for="saved in store.state.savedScenes" :key="saved.id" class="saved-row" :class="{ 'saved-row-active': saved.id === scene.id }" @click="emit('load', saved)">
            <div class="min-w-0">
              <div class="font-semibold text-[0.8125rem] truncate">{{ saved.name }}</div>
              <div class="text-[0.625rem] text-dim truncate">{{ savedSummary(saved) }}</div>
            </div>
            <button class="btn-icon-tiny text-danger" title="Delete" @click.stop="deleteSaved(saved)">×</button>
          </div>
          <p v-if="store.state.savedScenes.length === 0" class="text-[0.75rem] text-dim py-1">Nothing saved yet.</p>
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary btn-xs flex-1" @click="emit('import')">Import</button>
          <button class="btn-secondary btn-xs flex-1" :disabled="store.state.savedScenes.length === 0" @click="emit('export')">Export</button>
        </div>
      </SetupSection>

      <!-- 1. The party's ship -->
      <SetupSection v-model:open="open.ship" title="The party's ship" :step="1" :summary="shipSummary" :done="!!shipOf(scene)">
        <label v-if="store.state.playerShips.length" class="flex flex-col gap-1">
          <span class="field-label">Ship</span>
          <select :value="sheetId" class="input input-sm select" @change="chooseSheet(($event.target as HTMLSelectElement).value)">
            <option value="">A new ship</option>
            <option v-for="s in store.state.playerShips" :key="s.id" :value="s.id">{{ s.name }} ({{ FRAMES[s.frame].name }} {{ s.level }})</option>
          </select>
        </label>

        <template v-if="scene.playerShip">
          <div class="grid grid-cols-[1fr_5.5rem] gap-2">
            <label class="flex flex-col gap-1">
              <span class="field-label">Name</span>
              <input :value="scene.playerShip.name" class="input input-sm" @input="renameShip(($event.target as HTMLInputElement).value)" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="field-label">Party level</span>
              <input :value="scene.level" type="number" min="1" max="20" class="input input-sm" title="The ship and the enemies both follow the party's level" @change="setLevel(Number(($event.target as HTMLInputElement).value))" />
            </label>
          </div>
          <div>
            <span class="field-label">Frame</span>
            <div class="grid grid-cols-3 gap-1 mt-1">
              <button
                v-for="f in FRAME_LIST"
                :key="f.id"
                class="btn-xs"
                :class="scene.playerShip.frame === f.id ? 'btn-primary' : 'btn-secondary'"
                :title="f.description"
                @click="setFrame(f.id)"
              >{{ f.name }}</button>
            </div>
          </div>
          <p class="text-[0.75rem] text-dim">{{ FRAMES[scene.playerShip.frame].description }}</p>
          <button class="btn-secondary btn-xs self-start" title="Battle stations, upgrades, weapons and expansion bays" @click="emit('edit-ship')">Stations and upgrades</button>
        </template>
        <button v-else class="btn-secondary btn-xs self-start" @click="chooseSheet('')">Add a ship</button>
      </SetupSection>

      <!-- 2. Who's out there -->
      <SetupSection v-model:open="open.enemies" title="Who's out there?" :step="2" :summary="`${threat.xp} XP, ${threat.difficulty}`" :done="rows.length > 0">
        <label class="flex flex-col gap-1">
          <span class="field-label">Drawn from</span>
          <select :value="faction" class="input input-sm select" @change="setFaction(($event.target as HTMLSelectElement).value)">
            <option value="">Any faction</option>
            <option v-for="f in factions" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <div>
          <span class="field-label">How hard</span>
          <div class="grid grid-cols-4 gap-1 mt-1">
            <button
              v-for="d in DIFFICULTIES"
              :key="d"
              class="btn-xs capitalize difficulty-btn"
              :class="difficulty === d ? 'btn-primary' : 'btn-secondary'"
              :title="`${threat.budget[d]} XP for a party of ${partySize}`"
              @click="setDifficulty(d)"
            >{{ d }}</button>
          </div>
        </div>
        <p v-if="handEdited" class="text-[0.6875rem] text-dim">You've changed the list, so these now only affect a reroll.</p>

        <div class="flex flex-col gap-1">
          <div v-for="row in rows" :key="row.kind + row.key" class="threat-row">
            <div class="threat-main">
              <span class="threat-name">{{ row.name }}</span>
              <span class="threat-meta">Level {{ row.level }} · {{ row.note }}<span> · {{ row.xp }} XP each</span></span>
            </div>
            <div class="threat-count">
              <button class="count-btn" title="One fewer" :disabled="row.count <= 1" @click="removeOne(row)">−</button>
              <span class="count-value">{{ row.count }}</span>
              <button class="count-btn" title="One more" @click="addOne(row)">+</button>
            </div>
            <button class="btn-icon-tiny text-danger" title="Remove" @click="removeAll(row)">×</button>
          </div>
          <p v-if="rows.length === 0" class="text-[0.75rem] text-dim">Nothing out there yet.</p>
        </div>

        <div class="threat-total" :class="`threat-${threat.difficulty}`">
          <span>{{ threat.xp }} XP</span>
          <span class="capitalize">{{ threat.difficulty }}</span>
        </div>
        <p v-if="threat.smallCrew" class="text-[0.6875rem] text-dim">A crew of three or fewer gets a smaller budget, which is counted here.</p>

        <div class="grid grid-cols-2 gap-1">
          <button class="btn-secondary btn-xs" title="Pick starships and hazards from Tech Core, or build your own" @click="emit('pick-threat')">+ Pick</button>
          <button class="btn-secondary btn-xs" title="Replace the enemy ships with a fresh pick. Hazards stay." @click="fill()">Reroll ships</button>
        </div>
      </SetupSection>

      <!-- Details -->
      <div class="details-label">Adjust details <span class="text-dim normal-case tracking-normal">if you want to</span></div>

      <SetupSection v-model:open="open.crew" title="Crew" :summary="crewSummary">
        <label class="flex flex-col gap-1">
          <span class="field-label">Scene name</span>
          <input v-model="scene.name" class="input input-sm" />
        </label>
        <p v-if="scene.pcs.length === 0" class="text-[0.75rem] text-dim">Your active party comes aboard when the scene starts. Add them now to assign stations first.</p>
        <div v-for="pc in scene.pcs" :key="pc.id" class="bg-elevated p-2 flex flex-col gap-1.5 text-[0.75rem]">
          <div class="flex items-center gap-1">
            <span class="font-semibold flex-1 truncate">{{ pc.name }}</span>
            <button class="btn-icon-tiny text-danger" title="Remove" @click="removePc(pc.id)">×</button>
          </div>
          <div class="grid grid-cols-2 gap-1">
            <select v-model="pc.stationId" class="input input-sm select" title="Battle station this character helms">
              <option :value="undefined">No station</option>
              <option v-for="st in scene.playerShip?.stations ?? []" :key="st.id" :value="st.id">{{ st.kind }}</option>
            </select>
            <select v-model="pc.explorationActivityId" class="input input-sm select" title="Exploration activity, which grants a free action when initiative is rolled">
              <option :value="undefined">Exploring</option>
              <option v-for="a in TSC_EXPLORATION_ACTIVITIES" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
        </div>
        <div class="flex gap-1">
          <input v-model="newPcName" class="input input-sm flex-1" placeholder="Name" @keydown.enter="addPc" />
          <button class="btn-secondary btn-xs" @click="addPc">+ Add</button>
        </div>
        <button class="btn-secondary btn-xs self-start" @click="addParty">Add active party</button>
      </SetupSection>

      <SetupSection v-model:open="open.map" title="Sensor map" :summary="`${scene.sensorMap.zones.length} zones`">
        <p class="text-[0.75rem] text-dim">Distances are counted in zones. Name them however your map does.</p>
        <p class="text-[0.75rem]">{{ scene.sensorMap.zones.join(' · ') }}</p>
        <div class="flex gap-1">
          <input v-model="zonesText" class="input input-sm flex-1" placeholder="1, 2, 3, Nebula, Wreck" @keydown.enter="applyZones" />
          <button class="btn-secondary btn-xs" @click="applyZones">Set</button>
        </div>
      </SetupSection>
    </div>

    <!-- 3. Start -->
    <div class="p-4 border-t border-border bg-elevated flex flex-col gap-2">
      <p v-if="problems.length" class="text-[0.75rem] text-warning">{{ problems[0] }}</p>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" title="Start a new scene from scratch" @click="emit('new')">✕</button>
        <button class="btn btn-secondary flex-1" :title="isSaved ? 'Save changes' : 'Save to reuse later'" @click="emit('save')">Save</button>
        <button class="btn btn-primary flex-1" :disabled="problems.length > 0" @click="emit('start')">Start</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.field-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.details-label {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-dim);
}

/* Four scenes show at once; the rest scroll */
.saved-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: calc(4 * 3.3125rem + 0.75rem);
  overflow-y: auto;
}

.saved-row {
  flex-shrink: 0;
  height: 3.3125rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  cursor: pointer;
}

.saved-row:hover,
.saved-row-active {
  border-color: var(--color-accent);
}

.difficulty-btn {
  padding-left: 0;
  padding-right: 0;
}

.threat-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.375rem 0.25rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
}

.threat-row:hover,
.threat-row:focus-within {
  border-color: var(--color-border-hover);
}

.threat-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.threat-name {
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threat-meta {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threat-count {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
}

.count-btn {
  width: 1.375rem;
  height: 1.375rem;
  background: var(--color-bg-surface);
  border: none;
  color: var(--color-accent);
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.count-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.count-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.count-value {
  min-width: 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.threat-total {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-bg-elevated);
  border-left: 3px solid var(--color-border);
}

.threat-trivial { border-left-color: var(--color-trivial); }
.threat-low { border-left-color: var(--color-low); }
.threat-moderate { border-left-color: var(--color-moderate); }
.threat-severe { border-left-color: var(--color-severe); }
.threat-extreme { border-left-color: var(--color-extreme); }
</style>
