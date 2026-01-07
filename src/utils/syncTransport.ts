// WebSocket transport for cross-device hacking sync
// Handles connection, reconnection, and message passing

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

// Sync server URL from environment variable
// - Production: Set VITE_SYNC_SERVER_URL to your worker (e.g., https://your-sync-worker.workers.dev)
// - Development: Defaults to localhost:8787 (wrangler dev default port)
const DEFAULT_DEV_URL = 'http://localhost:8787'

function getEnvSyncUrl(): string | null {
  const envUrl = import.meta.env.VITE_SYNC_SERVER_URL as string | undefined
  if (envUrl) {
    return envUrl.replace(/\/$/, '') // Remove trailing slash
  }
  // In development mode, default to localhost
  if (import.meta.env.DEV) {
    return DEFAULT_DEV_URL
  }
  return null
}

let syncServerUrl: string | null = getEnvSyncUrl()

export function setSyncServerUrl(url: string): void {
  syncServerUrl = url.replace(/\/$/, '') // Remove trailing slash
  console.log('[SyncTransport] Server URL set to:', syncServerUrl)
}

export function getSyncServerUrl(): string | null {
  return syncServerUrl
}

export interface SyncMessage {
  type: string
  payload: unknown
}

export interface SyncTransport {
  state: ConnectionState
  connect(sessionId: string, role: 'gm' | 'player'): Promise<void>
  disconnect(): void
  send(message: SyncMessage): void
  onMessage: ((message: SyncMessage) => void) | null
  onStateChange: ((state: ConnectionState) => void) | null
}

class WebSocketTransport implements SyncTransport {
  private ws: WebSocket | null = null
  private sessionId: string | null = null
  private role: 'gm' | 'player' = 'player'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  state: ConnectionState = 'disconnected'
  onMessage: ((message: SyncMessage) => void) | null = null
  onStateChange: ((state: ConnectionState) => void) | null = null

  private getWsUrl(sessionId: string, role: string): string {
    // If a sync server URL is configured, use it
    if (syncServerUrl) {
      // Convert https:// to wss:// or http:// to ws://
      const wsUrl = syncServerUrl
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://')
      return `${wsUrl}/ws/${sessionId}?role=${role}`
    }

    // Fallback to same-origin (for local dev or if not configured)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws/${sessionId}?role=${role}`
  }

  async connect(sessionId: string, role: 'gm' | 'player'): Promise<void> {
    // Clean up any existing connection
    this.cleanup()

    this.sessionId = sessionId
    this.role = role
    this.setState('connecting')

    console.log('[SyncTransport] ========================================')
    console.log('[SyncTransport] Starting connection...')
    console.log('[SyncTransport] Session ID:', sessionId)
    console.log('[SyncTransport] Role:', role)
    console.log('[SyncTransport] Server URL:', syncServerUrl)

    return new Promise((resolve, reject) => {
      try {
        const url = this.getWsUrl(sessionId, role)
        console.log('[SyncTransport] WebSocket URL:', url)

        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('[SyncTransport] Connected as', role)
          this.setState('connected')
          this.reconnectAttempts = 0
          this.startPing()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SyncMessage

            // Ignore pong responses (keepalive)
            if (message.type === 'pong') return

            console.log('[SyncTransport] Received:', message.type)
            this.onMessage?.(message)
          } catch (e) {
            console.warn('[SyncTransport] Invalid message:', e)
          }
        }

        this.ws.onclose = (event) => {
          console.log('[SyncTransport] Connection closed:', event.code, event.reason)
          this.stopPing()

          // If we were connected, try to reconnect
          if (this.state === 'connected') {
            this.attemptReconnect()
          } else if (this.state === 'connecting') {
            // Connection failed during setup
            this.setState('error')
            reject(new Error(`WebSocket closed: ${event.reason || 'Unknown reason'}`))
          }
        }

        this.ws.onerror = (error) => {
          console.error('[SyncTransport] WebSocket error:', error)

          if (this.state === 'connecting') {
            this.setState('error')
            reject(error)
          }
        }
      } catch (e) {
        console.error('[SyncTransport] Failed to create WebSocket:', e)
        this.setState('error')
        reject(e)
      }
    })
  }

  disconnect(): void {
    console.log('[SyncTransport] Disconnecting')
    // Prevent reconnection attempts
    this.reconnectAttempts = this.maxReconnectAttempts
    this.cleanup()
    this.setState('disconnected')
  }

  send(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[SyncTransport] Cannot send - not connected')
    }
  }

  private cleanup(): void {
    this.stopPing()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      // Remove handlers to prevent callbacks
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.onopen = null

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state
      console.log('[SyncTransport] State changed to:', state)
      this.onStateChange?.(state)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[SyncTransport] Max reconnect attempts reached')
      this.setState('error')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[SyncTransport] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.setState('connecting')

    this.reconnectTimeout = setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId, this.role).catch(() => {
          // Will trigger another reconnect via onclose
        })
      }
    }, delay)
  }

  private startPing(): void {
    // Ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', payload: Date.now() })
      }
    }, 30000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}

// Singleton instance
let transport: SyncTransport | null = null

export function getSyncTransport(): SyncTransport {
  if (!transport) {
    transport = new WebSocketTransport()
  }
  return transport
}

// Reset transport (for testing or cleanup)
export function resetSyncTransport(): void {
  if (transport) {
    transport.disconnect()
    transport = null
  }
}

// Feature detection
export function isWebSocketSupported(): boolean {
  return typeof WebSocket !== 'undefined'
}

// Check if sync is available (WebSocket supported AND server configured)
export function isSyncAvailable(): boolean {
  return isWebSocketSupported() && syncServerUrl !== null
}
