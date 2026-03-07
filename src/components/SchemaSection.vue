<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{
  (e: 'view-schema', schemaId: string): void
  (e: 'open-bundle-importer'): void
}>()

const schemas = [
  { id: 'creatures', name: 'Creatures', file: 'creatures.schema.json', example: 'creatures.example.json' },
  { id: 'hazards', name: 'Hazards', file: 'hazards.schema.json', example: 'hazards.example.json' },
  { id: 'parties', name: 'Parties', file: 'parties.schema.json', example: 'parties.example.json' },
  { id: 'encounters', name: 'Encounters', file: 'encounters.schema.json', example: 'encounters.example.json' },
  { id: 'hacking-sessions', name: 'Hacking', file: 'hacking-sessions.schema.json', example: 'hacking-sessions.example.json' },
  { id: 'starship-scenes', name: 'Starship', file: 'starship-scenes.schema.json', example: 'starship-scenes.example.json' },
  { id: 'session-bundle', name: 'Session Bundle', file: 'session-bundle.schema.json', example: 'session-bundle.example.yaml' },
]

const indexUrl = `${window.location.origin}/schemas/index.json`
const copied = ref(false)

function copyIndexUrl() {
  navigator.clipboard.writeText(indexUrl)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadSchema(file: string) {
  const a = document.createElement('a')
  a.href = `/schemas/${file}`
  a.download = file
  a.click()
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-dim uppercase tracking-wide mb-3">&gt; Data Schemas</h3>

    <div class="p-3 bg-elevated space-y-3">
      <p class="text-xs text-dim">
        JSON Schema files for AI agents and data import. Use the index URL as the discovery endpoint.
      </p>

      <!-- Index URL -->
      <div class="flex gap-2">
        <input
          type="text"
          :value="indexUrl"
          readonly
          class="input flex-1 text-xs font-mono"
          @click="($event.target as HTMLInputElement).select()"
        />
        <button
          type="button"
          class="btn-secondary text-sm px-3 whitespace-nowrap"
          :class="{ 'btn-success': copied }"
          @click="copyIndexUrl"
        >
          {{ copied ? '✓' : 'Copy' }}
        </button>
      </div>

      <!-- Schema list -->
      <div class="space-y-1">
        <div
          v-for="schema in schemas"
          :key="schema.id"
          class="flex items-center justify-between py-1.5 px-2 hover:bg-border transition-colors text-sm"
        >
          <span class="text-text font-medium">{{ schema.name }}</span>
          <div class="flex gap-1">
            <button
              type="button"
              class="btn-secondary text-xs px-2 py-0.5"
              @click="$emit('view-schema', schema.id)"
            >
              View
            </button>
            <button
              type="button"
              class="btn-secondary text-xs px-2 py-0.5"
              @click="downloadSchema(schema.file)"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <!-- Import Bundle button -->
      <button
        type="button"
        class="btn-primary text-sm w-full"
        @click="$emit('open-bundle-importer')"
      >
        Import Session Bundle
      </button>
    </div>
  </div>
</template>
