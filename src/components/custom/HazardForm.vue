<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  Hazard, HazardComplexity, HazardType, TrapSubtype,
  Proficiency, MainChallenge, HazardAction, TargetingModel
} from '../../types/hazard'
import HazardTraitPicker from './HazardTraitPicker.vue'
import ImmunityPicker from './ImmunityPicker.vue'
import {
  getHazardDefaults,
  type HazardRoadmap
} from '../../utils/hazardDefaults'
import {
  renderHazardMarkdown,
  exportHazardJSON,
  getTraitHints,
  parseDiceAverage
} from '../../utils/hazardStatBlock'

const model = defineModel<Partial<Hazard>>({ required: true })

const emit = defineEmits<{
  complete: []
}>()

// Road map for auto-defaults
const selectedRoadMap = ref<HazardRoadmap>('high')
const showDefaultsApplied = ref(false)

// Preview state
const showPreview = ref(false)
const previewTab = ref<'rendered' | 'markdown'>('rendered')
const copyStatus = ref<'idle' | 'copied'>('idle')

// Section states
const sectionsUnlocked = ref({
  detection: false,
  defenses: false,
  offense: false,
  details: true, // Always available
})

const expandedSections = ref({
  identity: true,
  detection: false,
  defenses: false,
  offense: false,
  details: false,
})

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Options
const complexityOptions: HazardComplexity[] = ['simple', 'complex']
const typeOptions: HazardType[] = ['trap', 'environmental', 'haunt']
const trapSubtypeOptions: TrapSubtype[] = ['mechanical', 'magical', 'tech']
const roadMapOptions: { value: HazardRoadmap; label: string; desc: string }[] = [
  { value: 'extreme', label: 'Extreme', desc: 'The hazard excels in this area' },
  { value: 'high', label: 'High', desc: 'Standard effectiveness' },
  { value: 'low', label: 'Low', desc: 'Below average, easier to overcome' },
]
const proficiencyOptions: Proficiency[] = ['untrained', 'trained', 'expert', 'master', 'legendary']
const mainChallengeOptions: { value: MainChallenge; label: string; hint: string }[] = [
  { value: 'find', label: 'Find It', hint: 'Hard to detect' },
  { value: 'disable', label: 'Disable It', hint: 'Hard to disarm' },
  { value: 'survive', label: 'Survive Trigger', hint: 'Deadly effect' },
  { value: 'endure', label: 'Endure Routine', hint: 'Ongoing threat' },
]
const targetingOptions: { value: TargetingModel; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'area', label: 'Area' },
  { value: 'random', label: 'Random' },
]

// Get defaults based on level
const defaults = computed(() => getHazardDefaults(model.value.level ?? 1))

// Computed states
const identityComplete = computed(() =>
  model.value.name?.trim() && model.value.level !== undefined
)

// Watch for section unlocks - unlock all when identity is complete
watch(identityComplete, (complete) => {
  if (complete) {
    sectionsUnlocked.value.detection = true
    sectionsUnlocked.value.defenses = true
    sectionsUnlocked.value.offense = true
  }
}, { immediate: true })

// Apply defaults based on road map
function applyDefaults() {
  const d = defaults.value
  const road = selectedRoadMap.value

  // Stealth
  if (!model.value.isObvious) {
    model.value.stealthDC = d.stealthDC[road]
  }

  // Defenses (if physical)
  if (model.value.hasPhysicalComponent) {
    model.value.ac = d.ac[road]
    if (!model.value.saves) model.value.saves = {}
    model.value.saves.fortitude = d.save[road]
    model.value.saves.reflex = d.save[road]
    model.value.hardness = Math.floor((d.hardness[0] + d.hardness[1]) / 2)
    model.value.hp = Math.floor((d.hp[0] + d.hp[1]) / 2)
    model.value.bt = Math.floor((model.value.hp || 0) / 2)
  }

  // Offense
  const isComplex = model.value.complexity === 'complex'
  model.value.attackBonus = isComplex ? d.attack.complex : d.attack.simple
  model.value.saveDC = d.effectDC[road === 'low' ? 'high' : road]
  model.value.damage = isComplex ? d.damage.complex : d.damage.simple

  // Show feedback
  showDefaultsApplied.value = true
  setTimeout(() => showDefaultsApplied.value = false, 2000)

  // Unlock sections
  sectionsUnlocked.value.detection = true
  sectionsUnlocked.value.defenses = true
  sectionsUnlocked.value.offense = true
  expandedSections.value.detection = true
}

// Toggle trap subtype
function toggleTrapSubtype(subtype: TrapSubtype) {
  if (!model.value.trapSubtypes) model.value.trapSubtypes = []
  const idx = model.value.trapSubtypes.indexOf(subtype)
  if (idx >= 0) {
    model.value.trapSubtypes.splice(idx, 1)
  } else {
    model.value.trapSubtypes.push(subtype)
  }
}

// Actions management
const showActionEditor = ref(false)
const editingAction = ref<Partial<HazardAction>>({
  name: '',
  effect: '',
  actionType: 'reaction',
})

function addAction() {
  if (!editingAction.value.name?.trim() || !editingAction.value.effect?.trim()) return
  if (!model.value.actions) model.value.actions = []

  model.value.actions.push({
    name: editingAction.value.name.trim(),
    effect: editingAction.value.effect.trim(),
    trigger: editingAction.value.trigger?.trim(),
    actionType: editingAction.value.actionType,
    damage: editingAction.value.damage?.trim(),
    damageType: editingAction.value.damageType?.trim(),
    dc: editingAction.value.dc,
    save: editingAction.value.save,
  })

  editingAction.value = { name: '', effect: '', actionType: 'reaction' }
  showActionEditor.value = false
}

function removeAction(index: number) {
  model.value.actions?.splice(index, 1)
}

// Computed: Markdown and export
const markdownPreview = computed(() => renderHazardMarkdown(model.value))
const jsonExport = computed(() => exportHazardJSON(model.value))
const traitHints = computed(() => getTraitHints(model.value))
const damageAverage = computed(() =>
  model.value.damage ? parseDiceAverage(model.value.damage) : null
)

// Copy functions
async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(markdownPreview.value)
    copyStatus.value = 'copied'
    setTimeout(() => { copyStatus.value = 'idle' }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

async function copyJSON() {
  try {
    await navigator.clipboard.writeText(jsonExport.value)
    copyStatus.value = 'copied'
    setTimeout(() => { copyStatus.value = 'idle' }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

// Markdown to HTML for preview
function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="stat-name">$1</h1>')
    .replace(/^\*\*(.+?)\*\*$/gm, '<p class="stat-line"><strong>$1</strong></p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
}
</script>

<template>
  <div class="hazard-form space-y-3">
    <!-- IDENTITY SECTION -->
    <section class="form-section">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.identity }"
        @click="toggleSection('identity')"
      >
        <span class="section-chevron">{{ expandedSections.identity ? '▼' : '▶' }}</span>
        <span class="section-title">Identity</span>
        <span v-if="identityComplete" class="section-check">✓</span>
      </button>

      <div v-show="expandedSections.identity" class="section-content">
        <div class="form-group">
          <label class="form-label">Name <span class="text-danger">*</span></label>
          <input
            v-model="model.name"
            type="text"
            class="input"
            :class="{ 'input-valid': model.name?.trim() }"
            placeholder="Spike Launcher, Memory Crystals..."
          />
        </div>

        <div class="form-row triple">
          <div class="form-group">
            <label class="form-label">Level</label>
            <input v-model.number="model.level" type="number" class="input" min="-1" max="24" />
          </div>
          <div class="form-group">
            <label class="form-label">Complexity</label>
            <select v-model="model.complexity" class="input select">
              <option v-for="c in complexityOptions" :key="c" :value="c">
                {{ c.charAt(0).toUpperCase() + c.slice(1) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select v-model="model.type" class="input select">
              <option v-for="t in typeOptions" :key="t" :value="t">
                {{ t.charAt(0).toUpperCase() + t.slice(1) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Trap Subtypes -->
        <div v-if="model.type === 'trap'" class="form-group">
          <label class="form-label">Trap Subtypes</label>
          <div class="chip-group">
            <button
              v-for="st in trapSubtypeOptions"
              :key="st"
              type="button"
              class="chip"
              :class="{ active: model.trapSubtypes?.includes(st) }"
              @click="toggleTrapSubtype(st)"
            >
              {{ st }}
            </button>
          </div>
        </div>

        <!-- Main Challenge -->
        <div class="form-group">
          <label class="form-label">Main Challenge</label>
          <div class="chip-group">
            <button
              v-for="mc in mainChallengeOptions"
              :key="mc.value"
              type="button"
              class="chip"
              :class="{ active: model.mainChallenge === mc.value }"
              @click="model.mainChallenge = mc.value"
              :title="mc.hint"
            >
              {{ mc.label }}
            </button>
          </div>
        </div>

        <!-- Road Map & Apply Defaults -->
        <div class="form-group">
          <label class="form-label">Road Map</label>
          <div class="defaults-row">
            <select v-model="selectedRoadMap" class="input select flex-1">
              <option v-for="r in roadMapOptions" :key="r.value" :value="r.value">
                {{ r.label }} - {{ r.desc }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              @click="applyDefaults"
              title="Apply level-appropriate stats"
            >
              Apply
            </button>
          </div>
          <Transition name="fade">
            <div v-if="showDefaultsApplied" class="defaults-applied">
              ✓ {{ selectedRoadMap }} defaults applied for level {{ model.level }}
            </div>
          </Transition>
        </div>

        <div class="form-group">
          <label class="form-label">Traits</label>
          <HazardTraitPicker v-model="model.traits" />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
            v-model="model.description"
            class="input textarea"
            placeholder="What does this hazard look like?"
            rows="2"
          ></textarea>
        </div>
      </div>
    </section>

    <!-- DETECTION & DISABLE SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.detection }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.detection }"
        :disabled="!sectionsUnlocked.detection"
        @click="toggleSection('detection')"
      >
        <span class="section-chevron">{{ expandedSections.detection ? '▼' : '▶' }}</span>
        <span class="section-title">Detection & Disable</span>
        <span v-if="!sectionsUnlocked.detection" class="section-lock">🔒</span>
        <span v-else-if="model.isObvious || model.stealthDC" class="section-check">✓</span>
      </button>

      <div v-show="expandedSections.detection && sectionsUnlocked.detection" class="section-content">
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="model.isObvious" />
            <span>Hazard is obvious (no Stealth DC)</span>
          </label>
        </div>

        <template v-if="!model.isObvious">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Stealth DC</label>
              <input v-model.number="model.stealthDC" type="number" class="input" />
              <div class="form-hint">
                Suggested: E={{ defaults.stealthDC.extreme }}, H={{ defaults.stealthDC.high }}, L={{ defaults.stealthDC.low }}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Min Proficiency</label>
              <select v-model="model.stealthProficiency" class="input select">
                <option value="">None</option>
                <option v-for="p in proficiencyOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
        </template>

        <div class="form-group">
          <label class="form-label">Disable</label>
          <textarea
            v-model="model.disable"
            class="input textarea"
            placeholder="Thievery DC 20 (trained) to disable the trigger..."
            rows="2"
          ></textarea>
        </div>
      </div>
    </section>

    <!-- DEFENSES SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.defenses }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.defenses }"
        :disabled="!sectionsUnlocked.defenses"
        @click="toggleSection('defenses')"
      >
        <span class="section-chevron">{{ expandedSections.defenses ? '▼' : '▶' }}</span>
        <span class="section-title">Defenses</span>
        <span v-if="!sectionsUnlocked.defenses" class="section-lock">🔒</span>
      </button>

      <div v-show="expandedSections.defenses && sectionsUnlocked.defenses" class="section-content">
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="model.hasPhysicalComponent" />
            <span>Has physical component (AC, HP, Hardness)</span>
          </label>
        </div>

        <template v-if="model.hasPhysicalComponent">
          <div class="form-row triple">
            <div class="form-group">
              <label class="form-label">AC</label>
              <input v-model.number="model.ac" type="number" class="input" />
            </div>
            <div class="form-group">
              <label class="form-label">Hardness</label>
              <input v-model.number="model.hardness" type="number" class="input" />
            </div>
            <div class="form-group">
              <label class="form-label">HP</label>
              <input v-model.number="model.hp" type="number" class="input" />
            </div>
          </div>

          <div class="form-row triple">
            <div class="form-group">
              <label class="form-label">BT</label>
              <input
                v-model.number="model.bt"
                type="number"
                class="input"
                :placeholder="`${Math.floor((model.hp || 0) / 2)}`"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Fort</label>
              <input v-model.number="model.saves!.fortitude" type="number" class="input" />
            </div>
            <div class="form-group">
              <label class="form-label">Ref</label>
              <input v-model.number="model.saves!.reflex" type="number" class="input" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Immunities</label>
            <ImmunityPicker v-model="model.immunities" />
          </div>
        </template>
      </div>
    </section>

    <!-- OFFENSE SECTION -->
    <section class="form-section" :class="{ 'section-locked': !sectionsUnlocked.offense }">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.offense }"
        :disabled="!sectionsUnlocked.offense"
        @click="toggleSection('offense')"
      >
        <span class="section-chevron">{{ expandedSections.offense ? '▼' : '▶' }}</span>
        <span class="section-title">Offense</span>
        <span v-if="!sectionsUnlocked.offense" class="section-lock">🔒</span>
      </button>

      <div v-show="expandedSections.offense && sectionsUnlocked.offense" class="section-content">
        <!-- Suggested hint -->
        <div class="suggested-hint">
          <span class="hint-label">Suggested ({{ model.complexity }}):</span>
          <span class="hint-value">+{{ model.complexity === 'complex' ? defaults.attack.complex : defaults.attack.simple }}</span> attack,
          <span class="hint-value">{{ model.complexity === 'complex' ? defaults.damage.complex : defaults.damage.simple }}</span> damage
        </div>

        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="model.usesAttackRoll" />
            <span>Uses attack roll (vs. save DC)</span>
          </label>
        </div>

        <div class="form-row">
          <div v-if="model.usesAttackRoll" class="form-group">
            <label class="form-label">Attack Bonus</label>
            <input v-model.number="model.attackBonus" type="number" class="input" />
          </div>
          <div v-else class="form-group">
            <label class="form-label">Save DC</label>
            <input v-model.number="model.saveDC" type="number" class="input" />
          </div>
          <div v-if="!model.usesAttackRoll" class="form-group">
            <label class="form-label">Save Type</label>
            <select v-model="model.saveType" class="input select">
              <option value="fortitude">Fortitude</option>
              <option value="reflex">Reflex</option>
              <option value="will">Will</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Damage</label>
            <input v-model="model.damage" type="text" class="input" placeholder="2d6+5" />
            <div v-if="damageAverage" class="form-hint">Average: {{ damageAverage }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <input v-model="model.damageType" type="text" class="input" placeholder="piercing, fire..." />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Targeting</label>
          <div class="chip-group">
            <button
              v-for="t in targetingOptions"
              :key="t.value"
              type="button"
              class="chip"
              :class="{ active: model.targetingModel === t.value }"
              @click="model.targetingModel = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- DETAILS SECTION (Always Available) -->
    <section class="form-section">
      <button
        class="section-header"
        :class="{ 'section-expanded': expandedSections.details }"
        @click="toggleSection('details')"
      >
        <span class="section-chevron">{{ expandedSections.details ? '▼' : '▶' }}</span>
        <span class="section-title">{{ model.complexity === 'simple' ? 'Trigger & Effect' : 'Routine & Actions' }}</span>
        <span v-if="model.actions?.length" class="section-count">{{ model.actions.length }}</span>
      </button>

      <div v-show="expandedSections.details" class="section-content">
        <!-- Simple Hazard -->
        <template v-if="model.complexity === 'simple'">
          <div class="form-group">
            <label class="form-label">Trigger</label>
            <textarea
              v-model="model.trigger"
              class="input textarea"
              placeholder="A creature enters the marked square..."
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Effect</label>
            <textarea
              v-model="model.effect"
              class="input textarea"
              placeholder="The hazard attacks the triggering creature..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Reset</label>
            <input v-model="model.reset" type="text" class="input" placeholder="1 minute, or none" />
          </div>
        </template>

        <!-- Complex Hazard -->
        <template v-else>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Actions/Round</label>
              <input v-model.number="model.actionsPerRound" type="number" class="input" min="1" max="3" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Routine</label>
            <textarea
              v-model="model.routine"
              class="input textarea"
              placeholder="Each round, the hazard..."
              rows="3"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label">Actions</label>
              <button type="button" class="btn btn-secondary btn-xs" @click="showActionEditor = true">
                + Add
              </button>
            </div>

            <div v-if="model.actions?.length" class="action-list">
              <div v-for="(action, idx) in model.actions" :key="idx" class="action-item">
                <div class="action-info">
                  <span class="action-name">{{ action.name }}</span>
                  <span v-if="action.damage" class="action-damage text-dim">({{ action.damage }})</span>
                </div>
                <button type="button" class="btn-icon btn-xs text-danger" @click="removeAction(idx)">×</button>
              </div>
            </div>

            <!-- Action Editor -->
            <div v-if="showActionEditor" class="editor-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label-sm">Name</label>
                  <input v-model="editingAction.name" class="input input-sm" />
                </div>
                <div class="form-group">
                  <label class="form-label-sm">Type</label>
                  <select v-model="editingAction.actionType" class="input input-sm select">
                    <option value="reaction">Reaction</option>
                    <option value="free">Free</option>
                    <option :value="1">1 Action</option>
                    <option :value="2">2 Actions</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label-sm">Trigger</label>
                <input v-model="editingAction.trigger" class="input input-sm" />
              </div>
              <div class="form-group">
                <label class="form-label-sm">Effect</label>
                <textarea v-model="editingAction.effect" class="input input-sm textarea" rows="2"></textarea>
              </div>
              <div class="form-row triple">
                <div class="form-group">
                  <label class="form-label-sm">Damage</label>
                  <input v-model="editingAction.damage" class="input input-sm" />
                </div>
                <div class="form-group">
                  <label class="form-label-sm">Type</label>
                  <input v-model="editingAction.damageType" class="input input-sm" />
                </div>
                <div class="form-group">
                  <label class="form-label-sm">DC</label>
                  <input v-model.number="editingAction.dc" type="number" class="input input-sm" />
                </div>
              </div>
              <div class="editor-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="showActionEditor = false">Cancel</button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="!editingAction.name?.trim() || !editingAction.effect?.trim()"
                  @click="addAction"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Trait Hints -->
    <Transition name="fade">
      <div v-if="traitHints.length" class="trait-hints">
        <div class="hints-header">Rule Notes</div>
        <ul class="hints-list">
          <li v-for="(hint, idx) in traitHints" :key="idx">{{ hint }}</li>
        </ul>
      </div>
    </Transition>

    <!-- Action Bar -->
    <div class="action-bar">
      <button type="button" class="btn btn-ghost" @click="showPreview = true">
        Preview
      </button>
      <button type="button" class="btn btn-primary" @click="emit('complete')">
        Add to Hazards
      </button>
    </div>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreview" class="preview-overlay" @click="showPreview = false">
        <div class="preview-panel" @click.stop>
          <div class="preview-header">
            <span class="preview-title">Stat Block Preview</span>
            <div class="preview-actions">
              <button type="button" class="btn btn-secondary btn-sm" @click="copyMarkdown">
                {{ copyStatus === 'copied' ? 'Copied!' : 'Copy MD' }}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" @click="copyJSON">
                Copy JSON
              </button>
              <button type="button" class="btn-close" @click="showPreview = false">×</button>
            </div>
          </div>

          <div class="preview-tabs">
            <button
              type="button"
              class="preview-tab"
              :class="{ active: previewTab === 'rendered' }"
              @click="previewTab = 'rendered'"
            >
              Rendered
            </button>
            <button
              type="button"
              class="preview-tab"
              :class="{ active: previewTab === 'markdown' }"
              @click="previewTab = 'markdown'"
            >
              Markdown
            </button>
          </div>

          <div class="preview-content">
            <div v-if="previewTab === 'rendered'" class="stat-block" v-html="markdownToHtml(markdownPreview)"></div>
            <pre v-else class="markdown-raw">{{ markdownPreview }}</pre>
          </div>

          <div class="preview-footer">
            <span v-if="model.stealthDC" class="derived-item">Stealth Mod: +{{ model.stealthDC - 10 }}</span>
            <span v-if="model.hp" class="derived-item">BT: {{ Math.floor(model.hp / 2) }}</span>
            <span v-if="damageAverage" class="derived-item">Avg Dmg: {{ damageAverage }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.hazard-form {
  font-size: var(--text-sm);
}

.form-section {
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.form-section.section-locked {
  opacity: 0.5;
}

.form-section.section-locked .section-header {
  cursor: not-allowed;
}

.section-header {
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

.section-header:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.section-header.section-expanded {
  border-bottom: 1px solid var(--color-border);
}

.section-chevron {
  font-size: 0.625rem;
  color: var(--color-secondary);
  transition: transform 0.15s ease;
}

.section-title {
  flex: 1;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
}

.section-lock {
  font-size: 0.75rem;
  opacity: 0.5;
}

.section-check {
  color: var(--color-success);
  font-weight: bold;
}

.section-count {
  background: var(--color-secondary);
  color: var(--color-bg);
  font-size: 0.625rem;
  font-weight: bold;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.section-content {
  padding: 1rem;
  background: var(--color-bg-surface);
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.form-label-sm {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-dim);
  margin-bottom: 0.125rem;
}

.form-hint {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-row.triple {
  grid-template-columns: 1fr 1fr 1fr;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  cursor: pointer;
}

.toggle-label input {
  accent-color: var(--color-secondary);
}

/* Chips */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.chip {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-dim);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--color-secondary);
  color: var(--color-text);
}

.chip.active {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
  color: var(--color-bg);
}

/* Defaults */
.defaults-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.defaults-applied {
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-success);
}

/* Suggested hint */
.suggested-hint {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
}

.hint-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 0.25rem;
}

.hint-value {
  color: var(--color-secondary);
  font-weight: 600;
  font-family: monospace;
}

/* Actions */
.action-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
}

.action-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-name {
  font-weight: 600;
}

.action-damage {
  font-size: 0.75rem;
}

/* Editor */
.editor-form {
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-secondary);
  border-radius: 0.25rem;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

/* Trait hints */
.trait-hints {
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-secondary);
  border-left-width: 3px;
  border-radius: 0.25rem;
}

.hints-header {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-secondary);
  margin-bottom: 0.5rem;
}

.hints-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.hints-list li {
  margin-bottom: 0.25rem;
}

/* Action bar */
.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
}

.btn-ghost:hover {
  border-color: var(--color-secondary);
  color: var(--color-secondary);
}

/* Input styles */
.input-valid {
  border-color: var(--color-success);
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;
}

.textarea {
  resize: vertical;
  min-height: 2.5rem;
}

/* Hide spinners */
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Preview Modal */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-panel {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.preview-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-secondary);
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.preview-tab {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.preview-tab.active {
  color: var(--color-secondary);
  border-bottom-color: var(--color-secondary);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.stat-block {
  line-height: 1.5;
}

.stat-block :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.stat-block :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.75rem 0;
}

.stat-block :deep(strong) {
  color: var(--color-text);
}

.stat-block :deep(em) {
  color: var(--color-secondary);
}

.markdown-raw {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  background: var(--color-bg);
  padding: 1rem;
  border-radius: 0.25rem;
  white-space: pre-wrap;
  margin: 0;
}

.preview-footer {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  font-size: 0.75rem;
}

.derived-item {
  color: var(--color-text-dim);
}

.btn-close {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
}

.btn-close:hover {
  color: var(--color-text);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
