<script setup lang="ts">
/**
 * Chase setup as a side panel: pick the kind of chase, get obstacles filled in, start.
 * Everything else has a working default and lives under "Adjust details".
 */
import { computed, ref } from 'vue'
import { useChaseStore } from '../../stores/chaseStore'
import { usePartyStore } from '../../stores/partyStore'
import type { ChaseLength, ChaseSide, ChaseType, SavedChase } from '../../types/chase'
import {
  CHASE_TYPE_LABELS,
  CHASE_TYPE_SUMMARIES,
  OBSTACLES_BY_LENGTH,
  PLAY_TIME_BY_LENGTH,
  createEmptyObstacle,
  createSide,
  defaultSetup,
  lengthForCount,
  suggestedChasePoints,
} from '../../utils/chaseRules'
import { dcSummary, generateObstacles, swapObstacle, type ObstaclePool } from '../../utils/chaseGenerator'
import { EXAMPLE_CHASES } from '../../data/chaseExamples'
import SetupSection from './SetupSection.vue'
import ChaseObstacleEditor from './ChaseObstacleEditor.vue'

const props = defineProps<{
  chase: SavedChase
  /** Where generated obstacles come from. Kept by the parent so it survives a reload of the panel. */
  pool: ObstaclePool
  /** True once the GM has changed the obstacle list by hand. */
  handEdited: boolean
  problems: string[]
}>()

const emit = defineEmits<{
  (e: 'update:pool', pool: ObstaclePool): void
  (e: 'update:handEdited', value: boolean): void
  (e: 'save'): void
  (e: 'start'): void
  (e: 'new'): void
  (e: 'load', chase: SavedChase): void
  (e: 'pick-obstacle'): void
  (e: 'pick-vehicle', sideId: string): void
  (e: 'import'): void
  (e: 'export'): void
}>()

const store = useChaseStore()
const partyStore = usePartyStore()
const partySize = computed(() => partyStore.partySize.value || 4)

const open = ref({ saved: true, kind: true, obstacles: true, sides: false, ending: false })

/** The GM's own chases first, then the bundled examples that have not been saved over. */
const chaseList = computed(() => {
  const saved = store.state.savedChases
  return [...saved, ...EXAMPLE_CHASES.filter(e => !saved.some(s => s.id === e.id))]
})

function isEditedExample(chase: SavedChase): boolean {
  return !chase.isExample && EXAMPLE_CHASES.some(e => e.id === chase.id)
}
const editingIndex = ref<number | null>(null)

const TYPES = Object.keys(CHASE_TYPE_LABELS) as ChaseType[]
const LENGTHS = Object.keys(OBSTACLES_BY_LENGTH) as Exclude<ChaseLength, 'custom'>[]
const POOLS: { value: ObstaclePool; label: string }[] = [
  { value: 'any', label: 'Any environment' },
  { value: 'urban', label: 'Urban' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'wilderness', label: 'Wilderness' },
  { value: 'underground', label: 'Underground' },
]

const generateOptions = computed(() => ({ level: props.chase.level, pool: props.pool, partySize: partySize.value }))
const isSaved = computed(() => !!store.getSavedChase(props.chase.id))

const kindSummary = computed(() => {
  const c = props.chase
  return `${CHASE_TYPE_LABELS[c.type]}, ${c.length === 'custom' ? `${c.obstacles.length} obstacles` : c.length}`
})

const sidesSummary = computed(() => props.chase.sides.map(s => s.name).join(' vs '))

const endingSummary = computed(() => {
  const end = props.chase.end
  const parts: string[] = []
  if (end.catchEnds) parts.push('caught')
  if (end.leadToEscape !== null) parts.push(`${end.leadToEscape} ahead`)
  if (end.roundLimit !== null) parts.push(`${end.roundLimit} rounds`)
  return parts.join(', ') || 'last obstacle only'
})

function touched() {
  emit('update:handEdited', true)
}

function refill() {
  const c = props.chase
  const count = c.length === 'custom' ? Math.max(1, c.obstacles.length) : OBSTACLES_BY_LENGTH[c.length]
  c.obstacles = generateObstacles(count, [], generateOptions.value)
  emit('update:handEdited', false)
  syncRoundLimit()
}

function syncRoundLimit() {
  const c = props.chase
  if (c.type === 'beat-the-clock') c.end.roundLimit = Math.max(1, c.obstacles.length)
}

function setType(type: ChaseType) {
  const c = props.chase
  if (c.type === type) return
  const hasPeople = c.sides.some(s => s.members.length || s.vehicles.length)
  if (hasPeople && !confirm('Changing the type resets the sides, including their members and vehicles. Continue?')) return
  c.type = type
  const setup = defaultSetup(type, c.obstacles.length)
  c.sides = setup.sides
  c.end = setup.end
}

/** A new length adds to or trims the list, so choices already made are kept. */
function setLength(length: Exclude<ChaseLength, 'custom'>) {
  const c = props.chase
  c.length = length
  const target = OBSTACLES_BY_LENGTH[length]
  if (c.obstacles.length < target) {
    c.obstacles.push(...generateObstacles(target - c.obstacles.length, c.obstacles, generateOptions.value))
  } else {
    c.obstacles.splice(target)
  }
  syncRoundLimit()
}

function setLevel(level: number) {
  props.chase.level = Math.max(1, Math.min(20, Math.floor(level) || 1))
  if (!props.handEdited) refill()
}

function setPool(pool: ObstaclePool) {
  emit('update:pool', pool)
  if (!props.handEdited) {
    const c = props.chase
    const count = c.length === 'custom' ? Math.max(1, c.obstacles.length) : OBSTACLES_BY_LENGTH[c.length]
    c.obstacles = generateObstacles(count, [], { ...generateOptions.value, pool })
  }
}

function afterCountChange() {
  const c = props.chase
  c.length = lengthForCount(c.obstacles.length)
  syncRoundLimit()
  touched()
}

function swap(index: number) {
  const next = swapObstacle(props.chase.obstacles, index, generateOptions.value)
  if (next) props.chase.obstacles.splice(index, 1, next)
  touched()
}

function remove(index: number) {
  props.chase.obstacles.splice(index, 1)
  afterCountChange()
}

function move(from: number, to: number) {
  const list = props.chase.obstacles
  if (to < 0 || to >= list.length || to === from) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
  touched()
}

// Obstacles are reordered by dragging a row by its handle
const draggingIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(event: DragEvent, index: number) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDrop(index: number) {
  if (draggingIndex.value !== null) move(draggingIndex.value, index)
  onDragEnd()
}

function onDragEnd() {
  draggingIndex.value = null
  dropIndex.value = null
}

/** Keyboard reordering, for when dragging is not an option. */
function onHandleKey(event: KeyboardEvent, index: number) {
  const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
  if (!delta) return
  event.preventDefault()
  move(index, index + delta)
}

function addBlank() {
  const c = props.chase
  c.obstacles.push(createEmptyObstacle(c.level, suggestedChasePoints(partySize.value, c.obstacles.length)))
  afterCountChange()
  editingIndex.value = c.obstacles.length - 1
}

function edit(index: number) {
  editingIndex.value = index
  touched()
}

function addSide() {
  props.chase.sides.push(createSide({ name: 'New side', role: 'competitor', control: 'steady' }))
}

function removeSide(side: ChaseSide) {
  props.chase.sides = props.chase.sides.filter(s => s.id !== side.id)
}

function setPlayers(side: ChaseSide) {
  for (const s of props.chase.sides) s.isPlayers = s.id === side.id
  side.control = 'checks'
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
}

function deleteSaved(chase: SavedChase) {
  const question = isEditedExample(chase)
    ? `Put "${chase.name}" back the way it came? Your changes to it will be lost.`
    : `Delete "${chase.name}"?`
  if (confirm(question)) store.deleteChase(chase.id)
}

defineExpose({ refill })
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      <!-- Saved chases -->
      <SetupSection v-model:open="open.saved" title="Saved chases" :summary="`${chaseList.length}`">
        <div class="saved-list">
          <div v-for="saved in chaseList" :key="saved.id" class="saved-row" :class="{ 'saved-row-active': saved.id === chase.id }" @click="emit('load', saved)">
            <div class="min-w-0">
              <div class="font-semibold text-[0.8125rem] truncate">{{ saved.name }}</div>
              <div class="text-[0.625rem] text-dim">
                {{ CHASE_TYPE_LABELS[saved.type] }} · {{ saved.obstacles.length }} obstacles · {{ saved.isExample ? 'example' : isEditedExample(saved) ? `example, edited ${formatDate(saved.savedAt)}` : formatDate(saved.savedAt) }}
              </div>
            </div>
            <button v-if="!saved.isExample" class="btn-icon-tiny text-danger" :title="isEditedExample(saved) ? 'Put the original back' : 'Delete'" @click.stop="deleteSaved(saved)">×</button>
          </div>
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary btn-xs flex-1" @click="emit('import')">Import</button>
          <button class="btn-secondary btn-xs flex-1" :disabled="store.state.savedChases.length === 0" @click="emit('export')">Export</button>
        </div>
      </SetupSection>

      <!-- 1. What kind of chase -->
      <SetupSection v-model:open="open.kind" title="What kind of chase?" :step="1" :summary="kindSummary" done>
        <label class="flex flex-col gap-1">
          <span class="field-label">Name</span>
          <input v-model="chase.name" class="input input-sm" />
        </label>
        <div class="grid grid-cols-2 gap-1">
          <button v-for="t in TYPES" :key="t" class="btn-xs" :class="chase.type === t ? 'btn-primary' : 'btn-secondary'" @click="setType(t)">{{ CHASE_TYPE_LABELS[t] }}</button>
        </div>
        <p class="text-[0.75rem] text-dim">{{ CHASE_TYPE_SUMMARIES[chase.type] }}</p>
        <div>
          <span class="field-label">Length</span>
          <div class="grid grid-cols-3 gap-1 mt-1">
            <button
              v-for="l in LENGTHS"
              :key="l"
              class="btn-xs capitalize"
              :class="chase.length === l ? 'btn-primary' : 'btn-secondary'"
              :title="`${OBSTACLES_BY_LENGTH[l]} obstacles, about ${PLAY_TIME_BY_LENGTH[l]} of play`"
              @click="setLength(l)"
            >{{ l }} {{ OBSTACLES_BY_LENGTH[l] }}</button>
          </div>
        </div>
      </SetupSection>

      <!-- 2. Obstacles -->
      <SetupSection v-model:open="open.obstacles" title="Obstacles" :step="2" :summary="`${chase.obstacles.length}`" :done="chase.obstacles.length > 0">
        <div class="grid grid-cols-[4.5rem_1fr] gap-2">
          <label class="flex flex-col gap-1">
            <span class="field-label">Level</span>
            <input :value="chase.level" type="number" min="1" max="20" class="input input-sm" @change="setLevel(Number(($event.target as HTMLInputElement).value))" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="field-label">Drawn from</span>
            <select :value="pool" class="input input-sm select" @change="setPool(($event.target as HTMLSelectElement).value as ObstaclePool)">
              <option v-for="p in POOLS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </label>
        </div>
        <p v-if="handEdited" class="text-[0.6875rem] text-dim">You've changed the list, so level and environment now only affect new picks. Reroll all to start over.</p>

        <div class="flex flex-col gap-1">
          <div
            v-for="(o, index) in chase.obstacles"
            :key="o.id"
            class="obstacle-row"
            :class="{ 'obstacle-row-dragging': draggingIndex === index, 'obstacle-row-target': dropIndex === index && draggingIndex !== index }"
            @dragover.prevent="dropIndex = index"
            @drop.prevent="onDrop(index)"
          >
            <button
              class="obstacle-handle"
              draggable="true"
              title="Drag to reorder"
              :aria-label="`Reorder ${o.name}. Use the up and down arrow keys.`"
              @dragstart="onDragStart($event, index)"
              @dragend="onDragEnd"
              @keydown="onHandleKey($event, index)"
            >⠿</button>
            <span class="obstacle-number">{{ index + 1 }}</span>
            <button class="obstacle-main" title="Edit this obstacle" @click="edit(index)">
              <span class="obstacle-name">{{ o.name }}</span>
              <span class="obstacle-meta">{{ dcSummary(o) }} · {{ o.chasePoints }} point{{ o.chasePoints === 1 ? '' : 's' }}</span>
            </button>
            <div class="obstacle-actions">
              <button class="btn-icon-tiny" title="Swap for a different obstacle" @click="swap(index)">⟳</button>
              <button class="btn-icon-tiny text-danger" title="Remove" @click="remove(index)">×</button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1">
          <button class="btn-secondary btn-xs" title="Pick one from the book's samples" @click="emit('pick-obstacle')">+ Pick</button>
          <button class="btn-secondary btn-xs" title="Write your own" @click="addBlank">+ Blank</button>
          <button class="btn-secondary btn-xs" title="Replace every obstacle with a fresh pick" @click="refill">Reroll all</button>
        </div>
      </SetupSection>

      <!-- Details -->
      <div class="details-label">Adjust details <span class="text-dim normal-case tracking-normal">if you want to</span></div>

      <SetupSection v-model:open="open.sides" title="Sides" :summary="sidesSummary">
        <div v-for="side in chase.sides" :key="side.id" class="bg-elevated p-2 flex flex-col gap-2 text-[0.75rem]">
          <div class="flex items-center gap-1">
            <input v-model="side.name" class="input input-sm flex-1" />
            <button v-if="chase.sides.length > 1" class="btn-icon-tiny text-danger" title="Remove side" @click="removeSide(side)">×</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex flex-col gap-1"><span class="field-label">Role</span>
              <select v-model="side.role" class="input input-sm select">
                <option value="pursued">Pursued</option>
                <option value="pursuer">Pursuer</option>
                <option value="competitor">Competitor</option>
              </select>
            </label>
            <label class="flex flex-col gap-1"><span class="field-label">Moves by</span>
              <select v-model="side.control" class="input input-sm select" :disabled="side.isPlayers">
                <option value="checks">Rolling checks</option>
                <option value="steady">Steady pace</option>
              </select>
            </label>
            <label v-if="side.control === 'steady'" class="flex flex-col gap-1"><span class="field-label">Obstacles a round</span>
              <input v-model.number="side.pace" type="number" min="0" max="5" class="input input-sm" />
            </label>
            <label v-else class="flex flex-col gap-1"><span class="field-label">Roll modifier</span>
              <input v-model.number="side.rollModifier" type="number" class="input input-sm" />
            </label>
            <label class="flex flex-col gap-1" title="0 is the start line, before the first obstacle"><span class="field-label">Starts at</span>
              <input :value="side.position + 1" type="number" :min="side.control === 'steady' ? 0 : 1" :max="Math.max(1, chase.obstacles.length)" class="input input-sm" @change="side.position = Number(($event.target as HTMLInputElement).value) - 1" />
            </label>
          </div>
          <label class="flex items-center gap-1"><input type="radio" :checked="side.isPlayers" @change="setPlayers(side)" /> This is the party</label>
          <div class="flex flex-wrap items-center gap-1">
            <span v-for="v in side.vehicles" :key="v.instanceId" class="trait bg-surface text-dim cursor-pointer" title="Remove" @click="side.vehicles = side.vehicles.filter(x => x.instanceId !== v.instanceId)">{{ v.label }} ×</span>
            <button class="btn-secondary btn-xs" @click="emit('pick-vehicle', side.id)">+ Vehicle</button>
          </div>
        </div>
        <button class="btn-secondary btn-xs self-start" @click="addSide">+ Side</button>
        <p class="text-[0.6875rem] text-dim">The party's members are added when the chase starts.</p>
      </SetupSection>

      <SetupSection v-model:open="open.ending" title="How it ends" :summary="endingSummary">
        <p class="text-[0.75rem] text-dim">Clearing the last obstacle always ends it. You are asked before any ending is applied.</p>
        <label class="flex items-start gap-2 text-[0.75rem]"><input v-model="chase.end.catchEnds" type="checkbox" class="mt-0.5" /> A pursuer reaching the pursued catches them</label>
        <label class="flex flex-wrap items-center gap-1 text-[0.75rem]">
          <input type="checkbox" :checked="chase.end.leadToEscape !== null" @change="chase.end.leadToEscape = ($event.target as HTMLInputElement).checked ? 3 : null" />
          Getting
          <input v-model.number="chase.end.leadToEscape" type="number" min="1" class="input input-sm w-12" :disabled="chase.end.leadToEscape === null" />
          ahead loses the pursuers
        </label>
        <label class="flex flex-wrap items-center gap-1 text-[0.75rem]">
          <input type="checkbox" :checked="chase.end.roundLimit !== null" @change="chase.end.roundLimit = ($event.target as HTMLInputElement).checked ? Math.max(1, chase.obstacles.length) : null" />
          Time runs out after
          <input v-model.number="chase.end.roundLimit" type="number" min="1" class="input input-sm w-12" :disabled="chase.end.roundLimit === null" />
          rounds
        </label>
        <label class="flex flex-col gap-1">
          <span class="field-label">A round is</span>
          <input v-model="chase.roundLength" class="input input-sm" placeholder="3 actions, 10 minutes, a day" />
        </label>
      </SetupSection>
    </div>

    <!-- 3. Start -->
    <div class="p-4 border-t border-border bg-elevated flex flex-col gap-2">
      <p v-if="problems.length" class="text-[0.75rem] text-warning">{{ problems[0] }}</p>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" title="Start a new chase from scratch" @click="emit('new')">✕</button>
        <button class="btn btn-secondary flex-1" :title="isSaved ? 'Save changes' : 'Save to reuse later'" @click="emit('save')">Save</button>
        <button class="btn btn-primary flex-1" :disabled="problems.length > 0" @click="emit('start')">
          Start
        </button>
      </div>
    </div>

    <ChaseObstacleEditor
      v-if="editingIndex !== null && chase.obstacles[editingIndex]"
      :obstacle="chase.obstacles[editingIndex]"
      :index="editingIndex"
      :party-size="partySize"
      :party-level="chase.level"
      @close="editingIndex = null"
    />
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

/* Four chases show at once; the rest scroll */
.saved-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  /* four rows and the three gaps between them */
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

.obstacle-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.375rem;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
}

.obstacle-row:hover,
.obstacle-row:focus-within {
  border-color: var(--color-border-hover);
}

.obstacle-row-dragging {
  opacity: 0.4;
}

.obstacle-row-target {
  border-color: var(--color-accent);
  box-shadow: inset 0 2px 0 var(--color-accent);
}

.obstacle-handle {
  flex-shrink: 0;
  padding: 0 0.125rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1;
  cursor: grab;
}

.obstacle-handle:hover,
.obstacle-handle:focus-visible {
  color: var(--color-accent);
}

.obstacle-handle:active {
  cursor: grabbing;
}

.obstacle-number {
  flex-shrink: 0;
  width: 1rem;
  text-align: right;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-dim);
}

.obstacle-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
}

.obstacle-name {
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.obstacle-main:hover .obstacle-name {
  color: var(--color-accent);
}

.obstacle-meta {
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

.obstacle-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
}

/* With a pointer, the row's tools stay out of the way until it is hovered or focused */
@media (hover: hover) {
  .obstacle-actions {
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .obstacle-row:hover .obstacle-actions,
  .obstacle-row:focus-within .obstacle-actions {
    opacity: 1;
  }
}
</style>
