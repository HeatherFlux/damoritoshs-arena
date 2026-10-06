import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { formatSpellcasting, formatSpellList } from '../utils/creatureSpellcasting'
import StatBlockPreview from '../components/custom/StatBlockPreview.vue'
import CreatureCard from '../components/CreatureCard.vue'
import SpellsEditor from '../components/custom/SpellsEditor.vue'
import { useEncounterStore } from '../stores/encounterStore'
import { useCombatStore } from '../stores/combatStore'
import { usePartyStore } from '../stores/partyStore'
import { useHackingStore } from '../stores/hackingStore'
import { useStarshipStore } from '../stores/starshipStore'
import { useShopStore } from '../stores/shopStore'
import { buildSessionBundle, serializeBundle } from '../utils/sessionBundleExporter'
import { parseSessionBundle, importSessionBundle } from '../utils/sessionBundleImporter'
import { makeCreature } from './fixtures'
import type { SpellcastingConfig } from '../types/creature'

const divine: SpellcastingConfig = {
  enabled: true,
  tradition: 'divine',
  type: 'prepared',
  dc: 25,
  attackMod: 17,
  focusPoints: 1,
  slots: { 1: 3, 3: 2, 4: 3 },
  notes: 'heal, bless, sanctuary',
}

describe('formatSpellcasting', () => {
  it('reads like a printed statblock: highest rank first, then focus points', () => {
    expect(formatSpellcasting(divine)).toEqual({
      label: 'Divine Prepared Spells',
      details: 'DC 25, attack +17; 4th (3 slots); 3rd (2 slots); 1st (3 slots); 1 Focus Point',
      notes: 'heal, bless, sanctuary',
    })
  })

  it('is empty when spellcasting is off or missing', () => {
    expect(formatSpellcasting({ ...divine, enabled: false })).toBeNull()
    expect(formatSpellcasting(undefined)).toBeNull()
  })

  it('leaves out anything not filled in', () => {
    expect(formatSpellcasting({ enabled: true, tradition: '', type: '', dc: 0, attackMod: 0, focusPoints: 0, slots: {}, notes: '' }))
      .toEqual({ label: 'Spells', details: '', notes: '' })
    expect(formatSpellcasting({ ...divine, type: 'innate', slots: {}, focusPoints: 3, notes: '' }))
      .toEqual({ label: 'Divine Innate Spells', details: 'DC 25, attack +17; 3 Focus Points', notes: '' })
  })

  it('handles slot ranks that came back from JSON as strings, and 1 slot', () => {
    const fromJson = JSON.parse(JSON.stringify({ ...divine, slots: { 2: 1, 10: 1 }, focusPoints: 0 }))
    expect(formatSpellcasting(fromJson)?.details).toBe('DC 25, attack +17; 10th (1 slot); 2nd (1 slot)')
  })
})

describe('formatSpellList', () => {
  it('lists spells by rank, highest first, with cantrips last and the DC from the entries', () => {
    expect(formatSpellList([
      { level: 0, spells: ['detect magic', 'light'] },
      { level: 1, spells: ['bless'], dc: 22, attack: 14 },
      { level: 3, spells: ['heal', 'sanctuary'] },
    ])).toBe('DC 22, attack +14; 3rd heal, sanctuary; 1st bless; Cantrips detect magic, light')
  })

  it('is empty when there are no spells', () => {
    expect(formatSpellList(undefined)).toBeNull()
    expect(formatSpellList([])).toBeNull()
    expect(formatSpellList([{ level: 1, spells: [] }])).toBeNull()
  })
})

describe('spellcasting on the statblocks', () => {
  it('shows an imported spell list on the creature card and the preview', () => {
    const spells = [{ level: 2, spells: ['invisibility'], dc: 18 }]
    expect(mount(CreatureCard, { props: { creature: makeCreature({ spells }) } }).text()).toContain('Spells DC 18; 2nd invisibility')
    expect(mount(StatBlockPreview, { props: { creature: { name: 'Sneak', spells } } }).text()).toContain('DC 18; 2nd invisibility')
  })

  it('shows on the custom creature preview', () => {
    const wrapper = mount(StatBlockPreview, { props: { creature: { name: 'Choir Angel', spellcasting: divine } } })
    expect(wrapper.text()).toContain('Divine Prepared Spells')
    expect(wrapper.text()).toContain('DC 25, attack +17; 4th (3 slots)')
    expect(wrapper.text()).toContain('heal, bless, sanctuary')
  })

  it('is absent from the preview when spellcasting is off', () => {
    const wrapper = mount(StatBlockPreview, { props: { creature: { name: 'Choir Angel', spellcasting: { ...divine, enabled: false } } } })
    expect(wrapper.text()).not.toContain('Spells')
  })

  it('shows on the creature card used by encounters and combat', () => {
    const wrapper = mount(CreatureCard, { props: { creature: makeCreature({ spellcasting: divine }) } })
    expect(wrapper.text()).toContain('Divine Prepared Spells')
    expect(wrapper.text()).toContain('DC 25, attack +17; 4th (3 slots)')
    expect(wrapper.text()).toContain('heal, bless, sanctuary')
  })
})

// ---------------------------------------------------------------------------
// Spellcasting has to survive every place a custom creature travels.
// ---------------------------------------------------------------------------

describe('formatSpellcasting rank names', () => {
  it('uses th for 11th to 13th and st/nd/rd after that', () => {
    const details = formatSpellcasting({ ...divine, dc: 0, attackMod: 0, focusPoints: 0, slots: { 11: 1, 12: 1, 13: 1, 21: 1, 22: 1, 23: 1 } })!.details
    expect(details).toBe('23rd (1 slot); 22nd (1 slot); 21st (1 slot); 13th (1 slot); 12th (1 slot); 11th (1 slot)')
  })

  it('skips ranks set to zero slots', () => {
    expect(formatSpellcasting({ ...divine, slots: { 2: 0, 1: 2 }, focusPoints: 0 })!.details).toBe('DC 25, attack +17; 1st (2 slots)')
  })
})

describe('SpellsEditor', () => {
  it('turns spellcasting on from the checkbox and hands the change back to the form', async () => {
    const wrapper = mount(SpellsEditor, { props: { creatureLevel: 1 }, attachTo: document.body })
    await wrapper.find('.spells-summary input[type="checkbox"]').trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted.at(-1)![0]).toMatchObject({ enabled: true })
    wrapper.unmount()
  })

  it('applies the primary caster preset for the creature level', async () => {
    const wrapper = mount(SpellsEditor, {
      props: { creatureLevel: 5, modelValue: { ...divine, slots: {}, dc: 0, attackMod: 0 } },
      attachTo: document.body,
    })
    await wrapper.find('.spells-summary').trigger('click')
    await nextTick()
    const preset = [...document.querySelectorAll('.spells-popover button')].find(b => /Primary/.test(b.textContent ?? '')) as HTMLButtonElement
    preset.click()
    await nextTick()
    const latest = wrapper.emitted('update:modelValue')!.at(-1)![0] as SpellcastingConfig
    // Level 5: highest rank 3 with 2 slots, ranks 2 and 1 with 3 each, high DC 22 / attack +14.
    expect(latest.slots).toEqual({ 3: 2, 2: 3, 1: 3 })
    expect(latest.dc).toBe(22)
    expect(latest.attackMod).toBe(14)
    wrapper.unmount()
  })
})

describe('custom creature spellcasting is kept', () => {
  let encounterStore: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    encounterStore = useEncounterStore()
    encounterStore.clearCustomCreatures()
  })

  it('when the creature is edited and saved again', () => {
    const creature = makeCreature({ id: 'custom-caster', spellcasting: divine })
    encounterStore.addCustomCreature(creature)
    encounterStore.updateCustomCreature('custom-caster', { ...creature, spellcasting: { ...divine, dc: 30 } })
    expect(encounterStore.state.creatures.find(c => c.id === 'custom-caster')?.spellcasting?.dc).toBe(30)
  })

  it('in local storage, so it is still there after a reload', async () => {
    encounterStore.addCustomCreature(makeCreature({ id: 'custom-caster', spellcasting: divine }))
    vi.resetModules()
    const { useEncounterStore: freshStore } = await import('../stores/encounterStore')
    expect(freshStore().state.creatures.find(c => c.id === 'custom-caster')?.spellcasting).toEqual(divine)
  })

  it('through custom creature export and import', () => {
    encounterStore.addCustomCreature(makeCreature({ id: 'custom-caster', spellcasting: divine, spells: [{ level: 1, spells: ['bless'] }] }))
    const exported = encounterStore.exportCustomCreatures()
    encounterStore.clearCustomCreatures()
    encounterStore.importCustomCreatures(exported)
    const back = encounterStore.state.creatures.find(c => c.id === 'custom-caster')
    expect(back?.spellcasting).toEqual(divine)
    expect(back?.spells).toEqual([{ level: 1, spells: ['bless'] }])
  })

  it('through a YAML session bundle', () => {
    encounterStore.addCustomCreature(makeCreature({ id: 'custom-caster', name: 'Choir Angel', spellcasting: divine }))
    const stores = {
      encounterStore,
      partyStore: usePartyStore(),
      hackingStore: useHackingStore(),
      starshipStore: useStarshipStore(),
      shopStore: useShopStore(),
    }
    const { content } = serializeBundle(buildSessionBundle(stores, { name: 'Casters' }), 'yaml')
    encounterStore.clearCustomCreatures()
    importSessionBundle(parseSessionBundle(content), stores)
    const back = encounterStore.state.creatures.find(c => c.name === 'Choir Angel')
    expect(back?.spellcasting).toEqual(divine)
    // And it renders after the trip.
    expect(mount(CreatureCard, { props: { creature: back! } }).text()).toContain('Divine Prepared Spells')
  })

  it('when the creature is added to combat', () => {
    const combatStore = useCombatStore()
    combatStore.endCombat()
    const combatant = combatStore.addCreature(makeCreature({ name: 'Choir Angel', spellcasting: divine }))
    expect(combatant.creature?.spellcasting).toEqual(divine)
    combatStore.endCombat()
  })
})
