<script setup lang="ts">
import { computed } from 'vue'
import type { Creature } from '../types/creature'
import { rollD20, rollDamage, formatModifier, getRecallKnowledgeDCs, getRecallKnowledgeSkill } from '../utils/dice'
import { useSettingsStore } from '../stores/settingsStore'

const props = defineProps<{
  creature: Creature
  showRecallKnowledge?: boolean
}>()

const { settings } = useSettingsStore()

function roll(name: string, modifier: number) {
  rollD20(modifier, name, props.creature.name)
}

function rollAttack(attackName: string, bonus: number, damage: string) {
  rollD20(bonus, attackName, props.creature.name)

  // Auto-roll damage if enabled in settings
  if (settings.autoRollDamage) {
    setTimeout(() => {
      rollDamage(cleanDamage(damage), attackName, props.creature.name, false)
    }, 500)
  }
}

function rollDamageOnly(attackName: string, damage: string) {
  rollDamage(cleanDamage(damage), attackName, props.creature.name, false)
}

function rollCritDamage(attackName: string, damage: string) {
  rollDamage(cleanDamage(damage), attackName, props.creature.name, true)
}

// Clean up damage strings from PDF parsing artifacts
function cleanDamage(damage: string): string {
  return damage
    .replace(/[A-Z][\u2014\u2013-][A-Z]/g, '') // Remove things like "T—Z"
    .replace(/\n/g, ' ')                        // Remove newlines
    .replace(/\s+/g, ' ')                       // Collapse whitespace
    .trim()
}

// Parse damage for display
const parseAttackDamage = computed(() => {
  return (damage: string) => {
    const clean = cleanDamage(damage)
    const match = clean.match(/(\d+d\d+[+-]?\d*)\s*(.*)/)
    if (match) {
      return {
        dice: match[1],
        type: match[2] || ''
      }
    }
    return { dice: clean, type: '' }
  }
})

function formatActions(actions: number | string | undefined): string {
  if (actions === undefined) return ''
  if (actions === 'reaction') return '⟲'
  if (actions === 'free') return '⭘'
  if (actions === 1) return '◆'
  if (actions === 2) return '◆◆'
  if (actions === 3) return '◆◆◆'
  return ''
}

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
        <span class="roll-value">{{ formatModifier(creature.perception) }}</span>
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
          <span class="roll-value">{{ formatModifier(value) }}</span>
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
        <strong>Fort</strong> <span class="roll-value">{{ formatModifier(creature.saves.fort) }}</span>
      </span>
      <span class="rollable" @click="roll('Reflex', creature.saves.ref)">
        <strong>Ref</strong> <span class="roll-value">{{ formatModifier(creature.saves.ref) }}</span>
      </span>
      <span class="rollable" @click="roll('Will', creature.saves.will)">
        <strong>Will</strong> <span class="roll-value">{{ formatModifier(creature.saves.will) }}</span>
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
        <span class="rollable inline-flex items-center gap-1.5" @click="rollAttack(attack.name, attack.bonus, attack.damage)" title="Roll attack + damage">
          <strong>{{ attack.type === 'melee' ? 'Melee' : 'Ranged' }}</strong>
          <span class="text-accent font-bold">◆</span>
          <span class="text-text">{{ attack.name }}</span>
          <span class="roll-value">{{ formatModifier(attack.bonus) }}</span>
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
        <span v-if="ability.actions" class="text-accent font-bold">{{ formatActions(ability.actions) }}</span>
        <span v-if="ability.traits?.length" class="text-xs text-dim">({{ ability.traits.join(', ') }})</span>
      </div>
      <div class="mt-1 text-[0.8125rem] text-dim">{{ ability.description }}</div>
    </div>
  </div>
</template>
