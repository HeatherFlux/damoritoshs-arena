import { describe, it, expect, beforeEach } from 'vitest'
import { useEncounterStore } from '../stores/encounterStore'
import { makeCreature, makeHazard } from './fixtures'

describe('encounterStore — encounter CRUD', () => {
  let store: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    store = useEncounterStore()
    // Clean up encounters
    store.clearAllEncounters()
  })

  it('creates an encounter', () => {
    const enc = store.createEncounter('Boss Fight')
    expect(enc.name).toBe('Boss Fight')
    expect(enc.creatures).toEqual([])
    expect(store.state.encounters).toHaveLength(1)
  })

  it('sets new encounter as active', () => {
    const enc = store.createEncounter()
    expect(store.state.activeEncounterId).toBe(enc.id)
  })

  it('deletes an encounter', () => {
    const enc = store.createEncounter('Delete Me')
    store.deleteEncounter(enc.id)
    expect(store.state.encounters).toHaveLength(0)
  })

  it('falls back when active encounter is deleted', () => {
    const e1 = store.createEncounter('First')
    const e2 = store.createEncounter('Second')
    store.setActiveEncounter(e2.id)
    store.deleteEncounter(e2.id)
    expect(store.state.activeEncounterId).toBe(e1.id)
  })

  it('sets active encounter to null when all deleted', () => {
    const enc = store.createEncounter()
    store.deleteEncounter(enc.id)
    expect(store.state.activeEncounterId).toBeNull()
  })

  it('updates encounter name', () => {
    const enc = store.createEncounter('Old')
    store.updateEncounterName(enc.id, 'New')
    expect(store.state.encounters[0].name).toBe('New')
  })
})

describe('encounterStore — creature-in-encounter', () => {
  let store: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    store = useEncounterStore()
    store.clearAllEncounters()
    store.createEncounter('Test')
  })

  it('adds a creature to encounter', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    expect(store.activeEncounter.value!.creatures).toHaveLength(1)
    expect(store.activeEncounter.value!.creatures[0].count).toBe(1)
  })

  it('increments count for duplicate creature + adjustment', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    store.addCreatureToEncounter(creature)
    expect(store.activeEncounter.value!.creatures).toHaveLength(1)
    expect(store.activeEncounter.value!.creatures[0].count).toBe(2)
  })

  it('adds separately for different adjustments', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature, 'normal')
    store.addCreatureToEncounter(creature, 'elite')
    expect(store.activeEncounter.value!.creatures).toHaveLength(2)
  })

  it('removes by decrementing count', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    store.addCreatureToEncounter(creature)
    store.removeCreatureFromEncounter(creature.id, 'normal')
    expect(store.activeEncounter.value!.creatures[0].count).toBe(1)
  })

  it('removes entirely when count reaches 0', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    store.removeCreatureFromEncounter(creature.id, 'normal')
    expect(store.activeEncounter.value!.creatures).toHaveLength(0)
  })

  it('updates creature count', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    store.updateCreatureCount(creature.id, 'normal', 5)
    expect(store.activeEncounter.value!.creatures[0].count).toBe(5)
  })

  it('removes creature when count set to 0', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature)
    store.updateCreatureCount(creature.id, 'normal', 0)
    expect(store.activeEncounter.value!.creatures).toHaveLength(0)
  })

  it('updates creature adjustment', () => {
    const creature = makeCreature()
    store.addCreatureToEncounter(creature, 'normal')
    store.updateCreatureAdjustment(creature.id, 'normal', 'elite')
    expect(store.activeEncounter.value!.creatures[0].adjustment).toBe('elite')
  })
})

describe('encounterStore — hazard-in-encounter', () => {
  let store: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    store = useEncounterStore()
    store.clearAllEncounters()
    store.createEncounter('Test')
  })

  it('adds a hazard to encounter', () => {
    const hazard = makeHazard()
    store.addHazardToEncounter(hazard)
    expect(store.activeEncounter.value!.hazards).toHaveLength(1)
  })

  it('increments count for duplicate hazard', () => {
    const hazard = makeHazard()
    store.addHazardToEncounter(hazard)
    store.addHazardToEncounter(hazard)
    expect(store.activeEncounter.value!.hazards![0].count).toBe(2)
  })

  it('removes a hazard', () => {
    const hazard = makeHazard()
    store.addHazardToEncounter(hazard)
    store.removeHazardFromEncounter(hazard.id)
    expect(store.activeEncounter.value!.hazards).toHaveLength(0)
  })

  it('updates hazard count', () => {
    const hazard = makeHazard()
    store.addHazardToEncounter(hazard)
    store.updateHazardCount(hazard.id, 3)
    expect(store.activeEncounter.value!.hazards![0].count).toBe(3)
  })
})

describe('encounterStore — party settings', () => {
  let store: ReturnType<typeof useEncounterStore>

  beforeEach(() => {
    store = useEncounterStore()
  })

  it('sets party level clamped 1-20', () => {
    store.setPartyLevel(10)
    expect(store.state.partyLevel).toBe(10)

    store.setPartyLevel(0)
    expect(store.state.partyLevel).toBe(1)

    store.setPartyLevel(25)
    expect(store.state.partyLevel).toBe(20)
  })

  it('sets party size clamped 1-12', () => {
    store.setPartySize(6)
    expect(store.state.partySize).toBe(6)

    store.setPartySize(0)
    expect(store.state.partySize).toBe(1)

    store.setPartySize(15)
    expect(store.state.partySize).toBe(12)
  })
})
