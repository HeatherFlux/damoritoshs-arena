<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { StarshipScene } from '../../types/starship'
import { getRoleById, getRoleName } from '../../data/starshipRoles'
import { useStarshipStore } from '../../stores/starshipStore'

const props = defineProps<{
  scene: StarshipScene
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start'): void
}>()

const store = useStarshipStore()

// Track PC initiative selections
interface PCSelection {
  playerName: string
  roleId: string
  roleSkill: string
  roll: number | null
}

const pcSelections = ref<PCSelection[]>([])

// Track threat auto-rolls
interface ThreatRoll {
  threatId: string
  name: string
  skill: string
  bonus: number
  roll: number
}

const threatRolls = ref<ThreatRoll[]>([])

// Build role options from scene's availableRoles (which may have duplicates like "gunner", "gunner")
// Deduplicate for the dropdown — PCs pick a role type, and multiple PCs can pick the same type
const availableRoleOptions = computed(() => {
  const sceneRoles = props.scene.availableRoles || []
  // Deduplicate role type IDs for dropdown options
  const uniqueRoles = [...new Set(sceneRoles)]
  return uniqueRoles.map(roleId => ({
    id: roleId,
    name: getRoleName(roleId)
  }))
})

// Check if all PCs have rolled
const allRolled = computed(() => {
  return pcSelections.value.every(pc => pc.roll !== null && pc.roll > 0)
})

// Initialize from scene roles
onMounted(() => {
  // Create PC selections from assigned roles
  const roleAssignments = props.scene.roles || []

  if (roleAssignments.length > 0) {
    pcSelections.value = roleAssignments.map(assignment => {
      const role = getRoleById(assignment.roleId)
      return {
        playerName: assignment.playerName,
        roleId: assignment.roleId,
        roleSkill: role?.primarySkills[0] || 'Piloting',
        roll: null
      }
    })
  } else {
    // If no roles assigned, create empty slots
    pcSelections.value = [
      { playerName: 'Player 1', roleId: 'pilot', roleSkill: 'Piloting', roll: null }
    ]
  }

  // Generate threat rolls
  rollThreats()
})

function rollThreats() {
  threatRolls.value = props.scene.threats
    .filter(t => !t.isDefeated)
    .map(threat => {
      const bonus = threat.initiativeBonus ?? 0
      const roll = Math.floor(Math.random() * 20) + 1 + bonus
      return {
        threatId: threat.id,
        name: threat.name,
        skill: threat.initiativeSkill || 'Piloting',
        bonus,
        roll
      }
    })
}

function addPlayer() {
  const playerNum = pcSelections.value.length + 1
  pcSelections.value.push({
    playerName: `Player ${playerNum}`,
    roleId: 'pilot',
    roleSkill: 'Piloting',
    roll: null
  })
}

function removePlayer(index: number) {
  if (pcSelections.value.length > 1) {
    pcSelections.value.splice(index, 1)
  }
}

function updateRole(index: number, roleId: string) {
  const role = getRoleById(roleId)
  pcSelections.value[index].roleId = roleId
  pcSelections.value[index].roleSkill = role?.primarySkills[0] || 'Piloting'
}

function getRoleSkillOptions(roleId: string): string[] {
  const role = getRoleById(roleId)
  if (!role) return ['Piloting']
  return role.primarySkills.length > 0 ? role.primarySkills : ['Perception']
}

function rerollThreats() {
  rollThreats()
}

function startScene() {
  // Build PC initiatives for store
  const pcInitiatives = pcSelections.value
    .filter(pc => pc.roll !== null)
    .map(pc => ({
      playerName: pc.playerName,
      roleId: pc.roleId,
      roleSkill: pc.roleSkill,
      roll: pc.roll as number
    }))

  store.rollInitiative(pcInitiatives)
  emit('start')
}

function skipInitiative() {
  store.skipInitiative()
  emit('start')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal initiative-modal">
      <div class="modal-header">
        <h2>Roll Initiative</h2>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <p class="modal-description">
        Each player selects their role and enters their initiative roll.
        Threats roll automatically.
      </p>

      <!-- PC Section -->
      <div class="section">
        <div class="section-header">
          <h3>Players</h3>
          <button class="btn btn-sm btn-secondary" @click="addPlayer">+ Add Player</button>
        </div>

        <div class="players-list">
          <div v-for="(pc, index) in pcSelections" :key="index" class="player-row">
            <input
              type="text"
              class="input player-name"
              v-model="pc.playerName"
              placeholder="Player name"
            />

            <select class="input role-select" :value="pc.roleId" @change="updateRole(index, ($event.target as HTMLSelectElement).value)">
              <option v-for="role in availableRoleOptions" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>

            <select class="input skill-select" v-model="pc.roleSkill">
              <option v-for="skill in getRoleSkillOptions(pc.roleId)" :key="skill" :value="skill">
                {{ skill }}
              </option>
            </select>

            <input
              type="number"
              class="input roll-input"
              v-model.number="pc.roll"
              placeholder="Roll"
              min="1"
            />

            <button
              v-if="pcSelections.length > 1"
              class="remove-btn"
              @click="removePlayer(index)"
            >
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- Threats Section -->
      <div class="section">
        <div class="section-header">
          <h3>Threats</h3>
          <button class="btn btn-sm btn-secondary" @click="rerollThreats">Reroll All</button>
        </div>

        <div class="threats-list">
          <div v-for="threat in threatRolls" :key="threat.threatId" class="threat-row">
            <span class="threat-name">{{ threat.name }}</span>
            <span class="threat-skill">{{ threat.skill }} +{{ threat.bonus }}</span>
            <span class="threat-roll">
              <span class="roll-value">{{ threat.roll }}</span>
            </span>
          </div>

          <div v-if="threatRolls.length === 0" class="no-threats">
            No active threats in this scene.
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="skipInitiative">
          Skip Initiative
        </button>
        <button
          class="btn btn-primary"
          :disabled="!allRolled"
          @click="startScene"
        >
          Start Scene
        </button>
      </div>

      <p v-if="!allRolled" class="validation-hint">
        Enter initiative rolls for all players to continue.
      </p>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-accent);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text);
}

.modal-description {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: var(--color-text-dim);
  margin: 0.75rem 0;
}

.section {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.section:last-of-type {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.players-list,
.threats-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.input {
  padding: 0.5rem;
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

.player-name {
  flex: 1;
  min-width: 120px;
}

.role-select {
  width: 130px;
}

.skill-select {
  width: 120px;
}

.roll-input {
  width: 70px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

/* Hide number input spinners */
.roll-input::-webkit-inner-spin-button,
.roll-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.roll-input {
  -moz-appearance: textfield;
  appearance: textfield;
}

.remove-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.remove-btn:hover {
  color: var(--color-danger);
}

.threat-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.threat-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.threat-skill {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.threat-roll {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
}

.roll-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.no-threats {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.validation-hint {
  padding: 0 1rem 1rem;
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-warning);
  text-align: right;
}
</style>
