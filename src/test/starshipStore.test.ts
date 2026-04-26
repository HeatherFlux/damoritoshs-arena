import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub location before import (store has init side effects)
vi.stubGlobal('location', { ...window.location, hash: '' })

import { useStarshipStore } from '../stores/starshipStore'

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
})
