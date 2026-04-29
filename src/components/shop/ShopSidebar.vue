<script setup lang="ts">
import { ref } from 'vue'
import type { Directive } from 'vue'
import { useShopStore } from '../../stores/shopStore'
import type { SavedShop } from '../../types/shop'

const store = useShopStore()

// Auto-focus directive for the inline rename input
const vFocus: Directive<HTMLInputElement> = {
  mounted: (el) => {
    el.focus()
    el.select()
  },
}

const renamingId = ref<string | null>(null)
const renameDraft = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function loadShop(shop: SavedShop) {
  store.loadShop(shop.id)
}

function deleteShop(shopId: string, name: string) {
  if (confirm(`Delete saved shop "${name}"?`)) {
    store.deleteShop(shopId)
  }
}

function saveCurrent() {
  const saved = store.saveCurrentShop()
  if (!saved) {
    alert('Generate a shop first before saving.')
  }
}

function startRename(shop: SavedShop, event: Event) {
  event.stopPropagation()
  renamingId.value = shop.id
  renameDraft.value = shop.name
}

function commitRename() {
  if (renamingId.value && renameDraft.value.trim()) {
    store.renameShop(renamingId.value, renameDraft.value)
  }
  renamingId.value = null
  renameDraft.value = ''
}

function cancelRename() {
  renamingId.value = null
  renameDraft.value = ''
}

function exportSingleShop(shop: SavedShop, event: Event) {
  event.stopPropagation()
  const json = JSON.stringify([shop], null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = shop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
  a.download = `${safe || 'shop'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportAll() {
  if (store.state.savedShops.length === 0) {
    alert('No saved shops to export.')
    return
  }
  const json = store.exportShops()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'shops.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function handleFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      const n = store.importShops(text)
      if (n > 0) {
        // No-op; reactive sidebar will update
      } else {
        alert('No valid shops found in file.')
      }
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`)
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <div class="shop-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Saved Shops</h2>
      <div class="sidebar-actions">
        <button class="btn-secondary btn-xs" @click="triggerImport">Import</button>
        <button class="btn-secondary btn-xs" @click="exportAll">Export</button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden-input"
        @change="handleFile"
      />
    </div>

    <button
      class="btn btn-primary btn-save"
      :disabled="!store.state.currentShop"
      @click="saveCurrent"
    >
      Save Current Shop
    </button>

    <div class="shop-list">
      <div
        v-for="shop in store.state.savedShops"
        :key="shop.id"
        class="shop-item group"
        :class="{ active: store.state.activeShopId === shop.id }"
        @click="loadShop(shop)"
      >
        <div class="shop-info">
          <input
            v-if="renamingId === shop.id"
            v-model="renameDraft"
            class="rename-input"
            @click.stop
            @keydown.enter="commitRename"
            @keydown.escape="cancelRename"
            @blur="commitRename"
            v-focus
          />
          <span v-else class="shop-name">{{ shop.name }}</span>
          <span class="shop-meta">
            Lvl {{ shop.shop.partyLevel }}
            &middot; {{ shop.shop.itemCount }} item{{ shop.shop.itemCount !== 1 ? 's' : '' }}
            &middot; {{ formatDate(shop.savedAt) }}
          </span>
        </div>
        <div class="shop-actions">
          <button
            class="btn-icon-tiny"
            title="Rename"
            @click="startRename(shop, $event)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
            </svg>
          </button>
          <button
            class="btn-icon-tiny"
            title="Export shop"
            @click="exportSingleShop(shop, $event)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
            </svg>
          </button>
          <button
            class="btn-icon-tiny delete"
            title="Delete shop"
            @click.stop="deleteShop(shop.id, shop.name)"
          >
            &times;
          </button>
        </div>
      </div>

      <div v-if="store.state.savedShops.length === 0" class="empty-state">
        <p>No saved shops.</p>
        <p class="empty-hint">Generate a shop, then click Save Current Shop.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.sidebar-header {
  margin-bottom: 0.75rem;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shop-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.shop-item {
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

.shop-item:hover {
  border-color: var(--color-border);
}

.shop-item.active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-elevated));
}

.shop-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.shop-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rename-input {
  font-weight: 600;
  font-size: 0.875rem;
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  color: var(--color-text);
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-sm);
  width: 100%;
}

.shop-meta {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.shop-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.shop-item:hover .shop-actions {
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

.hidden-input {
  display: none;
}
</style>
