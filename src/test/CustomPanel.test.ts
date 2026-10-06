import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CustomPanel from '../components/custom/CustomPanel.vue'
import { useCustomPanelStore } from '../stores/customPanelStore'
import type { Creature } from '../types/creature'
import { useEncounterStore } from '../stores/encounterStore'

function makeCreature(): Creature {
  return {
    id: 'test-creature-1',
    name: 'Space Goblin',
    level: 1,
    traits: ['Goblin', 'Humanoid'],
    size: 'small',
    source: 'Custom',
    perception: 4,
    senses: ['darkvision'],
    languages: ['Common'],
    skills: { stealth: 7 },
    abilities: { str: 0, dex: 3, con: 1, int: 0, wis: 0, cha: 1 },
    ac: 16,
    saves: { fort: 4, ref: 7, will: 3 },
    hp: 18,
    immunities: [],
    resistances: [],
    weaknesses: [],
    speed: '25 feet',
    attacks: [],
    specialAbilities: [],
  }
}

describe('CustomPanel', () => {
  let customPanelStore: ReturnType<typeof useCustomPanelStore>

  beforeEach(() => {
    customPanelStore = useCustomPanelStore()
    customPanelStore.clearEditing()
  })

  it('mounts without errors', () => {
    const wrapper = mount(CustomPanel)
    expect(wrapper.exists()).toBe(true)
  })

  it('shows "Add to Creatures" button by default', () => {
    const wrapper = mount(CustomPanel)
    const buttons = wrapper.findAll('button')
    const addBtn = buttons.find(b => b.text().includes('Add to Creatures'))
    expect(addBtn).toBeTruthy()
  })

  it('shows "Save Changes" when editing a creature', async () => {
    const creature = makeCreature()
    customPanelStore.startEditing(creature, false)

    await nextTick()
    const wrapper = mount(CustomPanel)
    await nextTick()

    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find(b => b.text().includes('Save Changes'))
    expect(saveBtn).toBeTruthy()
  })

  it('pre-populates form when pendingCreatureData is set', async () => {
    const creature = makeCreature()
    customPanelStore.startEditing(creature, true, ' (Copy)')

    await nextTick()
    const wrapper = mount(CustomPanel)
    await nextTick()

    // The name input should contain the creature name with suffix
    const nameInput = wrapper.find('input[type="text"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('Space Goblin (Copy)')
  })

  it('resets editing state on discard', async () => {
    const creature = makeCreature()
    customPanelStore.startEditing(creature, false)

    await nextTick()
    const wrapper = mount(CustomPanel)
    await nextTick()

    // Click discard button (✕)
    const discardBtn = wrapper.findAll('button').find(b => b.text().trim() === '✕')
    expect(discardBtn).toBeTruthy()
    await discardBtn!.trigger('click')
    await nextTick()

    expect(customPanelStore.state.editingCreatureId).toBeNull()
    expect(customPanelStore.state.pendingCreatureData).toBeNull()
  })

  it('keeps spellcasting when the creature is saved', async () => {
    const spellcasting = { enabled: true, tradition: 'arcane' as const, type: 'spontaneous' as const, dc: 20, attackMod: 12, focusPoints: 0, slots: { 2: 3, 1: 3 }, notes: 'fireball' }
    // Loaded as a copy, so saving adds it as a new custom creature.
    customPanelStore.startEditing({ ...makeCreature(), name: 'Hex Witch', spellcasting }, true, '')
    await nextTick()
    const wrapper = mount(CustomPanel)
    await nextTick()

    await wrapper.findAll('button').find(b => b.text().includes('Add to Creatures'))!.trigger('click')

    const saved = useEncounterStore().state.creatures.find(c => c.name === 'Hex Witch')
    expect(saved?.spellcasting).toEqual(spellcasting)
  })
})
