<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStarshipStore } from '../../stores/starshipStore'
import { getRoleName, getRoleColor } from '../../data/starshipRoles'
import type { StarshipAction } from '../../types/starship'
import { normalizeObjective } from '../../types/starship'
import { rollD20, rollDamage } from '../../utils/dice'
import { getDCForLevel } from '../../utils/dcTable'
import ThreatCard from './ThreatCard.vue'
import InitiativeTracker from './InitiativeTracker.vue'
import InitiativeRollModal from './InitiativeRollModal.vue'
import ActionRollPanel from './ActionRollPanel.vue'
import ActionIcon from '../ActionIcon.vue'
import MonteCarloModal from './MonteCarloModal.vue'

const store = useStarshipStore()

// Track whether to show initiative modal
const showInitiativeModal = ref(false)

// Monte Carlo simulation modal — pre-game balance preview.
const showMonteCarlo = ref(false)

const scene = computed(() => store.state.activeScene)
const starship = computed(() => scene.value?.starship)

// Initiative state
const initiativeRolled = computed(() => scene.value?.initiativeRolled ?? false)
const currentTurn = computed(() => store.getCurrentTurn())

// Get scene-specific actions for the current PC's role
const currentTurnActions = computed((): StarshipAction[] => {
  if (!currentTurn.value || currentTurn.value.type !== 'pc' || !scene.value) return []
  const roleId = currentTurn.value.roleId
  if (!roleId) return []

  // Filter scene actions where the action's role field matches the current role
  // role field can be: "pilot", "gunner", "any", "captain|pilot", "magic_officer|science_officer"
  return scene.value.starshipActions.filter(action => {
    if (action.role === 'any') return true
    const allowedRoles = action.role.split('|')
    return allowedRoles.includes(roleId)
  })
})

const currentTurnRoleName = computed(() => {
  if (!currentTurn.value || currentTurn.value.type !== 'pc') return ''
  return getRoleName(currentTurn.value.roleId || '')
})

// Skill bonuses on the PC starship (e.g. "Piloting +2"). Surfaced as
// chips on the ship card so the GM doesn't have to remember them.
const shipBonusEntries = computed((): Array<{ skill: string; value: number }> => {
  const bonuses = starship.value?.bonuses ?? {}
  return Object.entries(bonuses)
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([skill, value]) => ({ skill, value: value as number }))
    .sort((a, b) => a.skill.localeCompare(b.skill))
})

// Available crew roles for this scene, rendered as pills.
const availableRoleNames = computed((): string[] => {
  return (scene.value?.availableRoles ?? []).map(r => getRoleName(r))
})

// Group all scene starship actions by allowed role(s) for an always-visible
// list. Actions whose role is "any" land in a separate "Any" bucket so the
// GM can find them quickly.
const groupedSceneActions = computed(() => {
  const byRole: Record<string, StarshipAction[]> = {}
  const order: string[] = []
  for (const action of scene.value?.starshipActions ?? []) {
    const roles = action.role === 'any' ? ['any'] : action.role.split('|')
    for (const r of roles) {
      if (!byRole[r]) {
        byRole[r] = []
        order.push(r)
      }
      byRole[r].push(action)
    }
  }
  return order.map(roleId => ({
    roleId,
    label: roleId === 'any' ? 'Any Role' : getRoleName(roleId),
    actions: byRole[roleId],
  }))
})

// Check if a threat is the current turn
function isThreatCurrentTurn(threatId: string): boolean {
  if (!currentTurn.value) return false
  return currentTurn.value.threatId === threatId
}

// The modal used to auto-pop on every scene start, which blocked the GM
// from seeing the runner at all and was hard to dismiss. Now it's purely
// opt-in: the header surfaces a "Roll Initiative" button until initiative
// has been rolled, and the GM clicks it when they're ready.

// Quick damage input
const damageAmount = ref(0)

// HP percentage for bar
const hpPercent = computed(() => {
  if (!starship.value) return 100
  return Math.round((starship.value.currentHP / starship.value.maxHP) * 100)
})

const shieldPercent = computed(() => {
  if (!starship.value) return 100
  return Math.round((starship.value.currentShields / starship.value.maxShields) * 100)
})

const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

// Victory condition status
const victoryStatus = computed(() => {
  if (!scene.value) return null

  switch (scene.value.victoryCondition) {
    case 'defeat': {
      const remaining = scene.value.threats.filter(t => !t.isDefeated).length
      const total = scene.value.threats.length
      return {
        label: 'Threats Remaining',
        current: remaining,
        target: 0,
        display: `${remaining} / ${total} active`
      }
    }
    case 'victory_points': {
      const current = scene.value.currentVP
      const target = scene.value.vpRequired || 10
      return {
        label: 'Victory Points',
        current,
        target,
        display: `${current} / ${target} VP`
      }
    }
    case 'survival': {
      const current = scene.value.currentRound
      const target = scene.value.survivalRounds || 5
      return {
        label: 'Rounds Survived',
        current,
        target,
        display: `Round ${current} / ${target}`
      }
    }
    case 'escape':
      return {
        label: 'Objective',
        current: 0,
        target: 1,
        display: 'Escape the encounter'
      }
    case 'custom':
      return {
        label: 'Custom Objective',
        current: 0,
        target: 1,
        display: scene.value.customCondition || 'Complete the objective'
      }
    default:
      return null
  }
})

const isVictory = computed(() => {
  if (!scene.value || !victoryStatus.value) return false

  switch (scene.value.victoryCondition) {
    case 'defeat':
      return scene.value.threats.every(t => t.isDefeated)
    case 'victory_points':
      return scene.value.currentVP >= (scene.value.vpRequired || 10)
    case 'survival':
      return scene.value.currentRound > (scene.value.survivalRounds || 5)
    default:
      return false
  }
})

// Actions
function nextRound() {
  if (initiativeRolled.value) {
    // Use initiative system
    store.nextTurn()
  } else {
    // Manual round advancement
    store.advanceRound()
  }
}

function openInitiativeModal() {
  showInitiativeModal.value = true
}

function closeInitiativeModal() {
  showInitiativeModal.value = false
}

function onInitiativeStart() {
  showInitiativeModal.value = false
}

function addVP(amount: number) {
  store.addVP(amount)
}

function applyDamage() {
  if (damageAmount.value > 0) {
    store.damageStarship(damageAmount.value)
    damageAmount.value = 0
  }
}

function applyHeal() {
  if (damageAmount.value > 0) {
    store.healStarship(damageAmount.value)
    damageAmount.value = 0
  }
}

// Objectives — accept legacy string[] and new {text, hidden}[] shape.
const normalizedObjectives = computed(() => {
  return (scene.value?.additionalObjectives ?? []).map(o => normalizeObjective(o))
})

/**
 * Toggle the hidden flag on an objective in place. Converts a legacy
 * string entry to the object shape if needed so the flag persists.
 */
function toggleObjectiveHidden(idx: number) {
  if (!scene.value) return
  const list = scene.value.additionalObjectives
  if (!list) return
  const current = list[idx]
  const wasHidden = typeof current === 'string' ? false : !!current.hidden
  const text = typeof current === 'string' ? current : current.text
  list[idx] = { text, hidden: !wasHidden }
  store.persistActiveScene()
}

function damageThreat(threatId: string, amount: number) {
  store.damageThreat(threatId, amount)
}

function toggleThreatDefeated(threatId: string) {
  const threat = scene.value?.threats.find(t => t.id === threatId)
  if (threat) {
    store.updateThreat(threatId, { isDefeated: !threat.isDefeated })
  }
}


function endScene() {
  if (confirm('End this scene?')) {
    store.endScene()
  }
}

// ============ Player View / Sync ============

const syncEnabling = ref(false)
const copySuccess = ref(false)

async function openPlayerView() {
  syncEnabling.value = true
  try {
    const result = await store.openPlayerView()
    if (result.success) {
      copySuccess.value = true
      setTimeout(() => copySuccess.value = false, 2500)
    }
  } finally {
    syncEnabling.value = false
  }
}

function stopSync() {
  store.disableRemoteSync()
}

// ============ Edit Mode (in-scene scene/threat editing) ============

// When true, threats render in their full editing template and the GM can
// tweak ship stats, victory conditions, etc. live during a running scene.
// All edits route through existing store mutators so the player view and
// localStorage stay in sync.
const editMode = ref(false)

function toggleEditMode() {
  editMode.value = !editMode.value
}

function addThreatLive() {
  store.addThreat()
}

function updateSceneField<K extends 'name' | 'level' | 'description' | 'vpRequired' | 'survivalRounds' | 'customCondition'>(
  field: K,
  value: unknown
) {
  if (!scene.value) return
  // Direct mutation is fine — store.state.activeScene is reactive and
  // saveToLocalStorage runs through the store's mutators when fields like
  // VP/round change. For these meta fields a manual saveScene call isn't
  // needed because the activeScene itself is persisted on every broadcast.
  // Cast to unknown then to the proper field type to satisfy the indexer.
  ;(scene.value as unknown as Record<string, unknown>)[field] = value
  store.persistActiveScene()
}

function updateShipField(field: keyof NonNullable<typeof starship.value>, value: number | string) {
  if (!starship.value) return
  store.updateStarship({ [field]: value })
}

// ============ Layout state ============

const sceneBaseDC = computed(() => getDCForLevel(scene.value?.level ?? 1))

const vpInlineTitle = computed(() => {
  const s = scene.value
  if (!s) return ''
  switch (s.victoryCondition) {
    case 'victory_points':
      return s.vpRequired
        ? `Victory Points: ${s.currentVP} / ${s.vpRequired}`
        : `Victory Points: ${s.currentVP}`
    case 'survival':
      return s.survivalRounds
        ? `Survive ${s.survivalRounds} rounds (currently round ${s.currentRound})`
        : `Survive — round ${s.currentRound}`
    case 'defeat': {
      const active = s.threats.filter(t => !t.isDefeated).length
      return `${active} active threat${active === 1 ? '' : 's'} of ${s.threats.length}`
    }
    case 'escape':
      return 'Escape the encounter'
    case 'custom':
      return s.customCondition || 'Complete the custom objective'
    default:
      return ''
  }
})

// ============ Click-to-roll helpers (combat-tab pattern) ============

/**
 * Roll a flat d20 + skill bonus and log it. Used by the ship's bonus chips
 * (e.g. "Computers +1") so the GM can roll a crew check straight from the
 * stat block, no separate "Roll" button needed.
 */
function rollShipSkill(skill: string, bonus: number) {
  const actor = starship.value?.name ?? 'Crew'
  const roll = rollD20(bonus, skill, actor)
  store.logAction(
    currentTurn.value?.roleId ?? 'crew',
    actor,
    skill,
    roll.isNat20 ? 'critical_success' : roll.isNat1 ? 'critical_failure' : 'success',
    roll.breakdown,
  )
}

/**
 * Roll a saving throw for the PC ship. Outcome is logged based on natural
 * 1/20 only — the actual success/failure depends on the incoming DC the
 * GM is rolling against, which the table will narrate.
 */
function rollShipSave(save: string, bonus: number) {
  const actor = starship.value?.name ?? 'Ship'
  const roll = rollD20(bonus, `${save} save`, actor)
  store.logAction(
    currentTurn.value?.roleId ?? 'crew',
    actor,
    `${save} save`,
    roll.isNat20 ? 'critical_success' : roll.isNat1 ? 'critical_failure' : 'success',
    roll.breakdown,
  )
}

/**
 * Roll a starship action's damage expression directly (the click-target on
 * the Crew Actions reference list). The action's skill check is rolled by
 * clicking the threat's defense it targets, or via crew skill bonuses.
 */
function rollActionDamage(action: StarshipAction) {
  if (!action.damage) return
  const actor = currentTurn.value?.name ?? 'Crew'
  const dmg = rollDamage(action.damage, action.name, actor, false)
  store.logAction(
    currentTurn.value?.roleId ?? 'crew',
    actor,
    `${action.name} damage`,
    'success',
    dmg.breakdown,
  )
}
</script>

<template>
  <div v-if="scene && starship" class="scene-runner">
    <!-- Initiative Roll Modal -->
    <InitiativeRollModal
      v-if="showInitiativeModal"
      :scene="scene"
      @close="closeInitiativeModal"
      @start="onInitiativeStart"
    />

    <!-- Scene Header -->
    <div class="scene-header panel" :class="{ 'edit-mode': editMode }">
      <div class="scene-info">
        <template v-if="editMode">
          <input
            class="scene-name-input"
            :value="scene.name"
            @input="updateSceneField('name', ($event.target as HTMLInputElement).value)"
            placeholder="Scene name"
          />
          <input
            type="number"
            class="scene-level-input"
            :value="scene.level"
            min="1"
            max="20"
            @input="updateSceneField('level', Number(($event.target as HTMLInputElement).value) || 1)"
          />
        </template>
        <template v-else>
          <h2 class="scene-name">{{ scene.name }}</h2>
          <span class="scene-level">Level {{ scene.level }}</span>
        </template>
      </div>

      <div class="round-tracker">
        <button
          class="btn btn-sm"
          :class="editMode ? 'btn-primary' : 'btn-secondary'"
          @click="toggleEditMode"
          :title="editMode ? 'Exit edit mode' : 'Edit scene + threats during play'"
        >
          {{ editMode ? 'Done Editing' : 'Edit' }}
        </button>
        <button
          class="btn btn-secondary btn-sm"
          @click="showMonteCarlo = true"
          title="Run a Monte Carlo simulation to estimate how this scene will play out"
        >
          Simulate
        </button>
        <span class="round-label">Round</span>
        <span class="round-number">{{ scene.currentRound }}</span>

        <!-- Victory progress chip — content adapts to the scene's
             victory condition (per GM Core's three primary types plus
             custom/escape variants). VP gets the +/-/+2 controls,
             survival shows rounds remaining, defeat shows active
             threats, custom shows the GM's objective text. -->
        <div class="vp-inline" :title="vpInlineTitle" :class="`vp-inline-${scene.victoryCondition}`">
          <!-- Victory Points: counter with controls -->
          <template v-if="scene.victoryCondition === 'victory_points'">
            <span class="vp-inline-label">Victory Points</span>
            <button class="vp-inline-btn" @click="addVP(-1)" :disabled="scene.currentVP <= 0">−</button>
            <span class="vp-inline-value">
              {{ scene.currentVP }}<template v-if="scene.vpRequired"> / {{ scene.vpRequired }}</template>
            </span>
            <button class="vp-inline-btn" @click="addVP(1)">+</button>
            <button class="vp-inline-btn vp-plus2" @click="addVP(2)" title="+2 Victory Points">+2</button>
          </template>

          <!-- Survival: rounds remaining -->
          <template v-else-if="scene.victoryCondition === 'survival'">
            <span class="vp-inline-label">Survive</span>
            <span class="vp-inline-value">
              {{ scene.currentRound }}<template v-if="scene.survivalRounds"> / {{ scene.survivalRounds }}</template>
              <span class="vp-inline-suffix">rds</span>
            </span>
          </template>

          <!-- Defeat: active threat count -->
          <template v-else-if="scene.victoryCondition === 'defeat'">
            <span class="vp-inline-label">Threats</span>
            <span class="vp-inline-value">
              {{ scene.threats.filter(t => !t.isDefeated).length }} / {{ scene.threats.length }}
              <span class="vp-inline-suffix">active</span>
            </span>
          </template>

          <!-- Escape: simple in-progress chip -->
          <template v-else-if="scene.victoryCondition === 'escape'">
            <span class="vp-inline-label">Escape</span>
            <span class="vp-inline-value">in progress</span>
          </template>

          <!-- Custom: render the GM's objective text -->
          <template v-else-if="scene.victoryCondition === 'custom'">
            <span class="vp-inline-label">Objective</span>
            <span class="vp-inline-value vp-inline-objective">
              {{ scene.customCondition || 'Complete the objective' }}
            </span>
          </template>
        </div>

        <button
          v-if="!initiativeRolled"
          class="btn btn-secondary btn-sm"
          @click="openInitiativeModal"
        >
          Roll Initiative
        </button>
        <!-- When initiative is rolled AND there's an actual order, Next
             Turn advances within the round. If the GM skipped initiative
             (initiativeRolled=true but empty order), only Next Round
             makes sense — nextTurn would otherwise bump the round on
             every click because `nextIdx <= currentIdx` (0 <= 0) hits
             the wrap-around path immediately. -->
        <button
          v-if="initiativeRolled && scene.initiativeOrder.length > 0"
          class="btn btn-primary btn-sm"
          @click="store.nextTurn()"
          title="Advance to the next combatant in initiative order"
        >
          Next Turn
        </button>
        <button
          class="btn btn-primary btn-sm"
          @click="store.advanceRound()"
          :title="`Advance to round ${(scene.currentRound ?? 0) + 1} and regenerate shields`"
        >
          Next Round
        </button>
        <button
          class="btn btn-accent btn-sm"
          :disabled="syncEnabling"
          title="Open the player view, copy the share link, start sync if available"
          @click="openPlayerView"
        >
          {{ syncEnabling ? 'Connecting...' : copySuccess ? 'Link Copied!' : 'Player View' }}
        </button>
        <button
          v-if="store.state.isRemoteSyncEnabled"
          class="btn btn-danger btn-sm"
          title="Stop sharing — disconnect player view sync"
          @click="stopSync"
        >
          ■ Stop
        </button>
        <button class="btn btn-danger btn-sm" @click="endScene" title="End scene">End</button>
      </div>
    </div>

    <div class="runner-grid">
      <!-- Left Column: Ship Status & Initiative -->
      <aside class="col col-ship">
        <!-- Initiative Tracker (when rolled) -->
        <InitiativeTracker
          v-if="initiativeRolled && scene.initiativeOrder.length > 0"
          :scene="scene"
        />

        <!-- PC Action Roll Panel (when it's a PC's turn) -->
        <ActionRollPanel
          v-if="currentTurn?.type === 'pc' && currentTurnActions.length > 0"
          :turn="currentTurn"
          :actions="currentTurnActions"
          :role-name="currentTurnRoleName"
          :role-id="currentTurn.roleId || ''"
          :scene-level="scene.level"
          :ship-bonuses="starship.bonuses"
          @action-resolved="nextRound"
        />

        <!-- Ship Status Card -->
        <div class="ship-card panel">
          <input
            v-if="editMode"
            class="ship-name-input"
            :value="starship.name"
            @input="updateShipField('name', ($event.target as HTMLInputElement).value)"
            placeholder="Ship name"
          />
          <h3 v-else class="card-title">{{ starship.name }}</h3>

          <!-- Skill bonuses (Starship Bonuses from GM Core) — click any
               chip to roll d20 + that bonus, like attack stats in combat. -->
          <div v-if="shipBonusEntries.length > 0" class="ship-bonuses-row">
            <span
              v-for="b in shipBonusEntries"
              :key="b.skill"
              class="bonus-chip rollable"
              :title="`Click to roll d20 +${b.value} ${b.skill}`"
              @click="rollShipSkill(b.skill, b.value)"
            >
              {{ b.skill }} +{{ b.value }}
            </span>
          </div>

          <!-- Available roles — what crew positions PCs can occupy -->
          <div v-if="availableRoleNames.length > 0" class="ship-roles-row">
            <span class="ship-roles-label">Roles</span>
            <span
              v-for="(r, i) in availableRoleNames"
              :key="i"
              class="role-pill"
            >
              {{ r }}
            </span>
          </div>

          <!-- Live-edit max stats (only visible in edit mode) -->
          <div v-if="editMode" class="live-edit-grid">
            <label class="live-edit-field">
              <span>AC</span>
              <input type="number" :value="starship.ac" @input="updateShipField('ac', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
            <label class="live-edit-field">
              <span>Fort</span>
              <input type="number" :value="starship.fortitude" @input="updateShipField('fortitude', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
            <label class="live-edit-field">
              <span>Ref</span>
              <input type="number" :value="starship.reflex" @input="updateShipField('reflex', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
            <label class="live-edit-field">
              <span>Max HP</span>
              <input type="number" :value="starship.maxHP" @input="updateShipField('maxHP', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
            <label class="live-edit-field">
              <span>Max Sh</span>
              <input type="number" :value="starship.maxShields" @input="updateShipField('maxShields', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
            <label class="live-edit-field">
              <span>Regen</span>
              <input type="number" :value="starship.shieldRegen" @input="updateShipField('shieldRegen', Number(($event.target as HTMLInputElement).value) || 0)" />
            </label>
          </div>

          <!-- HP/Shield bars + damage/heal — combat-tab `hp-bar flex-1`
               pattern. One control row shared by both bars: damage
               cascades shields-then-hull via store.damageStarship; heal
               targets hull via store.healStarship. Per-round shield
               regen is automatic on Next Round; the manual Regen button
               below is for advancing round outside of Next Turn. -->
          <div class="ship-stats-row">
            <div class="ship-bars">
              <div class="hp-bar ship-bar-shields">
                <div class="hp-bar-fill shield-fill" :style="{ width: shieldPercent + '%' }"></div>
                <div class="hp-bar-text">
                  {{ starship.currentShields }}<span class="opacity-50">/</span>{{ starship.maxShields }} Shields
                </div>
              </div>
              <div class="hp-bar ship-bar-hull">
                <div class="hp-bar-fill" :style="{ width: hpPercent + '%', background: hpColor }"></div>
                <div class="hp-bar-text">
                  {{ starship.currentHP }}<span class="opacity-50">/</span>{{ starship.maxHP }} Hull
                </div>
              </div>
            </div>
            <div class="hp-controls shrink-0">
              <button class="hp-btn hp-btn-damage" @click="applyDamage">−</button>
              <input
                type="number"
                class="hp-input"
                v-model.number="damageAmount"
                placeholder="0"
                @keyup.enter="applyDamage"
              />
              <button class="hp-btn hp-btn-heal" @click="applyHeal">+</button>
            </div>
          </div>

          <div class="ship-stat-row-sub">
            <button class="stat-btn regen" @click="store.regenerateShields()">Regen (+{{ starship.shieldRegen }})</button>
          </div>

          <!-- Defenses — AC is the target the GM rolls vs. Fort/Ref are
               saving-throw modifiers, click to roll a save. -->
          <div class="defense-stats">
            <div class="defense-stat">
              <span class="defense-label">AC</span>
              <span class="defense-value">{{ starship.ac }}</span>
            </div>
            <div
              class="defense-stat rollable"
              :title="`Click to roll Fortitude save +${starship.fortitude}`"
              @click="rollShipSave('Fortitude', starship.fortitude)"
            >
              <span class="defense-label">Fort</span>
              <span class="defense-value">+{{ starship.fortitude }}</span>
            </div>
            <div
              class="defense-stat rollable"
              :title="`Click to roll Reflex save +${starship.reflex}`"
              @click="rollShipSave('Reflex', starship.reflex)"
            >
              <span class="defense-label">Ref</span>
              <span class="defense-value">+{{ starship.reflex }}</span>
            </div>
          </div>
        </div>

        <!-- Crew Actions reference — every starship action grouped by role.
             Click the damage badge to roll damage; the action's skill check
             rolls happen by clicking the threat's defense / DC it targets,
             or the ship's skill bonus chips above. -->
        <div v-if="(scene.starshipActions?.length ?? 0) > 0" class="actions-ref-panel panel">
          <h3 class="card-title">Crew Actions</h3>
          <div
            v-for="group in groupedSceneActions"
            :key="group.roleId"
            class="action-role-group"
          >
            <div class="action-role-label" :style="{ color: getRoleColor(group.roleId) }">
              {{ group.label }}
            </div>
            <div
              v-for="action in group.actions"
              :key="action.id"
              class="action-ref-row"
            >
              <ActionIcon :action="action.actionCost" class="action-cost-icon" />
              <span class="action-ref-name">{{ action.name }}</span>
              <span v-if="action.skills.length" class="action-ref-skills">
                {{ action.skills.join(' / ') }}
              </span>
              <span v-if="action.isAttack" class="attack-badge">ATK</span>
              <span
                v-if="action.damage"
                class="damage-badge rollable"
                @click="rollActionDamage(action)"
                :title="`Roll ${action.damage} damage`"
              >{{ action.damage }}</span>
              <span class="action-ref-dc">DC {{ action.dc ?? sceneBaseDC }}</span>
            </div>
          </div>
        </div>

        <!-- Scene Description -->
        <div v-if="scene.description" class="scene-description panel">
          <h4>Scene Notes</h4>
          <p>{{ scene.description }}</p>
        </div>

        <!-- Victory banner shows only when the win condition is met. The
             counter and edits are in the header now. -->
        <div v-if="isVictory" class="victory-banner panel">VICTORY!</div>

        <!-- Inline edits for the target / objective when in edit mode -->
        <div v-if="editMode" class="victory-edit-row panel">
          <label v-if="scene.victoryCondition === 'victory_points'" class="live-edit-field">
            <span>VP target</span>
            <input
              type="number"
              min="1"
              :value="scene.vpRequired ?? ''"
              placeholder="10"
              @input="updateSceneField('vpRequired', Number(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>
          <label v-else-if="scene.victoryCondition === 'survival'" class="live-edit-field">
            <span>Survive rounds</span>
            <input
              type="number"
              min="1"
              :value="scene.survivalRounds ?? ''"
              placeholder="5"
              @input="updateSceneField('survivalRounds', Number(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>
          <label v-else-if="scene.victoryCondition === 'custom'" class="live-edit-field flex-1">
            <span>Objective</span>
            <input
              type="text"
              :value="scene.customCondition ?? ''"
              placeholder="Describe the win condition"
              @input="updateSceneField('customCondition', ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <!-- Additional Objectives — eye toggle hides each from the
             player view. Useful for spoiler-y objectives the GM only
             reveals when relevant. -->
        <div v-if="normalizedObjectives.length > 0" class="objectives-card panel">
          <h3 class="card-title">Additional Objectives</h3>
          <ul class="objectives-list">
            <li
              v-for="(obj, idx) in normalizedObjectives"
              :key="idx"
              class="objective-item"
              :class="{ 'objective-hidden': obj.hidden }"
            >
              <button
                class="objective-eye"
                :class="{ active: obj.hidden }"
                @click="toggleObjectiveHidden(idx)"
                :title="obj.hidden ? 'Hidden from players — click to reveal' : 'Visible to players — click to hide'"
              >{{ obj.hidden ? '◌' : '●' }}</button>
              <span>{{ obj.text }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Center Column: Threats (the focus of the scene) -->
      <main class="col col-threats">
        <div class="threats-header">
          <h3 class="threats-title">Threats</h3>
          <span class="threats-count">
            {{ scene.threats.filter(t => !t.isDefeated).length }} / {{ scene.threats.length }} active
          </span>
        </div>

        <div class="threats-list">
          <ThreatCard
            v-for="threat in scene.threats"
            :key="threat.id"
            :threat="threat"
            :editing="editMode"
            :is-current-turn="isThreatCurrentTurn(threat.id)"
            @damage="(amt) => damageThreat(threat.id, amt)"
            @update="(updates) => store.updateThreat(threat.id, updates)"
            @remove="store.removeThreat(threat.id)"
            @toggle-defeated="toggleThreatDefeated(threat.id)"
          />
          <button
            v-if="editMode"
            class="btn btn-secondary add-threat-btn"
            @click="addThreatLive"
          >
            + Add Threat
          </button>
        </div>
      </main>

    </div>

    <!-- Monte Carlo simulator (pre-game tuning aid) -->
    <MonteCarloModal
      v-if="showMonteCarlo && scene"
      :scene="scene"
      @close="showMonteCarlo = false"
    />
  </div>
</template>

<style scoped>
/* Mobile-first flex layout (matches HackingPanel pattern). On phones the
   header + content stack vertically and the page scrolls; at 1024px+
   the content becomes a 2-column row with each column scrolling
   independently. */
.scene-runner {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  min-height: 0;
  background: var(--color-bg);
}

/* Scene Header — mobile-first. Stacks vertically on phones; lays out
   horizontally with space-between on tablets+. */
.scene-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

@media (min-width: 768px) {
  .scene-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
}

.scene-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.scene-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-accent);
}

.scene-level {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-tracker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

@media (min-width: 768px) {
  .round-tracker {
    gap: 0.5rem;
  }
}

.round-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.round-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  min-width: 2rem;
  text-align: center;
}

/* 3-column grid that fills the viewport. Each column scrolls
   independently. On narrow screens we collapse to a single column. */
/* Content layout: on mobile, single column that scrolls. At 1024px+,
   row layout with two columns each scrolling independently. */
.runner-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  position: relative;
  padding: 0.5rem;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .runner-grid {
    flex-direction: row;
    overflow-y: hidden;
  }
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

@media (min-width: 1024px) {
  .col {
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.25rem;
  }
  .col-ship {
    flex: 0 0 320px;
  }
  .col-threats {
    flex: 1;
    min-width: 0;
  }
}

.col-threats {
  /* Subtle inset background marks the threats column as the GM's
     primary work area. */
  background: color-mix(in srgb, var(--color-accent) 2%, transparent);
  border-radius: var(--radius-md);
  padding: 0.5rem;
}

@media (min-width: 1024px) {
  .col-threats {
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
  }
}

/* Ship and threat card panels — keep a sensible max width on tiny
   viewports so big values don't push the page width. */
.ship-card,
.scene-actions-panel,
.actions-ref-panel {
  width: 100%;
  min-width: 0;
}

/* Footer pinned to the bottom of the runner. */
.runner-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

/* Side-panel collapse toggle. Sits absolutely on the right edge so
   collapsing it doesn't change layout positions. */
.side-toggle {
  position: absolute;
  top: 50%;
  right: 0.25rem;
  transform: translateY(-50%);
  width: 24px;
  height: 60px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  cursor: pointer;
  z-index: 5;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.side-toggle:hover {
  background: var(--color-bg);
  color: var(--color-accent);
}

/* Floating d20 quick-roll button — bottom-right, above everything.
   The popover anchors to the same corner. */
.floating-d20 {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 50;
}

.floating-d20:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.floating-d20.open {
  transform: rotate(20deg);
}

.floating-roll-popover {
  position: fixed;
  bottom: 5.5rem;
  right: 1.25rem;
  width: 320px;
  padding: 0.75rem;
  z-index: 49;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

/* Ship Card */
.ship-card {
  padding: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Ship stats row: bars stacked on the left, combat-tab hp-controls on
   the right. Reuses the global .hp-bar / .hp-bar-fill / .hp-bar-text /
   .hp-controls / .hp-btn / .hp-input classes from style.css so the GM
   screen and combat tab share visual treatment. */
.ship-stats-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.ship-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.shield-fill {
  background: var(--color-primary);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 50%, transparent);
}

.ship-bar-shields {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg));
  border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
}

.ship-stat-row-sub {
  display: flex;
  margin-bottom: 1rem;
}

.stat-btn {
  flex: 1;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stat-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.stat-btn.regen {
  flex: 1;
}

.btn-danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

/* Defense Stats */
.defense-stats {
  display: flex;
  gap: 0.5rem;
}

.defense-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.defense-label {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.defense-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Victory Card */
.victory-card {
  padding: 1rem;
  text-align: center;
}

.victory-card.victory {
  border-color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
}

.victory-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.vp-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

/* Inline VP tracker in the scene header — compact, since VP is core to
   nearly every cinematic starship scene per GM Core. */
.vp-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-left: 0.5rem;
}

.vp-inline-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}

.vp-inline-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  min-width: 1.5rem;
  text-align: center;
}

.vp-inline-suffix {
  font-family: inherit;
  font-size: 0.625rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  margin-left: 0.25rem;
}

.vp-inline-objective {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: none;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  min-width: 0;
}

.vp-inline-btn {
  padding: 0 0.375rem;
  height: 22px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  cursor: pointer;
  line-height: 1;
}

.vp-inline-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 20%, var(--color-bg));
  border-color: var(--color-accent);
}

.vp-inline-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vp-inline-btn.vp-plus2 {
  font-size: 0.75rem;
  font-weight: 700;
}

.victory-banner {
  padding: 0.5rem;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: var(--color-success);
  color: white;
  border-radius: var(--radius-sm);
}

/* Quick roll widget — always-on d20+mod roller for off-script checks. */
.quick-roll-panel {
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.5rem;
}

.quick-roll-title {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  font-weight: 700;
  margin-bottom: 0.375rem;
}

.quick-roll-fields {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.quick-roll-input {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.8125rem;
}

.quick-roll-mini {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.5625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
}

.quick-roll-mini input {
  width: 50px;
  padding: 0.25rem 0.375rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
}

.quick-roll-result {
  margin-top: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.quick-roll-result.outcome-critical-success {
  border-color: var(--color-success);
  color: var(--color-success);
}

.quick-roll-result.outcome-success {
  border-color: color-mix(in srgb, var(--color-success) 50%, transparent);
}

.quick-roll-result.outcome-failure {
  border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
}

.quick-roll-result.outcome-critical-failure {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* Ship card supplemental rows — bonuses, roles, all visible at-a-glance */
.ship-bonuses-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.375rem 0 0.5rem;
}

.bonus-chip {
  padding: 0.125rem 0.5rem;
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.02em;
}

.ship-roles-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.ship-roles-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  margin-right: 0.25rem;
}

.role-pill {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.6875rem;
  color: var(--color-text);
}

/* Always-on Scene Actions panel */
.scene-actions-panel {
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.panel-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.panel-section-header .hint {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-family: 'JetBrains Mono', monospace;
}

.quick-roll-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.quick-mod-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
}

.quick-mod-input {
  width: 60px;
  padding: 0.25rem 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.action-role-group {
  margin-bottom: 0.5rem;
}

.action-role-group:last-child {
  margin-bottom: 0;
}

.action-role-label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.25rem;
}

/* Reference rows on the right column (display-only with rollable badges).
   Gap between fields keeps name / skills / DC visually separated even when
   text wraps. */
.action-ref-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  margin-bottom: 0.25rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text);
}

.action-ref-name {
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.action-ref-skills {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-family: 'JetBrains Mono', monospace;
}

.action-ref-dc {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-accent);
  padding: 0.125rem 0.375rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.actions-hint {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  margin-top: 0.5rem;
  line-height: 1.4;
}

.action-cost-icon {
  flex-shrink: 0;
}

.scene-action-name {
  font-weight: 600;
  flex: 1;
}

.scene-action-skills {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-family: 'JetBrains Mono', monospace;
}

.attack-badge {
  padding: 0.0625rem 0.375rem;
  background: var(--color-danger);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.damage-badge {
  padding: 0.0625rem 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-warning, #f59e0b);
}

.scene-action-dc {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-accent);
  padding: 0.125rem 0.375rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

/* Edit-mode controls (live editing the running scene) */
.scene-header.edit-mode {
  border-color: var(--color-warning, #f59e0b);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-warning, #f59e0b) 30%, transparent);
}

.scene-name-input {
  font-size: 1.25rem;
  font-weight: 600;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.5rem;
  color: var(--color-text);
  width: 100%;
  max-width: 320px;
}

.scene-level-input {
  width: 60px;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

.ship-name-input {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.5rem;
  width: 100%;
}

.live-edit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px dashed color-mix(in srgb, var(--color-warning, #f59e0b) 40%, transparent);
  border-radius: var(--radius-sm);
}

.live-edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.live-edit-field input {
  padding: 0.25rem 0.375rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.victory-edit-row {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.add-threat-btn {
  margin-top: 0.5rem;
  width: 100%;
  border-style: dashed;
  border-color: color-mix(in srgb, var(--color-warning, #f59e0b) 50%, transparent);
}

/* Standalone VP tracker card (always visible, separate from the victory
   condition card so GMs can track VPs as a side meter for any scene). */
.vp-card {
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
}

.vp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.vp-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-accent);
}

.victory-message {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: var(--color-success);
  color: white;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: var(--radius-sm);
}

/* Objectives */
/* Eye toggle on objective items — flips hidden flag for player view */
.objective-item.objective-hidden {
  opacity: 0.55;
  font-style: italic;
}

.objective-eye {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-right: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--color-text-dim);
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.objective-eye.active {
  background: var(--color-warning, #f59e0b);
  color: var(--color-bg);
  border-color: var(--color-warning, #f59e0b);
}

.objective-eye:hover {
  border-color: var(--color-accent);
}

.objectives-card {
  padding: 1rem;
}

.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.objective-item {
  padding: 0.375rem 0.625rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-info);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text);
}

/* Threats */
.threats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.threats-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.threats-count {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.threats-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Scene Description */
.scene-description {
  padding: 1rem;
}

.scene-description h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.scene-description p {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Scene Actions */
.scene-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* Input */
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

/* Hide number input spinners */
.input[type="number"]::-webkit-inner-spin-button,
.input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}
</style>
