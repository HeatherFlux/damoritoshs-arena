import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub location before import (these stores have init side effects on import)
vi.stubGlobal('location', { ...window.location, hash: '' })

import { useHackingStore } from '../stores/hackingStore'
import { useCombatStore } from '../stores/combatStore'
import { useStarshipStore } from '../stores/starshipStore'
import { createEmptySavedScene } from '../types/starship'
import type { Computer } from '../types/hacking'

// Regression: "a new share link shows the old link's content". Each shared
// player session must get a fresh session id, because both the same-device
// BroadcastChannel and the sync-worker Durable Object are keyed by session id.
// Reusing the id dropped joining players into a room that still had the
// previous scene's history in it.
//
// Two things have to hold, and only the second one is the actual bug:
//   1. openPlayerView() mints a new session id every time.
//   2. Rooms are disjoint — after a new share, GM traffic no longer reaches
//      anyone still listening on the old session, and does reach the new one.
// A test for (1) alone passes even if the store keeps broadcasting to the old
// channel forever, which is exactly the failure we shipped.

function sessionFromUrl(url: string): string {
  const m = url.match(/[?&]session=([^&]+)/)
  return m ? m[1] : ''
}

function makeComputer(name: string): Computer {
  return {
    id: `computer-${name}`,
    name,
    level: 1,
    type: 'tech',
    accessPoints: [],
  } as Computer
}

/** Records every message delivered to a session's channel, like a player tab. */
function spyOnSession(channelName: string) {
  const channel = new BroadcastChannel(channelName)
  const messages: Array<{ type: string; payload: any }> = []
  channel.onmessage = (event) => messages.push(event.data)
  return {
    messages,
    close: () => channel.close(),
    /** Names carried by 'computer' / 'scene-update' style payloads. */
    payloadNames: () => messages.map((m) => m.payload?.name).filter(Boolean),
  }
}

describe('player session rotation', () => {
  beforeEach(() => {
    // openPlayerView copies to the clipboard and opens a tab; neither exists
    // meaningfully in happy-dom, and neither is what we're testing.
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('fresh session id per share', () => {
    it('hacking: rotateSession mints a new, non-empty session id each call', () => {
      const store = useHackingStore()
      store.rotateSession()
      const a = store.state.sessionId
      store.rotateSession()
      const b = store.state.sessionId
      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
      expect(a).not.toBe(b)
    })

    it('starship: rotateSession mints a new, non-empty session id each call', () => {
      const store = useStarshipStore()
      store.rotateSession()
      const a = store.state.sessionId
      store.rotateSession()
      const b = store.state.sessionId
      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
      expect(a).not.toBe(b)
    })

    it('combat: rotateCombatSession changes the id embedded in the share URL', () => {
      const store = useCombatStore()
      store.rotateCombatSession()
      const a = sessionFromUrl(store.generateCombatShareUrl())
      store.rotateCombatSession()
      const b = sessionFromUrl(store.generateCombatShareUrl())
      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
      expect(a).not.toBe(b)
    })
  })

  // The bug itself. Combat is absent here on purpose: its BroadcastChannel name
  // is a fixed constant (SYNC_CHANNEL), not session-keyed, so only its
  // WebSocket session id rotates — covered by the share-URL test above.
  describe('room isolation after a new share', () => {
    it('hacking: the old session goes silent and the new one gets current content', async () => {
      const store = useHackingStore()
      store.setGMView(true)
      // A real GM tab already has a channel open before it ever shares a link.
      // Without this the pre-fix code has no channel at all and the test would
      // fail for the wrong reason (nothing broadcast anywhere, rather than
      // broadcast to the wrong room).
      store.ensureChannel()

      await store.openPlayerView()
      const firstSession = store.state.sessionId
      const firstPlayer = spyOnSession(`sf2e-hacking-${firstSession}`)

      store.loadComputer(makeComputer('ALPHA'))
      // Sanity check on the harness: without this, a silent old session below
      // would prove nothing (it could just mean the wiring never worked).
      expect(firstPlayer.payloadNames()).toContain('ALPHA')

      // GM shares a fresh link for the next scene.
      await store.openPlayerView()
      const secondSession = store.state.sessionId
      expect(secondSession).not.toBe(firstSession)
      const secondPlayer = spyOnSession(`sf2e-hacking-${secondSession}`)

      firstPlayer.messages.length = 0
      store.loadComputer(makeComputer('BRAVO'))

      // Before the fix, BRAVO and every later update kept landing on the first
      // session's channel, so the old player view stayed live.
      expect(firstPlayer.messages).toEqual([])
      expect(secondPlayer.payloadNames()).toContain('BRAVO')
      // And nothing from the previous scene bleeds into the new room.
      expect(secondPlayer.payloadNames()).not.toContain('ALPHA')

      firstPlayer.close()
      secondPlayer.close()
    })

    it('starship: the old session goes silent and the new one gets current content', async () => {
      const store = useStarshipStore()
      store.setGMView(true)
      // See the hacking case above — a real GM tab already has a channel open.
      store.ensureChannel()

      await store.openPlayerView()
      const firstSession = store.state.sessionId
      const firstPlayer = spyOnSession(`sf2e-starship-${firstSession}`)

      const alpha = createEmptySavedScene()
      alpha.name = 'ALPHA'
      store.startScene(alpha)
      expect(firstPlayer.payloadNames()).toContain('ALPHA')

      await store.openPlayerView()
      const secondSession = store.state.sessionId
      expect(secondSession).not.toBe(firstSession)
      const secondPlayer = spyOnSession(`sf2e-starship-${secondSession}`)

      firstPlayer.messages.length = 0
      const bravo = createEmptySavedScene()
      bravo.name = 'BRAVO'
      store.startScene(bravo)

      expect(firstPlayer.messages).toEqual([])
      expect(secondPlayer.payloadNames()).toContain('BRAVO')
      expect(secondPlayer.payloadNames()).not.toContain('ALPHA')

      firstPlayer.close()
      secondPlayer.close()
    })
  })
})
