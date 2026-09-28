import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub location before importing the store (it has init side effects).
vi.stubGlobal('location', { ...window.location, hash: '' })

vi.mock('../utils/discordIntegration', () => ({
  sendTurnChange: vi.fn().mockResolvedValue(undefined),
  initDiscordIntegration: vi.fn(),
  destroyDiscordIntegration: vi.fn(),
}))

import { mount, flushPromises } from '@vue/test-utils'
import ChasePlayerView from '../components/chase/ChasePlayerView.vue'
import { useChaseStore, buildChasePlayerData, __resetChaseStore } from '../stores/chaseStore'
import { createEmptyChase, obstacleFromSample } from '../utils/chaseRules'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { getVehicleById } from '../data/vehicles'

/**
 * The player view renders only the sanitized `player-data` snapshot the GM broadcasts. It never
 * reads the raw chase, so face-down obstacles and the other side's numbers cannot leak even on
 * the same device.
 */
describe('ChasePlayerView', () => {
  let store: ReturnType<typeof useChaseStore>

  beforeEach(() => {
    __resetChaseStore()
    store = useChaseStore()
    store.state.isGMView = true
  })

  function startChase() {
    const chase = createEmptyChase('run-away')
    chase.name = 'Rooftop Dash'
    const byName = (name: string) => SAMPLE_CHASE_OBSTACLES.find(o => o.name === name)!
    chase.obstacles = ['Crowd', 'Security Drone', 'Rickety Fire Escape', 'Chain Link Fence']
      .map(name => ({ ...obstacleFromSample(byName(name), 3), notes: 'GM secret' }))
    store.startChase(chase)
    const scene = store.state.activeScene!
    const party = scene.sides.find(s => s.isPlayers)!
    const foes = scene.sides.find(s => !s.isPlayers)!
    store.addMember(party.id, 'Iseph')
    store.addMember(party.id, 'Navasi')
    return { scene, party, foes }
  }

  async function mountWithSnapshot() {
    // Simulate the snapshot arriving at a player tab.
    const snapshot = buildChasePlayerData(store.state.activeScene)
    store.state.isGMView = false
    store.state.playerData = snapshot
    const wrapper = mount(ChasePlayerView)
    await flushPromises()
    return wrapper
  }

  it('shows the waiting state without data', () => {
    const wrapper = mount(ChasePlayerView)
    expect(wrapper.text()).toContain('Waiting for the chase')
  })

  it('shows reached obstacles face up and the rest face down', async () => {
    startChase()
    const wrapper = await mountWithSnapshot()
    const text = wrapper.text()
    expect(text).toContain('Rooftop Dash')
    expect(text).toContain('Crowd')
    expect(text).toContain('DC 15')
    expect(text).toContain('Acrobatics or Athletics')
    expect(text).not.toContain('Security Drone')
    expect(text).not.toContain('Rickety Fire Escape')
    expect(text).not.toContain('Chain Link Fence')
    expect(text).not.toContain('GM secret')
    expect(wrapper.findAll('.track-card')).toHaveLength(4)
    expect(wrapper.findAll('.track-card-facedown')).toHaveLength(3)
  })

  it('shows a scouted obstacle and the party progress', async () => {
    const { scene, party } = startChase()
    store.revealObstacle(scene.obstacles[2].id, true)
    store.resolveCheck(party.id, party.members[0].id, 'criticalSuccess')
    const wrapper = await mountWithSnapshot()
    const text = wrapper.text()
    expect(text).toContain('Rickety Fire Escape')
    expect(text).not.toContain('Security Drone')
    expect(text).toContain('Party 2 / 3')
    expect(text).toContain('Iseph')
    expect(wrapper.findAll('.view-member-acted')).toHaveLength(1)
  })

  it('shows the gap and only a condition for the other side', async () => {
    const { party, foes } = startChase()
    const mine = store.attachVehicle(party.id, getVehicleById('urban-cruiser')!)!
    const theirs = store.attachVehicle(foes.id, getVehicleById('enercopter')!)!
    store.damageVehicle(mine.instanceId, 15)
    store.damageVehicle(theirs.instanceId, 25)
    const wrapper = await mountWithSnapshot()
    const text = wrapper.text()
    expect(text).toContain('1 obstacle behind you')
    expect(text).toContain('50/60 HP')
    expect(text).toContain('Enercopter')
    expect(text).toContain('Damaged')
    expect(text).not.toContain('65')
    expect(text).not.toContain('/80')
  })

  it('announces the outcome once the GM confirms it', async () => {
    startChase()
    store.endRound()
    expect(store.state.activeScene!.pendingOutcome?.kind).toBe('caught')
    let wrapper = await mountWithSnapshot()
    expect(wrapper.find('.view-outcome').exists()).toBe(false)

    store.state.isGMView = true
    store.confirmOutcome()
    wrapper = await mountWithSnapshot()
    expect(wrapper.find('.view-outcome').text()).toContain('catch up with Party')
  })
})
