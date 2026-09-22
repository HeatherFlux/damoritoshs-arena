<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { usePartyStore } from '../../stores/partyStore'
import type { FrameId, PlayerStarship, PlayerStation, StationKind } from '../../types/tsc'
import { FRAMES, FRAME_LIST } from '../../data/tscFrames'
import { STATION_KINDS, STATION_HELMED_BONUS, STATION_GRADES, TSC_STATION_ACTIONS } from '../../data/tscStations'
import { TSC_WEAPONS } from '../../data/tscWeapons'
import { TSC_EXPANSION_BAYS, expansionBaySlotsUsed, expansionBayBonusSlots } from '../../data/tscExpansionBays'
import { getStationUpgrade, upgradesForStation, upgradeTypeAtLevel } from '../../data/tscStationUpgrades'
import { createPlayerStarship, deriveStarshipStats, setPlayerStarshipLevel } from '../../utils/tscDerive'
import { formatMod } from '../../utils/tscStatBlock'

const props = defineProps<{
  /** Sheet to edit; null starts a new ship. */
  ship: PlayerStarship | null
}>()

const emit = defineEmits<{ (e: 'saved', ship: PlayerStarship): void }>()

const store = useTscStore()
const partyStore = usePartyStore()

const partyLevel = computed(() => partyStore.partyLevel.value || 1)
const draft = ref<PlayerStarship>(clone(props.ship) ?? createPlayerStarship('explorer', partyLevel.value))
const dirty = ref(false)

watch(() => props.ship, (s) => {
  draft.value = clone(s) ?? createPlayerStarship('explorer', partyLevel.value)
  dirty.value = false
})

watch(draft, () => { dirty.value = true }, { deep: true })

function clone<T>(v: T | null): T | null {
  return v ? JSON.parse(JSON.stringify(v)) : null
}

const derived = computed(() => deriveStarshipStats(draft.value))
const frame = computed(() => FRAMES[draft.value.frame])
const customStations = computed(() => draft.value.stations.filter(s => s.slot === 'custom'))
const baySlots = computed(() => frame.value.expansionBays + expansionBayBonusSlots(draft.value.expansionBays))
const baySlotsUsed = computed(() => expansionBaySlotsUsed(draft.value.expansionBays))
const partyNames = computed(() => partyStore.getPartyPlayers().map(p => p.name))

function setFrame(id: FrameId) {
  if (id === draft.value.frame) return
  const fresh = createPlayerStarship(id, draft.value.level, draft.value.name)
  // Keep custom stations and bays; default stations come from the new frame.
  draft.value = {
    ...draft.value,
    frame: id,
    stations: [...fresh.stations, ...customStations.value],
    currentHP: fresh.currentHP,
    currentSP: fresh.currentSP,
  }
}

function setLevel(level: number) {
  const clamped = Math.max(1, Math.min(20, Math.floor(level || 1)))
  draft.value = setPlayerStarshipLevel(draft.value, clamped)
}

function derivedFor(station: PlayerStation) {
  return derived.value.stations.find(s => s.id === station.id)
}

function defaultUpgradeId(station: PlayerStation): string | undefined {
  return frame.value.defaultStations.find(d => d.kind === station.kind)?.upgradeId
}

function addStation(kind: StationKind) {
  if (customStations.value.length >= frame.value.customStationSlots) return
  draft.value.stations.push({ id: crypto.randomUUID(), kind, slot: 'custom', upgrades: [], malfunctioning: false })
}

function removeStation(id: string) {
  const idx = draft.value.stations.findIndex(s => s.id === id && s.slot === 'custom')
  if (idx !== -1) draft.value.stations.splice(idx, 1)
}

function changeStationKind(station: PlayerStation, kind: StationKind) {
  station.kind = kind
  station.upgrades = []
  station.weaponIds = kind === 'gunnery' ? station.weaponIds : undefined
}

function availableUpgrades(station: PlayerStation) {
  return upgradesForStation(station.kind).map(u => ({ upgrade: u, type: upgradeTypeAtLevel(u, draft.value.level) }))
}

function toggleUpgrade(station: PlayerStation, id: string) {
  const idx = station.upgrades.indexOf(id)
  if (idx !== -1) {
    station.upgrades.splice(idx, 1)
    return
  }
  const slots = derivedFor(station)?.upgradeSlots ?? 0
  if (station.upgrades.length >= slots) return
  station.upgrades.push(id)
}

function weaponSlots(station: PlayerStation): number {
  return station.upgrades.includes('secondary-armaments') ? 2 : 1
}

function setWeapon(station: PlayerStation, slot: number, id: string) {
  const list = [...(station.weaponIds ?? [])]
  if (id) list[slot] = id
  else list.splice(slot, 1)
  station.weaponIds = list.filter(Boolean).slice(0, weaponSlots(station))
}

function toggleBay(id: string) {
  const bays = draft.value.expansionBays
  const idx = bays.indexOf(id)
  if (idx !== -1) {
    bays.splice(idx, 1)
    return
  }
  const bay = TSC_EXPANSION_BAYS.find(b => b.id === id)
  if (!bay) return
  if (bay.group) {
    for (const other of TSC_EXPANSION_BAYS.filter(b => b.group === bay.group)) {
      const i = bays.indexOf(other.id)
      if (i !== -1) bays.splice(i, 1)
    }
  }
  if (!bay.universal && !bay.slotFree && baySlotsUsed.value >= baySlots.value) return
  bays.push(id)
}

function stationActionsFor(station: PlayerStation) {
  const d = derivedFor(station)
  if (!d) return []
  const gradeIdx = STATION_GRADES.indexOf(d.grade)
  return TSC_STATION_ACTIONS.filter(a => a.station === station.kind && STATION_GRADES.indexOf(a.grade) <= gradeIdx)
}

function helmedBonusText(station: PlayerStation): string {
  const d = derivedFor(station)
  if (!d) return ''
  const b = STATION_HELMED_BONUS[station.kind][STATION_GRADES.indexOf(d.grade)]
  const parts: string[] = []
  if (b.ac) parts.push(`AC +${b.ac}`)
  if (b.fort) parts.push(`Fort +${b.fort}`)
  if (b.ref) parts.push(`Ref +${b.ref}`)
  if (b.will) parts.push(`Will +${b.will}`)
  if (b.sensorRange) parts.push(`sensors +${b.sensorRange}`)
  if (b.damageDice) parts.push(`${b.damageDice} damage ${b.damageDice === 1 ? 'die' : 'dice'}`)
  if (b.tracking) parts.push(`tracking +${b.tracking}`)
  if (b.drones) parts.push(`${b.drones} drone${b.drones === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function save() {
  const saved = store.savePlayerShip(draft.value)
  draft.value = clone(saved)!
  dirty.value = false
  emit('saved', saved)
}

function newShip() {
  draft.value = createPlayerStarship('explorer', partyLevel.value)
  dirty.value = true
}

function useInScene() {
  if (!store.state.activeScene) {
    alert('Start a tactical scene first (add a starship or hazard from the Library).')
    return
  }
  const saved = store.savePlayerShip(draft.value)
  store.loadPlayerShipIntoScene(saved.id)
  dirty.value = false
}

function resetDamage() {
  draft.value.currentHP = derived.value.maxHP
  draft.value.currentSP = derived.value.maxSP
  draft.value.compromised = 0
  draft.value.wrecked = 0
  draft.value.inoperable = false
  draft.value.offKilter = false
  for (const st of draft.value.stations) st.malfunctioning = false
}
</script>

<template>
  <div class="flex flex-col gap-3 h-full overflow-y-auto pr-1">
    <!-- Header / identity -->
    <div class="card p-3 flex flex-col gap-2">
      <div class="flex flex-wrap items-end gap-2">
        <label class="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <span class="text-[0.625rem] uppercase tracking-widest text-dim">Starship name</span>
          <input v-model="draft.name" class="input input-sm" placeholder="Starship name" />
        </label>
        <label class="flex flex-col gap-1 w-24">
          <span class="text-[0.625rem] uppercase tracking-widest text-dim">Level</span>
          <input :value="draft.level" type="number" min="1" max="20" class="input input-sm" @change="setLevel(Number(($event.target as HTMLInputElement).value))" />
        </label>
        <button class="btn-secondary btn-xs" :title="`Match party level (${partyLevel})`" @click="setLevel(partyLevel)">Party Lvl {{ partyLevel }}</button>
        <div class="ml-auto flex gap-1">
          <button class="btn-secondary btn-sm" @click="newShip">New</button>
          <button class="btn-secondary btn-sm" @click="useInScene">Use in scene</button>
          <button class="btn-primary btn-sm" :disabled="!dirty && !!ship" @click="save">Save</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <button
          v-for="f in FRAME_LIST"
          :key="f.id"
          class="text-left p-2 border transition-colors"
          :class="draft.frame === f.id ? 'border-accent bg-accent-subtle' : 'border-border bg-elevated hover:border-accent'"
          @click="setFrame(f.id)"
        >
          <div class="font-semibold text-sm">{{ f.name }} <span class="text-[0.625rem] text-dim uppercase ml-1">sensors {{ f.sensorRange }} · speed {{ f.levels[draft.level - 1].speed }}</span></div>
          <div class="text-[0.6875rem] text-dim">{{ f.description }}</div>
        </button>
      </div>
    </div>

    <!-- Derived stats -->
    <div class="card p-3">
      <div class="grid grid-cols-4 md:grid-cols-8 gap-2 text-center">
        <div v-for="stat in [
          ['Hull', `${draft.currentHP}/${derived.maxHP}`],
          ['Shields', `${draft.currentSP}/${derived.maxSP}`],
          ['AC', String(derived.ac)],
          ['Fort', formatMod(derived.fort)],
          ['Ref', formatMod(derived.ref)],
          ['Will', formatMod(derived.will)],
          ['Speed', `${derived.speed} zones`],
          ['Sensors', `${derived.sensorRange} zones`],
        ]" :key="stat[0]" class="bg-elevated p-1.5">
          <div class="text-[0.625rem] uppercase text-dim">{{ stat[0] }}</div>
          <div class="font-bold">{{ stat[1] }}</div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 items-center mt-2 text-[0.6875rem]">
        <label class="flex items-center gap-1">Piloting DC
          <input v-model.number="draft.pilotingDC" type="number" class="input input-sm w-16" placeholder="—" />
          <span class="text-dim">(replaces AC when higher while the pilot's console is helmed)</span>
        </label>
        <span v-if="draft.wrecked" class="trait border-warning text-warning">wrecked {{ draft.wrecked }}</span>
        <span v-if="draft.compromised" class="trait border-danger text-danger">compromised {{ draft.compromised }}</span>
        <button class="btn-secondary btn-xs ml-auto" @click="resetDamage">Full repair</button>
      </div>
    </div>

    <!-- Battle stations -->
    <div class="card p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Battle Stations <span class="text-dim font-normal text-xs">{{ customStations.length }}/{{ frame.customStationSlots }} custom slots</span></h3>
        <div class="flex gap-1 flex-wrap">
          <button
            v-for="kind in STATION_KINDS"
            :key="kind"
            class="btn-secondary btn-xs"
            :disabled="customStations.length >= frame.customStationSlots"
            @click="addStation(kind)"
          >+ {{ kind }}</button>
        </div>
      </div>

      <div v-for="station in draft.stations" :key="station.id" class="bg-elevated p-2 flex flex-col gap-1.5 border-l-3" :class="station.slot === 'default' ? 'border-l-accent' : 'border-l-success'">
        <div class="flex flex-wrap items-center gap-2">
          <select v-if="station.slot === 'custom'" :value="station.kind" class="input input-sm select w-40" @change="changeStationKind(station, ($event.target as HTMLSelectElement).value as StationKind)">
            <option v-for="kind in STATION_KINDS" :key="kind" :value="kind">{{ kind }}</option>
          </select>
          <span v-else class="font-semibold capitalize w-40">{{ station.kind }} <span class="text-[0.625rem] text-dim uppercase">default</span></span>
          <span class="text-[0.6875rem] uppercase tracking-wide text-accent">{{ derivedFor(station)?.grade }}</span>
          <span class="text-[0.6875rem] text-dim">{{ helmedBonusText(station) || 'no helmed bonus yet' }}</span>
          <label class="flex items-center gap-1 text-[0.6875rem] ml-auto">Helmed by
            <input v-model="station.helmedBy" list="tsc-party-names" class="input input-sm w-32" placeholder="—" />
          </label>
          <button v-if="station.slot === 'custom'" class="btn-icon-sm text-danger" title="Remove station" @click="removeStation(station.id)">×</button>
        </div>

        <div v-if="station.kind === 'gunnery'" class="flex flex-wrap gap-2 items-center text-[0.6875rem]">
          <span class="text-dim">Weapon{{ weaponSlots(station) > 1 ? 's' : '' }}</span>
          <select v-for="slot in weaponSlots(station)" :key="slot" :value="station.weaponIds?.[slot - 1] ?? ''" class="input input-sm select w-56" @change="setWeapon(station, slot - 1, ($event.target as HTMLSelectElement).value)">
            <option value="">— none —</option>
            <option v-for="w in TSC_WEAPONS" :key="w.id" :value="w.id">{{ w.name }} ({{ w.proficiency }}, {{ w.damageDie }} {{ w.damageType }}, {{ w.range }} zones)</option>
          </select>
          <span v-if="derivedFor(station)" class="text-dim">{{ derivedFor(station)!.damageDice }} dice<span v-if="derivedFor(station)!.tracking"> · tracking +{{ derivedFor(station)!.tracking }}</span></span>
        </div>

        <div class="flex flex-wrap gap-1 items-center text-[0.6875rem]">
          <span class="text-dim">Upgrades {{ station.upgrades.length }}/{{ derivedFor(station)?.upgradeSlots ?? 0 }}</span>
          <span v-if="defaultUpgradeId(station)" class="trait border-accent text-accent" :title="getStationUpgrade(defaultUpgradeId(station)!)?.summary">{{ getStationUpgrade(defaultUpgradeId(station)!)?.name }} (frame)</span>
          <button
            v-for="{ upgrade, type } in availableUpgrades(station)"
            :key="upgrade.id"
            class="trait"
            :class="station.upgrades.includes(upgrade.id) ? 'border-success text-success' : type ? '' : 'opacity-40'"
            :disabled="!type && !station.upgrades.includes(upgrade.id)"
            :title="`${upgrade.summary}${upgrade.prerequisite ? ` Prerequisite: ${upgrade.prerequisite}.` : ''}${type ? ` (${type.type}, level ${type.level})` : ` (level ${upgrade.level}+)`}`"
            @click="toggleUpgrade(station, upgrade.id)"
          >{{ upgrade.name }}<span v-if="type && type.type !== 'commercial'" class="text-dim"> · {{ type.type }}</span></button>
        </div>

        <details class="text-[0.6875rem]">
          <summary class="cursor-pointer text-dim">Station actions at this grade</summary>
          <ul class="mt-1 flex flex-col gap-0.5">
            <li v-for="a in stationActionsFor(station)" :key="a.id"><span class="font-semibold text-accent">{{ a.name }}</span> <span class="text-dim">{{ a.summary }}</span></li>
          </ul>
        </details>
      </div>
    </div>

    <!-- Expansion bays -->
    <div class="card p-3 flex flex-col gap-2">
      <h3 class="text-sm font-semibold">Expansion Bays <span class="text-dim font-normal text-xs">{{ baySlotsUsed }}/{{ baySlots }} slots · universal bays are free</span></h3>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="bay in TSC_EXPANSION_BAYS"
          :key="bay.id"
          class="trait"
          :class="draft.expansionBays.includes(bay.id) ? 'border-success text-success' : bay.universal || bay.slotFree ? 'text-dim' : ''"
          :title="bay.summary"
          @click="toggleBay(bay.id)"
        >{{ bay.name }}</button>
      </div>
    </div>

    <label class="card p-3 flex flex-col gap-1">
      <span class="text-[0.625rem] uppercase tracking-widest text-dim">Notes</span>
      <textarea v-model="draft.notes" class="input text-xs" rows="3" placeholder="Map notes, crew assignments, house rules..."></textarea>
    </label>

    <datalist id="tsc-party-names">
      <option v-for="n in partyNames" :key="n" :value="n" />
    </datalist>
  </div>
</template>
