<script setup lang="ts">
import { useStarshipStore } from '../../stores/starshipStore'
import type { SavedScene } from '../../types/starship'

const store = useStarshipStore()

const emit = defineEmits<{
  (e: 'load-scene', scene: SavedScene): void
  (e: 'save-current'): void
  (e: 'import'): void
  (e: 'export'): void
}>()

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function loadScene(scene: SavedScene) {
  store.state.editingSceneId = scene.id
  emit('load-scene', scene)
}

function deleteScene(sceneId: string) {
  if (store.state.editingSceneId === sceneId) {
    store.state.editingSceneId = null
  }
  store.deleteScene(sceneId)
}

function duplicateScene(scene: SavedScene) {
  const clone: SavedScene = {
    ...JSON.parse(JSON.stringify(scene)),
    id: crypto.randomUUID(),
    name: scene.name + ' (Copy)',
    savedAt: Date.now()
  }
  store.saveScene(clone)
}

function exportSingleScene(scene: SavedScene) {
  const json = JSON.stringify([scene], null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = scene.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
  a.download = `${safeName}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="scene-sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <h2 class="sidebar-title">Saved Scenes</h2>
      <div class="sidebar-actions">
        <button class="btn-secondary btn-xs" @click="emit('import')">Import</button>
        <button class="btn-secondary btn-xs" @click="emit('export')">Export</button>
      </div>
    </div>

    <!-- Save Current Button -->
    <button class="btn btn-primary btn-save" @click="emit('save-current')">
      Save Current
    </button>

    <!-- Scene List -->
    <div class="scene-list">
      <div
        v-for="scene in store.state.savedScenes"
        :key="scene.id"
        class="scene-item group"
        :class="{ active: store.state.editingSceneId === scene.id }"
        @click="loadScene(scene)"
      >
        <div class="scene-info">
          <span class="scene-name">{{ scene.name }}</span>
          <span class="scene-meta">
            Lvl {{ scene.level }}
            &middot; {{ scene.threats.length }} threat{{ scene.threats.length !== 1 ? 's' : '' }}
            &middot; {{ formatDate(scene.savedAt) }}
          </span>
        </div>
        <div class="scene-actions">
          <button
            class="btn-icon-tiny"
            @click.stop="duplicateScene(scene)"
            title="Duplicate scene"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
            </svg>
          </button>
          <button
            class="btn-icon-tiny"
            @click.stop="exportSingleScene(scene)"
            title="Export scene"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
            </svg>
          </button>
          <button
            class="btn-icon-tiny delete"
            @click.stop="deleteScene(scene.id)"
            title="Delete scene"
          >
            &times;
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="store.state.savedScenes.length === 0" class="empty-state">
        <p>No saved scenes.</p>
        <p class="empty-hint">Create or import scenes to get started.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
}

.sidebar-header {
  margin-bottom: 0.75rem;
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.sidebar-actions {
  display: flex;
  gap: 0.375rem;
}

.btn-save {
  width: 100%;
  margin-bottom: 0.75rem;
  font-size: 0.8125rem;
  padding: 0.5rem;
}

.scene-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.scene-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.scene-item:hover {
  border-color: var(--color-border);
}

.scene-item.active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-elevated));
}

.scene-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.scene-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-meta {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.scene-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.scene-item:hover .scene-actions {
  opacity: 1;
}

.btn-icon-tiny {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.btn-icon-tiny:hover {
  color: var(--color-accent);
  background: var(--color-bg);
}

.btn-icon-tiny.delete {
  font-size: 1.125rem;
  line-height: 1;
}

.btn-icon-tiny.delete:hover {
  color: var(--color-danger);
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
  font-size: 0.875rem;
}

.empty-hint {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}
</style>
