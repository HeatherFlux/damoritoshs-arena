import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CombatPlayerView from '../components/combat/CombatPlayerView.vue'
import { useCombatStore, type CombatPlayerData } from '../stores/combatStore'

// Helper to set player view data
function setPlayerData(data: CombatPlayerData | null) {
  const store = useCombatStore()
  store.playerViewData.value = data
}

function makeCombatData(overrides: Partial<CombatPlayerData> = {}): CombatPlayerData {
  return {
    combatants: [
      { name: 'Zephyr', conditions: [], isDead: false, isPlayer: true, isActive: true },
      { name: 'Goblin Warrior', conditions: [], isDead: false, isPlayer: false, isActive: true },
      { name: 'Skeleton Guard', conditions: [{ name: 'frightened', value: 2 }], isDead: false, isPlayer: false, isActive: true },
    ],
    round: 3,
    turn: 0,
    combatName: 'Ambush at the Docks',
    isActive: true,
    ...overrides,
  }
}

describe('CombatPlayerView', () => {
  beforeEach(() => {
    setPlayerData(null)
  })

  it('shows waiting state when no data', () => {
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('Waiting for GM')
  })

  it('shows waiting state when combat not active', () => {
    setPlayerData(makeCombatData({ isActive: false }))
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('Waiting for GM')
  })

  it('shows combat name and round when active', () => {
    setPlayerData(makeCombatData())
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('Ambush at the Docks')
    expect(wrapper.text()).toContain('ROUND 3')
  })

  it('displays combatant names', () => {
    setPlayerData(makeCombatData())
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('Zephyr')
    expect(wrapper.text()).toContain('Goblin Warrior')
    expect(wrapper.text()).toContain('Skeleton Guard')
  })

  it('highlights current turn combatant', () => {
    setPlayerData(makeCombatData({ turn: 1 }))
    const wrapper = mount(CombatPlayerView)
    const rows = wrapper.findAll('.initiative-row')
    expect(rows[1].classes()).toContain('initiative-current')
    expect(rows[0].classes()).not.toContain('initiative-current')
  })

  it('shows "Up Next" name', () => {
    setPlayerData(makeCombatData({ turn: 0 }))
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('UP NEXT')
    expect(wrapper.text()).toContain('Goblin Warrior')
  })

  it('shows conditions on combatants', () => {
    setPlayerData(makeCombatData())
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('frightened 2')
  })

  it('shows DEFEATED for dead combatants', () => {
    setPlayerData(makeCombatData({
      combatants: [
        { name: 'Dead Goblin', conditions: [], isDead: true, isPlayer: false, isActive: true },
      ],
    }))
    const wrapper = mount(CombatPlayerView)
    expect(wrapper.text()).toContain('DEFEATED')
  })

  it('does NOT render HP values anywhere', () => {
    setPlayerData(makeCombatData())
    const wrapper = mount(CombatPlayerView)
    const html = wrapper.html()
    // HP, maxHP, currentHP, tempHP should not appear
    expect(html).not.toMatch(/\b\d+\s*\/\s*\d+\s*HP/i)
    expect(html).not.toContain('maxHP')
    expect(html).not.toContain('currentHP')
    expect(html).not.toContain('tempHP')
  })
})
