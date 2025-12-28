<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCombatStore } from '../stores/combatStore'
import { VALUED_CONDITIONS } from '../types/combat'
import type { Combatant } from '../types/combat'
import CreatureCard from './CreatureCard.vue'
import { calculateConditionEffects, getCondition } from '../data/conditions'
import { formatComplexity, formatHazardType } from '../types/hazard'

const props = defineProps<{
  combatant: Combatant
  isCurrent: boolean
}>()

const emit = defineEmits<{
  showConditions: []
}>()

const combatStore = useCombatStore()

const damageAmount = ref<number | null>(null)
const editingInit = ref(false)
const newInit = ref(0)
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

function startEditInit() {
  newInit.value = props.combatant.initiative
  editingInit.value = true
}

function saveInit() {
  combatStore.setInitiative(props.combatant.id, newInit.value)
  editingInit.value = false
}

function decrementCondition(condition: string) {
  const cond = props.combatant.conditions.find(c => c.name === condition)
  if (cond?.value !== undefined) {
    combatStore.updateConditionValue(props.combatant.id, condition, cond.value - 1)
  } else {
    combatStore.removeCondition(props.combatant.id, condition)
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
  <div class="mb-0.5">
    <div
      class="grid gap-2 p-2 items-center rounded-md transition-all duration-150 bg-surface hover:bg-elevated"
      :class="{
        'bg-accent/15 border-l-3 border-l-accent': isCurrent,
        'opacity-50 bg-danger/10': combatant.isDead,
        'border-l-3 border-l-success': combatant.isPlayer && !isCurrent,
        'border-l-3 border-l-hazard': combatant.isHazard && !isCurrent,
        'cursor-pointer': hasExpandableDetails,
        'rounded-b-none bg-elevated': showStatblock,
      }"
      style="grid-template-columns: 60px 1fr 220px 50px 1fr 100px;"
    >
      <!-- Initiative -->
      <div class="flex items-center gap-1">
        <template v-if="editingInit">
          <input
            v-model.number="newInit"
            type="number"
            class="input w-10 text-center font-bold"
            @blur="saveInit"
            @keyup.enter="saveInit"
            autofocus
          />
        </template>
        <template v-else>
          <span
            class="font-bold text-lg cursor-pointer px-1 py-0.5 rounded text-text hover:bg-elevated"
            @click="startEditInit"
            title="Click to edit"
          >
            {{ combatant.initiative }}
          </span>
          <button
            class="px-1 py-0.5 text-xs bg-transparent border-none opacity-50 hover:opacity-100"
            @click="combatStore.rollInitiative(combatant.id)"
            title="Roll initiative"
          >
            🎲
          </button>
        </template>
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
        <div class="hp-bar" style="min-width: 100px; flex: 1;">
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
        <!-- HP Controls: always visible -->
        <div class="hp-controls shrink-0">
          <button
            class="hp-btn hp-btn-damage"
            @click="applyQuickDamage"
            title="Apply damage (Enter)"
          >−</button>
          <input
            v-model.number="damageAmount"
            type="number"
            class="hp-input"
            placeholder="0"
            @keydown.enter.exact="applyQuickDamage"
            @keydown.enter.shift="applyQuickHeal"
          />
          <button
            class="hp-btn hp-btn-heal"
            @click="applyQuickHeal"
            title="Apply healing (Shift+Enter)"
          >+</button>
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
          <span
            v-for="cond in combatant.conditions"
            :key="cond.name"
            class="text-[0.625rem] px-1.5 py-0.5 bg-warning text-black rounded cursor-pointer capitalize hover:bg-danger hover:text-white"
            :class="{ 'bg-danger': cond.value }"
            @click="decrementCondition(cond.name)"
            :title="getConditionTooltip(cond.name) + '\n\nClick to ' + (VALUED_CONDITIONS.includes(cond.name) ? 'decrease' : 'remove')"
          >
            {{ cond.name }}{{ cond.value ? ` ${cond.value}` : '' }}
          </span>
          <button
            class="w-4.5 h-4.5 p-0 text-xs leading-none bg-elevated border border-dashed border-border rounded text-text"
            @click="emit('showConditions')"
            title="Add condition"
          >
            +
          </button>
        </div>
        <!-- Show condition effects summary -->
        <div v-if="combatant.conditions.length > 0 && (conditionEffects.ac < 0 || conditionEffects.attackRolls < 0)" class="flex gap-1 mt-1">
          <span v-if="conditionEffects.attackRolls < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">
            Atk {{ conditionEffects.attackRolls }}
          </span>
          <span v-if="conditionEffects.damage < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">
            Dmg {{ conditionEffects.damage }}
          </span>
          <span v-if="conditionEffects.perception < 0" class="text-[0.5625rem] px-1 py-0.5 rounded bg-surface text-danger font-semibold">
            Perc {{ conditionEffects.perception }}
          </span>
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
              <span v-if="action.actionType === 'reaction'" class="text-[0.6875rem] text-dim">⟲ Reaction</span>
            </div>
            <p v-if="action.trigger" class="text-[0.8125rem] my-1 text-dim">
              <strong>Trigger</strong> {{ action.trigger }}
            </p>
            <p class="text-[0.8125rem] my-1 text-dim">{{ action.effect }}</p>
            <p v-if="action.damage" class="text-[0.8125rem] my-1 text-dim">
              <strong>Damage</strong> {{ action.damage }}
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
