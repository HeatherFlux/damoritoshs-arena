// Test setup for Vitest + happy-dom

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock BroadcastChannel — postMessage runs structuredClone so the mock
// matches real-browser semantics. The previous no-op mock silently
// hid bugs where stores broadcast Vue reactive proxies (which throw
// DataCloneError under real BroadcastChannel.postMessage). Caught the
// nextTurn-doesn't-reset-initiative bug from session-13 testing.
//
// Messages are now actually DELIVERED to other open channels of the same
// name, which is what makes session isolation testable at all (the old mock
// dropped every message, so a store could broadcast to a stale session id
// forever and no test could see it). Semantics that matter:
//   - a channel never receives its own postMessage (matches the real API)
//   - close() stops both sending and receiving
//   - delivery is synchronous; the real API queues a task, but sync keeps
//     assertions deterministic without awaiting a tick
const channelRegistry = new Map<string, Set<MockBroadcastChannel>>()

class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  closed = false

  constructor(name: string) {
    this.name = name
    let peers = channelRegistry.get(name)
    if (!peers) {
      peers = new Set()
      channelRegistry.set(name, peers)
    }
    peers.add(this)
  }

  postMessage(data: unknown) {
    // Throws DataCloneError on Vue reactive proxies, exactly like the real API.
    const cloned = structuredClone(data)
    if (this.closed) return
    const peers = channelRegistry.get(this.name)
    if (!peers) return
    for (const peer of peers) {
      if (peer === this || peer.closed) continue
      peer.onmessage?.({ data: structuredClone(cloned) } as MessageEvent)
    }
  }

  close() {
    this.closed = true
    channelRegistry.get(this.name)?.delete(this)
  }
}

Object.defineProperty(globalThis, 'BroadcastChannel', { value: MockBroadcastChannel })

// Mock sessionStorage (same pattern as localStorage)
const sessionStore: Record<string, string> = {}
const sessionStorageMock = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, value: string) => { sessionStore[key] = value },
  removeItem: (key: string) => { delete sessionStore[key] },
  clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]) },
  get length() { return Object.keys(sessionStore).length },
  key: (i: number) => Object.keys(sessionStore)[i] ?? null,
}

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

// Mock crypto.randomUUID
let uuidCounter = 0
const cryptoMock = {
  randomUUID: () => `00000000-0000-0000-0000-${String(++uuidCounter).padStart(12, '0')}`,
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
    return arr
  },
}

Object.defineProperty(globalThis, 'crypto', { value: cryptoMock, writable: true })

// Reset localStorage, sessionStorage, and counters between tests
import { beforeEach } from 'vitest'
beforeEach(() => {
  localStorageMock.clear()
  sessionStorageMock.clear()
  uuidCounter = 0
  // Drop every open channel. uuidCounter resets too, so without this a
  // listener from a previous test could be re-issued the same session id and
  // start receiving the next test's traffic.
  for (const peers of channelRegistry.values()) {
    for (const peer of peers) peer.closed = true
  }
  channelRegistry.clear()
})
