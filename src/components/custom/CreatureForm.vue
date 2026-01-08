<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Creature, Attack, SpecialAbility } from '../../types/creature'
import TraitPicker from './TraitPicker.vue'
import ImmunityPicker from './ImmunityPicker.vue'
import ResistWeakPicker from './ResistWeakPicker.vue'
import LanguagePicker from './LanguagePicker.vue'
import SensesPicker from './SensesPicker.vue'
import SkillsEditor from './SkillsEditor.vue'
import SpellsEditor from './SpellsEditor.vue'
import AttackEditor from './AttackEditor.vue'
import AbilityEditor from './AbilityEditor.vue'
import {
  getCreatureDefaults,
  getAttributeDefaults,
  getSkillDefaults,
  formatDamageExpression,
  ROAD_MAP_DESCRIPTIONS,
  type CreatureRoadMap
} from '../../utils/creatureDefaults'

const model = defineModel<Partial<Creature>>({ required: true })

// Road map selection for auto-defaults
const selectedRoadMap = ref<CreatureRoadMap>('balanced')
const showDefaultsApplied = ref(false)

// Apply suggested defaults based on level and road map
function applyDefaults() {
  const level = model.value.level ?? 1
  const defaults = getCreatureDefaults(level, selectedRoadMap.value)
  const attrs = getAttributeDefaults(level)

  // Apply defense values
  model.value.ac = defaults.ac
  model.value.hp = defaults.hp
  model.value.saves = {
    fort: defaults.fort,
    ref: defaults.ref,
    will: defaults.will,
  }
  model.value.perception = defaults.perception

  // Apply attribute defaults based on road map type
  switch (selectedRoadMap.value) {
    case 'brute':
      model.value.abilities = { str: attrs.high, dex: attrs.low, con: attrs.high, int: attrs.low, wis: attrs.low, cha: attrs.low }
      break
    case 'soldier':
      model.value.abilities = { str: attrs.high, dex: attrs.moderate, con: attrs.high, int: attrs.low, wis: attrs.moderate, cha: attrs.low }
      break
    case 'skirmisher':
      model.value.abilities = { str: attrs.moderate, dex: attrs.high, con: attrs.moderate, int: attrs.low, wis: attrs.moderate, cha: attrs.low }
      break
    case 'sniper':
      model.value.abilities = { str: attrs.low, dex: attrs.high, con: attrs.moderate, int: attrs.moderate, wis: attrs.high, cha: attrs.low }
      break
    case 'spellcaster':
      model.value.abilities = { str: attrs.low, dex: attrs.moderate, con: attrs.low, int: attrs.high, wis: attrs.high, cha: attrs.moderate }
      break
    case 'skillParagon':
      model.value.abilities = { str: attrs.low, dex: attrs.high, con: attrs.moderate, int: attrs.moderate, wis: attrs.high, cha: attrs.high }
      break
    default:
      model.value.abilities = { str: attrs.moderate, dex: attrs.moderate, con: attrs.moderate, int: attrs.moderate, wis: attrs.moderate, cha: attrs.moderate }
  }

  // Show success feedback
  showDefaultsApplied.value = true
  setTimeout(() => showDefaultsApplied.value = false, 2000)

  // Unlock and expand sections that now have data
  sectionsUnlocked.value.defenses = true
  sectionsUnlocked.value.abilities = true
  sectionsUnlocked.value.attacks = true
  expandedSections.value.defenses = true
}

// Get suggested attack stats for display
const suggestedAttack = computed(() => {
  const level = model.value.level ?? 1
  const defaults = getCreatureDefaults(level, selectedRoadMap.value)
  return {
    bonus: defaults.attackBonus,
    damage: formatDamageExpression(defaults.damage),
  }
})

// Resistance/Weakness value range by level (GM Core p.123)
const RESIST_WEAK_BY_LEVEL: Record<number, { min: number; max: number }> = {
  [-1]: { min: 1, max: 1 },
  0: { min: 1, max: 3 },
  1: { min: 2, max: 3 },
  2: { min: 2, max: 5 },
  3: { min: 3, max: 6 },
  4: { min: 4, max: 7 },
  5: { min: 4, max: 8 },
  6: { min: 5, max: 9 },
  7: { min: 5, max: 10 },
  8: { min: 6, max: 11 },
  9: { min: 6, max: 12 },
  10: { min: 7, max: 13 },
  11: { min: 7, max: 14 },
  12: { min: 8, max: 15 },
  13: { min: 8, max: 16 },
  14: { min: 9, max: 17 },
  15: { min: 9, max: 18 },
  16: { min: 9, max: 19 },
  17: { min: 10, max: 19 },
  18: { min: 10, max: 20 },
  19: { min: 11, max: 21 },
  20: { min: 11, max: 22 },
  21: { min: 12, max: 23 },
  22: { min: 12, max: 24 },
  23: { min: 12, max: 25 },
  24: { min: 13, max: 26 },
}

const resistWeakRange = computed(() => {
  const level = Math.max(-1, Math.min(24, model.value.level ?? 1))
  return RESIST_WEAK_BY_LEVEL[level] ?? { min: 5, max: 10 }
})

// Skill modifier suggestions by level
const skillSuggestions = computed(() => {
  const level = model.value.level ?? 1
  return getSkillDefaults(level)
})

// Trait-based auto-suggestions for immunities and senses (GM Core Trait Abilities)
const TRAIT_SUGGESTIONS: Record<string, { immunities: string[]; senses: string[]; description: string }> = {
  'Construct': {
    immunities: ['bleed', 'death effects', 'disease', 'doomed', 'drained', 'fatigued', 'healing', 'nonlethal', 'paralyzed', 'poison', 'sickened', 'unconscious'],
    senses: ['darkvision'],
    description: 'Constructs lack biological processes'
  },
  'Robot': {
    immunities: ['bleed', 'death effects', 'disease', 'doomed', 'drained', 'fatigued', 'healing', 'nonlethal', 'paralyzed', 'poison', 'sickened', 'unconscious'],
    senses: ['darkvision', 'low-light vision'],
    description: 'Robots have construct immunities + tech senses'
  },
  'Undead': {
    immunities: ['death effects', 'disease', 'paralyzed', 'poison', 'unconscious'],
    senses: ['darkvision'],
    description: 'Undead have negative healing and key immunities'
  },
  'Ooze': {
    immunities: ['critical hits', 'precision', 'unconscious'],
    senses: ['motion sense 60 feet'],
    description: 'Oozes are typically mindless with motion sense'
  },
  'Spirit': {
    immunities: ['disease', 'paralyzed', 'poison', 'precision'],
    senses: ['darkvision'],
    description: 'Spirits are often incorporeal with key immunities'
  },
  'Plant': {
    immunities: ['mental', 'paralyzed', 'poison', 'sleep', 'unconscious'],
    senses: ['low-light vision'],
    description: 'Plants have common condition immunities'
  },
  'Elemental': {
    immunities: ['bleed', 'paralyzed', 'poison', 'sleep'],
    senses: ['darkvision'],
    description: 'Elementals lack biological processes'
  },
  'Mindless': {
    immunities: ['mental'],
    senses: [],
    description: 'Mindless creatures are immune to mental effects'
  },
  'Swarm': {
    immunities: ['precision', 'grabbed', 'prone', 'restrained'],
    senses: [],
    description: 'Swarms are immune to single-target effects'
  }
}

// Get suggestions based on current traits
const traitSuggestions = computed(() => {
  const traits = model.value.traits ?? []
  const currentImmunities = new Set(model.value.immunities ?? [])
  const currentSenses = new Set(model.value.senses ?? [])

  const suggestedImmunities: string[] = []
  const suggestedSenses: string[] = []
  const sources: string[] = []

  for (const trait of traits) {
    const suggestions = TRAIT_SUGGESTIONS[trait]
    if (suggestions) {
      sources.push(trait)
      for (const imm of suggestions.immunities) {
        if (!currentImmunities.has(imm) && !suggestedImmunities.includes(imm)) {
          suggestedImmunities.push(imm)
        }
      }
      for (const sense of suggestions.senses) {
        if (!currentSenses.has(sense) && !suggestedSenses.includes(sense)) {
          suggestedSenses.push(sense)
        }
      }
    }
  }

  return {
    immunities: suggestedImmunities,
    senses: suggestedSenses,
    sources,
    hasAny: suggestedImmunities.length > 0 || suggestedSenses.length > 0
  }
})

// Apply suggested immunities
function applySuggestedImmunities() {
  const current = model.value.immunities ?? []
  model.value.immunities = [...new Set([...current, ...traitSuggestions.value.immunities])]
}

// Apply suggested senses
function applySuggestedSenses() {
  const current = model.value.senses ?? []
  model.value.senses = [...new Set([...current, ...traitSuggestions.value.senses])]
}

// Section unlock states
const sectionsUnlocked = ref({
  defenses: false,
  abilities: false,
  attacks: false,
  special: true, // Always available
})

// Watch for identity completion to unlock defenses
const identityComplete = computed(() => {
  return model.value.name && model.value.name.trim().length > 0
})

watch(identityComplete, (complete) => {
  if (complete && !sectionsUnlocked.value.defenses) {
    sectionsUnlocked.value.defenses = true
  }
})

// Watch for defenses completion to unlock abilities
const defensesComplete = computed(() => {
  return sectionsUnlocked.value.defenses &&
         model.value.ac !== undefined &&
         model.value.hp !== undefined
})

watch(defensesComplete, (complete) => {
  if (complete && !sectionsUnlocked.value.abilities) {
    sectionsUnlocked.value.abilities = true
  }
})

// Watch for abilities completion to unlock attacks
const abilitiesComplete = computed(() => {
  return sectionsUnlocked.value.abilities &&
         model.value.abilities &&
         model.value.perception !== undefined
})

watch(abilitiesComplete, (complete) => {
  if (complete && !sectionsUnlocked.value.attacks) {
    sectionsUnlocked.value.attacks = true
  }
})

// Expanded sections
const expandedSections = ref({
  identity: true,
  defenses: false,
  abilities: false,
  attacks: false,
  special: false,
})

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Size options
const sizeOptions = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

// Handle attacks
function addAttack(attack: Attack) {
  if (!model.value.attacks) model.value.attacks = []
  model.value.attacks.push(attack)
}

function removeAttack(index: number) {
  model.value.attacks?.splice(index, 1)
}

// Handle special abilities
function addAbility(ability: SpecialAbility) {
  if (!model.value.specialAbilities) model.value.specialAbilities = []
  model.value.specialAbilities.push(ability)
}

function removeAbility(index: number) {
  model.value.specialAbilities?.splice(index, 1)
}
</script>

<template>
  <div class="creature-form space-y-3">
    <!-- IDENTITY SECTION (Always Open) -->
    <section class="form-section">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.identity }"
        @click="toggleSection('identity')"
      >
        <span class="section-chevron">{{ expandedSections.identity ? '▼' : '▶' }}</span>
        <span class="section-title">Identity</span>
        <span v-if="identityComplete" class="section-check">✓</span>
      </button>

      <div v-show="expandedSections.identity" class="section-content">
        <div class="form-group">
          <label class="form-label">Name <span class="text-danger">*</span></label>
          <input
            v-model="model.name"
            type="text"
            class="input"
            :class="{ 'input-valid': model.name?.trim() }"
            placeholder="Anacite Wingbot"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Level</label>
            <input
              v-model.number="model.level"
              type="number"
              class="input"
              min="-1"
              max="25"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Size</label>
            <select v-model="model.size" class="input select">
              <option v-for="size in sizeOptions" :key="size" :value="size">
                {{ size.charAt(0).toUpperCase() + size.slice(1) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Road Map & Defaults -->
        <div class="form-group">
          <label class="form-label">Road Map</label>
          <div class="defaults-row">
            <select v-model="selectedRoadMap" class="input select flex-1">
              <option v-for="(info, key) in ROAD_MAP_DESCRIPTIONS" :key="key" :value="key">
                {{ info.name }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              @click="applyDefaults"
              title="Apply level-appropriate stats for this road map"
            >
              ⚡ Apply
            </button>
          </div>
          <Transition name="fade">
            <div v-if="showDefaultsApplied" class="defaults-applied">
              ✓ {{ ROAD_MAP_DESCRIPTIONS[selectedRoadMap].name }} defaults applied
            </div>
          </Transition>
        </div>

        <div class="form-group">
          <label class="form-label">Traits</label>
          <TraitPicker v-model="model.traits" />
        </div>

        <div class="form-group">
          <label class="form-label">Source</label>
          <input
            v-model="model.source"
            type="text"
            class="input input-sm"
            placeholder="Custom"
          />
        </div>
      </div>
    </section>

    <!-- DEFENSES SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.defenses }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.defenses }"
        :disabled="!sectionsUnlocked.defenses"
        @click="toggleSection('defenses')"
      >
        <span class="section-chevron">{{ expandedSections.defenses ? '▼' : '▶' }}</span>
        <span class="section-title">Defenses</span>
        <span v-if="!sectionsUnlocked.defenses" class="section-lock">🔒</span>
        <span v-else-if="defensesComplete" class="section-check">✓</span>
      </button>

      <div v-show="expandedSections.defenses && sectionsUnlocked.defenses" class="section-content">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">AC</label>
            <input v-model.number="model.ac" type="number" class="input" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">HP</label>
            <input v-model.number="model.hp" type="number" class="input" min="1" />
          </div>
        </div>

        <div class="form-row triple">
          <div class="form-group">
            <label class="form-label">Fort</label>
            <input v-model.number="model.saves!.fort" type="number" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Ref</label>
            <input v-model.number="model.saves!.ref" type="number" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Will</label>
            <input v-model.number="model.saves!.will" type="number" class="input" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Immunities</label>
          <ImmunityPicker v-model="model.immunities" />
          <!-- Trait-based suggestions -->
          <Transition name="fade">
            <div v-if="traitSuggestions.immunities.length" class="trait-suggestion">
              <span class="suggestion-label">
                From {{ traitSuggestions.sources.join(', ') }}:
              </span>
              <span class="suggestion-items">
                {{ traitSuggestions.immunities.slice(0, 4).join(', ') }}
                <span v-if="traitSuggestions.immunities.length > 4" class="text-dim">
                  +{{ traitSuggestions.immunities.length - 4 }} more
                </span>
              </span>
              <button type="button" class="btn-apply" @click="applySuggestedImmunities">
                + Add All
              </button>
            </div>
          </Transition>
        </div>

        <div class="form-group">
          <label class="form-label">Resistances</label>
          <ResistWeakPicker
            v-model="model.resistances"
            label="Resistances"
            :level-suggestion="resistWeakRange"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Weaknesses</label>
          <ResistWeakPicker
            v-model="model.weaknesses"
            label="Weaknesses"
            :level-suggestion="resistWeakRange"
          />
        </div>
      </div>
    </section>

    <!-- ABILITIES SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.abilities }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.abilities }"
        :disabled="!sectionsUnlocked.abilities"
        @click="toggleSection('abilities')"
      >
        <span class="section-chevron">{{ expandedSections.abilities ? '▼' : '▶' }}</span>
        <span class="section-title">Abilities</span>
        <span v-if="!sectionsUnlocked.abilities" class="section-lock">🔒</span>
        <span v-else-if="abilitiesComplete" class="section-check">✓</span>
      </button>

      <div v-show="expandedSections.abilities && sectionsUnlocked.abilities" class="section-content">
        <div class="ability-grid">
          <div class="form-group">
            <label class="form-label text-center">STR</label>
            <input v-model.number="model.abilities!.str" type="number" class="input text-center" />
          </div>
          <div class="form-group">
            <label class="form-label text-center">DEX</label>
            <input v-model.number="model.abilities!.dex" type="number" class="input text-center" />
          </div>
          <div class="form-group">
            <label class="form-label text-center">CON</label>
            <input v-model.number="model.abilities!.con" type="number" class="input text-center" />
          </div>
          <div class="form-group">
            <label class="form-label text-center">INT</label>
            <input v-model.number="model.abilities!.int" type="number" class="input text-center" />
          </div>
          <div class="form-group">
            <label class="form-label text-center">WIS</label>
            <input v-model.number="model.abilities!.wis" type="number" class="input text-center" />
          </div>
          <div class="form-group">
            <label class="form-label text-center">CHA</label>
            <input v-model.number="model.abilities!.cha" type="number" class="input text-center" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Perception</label>
          <input v-model.number="model.perception" type="number" class="input" />
        </div>

        <div class="form-group">
          <label class="form-label">Senses</label>
          <SensesPicker v-model="model.senses" />
          <!-- Trait-based suggestions -->
          <Transition name="fade">
            <div v-if="traitSuggestions.senses.length" class="trait-suggestion">
              <span class="suggestion-label">
                From {{ traitSuggestions.sources.join(', ') }}:
              </span>
              <span class="suggestion-items">
                {{ traitSuggestions.senses.join(', ') }}
              </span>
              <button type="button" class="btn-apply" @click="applySuggestedSenses">
                + Add
              </button>
            </div>
          </Transition>
        </div>

        <div class="form-group">
          <label class="form-label">Languages</label>
          <LanguagePicker v-model="model.languages" />
        </div>

        <div class="form-group">
          <label class="form-label">Skills</label>
          <SkillsEditor v-model="model.skills" :level-suggestion="skillSuggestions" />
        </div>

        <div class="form-group">
          <label class="form-label">Speed</label>
          <input v-model="model.speed" type="text" class="input" placeholder="25 feet, fly 40 feet" />
        </div>

        <div class="form-group">
          <label class="form-label">Spellcasting</label>
          <SpellsEditor v-model="model.spellcasting" :creature-level="model.level ?? 1" />
        </div>
      </div>
    </section>

    <!-- ATTACKS SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.attacks }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.attacks }"
        :disabled="!sectionsUnlocked.attacks"
        @click="toggleSection('attacks')"
      >
        <span class="section-chevron">{{ expandedSections.attacks ? '▼' : '▶' }}</span>
        <span class="section-title">Attacks</span>
        <span v-if="!sectionsUnlocked.attacks" class="section-lock">🔒</span>
        <span v-else-if="model.attacks?.length" class="section-count">{{ model.attacks.length }}</span>
      </button>

      <div v-show="expandedSections.attacks && sectionsUnlocked.attacks" class="section-content">
        <!-- Suggested values hint -->
        <div class="suggested-hint">
          <span class="hint-label">Suggested:</span>
          <span class="hint-value">+{{ suggestedAttack.bonus }}</span> to hit,
          <span class="hint-value">{{ suggestedAttack.damage }}</span> damage
          <span class="hint-type">({{ ROAD_MAP_DESCRIPTIONS[selectedRoadMap].name }})</span>
        </div>

        <!-- Existing attacks -->
        <div v-if="model.attacks?.length" class="attack-list">
          <div
            v-for="(attack, index) in model.attacks"
            :key="index"
            class="attack-item"
          >
            <div class="attack-info">
              <span class="attack-type">{{ attack.type === 'melee' ? '⚔' : '🎯' }}</span>
              <span class="attack-name">{{ attack.name }}</span>
              <span class="attack-bonus">+{{ attack.bonus }}</span>
              <span class="attack-damage text-dim">({{ attack.damage }})</span>
            </div>
            <button class="btn-icon btn-xs text-danger" @click="removeAttack(index)">×</button>
          </div>
        </div>

        <AttackEditor @add="addAttack" />
      </div>
    </section>

    <!-- SPECIAL ABILITIES SECTION (Always Available) -->
    <section class="form-section">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.special }"
        @click="toggleSection('special')"
      >
        <span class="section-chevron">{{ expandedSections.special ? '▼' : '▶' }}</span>
        <span class="section-title">Special Abilities</span>
        <span v-if="model.specialAbilities?.length" class="section-count">{{ model.specialAbilities.length }}</span>
      </button>

      <div v-show="expandedSections.special" class="section-content">
        <!-- Existing abilities -->
        <div v-if="model.specialAbilities?.length" class="ability-list">
          <div
            v-for="(ability, index) in model.specialAbilities"
            :key="index"
            class="ability-item"
          >
            <div class="ability-info">
              <span class="ability-name">{{ ability.name }}</span>
              <span v-if="ability.actions" class="ability-actions text-accent">
                [{{ ability.actions === 'reaction' ? 'R' : ability.actions === 'free' ? 'F' : ability.actions }}]
              </span>
            </div>
            <button class="btn-icon btn-xs text-danger" @click="removeAbility(index)">×</button>
          </div>
        </div>

        <AbilityEditor @add="addAbility" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.creature-form {
  font-size: var(--text-sm);
}

.form-section {
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.form-section.section-locked {
  opacity: 0.5;
}

.form-section.section-locked .section-header {
  cursor: not-allowed;
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-elevated);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.section-header:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.section-header.section-expanded {
  border-bottom: 1px solid var(--color-border);
}

.section-chevron {
  font-size: 0.625rem;
  color: var(--color-accent);
  transition: transform 0.15s ease;
}

.section-title {
  flex: 1;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
}

.section-lock {
  font-size: 0.75rem;
  opacity: 0.5;
}

.section-check {
  color: var(--color-success);
  font-weight: bold;
}

.section-count {
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.625rem;
  font-weight: bold;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.section-content {
  padding: 1rem;
  background: var(--color-bg-surface);
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-row.triple {
  grid-template-columns: 1fr 1fr 1fr;
}

.ability-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.ability-grid .input {
  padding: 0.375rem;
  font-size: 0.875rem;
}

/* Hide number input spinners */
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-valid {
  border-color: var(--color-success);
  box-shadow: 0 0 0 1px var(--color-success);
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;
}

.attack-list,
.ability-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.attack-item,
.ability-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
}

.attack-info,
.ability-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attack-type {
  font-size: 0.875rem;
}

.attack-name,
.ability-name {
  font-weight: 600;
  color: var(--color-text);
}

.attack-bonus {
  color: var(--color-accent);
  font-weight: bold;
}

.attack-damage {
  font-size: 0.75rem;
}

.ability-actions {
  font-size: 0.75rem;
  font-weight: bold;
}

/* Defaults Row */
.defaults-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.defaults-applied {
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-success);
}

/* Suggested values hint */
.suggested-hint {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.hint-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 0.25rem;
}

.hint-value {
  color: var(--color-accent);
  font-weight: 600;
  font-family: var(--font-mono);
}

.hint-type {
  color: var(--color-text-dim);
  opacity: 0.7;
  margin-left: 0.25rem;
}

/* Trait suggestions */
.trait-suggestion {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.suggestion-label {
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.suggestion-items {
  flex: 1;
  color: var(--color-text);
}

.btn-apply {
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apply:hover {
  background: var(--color-accent);
  color: var(--color-bg);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
