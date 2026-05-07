import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Stub location before importing the store (it has init side effects).
vi.stubGlobal('location', { ...window.location, hash: '' })

import StarshipPanel from '../components/starship/StarshipPanel.vue'
import { useStarshipStore } from '../stores/starshipStore'
import { createEmptySavedScene } from '../types/starship'
import type { StarshipThreat } from '../types/starship'

/**
 * Render-level guard that the user-facing GM screen actually shows the
 * stuff a GM needs to see at-a-glance during play. This is the test that
 * would have caught the dead-code SceneRunner bug — for hours, polish
 * was being added to a component that StarshipPanel never imported, so
 * the GM screen showed a stripped-down inline runner with none of it.
 *
 * The rule encoded here: "the data is in the store" is NOT coverage. A
 * UI feature must assert what's visible in the rendered DOM.
 */

function makeThreat(overrides: Partial<StarshipThreat> = {}): StarshipThreat {
  return {
    id: 't1',
    name: 'Amaranth (Corpse Fleet Cruiser)',
    type: 'enemy_ship',
    level: 2,
    maxHP: 50, currentHP: 50,
    maxShields: 5, currentShields: 5, shieldRegen: 5,
    ac: 18, fortitude: 12, reflex: 6,
    initiativeSkill: 'Arcana', initiativeBonus: 14,
    routine: {
      actionsPerTurn: 2,
      description: 'Scans then fires.',
      actions: [
        { id: 'r1', name: 'Antimatter Beam', actionCost: 2, type: 'attack', description: '', attackBonus: 11, damage: '2d10+5', damageType: 'fire' },
      ],
    },
    immunities: ['mental'],
    weaknesses: { sonic: 5 },
    isDefeated: false,
    routineActionsUsed: [],
    ...overrides,
  }
}

describe('GM-seat smoke test: StarshipPanel renders the running scene', () => {
  let store: ReturnType<typeof useStarshipStore>

  beforeEach(() => {
    store = useStarshipStore()
    store.endScene()
  })

  it('renders the runner instead of the setup view when a scene is active', () => {
    const saved = createEmptySavedScene()
    saved.name = 'Test Scene'
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // The setup view's "Load a Scene" header should NOT be in the DOM
    // when a scene is running — if it is, we're still in setup mode and
    // the runner isn't being delegated to.
    expect(wrapper.text()).not.toContain('Load a Scene')
    // The Round indicator from the runner SHOULD be there.
    expect(wrapper.text()).toContain('Round')
  })

  it('shows ship skill bonuses ("Piloting +2") at-a-glance', () => {
    const saved = createEmptySavedScene()
    saved.starship.bonuses = { Piloting: 2, Computers: 1 }
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // The at-a-glance failure mode this test guards against: the bonuses
    // are in the store but never get a chip on the rendered ship card.
    expect(wrapper.text()).toContain('Piloting +2')
    expect(wrapper.text()).toContain('Computers +1')
  })

  it('shows available crew roles as pills', () => {
    const saved = createEmptySavedScene()
    saved.availableRoles = ['captain', 'pilot', 'gunner']
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    expect(wrapper.text()).toContain('Captain')
    expect(wrapper.text()).toContain('Pilot')
    expect(wrapper.text()).toContain('Gunner')
  })

  it('shows threat attacks with bonus and damage in the rendered DOM', () => {
    const saved = createEmptySavedScene()
    saved.threats = [makeThreat()]
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // The big bug from playtest: threat attacks were buried behind a
    // "Show Routine" toggle. The promoted attack row must be visible
    // without any clicks.
    expect(wrapper.text()).toContain('Antimatter Beam')
    expect(wrapper.text()).toContain('+11')
    expect(wrapper.text()).toContain('2d10+5')
  })

  it('shows threat defenses (Fort, Ref, Init)', () => {
    const saved = createEmptySavedScene()
    saved.threats = [makeThreat()]
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    expect(wrapper.text()).toContain('Fort')
    expect(wrapper.text()).toContain('+12')
    expect(wrapper.text()).toContain('Ref')
    expect(wrapper.text()).toContain('+6')
    expect(wrapper.text()).toContain('Arcana')
    expect(wrapper.text()).toContain('+14')
  })

  it('shows immunities/weaknesses badges on the threat card', () => {
    const saved = createEmptySavedScene()
    saved.threats = [makeThreat()]
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    expect(wrapper.text()).toContain('mental')
    expect(wrapper.text()).toContain('sonic')
  })

  it('does NOT show the bare-bones inline runner', () => {
    // After the combat-tab hp-bar refactor, the SceneRunner now uses
    // the global `.hp-bar` / `.hp-controls` classes from style.css with
    // overlaid numbers ("80/80 Hull") instead of the older "Hull
    // Points" label + separate stat-bar pair. The regression check is
    // now: the polished runner is wired up (uses the global hp-bar
    // pattern) AND the old inline runner's "Apply Damage" label is
    // NOT present.
    const saved = createEmptySavedScene()
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // Combat-tab hp-bar is rendered:
    expect(wrapper.find('.ship-stats-row').exists()).toBe(true)
    expect(wrapper.findAll('.hp-bar').length).toBeGreaterThan(0)
    // Old inline runner's word-button labels must not be back:
    expect(wrapper.text()).not.toContain('Apply Damage')
  })

  // Bug: skill_check routine actions had no UI to set the threat's skill
  // bonus. The threat schema already supported `skills: Record<string,
  // number>` and ThreatCard reads it for the quick-action chip — but
  // there was no editor exposing it, so GMs couldn't author it without
  // hand-editing JSON.
  it('shows a Skill Bonuses editor on the threat card in editing mode', () => {
    const saved = createEmptySavedScene()
    saved.threats = [makeThreat({ skills: { Piloting: 12 } })]
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // Click the Edit button to flip editMode on.
    const editBtn = wrapper.findAll('button').find(b => /^Edit$/.test(b.text()))
    expect(editBtn).toBeTruthy()
    editBtn!.trigger('click')

    return wrapper.vm.$nextTick().then(() => {
      // Editor + existing bonus must both appear.
      expect(wrapper.text()).toContain('Skill Bonuses')
      expect(wrapper.text()).toContain('Piloting')
      // The `skills` value on the threat is reachable via the rendered
      // input — confirms the editor is wired to the data.
      const inputs = wrapper.findAll('input.skill-bonus-input')
      expect(inputs.length).toBeGreaterThan(0)
      expect(Number((inputs[0].element as HTMLInputElement).value)).toBe(12)
    })
  })

  it('shows the existing skill bonus next to a skill_check action chip on the threat card', () => {
    // The point of having `threat.skills` is that skill_check routine
    // actions roll d20 + the listed bonus. The quick-action row on the
    // threat card surfaces that bonus inline so the GM can roll it
    // without digging into the routine editor.
    const saved = createEmptySavedScene()
    saved.threats = [makeThreat({
      skills: { Arcana: 14 },
      routine: {
        actionsPerTurn: 1,
        description: '',
        actions: [
          { id: 'scan', name: 'Disruptive Scan', actionCost: 1, type: 'skill_check', skill: 'Arcana', vsDefense: 'will', description: '' },
        ],
      },
    })]
    store.startScene(saved)

    const wrapper = mount(StarshipPanel)
    // The skill chip shows "+14 Arcana" — `skills.Arcana=14` flowing
    // through to the quick-action row.
    expect(wrapper.text()).toContain('Disruptive Scan')
    expect(wrapper.text()).toContain('+14 Arcana')
  })
})
