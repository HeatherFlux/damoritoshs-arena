<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTscStore } from '../../stores/tscStore'
import { TSC_EXPLORATION_ACTIVITIES } from '../../data/tscStations'
import { rollD20 } from '../../utils/dice'

const emit = defineEmits<{ (e: 'close'): void }>()
const store = useTscStore()

const scene = computed(() => store.state.activeScene!)
const totals = ref<Record<string, number | null>>(Object.fromEntries(scene.value.pcs.map(p => [p.id, null])))

const npcCount = computed(() => scene.value.npcShips.filter(n => !n.destroyed).length)
const hazardCount = computed(() => scene.value.hazards.filter(h => h.hazard.complexity === 'complex' && !h.disabled).length)

function activityFor(pcId: string) {
  const pc = scene.value.pcs.find(p => p.id === pcId)
  return TSC_EXPLORATION_ACTIVITIES.find(a => a.id === pc?.explorationActivityId)
}

function rollAll() {
  for (const pc of scene.value.pcs) {
    totals.value[pc.id] = rollD20(pc.initiativeBonus ?? 0, 'Initiative', pc.name).total
  }
}

function confirm() {
  const rolls = Object.entries(totals.value)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([pcId, total]) => ({ pcId, total: total as number }))
  store.rollInitiative(rolls)
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal max-w-lg">
      <h3 class="mb-1">Roll Initiative</h3>
      <p class="text-dim text-xs mb-3">
        Crew may roll Perception or a skill tied to their battle station. The player starship does not roll.
        {{ npcCount }} NPC starship{{ npcCount === 1 ? '' : 's' }} and {{ hazardCount }} complex hazard{{ hazardCount === 1 ? '' : 's' }} roll automatically;
        simple hazards never enter initiative.
      </p>

      <div class="flex flex-col gap-1.5 mb-3">
        <div v-for="pc in scene.pcs" :key="pc.id" class="flex items-center gap-2 bg-elevated p-2 text-sm">
          <span class="font-semibold flex-1">{{ pc.name }}</span>
          <span v-if="activityFor(pc.id)" class="text-[0.625rem] text-accent" :title="activityFor(pc.id)!.summary">free action: {{ activityFor(pc.id)!.freeAction }}</span>
          <span class="text-[0.625rem] text-dim">bonus {{ pc.initiativeBonus ?? 0 }}</span>
          <input v-model.number="totals[pc.id]" type="number" class="input input-sm w-20" placeholder="total" @keydown.enter="confirm" />
        </div>
        <div v-if="!scene.pcs.length" class="text-dim text-xs">No crew added yet. Empty totals are rolled with the PC's bonus.</div>
      </div>

      <div class="flex justify-between gap-2">
        <button class="btn btn-secondary" @click="rollAll">Roll all crew</button>
        <div class="flex gap-2">
          <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="confirm">Start Combat</button>
        </div>
      </div>
    </div>
  </div>
</template>
