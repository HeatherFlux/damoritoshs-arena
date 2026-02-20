<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCombatStore } from '../stores/combatStore'
import type { Combatant } from '../types/combat'
import CreatureCard from './CreatureCard.vue'
import ActionIcon from './ActionIcon.vue'
import { calculateConditionEffects, getCondition } from '../data/conditions'
import { formatComplexity, formatHazardType } from '../types/hazard'
import { rollDamage } from '../utils/dice'

const props = defineProps<{
  combatant: Combatant
  isCurrent: boolean
}>()

const emit = defineEmits<{
  showConditions: []
}>()

const combatStore = useCombatStore()

const damageAmount = ref<number | null>(null)
const showStatblock = ref(false)

const hpPercentage = computed(() => {
  return Math.max(0, (props.combatant.currentHP / props.combatant.maxHP) * 100)
})

const hpColor = computed(() => {
  const pct = hpPercentage.value
  if (pct > 50) return 'var(--color-success)'
  if (pct > 25) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

// Calculate condition effects on stats
const conditionEffects = computed(() => {
  const level = props.combatant.creature?.level || 1
  return calculateConditionEffects(
    props.combatant.conditions.map(c => ({ name: c.name, value: c.value })),
    level
  )
})

// Effective AC with condition penalties
const effectiveAC = computed(() => {
  return props.combatant.ac + conditionEffects.value.ac
})

// Get condition definition for tooltip
function getConditionTooltip(condName: string): string {
  const def = getCondition(condName)
  return def?.description || condName
}

// Hazard damage rolling
function rollHazardDamage(hazardName: string, actionName: string, damage: string) {
  rollDamage(damage, actionName, hazardName, false)
}

function rollHazardCritDamage(hazardName: string, actionName: string, damage: string) {
  rollDamage(damage, actionName, hazardName, true)
}

// Quick damage/heal functions
function applyQuickDamage() {
  const amount = damageAmount.value
  if (!amount || amount <= 0) return
  combatStore.applyDamage(props.combatant.id, amount)
  damageAmount.value = null
}

function applyQuickHeal() {
  const amount = damageAmount.value
  if (!amount || amount <= 0) return
  combatStore.applyHealing(props.combatant.id, amount)
  damageAmount.value = null
}

function decrementCondition(condition: string) {
  const cond = props.combatant.conditions.find(c => c.name === condition)
  if (cond?.value !== undefined) {
    combatStore.updateConditionValue(props.combatant.id, condition, cond.value - 1)
  } else {
    combatStore.removeCondition(props.combatant.id, condition)
  }
}

function incrementCondition(condition: string, event: Event) {
  event.preventDefault()
  const cond = props.combatant.conditions.find(c => c.name === condition)
  if (cond?.value !== undefined) {
    combatStore.updateConditionValue(props.combatant.id, condition, cond.value + 1)
  }
}

function toggleStatblock() {
  if (props.combatant.creature || props.combatant.hazard) {
    showStatblock.value = !showStatblock.value
  }
}

const hasExpandableDetails = computed(() => {
  return props.combatant.creature || props.combatant.hazard
})
</script>

<template>
  <div class="mb-1 lg:mb-0.5">
    <!-- Mobile Layout -->
    <div
      class="lg:hidden flex flex-col gap-2 p-3 rounded-md transition-all duration-150 bg-surface"
      :class="{
        'bg-accent/15 border-l-3 border-l-accent': isCurrent,
        'opacity-50 bg-danger/10': combatant.isDead,
        'border-l-3 border-l-success': combatant.isPlayer && !isCurrent,
        'border-l-3 border-l-hazard': combatant.isHazard && !isCurrent,
        'rounded-b-none bg-elevated': showStatblock,
      }"
    >
      <!-- Row 1: Init + Name + Actions -->
      <div class="flex items-center gap-2">
        <input
          :value="combatant.initiative"
          type="number"
          class="init-input"
          @change="combatStore.setInitiative(combatant.id, Number(($event.target as HTMLInputElement).value))"
        />
        <div class="flex-1 min-w-0" @click="toggleStatblock">
          <span class="font-medium flex items-center gap-1 text-text text-sm">
            <span v-if="combatant.adjustment === 'elite'" class="text-[0.625rem] font-bold px-1 py-0.5 rounded bg-danger text-white">E</span>
            <span v-if="combatant.adjustment === 'weak'" class="text-[0.625rem] font-bold px-1 py-0.5 rounded bg-dim text-white">W</span>
            <span v-if="combatant.isHazard" class="text-xs text-hazard">⚠</span>
            <span class="truncate">{{ combatant.name }}</span>
            <span v-if="hasExpandableDetails" class="text-[0.625rem] text-muted">{{ showStatblock ? '▼' : '▶' }}</span>
          </span>
          <span v-if="combatant.creature" class="text-[0.625rem] text-dim block">
            Lvl {{ combatant.creature.level + (combatant.adjustment === 'elite' ? 1 : combatant.adjustment === 'weak' ? -1 : 0) }}
          </span>
        </div>
        <div class="font-bold text-accent text-lg" :class="{ 'text-danger': conditionEffects.ac < 0 }">
          {{ effectiveAC }}
        </div>
        <div class="flex gap-1">
          <button
            class="btn-icon btn-sm"
            :class="combatant.isDead ? 'bg-success text-white' : 'btn-secondary'"
            @click="combatStore.toggleDead(combatant.id)"
          >
            {{ combatant.isDead ? '❤️' : '💀' }}
          </button>
          <button class="btn-icon btn-sm btn-danger" @click="combatStore.removeCombatant(combatant.id)">×</button>
        </div>
      </div>

      <!-- Row 2: HP Bar + Controls -->
      <div class="flex items-center gap-2">
        <div class="hp-bar flex-1">
          <div class="hp-bar-fill" :style="{ width: hpPercentage + '%', background: hpColor }"></div>
          <div class="hp-bar-text text-sm">
            {{ combatant.currentHP }}<span class="opacity-50">/</span>{{ combatant.maxHP }}
            <span v-if="combatant.tempHP > 0" class="text-accent">+{{ combatant.tempHP }}</span>
          </div>
        </div>
        <div class="hp-controls shrink-0">
          <button class="hp-btn hp-btn-damage" @click="applyQuickDamage">−</button>
          <input v-model.number="damageAmount" type="number" class="hp-input" placeholder="0" @keydown.enter="applyQuickDamage" />
          <button class="hp-btn hp-btn-heal" @click="applyQuickHeal">+</button>
        </div>
      </div>

      <!-- Row 3: Conditions -->
      <div class="flex flex-wrap gap-1 items-center">
        <template v-for="cond in combatant.conditions" :key="cond.name">
          <span v-if="cond.value !== undefined" class="condition-badge valued">
            <button class="condition-adj" @click="decrementCondition(cond.name)">-</button>
            <span class="condition-label" :title="getConditionTooltip(cond.name)">{{ cond.name }} {{ cond.value }}</span>
            <button class="condition-adj" @click="incrementCondition(cond.name, $event)">+</button>
          </span>
          <span
            v-else
            class="text-[0.625rem] px-1.5 py-0.5 bg-warning text-black rounded cursor-pointer capitalize"
            :title="getConditionTooltip(cond.name) + '\n\nClick to remove'"
            @click="decrementCondition(cond.name)"
          >
            {{ cond.name }}
          </span>
        </template>
        <button class="w-5 h-5 p-0 text-xs bg-elevated border border-dashed border-border rounded text-text" @click="emit('showConditions')">+</button>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div
      class="hidden lg:grid gap-2 p-2 items-center rounded-md transition-all duration-150 bg-surface hover:bg-elevated"
      :class="{
        'bg-accent/15 border-l-3 border-l-accent': isCurrent,
        'opacity-50 bg-danger/10': combatant.isDead,
        'border-l-3 border-l-success': combatant.isPlayer && !isCurrent,
        'border-l-3 border-l-hazard': combatant.isHazard && !isCurrent,
        'cursor-pointer': hasExpandableDetails,
        'rounded-b-none bg-elevated': showStatblock,
      }"
      style="grid-template-columns: 60px 1fr 180px 50px 1fr 80px;"
    >
      <!-- Initiative -->
      <div class="flex items-center gap-1">
        <input
          :value="combatant.initiative"
          type="number"
          class="init-input"
          @change="combatStore.setInitiative(combatant.id, Number(($event.target as HTMLInputElement).value))"
        />
        <button
          class="roll-init-btn"
          @click="combatStore.rollInitiative(combatant.id)"
          title="Roll initiative"
        >
          🎲
        </button>
      </div>

      <!-- Name (clickable for statblock/hazard details) -->
      <div class="flex flex-col" @click="toggleStatblock">
        <span class="font-medium flex items-center gap-1 text-text">
          <span v-if="combatant.adjustment === 'elite'" class="text-[0.625rem] font-bold px-1 py-0.5 rounded bg-danger text-white">E</span>
          <span v-if="combatant.adjustment === 'weak'" class="text-[0.625rem] font-bold px-1 py-0.5 rounded bg-dim text-white">W</span>
          <span v-if="combatant.isHazard" class="text-xs text-hazard">⚠</span>
          {{ combatant.name }}
          <span v-if="hasExpandableDetails" class="text-[0.625rem] text-muted ml-1 transition-colors duration-150 hover:text-accent">{{ showStatblock ? '▼' : '▶' }}</span>
        </span>
        <span v-if="combatant.creature" class="text-[0.6875rem] text-dim">
          Lvl {{ combatant.creature.level + (combatant.adjustment === 'elite' ? 1 : combatant.adjustment === 'weak' ? -1 : 0) }}
          · Click for statblock
        </span>
        <span v-else-if="combatant.hazard" class="text-[0.6875rem] text-hazard">
          Lvl {{ combatant.hazard.level }} {{ formatComplexity(combatant.hazard.complexity) }} {{ formatHazardType(combatant.hazard.type) }}
          · Click for details
        </span>
        <span v-else class="text-[0.6875rem] text-dim">Player Character</span>
      </div>

      <!-- HP -->
      <div class="flex items-center gap-2">
        <div class="hp-bar flex-1" style="min-width: 80px;">
          <div
            class="hp-bar-fill"
            :style="{ width: hpPercentage + '%', background: hpColor }"
          ></div>
          <div class="hp-bar-text">
            <span>{{ combatant.currentHP }}</span>
            <span class="opacity-50 mx-0.5">/</span>
            <span class="opacity-70">{{ combatant.maxHP }}</span>
            <span v-if="combatant.tempHP > 0" class="text-accent ml-1">+{{ combatant.tempHP }}</span>
          </div>
        </div>
        <div class="hp-controls shrink-0">
          <button class="hp-btn hp-btn-damage" @click="applyQuickDamage" title="Apply damage">−</button>
          <input v-model.number="damageAmount" type="number" class="hp-input" placeholder="0" @keydown.enter.exact="applyQuickDamage" @keydown.enter.shift="applyQuickHeal" />
          <button class="hp-btn hp-btn-heal" @click="applyQuickHeal" title="Apply healing">+</button>
        </div>
      </div>

      <!-- AC -->
      <div class="font-semibold text-center text-accent flex flex-col items-center leading-tight" :class="{ 'text-danger': conditionEffects.ac < 0 }">
        <span v-if="conditionEffects.ac < 0" class="text-[0.625rem] text-dim line-through">{{ combatant.ac }}</span>
        <span>{{ effectiveAC }}</span>
        <span v-if="conditionEffects.ac < 0" class="text-[0.625rem] text-danger">({{ conditionEffects.ac }})</span>
      </div>

      <!-- Conditions -->
      <div class="overflow-hidden">
        <div class="flex flex-wrap gap-1 items-center">
          <template v-for="cond in combatant.conditions" :key="cond.name">
            <span v-if="cond.value !== undefined" class="condition-badge valued">
              <button class="condition-adj" @click="decrementCondition(cond.name)">-</button>
              <span class="condition-label" :title="getConditionTooltip(cond.name)">{{ cond.name }} {{ cond.value }}</span>
              <button class="condition-adj" @click="incrementCondition(cond.name, $event)">+</button>
            </span>
            <span
              v-else
              class="text-[0.625rem] px-1.5 py-0.5 bg-warning text-black rounded cursor-pointer capitalize hover:bg-danger hover:text-white"
              :title="getConditionTooltip(cond.name) + '\n\nClick to remove'"
              @click="decrementCondition(cond.name)"
            >
              {{ cond.name }}
            </span>
          </template>
          <button
            class="w-4.5 h-4.5 p-0 text-xs leading-none bg-elevated border border-dashed border-border rounded text-text"
            @click="emit('showConditions')"
            title="Add condition"
          >
            +
          </button>
        </div>
        <div v-if="combatant.conditions.length > 0 && (conditionEffects.ac < 0 || conditionEffects.attackRolls < 0)" class="flex gap-1 mt-1">
          <span v-if="conditionEffects.attackRolls < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">Atk {{ conditionEffects.attackRolls }}</span>
          <span v-if="conditionEffects.damage < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">Dmg {{ conditionEffects.damage }}</span>
          <span v-if="conditionEffects.perception < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">Perc {{ conditionEffects.perception }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-1 justify-end">
        <button
          class="btn-icon btn-sm"
          :class="combatant.isDead ? 'bg-success text-white' : 'btn-secondary'"
          @click="combatStore.toggleDead(combatant.id)"
          :title="combatant.isDead ? 'Revive' : 'Mark dead'"
        >
          {{ combatant.isDead ? '❤️' : '💀' }}
        </button>
        <button
          class="btn-icon btn-sm btn-danger"
          @click="combatStore.removeCombatant(combatant.id)"
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Expandable Statblock (Creature) -->
    <Transition name="statblock">
      <div v-if="showStatblock && combatant.creature" class="p-4 bg-surface border border-border border-t-0 rounded-b-lg -mt-0.5">
        <CreatureCard :creature="combatant.creature" :show-recall-knowledge="false" />
      </div>
    </Transition>

    <!-- Expandable Hazard Details -->
    <Transition name="statblock">
      <div v-if="showStatblock && combatant.hazard" class="p-4 bg-surface border border-border border-t-0 rounded-b-lg -mt-0.5 border-l-3 border-l-hazard">
        <div class="mb-3">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 class="m-0 text-base text-hazard">{{ combatant.hazard.name }}</h4>
            <div class="flex gap-1.5">
              <span class="text-[0.6875rem] px-1.5 py-0.5 rounded font-medium bg-elevated text-text">Level {{ combatant.hazard.level }}</span>
              <span
                class="text-[0.6875rem] px-1.5 py-0.5 rounded font-medium uppercase bg-elevated"
                :class="{ 'text-dim': combatant.hazard.complexity === 'simple', 'text-warning': combatant.hazard.complexity === 'complex' }"
              >
                {{ formatComplexity(combatant.hazard.complexity) }}
              </span>
              <span
                class="text-[0.6875rem] px-1.5 py-0.5 rounded font-medium uppercase bg-elevated"
                :class="{ 'text-danger': combatant.hazard.type === 'trap', 'text-success': combatant.hazard.type === 'environmental', 'text-hazard': combatant.hazard.type === 'haunt' }"
              >
                {{ formatHazardType(combatant.hazard.type) }}
              </span>
            </div>
          </div>
          <div class="flex gap-1.5 flex-wrap">
            <span v-for="trait in combatant.hazard.traits" :key="trait" class="text-[0.625rem] px-1.5 py-0.5 bg-hazard/20 text-hazard rounded capitalize">
              {{ trait }}
            </span>
          </div>
        </div>

        <p class="text-sm text-dim mb-3 leading-relaxed">{{ combatant.hazard.description }}</p>

        <div class="grid gap-1.5 mb-3" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
          <div v-if="combatant.hazard.stealth" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">Stealth</span>
            <span class="text-text">{{ combatant.hazard.stealth }}</span>
          </div>
          <div v-if="combatant.hazard.disable" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">Disable</span>
            <span class="text-text">{{ combatant.hazard.disable }}</span>
          </div>
          <div v-if="combatant.hazard.ac" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">AC</span>
            <span class="text-text">{{ combatant.hazard.ac }}</span>
          </div>
          <div v-if="combatant.hazard.hp" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">HP</span>
            <span class="text-text">
              {{ combatant.hazard.hp }}
              <template v-if="combatant.hazard.bt"> (BT {{ combatant.hazard.bt }})</template>
            </span>
          </div>
          <div v-if="combatant.hazard.hardness" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">Hardness</span>
            <span class="text-text">{{ combatant.hazard.hardness }}</span>
          </div>
          <div v-if="combatant.hazard.immunities?.length" class="flex gap-2 text-[0.8125rem]">
            <span class="font-semibold text-hazard">Immunities</span>
            <span class="text-text">{{ combatant.hazard.immunities.join(', ') }}</span>
          </div>
        </div>

        <div v-if="combatant.hazard.actions.length" class="flex flex-col gap-2 mb-3">
          <div v-for="(action, idx) in combatant.hazard.actions" :key="idx" class="bg-elevated p-2.5 rounded-md">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-hazard">{{ action.name }}</span>
              <ActionIcon v-if="action.actionType" :action="action.actionType" class="text-hazard" />
            </div>
            <p v-if="action.trigger" class="text-[0.8125rem] my-1 text-dim">
              <strong>Trigger</strong> {{ action.trigger }}
            </p>
            <p class="text-[0.8125rem] my-1 text-dim">{{ action.effect }}</p>
            <p v-if="action.damage" class="text-[0.8125rem] my-1 text-dim flex items-center gap-2 flex-wrap">
              <span
                class="rollable inline-flex items-center gap-1"
                @click="rollHazardDamage(combatant.hazard!.name, action.name, action.damage)"
                title="Roll damage"
              >
                <strong>Damage</strong>
                <span class="roll-value">{{ action.damage }}</span>
              </span>
              <span
                class="rollable text-danger text-xs"
                @click="rollHazardCritDamage(combatant.hazard!.name, action.name, action.damage)"
                title="Roll critical damage (doubled)"
              >
                ×2
              </span>
              <template v-if="action.dc"> (DC {{ action.dc }} {{ action.save }})</template>
            </p>
          </div>
        </div>

        <p v-if="combatant.hazard.routine" class="text-[0.8125rem] mb-2 text-dim">
          <strong>Routine</strong> {{ combatant.hazard.routine }}
        </p>

        <p v-if="combatant.hazard.reset" class="text-[0.8125rem] mb-2 text-dim">
          <strong>Reset</strong> {{ combatant.hazard.reset }}
        </p>

        <div class="pt-2 border-t border-border text-[0.6875rem] text-muted">
          {{ combatant.hazard.source }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Condition badges with +/- */
.condition-badge {
  display: inline-flex;
  align-items: stretch;
  border-radius: var(--radius-md);
  overflow: hidden;
  font-size: 0.625rem;
  line-height: 1;
  text-transform: capitalize;
}

.condition-badge.valued {
  background: var(--color-danger);
  color: white;
}

.condition-badge .condition-label {
  padding: 0.3rem 0.375rem;
  white-space: nowrap;
  font-weight: 600;
}

.condition-badge .condition-adj {
  padding: 0.3rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  cursor: pointer;
  transition: background 0.1s;
}

.condition-badge .condition-adj:hover {
  background: rgba(0, 0, 0, 0.55);
}

/* Initiative input */
.init-input {
  width: 2.5rem;
  padding: 0.25rem;
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  -moz-appearance: textfield;
}

.init-input::-webkit-outer-spin-button,
.init-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.init-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.roll-init-btn {
  padding: 0.25rem;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.15s;
}

.roll-init-btn:hover {
  opacity: 1;
}

/* Statblock animation */
.statblock-enter-active {
  animation: expandDown 0.25s ease;
}

.statblock-leave-active {
  animation: collapseUp 0.2s ease;
}

@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
}

@keyframes collapseUp {
  from {
    opacity: 1;
    max-height: 1000px;
  }
  to {
    opacity: 0;
    max-height: 0;
  }
}
</style>
