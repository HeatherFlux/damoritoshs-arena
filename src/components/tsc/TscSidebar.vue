<script setup lang="ts">
import { useTscStore } from '../../stores/tscStore'
import type { PlayerStarship, TscSavedScene } from '../../types/tsc'
import { FRAMES } from '../../data/tscFrames'

const store = useTscStore()

const emit = defineEmits<{
  (e: 'load-scene', scene: TscSavedScene): void
  (e: 'edit-ship', ship: PlayerStarship): void
  (e: 'save-current'): void
  (e: 'import'): void
  (e: 'export'): void
}>()

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

function duplicateScene(scene: TscSavedScene) {
  store.saveScene({ ...JSON.parse(JSON.stringify(scene)), id: crypto.randomUUID(), name: scene.name + ' (Copy)', savedAt: Date.now() })
}

function download(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportSingleScene(scene: TscSavedScene) {
  const safeName = scene.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
  download(`${safeName || 'tsc-scene'}.json`, JSON.stringify([scene], null, 2))
}

function threatCount(scene: TscSavedScene): string {
  const parts: string[] = []
  if (scene.npcShips.length) parts.push(`${scene.npcShips.length} ship${scene.npcShips.length === 1 ? '' : 's'}`)
  if (scene.hazards.length) parts.push(`${scene.hazards.length} hazard${scene.hazards.length === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'no threats'
}

function deletePlayerShip(ship: PlayerStarship) {
  if (confirm(`Delete starship sheet "${ship.name}"?`)) store.deletePlayerShip(ship.id)
}
</script>

<template>
  <div class="scene-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Tactical Scenes</h2>
      <div class="sidebar-actions">
        <button class="btn-secondary btn-xs" @click="emit('import')">Import</button>
        <button class="btn-secondary btn-xs" @click="emit('export')">Export</button>
      </div>
    </div>

    <button class="btn btn-primary btn-save" @click="emit('save-current')">Save Current</button>

    <div class="scene-list">
      <div
        v-for="scene in store.state.savedScenes"
        :key="scene.id"
        class="scene-item group"
        :class="{ active: store.state.activeScene?.id === scene.id }"
        @click="emit('load-scene', scene)"
      >
        <div class="scene-info">
          <span class="scene-name">{{ scene.name }}</span>
          <span class="scene-meta">Lvl {{ scene.level }} · {{ threatCount(scene) }} · {{ formatDate(scene.savedAt) }}</span>
        </div>
        <div class="scene-actions">
          <button class="btn-icon-tiny" title="Duplicate scene" @click.stop="duplicateScene(scene)">⧉</button>
          <button class="btn-icon-tiny" title="Export scene" @click.stop="exportSingleScene(scene)">⤓</button>
          <button class="btn-icon-tiny text-danger" title="Delete scene" @click.stop="store.deleteScene(scene.id)">×</button>
        </div>
      </div>
      <div v-if="store.state.savedScenes.length === 0" class="text-dim text-xs px-2 py-3">No saved tactical scenes yet.</div>
    </div>

    <div class="sidebar-header mt-4">
      <h2 class="sidebar-title">Player Starships</h2>
    </div>
    <div class="scene-list">
      <div
        v-for="ship in store.state.playerShips"
        :key="ship.id"
        class="scene-item group"
        @click="emit('edit-ship', ship)"
      >
        <div class="scene-info">
          <span class="scene-name">{{ ship.name }}</span>
          <span class="scene-meta">{{ FRAMES[ship.frame].name }} · Lvl {{ ship.level }}<span v-if="ship.wrecked"> · wrecked {{ ship.wrecked }}</span></span>
        </div>
        <div class="scene-actions">
          <button class="btn-icon-tiny text-danger" title="Delete sheet" @click.stop="deletePlayerShip(ship)">×</button>
        </div>
      </div>
      <div v-if="store.state.playerShips.length === 0" class="text-dim text-xs px-2 py-3">No starship sheets yet. Build one in the Player Ship tab.</div>
    </div>
  </div>
</template>

<style scoped>
.scene-sidebar { display: flex; flex-direction: column; height: 100%; padding: 0.75rem; gap: 0.5rem; overflow-y: auto; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; }
.sidebar-title { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-dim); }
.sidebar-actions { display: flex; gap: 0.25rem; }
.btn-save { width: 100%; }
.scene-list { display: flex; flex-direction: column; gap: 0.25rem; }
.scene-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid var(--color-border); background: var(--color-bg-surface); cursor: pointer; gap: 0.5rem; }
.scene-item:hover, .scene-item.active { border-color: var(--color-accent); }
.scene-info { display: flex; flex-direction: column; min-width: 0; }
.scene-name { font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scene-meta { font-size: 0.625rem; color: var(--color-text-dim); }
.scene-actions { display: flex; gap: 0.125rem; opacity: 0; }
.scene-item:hover .scene-actions { opacity: 1; }
.btn-icon-tiny { width: 1.25rem; height: 1.25rem; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--color-text-dim); background: transparent; border: none; cursor: pointer; }
.btn-icon-tiny:hover { color: var(--color-accent); }
</style>
