<script setup lang="ts">
import { ref } from 'vue'
import { usePartyStore } from '../stores/partyStore'
import { useCombatStore } from '../stores/combatStore'
import type { Player } from '../types/party'

const partyStore = usePartyStore()
const combatStore = useCombatStore()

const showManageModal = ref(false)
const showAddPlayerModal = ref(false)

type AddMethod = 'manual' | 'json' | 'link'
const addMethod = ref<AddMethod>('manual')

// New player form (manual)
const newPlayerName = ref('')
const newPlayerHP = ref(50)
const newPlayerAC = ref(18)
const newPlayerLevel = ref(1)

// Import form (json/link)
const importJson = ref('')
const pathbuilderLink = ref('')
const importError = ref('')
const importSuccess = ref<string | null>(null)
const isLoading = ref(false)

// Editing
const editingPlayer = ref<string | null>(null)
const editName = ref('')
const editHP = ref(0)
const editAC = ref(0)
const editLevel = ref(1)
const editNotes = ref('')

function addPlayerToEncounter(player: Player) {
  if (combatStore.state.combat) {
    combatStore.addPlayer(player.name, 0, player.maxHP, player.ac)
    const combatant = combatStore.state.combat.combatants.find(c => c.name === player.name && c.isPlayer)
    if (combatant) {
      combatant.level = player.level
      combatant.class = player.class
      combatant.ancestry = player.ancestry
      combatant.perception = player.perception
      combatant.fortitude = player.fortitude
      combatant.reflex = player.reflex
      combatant.will = player.will
    }
  }
}

function addAllPlayersToEncounter() {
  const players = partyStore.getPartyPlayers()
  players.forEach(player => addPlayerToEncounter(player))
}

function createPartyIfNeeded() {
  if (partyStore.state.parties.length === 0) {
    partyStore.createParty('My Party')
  }
  showManageModal.value = true
}

function openAddPlayerModal() {
  newPlayerName.value = ''
  newPlayerHP.value = 50
  newPlayerAC.value = 18
  newPlayerLevel.value = 1
  importJson.value = ''
  pathbuilderLink.value = ''
  importError.value = ''
  importSuccess.value = null
  addMethod.value = 'manual'
  showAddPlayerModal.value = true
}

function addPlayerManually() {
  if (!newPlayerName.value.trim()) return

  if (partyStore.state.parties.length === 0) {
    partyStore.createParty('My Party')
  }

  partyStore.addPlayer({
    name: newPlayerName.value.trim(),
    maxHP: newPlayerHP.value,
    ac: newPlayerAC.value,
    level: newPlayerLevel.value,
  })

  importSuccess.value = `Added ${newPlayerName.value.trim()}`
  newPlayerName.value = ''
}

function importFromJson() {
  importError.value = ''
  importSuccess.value = null

  if (partyStore.state.parties.length === 0) {
    partyStore.createParty('My Party')
  }

  const result = partyStore.importPlayerFromPathbuilder(importJson.value)
  if (result.success && result.player) {
    importSuccess.value = `Imported ${result.player.name} (Level ${result.player.level} ${result.player.class})`
    importJson.value = ''
  } else {
    importError.value = result.error || 'Import failed'
  }
}

async function importFromLink() {
  importError.value = ''
  importSuccess.value = null
  isLoading.value = true

  try {
    let characterId = pathbuilderLink.value.trim()
    const urlMatch = characterId.match(/build=(\d+)/)
    if (urlMatch) {
      characterId = urlMatch[1]
    }

    if (!/^\d+$/.test(characterId)) {
      throw new Error('Invalid Pathbuilder link or ID. Use the share link or just the character ID number.')
    }

    const response = await fetch(`https://pathbuilder2e.com/json.php?id=${characterId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch character from Pathbuilder')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error('Character not found or not shared publicly')
    }

    if (partyStore.state.parties.length === 0) {
      partyStore.createParty('My Party')
    }

    const result = partyStore.importPlayerFromPathbuilder(JSON.stringify(data))
    if (result.success && result.player) {
      importSuccess.value = `Imported ${result.player.name} (Level ${result.player.level} ${result.player.class})`
      pathbuilderLink.value = ''
    } else {
      throw new Error(result.error || 'Import failed')
    }
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Import failed'
  } finally {
    isLoading.value = false
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

  partyStore.updatePlayer(editingPlayer.value, {
    name: editName.value,
    maxHP: editHP.value,
    ac: editAC.value,
    level: editLevel.value,
    notes: editNotes.value || undefined,
  })

  editingPlayer.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Party</h2>
      <div class="flex gap-1.5">
        <button class="btn-primary btn-sm" @click="openAddPlayerModal">
          + Add Player
        </button>
        <button class="btn-secondary btn-sm" @click="createPartyIfNeeded" title="Manage Parties">
          ⚙️
        </button>
      </div>
    </div>

    <!-- Party Selection (if multiple) -->
    <div v-if="partyStore.state.parties.length > 1" class="mb-3">
      <select
        :value="partyStore.state.activePartyId"
        @change="partyStore.setActiveParty(($event.target as HTMLSelectElement).value)"
        class="input select w-full"
      >
        <option v-for="party in partyStore.state.parties" :key="party.id" :value="party.id">
          {{ party.name }} ({{ party.players.length }})
        </option>
      </select>
    </div>

    <!-- No Party State -->
    <div v-if="partyStore.state.parties.length === 0" class="text-center py-8 px-4 text-dim">
      <p>No party created yet</p>
      <p class="text-xs mt-1">Create a party to save your players for reuse across sessions</p>
      <button class="btn-primary mt-4" @click="createPartyIfNeeded">Create Party</button>
    </div>

    <!-- Players List -->
    <template v-else-if="partyStore.activeParty.value">
      <div class="mb-3">
        <button
          class="btn-primary btn-sm"
          @click="addAllPlayersToEncounter"
          :disabled="partyStore.activeParty.value.players.length === 0"
          title="Add all players to combat"
        >
          Add All to Combat
        </button>
      </div>

      <div class="flex-1 overflow-y-auto flex flex-col gap-2">
        <div
          v-for="player in partyStore.activeParty.value.players"
          :key="player.id"
          class="card card-interactive p-2.5"
        >
          <!-- Edit Mode -->
          <template v-if="editingPlayer === player.id">
            <div class="flex flex-col gap-2">
              <input v-model="editName" placeholder="Name" class="input" />
              <div class="flex gap-2">
                <label class="flex-1 text-[0.6875rem] text-dim">
                  HP <input v-model.number="editHP" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 text-[0.6875rem] text-dim">
                  AC <input v-model.number="editAC" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 text-[0.6875rem] text-dim">
                  Lvl <input v-model.number="editLevel" type="number" min="1" max="20" class="input input-sm mt-0.5" />
                </label>
              </div>
              <div class="flex justify-end gap-1.5">
                <button class="btn-secondary btn-sm" @click="editingPlayer = null">Cancel</button>
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
                  </template>
                  <template v-else>
                    Level {{ player.level || '?' }}
                  </template>
                </span>
              </div>
              <div class="flex gap-1.5">
                <span class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded bg-elevated text-success">{{ player.maxHP }} HP</span>
                <span class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded bg-elevated text-accent">AC {{ player.ac }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  class="w-7 h-7 rounded bg-[var(--color-accent)] text-white text-xl font-semibold flex items-center justify-center hover:scale-105 transition-transform"
                  @click="addPlayerToEncounter(player)"
                  title="Add to combat"
                >
                  +
                </button>
                <button class="btn-icon btn-sm" @click="startEditPlayer(player)" title="Edit">
                  ✏️
                </button>
                <button class="btn-icon btn-sm btn-danger" @click="partyStore.removePlayer(player.id)" title="Remove">
                  ×
                </button>
              </div>
            </div>
            <div v-if="player.fortitude || player.reflex || player.will" class="flex gap-2 mt-1.5 pt-1.5 border-t border-[var(--color-border)] text-[0.625rem] text-dim">
              <span v-if="player.perception">Perc +{{ player.perception }}</span>
              <span v-if="player.fortitude">Fort +{{ player.fortitude }}</span>
              <span v-if="player.reflex">Ref +{{ player.reflex }}</span>
              <span v-if="player.will">Will +{{ player.will }}</span>
            </div>
          </template>
        </div>

        <!-- Empty Players -->
        <div v-if="partyStore.activeParty.value.players.length === 0" class="text-center py-8 text-dim">
          <p>No players in party</p>
          <p class="text-xs mt-1">Add players manually or import from Pathbuilder</p>
        </div>
      </div>
    </template>

    <!-- Add Player Modal -->
    <div v-if="showAddPlayerModal" class="modal-overlay" @click.self="showAddPlayerModal = false">
      <div class="modal max-w-[480px]">
        <h3 class="text-lg font-semibold mb-4">Add Player</h3>

        <!-- Method Tabs -->
        <div class="tabs mb-4">
          <button class="tab" :class="{ 'tab-active': addMethod === 'link' }" @click="addMethod = 'link'">
            Pathbuilder Link
          </button>
          <button class="tab" :class="{ 'tab-active': addMethod === 'json' }" @click="addMethod = 'json'">
            Paste JSON
          </button>
          <button class="tab" :class="{ 'tab-active': addMethod === 'manual' }" @click="addMethod = 'manual'">
            Manual
          </button>
        </div>

        <!-- Pathbuilder Link -->
        <div v-if="addMethod === 'link'" class="min-h-[120px]">
          <p class="text-[0.8125rem] text-dim mb-3">Paste your Pathbuilder share link or character ID</p>
          <input
            v-model="pathbuilderLink"
            placeholder="https://pathbuilder2e.com/launch.html?build=123456 or just 123456"
            class="input w-full"
            @keyup.enter="importFromLink"
          />
          <p class="text-[0.6875rem] text-dim mt-2 italic">Character must be set to "Public" in Pathbuilder sharing settings</p>
        </div>

        <!-- Paste JSON -->
        <div v-if="addMethod === 'json'" class="min-h-[120px]">
          <p class="text-[0.8125rem] text-dim mb-3">Export JSON from Pathbuilder: Menu → Export → Export to JSON</p>
          <textarea
            v-model="importJson"
            placeholder='{"success": true, "build": {...}}'
            rows="5"
            class="input w-full font-mono text-xs resize-y"
          ></textarea>
        </div>

        <!-- Manual Entry -->
        <div v-if="addMethod === 'manual'" class="min-h-[120px]">
          <input
            v-model="newPlayerName"
            placeholder="Character name"
            class="input w-full mb-2"
            @keyup.enter="addPlayerManually"
          />
          <div class="flex gap-2">
            <label class="flex-1 text-[0.6875rem] text-dim">
              Max HP <input v-model.number="newPlayerHP" type="number" min="1" class="input input-sm w-full mt-0.5" />
            </label>
            <label class="flex-1 text-[0.6875rem] text-dim">
              AC <input v-model.number="newPlayerAC" type="number" min="1" class="input input-sm w-full mt-0.5" />
            </label>
            <label class="flex-1 text-[0.6875rem] text-dim">
              Level <input v-model.number="newPlayerLevel" type="number" min="1" max="20" class="input input-sm w-full mt-0.5" />
            </label>
          </div>
        </div>

        <!-- Status Messages -->
        <p v-if="importError" class="text-danger text-sm mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-success text-sm mt-2">{{ importSuccess }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-secondary" @click="showAddPlayerModal = false">Done</button>
          <button
            v-if="addMethod === 'link'"
            class="btn-primary"
            @click="importFromLink"
            :disabled="!pathbuilderLink.trim() || isLoading"
          >
            {{ isLoading ? 'Loading...' : 'Import' }}
          </button>
          <button
            v-else-if="addMethod === 'json'"
            class="btn-primary"
            @click="importFromJson"
            :disabled="!importJson.trim()"
          >
            Import
          </button>
          <button
            v-else
            class="btn-primary"
            @click="addPlayerManually"
            :disabled="!newPlayerName.trim()"
          >
            Add Player
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Party Modal -->
    <div v-if="showManageModal" class="modal-overlay" @click.self="showManageModal = false">
      <div class="modal max-w-[500px]">
        <h3 class="text-lg font-semibold mb-4">Manage Parties</h3>

        <div class="flex flex-col gap-2 mb-4 max-h-[300px] overflow-y-auto">
          <div
            v-for="party in partyStore.state.parties"
            :key="party.id"
            class="flex items-center gap-2 p-2 bg-elevated rounded"
            :class="{ 'border border-[var(--color-accent)]': party.id === partyStore.state.activePartyId }"
          >
            <input
              :value="party.name"
              @input="partyStore.updatePartyName(party.id, ($event.target as HTMLInputElement).value)"
              class="flex-1 bg-transparent border-none border-b border-transparent p-1 text-[var(--color-text)] focus:border-b-[var(--color-accent)] focus:outline-none"
            />
            <span class="text-[0.6875rem] text-dim">{{ party.players.length }} players</span>
            <button
              class="btn-sm"
              :class="party.id === partyStore.state.activePartyId ? 'btn-primary' : 'btn-secondary'"
              @click="partyStore.setActiveParty(party.id)"
            >
              {{ party.id === partyStore.state.activePartyId ? 'Active' : 'Select' }}
            </button>
            <button
              class="btn-icon btn-sm btn-danger"
              @click="partyStore.deleteParty(party.id)"
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>

        <button class="btn-secondary w-full mb-4" @click="partyStore.createParty()">+ New Party</button>

        <div class="flex justify-end">
          <button class="btn-primary" @click="showManageModal = false">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>
