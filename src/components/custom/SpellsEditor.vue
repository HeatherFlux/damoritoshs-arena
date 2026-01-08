<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpellcastingConfig } from '../../types/creature'

const props = defineProps<{
  creatureLevel: number
}>()

const model = defineModel<SpellcastingConfig>({
  default: () => ({
    enabled: false,
    tradition: '',
    type: '',
    dc: 0,
    attackMod: 0,
    focusPoints: 0,
    slots: {},
    notes: ''
  })
})

const isOpen = ref(false)

// Spell DC and Attack Modifier by level (GM Core p.126)
const SPELL_STATS: Record<number, { extremeDC: number; highDC: number; moderateDC: number; extremeAtk: number; highAtk: number; moderateAtk: number }> = {
  [-1]: { extremeDC: 19, highDC: 16, moderateDC: 13, extremeAtk: 11, highAtk: 8, moderateAtk: 5 },
  0: { extremeDC: 19, highDC: 16, moderateDC: 13, extremeAtk: 11, highAtk: 8, moderateAtk: 5 },
  1: { extremeDC: 20, highDC: 17, moderateDC: 14, extremeAtk: 12, highAtk: 9, moderateAtk: 6 },
  2: { extremeDC: 22, highDC: 18, moderateDC: 15, extremeAtk: 14, highAtk: 10, moderateAtk: 7 },
  3: { extremeDC: 23, highDC: 20, moderateDC: 17, extremeAtk: 15, highAtk: 12, moderateAtk: 9 },
  4: { extremeDC: 25, highDC: 21, moderateDC: 18, extremeAtk: 17, highAtk: 13, moderateAtk: 10 },
  5: { extremeDC: 26, highDC: 22, moderateDC: 19, extremeAtk: 18, highAtk: 14, moderateAtk: 11 },
  6: { extremeDC: 27, highDC: 24, moderateDC: 21, extremeAtk: 19, highAtk: 16, moderateAtk: 13 },
  7: { extremeDC: 29, highDC: 25, moderateDC: 22, extremeAtk: 21, highAtk: 17, moderateAtk: 14 },
  8: { extremeDC: 30, highDC: 26, moderateDC: 23, extremeAtk: 22, highAtk: 18, moderateAtk: 15 },
  9: { extremeDC: 32, highDC: 28, moderateDC: 25, extremeAtk: 24, highAtk: 20, moderateAtk: 17 },
  10: { extremeDC: 33, highDC: 29, moderateDC: 26, extremeAtk: 25, highAtk: 21, moderateAtk: 18 },
  11: { extremeDC: 34, highDC: 30, moderateDC: 27, extremeAtk: 26, highAtk: 22, moderateAtk: 19 },
  12: { extremeDC: 36, highDC: 32, moderateDC: 29, extremeAtk: 28, highAtk: 24, moderateAtk: 21 },
  13: { extremeDC: 37, highDC: 33, moderateDC: 30, extremeAtk: 29, highAtk: 25, moderateAtk: 22 },
  14: { extremeDC: 39, highDC: 34, moderateDC: 31, extremeAtk: 31, highAtk: 26, moderateAtk: 23 },
  15: { extremeDC: 40, highDC: 36, moderateDC: 33, extremeAtk: 32, highAtk: 28, moderateAtk: 25 },
  16: { extremeDC: 41, highDC: 37, moderateDC: 34, extremeAtk: 33, highAtk: 29, moderateAtk: 26 },
  17: { extremeDC: 43, highDC: 38, moderateDC: 35, extremeAtk: 35, highAtk: 30, moderateAtk: 27 },
  18: { extremeDC: 44, highDC: 40, moderateDC: 37, extremeAtk: 36, highAtk: 32, moderateAtk: 29 },
  19: { extremeDC: 46, highDC: 41, moderateDC: 38, extremeAtk: 38, highAtk: 33, moderateAtk: 30 },
  20: { extremeDC: 47, highDC: 42, moderateDC: 39, extremeAtk: 39, highAtk: 34, moderateAtk: 31 },
  21: { extremeDC: 48, highDC: 44, moderateDC: 41, extremeAtk: 40, highAtk: 36, moderateAtk: 33 },
  22: { extremeDC: 50, highDC: 45, moderateDC: 42, extremeAtk: 42, highAtk: 37, moderateAtk: 34 },
  23: { extremeDC: 51, highDC: 46, moderateDC: 43, extremeAtk: 43, highAtk: 38, moderateAtk: 35 },
  24: { extremeDC: 52, highDC: 48, moderateDC: 45, extremeAtk: 44, highAtk: 40, moderateAtk: 37 },
}

// Get spell stat suggestions for current level
const spellSuggestions = computed(() => {
  const level = Math.max(-1, Math.min(24, props.creatureLevel))
  const stats = SPELL_STATS[level] ?? SPELL_STATS[1]
  return {
    highDC: stats.highDC,
    moderateDC: stats.moderateDC,
    extremeDC: stats.extremeDC,
    highAtk: stats.highAtk,
    moderateAtk: stats.moderateAtk,
    extremeAtk: stats.extremeAtk
  }
})

// Maximum spell rank based on creature level (half level rounded up)
const maxSpellRank = computed(() => {
  return Math.max(1, Math.ceil(props.creatureLevel / 2))
})

// Generate available ranks (1 to maxSpellRank)
const availableRanks = computed(() => {
  const ranks: number[] = []
  for (let i = 1; i <= maxSpellRank.value; i++) {
    ranks.push(i)
  }
  return ranks.reverse() // Show highest first
})

function getSlotCount(rank: number): number {
  return model.value.slots[rank] ?? 0
}

function setSlotCount(rank: number, count: number) {
  const slots = { ...model.value.slots }
  if (count <= 0) {
    delete slots[rank]
  } else {
    slots[rank] = count
  }
  model.value = { ...model.value, slots }
}

// Apply suggested defaults for a primary caster
function applyPrimaryCaster() {
  const level = props.creatureLevel
  const highestRank = maxSpellRank.value
  const isEven = level % 2 === 0

  // Set DC and attack to high values
  model.value.dc = spellSuggestions.value.highDC
  model.value.attackMod = spellSuggestions.value.highAtk

  // Set slot counts based on GM Core guidelines
  const slots: Record<number, number> = {}
  slots[highestRank] = isEven ? 3 : 2

  // Lower ranks get 3 slots each (up to 3 ranks down)
  for (let r = highestRank - 1; r >= Math.max(1, highestRank - 3); r--) {
    slots[r] = 3
  }

  model.value = { ...model.value, slots }
}

// Apply suggested defaults for a secondary caster
function applySecondaryCaster() {
  // Set DC and attack to moderate values
  model.value.dc = spellSuggestions.value.moderateDC
  model.value.attackMod = spellSuggestions.value.moderateAtk

  // Fewer slots - just top 2 ranks
  const highestRank = maxSpellRank.value
  const slots: Record<number, number> = {}
  slots[highestRank] = 2
  if (highestRank > 1) {
    slots[highestRank - 1] = 2
  }

  model.value = { ...model.value, slots }
}

// Toggle enabled state
function toggleEnabled() {
  model.value = { ...model.value, enabled: !model.value.enabled }
}

// Format tradition for display
const traditionLabel = computed(() => {
  switch (model.value.tradition) {
    case 'arcane': return 'Arcane'
    case 'divine': return 'Divine'
    case 'occult': return 'Occult'
    case 'primal': return 'Primal'
    default: return 'None'
  }
})

// Format type for display
const typeLabel = computed(() => {
  switch (model.value.type) {
    case 'prepared': return 'Prepared'
    case 'spontaneous': return 'Spontaneous'
    case 'innate': return 'Innate'
    default: return 'None'
  }
})
</script>

<template>
  <div class="spells-editor">
    <!-- Collapsed display -->
    <div class="spells-summary" @click="isOpen = true">
      <div class="summary-toggle">
        <input
          type="checkbox"
          :checked="model.enabled"
          @click.stop="toggleEnabled"
        />
        <span class="toggle-label">Spellcasting</span>
      </div>
      <div v-if="model.enabled" class="summary-details">
        <span class="detail-chip">{{ traditionLabel }}</span>
        <span class="detail-chip">{{ typeLabel }}</span>
        <span class="detail-chip">DC {{ model.dc }}</span>
        <span class="detail-chip">+{{ model.attackMod }}</span>
      </div>
      <button type="button" class="edit-btn" v-if="model.enabled">
        Edit
      </button>
    </div>

    <!-- Popover Editor -->
    <Teleport to="body">
      <div v-if="isOpen" class="picker-overlay" @click="isOpen = false">
        <div class="picker-popover spells-popover" @click.stop>
          <div class="popover-header">
            <span class="popover-title">Spellcasting</span>
            <button type="button" class="btn-close" @click="isOpen = false">×</button>
          </div>

          <div class="popover-body">
            <!-- Enable toggle -->
            <div class="form-group">
              <label class="toggle-row">
                <input type="checkbox" v-model="model.enabled" />
                <span>Enable Spellcasting</span>
              </label>
            </div>

            <template v-if="model.enabled">
              <!-- Tradition & Type -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tradition</label>
                  <select v-model="model.tradition" class="input select">
                    <option value="">None</option>
                    <option value="arcane">Arcane</option>
                    <option value="divine">Divine</option>
                    <option value="occult">Occult</option>
                    <option value="primal">Primal</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Type</label>
                  <select v-model="model.type" class="input select">
                    <option value="">None</option>
                    <option value="prepared">Prepared</option>
                    <option value="spontaneous">Spontaneous</option>
                    <option value="innate">Innate</option>
                  </select>
                </div>
              </div>

              <!-- DC & Attack Modifier -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Spell DC</label>
                  <input v-model.number="model.dc" type="number" class="input" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Spell Attack</label>
                  <input v-model.number="model.attackMod" type="number" class="input" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Focus Points</label>
                  <input v-model.number="model.focusPoints" type="number" class="input" min="0" max="3" />
                </div>
              </div>

              <!-- Suggestions -->
              <div class="suggestion-hint">
                <span class="hint-label">Level {{ creatureLevel }} suggestions:</span>
                <span class="hint-item">High DC {{ spellSuggestions.highDC }} / +{{ spellSuggestions.highAtk }}</span>
                <span class="hint-item">Mod DC {{ spellSuggestions.moderateDC }} / +{{ spellSuggestions.moderateAtk }}</span>
              </div>

              <!-- Quick Apply -->
              <div class="quick-apply">
                <button type="button" class="btn btn-secondary btn-sm" @click="applyPrimaryCaster">
                  Apply Primary Caster
                </button>
                <button type="button" class="btn btn-secondary btn-sm" @click="applySecondaryCaster">
                  Apply Secondary Caster
                </button>
              </div>

              <!-- Spell Slots by Rank -->
              <div class="form-group">
                <label class="form-label">Spell Slots (Max Rank: {{ maxSpellRank }})</label>
                <div class="slots-grid">
                  <div v-for="rank in availableRanks" :key="rank" class="slot-row">
                    <span class="slot-rank">Rank {{ rank }}</span>
                    <input
                      type="number"
                      class="input slot-input"
                      :value="getSlotCount(rank)"
                      @input="setSlotCount(rank, parseInt(($event.target as HTMLInputElement).value) || 0)"
                      min="0"
                      max="10"
                    />
                    <span class="slot-label">slots</span>
                  </div>
                </div>
              </div>

              <!-- Notes for describing spells -->
              <div class="form-group">
                <label class="form-label">Spell Notes</label>
                <textarea
                  v-model="model.notes"
                  class="input textarea"
                  rows="3"
                  placeholder="Describe the creature's spells, e.g.:
• Rank 4: invisibility, translocate
• Rank 3: fireball, fear
• At-will: detect magic
• Constant: see the unseen"
                ></textarea>
              </div>
            </template>
          </div>

          <div class="popover-footer">
            <button type="button" class="btn btn-primary btn-sm" @click="isOpen = false">
              Done
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.spells-editor {
  position: relative;
}

.spells-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.spells-summary:hover {
  border-color: var(--color-accent);
}

.summary-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.summary-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  flex: 1;
}

.detail-chip {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: 0.25rem;
}

.edit-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-dim);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
}

.edit-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Popover */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.15s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.spells-popover {
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: slide-up 0.2s ease;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.popover-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-accent);
}

.btn-close {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-close:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.popover-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;
}

.suggestion-hint {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.hint-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.hint-item {
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.quick-apply {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.slots-grid {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slot-rank {
  width: 4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.slot-input {
  width: 3rem;
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}

.slot-input::-webkit-outer-spin-button,
.slot-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.slot-label {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.textarea {
  resize: vertical;
  min-height: 4rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.popover-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
