<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StarshipRole } from '../../types/starship'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'

// Set up pdfMake with fonts
;(pdfMake as unknown as { vfs: typeof pdfFonts.vfs }).vfs = pdfFonts.vfs

const props = defineProps<{
  roles: StarshipRole[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Selection state
const selectedRoleIds = ref<Set<string>>(new Set(props.roles.map(r => r.id)))
const isGenerating = ref(false)

const selectedRoles = computed(() =>
  props.roles.filter(r => selectedRoleIds.value.has(r.id))
)

function toggleRole(roleId: string) {
  if (selectedRoleIds.value.has(roleId)) {
    selectedRoleIds.value.delete(roleId)
  } else {
    selectedRoleIds.value.add(roleId)
  }
  selectedRoleIds.value = new Set(selectedRoleIds.value)
}

function selectAll() {
  selectedRoleIds.value = new Set(props.roles.map(r => r.id))
}

function selectNone() {
  selectedRoleIds.value = new Set()
}

// PDF Generation - Landscape, 4 cards per page (2x2)
function generatePdf() {
  isGenerating.value = true

  try {
    const docDefinition = createDocDefinition()
    pdfMake.createPdf(docDefinition).download('starship-role-cards.pdf')
  } finally {
    isGenerating.value = false
  }
}

function createDocDefinition(): TDocumentDefinitions {
  const content: Content[] = []
  const roles = selectedRoles.value

  // Process roles in groups of 4
  for (let i = 0; i < roles.length; i += 4) {
    const pageRoles = roles.slice(i, i + 4)

    // Pad to 4 if needed
    while (pageRoles.length < 4) {
      pageRoles.push(null as unknown as StarshipRole)
    }

    // Create 2x2 table for this page
    const tableBody: TableCell[][] = [
      [
        createRoleCell(pageRoles[0]),
        createRoleCell(pageRoles[1])
      ],
      [
        createRoleCell(pageRoles[2]),
        createRoleCell(pageRoles[3])
      ]
    ]

    content.push({
      table: {
        widths: [370, 370],
        dontBreakRows: true,
        body: tableBody
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#888888',
        vLineColor: () => '#888888',
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 10,
        paddingBottom: () => 10
      },
      pageBreak: i > 0 ? 'before' : undefined
    } as Content)
  }

  return {
    pageSize: 'LETTER',
    pageOrientation: 'landscape',
    pageMargins: [20, 20, 20, 20],
    defaultStyle: {
      fontSize: 7,
      lineHeight: 1.15
    },
    styles: {
      roleTitle: {
        fontSize: 12,
        bold: true,
        color: '#1a1a2e',
        margin: [0, 0, 0, 2] as [number, number, number, number]
      },
      roleSkills: {
        fontSize: 7,
        color: '#666666',
        italics: true,
        margin: [0, 0, 0, 4] as [number, number, number, number]
      },
      actionName: {
        fontSize: 8,
        bold: true,
        color: '#1a1a2e'
      },
      actionSkills: {
        fontSize: 6,
        color: '#888888'
      },
      outcomeLabel: {
        fontSize: 6,
        bold: true
      },
      outcomeText: {
        fontSize: 6,
        color: '#333333'
      }
    },
    content
  }
}

function createRoleCell(role: StarshipRole | null): TableCell {
  if (!role) {
    return { text: ' ' }
  }

  const cellContent: Content[] = []

  // Role name
  cellContent.push({
    text: role.name.toUpperCase(),
    style: 'roleTitle'
  })

  // Primary skills
  cellContent.push({
    text: `Primary: ${role.primarySkills.join(', ')}`,
    style: 'roleSkills'
  })

  // Actions (limit display to fit)
  const maxActions = 4
  const actionsToShow = role.actions.slice(0, maxActions)

  for (const action of actionsToShow) {
    // Action header
    cellContent.push({
      columns: [
        { width: 14, text: '\u25C6\u25C6', fontSize: 6, color: '#1a1a2e' },
        {
          width: '*',
          stack: [
            { text: action.name, style: 'actionName' },
            { text: action.skills.join(' or '), style: 'actionSkills' }
          ]
        }
      ],
      margin: [0, 3, 0, 1] as [number, number, number, number]
    })

    // Outcomes - compact format
    const outcomes: Content[] = []

    outcomes.push({
      text: [
        { text: 'Crit: ', style: 'outcomeLabel', color: '#16a34a' },
        { text: truncateText(action.outcomes.criticalSuccess, 80), style: 'outcomeText' }
      ]
    })

    outcomes.push({
      text: [
        { text: 'Success: ', style: 'outcomeLabel', color: '#2563eb' },
        { text: truncateText(action.outcomes.success, 80), style: 'outcomeText' }
      ]
    })

    if (action.outcomes.failure) {
      outcomes.push({
        text: [
          { text: 'Fail: ', style: 'outcomeLabel', color: '#ca8a04' },
          { text: truncateText(action.outcomes.failure, 60), style: 'outcomeText' }
        ]
      })
    }

    if (action.outcomes.criticalFailure) {
      outcomes.push({
        text: [
          { text: 'Crit Fail: ', style: 'outcomeLabel', color: '#dc2626' },
          { text: truncateText(action.outcomes.criticalFailure, 60), style: 'outcomeText' }
        ]
      })
    }

    cellContent.push({
      stack: outcomes,
      margin: [14, 0, 0, 2] as [number, number, number, number]
    })
  }

  if (role.actions.length > maxActions) {
    cellContent.push({
      text: `+ ${role.actions.length - maxActions} more actions...`,
      fontSize: 6,
      color: '#999999',
      italics: true,
      margin: [0, 2, 0, 0] as [number, number, number, number]
    })
  }

  return {
    stack: cellContent
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
</script>

<template>
  <div class="pdf-export">
    <div class="export-header">
      <h2 class="export-title">Export Role Cards</h2>
      <button class="close-btn" @click="emit('close')">&times;</button>
    </div>

    <div class="export-content">
      <p class="export-info">
        Select roles to export. Cards are arranged 4 per page in landscape orientation.
      </p>

      <div class="selection-controls">
        <button class="btn btn-secondary btn-sm" @click="selectAll">Select All</button>
        <button class="btn btn-secondary btn-sm" @click="selectNone">Select None</button>
        <span class="selection-count">{{ selectedRoles.length }} selected</span>
      </div>

      <div class="role-selection">
        <label
          v-for="role in roles"
          :key="role.id"
          class="role-checkbox"
          :class="{ selected: selectedRoleIds.has(role.id) }"
        >
          <input
            type="checkbox"
            :checked="selectedRoleIds.has(role.id)"
            @change="toggleRole(role.id)"
          />
          <div class="role-checkbox-info">
            <span class="role-checkbox-name">{{ role.name }}</span>
            <span class="role-checkbox-meta">
              {{ role.actions.length }} actions
              <span v-if="role.isCustom" class="custom-indicator">(Custom)</span>
            </span>
          </div>
        </label>
      </div>
    </div>

    <div class="export-footer">
      <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
      <button
        class="btn btn-primary"
        :disabled="selectedRoles.length === 0 || isGenerating"
        @click="generatePdf"
      >
        {{ isGenerating ? 'Generating...' : 'Download PDF' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pdf-export {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  background: var(--color-bg-surface);
}

.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.export-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-accent);
}

.close-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-danger);
}

.export-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.export-info {
  font-size: 0.875rem;
  color: var(--color-text-dim);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.selection-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.selection-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.role-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-checkbox:hover {
  border-color: var(--color-accent);
}

.role-checkbox.selected {
  border-color: var(--color-accent);
  background: rgba(30, 203, 225, 0.05);
}

.role-checkbox input {
  accent-color: var(--color-accent);
}

.role-checkbox-info {
  flex: 1;
  min-width: 0;
}

.role-checkbox-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.role-checkbox-meta {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.custom-indicator {
  color: var(--color-accent);
}

.export-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}
</style>
