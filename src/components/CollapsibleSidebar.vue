<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  side: 'left' | 'right'
  width?: string
  storageKey: string
}>(), {
  width: 'w-70'
})

const STORAGE_PREFIX = 'sf2e-sidebar-'
const MOBILE_BREAKPOINT = 1024

// Load initial state from localStorage
function loadCollapsedState(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + props.storageKey)
    if (saved !== null) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load sidebar state:', e)
  }
  // Default: check if mobile
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
}

const isCollapsed = ref(loadCollapsedState())

// Save state to localStorage
watch(isCollapsed, (val) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + props.storageKey, JSON.stringify(val))
  } catch (e) {
    console.error('Failed to save sidebar state:', e)
  }
})

// Auto-collapse on mobile when first mounting (only if no saved preference)
onMounted(() => {
  const hasSavedPreference = localStorage.getItem(STORAGE_PREFIX + props.storageKey) !== null
  if (!hasSavedPreference && window.innerWidth < MOBILE_BREAKPOINT) {
    isCollapsed.value = true
  }
})

function toggle() {
  isCollapsed.value = !isCollapsed.value
}

// Chevron direction based on side and state (true = pointing right)
const chevronRight = computed(() => {
  if (props.side === 'left') {
    return isCollapsed.value // collapsed left sidebar: point right to expand
  } else {
    return !isCollapsed.value // expanded right sidebar: point right to collapse
  }
})

// Convert Tailwind width class to CSS value for content sizing
const contentWidth = computed(() => {
  const widthMap: Record<string, string> = {
    'w-70': '17.5rem',
    'w-80': '20rem',
    'w-64': '16rem',
    'w-72': '18rem',
    'w-96': '24rem',
  }
  // Handle arbitrary values like w-[380px]
  const arbitraryMatch = props.width.match(/w-\[(.+)\]/)
  if (arbitraryMatch) {
    return arbitraryMatch[1]
  }
  return widthMap[props.width] || '17.5rem'
})
</script>

<template>
  <div class="sidebar-wrapper" :class="[side === 'left' ? 'sidebar-left' : 'sidebar-right']">
    <!-- Sidebar content area -->
    <aside
      class="sidebar-panel bg-surface overflow-hidden transition-all duration-250 ease-out"
      :class="[
        isCollapsed ? 'w-0' : width,
        side === 'left' ? 'border-r border-border' : 'border-l border-border'
      ]"
    >
      <div
        class="sidebar-content h-full overflow-y-auto"
        :class="{ 'opacity-0 pointer-events-none': isCollapsed }"
        :style="{ width: contentWidth }"
      >
        <slot />
      </div>
    </aside>

    <!-- Edge tab toggle button - in document flow, not absolutely positioned -->
    <button
      class="sidebar-tab"
      @click="toggle"
      :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        fill="currentColor"
        viewBox="0 0 16 16"
        :class="{ 'rotate-180': chevronRight }"
        class="transition-transform duration-200"
      >
        <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  height: 100%;
}

.sidebar-left {
  flex-direction: row;
}

.sidebar-right {
  flex-direction: row-reverse;
}

.sidebar-panel {
  flex-shrink: 0;
  height: 100%;
}

.sidebar-content {
  transition: opacity 0.15s ease-out;
  height: 100%;
  flex-shrink: 0;
}

/* Edge tab button - flex child, centered vertically */
.sidebar-tab {
  flex-shrink: 0;
  align-self: center;
  width: 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-surface);
  color: var(--color-accent);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid var(--color-border);
  border-left: none; /* No left border - adjacent to sidebar's right border */
}

/* For right sidebar, flip the border */
.sidebar-right .sidebar-tab {
  border-left: 1px solid var(--color-border);
  border-right: none; /* No right border - adjacent to sidebar's left border */
}

.sidebar-tab:hover {
  color: var(--color-text);
  border-color: var(--color-border-hover);
}
</style>
