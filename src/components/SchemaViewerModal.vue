<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps<{
  schemaId: string
}>()

defineEmits<{
  (e: 'close'): void
}>()

const SCHEMA_MAP: Record<string, { file: string; example: string; name: string }> = {
  'creatures': { file: 'creatures.schema.json', example: 'examples/creatures.example.json', name: 'Creatures' },
  'hazards': { file: 'hazards.schema.json', example: 'examples/hazards.example.json', name: 'Hazards' },
  'parties': { file: 'parties.schema.json', example: 'examples/parties.example.json', name: 'Parties' },
  'encounters': { file: 'encounters.schema.json', example: 'examples/encounters.example.json', name: 'Encounters' },
  'hacking-sessions': { file: 'hacking-sessions.schema.json', example: 'examples/hacking-sessions.example.json', name: 'Hacking Sessions' },
  'starship-scenes': { file: 'starship-scenes.schema.json', example: 'examples/starship-scenes.example.json', name: 'Starship Scenes' },
  'session-bundle': { file: 'session-bundle.schema.json', example: 'examples/session-bundle.example.yaml', name: 'Session Bundle' },
}

const activeTab = ref<'schema' | 'example' | 'notes'>('schema')
const schemaContent = ref('')
const exampleContent = ref('')
const importNotes = ref('')
const loading = ref(true)
const copied = ref(false)

const info = computed(() => SCHEMA_MAP[props.schemaId])

onMounted(async () => {
  const entry = info.value
  if (!entry) return

  try {
    const [schemaRes, exampleRes] = await Promise.all([
      fetch(`/schemas/${entry.file}`),
      fetch(`/schemas/${entry.example}`),
    ])

    const schemaJson = await schemaRes.json()
    schemaContent.value = JSON.stringify(schemaJson, null, 2)

    // Extract import notes from x-import-info
    if (schemaJson['x-import-info']) {
      const info = schemaJson['x-import-info']
      const lines = []
      if (info.storeMethod) lines.push(`Store method: ${info.storeMethod}`)
      if (info.format) lines.push(`Format: ${info.format}`)
      if (info.notes) lines.push(`\n${info.notes}`)
      if (info.exampleFile) lines.push(`\nExample: ${info.exampleFile}`)
      importNotes.value = lines.join('\n')
    }

    // Example might be YAML
    if (entry.example.endsWith('.yaml')) {
      exampleContent.value = await exampleRes.text()
    } else {
      const exampleJson = await exampleRes.json()
      exampleContent.value = JSON.stringify(exampleJson, null, 2)
    }
  } catch (e) {
    schemaContent.value = `Error loading schema: ${e}`
  } finally {
    loading.value = false
  }
})

function copyContent() {
  const content = activeTab.value === 'schema' ? schemaContent.value
    : activeTab.value === 'example' ? exampleContent.value
    : importNotes.value
  navigator.clipboard.writeText(content)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadContent() {
  const entry = info.value
  if (!entry) return

  const content = activeTab.value === 'schema' ? schemaContent.value : exampleContent.value
  const filename = activeTab.value === 'schema' ? entry.file : entry.example.split('/').pop()!
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content w-full max-w-2xl max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-text uppercase tracking-wide">
          <span class="text-accent">//</span> {{ info?.name ?? 'Schema' }}
        </h2>
        <button class="btn-secondary btn-icon" @click="$emit('close')" title="Close">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-3">
        <button
          v-for="tab in (['schema', 'example', 'notes'] as const)"
          :key="tab"
          class="tab-btn text-xs px-3 py-1.5 uppercase tracking-wide"
          :class="{ 'tab-btn-active': activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
        <div class="flex-1"></div>
        <button
          v-if="activeTab !== 'notes'"
          class="btn-secondary text-xs px-2 py-1"
          @click="downloadContent"
        >
          ↓ Download
        </button>
        <button
          class="btn-secondary text-xs px-2 py-1"
          :class="{ 'btn-success': copied }"
          @click="copyContent"
        >
          {{ copied ? '✓' : 'Copy' }}
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto bg-base p-3 border border-border font-mono text-xs leading-relaxed min-h-0">
        <div v-if="loading" class="text-dim">Loading...</div>
        <pre v-else class="whitespace-pre-wrap text-text">{{ activeTab === 'schema' ? schemaContent : activeTab === 'example' ? exampleContent : importNotes }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.tab-btn-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-bg);
}

.bg-base {
  background: var(--color-bg);
}
</style>
