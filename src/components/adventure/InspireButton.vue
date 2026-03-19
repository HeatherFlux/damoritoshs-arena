<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label?: string
}>()

const emit = defineEmits<{
  inspire: [count: number]
}>()

const showDropdown = ref(false)
const counts = [1, 3, 5]

function handleClick() {
  emit('inspire', 1)
}

function handleCount(count: number) {
  showDropdown.value = false
  emit('inspire', count)
}
</script>

<template>
  <div class="relative inline-flex">
    <button
      class="btn btn-secondary btn-xs"
      @click="handleClick"
      :title="`Generate ${props.label || 'suggestion'}`"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="mr-1">
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M6.457 6.293l.292-.293.707.707.293-.292a1 1 0 1 1 1.414 1.414l-.293.293.707.707-.292.293a1 1 0 1 1-1.414-1.414l.292-.293-.707-.707-.293.293a1 1 0 1 1-1.414-1.414l.293-.293z"/>
      </svg>
      Inspire
    </button>
    <button
      class="btn btn-secondary btn-xs !px-1 !border-l-0"
      @click.stop="showDropdown = !showDropdown"
      title="Generate multiple"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </button>
    <div
      v-if="showDropdown"
      class="absolute top-full right-0 mt-1 bg-elevated border border-border rounded shadow-lg z-10 min-w-[4rem]"
    >
      <button
        v-for="c in counts"
        :key="c"
        class="block w-full text-left px-3 py-1.5 text-xs text-dim hover:text-text hover:bg-hover transition-colors"
        @click="handleCount(c)"
      >
        {{ c }}
      </button>
    </div>
  </div>
  <!-- Close dropdown on outside click -->
  <div v-if="showDropdown" class="fixed inset-0 z-[5]" @click="showDropdown = false"></div>
</template>
