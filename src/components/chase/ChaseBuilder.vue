<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePartyStore } from '../../stores/partyStore'
import type { ChaseLength, ChaseObstacle, ChaseSide, ChaseType, SavedChase } from '../../types/chase'
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
import { DC_ADJUSTMENTS, SIMPLE_DCS, getDCForLevel, type DCDifficulty, type SimpleDCRank } from '../../utils/dcTable'

const props = defineProps<{
  chase: SavedChase
  /** True when the chase has been saved before. */
  saved: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'start'): void
  (e: 'new'): void
  (e: 'open-obstacles'): void
  (e: 'add-vehicle', sideId: string): void
}>()

const partyStore = usePartyStore()
const partySize = computed(() => partyStore.partySize.value || 4)
const expanded = ref<string | null>(null)

const TYPES = Object.keys(CHASE_TYPE_LABELS) as ChaseType[]
const LENGTHS = Object.keys(OBSTACLES_BY_LENGTH) as Exclude<ChaseLength, 'custom'>[]
const CHECKS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Computers', 'Crafting', 'Deception', 'Diplomacy', 'Intimidation',
  'Medicine', 'Nature', 'Occultism', 'Performance', 'Piloting', 'Religion', 'Society', 'Stealth', 'Survival',
  'Thievery', 'Perception', 'Fortitude', 'Reflex', 'Will',
]

// DC helper
const dcBasis = ref<'simple' | 'level'>('simple')
const dcRank = ref<SimpleDCRank>('trained')
const dcLevel = ref(props.chase.level)
const dcDifficulty = ref<DCDifficulty>('standard')
const helperDC = computed(() =>
  (dcBasis.value === 'simple' ? SIMPLE_DCS[dcRank.value] : getDCForLevel(dcLevel.value)) + DC_ADJUSTMENTS[dcDifficulty.value],
)

const targetCount = computed(() => (props.chase.length === 'custom' ? null : OBSTACLES_BY_LENGTH[props.chase.length]))
const problems = computed(() => {
  const list: string[] = []
  const c = props.chase
  if (c.obstacles.length === 0) list.push('Add at least one obstacle.')
  if (!c.sides.some(s => s.isPlayers)) list.push('One side must be the party.')
  for (const o of c.obstacles) {
    if (o.options.length === 0) list.push(`${o.name} has no way past it.`)
    if (o.chasePoints < 1) list.push(`${o.name} needs at least 1 Chase Point.`)
  }
  return list
})
const advice = computed(() => {
  const list: string[] = []
  const c = props.chase
  if (targetCount.value !== null && c.obstacles.length !== targetCount.value) {
    list.push(`A ${c.length} chase has ${targetCount.value} obstacles; this one has ${c.obstacles.length}.`)
  }
  if (c.type === 'beat-the-clock' && c.end.roundLimit !== null && c.end.roundLimit !== c.obstacles.length) {
    list.push(`Beat the Clock usually allows one round per obstacle (${c.obstacles.length}).`)
  }
  for (const o of c.obstacles) {
    if (o.options.length === 1) list.push(`${o.name} has only one approach; the book recommends at least two that suit different characters.`)
  }
  return list
})

function setType(type: ChaseType) {
  const c = props.chase
  if (c.type === type) return
  const hadProgress = c.sides.some(s => s.members.length || s.vehicles.length)
  if (hadProgress && !confirm('Changing the type resets the sides, including their members and vehicles. Continue?')) return
  c.type = type
  const setup = defaultSetup(type, c.obstacles.length)
  c.sides = setup.sides
  c.end = setup.end
}

function setLength(length: ChaseLength) {
  props.chase.length = length
}

function addObstacle() {
  const c = props.chase
  const o = createEmptyObstacle(c.level, suggestedChasePoints(partySize.value, c.obstacles.length))
  c.obstacles.push(o)
  expanded.value = o.id
  syncAfterCountChange()
}

function syncAfterCountChange() {
  const c = props.chase
  if (c.length !== 'custom' && OBSTACLES_BY_LENGTH[c.length] !== c.obstacles.length) c.length = lengthForCount(c.obstacles.length)
  if (c.type === 'beat-the-clock') c.end.roundLimit = c.obstacles.length
}

function removeObstacle(index: number) {
  props.chase.obstacles.splice(index, 1)
  syncAfterCountChange()
}

function duplicateObstacle(index: number) {
  const copy: ChaseObstacle = JSON.parse(JSON.stringify(props.chase.obstacles[index]))
  copy.id = crypto.randomUUID()
  copy.options.forEach(o => { o.id = crypto.randomUUID() })
  props.chase.obstacles.splice(index + 1, 0, copy)
  syncAfterCountChange()
}

function move(index: number, delta: number) {
  const list = props.chase.obstacles
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
}

function applySuggestedPoints() {
  props.chase.obstacles.forEach((o, i) => { o.chasePoints = suggestedChasePoints(partySize.value, i) })
}

function addOption(o: ChaseObstacle) {
  o.options.push({ id: crypto.randomUUID(), dc: helperDC.value, skills: [], description: '' })
}

function toggleSkill(skills: string[], skill: string) {
  const i = skills.indexOf(skill)
  if (i >= 0) skills.splice(i, 1)
  else skills.push(skill)
}

function setNoCheck(o: ChaseObstacle, index: number, noCheck: boolean) {
  const opt = o.options[index]
  if (noCheck) { opt.dc = undefined; opt.skills = [] }
  else opt.dc = helperDC.value
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

function optionSummary(o: ChaseObstacle): string {
  return o.options
    .map(opt => `${opt.dc !== undefined ? `DC ${opt.dc} ` : ''}${opt.skills.join(' or ') || 'no check'}`)
    .join(' · ')
}
</script>

<template>
  <div class="h-full overflow-y-auto flex flex-col gap-3 pr-1">
    <!-- Actions -->
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-base lg:text-lg font-semibold">Chase Builder</h2>
      <span v-if="!saved" class="text-[0.6875rem] text-dim">not saved yet</span>
      <div class="ml-auto flex gap-1">
        <button class="btn-secondary btn-sm" @click="emit('new')">New</button>
        <button class="btn-secondary btn-sm" @click="emit('save')">Save</button>
        <button class="btn-primary btn-sm" :disabled="problems.length > 0" :title="problems[0] ?? 'Save and start running this chase'" @click="emit('start')">Start chase</button>
      </div>
    </div>

    <div v-if="problems.length" class="bg-danger-subtle border border-danger p-2 text-[0.75rem]">
      <div v-for="p in problems" :key="p">{{ p }}</div>
    </div>
    <div v-if="advice.length" class="bg-elevated border border-[var(--color-border)] p-2 text-[0.75rem] text-dim">
      <div v-for="a in advice" :key="a">{{ a }}</div>
    </div>

    <!-- Basics -->
    <div class="card p-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[0.75rem]">
      <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Name</span><input v-model="chase.name" class="input input-sm" /></label>
      <label class="flex flex-col gap-1"><span class="uppercase text-dim">Party level</span><input v-model.number="chase.level" type="number" min="1" max="20" class="input input-sm" /></label>
      <label class="flex flex-col gap-1"><span class="uppercase text-dim">A round is</span><input v-model="chase.roundLength" class="input input-sm" placeholder="3 actions, 10 minutes, a day" /></label>
      <label class="flex flex-col gap-1 col-span-2 lg:col-span-4"><span class="uppercase text-dim">Description</span><textarea v-model="chase.description" rows="2" class="input input-sm"></textarea></label>
    </div>

    <!-- Type -->
    <div class="card p-3 flex flex-col gap-2">
      <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">Type of chase</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-1">
        <button v-for="t in TYPES" :key="t" class="btn-xs" :class="chase.type === t ? 'btn-primary' : 'btn-secondary'" @click="setType(t)">{{ CHASE_TYPE_LABELS[t] }}</button>
      </div>
      <p class="text-[0.75rem] text-dim">{{ CHASE_TYPE_SUMMARIES[chase.type] }}</p>
    </div>

    <!-- Sides -->
    <div class="card p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">Sides</h3>
        <button class="btn-secondary btn-xs ml-auto" @click="addSide">+ Side</button>
      </div>
      <div v-for="side in chase.sides" :key="side.id" class="bg-elevated p-2 grid grid-cols-2 lg:grid-cols-6 gap-2 text-[0.75rem] items-end">
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Name</span><input v-model="side.name" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Role</span>
          <select v-model="side.role" class="input input-sm select">
            <option value="pursued">Pursued</option>
            <option value="pursuer">Pursuer</option>
            <option value="competitor">Competitor</option>
          </select>
        </label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Moves by</span>
          <select v-model="side.control" class="input input-sm select" :disabled="side.isPlayers">
            <option value="checks">Rolling checks</option>
            <option value="steady">Steady pace</option>
          </select>
        </label>
        <label v-if="side.control === 'steady'" class="flex flex-col gap-1"><span class="uppercase text-dim">Obstacles per round</span><input v-model.number="side.pace" type="number" min="0" max="5" class="input input-sm" /></label>
        <label v-else class="flex flex-col gap-1"><span class="uppercase text-dim">Default modifier</span><input v-model.number="side.rollModifier" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1" title="Obstacle the side starts at. 0 is the start line, before the first obstacle."><span class="uppercase text-dim">Starts at</span>
          <input :value="side.position + 1" type="number" :min="side.control === 'steady' ? 0 : 1" :max="Math.max(1, chase.obstacles.length)" class="input input-sm" @change="side.position = Number(($event.target as HTMLInputElement).value) - 1" />
        </label>
        <div class="col-span-2 lg:col-span-6 flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1"><input type="radio" :checked="side.isPlayers" @change="setPlayers(side)" /> the party</label>
          <span class="text-dim">{{ side.members.length }} member{{ side.members.length === 1 ? '' : 's' }}, {{ side.vehicles.length }} vehicle{{ side.vehicles.length === 1 ? '' : 's' }}</span>
          <span v-for="v in side.vehicles" :key="v.instanceId" class="trait bg-surface text-dim cursor-pointer" title="Remove" @click="side.vehicles = side.vehicles.filter(x => x.instanceId !== v.instanceId)">{{ v.label }} ×</span>
          <button class="btn-secondary btn-xs" @click="emit('add-vehicle', side.id)">+ Vehicle</button>
          <button v-if="chase.sides.length > 1" class="btn-icon-tiny text-danger ml-auto" title="Remove side" @click="removeSide(side)">×</button>
        </div>
      </div>
      <p class="text-[0.6875rem] text-dim">Add members in the tracker once the chase starts. The pursued act first each round.</p>
    </div>

    <!-- Ending -->
    <div class="card p-3 flex flex-col gap-2 text-[0.75rem]">
      <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">How it ends</h3>
      <p class="text-dim">Clearing the last obstacle always ends the chase for that side. The tracker points out when a condition is met and asks before ending.</p>
      <label class="flex items-center gap-2"><input v-model="chase.end.catchEnds" type="checkbox" /> A pursuer reaching the obstacle the pursued are on catches them</label>
      <label class="flex items-center gap-2">
        <input type="checkbox" :checked="chase.end.leadToEscape !== null" @change="chase.end.leadToEscape = ($event.target as HTMLInputElement).checked ? 3 : null" />
        The pursued get away when
        <input v-model.number="chase.end.leadToEscape" type="number" min="1" class="input input-sm w-14" :disabled="chase.end.leadToEscape === null" />
        obstacles ahead at the end of a round
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" :checked="chase.end.roundLimit !== null" @change="chase.end.roundLimit = ($event.target as HTMLInputElement).checked ? Math.max(1, chase.obstacles.length) : null" />
        Time runs out after
        <input v-model.number="chase.end.roundLimit" type="number" min="1" class="input input-sm w-14" :disabled="chase.end.roundLimit === null" />
        rounds
      </label>
    </div>

    <!-- DC helper -->
    <div class="card p-3 flex flex-col gap-2 text-[0.75rem]">
      <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">DC helper</h3>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="dcBasis" class="input input-sm select w-36">
          <option value="simple">Simple DC</option>
          <option value="level">Level-based DC</option>
        </select>
        <select v-if="dcBasis === 'simple'" v-model="dcRank" class="input input-sm select w-36">
          <option v-for="(dc, rank) in SIMPLE_DCS" :key="rank" :value="rank">{{ rank }} ({{ dc }})</option>
        </select>
        <label v-else class="flex items-center gap-1">level <input v-model.number="dcLevel" type="number" min="0" max="20" class="input input-sm w-14" /></label>
        <select v-model="dcDifficulty" class="input input-sm select w-44">
          <option v-for="(adj, name) in DC_ADJUSTMENTS" :key="name" :value="name">{{ name }} ({{ adj > 0 ? '+' : '' }}{{ adj }})</option>
        </select>
        <span class="font-mono font-bold text-base text-rollable">DC {{ helperDC }}</span>
      </div>
      <p class="text-dim">The book uses simple DCs at a rank that fits the party's level. Give each obstacle one easy or very easy approach and one standard or hard approach. New approaches start at the DC shown here.</p>
    </div>

    <!-- Obstacles -->
    <div class="card p-3 flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-[0.6875rem] font-semibold uppercase tracking-widest text-dim">Obstacles ({{ chase.obstacles.length }})</h3>
        <div class="flex gap-1">
          <button
            v-for="l in LENGTHS"
            :key="l"
            class="btn-xs capitalize"
            :class="chase.length === l ? 'btn-primary' : 'btn-secondary'"
            :title="`${OBSTACLES_BY_LENGTH[l]} obstacles, about ${PLAY_TIME_BY_LENGTH[l]} of play`"
            @click="setLength(l)"
          >{{ l }} {{ OBSTACLES_BY_LENGTH[l] }}</button>
        </div>
        <div class="ml-auto flex gap-1">
          <button class="btn-secondary btn-xs" :title="`Alternate ${suggestedChasePoints(partySize, 0)} and ${suggestedChasePoints(partySize, 1)} for a party of ${partySize}`" @click="applySuggestedPoints">Suggest Chase Points</button>
          <button class="btn-secondary btn-xs" @click="emit('open-obstacles')">+ From samples</button>
          <button class="btn-primary btn-xs" @click="addObstacle">+ Blank</button>
        </div>
      </div>

      <div v-for="(o, index) in chase.obstacles" :key="o.id" class="bg-elevated">
        <div class="flex items-center gap-2 p-2 cursor-pointer" @click="expanded = expanded === o.id ? null : o.id">
          <span class="font-mono font-bold text-dim w-6 text-right">{{ index + 1 }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm truncate">{{ o.name }} <span v-if="index === chase.obstacles.length - 1" class="text-[0.625rem] text-dim font-normal">last obstacle</span></div>
            <div class="text-[0.6875rem] text-dim truncate">{{ o.chasePoints }} Chase Point{{ o.chasePoints === 1 ? '' : 's' }} · {{ optionSummary(o) }}</div>
          </div>
          <button class="btn-icon-tiny" title="Move up" :disabled="index === 0" @click.stop="move(index, -1)">↑</button>
          <button class="btn-icon-tiny" title="Move down" :disabled="index === chase.obstacles.length - 1" @click.stop="move(index, 1)">↓</button>
          <button class="btn-icon-tiny" title="Duplicate" @click.stop="duplicateObstacle(index)">⧉</button>
          <button class="btn-icon-tiny text-danger" title="Remove" @click.stop="removeObstacle(index)">×</button>
        </div>

        <div v-if="expanded === o.id" class="p-2 pt-0 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[0.75rem]">
          <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Name</span><input v-model="o.name" class="input input-sm" /></label>
          <label class="flex flex-col gap-1"><span class="uppercase text-dim">Level</span><input v-model.number="o.level" type="number" min="0" max="20" class="input input-sm" /></label>
          <label class="flex flex-col gap-1" :title="`Suggested for a party of ${partySize}: ${suggestedChasePoints(partySize, index)}`"><span class="uppercase text-dim">Chase Points</span><input v-model.number="o.chasePoints" type="number" min="1" class="input input-sm" /></label>
          <label class="flex flex-col gap-1 col-span-2 lg:col-span-4"><span class="uppercase text-dim">What the players see</span><textarea v-model="o.description" rows="2" class="input input-sm" placeholder="Throngs of people crowd the corridors..."></textarea></label>
          <label class="flex flex-col gap-1 col-span-2 lg:col-span-4"><span class="uppercase text-dim">GM notes, never shown to players</span><textarea v-model="o.notes" rows="1" class="input input-sm"></textarea></label>

          <div class="col-span-2 lg:col-span-4 flex flex-col gap-2">
            <div v-for="(opt, oi) in o.options" :key="opt.id" class="bg-surface p-2 flex flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="uppercase text-dim">Approach {{ oi + 1 }}</span>
                <label class="flex items-center gap-1"><input type="checkbox" :checked="opt.dc === undefined" @change="setNoCheck(o, oi, ($event.target as HTMLInputElement).checked)" /> no check needed</label>
                <label v-if="opt.dc !== undefined" class="flex items-center gap-1">DC <input v-model.number="opt.dc" type="number" min="0" class="input input-sm w-16" /></label>
                <button v-if="opt.dc !== undefined" class="btn-secondary btn-xs" title="Use the DC from the helper above" @click="opt.dc = helperDC">Use {{ helperDC }}</button>
                <button class="btn-icon-tiny text-danger ml-auto" title="Remove approach" @click="o.options.splice(oi, 1)">×</button>
              </div>
              <div v-if="opt.dc !== undefined" class="flex flex-wrap gap-1">
                <button
                  v-for="c in CHECKS"
                  :key="c"
                  class="trait cursor-pointer"
                  :class="opt.skills.includes(c) ? 'bg-accent text-on-accent' : 'bg-elevated text-dim'"
                  @click="toggleSkill(opt.skills, c)"
                >{{ c }}</button>
              </div>
              <label class="flex items-center gap-1"><span class="text-dim shrink-0">to</span><input v-model="opt.description" class="input input-sm flex-1" placeholder="weave or push through" /></label>
            </div>
            <button class="btn-secondary btn-xs self-start" @click="addOption(o)">+ Approach</button>
          </div>
        </div>
      </div>

      <div v-if="chase.obstacles.length === 0" class="text-dim text-[0.75rem] py-2">No obstacles yet. Add some from the samples or start a blank one.</div>
    </div>
  </div>
</template>
