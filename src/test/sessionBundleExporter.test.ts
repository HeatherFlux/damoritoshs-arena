import { describe, it, expect, beforeEach } from 'vitest'
import { useEncounterStore } from '../stores/encounterStore'
import { usePartyStore } from '../stores/partyStore'
import { useHackingStore } from '../stores/hackingStore'
import { useStarshipStore } from '../stores/starshipStore'
import {
  buildSessionBundle,
  serializeBundle,
  defaultBundleFilename,
} from '../utils/sessionBundleExporter'
import {
  parseSessionBundle,
  importSessionBundle,
  type ImportStores,
} from '../utils/sessionBundleImporter'
import type { Creature } from '../types/creature'
import type { SavedHackingEncounter } from '../types/hacking'
import type { SavedScene } from '../types/starship'
import { createEmptySavedScene, createDefaultStarship } from '../types/starship'

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'custom-test-1',
    name: 'Test Goblin',
    level: 1,
    traits: ['humanoid'],
    size: 'small',
    source: 'Custom',
    perception: 4,
    senses: [],
    languages: [],
    skills: {},
    abilities: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
    ac: 15,
    saves: { fort: 4, ref: 6, will: 2 },
    hp: 12,
    immunities: [],
    resistances: [],
    weaknesses: [],
    speed: '25 feet',
    attacks: [],
    specialAbilities: [],
    ...overrides,
  }
}

function makeHackingEncounter(overrides: Partial<SavedHackingEncounter> = {}): SavedHackingEncounter {
  return {
    id: 'hack-1',
    name: 'Test Hacking',
    savedAt: Date.now(),
    computer: {
      id: 'comp-1',
      name: 'Test Computer',
      level: 4,
      type: 'tech',
      description: 'Demo',
      successDescription: 'You hack it.',
      accessPoints: [
        {
          id: 'ap-1',
          name: 'Login Terminal',
          type: 'physical',
          state: 'locked',
          position: { x: 0.5, y: 0.5 },
          connectedTo: [],
          dc: 18,
        },
      ],
    },
    ...overrides,
  }
}

function makeSavedScene(overrides: Partial<SavedScene> = {}): SavedScene {
  return {
    ...createEmptySavedScene(),
    id: 'scene-1',
    name: 'Test Scene',
    level: 5,
    description: 'Pirates ambush the party',
    victoryCondition: 'defeat',
    starship: { ...createDefaultStarship(), name: 'The Damoritosh' },
    threats: [],
    roles: [],
    availableRoles: ['captain', 'pilot', 'gunner'],
    starshipActions: [],
    savedAt: Date.now(),
    ...overrides,
  }
}

function clearAll(
  encounterStore: ReturnType<typeof useEncounterStore>,
  partyStore: ReturnType<typeof usePartyStore>,
  hackingStore: ReturnType<typeof useHackingStore>,
  starshipStore: ReturnType<typeof useStarshipStore>,
) {
  while (partyStore.state.parties.length > 0) {
    partyStore.deleteParty(partyStore.state.parties[0].id)
  }
  encounterStore.clearAllEncounters()
  encounterStore.clearCustomCreatures()
  encounterStore.clearCustomHazards()
  hackingStore.state.savedEncounters.splice(0, hackingStore.state.savedEncounters.length)
  starshipStore.state.savedScenes.splice(0, starshipStore.state.savedScenes.length)
}

describe('sessionBundleExporter', () => {
  let encounterStore: ReturnType<typeof useEncounterStore>
  let partyStore: ReturnType<typeof usePartyStore>
  let hackingStore: ReturnType<typeof useHackingStore>
  let starshipStore: ReturnType<typeof useStarshipStore>

  beforeEach(() => {
    encounterStore = useEncounterStore()
    partyStore = usePartyStore()
    hackingStore = useHackingStore()
    starshipStore = useStarshipStore()
    clearAll(encounterStore, partyStore, hackingStore, starshipStore)
  })

  describe('buildSessionBundle', () => {
    it('produces a minimal bundle when stores are empty', () => {
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'Empty' }
      )
      expect(bundle.name).toBe('Empty')
      expect(bundle.party).toBeUndefined()
      expect(bundle.creatures).toBeUndefined()
      expect(bundle.encounters).toBeUndefined()
      expect(bundle.hacking).toBeUndefined()
      expect(bundle.starship).toBeUndefined()
    })

    it('includes the active party with derived partyLevel', () => {
      partyStore.createParty('The Crew')
      partyStore.addPlayer({ name: 'Alice', maxHP: 30, ac: 18, level: 5, class: 'Soldier' })
      partyStore.addPlayer({ name: 'Bob', maxHP: 40, ac: 17, level: 5, class: 'Mystic' })

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      expect(bundle.party?.name).toBe('The Crew')
      expect(bundle.party?.players).toHaveLength(2)
      expect(bundle.party?.players[0].name).toBe('Alice')
      expect(bundle.party?.players[0].class).toBe('Soldier')
      expect(bundle.partyLevel).toBe(5)
    })

    it('strips id and pathbuilderData from players', () => {
      partyStore.createParty('Crew')
      partyStore.addPlayer({
        name: 'Alice',
        maxHP: 30,
        ac: 18,
        pathbuilderData: '{"long":"json blob"}',
      })

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      const player = bundle.party!.players[0] as Record<string, unknown>
      expect(player.id).toBeUndefined()
      expect(player.pathbuilderData).toBeUndefined()
      expect(player.name).toBe('Alice')
    })

    it('exports custom creatures and hazards but not bundled ones', () => {
      const bundledCount = encounterStore.getCreatureStats().bundled
      encounterStore.addCustomCreature(makeCreature({ id: 'custom-test-1' }))
      encounterStore.addCustomCreature(makeCreature({ id: 'custom-test-2', name: 'Other' }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      expect(bundle.creatures).toHaveLength(2)
      expect(bundle.creatures!.map(c => c.id).sort()).toEqual(['custom-test-1', 'custom-test-2'])
      // Sanity: not exporting the entire bundled set
      expect(bundle.creatures!.length).toBeLessThan(bundledCount)
    })

    it('maps encounter creature refs to creatureId', () => {
      const creature = makeCreature({ id: 'custom-encounter-creature' })
      encounterStore.addCustomCreature(creature)
      encounterStore.createEncounter('Goblin Ambush')
      encounterStore.addCreatureToEncounter(creature, 'elite')
      encounterStore.addCreatureToEncounter(creature, 'elite')

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      expect(bundle.encounters).toHaveLength(1)
      const enc = bundle.encounters![0]
      expect(enc.name).toBe('Goblin Ambush')
      expect(enc.creatures).toHaveLength(1)
      expect(enc.creatures![0]).toEqual({
        creatureId: 'custom-encounter-creature',
        count: 2,
        adjustment: 'elite',
      })
    })

    it('exports saved hacking encounters', () => {
      hackingStore.state.savedEncounters.push(makeHackingEncounter({ name: 'Server Heist' }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      expect(bundle.hacking).toHaveLength(1)
      expect(bundle.hacking![0].name).toBe('Server Heist')
      expect(bundle.hacking![0].computer.accessPoints).toHaveLength(1)
    })

    it('exports saved starship scenes', () => {
      starshipStore.state.savedScenes.push(makeSavedScene({ name: 'Asteroid Run' }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'S' }
      )

      expect(bundle.starship).toHaveLength(1)
      expect(bundle.starship![0].name).toBe('Asteroid Run')
      expect(bundle.starship![0].starship?.name).toBe('The Damoritosh')
    })
  })

  describe('serializeBundle', () => {
    it('produces parseable YAML by default', () => {
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'YAML Test', description: 'desc' }
      )
      const { content, mimeType, extension } = serializeBundle(bundle, 'yaml')
      expect(extension).toBe('yaml')
      expect(mimeType).toContain('yaml')
      const parsed = parseSessionBundle(content)
      expect(parsed.name).toBe('YAML Test')
      expect(parsed.description).toBe('desc')
    })

    it('produces parseable JSON', () => {
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'JSON Test' }
      )
      const { content, mimeType, extension } = serializeBundle(bundle, 'json')
      expect(extension).toBe('json')
      expect(mimeType).toBe('application/json')
      const parsed = parseSessionBundle(content)
      expect(parsed.name).toBe('JSON Test')
    })
  })

  describe('defaultBundleFilename', () => {
    it('uses session prefix when no party name', () => {
      const name = defaultBundleFilename(undefined)
      expect(name).toMatch(/^session-\d{4}-\d{2}-\d{2}$/)
    })

    it('slugifies the active party name', () => {
      const name = defaultBundleFilename("Damoritosh's Crew")
      expect(name).toMatch(/^damoritosh-s-crew-\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('full round-trip', () => {
    it('preserves party, custom creature, encounter, hacking, and starship through YAML', () => {
      // Seed
      partyStore.createParty('Round Trip Crew')
      partyStore.addPlayer({ name: 'Alice', maxHP: 30, ac: 18, level: 4 })
      partyStore.addPlayer({ name: 'Bob', maxHP: 28, ac: 17, level: 4 })

      const goblin = makeCreature({ id: 'custom-rt-goblin', name: 'Goblin Sniper' })
      encounterStore.addCustomCreature(goblin)
      encounterStore.createEncounter('Sniper Nest')
      encounterStore.addCreatureToEncounter(goblin, 'normal')
      encounterStore.addCreatureToEncounter(goblin, 'normal')

      hackingStore.state.savedEncounters.push(makeHackingEncounter({
        id: 'hack-rt',
        name: 'Server Heist',
      }))

      starshipStore.state.savedScenes.push(makeSavedScene({
        id: 'scene-rt',
        name: 'Asteroid Run',
      }))

      // Export → YAML → re-parse
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore },
        { name: 'Round Trip' }
      )
      const yamlText = serializeBundle(bundle, 'yaml').content
      const reparsed = parseSessionBundle(yamlText)

      // Wipe stores
      clearAll(encounterStore, partyStore, hackingStore, starshipStore)
      expect(partyStore.state.parties).toHaveLength(0)
      expect(encounterStore.state.encounters).toHaveLength(0)
      expect(hackingStore.state.savedEncounters).toHaveLength(0)
      expect(starshipStore.state.savedScenes).toHaveLength(0)

      // Re-import
      const importStores: ImportStores = {
        encounterStore: {
          state: encounterStore.state,
          importCustomCreatures: encounterStore.importCustomCreatures,
          importCustomHazards: encounterStore.importCustomHazards,
          importEncounters: encounterStore.importEncounters,
        },
        hackingStore: {
          state: hackingStore.state,
        },
        starshipStore: {
          importScenes: starshipStore.importScenes,
        },
        partyStore: {
          importParties: partyStore.importParties,
        },
        shopStore: {
          state: { partyLevel: 1, shopType: 'general', settlement: 'city', customName: '' },
          generateShop: () => ({}),
        },
      }
      const result = importSessionBundle(reparsed, importStores)

      // Verify: party, creature, encounter, hacking, starship all came back
      expect(result.parties).toBe(1)
      expect(partyStore.state.parties).toHaveLength(1)
      expect(partyStore.state.parties[0].name).toBe('Round Trip Crew')
      expect(partyStore.state.parties[0].players).toHaveLength(2)

      expect(result.creatures).toBe(1)
      expect(encounterStore.state.creatures.find(c => c.id === 'custom-rt-goblin')?.name).toBe('Goblin Sniper')

      expect(result.encounters).toBe(1)
      expect(encounterStore.state.encounters[0].name).toBe('Sniper Nest')
      expect(encounterStore.state.encounters[0].creatures).toHaveLength(1)
      expect(encounterStore.state.encounters[0].creatures[0].count).toBe(2)

      expect(result.hackingSessions).toBe(1)
      expect(hackingStore.state.savedEncounters[0].name).toBe('Server Heist')

      expect(result.starshipScenes).toBe(1)
      expect(starshipStore.state.savedScenes[0].name).toBe('Asteroid Run')
    })
  })
})
