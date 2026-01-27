<script setup lang="ts">
import { useEncounterStore } from '../stores/encounterStore'
import { useCombatStore } from '../stores/combatStore'
import { usePartyStore } from '../stores/partyStore'
import { DIFFICULTY_BUDGETS, getAdjustedBudget } from '../types/encounter'
import { formatComplexity, formatHazardType } from '../types/hazard'
import SciFiDial from './SciFiDial.vue'

const store = useEncounterStore()
const combatStore = useCombatStore()
const partyStore = usePartyStore()

const emit = defineEmits<{
  (e: 'run-encounter'): void
}>()

function runEncounter() {
  const encounter = store.activeEncounter.value
  if (!encounter) return

  // Clear existing combat and start fresh with encounter name
  combatStore.clearAndStartCombat(encounter.name)

  // Add all creatures
  encounter.creatures.forEach(entry => {
    for (let i = 0; i < entry.count; i++) {
      combatStore.addCreature(entry.creature, entry.adjustment)
    }
  })

  // Add all hazards
  if (encounter.hazards) {
    encounter.hazards.forEach(entry => {
      for (let i = 0; i < entry.count; i++) {
        combatStore.addHazard(entry.hazard)
      }
    })
  }

  // Add all players from active party
  const players = partyStore.getPartyPlayers()
  players.forEach(player => {
    combatStore.addPlayer(player.name, player.perception || 0, player.maxHP, player.ac)
  })

  // Switch to combat tab
  emit('run-encounter')
}

function formatLevelDiff(diff: number): string {
  if (diff === 0) return 'PL'
  return diff > 0 ? `PL+${diff}` : `PL${diff}`
}

function getXPColor(levelDiff: number): string {
  if (levelDiff >= 3) return 'var(--color-danger)'
  if (levelDiff >= 1) return 'var(--color-warning)'
  if (levelDiff <= -3) return 'var(--color-text-dim)'
  return 'var(--color-text)'
}

function getDifficultyBudgets() {
  const partySize = store.state.partySize
  return {
    trivial: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.trivial),
    low: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.low),
    moderate: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.moderate),
    severe: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.severe),
    extreme: getAdjustedBudget(partySize, DIFFICULTY_BUDGETS.extreme),
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <template v-if="store.activeEncounter.value">
      <div class="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
        <input
          :value="store.activeEncounter.value.name"
          @input="store.updateEncounterName(store.activeEncounter.value!.id, ($event.target as HTMLInputElement).value)"
          class="flex-1 text-base lg:text-xl font-semibold bg-transparent border-none border-b-2 border-b-transparent py-1 text-text focus:outline-none focus:border-b-accent min-w-0"
        />
        <button
          class="px-3 lg:px-4 py-1.5 lg:py-2 bg-success text-white border-none rounded-md font-semibold text-xs lg:text-sm cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-[#16a34a] hover:-translate-y-px disabled:bg-dim disabled:cursor-not-allowed disabled:opacity-50"
          @click="runEncounter"
          :disabled="store.activeEncounter.value.creatures.length === 0 && !store.activeEncounter.value.hazards?.length"
          title="Start combat with this encounter"
        >
          ▶ Run
        </button>
      </div>

      <!-- Party Quick Settings -->
      <div class="flex flex-wrap items-center gap-2 lg:gap-3 mb-3 p-2 lg:p-3 bg-surface border border-border rounded-lg">
        <!-- Using Party Mode -->
        <template v-if="partyStore.activeParty.value?.players?.length && !store.state.useManualOverride">
          <span class="text-[0.625rem] lg:text-xs text-dim uppercase tracking-wide">Party:</span>
          <span class="font-medium text-accent text-sm lg:text-base">{{ partyStore.activeParty.value.name }}</span>
          <span class="text-[0.625rem] lg:text-xs text-dim">
            ({{ partyStore.partySize.value }} players, Lvl {{ partyStore.partyLevel.value }})
          </span>
          <button
            class="ml-auto text-[0.625rem] lg:text-xs text-dim hover:text-text transition-colors"
            @click="store.setManualOverride(true)"
            title="Use manual level/size instead"
          >
            Override
          </button>
        </template>

        <!-- Manual Mode -->
        <template v-else>
          <div class="flex items-center gap-3 lg:gap-4">
            <SciFiDial
              :model-value="store.state.partySize"
              @update:model-value="store.setPartySize($event)"
              :min="1"
              :max="12"
              label="Size"
            />
            <SciFiDial
              :model-value="store.state.partyLevel"
              @update:model-value="store.setPartyLevel($event)"
              :min="1"
              :max="20"
              label="Level"
            />
          </div>
          <button
            v-if="partyStore.activeParty.value?.players?.length"
            class="ml-auto text-[0.625rem] lg:text-xs text-accent hover:text-text transition-colors"
            @click="store.setManualOverride(false)"
            title="Use party data"
          >
            ← Use Party
          </button>
          <span v-else class="ml-auto text-[0.625rem] lg:text-xs text-dim italic">
            No party selected
          </span>
        </template>
      </div>

      <!-- XP Summary -->
      <div v-if="store.encounterXP.value" class="bg-surface border border-border rounded-xl p-3 lg:p-4 mb-3 lg:mb-4">
        <div class="flex items-baseline justify-between mb-2">
          <div class="flex items-baseline gap-1.5 lg:gap-2">
            <span class="text-2xl lg:text-3xl font-bold text-accent">{{ store.encounterXP.value.totalXP }}</span>
            <span class="text-sm lg:text-base text-dim">XP</span>
          </div>
          <div v-if="store.encounterXP.value.creatureBreakdown.length > 0 || store.encounterXP.value.hazardBreakdown.length > 0" class="flex items-center gap-1.5 text-[0.625rem] lg:text-xs text-dim">
            <span v-if="store.encounterXP.value.creatureBreakdown.length > 0">
              {{ store.encounterXP.value.creatureBreakdown.reduce((sum, c) => sum + c.count, 0) }} creatures
            </span>
            <span v-if="store.encounterXP.value.creatureBreakdown.length > 0 && store.encounterXP.value.hazardBreakdown.length > 0" class="text-muted">·</span>
            <span v-if="store.encounterXP.value.hazardBreakdown.length > 0" class="text-hazard">
              {{ store.encounterXP.value.hazardBreakdown.reduce((sum, h) => sum + h.count, 0) }} hazards
            </span>
          </div>
        </div>

        <div
          class="difficulty capitalize"
          :class="`difficulty-${store.encounterXP.value.difficulty}`"
        >
          {{ store.encounterXP.value.difficulty }}
        </div>

        <div class="mt-3 lg:mt-4">
          <div class="flex justify-between text-[0.5rem] lg:text-[0.625rem] text-dim uppercase">
            <span>Trivial</span>
            <span>Low</span>
            <span>Mod</span>
            <span>Severe</span>
            <span>Extreme</span>
          </div>
          <div class="relative h-2 bg-border rounded mt-1 overflow-visible">
            <div
              class="h-full rounded transition-[width] duration-300"
              :style="{
                width: Math.min(100, (store.encounterXP.value.totalXP / getDifficultyBudgets().extreme) * 100) + '%'
              }"
              :class="`difficulty-${store.encounterXP.value.difficulty}`"
            ></div>
            <div
              v-for="(budget, difficulty) in getDifficultyBudgets()"
              :key="difficulty"
              class="absolute -top-0.5 w-0.5 h-3 bg-dim -translate-x-1/2"
              :style="{ left: (budget / getDifficultyBudgets().extreme) * 100 + '%' }"
              :title="`${difficulty}: ${budget} XP`"
            ></div>
          </div>
          <div class="flex justify-between text-[0.5rem] lg:text-[0.625rem] text-dim mt-1">
            <span>{{ getDifficultyBudgets().trivial }}</span>
            <span>{{ getDifficultyBudgets().low }}</span>
            <span>{{ getDifficultyBudgets().moderate }}</span>
            <span>{{ getDifficultyBudgets().severe }}</span>
            <span>{{ getDifficultyBudgets().extreme }}</span>
          </div>
        </div>
      </div>

      <!-- Encounter Contents (Players, Creatures, Hazards) -->
      <div class="flex-1 overflow-y-auto min-h-0">
        <!-- Players Section -->
        <div v-if="partyStore.activeParty.value?.players?.length" class="flex flex-col gap-1.5 lg:gap-2 mb-3 lg:mb-4">
          <h3 class="text-xs lg:text-sm font-semibold text-dim uppercase tracking-wide">Players</h3>
          <div
            v-for="player in partyStore.activeParty.value.players"
            :key="player.id"
            class="bg-surface border border-border rounded-lg p-2 lg:p-3 border-l-3 border-l-success"
          >
            <div class="flex items-center gap-2 lg:gap-3">
              <span class="text-base lg:text-lg">👤</span>
              <div class="flex-1 flex flex-col min-w-0">
                <span class="font-medium text-text text-sm lg:text-base truncate">{{ player.name }}</span>
                <span class="text-[0.625rem] lg:text-xs text-dim">
                  Level {{ player.level || '?' }}
                  <template v-if="player.class"> · {{ player.class }}</template>
                </span>
              </div>
              <div class="flex gap-1 lg:gap-1.5 shrink-0">
                <span class="text-[0.5625rem] lg:text-[0.6875rem] font-semibold px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-success">{{ player.maxHP }} HP</span>
                <span class="text-[0.5625rem] lg:text-[0.6875rem] font-semibold px-1 lg:px-1.5 py-0.5 rounded bg-elevated text-accent">AC {{ player.ac }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!store.activeEncounter.value.creatures.length && !store.activeEncounter.value.hazards?.length && !partyStore.activeParty.value?.players?.length" class="text-center py-6 lg:py-8 text-dim">
          <p class="text-sm lg:text-base">No threats in this encounter</p>
          <p class="text-xs lg:text-sm mt-2">Search and add creatures or hazards from the panel above</p>
        </div>

        <!-- Creature List -->
        <div v-if="store.encounterXP.value?.creatureBreakdown?.length" class="flex flex-col gap-1.5 lg:gap-2 mb-3 lg:mb-4">
          <h3 class="text-xs lg:text-sm font-semibold text-dim uppercase tracking-wide">Creatures</h3>
          <div
            v-for="entry in store.encounterXP.value.creatureBreakdown"
            :key="`${entry.creature.id}-${entry.adjustment}`"
            class="bg-surface border border-border rounded-lg p-2 lg:p-3"
          >
            <div class="flex items-center gap-2 lg:gap-3">
              <div class="flex items-center gap-0.5 lg:gap-1">
                <button
                  class="w-5 h-5 lg:w-6 lg:h-6 p-0 flex items-center justify-center bg-elevated border border-border text-sm lg:text-base"
                  @click="store.updateCreatureCount(entry.creature.id, entry.adjustment, entry.count - 1)"
                >
                  -
                </button>
                <span class="w-5 lg:w-6 text-center font-semibold text-sm lg:text-base">{{ entry.count }}</span>
                <button
                  class="w-5 h-5 lg:w-6 lg:h-6 p-0 flex items-center justify-center bg-elevated border border-border text-sm lg:text-base"
                  @click="store.updateCreatureCount(entry.creature.id, entry.adjustment, entry.count + 1)"
                >
                  +
                </button>
              </div>

              <div class="flex-1 flex flex-col min-w-0">
                <span class="font-medium text-sm lg:text-base truncate">
                  <template v-if="entry.adjustment !== 'normal'">
                    <span
                      class="text-[0.5rem] lg:text-[0.625rem] uppercase px-1 py-0.5 rounded mr-1"
                      :class="{
                        'bg-danger text-white': entry.adjustment === 'elite',
                        'bg-dim text-white': entry.adjustment === 'weak'
                      }"
                    >{{ entry.adjustment }}</span>
                  </template>
                  {{ entry.creature.name }}
                </span>
                <span class="text-[0.625rem] lg:text-xs text-dim">
                  Level {{ entry.effectiveLevel }}
                  <span class="font-medium" :style="{ color: getXPColor(entry.levelDiff) }">
                    ({{ formatLevelDiff(entry.levelDiff) }})
                  </span>
                </span>
              </div>

              <div class="flex flex-col items-end text-[0.625rem] lg:text-xs shrink-0">
                <span class="text-dim hidden lg:block">{{ entry.xpEach }} XP ea.</span>
                <span class="font-semibold text-accent">{{ entry.xpTotal }} XP</span>
              </div>

              <button
                class="btn-icon btn-danger btn-xs lg:btn-sm"
                @click="store.removeCreatureFromEncounter(entry.creature.id, entry.adjustment)"
                title="Remove all"
              >
                &times;
              </button>
            </div>

            <div class="flex gap-3 lg:gap-4 mt-2 pt-2 border-t border-border text-[0.625rem] lg:text-xs">
              <label class="flex items-center gap-1 cursor-pointer text-dim">
                <input
                  type="radio"
                  :checked="entry.adjustment === 'weak'"
                  @change="store.updateCreatureAdjustment(entry.creature.id, entry.adjustment, 'weak')"
                  class="w-auto m-0"
                />
                Weak
              </label>
              <label class="flex items-center gap-1 cursor-pointer text-dim">
                <input
                  type="radio"
                  :checked="entry.adjustment === 'normal'"
                  @change="store.updateCreatureAdjustment(entry.creature.id, entry.adjustment, 'normal')"
                  class="w-auto m-0"
                />
                Normal
              </label>
              <label class="flex items-center gap-1 cursor-pointer text-dim">
                <input
                  type="radio"
                  :checked="entry.adjustment === 'elite'"
                  @change="store.updateCreatureAdjustment(entry.creature.id, entry.adjustment, 'elite')"
                  class="w-auto m-0"
                />
                Elite
              </label>
            </div>
          </div>
        </div>

        <!-- Hazard List -->
        <div v-if="store.encounterXP.value?.hazardBreakdown?.length" class="flex flex-col gap-1.5 lg:gap-2">
          <h3 class="text-xs lg:text-sm font-semibold text-dim uppercase tracking-wide">Hazards</h3>
          <div
            v-for="entry in store.encounterXP.value.hazardBreakdown"
            :key="entry.hazard.id"
            class="bg-surface border border-border rounded-lg p-2 lg:p-3 border-l-3 border-l-hazard"
          >
            <div class="flex items-center gap-2 lg:gap-3">
              <div class="flex items-center gap-0.5 lg:gap-1">
                <button
                  class="w-5 h-5 lg:w-6 lg:h-6 p-0 flex items-center justify-center bg-elevated border border-border text-sm lg:text-base"
                  @click="store.updateHazardCount(entry.hazard.id, entry.count - 1)"
                >
                  -
                </button>
                <span class="w-5 lg:w-6 text-center font-semibold text-sm lg:text-base">{{ entry.count }}</span>
                <button
                  class="w-5 h-5 lg:w-6 lg:h-6 p-0 flex items-center justify-center bg-elevated border border-border text-sm lg:text-base"
                  @click="store.updateHazardCount(entry.hazard.id, entry.count + 1)"
                >
                  +
                </button>
              </div>

              <div class="flex-1 flex flex-col min-w-0">
                <span class="font-medium text-sm lg:text-base truncate">
                  {{ entry.hazard.name }}
                </span>
                <div class="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                  <span class="text-[0.625rem] lg:text-xs text-dim">
                    Level {{ entry.hazard.level }}
                    <span class="font-medium" :style="{ color: getXPColor(entry.levelDiff) }">
                      ({{ formatLevelDiff(entry.levelDiff) }})
                    </span>
                  </span>
                  <span
                    class="text-[0.5rem] lg:text-[0.625rem] px-1 lg:px-1.5 py-0.5 rounded font-medium uppercase bg-elevated"
                    :class="{
                      'text-dim': entry.hazard.complexity === 'simple',
                      'text-warning': entry.hazard.complexity === 'complex'
                    }"
                  >
                    {{ formatComplexity(entry.hazard.complexity) }}
                  </span>
                  <span
                    class="text-[0.5rem] lg:text-[0.625rem] px-1 lg:px-1.5 py-0.5 rounded font-medium uppercase bg-elevated"
                    :class="{
                      'text-danger': entry.hazard.type === 'trap',
                      'text-success': entry.hazard.type === 'environmental',
                      'text-hazard': entry.hazard.type === 'haunt'
                    }"
                  >
                    {{ formatHazardType(entry.hazard.type) }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end text-[0.625rem] lg:text-xs shrink-0">
                <span class="text-dim hidden lg:block">{{ entry.xpEach }} XP ea.</span>
                <span class="font-semibold text-hazard">{{ entry.xpTotal }} XP</span>
              </div>

              <button
                class="btn-icon btn-danger btn-xs lg:btn-sm"
                @click="store.removeHazardFromEncounter(entry.hazard.id)"
                title="Remove all"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="text-center p-12 text-dim">
        <h3 class="text-text mb-2">No Encounter Selected</h3>
        <p class="text-sm mt-2">Create a new encounter or select one from the sidebar</p>
        <button class="btn-primary mt-4" @click="store.createEncounter()">
          New Encounter
        </button>
      </div>
    </template>
  </div>
</template>
