// WebSocket client for real-time agent updates

import { WebSocketMessage, Position, Interaction } from './types'

export type WebSocketCallback = (message: WebSocketMessage) => void

export class DarkCityWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private callbacks: Set<WebSocketCallback> = new Set()

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[DarkCityWS] Already connected')
      return
    }

    console.log('[DarkCityWS] Connecting to', this.url)
    
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[DarkCityWS] Connected')
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.callbacks.forEach(callback => callback(message))
        } catch (error) {
          console.error('[DarkCityWS] Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[DarkCityWS] Error:', error)
      }

      this.ws.onclose = () => {
        console.log('[DarkCityWS] Disconnected')
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('[DarkCityWS] Connection failed:', error)
      this.attemptReconnect()
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DarkCityWS] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[DarkCityWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  subscribe(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[DarkCityWS] Cannot send message, not connected')
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Mock data generator for testing (when no WebSocket server available)
export function createMockDataStream(callback: WebSocketCallback): () => void {
  console.log('[MockData] Starting mock data stream')
  
  const agents = ['agent-001', 'agent-002', 'agent-003']
  let intervalId: NodeJS.Timeout

  const sendMockPosition = () => {
    const agentId = agents[Math.floor(Math.random() * agents.length)]
    const lat = 40.7340 + Math.random() * 0.036
    const lng = -74.0100 + Math.random() * 0.070
    
    const message: WebSocketMessage = {
      type: 'position',
      agentId,
      timestamp: Date.now(),
      data: {
        lat,
        lng,
        street: 'Neon Avenue',
        district: 'Chrome Valley',
        activity: 'Exploring the city',
      }
    }
    
    callback(message)
  }

  const sendMockInteraction = () => {
    const agentId = agents[Math.floor(Math.random() * agents.length)]
    const types = ['conversation', 'transaction', 'work', 'leisure']
    
    const message: WebSocketMessage = {
      type: 'interaction',
      agentId,
      timestamp: Date.now(),
      data: {
        type: types[Math.floor(Math.random() * types.length)],
        location: {
          lat: 40.7340 + Math.random() * 0.036,
          lng: -74.0100 + Math.random() * 0.070,
          street: 'Chrome Avenue',
          district: 'Neon Gardens',
        },
        details: 'Mock interaction event',
      }
    }
    
    callback(message)
  }

  // Send position updates every 3 seconds
  intervalId = setInterval(() => {
    sendMockPosition()
    
    // 30% chance of interaction
    if (Math.random() < 0.3) {
      sendMockInteraction()
    }
  }, 3000)

  // Return cleanup function
  return () => {
    console.log('[MockData] Stopping mock data stream')
    clearInterval(intervalId)
  }
}
