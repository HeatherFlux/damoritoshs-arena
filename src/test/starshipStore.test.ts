import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub location before import (store has init side effects)
vi.stubGlobal('location', { ...window.location, hash: '' })

import { useStarshipStore } from '../stores/starshipStore'
import { createEmptySavedScene } from '../types/starship'
import type { StarshipThreat } from '../types/starship'

function makeThreat(overrides: Partial<StarshipThreat> = {}): StarshipThreat {
  return {
    id: 't1',
    name: 'Goblin Cruiser',
    type: 'enemy_ship',
    level: 1,
    maxHP: 30,
    currentHP: 30,
    maxShields: 10,
    currentShields: 10,
    shieldRegen: 2,
    ac: 14,
    isDefeated: false,
    ...overrides,
  }
}

describe('starshipStore', () => {
  let store: ReturnType<typeof useStarshipStore>

  beforeEach(() => {
    store = useStarshipStore()
    store.endScene()
    store.state.isGMView = true
    store.state.isRemoteSyncEnabled = false
    store.state.wsConnectionState = 'disconnected'
  })

  describe('unified player view helper', () => {
    it('exposes openPlayerView as an async function', () => {
      expect(typeof store.openPlayerView).toBe('function')
    })

    it('exposes isSyncAvailable', () => {
      expect(typeof store.isSyncAvailable).toBe('function')
    })

    it('generates share URL with sync param when enabled', () => {
      store.state.isRemoteSyncEnabled = true
      const url = store.generateShareUrl()
      expect(url).toContain('#/starship/view')
      expect(url).toContain('session=')
      expect(url).toContain('sync=ws')
    })

    it('generates share URL without sync param when disabled', () => {
      store.state.isRemoteSyncEnabled = false
      const url = store.generateShareUrl()
      expect(url).toContain('#/starship/view')
      expect(url).not.toContain('sync=ws')
    })
  })

  describe('remote sync API', () => {
    it('exposes remote sync functions', () => {
      expect(typeof store.enableRemoteSync).toBe('function')
      expect(typeof store.joinRemoteSession).toBe('function')
      expect(typeof store.disableRemoteSync).toBe('function')
      expect(typeof store.hasRemoteSyncInUrl).toBe('function')
    })

    it('starts disconnected', () => {
      expect(store.state.isRemoteSyncEnabled).toBe(false)
      expect(store.state.wsConnectionState).toBe('disconnected')
    })

    it('disableRemoteSync clears state', () => {
      store.state.isRemoteSyncEnabled = true
      store.state.wsConnectionState = 'connected'
      store.disableRemoteSync()
      expect(store.state.isRemoteSyncEnabled).toBe(false)
      expect(store.state.wsConnectionState).toBe('disconnected')
    })
  })

  // Regression: damageThreat used to apply damage straight to currentHP,
  // skipping the threat's shields entirely. damageStarship has always
  // done shields-then-HP, and during scene setup StarshipPanel's local
  // damageThreat helper does too — the store was the odd one out, which
  // meant shielded enemy ships effectively had no shields once a scene
  // started running.
  describe('damageThreat shield handling', () => {
    function startSceneWith(threats: StarshipThreat[]) {
      const saved = createEmptySavedScene()
      saved.threats = threats
      store.startScene(saved)
    }

    it('absorbs damage with shields before HP', () => {
      startSceneWith([makeThreat({ maxShields: 10, currentShields: 10, maxHP: 30, currentHP: 30 })])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 6)

      const t = store.state.activeScene!.threats[0]
      expect(t.currentShields).toBe(4)
      expect(t.currentHP).toBe(30)
      expect(t.isDefeated).toBe(false)
    })

    it('overflows shield damage into HP', () => {
      startSceneWith([makeThreat({ maxShields: 10, currentShields: 10, maxHP: 30, currentHP: 30 })])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 15)

      const t = store.state.activeScene!.threats[0]
      expect(t.currentShields).toBe(0)
      expect(t.currentHP).toBe(25)
      expect(t.isDefeated).toBe(false)
    })

    it('marks the threat defeated when HP reaches 0', () => {
      startSceneWith([makeThreat({ maxShields: 5, currentShields: 5, maxHP: 10, currentHP: 10 })])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 100)

      const t = store.state.activeScene!.threats[0]
      expect(t.currentShields).toBe(0)
      expect(t.currentHP).toBe(0)
      expect(t.isDefeated).toBe(true)
    })

    it('still works for threats without shields', () => {
      startSceneWith([
        makeThreat({ maxShields: undefined, currentShields: undefined, maxHP: 20, currentHP: 20 }),
      ])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 7)

      const t = store.state.activeScene!.threats[0]
      expect(t.currentShields).toBeUndefined()
      expect(t.currentHP).toBe(13)
    })

    it('does not touch HP when shields fully absorb the hit', () => {
      startSceneWith([makeThreat({ maxShields: 10, currentShields: 10, maxHP: 30, currentHP: 30 })])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 10)

      const t = store.state.activeScene!.threats[0]
      expect(t.currentShields).toBe(0)
      expect(t.currentHP).toBe(30)
    })

    it('treats negative or zero damage as a no-op (does not heal past max)', () => {
      // startScene resets currentShields/HP to max via createSceneFromSaved,
      // so we damage first to a known mid-fight state, then verify that
      // negative/zero damage doesn't push values back above their starting
      // points.
      startSceneWith([makeThreat({ maxShields: 10, maxHP: 30 })])
      const id = store.state.activeScene!.threats[0].id

      store.damageThreat(id, 5) // shields: 10 -> 5
      store.damageThreat(id, 12) // shields: 5 -> 0, HP: 30 -> 23

      const before = { ...store.state.activeScene!.threats[0] }

      store.damageThreat(id, -7)
      store.damageThreat(id, 0)

      const after = store.state.activeScene!.threats[0]
      expect(after.currentShields).toBe(before.currentShields)
      expect(after.currentHP).toBe(before.currentHP)
      expect(after.currentShields).toBeLessThanOrEqual(10)
      expect(after.currentHP).toBeLessThanOrEqual(30)
    })
  })

  // damageStarship is the canonical reference implementation, but a few
  // edge cases were never exercised: negative damage previously caused
  // shields and HP to climb above their maxima.
  describe('damageStarship edge cases', () => {
    function startBasicScene() {
      const saved = createEmptySavedScene()
      saved.starship.maxHP = 30
      saved.starship.currentHP = 30
      saved.starship.maxShields = 10
      saved.starship.currentShields = 10
      store.startScene(saved)
    }

    it('does not heal past max when given negative damage', () => {
      startBasicScene()

      store.damageStarship(-50)

      const ship = store.state.activeScene!.starship
      expect(ship.currentShields).toBeLessThanOrEqual(10)
      expect(ship.currentHP).toBeLessThanOrEqual(30)
    })

    it('handles zero damage as a no-op', () => {
      startBasicScene()

      store.damageStarship(0)

      const ship = store.state.activeScene!.starship
      expect(ship.currentShields).toBe(10)
      expect(ship.currentHP).toBe(30)
    })
  })

  // VP clamping: setVP(-5) clamps to 0 but addVP(-99) used to silently push
  // currentVP negative, which the UI then displayed as "-94 / 5 VP".
  describe('VP clamping', () => {
    function startBasicScene() {
      const saved = createEmptySavedScene()
      saved.victoryCondition = 'victory_points'
      saved.vpRequired = 5
      store.startScene(saved)
    }

    it('does not let addVP push currentVP below zero', () => {
      startBasicScene()
      store.addVP(2)
      expect(store.state.activeScene!.currentVP).toBe(2)

      store.addVP(-99)

      expect(store.state.activeScene!.currentVP).toBeGreaterThanOrEqual(0)
    })

    // VP tracker UX bug: the +/- buttons used to be hidden unless the scene's
    // victoryCondition was 'victory_points'. addVP itself doesn't gate on
    // condition, so the store-side behavior should hold for any scene type
    // (escape, survival, custom — all of which can use VPs as a side meter).
    it('addVP works regardless of victoryCondition', () => {
      const saved = createEmptySavedScene()
      saved.victoryCondition = 'defeat'
      store.startScene(saved)

      store.addVP(3)
      expect(store.state.activeScene!.currentVP).toBe(3)

      store.addVP(-1)
      expect(store.state.activeScene!.currentVP).toBe(2)
    })
  })

  // Threat shield regen: the bug report said "threat shields don't
  // regenerate". The logic is correct — regenerateShields() iterates threats
  // and tops them up by shieldRegen each round — so this is a regression
  // guard so the behavior doesn't break when we revisit the runner UI.
  describe('threat shield regeneration', () => {
    it('regenerates threat shields up to maxShields', () => {
      const saved = createEmptySavedScene()
      saved.threats = [makeThreat({ maxShields: 10, shieldRegen: 3 })]
      store.startScene(saved)
      const id = store.state.activeScene!.threats[0].id
      // startScene resets currentShields to maxShields, so damage first.
      store.damageThreat(id, 6) // shields 10 -> 4

      store.regenerateShields()

      const t = store.state.activeScene!.threats.find(x => x.id === id)!
      expect(t.currentShields).toBe(7)
    })

    it('caps regen at maxShields', () => {
      const saved = createEmptySavedScene()
      saved.threats = [makeThreat({ maxShields: 10, shieldRegen: 5 })]
      store.startScene(saved)
      const id = store.state.activeScene!.threats[0].id
      store.damageThreat(id, 2) // shields 10 -> 8

      store.regenerateShields()

      expect(store.state.activeScene!.threats[0].currentShields).toBe(10)
    })

    it('skips defeated threats', () => {
      const saved = createEmptySavedScene()
      saved.threats = [makeThreat({ maxShields: 10, maxHP: 10, shieldRegen: 5 })]
      store.startScene(saved)
      const id = store.state.activeScene!.threats[0].id
      // Damage past shields and HP to mark it defeated.
      store.damageThreat(id, 999)
      expect(store.state.activeScene!.threats[0].isDefeated).toBe(true)

      store.regenerateShields()

      expect(store.state.activeScene!.threats[0].currentShields).toBe(0)
    })

    it('advanceRound triggers regen for both PC ship and threats', () => {
      const saved = createEmptySavedScene()
      saved.starship.maxShields = 20
      saved.starship.shieldRegen = 4
      saved.threats = [makeThreat({ maxShields: 10, shieldRegen: 3 })]
      store.startScene(saved)
      const id = store.state.activeScene!.threats[0].id
      // Bring both below max so regen has somewhere to go.
      store.damageStarship(15) // PC shields 20 -> 5
      store.damageThreat(id, 8) // threat shields 10 -> 2

      store.advanceRound()

      expect(store.state.activeScene!.starship.currentShields).toBe(9)
      expect(store.state.activeScene!.threats[0].currentShields).toBe(5)
    })
  })

  // Reference-sharing regressions: shallow spreads in saveScene and
  // createSceneFromSaved meant that mutating the running scene's
  // starshipActions / threats / actionLog quietly mutated the saved
  // template too, so a "saved" template would drift over the course of
  // play.
  describe('save/load reference independence', () => {
    it('saveScene returns a deep clone independent of the input', () => {
      const setup = createEmptySavedScene()
      setup.threats = [makeThreat({ id: 't1', name: 'Original' })]
      setup.starshipActions = [{
        id: 'act1',
        name: 'Strike',
        actionCost: 2,
        role: 'gunner',
        skills: [],
        description: '',
        outcomes: { criticalSuccess: '', success: '' },
      }]

      const saved = store.saveScene(setup)

      // Mutate the source after saving — the saved copy should be unaffected.
      setup.threats[0].name = 'Mutated'
      setup.starshipActions[0].name = 'Mutated Strike'
      setup.starshipActions[0].outcomes.success = 'Mutated outcome'

      expect(saved.threats[0].name).toBe('Original')
      expect(saved.starshipActions[0].name).toBe('Strike')
      expect(saved.starshipActions[0].outcomes.success).toBe('')
    })

    it('startScene does not let runtime edits leak back into the saved template', () => {
      const saved = createEmptySavedScene()
      saved.id = 'scene1'
      saved.threats = [makeThreat({ id: 't1', name: 'Saved Threat', maxHP: 30, currentHP: 30 })]
      saved.starshipActions = [{
        id: 'act1',
        name: 'Saved Action',
        actionCost: 2,
        role: 'any',
        skills: [],
        description: '',
        outcomes: { criticalSuccess: '', success: '' },
      }]
      store.state.savedScenes.push(saved)

      // Start the scene from the saved template.
      const scene = store.startScene(saved)

      // Simulate runtime mutations on the active scene.
      scene.threats[0].name = 'Renamed Mid-Combat'
      scene.starshipActions[0].name = 'Renamed Mid-Combat'
      scene.starshipActions[0].outcomes.success = 'New outcome'
      scene.actionLog.push({
        id: 'log1',
        round: 1,
        timestamp: Date.now(),
        roleId: 'gunner',
        playerName: 'Test',
        actionName: 'Saved Action',
        result: 'success',
      })

      // Saved template must remain pristine.
      expect(saved.threats[0].name).toBe('Saved Threat')
      expect(saved.starshipActions[0].name).toBe('Saved Action')
      expect(saved.starshipActions[0].outcomes.success).toBe('')
      // Saved template never had an actionLog field at all.
      expect((saved as unknown as { actionLog?: unknown }).actionLog).toBeUndefined()
    })
  })

  // Reusable starship template library — save a ship config once and load
  // it into any scene, with optional campaign continuity carrying damage
  // forward between encounters.
  describe('starship template library', () => {
    function makeShip(overrides: Partial<{
      id: string; name: string; level: number; ac: number; fortitude: number;
      reflex: number; maxHP: number; currentHP: number; maxShields: number;
      currentShields: number; shieldRegen: number; bonuses: Record<string, number>
    }> = {}) {
      return {
        id: 's1',
        name: 'The Brassbound',
        level: 5,
        ac: 22,
        fortitude: 12,
        reflex: 14,
        maxHP: 80,
        currentHP: 80,
        maxShields: 20,
        currentShields: 20,
        shieldRegen: 5,
        bonuses: { Piloting: 2 },
        ...overrides,
      }
    }

    beforeEach(() => {
      // Wipe any persisted templates from a previous test.
      store.state.savedStarships = []
    })

    it('saves a new template with a fresh id', () => {
      const saved = store.saveStarshipTemplate({
        name: 'Brassbound',
        starship: makeShip(),
      })
      expect(saved.id).toBeTruthy()
      expect(saved.name).toBe('Brassbound')
      expect(saved.starship.templateId).toBe(saved.id)
      expect(store.state.savedStarships).toHaveLength(1)
    })

    it('updates an existing template when id is provided', () => {
      const first = store.saveStarshipTemplate({ name: 'A', starship: makeShip() })
      const second = store.saveStarshipTemplate({
        id: first.id,
        name: 'B',
        starship: makeShip({ ac: 24 }),
      })
      expect(store.state.savedStarships).toHaveLength(1)
      expect(second.id).toBe(first.id)
      expect(second.name).toBe('B')
      expect(second.starship.ac).toBe(24)
    })

    it('loadStarshipTemplate returns full HP/Shields for non-campaign ships', () => {
      const saved = store.saveStarshipTemplate({
        name: 'Loaner',
        starship: makeShip({ currentHP: 12, currentShields: 3 }),
        // isCampaignShip defaults to false
      })
      const loaded = store.loadStarshipTemplate(saved.id)!
      expect(loaded.currentHP).toBe(loaded.maxHP)
      expect(loaded.currentShields).toBe(loaded.maxShields)
      expect(loaded.templateId).toBe(saved.id)
    })

    it('loadStarshipTemplate preserves persisted HP/Shields for campaign ships', () => {
      const saved = store.saveStarshipTemplate({
        name: 'Campaign Ship',
        starship: makeShip({ currentHP: 12, currentShields: 3 }),
        isCampaignShip: true,
      })
      const loaded = store.loadStarshipTemplate(saved.id)!
      expect(loaded.currentHP).toBe(12)
      expect(loaded.currentShields).toBe(3)
    })

    it('deletes a template', () => {
      const a = store.saveStarshipTemplate({ name: 'A', starship: makeShip() })
      const b = store.saveStarshipTemplate({ name: 'B', starship: makeShip({ id: 's2' }) })
      store.deleteStarshipTemplate(a.id)
      expect(store.state.savedStarships).toHaveLength(1)
      expect(store.state.savedStarships[0].id).toBe(b.id)
    })

    it('renameStarshipTemplate updates the name without rebuilding', () => {
      const saved = store.saveStarshipTemplate({ name: 'Old', starship: makeShip() })
      store.renameStarshipTemplate(saved.id, 'New')
      expect(store.state.savedStarships[0].name).toBe('New')
    })

    it('exports and imports templates round-trip', () => {
      store.saveStarshipTemplate({ name: 'A', starship: makeShip() })
      store.saveStarshipTemplate({ name: 'B', starship: makeShip({ id: 's2' }) })
      const json = store.exportStarshipTemplates()
      store.state.savedStarships = []
      store.importStarshipTemplates(json)
      expect(store.state.savedStarships).toHaveLength(2)
      const names = store.state.savedStarships.map(s => s.name).sort()
      expect(names).toEqual(['A', 'B'])
    })
  })

  // Campaign continuity: when a scene's ship is linked to a campaign-flagged
  // template, post-scene HP/Shields persist back so the next encounter starts
  // from the post-damage state.
  describe('campaign continuity', () => {
    beforeEach(() => {
      store.state.savedStarships = []
    })

    it('persists ship damage to a campaign template on endScene', () => {
      const template = store.saveStarshipTemplate({
        name: 'Voyager',
        starship: {
          id: 's1', name: 'Voyager', level: 5,
          ac: 22, fortitude: 12, reflex: 14,
          maxHP: 80, currentHP: 80,
          maxShields: 20, currentShields: 20,
          shieldRegen: 5, bonuses: {},
        },
        isCampaignShip: true,
      })

      const saved = createEmptySavedScene()
      saved.starship = store.loadStarshipTemplate(template.id)!
      store.startScene(saved)
      // Take a beating mid-scene.
      store.damageStarship(35) // shields 20→0, HP 80→65
      store.endScene()

      const persisted = store.state.savedStarships.find(t => t.id === template.id)!
      expect(persisted.starship.currentHP).toBe(65)
      expect(persisted.starship.currentShields).toBe(0)
      // Max values must not be touched.
      expect(persisted.starship.maxHP).toBe(80)
      expect(persisted.starship.maxShields).toBe(20)
    })

    it('does not persist damage for non-campaign templates', () => {
      const template = store.saveStarshipTemplate({
        name: 'Loaner',
        starship: {
          id: 's1', name: 'Loaner', level: 5,
          ac: 22, fortitude: 12, reflex: 14,
          maxHP: 80, currentHP: 80,
          maxShields: 20, currentShields: 20,
          shieldRegen: 5, bonuses: {},
        },
        isCampaignShip: false,
      })

      const saved = createEmptySavedScene()
      saved.starship = store.loadStarshipTemplate(template.id)!
      store.startScene(saved)
      store.damageStarship(40)
      store.endScene()

      const persisted = store.state.savedStarships.find(t => t.id === template.id)!
      expect(persisted.starship.currentHP).toBe(80)
      expect(persisted.starship.currentShields).toBe(20)
    })

    it('campaign ship resumes damage at next startScene', () => {
      const template = store.saveStarshipTemplate({
        name: 'Voyager',
        starship: {
          id: 's1', name: 'Voyager', level: 5,
          ac: 22, fortitude: 12, reflex: 14,
          maxHP: 80, currentHP: 80,
          maxShields: 20, currentShields: 20,
          shieldRegen: 5, bonuses: {},
        },
        isCampaignShip: true,
      })

      // First scene: take damage and end.
      const scene1 = createEmptySavedScene()
      scene1.starship = store.loadStarshipTemplate(template.id)!
      store.startScene(scene1)
      store.damageStarship(35)
      store.endScene()

      // Second scene: load fresh from the same template; HP/Shields should
      // start at the post-scene-1 state, not full.
      const scene2 = createEmptySavedScene()
      scene2.starship = store.loadStarshipTemplate(template.id)!
      store.startScene(scene2)

      expect(store.state.activeScene!.starship.currentHP).toBe(65)
      expect(store.state.activeScene!.starship.currentShields).toBe(0)
    })
  })
})
