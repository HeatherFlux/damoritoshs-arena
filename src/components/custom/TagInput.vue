<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  suggestions?: string[]
  placeholder?: string
}>()

const model = defineModel<string[]>({ default: () => [] })

const inputValue = ref('')
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(-1)

const filteredSuggestions = computed(() => {
  if (!props.suggestions || !inputValue.value.trim()) return []
  const search = inputValue.value.toLowerCase()
  return props.suggestions
    .filter(s => s.toLowerCase().includes(search) && !model.value.includes(s))
    .slice(0, 6)
})

function addTag(value?: string) {
  const tagValue = (value || inputValue.value).trim()
  if (tagValue && !model.value.includes(tagValue)) {
    model.value.push(tagValue)
  }
  inputValue.value = ''
  showSuggestions.value = false
  selectedSuggestionIndex.value = -1
}

function removeTag(index: number) {
  model.value.splice(index, 1)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (selectedSuggestionIndex.value >= 0 && filteredSuggestions.value.length > 0) {
      addTag(filteredSuggestions.value[selectedSuggestionIndex.value])
    } else {
      addTag()
    }
  } else if (e.key === 'Backspace' && !inputValue.value && model.value.length > 0) {
    removeTag(model.value.length - 1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedSuggestionIndex.value < filteredSuggestions.value.length - 1) {
      selectedSuggestionIndex.value++
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedSuggestionIndex.value > 0) {
      selectedSuggestionIndex.value--
    }
  } else if (e.key === 'Escape') {
    showSuggestions.value = false
    selectedSuggestionIndex.value = -1
  }
}

function handleInput() {
  showSuggestions.value = true
  selectedSuggestionIndex.value = -1
}

function handleBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}
</script>

<template>
  <div class="tag-input-container">
    <div class="tag-input">
      <span
        v-for="(tag, index) in model"
        :key="tag"
        class="tag"
      >
        {{ tag }}
        <button type="button" class="tag-remove" @click="removeTag(index)">×</button>
      </span>
      <input
        v-model="inputValue"
        type="text"
        class="tag-input-field"
        :placeholder="model.length === 0 ? placeholder : ''"
        @keydown="handleKeydown"
        @input="handleInput"
        @focus="showSuggestions = true"
        @blur="handleBlur"
      />
    </div>

    <!-- Suggestions dropdown -->
    <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions">
      <button
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion"
        type="button"
        class="suggestion"
        :class="{ 'suggestion-selected': index === selectedSuggestionIndex }"
        @click="addTag(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tag-input-container {
  position: relative;
}

.tag-input {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.375rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  min-height: 2.25rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tag-input:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border-radius: 0.125rem;
  animation: tag-pop 0.15s ease;
}

@keyframes tag-pop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-bg);
  font-size: 0.875rem;
  font-weight: bold;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.tag-remove:hover {
  opacity: 1;
}

.tag-input-field {
  flex: 1;
  min-width: 80px;
  padding: 0.125rem 0.25rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.tag-input-field::placeholder {
  color: var(--color-text-muted);
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.suggestion {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.1s ease;
}

.suggestion:hover,
.suggestion-selected {
  background: var(--color-accent);
  color: var(--color-bg);
}
</style>
