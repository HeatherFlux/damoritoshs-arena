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

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  constructor(name: string) { this.name = name }
  postMessage(_data: unknown) {}
  close() {}
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
})
