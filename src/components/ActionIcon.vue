<script setup lang="ts">
/**
 * ActionIcon - Displays Paizo action icons using the Pathfinder-Icons font
 * Uses ligatures to render: [one-action], [two-actions], [three-actions], [reaction], [free-action]
 */

type ActionType = 0 | 1 | 2 | 3 | 'reaction' | 'free'

defineProps<{
  action: ActionType
}>()

// Map action types to ligature strings
const actionLigatures: Record<ActionType, string> = {
  0: '', // No action cost
  1: '[one-action]',
  2: '[two-actions]',
  3: '[three-actions]',
  'reaction': '[reaction]',
  'free': '[free-action]'
}
</script>

<template>
  <span v-if="action !== 0" class="action-icon" :title="String(action)">
    {{ actionLigatures[action] }}
  </span>
</template>

<style scoped>
.action-icon {
  font-family: 'Pathfinder-Icons', sans-serif;
  font-size: 1.1em;
  line-height: 1;
  vertical-align: middle;
  margin-left: 0.25em;
}
</style>
