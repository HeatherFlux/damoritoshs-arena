<script setup lang="ts">
/** Live preview of a tactical starship scene while it is being set up. */
import { computed } from 'vue'
import { usePartyStore } from '../../stores/partyStore'
import type { NpcStarship, StarshipHazard, TscSavedScene } from '../../types/tsc'
import { FRAMES } from '../../data/tscFrames'
import { deriveStarshipStats } from '../../utils/tscDerive'
import { formatMod, sizeLabel } from '../../utils/tscStatBlock'
import { sceneThreat } from '../../utils/tscGenerator'
import TscStarshipStatBlock from './TscStarshipStatBlock.vue'
import TscHazardStatBlock from './TscHazardStatBlock.vue'

const props = defineProps<{
  scene: TscSavedScene
  problems: string[]
}>()

const partyStore = usePartyStore()
const partySize = computed(() => partyStore.partySize.value || 4)

const ship = computed(() => props.scene.playerShip)
const derived = computed(() => (ship.value ? deriveStarshipStats(ship.value) : null))
const threat = computed(() => sceneThreat(props.scene.npcShips, props.scene.hazards, props.scene.level, partySize.value))

const tiles = computed(() => {
  const d = derived.value
  if (!d) return []
  return [
    ['Hull', String(d.maxHP)],
    ['Shields', String(d.maxSP)],
    ['AC', String(d.ac)],
    ['Fort', formatMod(d.fort)],
    ['Ref', formatMod(d.ref)],
    ['Will', formatMod(d.will)],
    ['Speed', `${d.speed} zones`],
    ['Sensors', `${d.sensorRange} zones`],
  ]
})

const stations = computed(() => {
  const s = ship.value
  const d = derived.value
  if (!s || !d) return []
  return s.stations.map(st => ({
    id: st.id,
    kind: st.kind,
    grade: d.stations.find(x => x.id === st.id)?.grade ?? '',
    helmedBy: props.scene.pcs.filter(p => p.stationId === st.id).map(p => p.name).join(', '),
  }))
})

function group<T extends { id: string }>(models: T[]): { model: T; count: number }[] {
  const list: { model: T; count: number }[] = []
  for (const model of models) {
    const found = list.find(x => x.model.id === model.id)
    if (found) found.count++
    else list.push({ model, count: 1 })
  }
  return list
}

const enemyShips = computed(() => group(props.scene.npcShips.map(n => n.model as NpcStarship)))
const hazards = computed(() => group(props.scene.hazards.map(h => h.hazard as StarshipHazard)))

/** Who rolls initiative, in plain words (Tech Core p. 169). */
const initiative = computed(() => {
  const lines: string[] = []
  const crew = props.scene.pcs.length
  lines.push(crew ? `The crew, ${crew} strong, each roll initiative.` : 'The crew each roll initiative. Your active party comes aboard at the start.')
  if (props.scene.npcShips.length) lines.push(`${props.scene.npcShips.length === 1 ? 'The enemy ship rolls' : `All ${props.scene.npcShips.length} enemy ships roll`} initiative.`)
  const complex = props.scene.hazards.filter(h => h.hazard.complexity === 'complex').length
  const simple = props.scene.hazards.length - complex
  if (complex) lines.push(`${complex === 1 ? 'The complex hazard rolls' : `The ${complex} complex hazards roll`} once triggered.`)
  if (simple) lines.push(`${simple === 1 ? 'The simple hazard does' : `The ${simple} simple hazards do`} not roll.`)
  if (ship.value) lines.push(`${ship.value.name} does not roll. It acts through the crew at its stations, and only takes a turn of its own if it is compromised.`)
  return lines
})
</script>

<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-4">
    <h2 class="text-xs uppercase tracking-widest text-dim font-mono"><span class="text-accent">//</span> Live Preview</h2>

    <div class="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="min-w-0">
        <h3 class="text-xl font-semibold truncate">{{ scene.name || 'Unnamed scene' }}</h3>
        <div class="text-[0.75rem] text-dim">
          Party level {{ scene.level }} · {{ threat.xp }} XP, <span class="capitalize">{{ threat.difficulty }}</span> for a party of {{ partySize }}
        </div>
      </div>
      <div class="ml-auto">
        <span v-if="problems.length === 0" class="ready-badge ready-yes">✓ Ready to run</span>
        <span v-else class="ready-badge ready-no">{{ problems[0] }}</span>
      </div>
    </div>

    <!-- The party's ship -->
    <div v-if="ship && derived" class="card p-4 border-l-3 border-l-accent flex flex-col gap-3">
      <div class="flex flex-wrap items-baseline gap-2">
        <h4 class="text-lg font-semibold">{{ ship.name }}</h4>
        <span class="text-[0.6875rem] uppercase tracking-widest text-dim">{{ FRAMES[ship.frame].name }} · level {{ ship.level }}</span>
        <span v-if="ship.wrecked" class="trait bg-warning text-on-warning">wrecked {{ ship.wrecked }}</span>
        <span v-if="ship.currentHP < derived.maxHP" class="trait bg-warning text-on-warning">enters at {{ ship.currentHP }} of {{ derived.maxHP }} Hull</span>
      </div>
      <div class="grid grid-cols-4 md:grid-cols-8 gap-1 text-center">
        <div v-for="tile in tiles" :key="tile[0]" class="bg-elevated p-1.5">
          <div class="text-[0.5625rem] uppercase text-dim">{{ tile[0] }}</div>
          <div class="font-bold text-sm">{{ tile[1] }}</div>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5 text-[0.75rem]">
        <span v-for="st in stations" :key="st.id" class="bg-elevated px-2 py-1">
          <span class="font-semibold capitalize">{{ st.kind }}</span>
          <span class="text-dim"> · {{ st.grade }}</span>
          <span v-if="st.helmedBy" class="text-accent"> · {{ st.helmedBy }}</span>
        </span>
      </div>
    </div>
    <div v-else class="card p-6 text-center text-dim">No ship for the party yet. Add one in step 1.</div>

    <!-- What they face -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <details v-for="e in enemyShips" :key="e.model.id" class="card p-0 border-l-3 border-l-danger">
        <summary class="threat-summary">
          <span class="font-semibold">{{ e.model.name }}<span v-if="e.count > 1" class="text-accent"> ×{{ e.count }}</span></span>
          <span class="badge-level text-[0.5625rem]">Lvl {{ e.model.level }}</span>
          <span class="text-[0.6875rem] text-dim">{{ sizeLabel(e.model.size) }} · {{ e.model.faction }}</span>
          <span class="text-[0.6875rem] ml-auto">AC {{ e.model.ac }} · HP {{ e.model.hp }}<span v-if="e.model.sp"> · SP {{ e.model.sp }}</span></span>
        </summary>
        <div class="px-3 pb-3 pt-2 border-t border-[var(--color-border)]">
          <TscStarshipStatBlock :ship="e.model" compact />
        </div>
      </details>
      <details v-for="h in hazards" :key="h.model.id" class="card p-0 border-l-3 border-l-warning">
        <summary class="threat-summary">
          <span class="font-semibold">{{ h.model.name }}<span v-if="h.count > 1" class="text-accent"> ×{{ h.count }}</span></span>
          <span class="badge-level text-[0.5625rem]">Lvl {{ h.model.level }}</span>
          <span class="text-[0.6875rem] text-dim capitalize">{{ h.model.complexity }} hazard</span>
        </summary>
        <div class="px-3 pb-3 pt-2 border-t border-[var(--color-border)]">
          <TscHazardStatBlock :hazard="h.model" compact />
        </div>
      </details>
    </div>
    <div v-if="!enemyShips.length && !hazards.length" class="card p-6 text-center text-dim">Nothing out there yet. Use Reroll ships in step 2 to fill the scene.</div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h4 class="preview-heading">When it starts</h4>
        <ul class="preview-list list-disc">
          <li v-for="line in initiative" :key="line">{{ line }}</li>
        </ul>
      </div>
      <div class="card p-4">
        <h4 class="preview-heading">Damage</h4>
        <ul class="preview-list list-disc">
          <li>Damage comes off Shield Points first, then Hull Points.</li>
          <li>An enemy ship at 0 Hull Points is destroyed.</li>
          <li>The party's ship at 0 Hull Points becomes compromised and rolls a hull integrity check each round. At compromised 10 it is destroyed.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-heading {
  margin-bottom: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-dim);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}

.ready-badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ready-yes {
  background: var(--color-success);
  color: var(--color-on-success);
}

.ready-no {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}

.threat-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  list-style: none;
}

.threat-summary::-webkit-details-marker {
  display: none;
}

.threat-summary:hover {
  background: var(--color-bg-hover);
}
</style>
