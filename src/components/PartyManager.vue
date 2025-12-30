<script setup lang="ts">
import { ref } from 'vue'
import { usePartyStore } from '../stores/partyStore'
import type { Player } from '../types/party'

const store = usePartyStore()

const showAddPlayer = ref(false)
const showImportModal = ref(false)
const showPartyImportModal = ref(false)
const editingPlayer = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// New player form
const newPlayerName = ref('')
const newPlayerHP = ref(50)
const newPlayerAC = ref(18)
const newPlayerLevel = ref(1)

// Import form (Pathbuilder)
const importJson = ref('')
const importError = ref('')
const importSuccess = ref<string | null>(null)

// Party import form
const partyImportJson = ref('')
const partyImportError = ref('')
const partyImportSuccess = ref<string | null>(null)

// Edit form
const editName = ref('')
const editHP = ref(0)
const editAC = ref(0)
const editLevel = ref(1)
const editNotes = ref('')

function createNewParty() {
  store.createParty('My Party')
}

function startAddPlayer() {
  newPlayerName.value = ''
  newPlayerHP.value = 50
  newPlayerAC.value = 18
  newPlayerLevel.value = 1
  showAddPlayer.value = true
}

function addPlayerManually() {
  if (!newPlayerName.value.trim()) return

  store.addPlayer({
    name: newPlayerName.value.trim(),
    maxHP: newPlayerHP.value,
    ac: newPlayerAC.value,
    level: newPlayerLevel.value,
  })

  showAddPlayer.value = false
}

function openImportModal() {
  importJson.value = ''
  importError.value = ''
  importSuccess.value = null
  showImportModal.value = true
}

function importFromPathbuilder() {
  importError.value = ''
  importSuccess.value = null

  const result = store.importPlayerFromPathbuilder(importJson.value)
  if (result.success && result.player) {
    importSuccess.value = `Imported ${result.player.name} (Level ${result.player.level} ${result.player.class})`
    importJson.value = ''
  } else {
    importError.value = result.error || 'Import failed'
  }
}

function startEditPlayer(player: Player) {
  editingPlayer.value = player.id
  editName.value = player.name
  editHP.value = player.maxHP
  editAC.value = player.ac
  editLevel.value = player.level || 1
  editNotes.value = player.notes || ''
}

function savePlayerEdit() {
  if (!editingPlayer.value) return

  store.updatePlayer(editingPlayer.value, {
    name: editName.value,
    maxHP: editHP.value,
    ac: editAC.value,
    level: editLevel.value,
    notes: editNotes.value || undefined,
  })

  editingPlayer.value = null
}

function cancelEdit() {
  editingPlayer.value = null
}

// Export all parties as downloadable JSON file
function exportAllParties() {
  const json = store.exportParties()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sf2e-parties-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Open party import modal
function openPartyImportModal() {
  partyImportJson.value = ''
  partyImportError.value = ''
  partyImportSuccess.value = null
  showPartyImportModal.value = true
}

// Handle file selection for import
function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    partyImportJson.value = e.target?.result as string
  }
  reader.readAsText(file)
}

// Import parties from JSON
function importAllParties(mode: 'merge' | 'replace') {
  partyImportError.value = ''
  partyImportSuccess.value = null

  const result = store.importParties(partyImportJson.value, mode)
  if (result.success) {
    partyImportSuccess.value = `Imported ${result.imported} ${result.imported === 1 ? 'party' : 'parties'}`
    partyImportJson.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
  } else {
    partyImportError.value = result.error || 'Import failed'
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-4">
    <!-- Party Header -->
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-base font-semibold">Party</h3>
      <div class="flex gap-1.5">
        <button
          v-if="store.state.parties.length > 0"
          class="btn-secondary btn-sm"
          @click="exportAllParties"
          title="Export all parties"
        >
          📤
        </button>
        <button class="btn-secondary btn-sm" @click="openPartyImportModal" title="Import parties">
          📥
        </button>
        <button class="btn-primary btn-sm" @click="createNewParty">+ New Party</button>
      </div>
    </div>

    <!-- Party List -->
    <div v-if="store.state.parties.length > 0" class="flex flex-col gap-1.5 mb-4">
      <div
        v-for="party in store.state.parties"
        :key="party.id"
        class="flex justify-between items-center px-3 py-2 bg-elevated border border-[var(--color-border)] rounded cursor-pointer transition-all duration-150 hover:border-[var(--color-accent)]"
        :class="{ 'border-[var(--color-accent)] bg-accent-subtle': party.id === store.state.activePartyId }"
        @click="store.setActiveParty(party.id)"
      >
        <div class="flex flex-col gap-0.5">
          <input
            v-if="party.id === store.state.activePartyId"
            :value="party.name"
            @input="store.updatePartyName(party.id, ($event.target as HTMLInputElement).value)"
            @click.stop
            class="font-medium bg-transparent border-none border-b border-[var(--color-accent)] p-0 text-[var(--color-text)] w-full focus:outline-none"
          />
          <span v-else class="font-medium">{{ party.name }}</span>
          <span class="text-[0.6875rem] text-dim">{{ party.players.length }} player{{ party.players.length !== 1 ? 's' : '' }}</span>
        </div>
        <button
          v-if="party.id === store.state.activePartyId"
          class="btn-icon btn-sm btn-danger"
          @click.stop="store.deleteParty(party.id)"
          title="Delete party"
        >
          ×
        </button>
      </div>
    </div>

    <div v-else class="text-center py-6 text-dim">
      <p>No parties yet</p>
      <p class="text-xs mt-1">Create a party to save your players</p>
    </div>

    <!-- Active Party Players -->
    <template v-if="store.activeParty.value">
      <div class="flex justify-between items-center mb-2 pt-2 border-t border-[var(--color-border)]">
        <h4 class="text-sm text-dim">Players</h4>
        <div class="flex gap-1.5">
          <button class="btn-secondary btn-sm" @click="openImportModal" title="Import from Pathbuilder">
            📥 Import
          </button>
          <button class="btn-primary btn-sm" @click="startAddPlayer">+ Add</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto flex flex-col gap-2">
        <div
          v-for="player in store.activeParty.value.players"
          :key="player.id"
          class="bg-elevated border border-[var(--color-border)] rounded p-2.5"
        >
          <!-- Edit Mode -->
          <template v-if="editingPlayer === player.id">
            <div class="flex flex-col gap-2">
              <input v-model="editName" placeholder="Name" class="input w-full" />
              <div class="flex gap-2">
                <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
                  HP <input v-model.number="editHP" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
                  AC <input v-model.number="editAC" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
                  Level <input v-model.number="editLevel" type="number" min="1" max="20" class="input input-sm mt-0.5" />
                </label>
              </div>
              <textarea v-model="editNotes" placeholder="Notes (optional)" class="input min-h-[50px] resize-y text-sm"></textarea>
              <div class="flex justify-end gap-1.5">
                <button class="btn-secondary btn-sm" @click="cancelEdit">Cancel</button>
                <button class="btn-primary btn-sm" @click="savePlayerEdit">Save</button>
              </div>
            </div>
          </template>

          <!-- View Mode -->
          <template v-else>
            <div class="flex items-center gap-2">
              <div class="flex-1 min-w-0">
                <span class="block font-semibold truncate text-text">{{ player.name }}</span>
                <span class="text-[0.6875rem] text-dim">
                  <template v-if="player.class">
                    Lvl {{ player.level }} {{ player.class }}
                    <template v-if="player.ancestry"> · {{ player.ancestry }}</template>
                  </template>
                  <template v-else>
                    Level {{ player.level || '?' }}
                  </template>
                </span>
              </div>
              <div class="flex gap-1.5">
                <span class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded bg-surface text-success">HP {{ player.maxHP }}</span>
                <span class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded bg-surface text-accent">AC {{ player.ac }}</span>
              </div>
              <div class="flex gap-1">
                <button class="btn-icon btn-sm" @click="startEditPlayer(player)" title="Edit">✏️</button>
                <button class="btn-icon btn-sm btn-danger" @click="store.removePlayer(player.id)" title="Remove">×</button>
              </div>
            </div>
            <div v-if="player.notes" class="mt-1.5 pt-1.5 border-t border-[var(--color-border)] text-xs text-dim italic">
              {{ player.notes }}
            </div>
            <div v-if="player.fortitude || player.reflex || player.will" class="flex gap-2 mt-1.5 pt-1.5 border-t border-[var(--color-border)]">
              <span v-if="player.fortitude" class="text-[0.625rem] text-dim">Fort +{{ player.fortitude }}</span>
              <span v-if="player.reflex" class="text-[0.625rem] text-dim">Ref +{{ player.reflex }}</span>
              <span v-if="player.will" class="text-[0.625rem] text-dim">Will +{{ player.will }}</span>
              <span v-if="player.perception" class="text-[0.625rem] text-dim">Perc +{{ player.perception }}</span>
            </div>
          </template>
        </div>

        <div v-if="store.activeParty.value.players.length === 0" class="text-center py-6 text-dim">
          <p>No players in this party</p>
          <p class="text-xs mt-1">Add players manually or import from Pathbuilder</p>
        </div>
      </div>

      <!-- Add Player Form -->
      <div v-if="showAddPlayer" class="mt-4 p-3 bg-surface border border-[var(--color-border)] rounded">
        <h5 class="text-sm font-semibold mb-2">Add Player</h5>
        <input v-model="newPlayerName" placeholder="Character name" class="input w-full mb-2" />
        <div class="flex gap-2 mb-2">
          <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
            HP <input v-model.number="newPlayerHP" type="number" min="1" class="input input-sm mt-0.5" />
          </label>
          <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
            AC <input v-model.number="newPlayerAC" type="number" min="1" class="input input-sm mt-0.5" />
          </label>
          <label class="flex-1 flex flex-col text-[0.6875rem] text-dim">
            Level <input v-model.number="newPlayerLevel" type="number" min="1" max="20" class="input input-sm mt-0.5" />
          </label>
        </div>
        <div class="flex justify-end gap-1.5">
          <button class="btn-secondary btn-sm" @click="showAddPlayer = false">Cancel</button>
          <button class="btn-primary btn-sm" @click="addPlayerManually">Add Player</button>
        </div>
      </div>
    </template>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal max-w-[500px]">
        <h3 class="text-lg font-semibold mb-2">Import from Pathbuilder</h3>
        <p class="text-dim text-sm mb-2">Paste the JSON export from Pathbuilder 2e:</p>
        <ol class="text-xs text-dim list-decimal ml-4 mb-4 space-y-1">
          <li>Open your character in Pathbuilder 2e</li>
          <li>Go to Menu → Export → Export to JSON</li>
          <li>Copy the JSON and paste below</li>
        </ol>
        <textarea
          v-model="importJson"
          placeholder='{"success": true, "build": {...}}'
          rows="8"
          class="input w-full font-mono text-xs resize-y"
        ></textarea>
        <p v-if="importError" class="text-danger text-sm mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-success text-sm mt-2">{{ importSuccess }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-secondary" @click="showImportModal = false">Close</button>
          <button class="btn-primary" @click="importFromPathbuilder" :disabled="!importJson.trim()">
            Import
          </button>
        </div>
      </div>
    </div>

    <!-- Party Import Modal -->
    <div v-if="showPartyImportModal" class="modal-overlay" @click.self="showPartyImportModal = false">
      <div class="modal max-w-[500px]">
        <h3 class="text-lg font-semibold mb-2">Import/Export Parties</h3>
        <p class="text-dim text-sm mb-4">Backup your parties or restore from a previous export.</p>

        <!-- File Upload -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Load from file:</label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            @change="handleFileImport"
            class="block w-full text-sm text-dim file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-accent file:text-white hover:file:bg-accent/90 file:cursor-pointer"
          />
        </div>

        <!-- Or paste JSON -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Or paste JSON:</label>
          <textarea
            v-model="partyImportJson"
            placeholder='{"version": 1, "parties": [...]}'
            rows="6"
            class="input w-full font-mono text-xs resize-y"
          ></textarea>
        </div>

        <p v-if="partyImportError" class="text-danger text-sm mb-2">{{ partyImportError }}</p>
        <p v-if="partyImportSuccess" class="text-success text-sm mb-2">{{ partyImportSuccess }}</p>

        <div class="flex justify-between mt-4">
          <button class="btn-secondary" @click="showPartyImportModal = false">Close</button>
          <div class="flex gap-2">
            <button
              class="btn-secondary"
              @click="importAllParties('merge')"
              :disabled="!partyImportJson.trim()"
              title="Add imported parties to existing"
            >
              Merge
            </button>
            <button
              class="btn-primary"
              @click="importAllParties('replace')"
              :disabled="!partyImportJson.trim()"
              title="Replace all parties with import"
            >
              Replace All
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
