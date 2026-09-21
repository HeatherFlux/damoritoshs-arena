<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import type { ActionCost, NpcStarship, Rarity, StarshipSize, TscAbility, TscAttack } from '../../types/tsc'
import { NPC_SIZE_DEFAULTS, npcFortifyFor, STATION_KINDS } from '../../data/tscStations'
import { TSC_SHARED_ABILITIES } from '../../data/tscSharedAbilities'
import { getDCForLevel } from '../../utils/dcTable'
import TscStarshipStatBlock from './TscStarshipStatBlock.vue'

const props = defineProps<{
  /** Ship to edit or clone; null starts from a blank commercial-grade hull. */
  ship: NpcStarship | null
  /** When true the ship keeps its id (edit); otherwise a new custom id is minted (clone / new). */
  editing?: boolean
}>()

const emit = defineEmits<{ (e: 'saved', ship: NpcStarship): void }>()

const store = useTscStore()

const SIZES: StarshipSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'unique']
const ACTION_COSTS: { value: ActionCost | ''; label: string }[] = [
  { value: '', label: '— passive —' }, { value: 1, label: '1 action' }, { value: 2, label: '2 actions' }, { value: 3, label: '3 actions' },
  { value: 'reaction', label: 'reaction' }, { value: 'free', label: 'free action' },
]

function blankShip(): NpcStarship {
  return {
    id: '',
    name: 'New Starship',
    level: 1,
    source: 'Custom',
    faction: 'Custom',
    factionSlug: 'custom',
    rarity: 'common',
    size: 'medium',
    traits: ['tech'],
    perception: 7,
    sensorRange: 4,
    skills: { Piloting: 7, Computers: 5 },
    battleStations: [
      { name: 'generator', entries: [{ name: 'Fortify Shield Points', kind: 'action', shared: false }] },
      { name: 'gunnery', entries: [{ name: 'light laser cannon', kind: 'weapon', shared: false }] },
      { name: "pilot's console", entries: [{ name: 'Boost Thrusters', kind: 'action', shared: false }, { name: 'Change Heading', kind: 'action', shared: false }] },
    ],
    abilities: { str: 0, dex: 2, con: 1, int: 0, wis: 1, cha: 0 },
    ac: 16,
    saves: { fort: 6, ref: 8, will: 5 },
    hp: 20,
    sp: 8,
    fortify: 5,
    immunities: ['starship immunities'],
    weaknesses: [],
    resistances: [],
    speed: 4,
    attacks: [{ mode: 'ranged', name: 'light laser cannon', actions: 1, traits: ['tech'], bonus: 7, rangeIncrement: 5, damage: '1d8+3 fire' }],
    specialAbilities: [],
  }
}

function cloneOf(s: NpcStarship | null, editing: boolean): NpcStarship {
  if (!s) return blankShip()
  const copy: NpcStarship = JSON.parse(JSON.stringify(s))
  if (!editing) {
    copy.id = ''
    if (!store.isCustomStarship(s.id)) copy.name = `${s.name} (Custom)`
    copy.source = 'Custom'
  }
  return copy
}

const draft = ref<NpcStarship>(cloneOf(props.ship, !!props.editing))
watch(() => props.ship, s => { draft.value = cloneOf(s, !!props.editing) })

// ---- text <-> list helpers ----
const listText = (arr: string[]) => arr.join(', ')
const parseList = (text: string) => text.split(',').map(t => t.trim()).filter(Boolean)
const skillsText = computed({
  get: () => Object.entries(draft.value.skills).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', '),
  set: (text: string) => {
    const skills: Record<string, number> = {}
    for (const m of text.matchAll(/([A-Za-z][A-Za-z ]+?)\s*([+\-]?\d+)/g)) skills[m[1].trim()] = Number(m[2])
    draft.value.skills = skills
  },
})

function stationEntriesText(idx: number): string {
  return draft.value.battleStations[idx].entries.map(e => `${e.name}${e.count ? ` ×${e.count}` : ''}${e.shared ? '*' : ''}`).join(', ')
}

function setStationEntries(idx: number, text: string) {
  const attackNames = new Set(draft.value.attacks.map(a => a.name.toLowerCase()))
  draft.value.battleStations[idx].entries = parseList(text).map(raw => {
    const shared = raw.endsWith('*')
    const name = raw.replace(/\*$/, '').trim()
    const kind = attackNames.has(name.toLowerCase()) || /^[a-z]/.test(name) ? 'weapon' : 'action'
    return { name, kind, shared }
  })
}

function addStation(name: string) {
  draft.value.battleStations.push({ name, entries: [] })
}

function addAttack() {
  draft.value.attacks.push({ mode: 'ranged', name: 'weapon', actions: 1, traits: [], bonus: 5 + draft.value.level, damage: '1d8 fire', rangeIncrement: 3 })
}

function addAbility() {
  draft.value.specialAbilities.push({ name: 'New Ability', actions: 1, effect: '', placement: 'offense' })
}

const sharedPick = ref('')
function addSharedAbility() {
  const src = TSC_SHARED_ABILITIES.find(a => a.id === sharedPick.value)
  if (!src) return
  const copy: TscAbility = { ...JSON.parse(JSON.stringify(src)), sharedRef: src.id, placement: 'offense' }
  delete (copy as Partial<typeof src>).id
  delete (copy as Partial<typeof src>).scope
  delete (copy as Partial<typeof src>).page
  draft.value.specialAbilities.push(copy)
  sharedPick.value = ''
}

function abilityActions(ab: TscAbility): ActionCost | '' {
  return ab.actions ?? ''
}
function setAbilityActions(ab: TscAbility, v: string) {
  if (v === '') delete ab.actions
  else ab.actions = (/^\d$/.test(v) ? Number(v) : v) as ActionCost
}
function outcomesText(ab: TscAbility, key: keyof NonNullable<TscAbility['outcomes']>): string {
  return ab.outcomes?.[key] ?? ''
}
function setOutcome(ab: TscAbility, key: keyof NonNullable<TscAbility['outcomes']>, v: string) {
  if (!ab.outcomes) ab.outcomes = {}
  if (v) ab.outcomes[key] = v
  else delete ab.outcomes[key]
  if (!Object.keys(ab.outcomes).length) delete ab.outcomes
}

function applySizeDefaults() {
  const d = NPC_SIZE_DEFAULTS[draft.value.size]
  if (d) {
    draft.value.speed = d.speed
    draft.value.sensorRange = d.sensorRange
  }
}

function applyFortify() {
  if (draft.value.sp !== undefined) draft.value.fortify = npcFortifyFor(draft.value.sp)
}

function toggleShields(on: boolean) {
  if (on) {
    draft.value.sp = draft.value.sp ?? Math.max(5, Math.round(draft.value.hp / 4))
    applyFortify()
  } else {
    delete draft.value.sp
    delete draft.value.fortify
  }
}

/** GM Core's "creature HP" total the ship represents: each Shield Point counts double (p. 207). */
const creatureHpEquivalent = computed(() => draft.value.hp + 2 * (draft.value.sp ?? 0))
const levelDC = computed(() => getDCForLevel(draft.value.level))
const attackSaveType = (atk: TscAttack) => atk.saveType ?? ''

const errors = computed(() => {
  const e: string[] = []
  if (!draft.value.name.trim()) e.push('Name is required')
  if (!draft.value.battleStations.length) e.push('At least one battle station')
  if (!('Piloting' in draft.value.skills)) e.push('All starships need a Piloting skill')
  if (draft.value.sp !== undefined && !draft.value.battleStations.some(s => s.name === 'generator')) e.push('Shield Points need a generator (or an organelle acting as one)')
  return e
})

function save() {
  if (errors.value.length) return
  const saved = store.addCustomStarship({
    ...draft.value,
    id: draft.value.id || draft.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    traits: draft.value.traits.map(t => t.toLowerCase()),
  })
  draft.value = JSON.parse(JSON.stringify(saved))
  emit('saved', saved)
}

function reset() {
  draft.value = blankShip()
}
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-[1fr_minmax(20rem,28rem)] gap-3 h-full overflow-hidden">
    <div class="flex flex-col gap-3 overflow-y-auto pr-1">
      <!-- Guidance -->
      <div class="card p-3 text-[0.6875rem] text-dim flex flex-col gap-1">
        <p class="text-text font-semibold text-sm">Custom NPC starship <span class="font-normal text-dim">(Tech Core p. 206–207)</span></p>
        <p>Build it like a creature of its level (GM Core Building Creatures). Every starship needs Piloting; tech ships add Computers and Crafting, living and magic ships add Arcana, Nature, Occultism, or Religion. Speed and sensors default by size: Tiny 5/3, Small 4/4, Medium 4/4, Large 3/5, Huge 2/6, Gargantuan 2/7 zones. Each Shield Point counts as two Hit Points of the creature budget; max SP is about a quarter of HP (never below 5) and fortify is half max SP (5 if SP ≤ 10). Melee attacks reach 0 zones; only the gunnery can target beyond sensor range; pilot's-console effects reach 1 zone.</p>
        <p>Level-based DC for level {{ draft.level }}: <span class="text-accent font-semibold">{{ levelDC }}</span> · creature HP equivalent: <span class="text-accent font-semibold">{{ creatureHpEquivalent }}</span> (HP {{ draft.hp }} + 2 × SP {{ draft.sp ?? 0 }})</p>
      </div>

      <!-- Identity -->
      <div class="card p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[0.6875rem]">
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Name</span><input v-model="draft.name" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Level</span><input v-model.number="draft.level" type="number" min="-1" max="25" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Rarity</span><select v-model="draft.rarity" class="input input-sm select"><option v-for="r in RARITIES" :key="r" :value="r">{{ r }}</option></select></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Size</span><select v-model="draft.size" class="input input-sm select" @change="applySizeDefaults"><option v-for="s in SIZES" :key="s" :value="s">{{ s }}</option></select></label>
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Traits (comma separated)</span><input :value="listText(draft.traits)" class="input input-sm" @change="draft.traits = parseList(($event.target as HTMLInputElement).value)" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Faction</span><input v-model="draft.faction" class="input input-sm" /></label>
        <label class="flex flex-col gap-1 col-span-2 md:col-span-4"><span class="uppercase text-dim">Description</span><textarea v-model="draft.description" class="input text-xs" rows="2"></textarea></label>
        <label class="flex items-center gap-1 col-span-2"><input type="checkbox" :checked="!!draft.livingStarship" @change="draft.livingStarship = ($event.target as HTMLInputElement).checked || undefined" /> Living starship (organelles instead of stations; no starship immunities)</label>
      </div>

      <!-- Senses, skills, attributes -->
      <div class="card p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[0.6875rem]">
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Perception</span><input v-model.number="draft.perception" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Sensor range (zones)</span><input v-model.number="draft.sensorRange" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Extra senses</span><input v-model="draft.senses" class="input input-sm" placeholder="e.g. nanite scrying" /></label>
        <label class="flex flex-col gap-1 col-span-2 md:col-span-4"><span class="uppercase text-dim">Skills ("Piloting +7, Computers +5")</span><input v-model.lazy="skillsText" class="input input-sm" /></label>
        <label v-for="k in (['str','dex','con','int','wis','cha'] as const)" :key="k" class="flex flex-col gap-1"><span class="uppercase text-dim">{{ k }}</span><input v-model.number="draft.abilities[k]" type="number" class="input input-sm" /></label>
      </div>

      <!-- Defenses -->
      <div class="card p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[0.6875rem]">
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">AC</span><input v-model.number="draft.ac" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Fort</span><input v-model.number="draft.saves.fort" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Ref</span><input v-model.number="draft.saves.ref" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Will</span><input v-model.number="draft.saves.will" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Hull Points</span><input v-model.number="draft.hp" type="number" class="input input-sm" /></label>
        <label class="flex items-center gap-1 self-end"><input type="checkbox" :checked="draft.sp !== undefined" @change="toggleShields(($event.target as HTMLInputElement).checked)" /> has shields</label>
        <label v-if="draft.sp !== undefined" class="flex flex-col gap-1"><span class="uppercase text-dim">Shield Points</span><input v-model.number="draft.sp" type="number" class="input input-sm" @change="applyFortify" /></label>
        <label v-if="draft.sp !== undefined" class="flex flex-col gap-1"><span class="uppercase text-dim">Fortify</span><input v-model.number="draft.fortify" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1"><span class="uppercase text-dim">Speed (zones)</span><input v-model.number="draft.speed" type="number" class="input input-sm" /></label>
        <label class="flex flex-col gap-1 col-span-2 md:col-span-3"><span class="uppercase text-dim">Speed notes</span><input v-model="draft.speedNotes" class="input input-sm" placeholder="e.g. burrow 1 zone" /></label>
        <label class="flex flex-col gap-1 col-span-2 md:col-span-4"><span class="uppercase text-dim">Immunities</span><input :value="listText(draft.immunities)" class="input input-sm" @change="draft.immunities = parseList(($event.target as HTMLInputElement).value)" /></label>
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Weaknesses</span><input :value="listText(draft.weaknesses)" class="input input-sm" @change="draft.weaknesses = parseList(($event.target as HTMLInputElement).value)" /></label>
        <label class="flex flex-col gap-1 col-span-2"><span class="uppercase text-dim">Resistances</span><input :value="listText(draft.resistances)" class="input input-sm" @change="draft.resistances = parseList(($event.target as HTMLInputElement).value)" /></label>
      </div>

      <!-- Battle stations -->
      <div class="card p-3 flex flex-col gap-2 text-[0.6875rem]">
        <div class="flex flex-wrap items-center gap-1">
          <h3 class="font-semibold text-sm text-text">Battle stations</h3>
          <button v-for="k in STATION_KINDS" :key="k" class="btn-secondary btn-xs" @click="addStation(k)">+ {{ k }}</button>
          <button class="btn-secondary btn-xs" @click="addStation('organelle')">+ organelle</button>
        </div>
        <p class="text-dim">List each station's weapons (lowercase, matching an attack) and actions (Title Case). Suffix an action with * when it is shared between stations and needs all of them working.</p>
        <div v-for="(st, i) in draft.battleStations" :key="i" class="flex flex-wrap items-center gap-2 bg-elevated p-1.5">
          <input v-model="st.name" class="input input-sm w-40" />
          <input :value="stationEntriesText(i)" class="input input-sm flex-1 min-w-[12rem]" placeholder="light laser cannon, Lock On, Jousting Charge*" @change="setStationEntries(i, ($event.target as HTMLInputElement).value)" />
          <button class="btn-icon-sm text-danger" @click="draft.battleStations.splice(i, 1)">×</button>
        </div>
      </div>

      <!-- Attacks -->
      <div class="card p-3 flex flex-col gap-2 text-[0.6875rem]">
        <div class="flex items-center gap-2"><h3 class="font-semibold text-sm text-text">Attacks</h3><button class="btn-secondary btn-xs" @click="addAttack">+ attack</button></div>
        <div v-for="(atk, i) in draft.attacks" :key="i" class="grid grid-cols-2 md:grid-cols-6 gap-1.5 bg-elevated p-1.5 items-end">
          <label class="flex flex-col"><span class="uppercase text-dim">Mode</span><select v-model="atk.mode" class="input input-sm select"><option value="melee">Melee</option><option value="ranged">Ranged</option><option value="areaFire">Area Fire</option><option value="autoFire">Auto-Fire</option></select></label>
          <label class="flex flex-col col-span-2"><span class="uppercase text-dim">Weapon</span><input v-model="atk.name" class="input input-sm" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Bonus</span><input :value="atk.bonus ?? ''" type="number" class="input input-sm" @change="atk.bonus = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" /></label>
          <label class="flex flex-col col-span-2"><span class="uppercase text-dim">Damage</span><input v-model="atk.damage" class="input input-sm" placeholder="2d8+7 piercing" /></label>
          <label class="flex flex-col col-span-2"><span class="uppercase text-dim">Traits</span><input :value="listText(atk.traits)" class="input input-sm" @change="atk.traits = parseList(($event.target as HTMLInputElement).value)" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Range incr.</span><input :value="atk.rangeIncrement ?? ''" type="number" class="input input-sm" @change="atk.rangeIncrement = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Area</span><input v-model="atk.area" class="input input-sm" placeholder="1-zone burst" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Save DC</span><input :value="atk.saveDC ?? ''" type="number" class="input input-sm" @change="atk.saveDC = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" /></label>
          <div class="flex items-end gap-1">
            <label class="flex flex-col flex-1"><span class="uppercase text-dim">Save</span><select :value="attackSaveType(atk)" class="input input-sm select" @change="atk.saveType = (($event.target as HTMLSelectElement).value || undefined) as TscAttack['saveType']"><option value="">—</option><option value="fortitude">Fort</option><option value="reflex">Ref</option><option value="will">Will</option></select></label>
            <button class="btn-icon-sm text-danger" @click="draft.attacks.splice(i, 1)">×</button>
          </div>
        </div>
      </div>

      <!-- Abilities -->
      <div class="card p-3 flex flex-col gap-2 text-[0.6875rem]">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold text-sm text-text">Abilities</h3>
          <button class="btn-secondary btn-xs" @click="addAbility">+ ability</button>
          <select v-model="sharedPick" class="input input-sm select w-64">
            <option value="">— add a common action —</option>
            <option v-for="a in TSC_SHARED_ABILITIES" :key="a.id" :value="a.id">{{ a.name }} ({{ a.scope }})</option>
          </select>
          <button class="btn-secondary btn-xs" :disabled="!sharedPick" @click="addSharedAbility">Add</button>
        </div>
        <div v-for="(ab, i) in draft.specialAbilities" :key="i" class="grid grid-cols-2 md:grid-cols-4 gap-1.5 bg-elevated p-1.5">
          <label class="flex flex-col col-span-2"><span class="uppercase text-dim">Name</span><input v-model="ab.name" class="input input-sm" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Cost</span><select :value="abilityActions(ab)" class="input input-sm select" @change="setAbilityActions(ab, ($event.target as HTMLSelectElement).value)"><option v-for="c in ACTION_COSTS" :key="String(c.value)" :value="c.value">{{ c.label }}</option></select></label>
          <div class="flex items-end gap-1">
            <label class="flex flex-col flex-1"><span class="uppercase text-dim">Placement</span><select v-model="ab.placement" class="input input-sm select"><option value="defense">defense</option><option value="offense">offense</option></select></label>
            <button class="btn-icon-sm text-danger" @click="draft.specialAbilities.splice(i, 1)">×</button>
          </div>
          <label class="flex flex-col col-span-2"><span class="uppercase text-dim">Traits</span><input :value="listText(ab.traits ?? [])" class="input input-sm" @change="ab.traits = parseList(($event.target as HTMLInputElement).value)" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Frequency</span><input v-model="ab.frequency" class="input input-sm" /></label>
          <label class="flex flex-col"><span class="uppercase text-dim">Requirements</span><input v-model="ab.requirements" class="input input-sm" /></label>
          <label class="flex flex-col col-span-2 md:col-span-4"><span class="uppercase text-dim">Trigger</span><input v-model="ab.trigger" class="input input-sm" /></label>
          <label class="flex flex-col col-span-2 md:col-span-4"><span class="uppercase text-dim">Effect</span><textarea v-model="ab.effect" class="input text-xs" rows="2"></textarea></label>
          <label v-for="o in (['criticalSuccess','success','failure','criticalFailure'] as const)" :key="o" class="flex flex-col"><span class="uppercase text-dim">{{ o.replace(/([A-Z])/g, ' $1') }}</span><input :value="outcomesText(ab, o)" class="input input-sm" @change="setOutcome(ab, o, ($event.target as HTMLInputElement).value)" /></label>
        </div>
      </div>

      <div class="card p-3 flex flex-wrap items-center gap-2">
        <span v-for="e in errors" :key="e" class="text-danger text-[0.6875rem]">{{ e }}</span>
        <div class="ml-auto flex gap-1">
          <button class="btn-secondary btn-sm" @click="reset">New blank ship</button>
          <button class="btn-primary btn-sm" :disabled="errors.length > 0" @click="save">{{ draft.id ? 'Save changes' : 'Save custom starship' }}</button>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div class="card p-3 overflow-y-auto">
      <h3 class="text-[0.625rem] uppercase tracking-widest text-dim mb-2">Preview</h3>
      <h2 class="font-semibold text-base flex justify-between"><span>{{ draft.name }}</span><span class="text-dim">Starship {{ draft.level }}</span></h2>
      <TscStarshipStatBlock :ship="draft" />
    </div>
  </div>
</template>
