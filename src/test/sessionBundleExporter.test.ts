import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useEncounterStore } from '../stores/encounterStore'
import { usePartyStore } from '../stores/partyStore'
import { useHackingStore } from '../stores/hackingStore'
import { useStarshipStore } from '../stores/starshipStore'
import { useShopStore } from '../stores/shopStore'
import {
  buildSessionBundle,
  serializeBundle,
  defaultBundleFilename,
} from '../utils/sessionBundleExporter'
import { parseSessionBundle, importSessionBundle, type ImportStores, previewSessionBundle, parseTscScenesFile, parseChasesFile } from '../utils/sessionBundleImporter'
import type { Creature } from '../types/creature'
import type { SavedHackingEncounter } from '../types/hacking'
import type { SavedScene } from '../types/starship'
import type { SavedShop } from '../types/shop'
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

function makeSavedShop(overrides: Partial<SavedShop> = {}): SavedShop {
  return {
    id: 'shop-1',
    name: 'Test Bazaar',
    savedAt: Date.now(),
    shop: {
      name: 'Test Bazaar',
      shopType: 'general',
      settlement: 'City',
      partyLevel: 5,
      levelRange: 'Lvl 0-7',
      itemCount: 1,
      inventory: {
        equipment: [
          {
            id: 'item-1',
            name: 'Hacking Kit',
            level: 1,
            price: 35,
            priceRaw: '35 cr',
            category: 'equipment',
            traits: [],
            rarity: 'common',
            bulk: 'L',
            source: 'Test',
            summary: 'A basic hacking kit',
            url: null,
            damage: null,
            range: null,
            hands: null,
            group: null,
            weaponCategory: null,
            weaponType: null,
            ac: null,
            dexCap: null,
            checkPenalty: null,
            speedPenalty: null,
            armorCategory: null,
            hardness: null,
            hp: null,
            itemCategory: 'tool',
            itemSubcategory: null,
            grade: 'base',
            baseName: 'Hacking Kit',
          },
        ],
      },
    },
    shopkeeper: null,
    ...overrides,
  }
}

function clearAll(
  encounterStore: ReturnType<typeof useEncounterStore>,
  partyStore: ReturnType<typeof usePartyStore>,
  hackingStore: ReturnType<typeof useHackingStore>,
  starshipStore: ReturnType<typeof useStarshipStore>,
  shopStore: ReturnType<typeof useShopStore>,
) {
  while (partyStore.state.parties.length > 0) {
    partyStore.deleteParty(partyStore.state.parties[0].id)
  }
  encounterStore.clearAllEncounters()
  encounterStore.clearCustomCreatures()
  encounterStore.clearCustomHazards()
  hackingStore.state.savedEncounters.splice(0, hackingStore.state.savedEncounters.length)
  starshipStore.state.savedScenes.splice(0, starshipStore.state.savedScenes.length)
  shopStore.clearAllShops()
}

describe('sessionBundleExporter', () => {
  let encounterStore: ReturnType<typeof useEncounterStore>
  let partyStore: ReturnType<typeof usePartyStore>
  let hackingStore: ReturnType<typeof useHackingStore>
  let starshipStore: ReturnType<typeof useStarshipStore>
  let shopStore: ReturnType<typeof useShopStore>

  beforeEach(() => {
    encounterStore = useEncounterStore()
    partyStore = usePartyStore()
    hackingStore = useHackingStore()
    starshipStore = useStarshipStore()
    shopStore = useShopStore()
    clearAll(encounterStore, partyStore, hackingStore, starshipStore, shopStore)
  })

  describe('buildSessionBundle', () => {
    it('produces a minimal bundle when stores are empty', () => {
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
        { name: 'S' }
      )

      expect(bundle.hacking).toHaveLength(1)
      expect(bundle.hacking![0].name).toBe('Server Heist')
      expect(bundle.hacking![0].computer.accessPoints).toHaveLength(1)
    })

    it('exports saved starship scenes', () => {
      starshipStore.state.savedScenes.push(makeSavedScene({ name: 'Asteroid Run' }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
        { name: 'S' }
      )

      expect(bundle.starship).toHaveLength(1)
      expect(bundle.starship![0].name).toBe('Asteroid Run')
      expect(bundle.starship![0].starship?.name).toBe('The Damoritosh')
    })

    it('exports saved shops as full snapshots, not just generation params', () => {
      shopStore.state.savedShops.push(makeSavedShop({ name: 'The Pact Worlds Bazaar' }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
        { name: 'S' }
      )

      expect(bundle.shops).toHaveLength(1)
      expect(bundle.shops![0].name).toBe('The Pact Worlds Bazaar')
      // The full inventory should be included so import doesn't have to re-roll
      expect(bundle.shops![0].shop?.inventory.equipment?.[0].name).toBe('Hacking Kit')
      expect(bundle.shops![0].shop?.itemCount).toBe(1)
      // Legacy params-only fields should NOT be present on a fresh export
      expect(bundle.shops![0].shopType).toBeUndefined()
      expect(bundle.shops![0].partyLevel).toBeUndefined()
    })
  })

  describe('serializeBundle', () => {
    it('produces parseable YAML by default', () => {
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
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

  describe('shop import compat', () => {
    it('drops legacy params-only shop entries with a warning', () => {
      const bundle = parseSessionBundle(JSON.stringify({
        name: 'Old Bundle',
        shops: [
          { name: 'Legacy Shop', shopType: 'general', settlement: 'city', partyLevel: 5 },
        ],
      }))

      const importStores: ImportStores = {
        encounterStore: {
          state: encounterStore.state,
          importCustomCreatures: encounterStore.importCustomCreatures,
          importCustomHazards: encounterStore.importCustomHazards,
          importEncounters: encounterStore.importEncounters,
        },
        hackingStore: { state: hackingStore.state },
        starshipStore: { importScenes: starshipStore.importScenes },
        partyStore: { importParties: partyStore.importParties },
        shopStore: { state: shopStore.state },
      }

      const result = importSessionBundle(bundle, importStores)

      expect(result.shops).toBe(0)
      expect(shopStore.state.savedShops).toHaveLength(0)
      expect(result.warnings.some(w => w.section === 'shops' && w.message.includes('legacy'))).toBe(true)
    })

    it('imports shops with full snapshots into savedShops', () => {
      const snapshot = makeSavedShop({ name: 'Imported Bazaar' })
      const bundle = parseSessionBundle(JSON.stringify({
        name: 'New Bundle',
        shops: [
          {
            name: snapshot.name,
            shop: snapshot.shop,
            shopkeeper: snapshot.shopkeeper,
            savedAt: snapshot.savedAt,
          },
        ],
      }))

      const importStores: ImportStores = {
        encounterStore: {
          state: encounterStore.state,
          importCustomCreatures: encounterStore.importCustomCreatures,
          importCustomHazards: encounterStore.importCustomHazards,
          importEncounters: encounterStore.importEncounters,
        },
        hackingStore: { state: hackingStore.state },
        starshipStore: { importScenes: starshipStore.importScenes },
        partyStore: { importParties: partyStore.importParties },
        shopStore: { state: shopStore.state },
      }

      const result = importSessionBundle(bundle, importStores)

      expect(result.shops).toBe(1)
      expect(shopStore.state.savedShops).toHaveLength(1)
      expect(shopStore.state.savedShops[0].name).toBe('Imported Bazaar')
      expect(shopStore.state.savedShops[0].shop.inventory.equipment?.[0].name).toBe('Hacking Kit')
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

      shopStore.state.savedShops.push(makeSavedShop({
        id: 'shop-rt',
        name: 'Round Trip Bazaar',
      }))

      // Export → YAML → re-parse
      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
        { name: 'Round Trip' }
      )
      const yamlText = serializeBundle(bundle, 'yaml').content
      const reparsed = parseSessionBundle(yamlText)

      // Wipe stores
      clearAll(encounterStore, partyStore, hackingStore, starshipStore, shopStore)
      expect(partyStore.state.parties).toHaveLength(0)
      expect(encounterStore.state.encounters).toHaveLength(0)
      expect(hackingStore.state.savedEncounters).toHaveLength(0)
      expect(starshipStore.state.savedScenes).toHaveLength(0)
      expect(shopStore.state.savedShops).toHaveLength(0)

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
          state: shopStore.state,
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

      expect(result.shops).toBe(1)
      expect(shopStore.state.savedShops[0].name).toBe('Round Trip Bazaar')
      expect(shopStore.state.savedShops[0].shop.inventory.equipment?.[0].name).toBe('Hacking Kit')
    })

    // The new threat-skills editor lets a GM author bonuses like
    // {Piloting: 12, Arcana: 14} on a threat. The runner reads them when
    // a skill_check routine action fires (chip shows "+12 Piloting", click
    // rolls d20+12). Both schema and example YAML already documented
    // this shape, but no test exercised the round-trip.
    it('preserves threat.skills (e.g. Piloting +12, Arcana +14) through YAML round-trip', () => {
      starshipStore.state.savedScenes.push(makeSavedScene({
        id: 'scene-skills',
        name: 'Bonesinger Encounter',
        threats: [
          {
            id: 'threat-bonesinger',
            name: 'Bonesinger',
            type: 'enemy_ship',
            level: 5,
            maxHP: 80, currentHP: 80,
            maxShields: 12, currentShields: 12, shieldRegen: 4,
            ac: 23, fortitude: 14, reflex: 8,
            initiativeSkill: 'Arcana', initiativeBonus: 14,
            skills: { Arcana: 14, Piloting: 12 },
            description: 'Necrotic cruiser.',
            isDefeated: false,
            routineActionsUsed: [],
            routine: {
              actionsPerTurn: 2,
              description: 'Disruptive Scan, then fire.',
              actions: [
                {
                  id: 'rt-scan',
                  name: 'Disruptive Scan',
                  actionCost: 1,
                  type: 'skill_check',
                  description: 'Magical scan.',
                  skill: 'Arcana',
                  vsDefense: 'Will DC',
                  dc: 22,
                },
              ],
            },
          },
        ],
      }))

      const bundle = buildSessionBundle(
        { encounterStore, partyStore, hackingStore, starshipStore, shopStore },
        { name: 'Skills Round Trip' }
      )
      const yamlText = serializeBundle(bundle, 'yaml').content
      const reparsed = parseSessionBundle(yamlText)

      clearAll(encounterStore, partyStore, hackingStore, starshipStore, shopStore)
      expect(starshipStore.state.savedScenes).toHaveLength(0)

      const importStores: ImportStores = {
        encounterStore: {
          state: encounterStore.state,
          importCustomCreatures: encounterStore.importCustomCreatures,
          importCustomHazards: encounterStore.importCustomHazards,
          importEncounters: encounterStore.importEncounters,
        },
        hackingStore: { state: hackingStore.state },
        starshipStore: { importScenes: starshipStore.importScenes },
        partyStore: { importParties: partyStore.importParties },
        shopStore: { state: shopStore.state },
      }
      importSessionBundle(reparsed, importStores)

      // Importer regenerates scene/threat IDs by design (so a re-import
      // can't clobber existing scenes with same id), so look up by name.
      const restored = starshipStore.state.savedScenes.find(s => s.name === 'Bonesinger Encounter')
      expect(restored).toBeTruthy()
      const threat = restored!.threats.find(t => t.name === 'Bonesinger')
      expect(threat).toBeTruthy()
      // The full skill bonus map must survive YAML serialization, not
      // just the keys.
      expect(threat!.skills).toEqual({ Arcana: 14, Piloting: 12 })
      // And the skill_check action that depends on it must still point
      // at the right skill (so the runner's auto-roll still resolves).
      expect(threat!.routine.actions[0].skill).toBe('Arcana')
      // Other threat metadata that was getting silently dropped on
      // import: initiative, tacticalRole hints, etc.
      expect(threat!.initiativeSkill).toBe('Arcana')
      expect(threat!.initiativeBonus).toBe(14)
    })
  })
})

// ============ Tech Core tactical starship combat round-trip ============

import { useTscStore, createEmptyTscScene, __resetTscStore } from '../stores/tscStore'
import { useChaseStore, __resetChaseStore } from '../stores/chaseStore'
import { createEmptyChase, obstacleFromSample } from '../utils/chaseRules'
import { SAMPLE_CHASE_OBSTACLES } from '../data/chaseObstacles'
import { TSC_STARSHIPS } from '../data/tscStarships'
import { TSC_HAZARDS } from '../data/tscHazards'
import { createPlayerStarship } from '../utils/tscDerive'

describe('session bundle: tactical starship combat', () => {
  beforeEach(() => {
    __resetTscStore()
  })

  function allStores() {
    const encounterStore = useEncounterStore()
    const partyStore = usePartyStore()
    const hackingStore = useHackingStore()
    const starshipStore = useStarshipStore()
    const shopStore = useShopStore()
    const tscStore = useTscStore()
    const chaseStore = useChaseStore()
    return { encounterStore, partyStore, hackingStore, starshipStore, shopStore, tscStore, chaseStore }
  }

  it('exports TSC scenes, player ships, custom starships and encounter starship refs, and imports them back', () => {
    const stores = allStores()
    const trident = TSC_STARSHIPS.find(s => s.name === 'Raider Trident')!
    const pod = TSC_HAZARDS.find(h => h.name === 'Boarding Pod')!
    const sheet = stores.tscStore.newPlayerShip('skirmisher', 4, 'Dart')
    const custom = stores.tscStore.addCustomStarship({ ...trident, id: 'scrap-raider', name: 'Scrap Raider' })
    const scene = createEmptyTscScene()
    scene.name = 'Bundle Scene'
    stores.tscStore.saveScene(scene)
    stores.encounterStore.createEncounter('Blockade')
    stores.encounterStore.addStarshipToEncounter(custom)
    stores.encounterStore.addStarshipToEncounter(trident)
    stores.encounterStore.updateStarshipCount(trident.id, 2)
    stores.encounterStore.addStarshipHazardToEncounter(pod)
    stores.encounterStore.setSmallCrew(true)

    const bundle = buildSessionBundle(stores, { name: 'TSC test' })
    expect(bundle.tscScenes?.map(s => s.name)).toEqual(['Bundle Scene'])
    expect(bundle.tscPlayerShips?.map(s => s.id)).toEqual([sheet.id])
    expect(bundle.tscCustomStarships?.map(s => s.id)).toEqual(['custom-starship-scrap-raider'])
    const enc = bundle.encounters!.find(e => e.name === 'Blockade')!
    expect(enc.starships).toEqual([
      { starshipId: 'custom-starship-scrap-raider', starshipName: 'Scrap Raider', count: 1 },
      { starshipId: trident.id, starshipName: 'Raider Trident', count: 2 },
    ])
    expect(enc.starshipHazards).toEqual([{ hazardId: pod.id, hazardName: 'Boarding Pod', count: 1 }])
    expect(enc.tscSmallCrew).toBe(true)

    // Round-trip through YAML into a clean set of stores.
    const { content } = serializeBundle(bundle, 'yaml')
    const parsed = parseSessionBundle(content)
    __resetTscStore()
    const fresh = allStores()
    fresh.encounterStore.state.encounters = []
    const result = importSessionBundle(parsed, fresh as unknown as ImportStores)
    expect(result.tscScenes).toBe(1)
    expect(result.tscPlayerShips).toBe(1)
    expect(result.tscCustomStarships).toBe(1)
    expect(result.warnings.filter(w => w.section === 'encounters')).toEqual([])
    const imported = fresh.encounterStore.state.encounters.find(e => e.name === 'Blockade')!
    expect(imported.starships?.map(s => [s.starship.name, s.count])).toEqual([['Scrap Raider', 1], ['Raider Trident', 2]])
    expect(imported.starshipHazards?.map(h => [h.hazard.name, h.count])).toEqual([['Boarding Pod', 1]])
    expect(imported.tscSmallCrew).toBe(true)
    expect(fresh.tscStore.state.savedScenes.map(s => s.name)).toEqual(['Bundle Scene'])
    expect(fresh.tscStore.state.playerShips.map(s => s.name)).toEqual(['Dart'])
  })

  it('resolves starship references by name when the id is unknown', () => {
    const stores = allStores()
    const bundle = parseSessionBundle(JSON.stringify({
      name: 'ByName',
      encounters: [{ name: 'Pirates', starships: [{ starshipName: 'dread buccaneer', count: 1 }], starshipHazards: [{ hazardName: 'Asteroid Field' }] }],
    }))
    const result = importSessionBundle(bundle, stores as unknown as ImportStores)
    expect(result.warnings.filter(w => w.section === 'encounters')).toEqual([])
    const enc = stores.encounterStore.state.encounters.find(e => e.name === 'Pirates')!
    expect(enc.starships?.[0].starship.name).toBe('Dread Buccaneer')
    expect(enc.starshipHazards?.[0].hazard.name).toBe('Asteroid Field')
  })

  it('builds a hand-written tactical scene from starship and hazard references', () => {
    const stores = allStores()
    const wanderer = { ...createPlayerStarship('explorer', 5, 'Wanderer'), id: 'wanderer' }
    const bundle = parseSessionBundle(`
name: Authored TSC
tscPlayerShips:
  - ${JSON.stringify(wanderer)}
tscScenes:
  - name: Drift Beacon Ambush
    level: 5
    playerShipId: wanderer
    pcs:
      - name: Iseph
        initiativeBonus: 9
    npcShips:
      - starshipId: raider-trident
        count: 2
        zone: "4"
        heading: aft
      - starshipName: dread buccaneer
        label: The Black Maw
        hidden: true
    hazards:
      - hazardName: Asteroid Field
        zone: "3"
`)
    const result = importSessionBundle(bundle, stores as unknown as ImportStores)
    expect(result.warnings).toEqual([])
    expect(result.tscScenes).toBe(1)
    const scene = stores.tscStore.state.savedScenes[0]
    expect(scene.id).toBeTruthy()
    expect(scene.playerShip?.name).toBe('Wanderer')
    expect(scene.pcs).toEqual([expect.objectContaining({ name: 'Iseph', initiativeBonus: 9, id: expect.any(String) })])
    expect(scene.npcShips.map(n => n.label)).toEqual(['Raider Trident', 'Raider Trident 2', 'The Black Maw'])
    expect(scene.npcShips[0]).toMatchObject({ currentHP: 10, position: { zone: '4', heading: 'aft' }, hiddenFromPlayers: false, detected: true })
    expect(scene.npcShips[2]).toMatchObject({ hiddenFromPlayers: true })
    expect(scene.npcShips[2].model.name).toBe('Dread Buccaneer')
    expect(scene.hazards[0]).toMatchObject({ label: 'Asteroid Field', position: { zone: '3' }, detected: false })
    expect(scene.hazards[0].hazard.id).toBe('asteroid-field')
    expect(scene.sensorMap.zones.length).toBeGreaterThan(0)
  })

  it('warns about starship references in a tactical scene it cannot resolve', () => {
    const stores = allStores()
    const bundle = parseSessionBundle(JSON.stringify({
      name: 'Bad refs',
      tscScenes: [{ name: 'Lost', npcShips: [{ starshipId: 'no-such-ship' }], hazards: [{ hazardName: 'Nope' }] }],
    }))
    const result = importSessionBundle(bundle, stores as unknown as ImportStores)
    expect(result.tscScenes).toBe(1)
    expect(result.warnings.filter(w => w.section === 'tsc').map(w => w.message)).toEqual([
      'Could not resolve starship reference: "no-such-ship"',
      'Could not resolve starship hazard reference: "Nope"',
    ])
    expect(stores.tscStore.state.savedScenes[0].npcShips).toEqual([])
  })
})

describe('session bundle: chases', () => {
  beforeEach(() => {
    __resetChaseStore()
  })

  function allStores() {
    return {
      encounterStore: useEncounterStore(),
      partyStore: usePartyStore(),
      hackingStore: useHackingStore(),
      starshipStore: useStarshipStore(),
      shopStore: useShopStore(),
      chaseStore: useChaseStore(),
    }
  }

  function sampleChase() {
    const chase = createEmptyChase('run-away')
    chase.name = 'Bundle Chase'
    chase.obstacles = SAMPLE_CHASE_OBSTACLES.slice(0, 6).map((o, i) => obstacleFromSample(o, i % 2 ? 2 : 3))
    return chase
  }

  it('exports saved chases and imports them back', () => {
    const stores = allStores()
    stores.chaseStore.saveChase(sampleChase())

    const bundle = buildSessionBundle(stores, { name: 'Chase Bundle' })
    expect(bundle.chases?.map(c => c.name)).toEqual(['Bundle Chase'])
    expect(previewSessionBundle(bundle).chases).toEqual(['Bundle Chase'])

    __resetChaseStore()
    localStorage.clear()
    const fresh = allStores()
    expect(fresh.chaseStore.state.savedChases).toHaveLength(0)
    const result = importSessionBundle(JSON.parse(JSON.stringify(bundle)), fresh)
    expect(result.chases).toBe(1)
    const imported = fresh.chaseStore.state.savedChases[0]
    expect(imported.name).toBe('Bundle Chase')
    expect(imported.obstacles.map(o => o.name)).toEqual(bundle.chases![0].obstacles.map(o => o.name))
    expect(imported.obstacles[0].options[0]).toMatchObject({ dc: 13, skills: ['Acrobatics'] })
  })

  it('leaves the key out when there are no chases', () => {
    expect(buildSessionBundle(allStores(), { name: 'Empty' }).chases).toBeUndefined()
  })

  it('warns instead of failing when the chase store is missing', () => {
    const { chaseStore, ...withoutChase } = allStores()
    chaseStore.saveChase(sampleChase())
    const bundle = buildSessionBundle({ ...withoutChase, chaseStore }, { name: 'Chase Bundle' })
    const result = importSessionBundle(JSON.parse(JSON.stringify(bundle)), withoutChase)
    expect(result.chases).toBe(0)
    expect(result.warnings.some(w => w.section === 'chases')).toBe(true)
  })

  it('fills in a hand-written chase with ids, sides, end conditions and sample obstacles', () => {
    const stores = allStores()
    const bundle = parseSessionBundle(`
name: Authored Chase
party:
  name: Crew
  players:
    - { name: A, level: 5 }
    - { name: B, level: 5 }
    - { name: C, level: 5 }
    - { name: D, level: 5 }
    - { name: E, level: 5 }
chases:
  - name: Dock Run
    type: run-away
    level: 5
    obstacles:
      - sampleId: crowd
      - name: Collapsing Gantry
        chasePoints: 2
        notes: The gantry is rigged to fall.
        options:
          - dc: 20
            skills: [Athletics]
            description: leap the gap
          - skills: [Arcana]
            description: levitate across
    sides:
      - name: The Crew
        role: pursued
        isPlayers: true
        members: [Peebles, Poppy]
      - name: Dock Security
        role: pursuer
        control: steady
        position: -1
`)
    const result = importSessionBundle(bundle, stores)
    expect(result.warnings.filter(w => w.section === 'chases')).toEqual([])
    expect(result.chases).toBe(1)
    const chase = stores.chaseStore.state.savedChases[0]
    expect(chase.id).toBeTruthy()
    expect(chase.roundLength).toBe('3 actions')
    expect(chase.length).toBe('custom')
    expect(chase.end).toEqual({ catchEnds: true, leadToEscape: 3, roundLimit: null })

    const [crowd, gantry] = chase.obstacles
    expect(crowd).toMatchObject({ name: 'Crowd', sampleId: 'crowd', chasePoints: 4, revealedToPlayers: false })
    expect(crowd.options.length).toBeGreaterThan(0)
    expect(gantry).toMatchObject({ name: 'Collapsing Gantry', level: 5, chasePoints: 2, environment: 'custom', description: '', notes: 'The gantry is rigged to fall.' })
    expect(gantry.options.map(o => o.id).every(Boolean)).toBe(true)
    expect(gantry.options[1].dc).toBeUndefined()

    const [crew, security] = chase.sides
    expect(crew).toMatchObject({ name: 'The Crew', role: 'pursued', control: 'checks', isPlayers: true, position: 0, chasePoints: 0, pace: 1, vehicles: [] })
    expect(crew.members.map(m => [m.name, m.hasActed])).toEqual([['Peebles', false], ['Poppy', false]])
    expect(security).toMatchObject({ control: 'steady', position: -1, isPlayers: false })
    expect(new Set(chase.sides.map(s => s.id)).size).toBe(2)
  })

  it('uses the default sides for the chase type when none are given', () => {
    const stores = allStores()
    const bundle = parseSessionBundle(JSON.stringify({ name: 'x', chases: [{ name: 'Race', type: 'competitive', obstacles: [{ sampleId: 'crowd' }] }] }))
    importSessionBundle(bundle, stores)
    const chase = stores.chaseStore.state.savedChases[0]
    expect(chase.sides.map(s => [s.name, s.role])).toEqual([['Party', 'competitor'], ['Rivals', 'competitor']])
  })
})

describe('session bundle: example YAML files', () => {
  beforeEach(() => {
    __resetTscStore()
    __resetChaseStore()
  })

  function allStores() {
    return {
      encounterStore: useEncounterStore(),
      partyStore: usePartyStore(),
      hackingStore: useHackingStore(),
      starshipStore: useStarshipStore(),
      shopStore: useShopStore(),
      tscStore: useTscStore(),
      chaseStore: useChaseStore(),
    }
  }

  function importExample(file: string) {
    const content = readFileSync(resolve(__dirname, '../../public/schemas/examples', file), 'utf8')
    const stores = allStores()
    const result = importSessionBundle(parseSessionBundle(content), stores as unknown as ImportStores)
    return { stores, result }
  }

  it('imports the tactical starship example without warnings', () => {
    const { stores, result } = importExample('tsc-encounter.example.yaml')
    expect(result.warnings).toEqual([])
    expect(result.tscPlayerShips).toBe(1)
    expect(result.tscScenes).toBe(1)
    const scene = stores.tscStore.state.savedScenes[0]
    expect(scene.playerShip?.name).toBe('Wanderer')
    expect(scene.npcShips.map(n => [n.label, n.hiddenFromPlayers])).toEqual([
      ['Raider Trident', false], ['Raider Trident 2', false], ['Unknown Contact', true],
    ])
    expect(scene.hazards.map(h => h.label)).toEqual(['Asteroid Field'])
  })

  it('imports the chase example without warnings', () => {
    const { stores, result } = importExample('chase.example.yaml')
    expect(result.warnings).toEqual([])
    expect(result.chases).toBe(1)
    const chase = stores.chaseStore.state.savedChases[0]
    expect(chase.length).toBe('short')
    expect(chase.obstacles.map(o => o.name)).toEqual([
      'Convention Crowd', 'Food Truck', 'Cargo Lift', 'Security Drone', 'Crumbling, Steep Fire Escape', 'Airlock 7',
    ])
    expect(chase.obstacles.map(o => o.chasePoints)).toEqual([3, 2, 3, 2, 3, 2])
    expect(chase.sides[0].members.map(m => m.name)).toEqual(['Peebles', 'Poppy', 'Alces', 'Basil'])
  })

  it('imports the session bundle example without tactical or chase warnings', () => {
    const { result } = importExample('session-bundle.example.yaml')
    expect(result.warnings.filter(w => w.section === 'tsc' || w.section === 'chases')).toEqual([])
    expect(result.tscScenes).toBe(1)
    expect(result.chases).toBe(1)
  })
})

describe('standalone tactical scene and chase files', () => {
  it('reads hand-written YAML tactical scenes, with any player ships in the same file', () => {
    const { scenes, playerShips, warnings } = parseTscScenesFile(`
tscPlayerShips:
  - ${JSON.stringify({ ...createPlayerStarship('explorer', 5, 'Wanderer'), id: 'wanderer' })}
tscScenes:
  - name: Picket
    playerShipId: wanderer
    npcShips:
      - starshipId: raider-trident
`, TSC_STARSHIPS, [])
    expect(warnings).toEqual([])
    expect(playerShips.map(p => p.id)).toEqual(['wanderer'])
    expect(scenes).toHaveLength(1)
    expect(scenes[0].playerShip?.name).toBe('Wanderer')
    expect(scenes[0].npcShips[0].model.id).toBe('raider-trident')
  })

  it('reads a plain array of exported tactical scenes', () => {
    const exported = [{ ...createEmptyTscScene(), name: 'Exported' }]
    const { scenes } = parseTscScenesFile(JSON.stringify(exported), TSC_STARSHIPS, [])
    expect(scenes.map(s => [s.id, s.name])).toEqual([[exported[0].id, 'Exported']])
  })

  it('reads hand-written YAML chases and exported chase files', () => {
    const yamlResult = parseChasesFile(`
chases:
  - name: Quick Run
    obstacles:
      - sampleId: crowd
      - sampleId: nope
`)
    expect(yamlResult.chases.map(c => c.name)).toEqual(['Quick Run'])
    expect(yamlResult.chases[0].obstacles).toHaveLength(2)
    expect(yamlResult.warnings).toEqual(['Unknown sample obstacle "nope" in chase "Quick Run"'])

    const exported = { version: 1, chases: [createEmptyChase('competitive')] }
    expect(parseChasesFile(JSON.stringify(exported)).chases[0].id).toBe(exported.chases[0].id)
    expect(parseChasesFile(JSON.stringify(exported.chases)).chases).toHaveLength(1)
  })

  it('rejects files with nothing to import', () => {
    expect(() => parseChasesFile('name: nothing here')).toThrow()
    expect(() => parseTscScenesFile('name: nothing here', TSC_STARSHIPS, [])).toThrow()
  })
})

describe('re-importing an edited YAML file', () => {
  beforeEach(() => {
    __resetTscStore()
    __resetChaseStore()
  })

  it('updates a chase and a tactical scene that carry an id instead of duplicating them', () => {
    const stores = {
      encounterStore: useEncounterStore(),
      partyStore: usePartyStore(),
      hackingStore: useHackingStore(),
      starshipStore: useStarshipStore(),
      shopStore: useShopStore(),
      tscStore: useTscStore(),
      chaseStore: useChaseStore(),
    }
    const write = (title: string) => parseSessionBundle(`
name: x
chases:
  - id: my-chase
    name: ${title}
    obstacles: [{ sampleId: crowd }]
tscScenes:
  - id: my-scene
    name: ${title}
`)
    importSessionBundle(write('First draft'), stores as unknown as ImportStores)
    importSessionBundle(write('Second draft'), stores as unknown as ImportStores)
    expect(stores.chaseStore.state.savedChases.map(c => c.name)).toEqual(['Second draft'])
    expect(stores.tscStore.state.savedScenes.map(s => s.name)).toEqual(['Second draft'])
  })
})
