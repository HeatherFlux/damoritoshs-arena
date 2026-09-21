import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub location before importing the store (it has init side effects).
vi.stubGlobal('location', { ...window.location, hash: '' })

vi.mock('../utils/discordIntegration', () => ({
  sendTurnChange: vi.fn().mockResolvedValue(undefined),
  initDiscordIntegration: vi.fn(),
  destroyDiscordIntegration: vi.fn(),
}))

import { mount, flushPromises } from '@vue/test-utils'
import TscPlayerView from '../components/tsc/TscPlayerView.vue'
import { useTscStore, createEmptyTscScene, buildTscPlayerData, __resetTscStore } from '../stores/tscStore'
import { createPlayerStarship } from '../utils/tscDerive'
import { TSC_STARSHIPS } from '../data/tscStarships'

const trident = TSC_STARSHIPS.find(s => s.name === 'Raider Trident')!

/**
 * The player view renders only the sanitized `player-data` snapshot the GM
 * broadcasts. It never reads the raw scene, so hidden ships and exact NPC
 * hull numbers cannot leak even on the same device.
 */
describe('TscPlayerView', () => {
  let store: ReturnType<typeof useTscStore>

  beforeEach(() => {
    __resetTscStore()
    store = useTscStore()
    store.state.isGMView = true
  })

  it('shows the waiting state without data', () => {
    const wrapper = mount(TscPlayerView)
    expect(wrapper.text()).toContain('Waiting for the GM')
  })

  it('renders the player ship, initiative, and visible contacts from a player-data snapshot', async () => {
    const saved = createEmptyTscScene()
    saved.name = 'Ambush at Absalom'
    saved.playerShip = createPlayerStarship('bulwark', 3, 'Anvil')
    store.startScene(saved)
    store.addPc({ name: 'Iseph' })
    const [visible, hidden] = store.addNpcShip(trident, 2)
    store.setHidden({ kind: 'npc', instanceId: hidden.instanceId }, true)
    store.damageShip({ kind: 'npc', instanceId: visible.instanceId }, 4)
    store.rollInitiative([{ pcId: store.state.activeScene!.pcs[0].id, total: 20 }])
    store.damageShip({ kind: 'player' }, 30) // 18 SP absorbed, 12 to hull

    // Simulate the snapshot arriving at a player tab.
    const snapshot = buildTscPlayerData(store.state.activeScene, store.state.identifiedModels)
    store.state.isGMView = false
    store.state.playerData = snapshot

    const wrapper = mount(TscPlayerView)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Ambush at Absalom')
    expect(text).toContain('Anvil')
    expect(text).toContain('45/57 Hull')
    expect(text).toContain('Raider Trident')
    expect(text).not.toContain('Raider Trident 2')
    expect(text).toContain('Unidentified')
    expect(text).toContain('Damaged')
    const contact = wrapper.find('.contact').text()
    expect(contact).not.toMatch(/\d+\s*\/\s*\d+/)   // no "current/max" numbers for NPC hulls
    expect(text).not.toContain('takes 4 damage')      // GM-only log lines stay on the GM side
    expect(text).toContain('Iseph')
    expect(text).toContain('Round')
  })

  it('does not render hull numbers for NPC ships even when the scene is in local storage', async () => {
    const saved = createEmptyTscScene()
    saved.playerShip = createPlayerStarship('explorer', 5, 'Wanderer')
    store.startScene(saved)
    store.addNpcShip(trident)
    store.state.isGMView = false
    store.state.playerData = null
    const wrapper = mount(TscPlayerView)
    await flushPromises()
    // requestStateFromGM falls back to the same-device localStorage scene, sanitized.
    const text = wrapper.text()
    expect(text).toContain('Wanderer')
    expect(text).not.toContain(`${trident.hp}`)
    expect(wrapper.html()).not.toContain('currentHP')
  })
})
