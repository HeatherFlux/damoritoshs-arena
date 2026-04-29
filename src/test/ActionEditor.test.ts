import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ActionEditor from '../components/starship/ActionEditor.vue'
import type { StarshipAction } from '../types/starship'

function makeAction(overrides: Partial<StarshipAction> = {}): StarshipAction {
  return {
    id: 'a1',
    name: 'Test Action',
    actionCost: 2,
    role: 'any',
    skills: [],
    description: '',
    outcomes: { criticalSuccess: '', success: '' },
    ...overrides,
  }
}

describe('ActionEditor', () => {
  // Regression: editing any text field used to lock up Firefox because the
  // component watched props.action with { deep: true } AND the parent
  // (StarshipPanel.updateAction) reassigned starshipActions[index] on every
  // emit. Each round-trip cloned nested arrays/objects, so deep equality
  // never settled and the watcher pair ping-ponged forever.
  it('does not infinite-loop when the parent reassigns the action prop on every update', async () => {
    const wrapper = mount(ActionEditor, {
      props: { action: makeAction(), availableRoles: ['captain', 'pilot'] },
    })

    // Simulate the parent's round-trip: every emitted update is cloned and
    // fed back as the action prop. Bound the simulation so a runaway loop
    // does not hang the test runner.
    const MAX_TRIPS = 25
    let trips = 0
    let processed = 0
    const drain = async () => {
      while (trips < MAX_TRIPS) {
        const events = wrapper.emitted('update')
        if (!events || events.length <= processed) break
        const next = events[processed][0] as StarshipAction
        processed++
        trips++
        await wrapper.setProps({
          action: JSON.parse(JSON.stringify(next)),
        })
        await nextTick()
      }
    }

    const nameInput = wrapper.find('input[placeholder="Action name"]')
    await nameInput.setValue('Renamed')
    await drain()

    expect(trips).toBeLessThan(MAX_TRIPS)
  })

  it('keeps local edits while the parent re-passes the same action id', async () => {
    const wrapper = mount(ActionEditor, {
      props: { action: makeAction({ id: 'a1', name: 'Original' }), availableRoles: [] },
    })

    const nameInput = wrapper.find('input[placeholder="Action name"]')
    await nameInput.setValue('Edited')

    // Parent re-passes a different object with the same id (typical round-trip).
    // Local edits should not get clobbered.
    await wrapper.setProps({ action: makeAction({ id: 'a1', name: 'Original' }) })
    await nextTick()

    expect((nameInput.element as HTMLInputElement).value).toBe('Edited')
  })

  it('re-initialises edit state when a different action (new id) is passed', async () => {
    const wrapper = mount(ActionEditor, {
      props: { action: makeAction({ id: 'a1', name: 'First' }), availableRoles: [] },
    })

    const nameInput = wrapper.find('input[placeholder="Action name"]')
    await nameInput.setValue('Edited')

    await wrapper.setProps({ action: makeAction({ id: 'a2', name: 'Second' }) })
    await nextTick()

    expect((nameInput.element as HTMLInputElement).value).toBe('Second')
  })
})
