<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { usePartyStore } from '../../stores/partyStore'
import type { StarshipRole } from '../../types/starship'
import RoleCard from './RoleCard.vue'

const props = defineProps<{
  roles: StarshipRole[]
}>()

const store = useStarshipStore()
const partyStore = usePartyStore()

// Assignment modal state
const showAssignModal = ref(false)
const assigningRoleId = ref<string | null>(null)
const customPlayerName = ref('')

// Get role assignments from active scene
const roleAssignments = computed(() => {
  if (!store.state.activeScene) return new Map<string, string>()

  const map = new Map<string, string>()
  for (const assignment of store.state.activeScene.roles) {
    map.set(assignment.roleId, assignment.playerName)
  }
  return map
})

// Get player for assignment
function getAssignedPlayer(roleId: string): string | undefined {
  return roleAssignments.value.get(roleId)
}

// Available players from party
const availablePlayers = computed(() => {
  const party = partyStore.activeParty.value
  if (!party?.players) return []
  return party.players.map(p => p.name)
})

function openAssignModal(roleId: string) {
  assigningRoleId.value = roleId
  customPlayerName.value = ''
  showAssignModal.value = true
}

function assignToPlayer(playerName: string) {
  if (!assigningRoleId.value) return

  store.assignRole(assigningRoleId.value, playerName)
  showAssignModal.value = false
  assigningRoleId.value = null
}

function assignCustomPlayer() {
  if (!assigningRoleId.value || !customPlayerName.value.trim()) return

  store.assignRole(assigningRoleId.value, customPlayerName.value.trim())
  showAssignModal.value = false
  assigningRoleId.value = null
  customPlayerName.value = ''
}

function unassignRole(roleId: string) {
  store.unassignRole(roleId)
}

// Group roles by type
const coreRoles = computed(() => props.roles.filter(r => !r.isCustom))
const customRoles = computed(() => props.roles.filter(r => r.isCustom))
</script>

<template>
  <div class="role-list">
    <!-- Core Roles -->
    <div class="role-group">
      <h3 class="group-title">Core Roles</h3>
      <div class="role-grid">
        <RoleCard
          v-for="role in coreRoles"
          :key="role.id"
          :role="role"
          :player-name="getAssignedPlayer(role.id)"
          @assign="openAssignModal"
          @unassign="unassignRole"
        />
      </div>
    </div>

    <!-- Custom Roles -->
    <div v-if="customRoles.length > 0" class="role-group">
      <h3 class="group-title">Custom Roles</h3>
      <div class="role-grid">
        <RoleCard
          v-for="role in customRoles"
          :key="role.id"
          :role="role"
          :player-name="getAssignedPlayer(role.id)"
          @assign="openAssignModal"
          @unassign="unassignRole"
        />
      </div>
    </div>

    <!-- Empty State for Custom Roles -->
    <div v-if="customRoles.length === 0" class="role-group">
      <h3 class="group-title">Custom Roles</h3>
      <p class="empty-state">No custom roles yet. Create one using the "+ Custom Role" button in the sidebar.</p>
    </div>

    <!-- Assignment Modal -->
    <Teleport to="body">
      <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
        <div class="modal">
          <h3 class="modal-title">Assign Role</h3>

          <div v-if="availablePlayers.length > 0" class="player-list">
            <p class="player-list-label">Select from party:</p>
            <button
              v-for="player in availablePlayers"
              :key="player"
              class="player-btn"
              @click="assignToPlayer(player)"
            >
              {{ player }}
            </button>
          </div>

          <div class="custom-player">
            <p class="player-list-label">Or enter a name:</p>
            <div class="custom-player-input">
              <input
                type="text"
                class="input"
                v-model="customPlayerName"
                placeholder="Player name"
                @keyup.enter="assignCustomPlayer"
              />
              <button
                class="btn btn-primary"
                :disabled="!customPlayerName.trim()"
                @click="assignCustomPlayer"
              >
                Assign
              </button>
            </div>
          </div>

          <button class="btn btn-secondary modal-cancel" @click="showAssignModal = false">
            Cancel
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.role-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.role-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .role-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .role-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.empty-state {
  font-size: 0.875rem;
  color: var(--color-text-dim);
  padding: 1rem;
  text-align: center;
  background: var(--color-bg-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  min-width: 320px;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.player-list {
  margin-bottom: 1rem;
}

.player-list-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.player-btn {
  display: block;
  width: 100%;
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.player-btn:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-hover);
}

.custom-player {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.custom-player-input {
  display: flex;
  gap: 0.5rem;
}

.custom-player-input .input {
  flex: 1;
}

.modal-cancel {
  width: 100%;
  margin-top: 0.5rem;
}

.input {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.875rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
