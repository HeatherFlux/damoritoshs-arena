<script setup lang="ts">
/** Dialog for picking enemy starships and hazards, or building a starship of your own. */
import { ref } from 'vue'
import type { NpcStarship, StarshipHazard } from '../../types/tsc'
import TscStarshipSearch from './TscStarshipSearch.vue'
import TscHazardSearch from './TscHazardSearch.vue'
import TscStarshipBuilder from './TscStarshipBuilder.vue'

defineProps<{
  partyLevel: number
  /** How many ships and hazards the scene has, shown as feedback while adding. */
  count: number
}>()

const emit = defineEmits<{
  (e: 'add-ship', ship: NpcStarship): void
  (e: 'add-hazard', hazard: StarshipHazard): void
  (e: 'close'): void
}>()

const view = ref<'starships' | 'hazards' | 'builder'>('starships')
const builderShip = ref<NpcStarship | null>(null)
const builderEditing = ref(false)

function build(ship: NpcStarship | null, editing: boolean) {
  builderShip.value = ship
  builderEditing.value = editing
  view.value = 'builder'
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal picker-modal">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold uppercase tracking-wide"><span class="text-accent">//</span> Who's out there</h3>
        <button class="btn-secondary btn-icon btn-sm" title="Close" @click="emit('close')">×</button>
      </div>
      <div class="flex flex-wrap gap-1 mb-3">
        <button class="btn-xs" :class="view === 'starships' ? 'btn-primary' : 'btn-secondary'" @click="view = 'starships'">Starships</button>
        <button class="btn-xs" :class="view === 'hazards' ? 'btn-primary' : 'btn-secondary'" @click="view = 'hazards'">Hazards</button>
        <button class="btn-xs ml-auto" :class="view === 'builder' ? 'btn-primary' : 'btn-secondary'" @click="build(null, false)">Build your own</button>
      </div>
      <div class="picker-body">
        <TscStarshipSearch
          v-if="view === 'starships'"
          :party-level="partyLevel"
          add-label="Add"
          cloneable
          @add="(ship) => emit('add-ship', ship)"
          @clone="(ship) => build(ship, false)"
          @edit="(ship) => build(ship, true)"
        />
        <TscHazardSearch v-else-if="view === 'hazards'" :party-level="partyLevel" add-label="Add" @add="(hazard) => emit('add-hazard', hazard)" />
        <TscStarshipBuilder v-else :ship="builderShip" :editing="builderEditing" @saved="(ship) => { builderShip = ship; builderEditing = true }" />
      </div>
      <div class="flex items-center justify-between mt-3">
        <span class="text-[0.75rem] text-dim">{{ count }} in the scene</span>
        <button class="btn btn-primary" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-modal {
  max-width: 56rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-body {
  height: 62vh;
  min-height: 0;
  overflow: hidden;
}
</style>
