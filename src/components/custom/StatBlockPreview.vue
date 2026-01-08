<script setup lang="ts">
import { computed } from 'vue'
import type { Creature } from '../../types/creature'
import type { Hazard } from '../../types/hazard'

const props = defineProps<{
  creature?: Partial<Creature>
  hazard?: Partial<Hazard>
}>()

// Format ability modifier
function formatMod(value: number | undefined): string {
  if (value === undefined) return '+0'
  return value >= 0 ? `+${value}` : `${value}`
}

// Check if creature has meaningful data
const hasCreatureData = computed(() => {
  return props.creature && props.creature.name?.trim()
})

// Check if hazard has meaningful data
const hasHazardData = computed(() => {
  return props.hazard && props.hazard.name?.trim()
})

// Format size for display
const sizeDisplay = computed(() => {
  const size = props.creature?.size || 'medium'
  return size.charAt(0).toUpperCase() + size.slice(1)
})
</script>

<template>
  <!-- Creature Stat Block -->
  <div v-if="creature" class="stat-block">
    <template v-if="hasCreatureData">
      <!-- Header -->
      <div class="stat-header">
        <div class="stat-name">{{ creature.name }}</div>
        <div class="stat-level">LEVEL {{ creature.level ?? 1 }}</div>
      </div>

      <!-- Traits Row -->
      <div class="stat-traits">
        <span class="trait-size">{{ sizeDisplay }}</span>
        <span v-for="trait in creature.traits" :key="trait" class="trait">{{ trait }}</span>
      </div>

      <div class="stat-divider"></div>

      <!-- Perception & Senses -->
      <div class="stat-row">
        <span class="stat-label">Perception</span>
        <span class="stat-value">{{ formatMod(creature.perception) }}</span>
        <span v-if="creature.senses?.length" class="stat-extra">; {{ creature.senses.join(', ') }}</span>
      </div>

      <!-- Languages -->
      <div v-if="creature.languages?.length" class="stat-row">
        <span class="stat-label">Languages</span>
        <span class="stat-value">{{ creature.languages.join(', ') }}</span>
      </div>

      <!-- Skills -->
      <div v-if="creature.skills && Object.keys(creature.skills).length" class="stat-row">
        <span class="stat-label">Skills</span>
        <span class="stat-value">
          <template v-for="(mod, skill, index) in creature.skills" :key="skill">
            {{ skill }} {{ formatMod(mod) }}<span v-if="index < Object.keys(creature.skills!).length - 1">, </span>
          </template>
        </span>
      </div>

      <div class="stat-divider"></div>

      <!-- Ability Scores -->
      <div v-if="creature.abilities" class="stat-abilities">
        <div class="ability">
          <span class="ability-label">STR</span>
          <span class="ability-value">{{ formatMod(creature.abilities.str) }}</span>
        </div>
        <div class="ability">
          <span class="ability-label">DEX</span>
          <span class="ability-value">{{ formatMod(creature.abilities.dex) }}</span>
        </div>
        <div class="ability">
          <span class="ability-label">CON</span>
          <span class="ability-value">{{ formatMod(creature.abilities.con) }}</span>
        </div>
        <div class="ability">
          <span class="ability-label">INT</span>
          <span class="ability-value">{{ formatMod(creature.abilities.int) }}</span>
        </div>
        <div class="ability">
          <span class="ability-label">WIS</span>
          <span class="ability-value">{{ formatMod(creature.abilities.wis) }}</span>
        </div>
        <div class="ability">
          <span class="ability-label">CHA</span>
          <span class="ability-value">{{ formatMod(creature.abilities.cha) }}</span>
        </div>
      </div>

      <div class="stat-divider"></div>

      <!-- Defenses -->
      <div class="stat-row">
        <span class="stat-label">AC</span>
        <span class="stat-value stat-highlight">{{ creature.ac ?? '—' }}</span>
        <span class="stat-separator">;</span>
        <span class="stat-label">Fort</span>
        <span class="stat-value">{{ formatMod(creature.saves?.fort) }}</span>
        <span class="stat-separator">,</span>
        <span class="stat-label">Ref</span>
        <span class="stat-value">{{ formatMod(creature.saves?.ref) }}</span>
        <span class="stat-separator">,</span>
        <span class="stat-label">Will</span>
        <span class="stat-value">{{ formatMod(creature.saves?.will) }}</span>
      </div>

      <div class="stat-row">
        <span class="stat-label">HP</span>
        <span class="stat-value stat-highlight">{{ creature.hp ?? '—' }}</span>
        <template v-if="creature.immunities?.length">
          <span class="stat-separator">;</span>
          <span class="stat-label">Immunities</span>
          <span class="stat-value">{{ creature.immunities.join(', ') }}</span>
        </template>
      </div>

      <div v-if="creature.resistances?.length || creature.weaknesses?.length" class="stat-row">
        <template v-if="creature.resistances?.length">
          <span class="stat-label">Resistances</span>
          <span class="stat-value">{{ creature.resistances.join(', ') }}</span>
        </template>
        <span v-if="creature.resistances?.length && creature.weaknesses?.length" class="stat-separator">;</span>
        <template v-if="creature.weaknesses?.length">
          <span class="stat-label">Weaknesses</span>
          <span class="stat-value">{{ creature.weaknesses.join(', ') }}</span>
        </template>
      </div>

      <div class="stat-divider"></div>

      <!-- Speed -->
      <div class="stat-row">
        <span class="stat-label">Speed</span>
        <span class="stat-value">{{ creature.speed || '25 feet' }}</span>
      </div>

      <!-- Attacks -->
      <div v-if="creature.attacks?.length" class="stat-section">
        <div v-for="attack in creature.attacks" :key="attack.name" class="stat-attack">
          <span class="attack-icon">{{ attack.type === 'melee' ? '⚔' : attack.type === 'ranged' ? '🎯' : '◎' }}</span>
          <span class="attack-name">{{ attack.name }}</span>
          <span class="attack-bonus">{{ formatMod(attack.bonus) }}</span>
          <span v-if="attack.traits?.length" class="attack-traits">({{ attack.traits.join(', ') }})</span>
          <span class="attack-damage">{{ attack.damage }}</span>
        </div>
      </div>

      <!-- Special Abilities -->
      <div v-if="creature.specialAbilities?.length" class="stat-section">
        <div class="stat-divider"></div>
        <div v-for="ability in creature.specialAbilities" :key="ability.name" class="stat-ability">
          <span class="ability-name">{{ ability.name }}</span>
          <span v-if="ability.actions !== undefined" class="ability-actions">
            [{{ ability.actions === 'reaction' ? 'R' : ability.actions === 'free' ? 'F' : ability.actions }}]
          </span>
          <span v-if="ability.traits?.length" class="ability-traits">({{ ability.traits.join(', ') }})</span>
          <span class="ability-desc">{{ ability.description }}</span>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="stat-empty">
      <div class="empty-icon">◆</div>
      <div class="empty-text">Start building your creature</div>
      <div class="empty-hint">Enter a name to begin</div>
    </div>
  </div>

  <!-- Hazard Stat Block -->
  <div v-else-if="hazard" class="stat-block hazard-block">
    <template v-if="hasHazardData">
      <!-- Header -->
      <div class="stat-header hazard-header">
        <div class="stat-name">{{ hazard.name }}</div>
        <div class="stat-level">{{ hazard.complexity === 'complex' ? 'COMPLEX' : 'SIMPLE' }} HAZARD {{ hazard.level ?? 1 }}</div>
      </div>

      <!-- Traits Row -->
      <div class="stat-traits">
        <span class="trait-type">{{ hazard.type }}</span>
        <span v-for="subtype in hazard.trapSubtypes" :key="subtype" class="trait-subtype">{{ subtype }}</span>
        <span v-for="trait in hazard.traits" :key="trait" class="trait">{{ trait }}</span>
      </div>

      <div class="stat-divider hazard-divider"></div>

      <!-- Description -->
      <div v-if="hazard.description" class="stat-description">
        {{ hazard.description }}
      </div>

      <div class="stat-divider hazard-divider"></div>

      <!-- Stealth -->
      <div class="stat-row">
        <span class="stat-label">Stealth</span>
        <span v-if="hazard.isObvious" class="stat-value">Obvious</span>
        <span v-else-if="hazard.stealthDC" class="stat-value">
          DC {{ hazard.stealthDC }} (+{{ hazard.stealthDC - 10 }})
          <span v-if="hazard.stealthProficiency && hazard.stealthProficiency !== 'untrained'" class="stat-extra">
            ({{ hazard.stealthProficiency }} to find)
          </span>
        </span>
        <span v-else class="stat-value stat-placeholder">—</span>
      </div>

      <!-- Disable -->
      <div v-if="hazard.disable" class="stat-row">
        <span class="stat-label">Disable</span>
        <span class="stat-value">{{ hazard.disable }}</span>
      </div>

      <!-- Defenses (if physical) -->
      <template v-if="hazard.hasPhysicalComponent">
        <div class="stat-divider hazard-divider"></div>

        <div class="stat-row">
          <span class="stat-label">AC</span>
          <span class="stat-value stat-highlight">{{ hazard.ac ?? '—' }}</span>
          <template v-if="hazard.saves?.fortitude || hazard.saves?.reflex">
            <span class="stat-separator">;</span>
            <span v-if="hazard.saves?.fortitude" class="stat-inline">
              <span class="stat-label">Fort</span>
              <span class="stat-value">{{ formatMod(hazard.saves.fortitude) }}</span>
            </span>
            <span v-if="hazard.saves?.reflex" class="stat-inline">
              <span class="stat-separator">,</span>
              <span class="stat-label">Ref</span>
              <span class="stat-value">{{ formatMod(hazard.saves.reflex) }}</span>
            </span>
          </template>
        </div>

        <div class="stat-row">
          <span v-if="hazard.hardness" class="stat-inline">
            <span class="stat-label">Hardness</span>
            <span class="stat-value">{{ hazard.hardness }}</span>
            <span class="stat-separator">;</span>
          </span>
          <span class="stat-label">HP</span>
          <span class="stat-value stat-highlight">{{ hazard.hp ?? '—' }}</span>
          <span v-if="hazard.hp" class="stat-extra">(BT {{ hazard.bt ?? Math.floor(hazard.hp / 2) }})</span>
        </div>

        <div v-if="hazard.immunities?.length" class="stat-row">
          <span class="stat-label">Immunities</span>
          <span class="stat-value">{{ hazard.immunities.join(', ') }}</span>
        </div>
      </template>

      <div class="stat-divider hazard-divider"></div>

      <!-- Simple Hazard: Trigger & Effect -->
      <template v-if="hazard.complexity === 'simple'">
        <div v-if="hazard.trigger" class="stat-row">
          <span class="stat-label">Trigger</span>
          <span class="stat-value">{{ hazard.trigger }}</span>
        </div>

        <div v-if="hazard.effect || hazard.damage" class="stat-row">
          <span class="stat-label">Effect</span>
          <span class="stat-value">
            {{ hazard.effect }}
            <template v-if="hazard.damage">
              <span class="damage-info">
                {{ hazard.damage }}{{ hazard.damageType ? ` ${hazard.damageType}` : '' }} damage
                <span v-if="hazard.usesAttackRoll && hazard.attackBonus" class="stat-extra">(+{{ hazard.attackBonus }} attack)</span>
                <span v-else-if="hazard.saveDC" class="stat-extra">(DC {{ hazard.saveDC }} {{ hazard.saveType || 'basic' }})</span>
              </span>
            </template>
          </span>
        </div>

        <div v-if="hazard.reset" class="stat-row">
          <span class="stat-label">Reset</span>
          <span class="stat-value">{{ hazard.reset }}</span>
        </div>
      </template>

      <!-- Complex Hazard: Routine & Actions -->
      <template v-else>
        <div v-if="hazard.routine" class="stat-row">
          <span class="stat-label">Routine</span>
          <span class="stat-value">
            ({{ hazard.actionsPerRound ?? 1 }} action{{ (hazard.actionsPerRound ?? 1) > 1 ? 's' : '' }}) {{ hazard.routine }}
          </span>
        </div>

        <!-- Actions -->
        <div v-if="hazard.actions?.length" class="stat-section">
          <div v-for="action in hazard.actions" :key="action.name" class="stat-action">
            <div class="action-header">
              <span class="action-name">{{ action.name }}</span>
              <span v-if="action.actionType" class="action-type">
                {{ action.actionType === 'reaction' ? '[R]' : action.actionType === 'free' ? '[F]' : `[${action.actionType}]` }}
              </span>
              <span v-if="action.traits?.length" class="action-traits">({{ action.traits.join(', ') }})</span>
            </div>
            <div v-if="action.trigger" class="action-line">
              <span class="stat-label">Trigger</span> {{ action.trigger }}
            </div>
            <div class="action-line">
              <span class="stat-label">Effect</span> {{ action.effect }}
              <template v-if="action.damage">
                <span class="damage-info">
                  Deals {{ action.damage }}{{ action.damageType ? ` ${action.damageType}` : '' }} damage
                  <span v-if="action.attackBonus" class="stat-extra">(+{{ action.attackBonus }} attack)</span>
                  <span v-else-if="action.dc" class="stat-extra">(DC {{ action.dc }} {{ action.save || 'basic' }})</span>
                </span>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Empty State -->
    <div v-else class="stat-empty hazard-empty">
      <div class="empty-icon">⚠</div>
      <div class="empty-text">Start building your hazard</div>
      <div class="empty-hint">Enter a name to begin</div>
    </div>
  </div>
</template>

<style scoped>
.stat-block {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  overflow: hidden;
  font-size: var(--text-sm);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1rem 1.25rem 0.75rem;
  background: linear-gradient(180deg, var(--color-accent) 0%, transparent 100%);
  background-size: 100% 3px;
  background-repeat: no-repeat;
  background-position: top;
}

.hazard-header {
  background: linear-gradient(180deg, var(--color-secondary) 0%, transparent 100%);
  background-size: 100% 3px;
  background-repeat: no-repeat;
  background-position: top;
}

.stat-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-level {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
}

.trait,
.trait-size,
.trait-complexity,
.trait-type {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.125rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.trait-size {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.trait-complexity {
  color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.trait-type {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.trait-subtype {
  color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.stat-divider {
  height: 1px;
  margin: 0.75rem 1.25rem;
  background: linear-gradient(90deg, var(--color-accent), var(--color-border), transparent);
}

.hazard-divider {
  background: linear-gradient(90deg, var(--color-secondary), var(--color-border), transparent);
}

.stat-row {
  padding: 0.25rem 1.25rem;
  line-height: 1.5;
}

.stat-label {
  font-weight: 700;
  color: var(--color-text);
  margin-right: 0.25rem;
}

.stat-value {
  color: var(--color-text-dim);
}

.stat-highlight {
  color: var(--color-accent);
  font-weight: 600;
}

.stat-separator {
  color: var(--color-text-muted);
  margin: 0 0.25rem;
}

.stat-extra {
  color: var(--color-text-muted);
}

.stat-abilities {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
}

.ability {
  text-align: center;
}

.ability-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.125rem;
}

.ability-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.stat-section {
  padding: 0 1.25rem 0.75rem;
}

.stat-attack {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.375rem 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-attack:last-child {
  border-bottom: none;
}

.attack-icon {
  font-size: 0.875rem;
}

.attack-name {
  font-weight: 700;
  color: var(--color-text);
}

.attack-bonus {
  color: var(--color-accent);
  font-weight: 600;
}

.attack-traits {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.attack-damage {
  color: var(--color-text-dim);
}

.stat-ability {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-ability:last-child {
  border-bottom: none;
}

.stat-ability .ability-name {
  font-weight: 700;
  color: var(--color-text);
}

.stat-ability .ability-actions {
  color: var(--color-accent);
  font-weight: 600;
  margin-left: 0.25rem;
}

.stat-ability .ability-traits {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
}

.stat-ability .ability-desc {
  display: block;
  margin-top: 0.25rem;
  color: var(--color-text-dim);
  line-height: 1.4;
}

.stat-action {
  padding: 0.5rem 0;
}

.action-name {
  font-weight: 700;
  color: var(--color-text);
}

.action-type {
  color: var(--color-secondary);
  font-weight: 600;
  margin-left: 0.25rem;
}

.action-trigger,
.action-effect {
  margin-top: 0.25rem;
  color: var(--color-text-dim);
}

/* Empty State */
.stat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  color: var(--color-border);
  margin-bottom: 1rem;
  opacity: 0.5;
}

.hazard-empty .empty-icon {
  color: var(--color-secondary);
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Hazard-specific styles */
.stat-description {
  padding: 0.5rem 1.25rem;
  color: var(--color-text-dim);
  font-style: italic;
  line-height: 1.5;
}

.stat-inline {
  display: inline;
}

.stat-placeholder {
  color: var(--color-text-muted);
}

.damage-info {
  color: var(--color-danger);
  font-weight: 500;
}

.action-header {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.action-line {
  color: var(--color-text-dim);
  line-height: 1.5;
  margin-top: 0.25rem;
}

.action-traits {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
