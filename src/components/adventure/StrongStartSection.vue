<script setup lang="ts">
import { computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import { generateStrongStart } from '../../utils/adventureGenerator'
import InspireButton from './InspireButton.vue'

const store = useAdventureStore()

const strongStart = computed({
  get: () => store.state.currentAdventure?.strongStart || '',
  set: (v: string) => store.setStrongStart(v),
})

function handleInspire() {
  store.setStrongStart(generateStrongStart())
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-2">
        <span class="text-accent/60">&gt;&gt;</span> STRONG START
      </h3>
      <InspireButton label="strong start" @inspire="handleInspire" />
    </div>
    <textarea
      v-model="strongStart"
      class="input w-full text-sm resize-y min-h-[5rem]"
      rows="3"
      placeholder="How does the session open? What grabs the players immediately?"
    ></textarea>
  </section>
</template>
