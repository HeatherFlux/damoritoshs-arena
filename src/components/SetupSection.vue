<script setup lang="ts">
/** A collapsible section of a setup side panel, in the style of the custom builder's form sections. */
defineProps<{
  title: string
  /** Step number shown before the title. Leave out for optional sections. */
  step?: number
  /** Short note shown in the header, e.g. the current choice. */
  summary?: string
  done?: boolean
}>()

const open = defineModel<boolean>('open', { default: true })
</script>

<template>
  <section class="setup-section">
    <button class="setup-header" :class="{ 'setup-header-open': open }" @click="open = !open">
      <span class="setup-chevron">{{ open ? '▼' : '▶' }}</span>
      <span v-if="step" class="setup-step">{{ step }}</span>
      <span class="setup-title">{{ title }}</span>
      <span v-if="summary && !open" class="setup-summary">{{ summary }}</span>
      <span v-if="done" class="setup-check" title="Ready">✓</span>
    </button>
    <div v-show="open" class="setup-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.setup-section {
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  overflow: hidden;
}

.setup-header {
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

.setup-header:hover {
  background: var(--color-bg-hover);
}

.setup-header-open {
  border-bottom: 1px solid var(--color-border);
}

.setup-chevron {
  font-size: 0.625rem;
  color: var(--color-accent);
}

.setup-step {
  min-width: 1.25rem;
  padding: 0 0.25rem;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.setup-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  white-space: nowrap;
}

.setup-summary {
  flex: 1;
  min-width: 0;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setup-check {
  margin-left: auto;
  color: var(--color-success);
  font-weight: bold;
}

.setup-summary + .setup-check {
  margin-left: 0;
}

.setup-content {
  padding: 0.875rem;
  background: var(--color-bg-surface);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
