<script setup lang="ts">
import { computed } from 'vue'
import type { Creature } from '../types/creature'
import { rollD20, rollDamage, formatModifier, getRecallKnowledgeDCs, getRecallKnowledgeSkill, cleanDamage, parseDamageExpression } from '../utils/dice'
import { useSettingsStore } from '../stores/settingsStore'
import ActionIcon from './ActionIcon.vue'

/**
 * Condition penalties to apply to rolls (from CombatantRow when in combat).
 * When absent, rolls use raw creature stats (encounter builder mode).
 */
export interface ConditionPenalties {
  attackRolls: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  skillChecks: number
  damage: number
}

const props = defineProps<{
  creature: Creature
  showRecallKnowledge?: boolean
  conditionPenalties?: ConditionPenalties
}>()

const { settings } = useSettingsStore()

const penalties = computed(() => props.conditionPenalties ?? {
  attackRolls: 0, perception: 0, fortitude: 0, reflex: 0, will: 0, skillChecks: 0, damage: 0,
})

/**
 * Get the penalty for a specific roll type.
 * Maps save/perception/skill names to the appropriate condition penalty.
 */
function getPenalty(rollName: string): number {
  const name = rollName.toLowerCase()
  if (name === 'perception') return penalties.value.perception
  if (name === 'fortitude') return penalties.value.fortitude
  if (name === 'reflex') return penalties.value.reflex
  if (name === 'will') return penalties.value.will
  // Ability checks and skills use the general skill penalty
  return penalties.value.skillChecks
}

function roll(name: string, modifier: number) {
  const penalty = getPenalty(name)
  rollD20(modifier + penalty, name, props.creature.name)
}

function rollAttack(attackName: string, bonus: number, damage: string) {
  const attackPenalty = penalties.value.attackRolls
  rollD20(bonus + attackPenalty, attackName, props.creature.name)

  // Auto-roll damage if enabled in settings
  if (settings.autoRollDamage) {
    setTimeout(() => {
      rollDamage(cleanDamage(damage), attackName, props.creature.name, false, penalties.value.damage)
    }, 500)
  }
}

function rollDamageOnly(attackName: string, damage: string) {
  rollDamage(cleanDamage(damage), attackName, props.creature.name, false, penalties.value.damage)
}

function rollCritDamage(attackName: string, damage: string) {
  rollDamage(cleanDamage(damage), attackName, props.creature.name, true, penalties.value.damage)
}

// Parse damage for display — handles multi-group like "1d6+3 piercing plus 1d4 acid"
const parseAttackDamage = computed(() => {
  return (damage: string) => {
    const clean = cleanDamage(damage)
    const groups = parseDamageExpression(clean)
    if (groups.length === 0) return { dice: clean, type: '' }

    const parts = groups.map(g => {
      const mod = g.modifier !== 0 ? `${g.modifier >= 0 ? '+' : ''}${g.modifier}` : ''
      return `${g.numDice}d${g.dieSize}${mod}${g.damageType ? ' ' + g.damageType : ''}`
    })
    return {
      dice: parts.join(' + '),
      type: '' // Type is now inline with each dice group
    }
  }
})

// Get rarity from traits
const rarity = props.creature.traits.find(t =>
  ['Uncommon', 'Rare', 'Unique'].includes(t)
) || 'Common'

const recallDCs = getRecallKnowledgeDCs(props.creature.level, rarity)
const recallSkill = getRecallKnowledgeSkill(props.creature.traits)

// Clean trait strings from parsing artifacts
function cleanTrait(trait: string): string {
  return trait
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')[0] // Take first word if there's garbage
    .trim()
}

// Filter out garbage traits
function isValidTrait(trait: string): boolean {
  const clean = cleanTrait(trait)
  return clean.length > 0 && clean.length < 30 && !clean.includes('APPENDIX')
}

// Check if attack has agile trait (reduces MAP to -4/-8)
function isAgile(traits: string[]): boolean {
  return traits.some(t => t.toLowerCase().includes('agile'))
}

// Get MAP penalties for an attack
function getMAPPenalties(traits: string[]): { second: number; third: number } {
  const agile = isAgile(traits)
  return {
    second: agile ? -4 : -5,
    third: agile ? -8 : -10
  }
}
</script>

<template>
  <div class="statblock p-3 bg-elevated rounded-lg">
    <!-- Recall Knowledge -->
    <div v-if="showRecallKnowledge !== false" class="text-xs text-dim">
      <strong>Recall Knowledge</strong> - {{ recallSkill }}: DC {{ recallDCs.standard }}<br>
      <span class="text-[0.6875rem] text-muted">Unspecific Lore: DC {{ recallDCs.unspecific }} · Specific Lore: DC {{ recallDCs.specific }}</span>
    </div>

    <hr class="border-border my-2">

    <!-- Traits -->
    <div class="flex flex-wrap gap-1 my-2">
      <span
        v-for="trait in creature.traits"
        :key="trait"
        class="trait"
        :class="{
          'trait-size': ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].includes(trait),
          'trait-rarity-uncommon': trait === 'Uncommon',
          'trait-rarity-rare': trait === 'Rare',
          'trait-rarity-unique': trait === 'Unique',
        }"
      >
        {{ trait }}
      </span>
    </div>

    <hr class="border-border my-2">

    <!-- Perception & Senses -->
    <div class="mb-1.5">
      <span class="rollable" @click="roll('Perception', creature.perception)">
        <strong>Perception</strong>
        <span v-if="penalties.perception < 0" class="roll-value roll-penalized">
          <span class="roll-base-struck">{{ formatModifier(creature.perception) }}</span>
          {{ formatModifier(creature.perception + penalties.perception) }}
        </span>
        <span v-else class="roll-value">{{ formatModifier(creature.perception) }}</span>
      </span>
      <span v-if="creature.senses.length">; {{ creature.senses.join(', ') }}</span>
    </div>

    <!-- Languages -->
    <div v-if="creature.languages.length" class="mb-1.5">
      <strong>Languages</strong> {{ creature.languages.join(', ') }}
    </div>

    <!-- Skills -->
    <div v-if="Object.keys(creature.skills).length" class="mb-1.5">
      <strong>Skills</strong>
      <template v-for="(value, skill, index) in creature.skills" :key="skill">
        <span class="rollable" @click="roll(String(skill), value)">
          <span class="roll-label">{{ skill }}</span>
          <span v-if="penalties.skillChecks < 0" class="roll-value roll-penalized">
            <span class="roll-base-struck">{{ formatModifier(value) }}</span>
            {{ formatModifier(value + penalties.skillChecks) }}
          </span>
          <span v-else class="roll-value">{{ formatModifier(value) }}</span>
        </span>
        <span v-if="index < Object.keys(creature.skills).length - 1">, </span>
      </template>
    </div>

    <!-- Ability Scores -->
    <div class="flex flex-wrap gap-2 mb-1.5">
      <span class="rollable" @click="roll('Strength', creature.abilities.str)">
        <strong>Str</strong> <span class="roll-value">{{ formatModifier(creature.abilities.str) }}</span>
      </span>
      <span class="rollable" @click="roll('Dexterity', creature.abilities.dex)">
        <strong>Dex</strong> <span class="roll-value">{{ formatModifier(creature.abilities.dex) }}</span>
      </span>
      <span class="rollable" @click="roll('Constitution', creature.abilities.con)">
        <strong>Con</strong> <span class="roll-value">{{ formatModifier(creature.abilities.con) }}</span>
      </span>
      <span class="rollable" @click="roll('Intelligence', creature.abilities.int)">
        <strong>Int</strong> <span class="roll-value">{{ formatModifier(creature.abilities.int) }}</span>
      </span>
      <span class="rollable" @click="roll('Wisdom', creature.abilities.wis)">
        <strong>Wis</strong> <span class="roll-value">{{ formatModifier(creature.abilities.wis) }}</span>
      </span>
      <span class="rollable" @click="roll('Charisma', creature.abilities.cha)">
        <strong>Cha</strong> <span class="roll-value">{{ formatModifier(creature.abilities.cha) }}</span>
      </span>
    </div>

    <!-- Items -->
    <div v-if="creature.items?.length" class="mb-1.5">
      <strong>Items</strong> {{ creature.items.join(', ') }}
    </div>

    <hr class="border-border my-2">

    <!-- Defenses -->
    <div class="flex flex-wrap gap-2 mb-1.5">
      <span><strong>AC</strong> <span class="text-accent font-bold">{{ creature.ac }}</span></span>
      <span class="rollable" @click="roll('Fortitude', creature.saves.fort)">
        <strong>Fort</strong>
        <span v-if="penalties.fortitude < 0" class="roll-value roll-penalized">
          <span class="roll-base-struck">{{ formatModifier(creature.saves.fort) }}</span>
          {{ formatModifier(creature.saves.fort + penalties.fortitude) }}
        </span>
        <span v-else class="roll-value">{{ formatModifier(creature.saves.fort) }}</span>
      </span>
      <span class="rollable" @click="roll('Reflex', creature.saves.ref)">
        <strong>Ref</strong>
        <span v-if="penalties.reflex < 0" class="roll-value roll-penalized">
          <span class="roll-base-struck">{{ formatModifier(creature.saves.ref) }}</span>
          {{ formatModifier(creature.saves.ref + penalties.reflex) }}
        </span>
        <span v-else class="roll-value">{{ formatModifier(creature.saves.ref) }}</span>
      </span>
      <span class="rollable" @click="roll('Will', creature.saves.will)">
        <strong>Will</strong>
        <span v-if="penalties.will < 0" class="roll-value roll-penalized">
          <span class="roll-base-struck">{{ formatModifier(creature.saves.will) }}</span>
          {{ formatModifier(creature.saves.will + penalties.will) }}
        </span>
        <span v-else class="roll-value">{{ formatModifier(creature.saves.will) }}</span>
      </span>
    </div>

    <!-- HP, Immunities, etc -->
    <div class="mb-1.5">
      <strong>HP</strong> <span class="text-success font-bold">{{ creature.hp }}</span>
      <template v-if="creature.immunities.length">
        ; <strong>Immunities</strong> {{ creature.immunities.join(', ') }}
      </template>
      <template v-if="creature.resistances.length">
        ; <strong>Resistances</strong> {{ creature.resistances.join(', ') }}
      </template>
      <template v-if="creature.weaknesses.length">
        ; <strong>Weaknesses</strong> {{ creature.weaknesses.join(', ') }}
      </template>
    </div>

    <hr class="border-border my-2">

    <!-- Speed -->
    <div class="mb-1.5">
      <strong>Speed</strong> {{ creature.speed }}
    </div>

    <!-- Attacks -->
    <div v-for="attack in creature.attacks" :key="attack.name + attack.bonus" class="attack-block">
      <div class="flex items-center gap-1.5 flex-wrap">
        <strong>{{ attack.type === 'melee' ? 'Melee' : 'Ranged' }}</strong>
        <ActionIcon :action="attack.actions ?? 1" class="text-accent" />
        <span class="text-text">{{ attack.name }}</span>
        <!-- MAP Attack Buttons -->
        <span class="inline-flex gap-1 ml-1">
          <span
            class="rollable map-btn"
            @click="rollAttack(attack.name, attack.bonus, attack.damage)"
            :title="`1st attack: ${formatModifier(attack.bonus + penalties.attackRolls)}`"
          >
            {{ formatModifier(attack.bonus + penalties.attackRolls) }}
          </span>
          <span
            class="rollable map-btn map-btn-secondary"
            @click="rollAttack(attack.name + ' (2nd)', attack.bonus + getMAPPenalties(attack.traits).second, attack.damage)"
            :title="`2nd attack: ${formatModifier(attack.bonus + getMAPPenalties(attack.traits).second + penalties.attackRolls)}${isAgile(attack.traits) ? ' (agile)' : ''}`"
          >
            {{ formatModifier(attack.bonus + getMAPPenalties(attack.traits).second + penalties.attackRolls) }}
          </span>
          <span
            class="rollable map-btn map-btn-tertiary"
            @click="rollAttack(attack.name + ' (3rd)', attack.bonus + getMAPPenalties(attack.traits).third, attack.damage)"
            :title="`3rd attack: ${formatModifier(attack.bonus + getMAPPenalties(attack.traits).third + penalties.attackRolls)}${isAgile(attack.traits) ? ' (agile)' : ''}`"
          >
            {{ formatModifier(attack.bonus + getMAPPenalties(attack.traits).third + penalties.attackRolls) }}
          </span>
        </span>
        <span v-if="attack.traits.filter(isValidTrait).length" class="text-xs text-dim">
          ({{ attack.traits.filter(isValidTrait).map(cleanTrait).join(', ') }})
        </span>
      </div>
      <div class="mt-1 pl-4 text-[0.8125rem] flex items-center gap-2">
        <span class="rollable inline-flex items-center gap-1" @click="rollDamageOnly(attack.name, attack.damage)" title="Roll damage">
          <strong>Damage</strong>
          <span class="roll-value">{{ parseAttackDamage(attack.damage).dice }}</span>
        </span>
        <span class="rollable rollable-crit inline-flex items-center gap-1 text-xs" @click="rollCritDamage(attack.name, attack.damage)" title="Roll critical damage (doubled)">
          <strong>Crit</strong>
        </span>
        <span v-if="parseAttackDamage(attack.damage).type" class="text-dim">
          {{ parseAttackDamage(attack.damage).type }}
        </span>
      </div>
    </div>

    <!-- Special Abilities -->
    <div v-for="ability in creature.specialAbilities" :key="ability.name" class="ability-block mt-2">
      <div class="flex items-center gap-1.5 flex-wrap">
        <strong>{{ ability.name }}</strong>
        <ActionIcon v-if="ability.actions" :action="ability.actions" class="text-accent" />
        <span v-if="ability.traits?.length" class="text-xs text-dim">({{ ability.traits.join(', ') }})</span>
      </div>
      <div class="mt-1 text-[0.8125rem] text-dim">{{ ability.description }}</div>
    </div>
  </div>
</template>

<style scoped>
.roll-penalized {
  color: var(--color-danger);
}
.roll-base-struck {
  text-decoration: line-through;
  opacity: 0.5;
  margin-right: 0.25rem;
  color: var(--color-text-dim);
}
</style>
