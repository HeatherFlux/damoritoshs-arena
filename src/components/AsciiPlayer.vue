<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface AsciiData {
  fps: number
  cols: number
  rows?: number
  frameCount: number
  frames: string[]
}

const props = defineProps<{
  src: string
  autoplay?: boolean
}>()

const emit = defineEmits<{
  ended: []
  loaded: []
}>()

const asciiContent = ref('')
const isPlaying = ref(false)
const isLoaded = ref(false)
let data: AsciiData | null = null
let frameIndex = 0
let intervalId: ReturnType<typeof setInterval> | null = null

async function loadData() {
  try {
    const response = await fetch(props.src)
    data = await response.json()
    isLoaded.value = true
    emit('loaded')

    if (props.autoplay) {
      play()
    }
  } catch (err) {
    console.error('Failed to load ASCII data:', err)
  }
}

function play() {
  if (!data || isPlaying.value) return

  isPlaying.value = true
  frameIndex = 0

  // Show first frame immediately
  asciiContent.value = data.frames[0]

  intervalId = setInterval(() => {
    frameIndex++

    if (frameIndex >= data!.frames.length) {
      stop()
      emit('ended')
      return
    }

    asciiContent.value = data!.frames[frameIndex]
  }, 1000 / data.fps)
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  isPlaying.value = false
}

function reset() {
  stop()
  frameIndex = 0
  if (data) {
    asciiContent.value = data.frames[0]
  }
}

watch(() => props.src, async () => {
  stop()
  data = null
  isLoaded.value = false
  await loadData()
  // Auto-play when src changes (triggered by parent)
  if (data) {
    play()
  }
})

onMounted(async () => {
  if (props.src) {
    await loadData()
    // Auto-play on mount (when component appears via v-if)
    if (data) {
      play()
    }
  }
})

onUnmounted(() => {
  stop()
})

defineExpose({ play, stop, reset })
</script>

<template>
  <pre class="ascii-player">{{ asciiContent }}</pre>
</template>

<style scoped>
.ascii-player {
  font-family: 'Courier New', Courier, monospace;
  font-size: 8px;
  line-height: 1;
  letter-spacing: 0;
  white-space: pre;
  margin: 0;
  padding: 0;
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
}
</style>
