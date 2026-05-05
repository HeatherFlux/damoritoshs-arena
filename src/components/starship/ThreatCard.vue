<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StarshipThreat, ThreatType, ThreatRoutine, ThreatRoutineAction, TacticalRole } from '../../types/starship'
import { rollD20, rollDamage } from '../../utils/dice'
import { useStarshipStore } from '../../stores/starshipStore'
import ThreatRoutineDisplay from './ThreatRoutineDisplay.vue'
import ThreatRoutineEditor from './ThreatRoutineEditor.vue'

const props = defineProps<{
  threat: StarshipThreat
  editing?: boolean
  isCurrentTurn?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<StarshipThreat>): void
  (e: 'remove'): void
  (e: 'damage', amount: number): void
  (e: 'heal', amount: number): void
  (e: 'toggle-defeated'): void
}>()

// Routine details render inline always — no collapse. The card's size
// stays predictable per-render and the GM sees the full stat block at a
// glance without an extra click. (Quick-attack rows are still promoted
// at the top for one-tap rolls.)

// Local damage input for the Apply Damage form
const damageInput = ref<number | null>(null)

function applyDamage() {
  const amt = damageInput.value
  if (!amt || amt <= 0) return
  emit('damage', amt)
  damageInput.value = null
}

// Track expanded state for special abilities (separate from the regular
// abilities tag list which is always visible).
const showSpecialAbilities = ref(false)

// Track whether routine editor is open in editing mode
const showRoutineEditor = ref(false)

// Summary text for collapsed routine
const routineSummary = computed(() => {
  const routine = props.threat.routine
  if (!routine || !routine.actions.length) return null
  const actionCount = routine.actions.length
  const types = [...new Set(routine.actions.map(a => a.type))]
  return `${routine.actionsPerTurn} actions/turn, ${actionCount} ${actionCount === 1 ? 'ability' : 'abilities'} (${types.join(', ')})`
})

function onRoutineUpdate(routine: ThreatRoutine) {
  emit('update', { routine })
}

function onRoutineEditorClose() {
  showRoutineEditor.value = false
}

const threatTypes: { value: ThreatType; label: string }[] = [
  { value: 'enemy_ship', label: 'Enemy Ship' },
  { value: 'hazard', label: 'Hazard' },
  { value: 'environmental', label: 'Environmental' }
]

const tacticalRoles: { value: TacticalRole; label: string; description: string; color: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Targets the party ship directly', color: 'var(--color-text-dim)' },
  { value: 'complication', label: 'Complication', description: 'Penalizes crew unless addressed', color: 'var(--color-warning)' },
  { value: 'indiscriminate', label: 'Indiscriminate', description: 'Hits everyone equally', color: 'var(--color-info)' }
]

const currentTacticalRole = computed(() => {
  return tacticalRoles.find(r => r.value === props.threat.tacticalRole) ?? tacticalRoles[0]
})

const typeIcon = computed(() => {
  switch (props.threat.type) {
    case 'enemy_ship': return '[X]'
    case 'hazard': return '[!]'
    case 'environmental': return '[~]'
    default: return '[?]'
  }
})

const typeColor = computed(() => {
  switch (props.threat.type) {
    case 'enemy_ship': return 'var(--color-danger)'
    case 'hazard': return 'var(--color-warning)'
    case 'environmental': return 'var(--color-info)'
    default: return 'var(--color-text-dim)'
  }
})

const hpPercent = computed(() => {
  if (!props.threat.maxHP || !props.threat.currentHP) return 100
  return Math.round((props.threat.currentHP / props.threat.maxHP) * 100)
})

const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const shieldPercent = computed(() => {
  const max = props.threat.maxShields ?? 0
  const cur = props.threat.currentShields ?? 0
  if (!max) return 0
  return Math.max(0, Math.min(100, Math.round((cur / max) * 100)))
})

const hasDefenseInfo = computed(() => {
  return props.threat.fortitude != null
    || props.threat.reflex != null
    || props.threat.initiativeSkill != null
    || props.threat.initiativeBonus != null
})

const hasImmuneRWInfo = computed(() => {
  return Boolean(
    props.threat.immunities?.length
    || (props.threat.resistances && Object.keys(props.threat.resistances).length)
    || (props.threat.weaknesses && Object.keys(props.threat.weaknesses).length)
  )
})

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function rollDefense(label: string, bonus: number) {
  const roll = rollD20(bonus, label, props.threat.name)
  store.logAction(
    props.threat.id,
    props.threat.name,
    label,
    roll.isNat20 ? 'critical_success' : roll.isNat1 ? 'critical_failure' : 'success',
    roll.breakdown,
  )
}

// Promote routine attacks and skill-check actions so the GM can roll them
// straight from the threat card. Skill checks without a fixed DC are still
// rollable — the threat rolls its skill, the GM compares vs the targeted
// PC defense (e.g. Will DC) which varies per PC.
const quickActions = computed((): ThreatRoutineAction[] => {
  const actions = props.threat.routine?.actions ?? []
  return actions.filter(a => a.type === 'attack' || a.type === 'skill_check')
})

const store = useStarshipStore()

/**
 * Roll a single threat action straight from the card. Mirrors the logic in
 * ThreatRoutineDisplay.executeAction but doesn't consume the action budget
 * — the GM may want to roll an attack as a free demonstration without
 * spending one of the threat's per-turn actions. The "Show Routine"
 * collapsible still tracks budgeted use.
 */
function rollQuickAction(action: ThreatRoutineAction) {
  const actorId = props.threat.id
  const actorName = props.threat.name

  if (action.type === 'attack' && action.attackBonus != null) {
    const attackRoll = rollD20(action.attackBonus, action.name, actorName)
    let outcome: 'critical_success' | 'success' | 'failure' | 'critical_failure' = 'success'
    if (attackRoll.isNat20) outcome = 'critical_success'
    else if (attackRoll.isNat1) outcome = 'critical_failure'

    let breakdown = `${attackRoll.breakdown} vs target AC`
    if (action.damage) {
      const dmg = rollDamage(action.damage, action.name, actorName, outcome === 'critical_success')
      breakdown += ` | ${dmg.breakdown}`
    }
    store.logAction(actorId, actorName, action.name, outcome, breakdown)
    return
  }

  if (action.type === 'skill_check') {
    // Pull the threat's skill modifier from its skills map (e.g. action.skill
    // === 'Arcana' and threat.skills?.Arcana === 14 → roll d20+14). Falls
    // back to flat d20 if the threat doesn't list the skill explicitly.
    // DC may be omitted when the action rolls vs a PC defense (Will DC,
    // Reflex DC, etc.) — the GM compares the result vs the PC's static DC.
    const skillKey = action.skill ?? ''
    const bonus = (props.threat.skills?.[skillKey] as number | undefined) ?? 0
    const roll = rollD20(bonus, action.name, actorName)
    const target = action.vsDefense ? `vs ${action.vsDefense}` : ''
    const dc = action.dc != null ? `DC ${action.dc}` : ''
    const breakdown = `${roll.breakdown} ${target} ${dc}`.replace(/\s+/g, ' ').trim()
    store.logAction(actorId, actorName, action.name, 'success', breakdown)
    return
  }
}

function updateField<K extends keyof StarshipThreat>(field: K, value: StarshipThreat[K]) {
  emit('update', { [field]: value })
}
</script>

<template>
  <div
    class="threat-card"
    :class="{
      editing,
      defeated: threat.isDefeated,
      'current-turn': isCurrentTurn
    }"
  >
    <!-- Editing Mode -->
    <template v-if="editing">
      <div class="threat-header">
        <span class="threat-icon" :style="{ color: typeColor }">{{ typeIcon }}</span>
        <input
          type="text"
          class="input threat-name-input"
          :value="threat.name"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
          placeholder="Threat name"
        />
        <button class="remove-btn" @click="emit('remove')">&times;</button>
      </div>

      <div class="threat-fields">
        <label class="field-label">
          <span>Type</span>
          <select
            class="input select"
            :value="threat.type"
            @change="updateField('type', ($event.target as HTMLSelectElement).value as ThreatType)"
          >
            <option v-for="t in threatTypes" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </label>

        <label class="field-label">
          <span>Tactical Role</span>
          <select
            class="input select"
            :value="threat.tacticalRole ?? 'standard'"
            @change="updateField('tacticalRole', ($event.target as HTMLSelectElement).value as TacticalRole)"
          >
            <option v-for="r in tacticalRoles" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </label>

        <label class="field-label">
          <span>Level</span>
          <input
            type="number"
            class="input input-number"
            :value="threat.level"
            @input="updateField('level', parseInt(($event.target as HTMLInputElement).value) || 1)"
            min="1"
            max="20"
          />
        </label>

        <template v-if="threat.type === 'enemy_ship'">
          <label class="field-label">
            <span>Max HP</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.maxHP"
              @input="updateField('maxHP', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="1"
            />
          </label>

          <label class="field-label">
            <span>AC</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.ac"
              @input="updateField('ac', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Fortitude</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.fortitude"
              @input="updateField('fortitude', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Reflex</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.reflex"
              @input="updateField('reflex', parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
          </label>

          <label class="field-label">
            <span>Max Shields</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.maxShields"
              @input="updateField('maxShields', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>

          <label class="field-label">
            <span>Shield Regen</span>
            <input
              type="number"
              class="input input-number"
              :value="threat.shieldRegen"
              @input="updateField('shieldRegen', parseInt(($event.target as HTMLInputElement).value) || 0)"
              min="0"
            />
          </label>
        </template>
      </div>

      <!-- Initiative Section -->
      <div class="threat-fields initiative-fields">
        <label class="field-label">
          <span>Initiative Skill</span>
          <input
            type="text"
            class="input"
            :value="threat.initiativeSkill"
            @input="updateField('initiativeSkill', ($event.target as HTMLInputElement).value)"
            placeholder="Piloting"
          />
        </label>

        <label class="field-label">
          <span>Initiative Bonus</span>
          <input
            type="number"
            class="input input-number"
            :value="threat.initiativeBonus"
            @input="updateField('initiativeBonus', parseInt(($event.target as HTMLInputElement).value) || 0)"
          />
        </label>
      </div>

      <label class="field-label description-field">
        <span>Description / Abilities</span>
        <textarea
          class="input textarea"
          :value="threat.description"
          @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
          placeholder="Describe abilities, special rules..."
          rows="2"
        ></textarea>
      </label>

      <!-- Routine Editor Integration -->
      <div class="routine-edit-section">
        <button
          v-if="!showRoutineEditor"
          class="edit-routine-btn"
          @click="showRoutineEditor = true"
        >
          {{ threat.routine?.actions?.length ? 'Edit Routine' : '+ Add Routine' }}
        </button>
        <span v-if="!showRoutineEditor && routineSummary" class="routine-summary">
          {{ routineSummary }}
        </span>

        <ThreatRoutineEditor
          v-if="showRoutineEditor"
          :routine="threat.routine"
          @update="onRoutineUpdate"
          @close="onRoutineEditorClose"
        />
      </div>
    </template>

    <!-- Display Mode (during scene run) -->
    <template v-else>
      <div class="threat-header">
        <span class="threat-icon" :style="{ color: typeColor }">{{ typeIcon }}</span>
        <div class="threat-info">
          <span class="threat-name">{{ threat.name }}</span>
          <span class="threat-meta">Level {{ threat.level }} {{ threatTypes.find(t => t.value === threat.type)?.label }}</span>
        </div>
        <span
          v-if="threat.tacticalRole && threat.tacticalRole !== 'standard'"
          class="tactical-badge"
          :style="{ borderColor: currentTacticalRole.color, color: currentTacticalRole.color }"
          :title="currentTacticalRole.description"
        >
          {{ currentTacticalRole.label }}
        </span>
        <div v-if="threat.ac" class="threat-ac">
          <span class="ac-label">AC</span>
          <span class="ac-value">{{ threat.ac }}</span>
        </div>
      </div>

      <!-- HP Bar (for enemy ships) -->
      <div v-if="threat.maxHP" class="hp-section">
        <div class="hp-bar-container">
          <div
            class="hp-bar"
            :style="{ width: hpPercent + '%', background: hpColor }"
          ></div>
        </div>
        <div class="hp-text-row">
          <span class="hp-text">
            {{ threat.currentHP }} / {{ threat.maxHP }} HP
          </span>
        </div>
      </div>

      <!-- Shields (regen happens automatically each round via the
           starshipStore; per-round value shown for GM visibility) -->
      <div v-if="threat.maxShields && threat.maxShields > 0" class="shield-section">
        <div class="shield-header">
          <span class="shield-label">Shields</span>
          <span class="shield-text">
            {{ threat.currentShields ?? 0 }} / {{ threat.maxShields }}
            <span v-if="threat.shieldRegen" class="shield-regen">+{{ threat.shieldRegen }}/rd</span>
          </span>
        </div>
        <div class="shield-bar-container">
          <div
            class="shield-bar"
            :style="{ width: shieldPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Apply Damage form — only renders when the threat has HP. Per
           GM Core p.230, some threats (asteroid fields, magical effects,
           anything intangible or too vast to attack) intentionally lack
           HP and shouldn't have an attack target. -->
      <div v-if="threat.maxHP" class="threat-damage-section">
        <span class="damage-label">Apply Damage</span>
        <div class="damage-input-row">
          <input
            type="number"
            class="damage-input"
            v-model.number="damageInput"
            min="0"
            placeholder="0"
            @keyup.enter="applyDamage"
          />
          <button class="btn btn-danger btn-sm" @click="applyDamage">Damage</button>
        </div>
      </div>

      <!-- Defenses + Initiative chip row — click to roll -->
      <div v-if="hasDefenseInfo" class="threat-defenses">
        <span
          v-if="threat.fortitude != null"
          class="defense-chip rollable"
          :title="`Roll Fortitude save +${threat.fortitude}`"
          @click="rollDefense('Fortitude', threat.fortitude)"
        >
          <span class="defense-chip-label">Fort</span>
          <span class="defense-chip-value">{{ formatMod(threat.fortitude) }}</span>
        </span>
        <span
          v-if="threat.reflex != null"
          class="defense-chip rollable"
          :title="`Roll Reflex save +${threat.reflex}`"
          @click="rollDefense('Reflex', threat.reflex)"
        >
          <span class="defense-chip-label">Ref</span>
          <span class="defense-chip-value">{{ formatMod(threat.reflex) }}</span>
        </span>
        <span
          v-if="threat.initiativeSkill || threat.initiativeBonus != null"
          class="defense-chip rollable"
          :title="`Roll initiative ${threat.initiativeSkill || 'Perception'} +${threat.initiativeBonus ?? 0}`"
          @click="rollDefense(threat.initiativeSkill || 'Perception', threat.initiativeBonus ?? 0)"
        >
          <span class="defense-chip-label">Init</span>
          <span class="defense-chip-value">
            {{ threat.initiativeSkill || 'Perception' }}
            {{ formatMod(threat.initiativeBonus ?? 0) }}
          </span>
        </span>
      </div>

      <!-- Quick attacks / DC checks — GM can roll straight from the card -->
      <div v-if="quickActions.length > 0" class="quick-actions">
        <div class="quick-actions-label">Attacks &amp; Checks</div>
        <button
          v-for="action in quickActions"
          :key="action.id"
          class="quick-action-row"
          :class="`quick-action-${action.type}`"
          @click="rollQuickAction(action)"
          :title="action.description"
        >
          <span class="qa-type-tag">{{ action.type === 'attack' ? 'ATK' : 'CHK' }}</span>
          <span class="qa-name">{{ action.name }}</span>
          <!-- Attack bonus / skill bonus chip (whichever applies) -->
          <span v-if="action.attackBonus != null" class="qa-bonus">+{{ action.attackBonus }}</span>
          <span
            v-else-if="action.type === 'skill_check' && action.skill && (threat.skills?.[action.skill] != null)"
            class="qa-bonus"
          >+{{ threat.skills[action.skill] }} {{ action.skill }}</span>
          <!-- Damage or DC info -->
          <span v-if="action.damage" class="qa-damage">
            {{ action.damage }}<span v-if="action.damageType" class="qa-damage-type"> {{ action.damageType }}</span>
          </span>
          <span v-else-if="action.dc != null" class="qa-dc">
            DC {{ action.dc }}<span v-if="action.vsDefense" class="qa-vs"> {{ action.vsDefense }}</span>
          </span>
          <span v-else-if="action.vsDefense" class="qa-dc">
            vs {{ action.vsDefense }}
          </span>
        </button>
      </div>

      <!-- Immunities / Resistances / Weaknesses -->
      <div v-if="hasImmuneRWInfo" class="threat-irw">
        <div v-if="threat.immunities?.length" class="irw-row">
          <span class="irw-label">Immune</span>
          <span v-for="imm in threat.immunities" :key="imm" class="irw-tag immune">{{ imm }}</span>
        </div>
        <div v-if="threat.resistances && Object.keys(threat.resistances).length" class="irw-row">
          <span class="irw-label">Resist</span>
          <span v-for="(amt, type) in threat.resistances" :key="type" class="irw-tag resist">
            {{ type }} {{ amt }}
          </span>
        </div>
        <div v-if="threat.weaknesses && Object.keys(threat.weaknesses).length" class="irw-row">
          <span class="irw-label">Weak</span>
          <span v-for="(amt, type) in threat.weaknesses" :key="type" class="irw-tag weak">
            {{ type }} {{ amt }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <p v-if="threat.description" class="threat-description">
        {{ threat.description }}
      </p>

      <!-- Abilities -->
      <div v-if="threat.abilities?.length" class="threat-abilities">
        <span
          v-for="ability in threat.abilities"
          :key="ability"
          class="ability-tag"
        >
          {{ ability }}
        </span>
      </div>

      <!-- Special Abilities (collapsible — same pattern as routine) -->
      <button
        v-if="threat.specialAbilities?.length"
        class="routine-toggle-btn"
        :class="{ expanded: showSpecialAbilities }"
        @click="showSpecialAbilities = !showSpecialAbilities"
      >
        {{ showSpecialAbilities ? 'Hide' : 'Show' }} Special Abilities ({{ threat.specialAbilities.length }})
        <span class="toggle-icon">{{ showSpecialAbilities ? '▼' : '▶' }}</span>
      </button>
      <div v-if="showSpecialAbilities && threat.specialAbilities?.length" class="special-abilities-section">
        <div v-for="sa in threat.specialAbilities" :key="sa.name" class="special-ability">
          <div class="special-ability-name">{{ sa.name }}</div>
          <div class="special-ability-desc">{{ sa.description }}</div>
        </div>
      </div>

      <!-- Routine Display — always inline. Earlier versions had a
           Show/Hide toggle but expanding it caused the threat card (and
           the surrounding column) to resize, so it now always renders at
           the same height. The promoted attack rows above stay as the
           one-tap roll surface; this section is the narrative + budget. -->
      <ThreatRoutineDisplay
        v-if="threat.routine"
        :threat="threat"
        class="routine-section"
      />

      <!-- Defeat Toggle -->
      <button
        class="defeat-btn"
        :class="{ defeated: threat.isDefeated }"
        @click="emit('toggle-defeated')"
      >
        {{ threat.isDefeated ? 'DEFEATED' : 'Mark Defeated' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.threat-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  transition: all 0.15s ease;
}

.threat-card.editing {
  background: var(--color-bg);
}

.threat-card.defeated {
  opacity: 0.5;
}

.threat-card.current-turn {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
}

.threat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.threat-icon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
}

.threat-name-input {
  flex: 1;
  font-weight: 600;
}

.threat-info {
  flex: 1;
  min-width: 0;
}

.threat-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  /* Keep names readable in narrow columns — wrap on words, not letters,
     and don't break parenthesized aliases mid-word. */
  word-break: keep-all;
  overflow-wrap: break-word;
  line-height: 1.2;
}

.threat-meta {
  display: block;
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.threat-ac {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.ac-label {
  font-size: 0.5rem;
  font-weight: 600;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.ac-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

/* Tactical Role Badge */
.tactical-badge {
  padding: 0.125rem 0.375rem;
  border: 1px solid;
  border-radius: var(--radius-sm);
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: help;
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

/* Editing Fields */
.threat-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.field-label span {
  font-size: 0.625rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
}

.description-field {
  grid-column: 1 / -1;
}

.input {
  padding: 0.375rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.8125rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input-number {
  text-align: center;
}

.select {
  cursor: pointer;
}

.textarea {
  resize: vertical;
  min-height: 40px;
  font-family: inherit;
}

/* Hide number input spinners */
.input-number::-webkit-inner-spin-button,
.input-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-number {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* HP Section */
.hp-section {
  margin: 0.5rem 0;
}

.hp-bar-container {
  height: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.375rem;
}

.hp-bar {
  height: 100%;
  transition: width 0.3s ease, background 0.3s ease;
}

.hp-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.hp-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hp-btn.damage:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.hp-btn.heal:hover {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.hp-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.hp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Shield section — mirrors hp-section but with cyan/info coloring */
.shield-section {
  margin: 0.5rem 0;
}

.shield-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.shield-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.shield-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-primary);
}

.shield-regen {
  margin-left: 0.5rem;
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

.shield-bar-container {
  height: 4px;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg));
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.shield-bar {
  height: 100%;
  background: var(--color-primary);
  box-shadow: 0 0 4px color-mix(in srgb, var(--color-primary) 60%, transparent);
  transition: width 0.2s ease;
}

.shield-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

/* Defenses + Initiative chip row */
.threat-defenses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.5rem 0;
}

.defense-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
}

.defense-chip-label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.defense-chip-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--color-text);
}

/* Immunities / Resistances / Weaknesses */
.threat-irw {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.5rem 0;
}

.irw-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.irw-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  min-width: 3rem;
}

.irw-tag {
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
}

.irw-tag.immune {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--color-info, #818cf8);
}

.irw-tag.resist {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: var(--color-success, #4ade80);
}

.irw-tag.weak {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger, #f87171);
}

/* HP/Shield text rows — display only, no nudge buttons. */
.hp-text-row {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
}

/* Threat damage form — mirrors the PC ship's Apply Damage. The number
   input + Damage button is the canonical way to deal damage; +5/-5
   nudge buttons are not part of the rules. */
.threat-damage-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.threat-damage-section .damage-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  font-weight: 600;
  flex-shrink: 0;
}

.threat-damage-section .damage-input-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
}

.threat-damage-section .damage-input {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
}

/* Quick-action rows — promoted attack/skill-check entries pulled from the
   routine so the GM can roll without expanding "Show Routine" first. */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.5rem 0;
}

.quick-actions-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  font-weight: 600;
}

.quick-action-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.8125rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.quick-action-row:hover {
  background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg-elevated));
  border-color: var(--color-danger);
}

.quick-action-skill_check:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-elevated));
  border-color: var(--color-primary);
}

.qa-type-tag {
  padding: 0.0625rem 0.375rem;
  background: var(--color-danger);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.quick-action-skill_check .qa-type-tag {
  background: var(--color-primary);
}

.qa-name {
  flex: 1;
  font-weight: 600;
}

.qa-bonus {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-bg);
  padding: 0.0625rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.qa-damage,
.qa-dc {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  color: var(--color-warning, #f59e0b);
}

.qa-damage-type {
  color: var(--color-text-dim);
  font-style: italic;
}

.qa-vs {
  color: var(--color-text-dim);
}

/* Special abilities collapsible block */
.special-abilities-section {
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.special-ability-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
}

.special-ability-desc {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  line-height: 1.4;
}

/* Description & Abilities */
.threat-description {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  line-height: 1.4;
  margin: 0.5rem 0;
}

.threat-abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0.5rem 0;
}

.ability-tag {
  padding: 0.125rem 0.375rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  color: var(--color-text-dim);
}

/* Defeat Button */
.defeat-btn {
  width: 100%;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.defeat-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.defeat-btn.defeated {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

/* Routine Toggle */
.routine-toggle-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 0.5rem;
}

.routine-toggle-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.routine-toggle-btn.expanded {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toggle-icon {
  font-size: 0.5rem;
  transition: transform 0.15s ease;
}

.routine-section {
  margin-bottom: 0.5rem;
}

/* Initiative fields */
.initiative-fields {
  margin-top: 0.5rem;
}

/* Routine edit section */
.routine-edit-section {
  margin-top: 0.5rem;
}

.edit-routine-btn {
  width: 100%;
  padding: 0.375rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-routine-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  border-style: solid;
}

.routine-summary {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
}
</style>
