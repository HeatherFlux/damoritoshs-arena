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
    <div class="flex justify-between items-center mb-3 lg:mb-4">
      <h2 class="text-base lg:text-lg font-semibold">Party</h2>
      <div class="flex gap-1 lg:gap-1.5">
        <button class="btn-primary btn-xs lg:btn-sm" @click="openAddPlayerModal">
          + Add
        </button>
        <button class="btn-secondary btn-xs lg:btn-sm" @click="createPartyIfNeeded" title="Manage Parties">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Party Selection (if multiple) -->
    <div v-if="partyStore.state.parties.length > 1" class="mb-2 lg:mb-3">
      <select
        :value="partyStore.state.activePartyId"
        @change="partyStore.setActiveParty(($event.target as HTMLSelectElement).value)"
        class="input input-sm lg:input select w-full"
      >
        <option v-for="party in partyStore.state.parties" :key="party.id" :value="party.id">
          {{ party.name }} ({{ party.players.length }})
        </option>
      </select>
    </div>

    <!-- No Party State -->
    <div v-if="partyStore.state.parties.length === 0" class="text-center py-6 lg:py-8 px-4 text-dim">
      <p class="text-sm lg:text-base">No party created yet</p>
      <p class="text-xs mt-1">Create a party to save your players for reuse across sessions</p>
      <button class="btn-primary btn-sm lg:btn mt-4" @click="createPartyIfNeeded">Create Party</button>
    </div>

    <!-- Players List -->
    <template v-else-if="partyStore.activeParty.value">
      <div class="mb-2 lg:mb-3">
        <button
          class="btn-primary btn-xs lg:btn-sm"
          @click="addAllPlayersToEncounter"
          :disabled="partyStore.activeParty.value.players.length === 0"
          title="Add all players to combat"
        >
          Add All to Combat
        </button>
      </div>

      <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 lg:gap-2">
        <div
          v-for="player in partyStore.activeParty.value.players"
          :key="player.id"
          class="card card-interactive p-2 lg:p-2.5"
        >
          <!-- Edit Mode -->
          <template v-if="editingPlayer === player.id">
            <div class="flex flex-col gap-2">
              <input v-model="editName" placeholder="Name" class="input input-sm lg:input" />
              <div class="flex gap-1.5 lg:gap-2">
                <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
                  HP <input v-model.number="editHP" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
                  AC <input v-model.number="editAC" type="number" min="1" class="input input-sm mt-0.5" />
                </label>
                <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
                  Lvl <input v-model.number="editLevel" type="number" min="1" max="20" class="input input-sm mt-0.5" />
                </label>
              </div>
              <div class="flex justify-end gap-1 lg:gap-1.5">
                <button class="btn-secondary btn-xs lg:btn-sm" @click="editingPlayer = null">Cancel</button>
                <button class="btn-primary btn-xs lg:btn-sm" @click="savePlayerEdit">Save</button>
              </div>
            </div>
          </template>

          <!-- View Mode -->
          <template v-else>
            <div class="flex items-center gap-1.5 lg:gap-2">
              <div class="flex-1 min-w-0">
                <span class="block font-semibold truncate text-text text-sm lg:text-base">{{ player.name }}</span>
                <span class="text-[0.5625rem] lg:text-[0.6875rem] text-dim">
                  <template v-if="player.class">
                    Lvl {{ player.level }} {{ player.class }}
                  </template>
                  <template v-else>
                    Level {{ player.level || '?' }}
                  </template>
                </span>
              </div>
              <div class="flex gap-1 lg:gap-1.5 shrink-0">
                <span class="text-[0.5625rem] lg:text-[0.6875rem] font-semibold px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-success">{{ player.maxHP }} HP</span>
                <span class="text-[0.5625rem] lg:text-[0.6875rem] font-semibold px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-accent">AC {{ player.ac }}</span>
              </div>
              <div class="flex gap-0.5 lg:gap-1 shrink-0">
                <button
                  class="w-6 h-6 lg:w-7 lg:h-7 rounded bg-[var(--color-accent)] text-white text-lg lg:text-xl font-semibold flex items-center justify-center hover:scale-105 transition-transform"
                  @click="addPlayerToEncounter(player)"
                  title="Add to combat"
                >
                  +
                </button>
                <button class="btn-icon btn-xs lg:btn-sm" @click="startEditPlayer(player)" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                  </svg>
                </button>
                <button class="btn-icon btn-xs lg:btn-sm btn-danger" @click="partyStore.removePlayer(player.id)" title="Remove">
                  ×
                </button>
              </div>
            </div>
            <div v-if="player.fortitude || player.reflex || player.will" class="flex gap-1.5 lg:gap-2 mt-1.5 pt-1.5 border-t border-[var(--color-border)] text-[0.5rem] lg:text-[0.625rem] text-dim flex-wrap">
              <span v-if="player.perception">Perc +{{ player.perception }}</span>
              <span v-if="player.fortitude">Fort +{{ player.fortitude }}</span>
              <span v-if="player.reflex">Ref +{{ player.reflex }}</span>
              <span v-if="player.will">Will +{{ player.will }}</span>
            </div>
          </template>
        </div>

        <!-- Empty Players -->
        <div v-if="partyStore.activeParty.value.players.length === 0" class="text-center py-6 lg:py-8 text-dim">
          <p class="text-sm">No players in party</p>
          <p class="text-xs mt-1">Add players manually or import from Pathbuilder</p>
        </div>
      </div>
    </template>

    <!-- Add Player Modal -->
    <div v-if="showAddPlayerModal" class="modal-overlay" @click.self="showAddPlayerModal = false">
      <div class="modal max-w-[480px] mx-4">
        <h3 class="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Add Player</h3>

        <!-- Method Tabs -->
        <div class="tabs mb-3 lg:mb-4">
          <button class="tab text-xs lg:text-sm" :class="{ 'tab-active': addMethod === 'link' }" @click="addMethod = 'link'">
            Link
          </button>
          <button class="tab text-xs lg:text-sm" :class="{ 'tab-active': addMethod === 'json' }" @click="addMethod = 'json'">
            JSON
          </button>
          <button class="tab text-xs lg:text-sm" :class="{ 'tab-active': addMethod === 'manual' }" @click="addMethod = 'manual'">
            Manual
          </button>
        </div>

        <!-- Pathbuilder Link -->
        <div v-if="addMethod === 'link'" class="min-h-[100px] lg:min-h-[120px]">
          <p class="text-[0.6875rem] lg:text-[0.8125rem] text-dim mb-2 lg:mb-3">Paste your Pathbuilder share link or character ID</p>
          <input
            v-model="pathbuilderLink"
            placeholder="Pathbuilder link or ID"
            class="input input-sm lg:input w-full"
            @keyup.enter="importFromLink"
          />
          <p class="text-[0.5625rem] lg:text-[0.6875rem] text-dim mt-2 italic">Character must be "Public" in Pathbuilder</p>
        </div>

        <!-- Paste JSON -->
        <div v-if="addMethod === 'json'" class="min-h-[100px] lg:min-h-[120px]">
          <p class="text-[0.6875rem] lg:text-[0.8125rem] text-dim mb-2 lg:mb-3">Export JSON from Pathbuilder: Menu → Export → Export to JSON</p>
          <textarea
            v-model="importJson"
            placeholder='{"success": true, "build": {...}}'
            rows="4"
            class="input input-sm lg:input w-full font-mono text-xs resize-y"
          ></textarea>
        </div>

        <!-- Manual Entry -->
        <div v-if="addMethod === 'manual'" class="min-h-[100px] lg:min-h-[120px]">
          <input
            v-model="newPlayerName"
            placeholder="Character name"
            class="input input-sm lg:input w-full mb-2"
            @keyup.enter="addPlayerManually"
          />
          <div class="flex gap-1.5 lg:gap-2">
            <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
              Max HP <input v-model.number="newPlayerHP" type="number" min="1" class="input input-sm w-full mt-0.5" />
            </label>
            <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
              AC <input v-model.number="newPlayerAC" type="number" min="1" class="input input-sm w-full mt-0.5" />
            </label>
            <label class="flex-1 text-[0.5625rem] lg:text-[0.6875rem] text-dim">
              Level <input v-model.number="newPlayerLevel" type="number" min="1" max="20" class="input input-sm w-full mt-0.5" />
            </label>
          </div>
        </div>

        <!-- Status Messages -->
        <p v-if="importError" class="text-danger text-xs lg:text-sm mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-success text-xs lg:text-sm mt-2">{{ importSuccess }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-1.5 lg:gap-2 mt-3 lg:mt-4">
          <button class="btn-secondary btn-sm lg:btn" @click="showAddPlayerModal = false">Done</button>
          <button
            v-if="addMethod === 'link'"
            class="btn-primary btn-sm lg:btn"
            @click="importFromLink"
            :disabled="!pathbuilderLink.trim() || isLoading"
          >
            {{ isLoading ? 'Loading...' : 'Import' }}
          </button>
          <button
            v-else-if="addMethod === 'json'"
            class="btn-primary btn-sm lg:btn"
            @click="importFromJson"
            :disabled="!importJson.trim()"
          >
            Import
          </button>
          <button
            v-else
            class="btn-primary btn-sm lg:btn"
            @click="addPlayerManually"
            :disabled="!newPlayerName.trim()"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Party Modal -->
    <div v-if="showManageModal" class="modal-overlay" @click.self="showManageModal = false">
      <div class="modal max-w-[500px] mx-4">
        <h3 class="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Manage Parties</h3>

        <div class="flex flex-col gap-1.5 lg:gap-2 mb-3 lg:mb-4 max-h-[250px] lg:max-h-[300px] overflow-y-auto">
          <div
            v-for="party in partyStore.state.parties"
            :key="party.id"
            class="flex items-center gap-1.5 lg:gap-2 p-2 bg-elevated rounded"
            :class="{ 'border border-[var(--color-accent)]': party.id === partyStore.state.activePartyId }"
          >
            <input
              :value="party.name"
              @input="partyStore.updatePartyName(party.id, ($event.target as HTMLInputElement).value)"
              class="flex-1 bg-transparent border-none border-b border-transparent p-1 text-sm lg:text-base text-[var(--color-text)] focus:border-b-[var(--color-accent)] focus:outline-none min-w-0"
            />
            <span class="text-[0.5625rem] lg:text-[0.6875rem] text-dim shrink-0">{{ party.players.length }} players</span>
            <button
              class="btn-xs lg:btn-sm shrink-0"
              :class="party.id === partyStore.state.activePartyId ? 'btn-primary' : 'btn-secondary'"
              @click="partyStore.setActiveParty(party.id)"
            >
              {{ party.id === partyStore.state.activePartyId ? 'Active' : 'Select' }}
            </button>
            <button
              class="btn-icon btn-xs lg:btn-sm btn-danger shrink-0"
              @click="partyStore.deleteParty(party.id)"
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>

        <button class="btn-secondary btn-sm lg:btn w-full mb-3 lg:mb-4" @click="partyStore.createParty()">+ New Party</button>

        <div class="flex justify-end">
          <button class="btn-primary btn-sm lg:btn" @click="showManageModal = false">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>
