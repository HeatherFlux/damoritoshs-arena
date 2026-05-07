import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub location before importing the store (it has init side effects).
vi.stubGlobal('location', { ...window.location, hash: '' })

import { mount } from '@vue/test-utils'
import StarshipPlayerView from '../components/starship/StarshipPlayerView.vue'
import { useStarshipStore } from '../stores/starshipStore'
import { createEmptySavedScene } from '../types/starship'

/**
 * Player view damage/heal coverage.
 *
 * The user explicitly asked for combat-tab-style damage/heal controls on
 * the player view so the table can adjust their own ship HP without
 * waiting for the GM. These tests pin down:
 *  - The − / + buttons exist and aren't conditional on GM mode.
 *  - Clicking − reduces shields-then-HP via store.damageStarship.
 *  - Clicking + restores HP via store.healStarship.
 *  - Player view broadcasts are no-ops (state.isGMView=false), so local
 *    edits never echo back to the GM. That's the agreed contract.
 */

describe('StarshipPlayerView damage/heal controls', () => {
  let store: ReturnType<typeof useStarshipStore>

  beforeEach(() => {
    store = useStarshipStore()
    store.endScene()
    // Player view runs as non-GM. The component flips this on mount, but
    // we set it eagerly so any pre-mount broadcasts (e.g. from startScene)
    // don't write to localStorage on the player's behalf.
    store.state.isGMView = true
  })

  function startBasicScene() {
    const saved = createEmptySavedScene()
    saved.starship.maxHP = 80
    saved.starship.currentHP = 80
    saved.starship.maxShields = 20
    saved.starship.currentShields = 20
    store.startScene(saved)
  }

  it('renders − and + buttons in the ship section', () => {
    startBasicScene()
    const wrapper = mount(StarshipPlayerView)
    const damageBtn = wrapper.find('.hp-btn-damage')
    const healBtn = wrapper.find('.hp-btn-heal')
    expect(damageBtn.exists()).toBe(true)
    expect(healBtn.exists()).toBe(true)
  })

  it('clicking − applies damage shields-first via the store', async () => {
    startBasicScene()
    const wrapper = mount(StarshipPlayerView)
    await wrapper.find('input.hp-input').setValue(15)
    await wrapper.find('.hp-btn-damage').trigger('click')

    const ship = store.state.activeScene!.starship
    // 15 dmg vs 20 shields — shields go to 5, HP untouched.
    expect(ship.currentShields).toBe(5)
    expect(ship.currentHP).toBe(80)
  })

  it('clicking + heals HP via the store', async () => {
    startBasicScene()
    // Drop HP first so heal has somewhere to go.
    store.damageStarship(50) // 20 shields absorbed, 30 to HP -> 80-30=50
    expect(store.state.activeScene!.starship.currentHP).toBe(50)

    const wrapper = mount(StarshipPlayerView)
    await wrapper.find('input.hp-input').setValue(20)
    await wrapper.find('.hp-btn-heal').trigger('click')

    expect(store.state.activeScene!.starship.currentHP).toBe(70)
  })

  it('damage cascades shields-then-HP through the input flow', async () => {
    startBasicScene()
    const wrapper = mount(StarshipPlayerView)
    await wrapper.find('input.hp-input').setValue(35)
    await wrapper.find('.hp-btn-damage').trigger('click')

    const ship = store.state.activeScene!.starship
    // 35 dmg: shields fully absorbed (20 -> 0), 15 spills to HP (80 -> 65)
    expect(ship.currentShields).toBe(0)
    expect(ship.currentHP).toBe(65)
  })

})
