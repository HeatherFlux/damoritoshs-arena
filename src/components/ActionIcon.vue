<script setup lang="ts">
import { computed } from 'vue'

/**
 * ActionIcon - Displays Paizo action icons using the Pathfinder-Icons font
 * Uses ligatures to render: [one-action], [two-actions], [three-actions], [reaction], [free-action]
 */

// Accept number (for action costs) or string (for special types)
type ActionType = number | 'reaction' | 'free'

const props = defineProps<{
  action: ActionType
}>()

// Map action types to ligature strings
const ligature = computed(() => {
  if (props.action === 0) return ''
  if (props.action === 1) return '[one-action]'
  if (props.action === 2) return '[two-actions]'
  if (props.action === 3) return '[three-actions]'
  if (props.action === 'reaction') return '[reaction]'
  if (props.action === 'free') return '[free-action]'
  // Fallback for any other number - show as text
  return `[${props.action}]`
})
</script>

<template>
  <span v-if="action !== 0" class="action-icon" :title="String(action)">
    {{ ligature }}
  </span>
</template>

<style scoped>
.action-icon {
  font-family: 'Pathfinder-Icons', sans-serif;
  font-size: 1.1em;
  line-height: 1;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5em;
  min-height: 1em;
  overflow: visible;
  /* Enable ligatures - required for the font to work */
  font-variant-ligatures: common-ligatures discretionary-ligatures;
  font-feature-settings: "liga" 1, "dlig" 1;
  -webkit-font-feature-settings: "liga" 1, "dlig" 1;
  -moz-font-feature-settings: "liga" 1, "dlig" 1;
}
</style>
