import { describe, it, expect } from 'vitest'
import { useHackingStore } from '../stores/hackingStore'
import { useCombatStore } from '../stores/combatStore'
import { useStarshipStore } from '../stores/starshipStore'

// Regression: "a new link shows the old link's content". Each shared player
// session must get a fresh session id so a new link starts a clean session and
// can't inherit a prior session's retained state (BroadcastChannel / sync-worker
// Durable Object are keyed by session id).

function sessionFromUrl(url: string): string {
  const m = url.match(/[?&]session=([^&]+)/)
  return m ? m[1] : ''
}

describe('player session rotation', () => {
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
