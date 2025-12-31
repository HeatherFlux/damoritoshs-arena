<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: number
  min: number
  max: number
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const dialRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const scrollAccumulator = ref(0)

// Calculate angle for current value (270° arc, from -135° to +135°)
const rotation = computed(() => {
  const range = props.max - props.min
  const normalized = (props.modelValue - props.min) / range
  return -135 + (normalized * 270)
})

// Progress as percentage (0-1)
const progress = computed(() => {
  return (props.modelValue - props.min) / (props.max - props.min)
})

// Handle drag interaction
function handlePointerDown(e: PointerEvent) {
  isDragging.value = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  updateValueFromPointer(e)
}

function handlePointerMove(e: PointerEvent) {
  if (!isDragging.value || !dialRef.value) return
  updateValueFromPointer(e)
}

function handlePointerUp() {
  isDragging.value = false
}

function updateValueFromPointer(e: PointerEvent) {
  if (!dialRef.value) return

  const rect = dialRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // Calculate angle from center to pointer
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)

  // Convert angle to value (accounting for our -135° to +135° range)
  let normalizedAngle = angle + 90
  if (normalizedAngle < -135) normalizedAngle += 360
  if (normalizedAngle > 225) normalizedAngle -= 360

  // Clamp to our arc range
  normalizedAngle = Math.max(-135, Math.min(135, normalizedAngle))

  // Convert to value
  const normalized = (normalizedAngle + 135) / 270
  const value = Math.round(props.min + normalized * (props.max - props.min))

  emit('update:modelValue', Math.max(props.min, Math.min(props.max, value)))
}

// Scroll wheel support
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  scrollAccumulator.value += e.deltaY
  const threshold = 80

  if (Math.abs(scrollAccumulator.value) >= threshold) {
    const delta = scrollAccumulator.value > 0 ? -1 : 1
    const newValue = Math.max(props.min, Math.min(props.max, props.modelValue + delta))
    emit('update:modelValue', newValue)
    scrollAccumulator.value = 0
  }
}
</script>

<template>
  <div class="dial-container">
    <div
      ref="dialRef"
      class="dial"
      :class="{ 'dial-active': isDragging }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
      @wheel="handleWheel"
    >
      <!-- Background arc -->
      <svg class="dial-svg" viewBox="0 0 100 100">
        <!-- Track arc (background) -->
        <path
          class="dial-track"
          d="M 15 75 A 40 40 0 1 1 85 75"
          fill="none"
          stroke-width="4"
          stroke-linecap="round"
        />

        <!-- Active arc (filled portion) -->
        <path
          class="dial-active-track"
          d="M 15 75 A 40 40 0 1 1 85 75"
          fill="none"
          stroke-width="4"
          stroke-linecap="round"
          :stroke-dasharray="`${progress * 188} 188`"
        />

      </svg>

      <!-- Value display -->
      <div class="dial-value">{{ modelValue }}</div>
    </div>

    <!-- Label -->
    <div v-if="label" class="dial-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.dial-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.dial {
  position: relative;
  width: 80px;
  height: 80px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.dial-active {
  cursor: grabbing;
}

.dial-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px var(--color-tertiary-subtle));
}

.dial:hover .dial-svg {
  filter: drop-shadow(0 0 12px var(--color-tertiary));
}

.dial-track {
  stroke: var(--color-border);
}

.dial-active-track {
  stroke: var(--color-tertiary);
  filter: drop-shadow(0 0 4px var(--color-tertiary));
  transition: stroke-dasharray 0.1s ease-out;
}

.dial-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}

.dial:hover .dial-value {
  color: var(--color-tertiary);
}

.dial-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-text-muted);
}
</style>
