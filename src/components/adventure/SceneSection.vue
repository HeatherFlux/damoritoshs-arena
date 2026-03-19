<script setup lang="ts">
import { computed } from 'vue'
import { useAdventureStore } from '../../stores/adventureStore'
import { generateScene, generateScenes } from '../../utils/adventureGenerator'
import SceneCard from './SceneCard.vue'
import InspireButton from './InspireButton.vue'

const store = useAdventureStore()

const scenes = computed(() => store.state.currentAdventure?.scenes || [])

function handleAdd() {
  store.addScene('New scene...')
  const scenes = store.state.currentAdventure?.scenes
  const newScene = scenes?.[scenes.length - 1]
  if (newScene) store.state.editingEntryId = newScene.id
}

function handleInspire(count: number) {
  const generated = count === 1 ? [generateScene()] : generateScenes(count)
  for (const s of generated) {
    store.addScene(s.text, s.type, s.tension, true)
  }
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-2">
        <span class="text-accent/60">&gt;&gt;</span> SCENES
        <span v-if="scenes.length" class="text-dim font-normal">({{ scenes.length }})</span>
      </h3>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-xs" @click="handleAdd">+ Add</button>
        <InspireButton label="scenes" @inspire="handleInspire" />
      </div>
    </div>
    <div v-if="scenes.length" class="flex flex-col gap-2">
      <SceneCard
        v-for="scene in scenes"
        :key="scene.id"
        :scene="scene"
        :all-scenes="scenes"
        :is-editing="store.state.editingEntryId === scene.id"
        @start-edit="store.state.editingEntryId = scene.id"
        @stop-edit="store.state.editingEntryId = null"
        @delete="store.removeScene(scene.id)"
      />
    </div>
    <p v-else class="text-sm text-dim italic">
      No scenes yet. Scenes are flexible, node-based — not a linear sequence.
    </p>
  </section>
</template>
