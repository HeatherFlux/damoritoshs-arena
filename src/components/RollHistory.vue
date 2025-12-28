<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getRollHistory,
  clearRollHistory,
  deleteRoll,
  onRoll,
  copyRollToClipboard,
  type RollResult
} from '../utils/dice'

const rolls = ref<RollResult[]>(getRollHistory())
const showExportMenu = ref<string | null>(null)
const copiedId = ref<string | null>(null)

// Subscribe to new rolls
onMounted(() => {
  const unsubscribe = onRoll(() => {
    rolls.value = getRollHistory()
  })

  onUnmounted(() => {
    unsubscribe()
  })
})

function handleClear() {
  clearRollHistory()
  rolls.value = []
}

function handleDelete(id: string) {
  deleteRoll(id)
  rolls.value = getRollHistory()
}

async function handleCopy(roll: RollResult, format: 'discord' | 'foundry' | 'json' | 'text') {
  const success = await copyRollToClipboard(roll, format)
  if (success) {
    copiedId.value = roll.id
    setTimeout(() => {
      copiedId.value = null
    }, 1500)
  }
  showExportMenu.value = null
}

function toggleExportMenu(id: string) {
  showExportMenu.value = showExportMenu.value === id ? null : id
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}
</script>

<template>
  <div class="flex flex-col h-full bg-surface rounded-lg overflow-hidden">
    <div class="flex justify-between items-center px-4 py-3 border-b border-border bg-elevated">
      <h3 class="text-sm font-semibold">Roll History</h3>
      <button
        v-if="rolls.length > 0"
        class="btn-secondary btn-sm"
        @click="handleClear"
        title="Clear all rolls"
      >
        Clear
      </button>
    </div>

    <div v-if="rolls.length === 0" class="flex flex-col items-center justify-center p-8 text-dim text-center">
      <span class="text-3xl mb-2 opacity-50">🎲</span>
      <p class="my-1">No rolls yet</p>
      <p class="text-xs text-muted">Click rollable stats in creature cards to roll dice</p>
    </div>

    <TransitionGroup name="roll-list" tag="div" class="flex-1 overflow-y-auto p-2">
      <div
        v-for="roll in rolls"
        :key="roll.id"
        class="relative px-3 py-3 pr-14 mb-2 bg-elevated rounded-md border-l-3 transition-all duration-150 hover:bg-border"
        :class="{
          'border-l-success bg-success/10': roll.isNat20,
          'border-l-danger bg-danger/10': roll.isNat1 || roll.isCriticalHit,
          'border-l-warning': roll.type === 'damage' && !roll.isNat20 && !roll.isNat1 && !roll.isCriticalHit,
          'border-l-accent': roll.type !== 'damage' && !roll.isNat20 && !roll.isNat1,
          'bg-accent/20': copiedId === roll.id
        }"
      >
        <div class="flex items-center gap-3">
          <!-- Left: Source and Name -->
          <div class="flex-1 min-w-0">
            <div class="text-xs text-dim uppercase tracking-wide font-medium">{{ roll.source }}</div>
            <div class="text-sm font-medium text-text leading-snug truncate">{{ roll.name }}</div>
          </div>

          <!-- Right: Total Number -->
          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-2xl font-bold"
              :class="{
                'text-success': roll.isNat20,
                'text-danger': roll.isNat1 || roll.isCriticalHit,
                'text-warning': roll.type === 'damage' && !roll.isNat20 && !roll.isNat1 && !roll.isCriticalHit,
                'text-rollable': roll.type !== 'damage' && !roll.isNat20 && !roll.isNat1
              }"
            >{{ roll.total }}</span>
            <div class="flex flex-col items-start gap-0.5">
              <span v-if="roll.isCriticalHit" class="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-danger text-white uppercase">CRIT</span>
              <span v-if="roll.isNat20" class="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-success text-white uppercase">NAT 20</span>
              <span v-if="roll.isNat1" class="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-danger text-white uppercase">NAT 1</span>
              <span v-if="roll.damageType && !roll.isCriticalHit && !roll.isNat20 && !roll.isNat1" class="text-xs text-dim">{{ roll.damageType.split(' ')[0] }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
          <span class="text-xs text-dim font-mono">{{ roll.breakdown }}</span>
          <span class="text-[0.6875rem] text-muted">{{ formatTime(roll.timestamp) }}</span>
        </div>

        <div class="absolute top-1 right-1 flex gap-0.5 roll-actions">
          <div class="relative">
            <button
              class="action-btn"
              @click="toggleExportMenu(roll.id)"
              title="Copy to clipboard"
            >
              #
            </button>

            <Transition name="menu">
              <div v-if="showExportMenu === roll.id" class="absolute top-full right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-50 min-w-[140px] overflow-hidden">
                <button
                  class="flex items-center gap-2 w-full px-3 py-2 text-xs text-left bg-transparent border-none text-text cursor-pointer transition-colors duration-100 hover:bg-elevated"
                  @click="handleCopy(roll, 'discord')"
                >
                  <span class="text-sm">💬</span> Discord
                </button>
                <button
                  class="flex items-center gap-2 w-full px-3 py-2 text-xs text-left bg-transparent border-none text-text cursor-pointer transition-colors duration-100 hover:bg-elevated"
                  @click="handleCopy(roll, 'foundry')"
                >
                  <span class="text-sm">🎭</span> Foundry VTT
                </button>
                <button
                  class="flex items-center gap-2 w-full px-3 py-2 text-xs text-left bg-transparent border-none text-text cursor-pointer transition-colors duration-100 hover:bg-elevated"
                  @click="handleCopy(roll, 'text')"
                >
                  <span class="text-sm">📝</span> Plain Text
                </button>
                <button
                  class="flex items-center gap-2 w-full px-3 py-2 text-xs text-left bg-transparent border-none text-text cursor-pointer transition-colors duration-100 hover:bg-elevated"
                  @click="handleCopy(roll, 'json')"
                >
                  <span class="text-sm">{ }</span> JSON
                </button>
              </div>
            </Transition>
          </div>

          <button
            class="action-btn action-btn-danger"
            @click="handleDelete(roll.id)"
            title="Delete roll"
          >
            −
          </button>
        </div>

        <Transition name="copied">
          <div v-if="copiedId === roll.id" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-success text-white px-3 py-1 rounded text-xs font-semibold pointer-events-none">
            Copied!
          </div>
        </Transition>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Show actions on hover */
.relative:hover .roll-actions {
  opacity: 1;
}

/* Action buttons */
.action-btn {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.1s ease;
}

.action-btn:hover {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.action-btn-danger:hover {
  background: var(--color-danger-subtle);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* Animations */
.roll-list-enter-active {
  animation: slideDown 0.2s ease;
}

.roll-list-leave-active {
  animation: fadeOut 0.15s ease;
}

.roll-list-move {
  transition: transform 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.menu-enter-active {
  animation: menuIn 0.15s ease;
}

.menu-leave-active {
  animation: menuOut 0.1s ease;
}

@keyframes menuIn {
  from {
    opacity: 0;
    transform: translateY(-5px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes menuOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.copied-enter-active {
  animation: popIn 0.2s ease;
}

.copied-leave-active {
  animation: fadeOut 0.15s ease;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
