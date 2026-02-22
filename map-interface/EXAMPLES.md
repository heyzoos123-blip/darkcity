# DARKCITY Map Interface - Examples

Code examples for common customizations and integrations.

## Table of Contents
1. [Adding Custom Districts](#adding-custom-districts)
2. [Creating Custom Landmarks](#creating-custom-landmarks)
3. [Custom Marker Icons](#custom-marker-icons)
4. [WebSocket Integration](#websocket-integration)
5. [Custom Styling](#custom-styling)
6. [Event Handlers](#event-handlers)
7. [Data Filtering](#data-filtering)
8. [Analytics Integration](#analytics-integration)

---

## Adding Custom Districts

### Example: Tech District

```typescript
// lib/mapData.ts

DISTRICTS.push({
  id: 'silicon-peaks',
  name: 'Silicon Peaks',
  description: 'AI research and quantum computing hub',
  bounds: [
    [40.7700, -73.9400],
    [40.7700, -73.9250],
    [40.7580, -73.9250],
    [40.7580, -73.9400],
  ],
  color: '#00F0FF', // Neon blue
  characteristics: ['Research', 'High-Tech', 'Secure'],
})
```

### Example: Underground District

```typescript
DISTRICTS.push({
  id: 'deep-net',
  name: 'Deep Net',
  description: 'Hidden servers and darknet access points',
  bounds: [
    [40.7340, -74.0100],
    [40.7340, -73.9900],
    [40.7220, -73.9900],
    [40.7220, -74.0100],
  ],
  color: '#8B00FF', // Dark purple
  characteristics: ['Anonymous', 'Encrypted', 'Dangerous'],
})
```

---

## Creating Custom Landmarks

### Example: Megacorporation HQ

```typescript
// lib/mapData.ts

LANDMARKS.push({
  id: 'neurocorp-tower',
  name: 'NeuroCorp Tower',
  type: 'corporate',
  location: {
    lat: 40.7650,
    lng: -73.9875,
    street: 'Binary Avenue',
    district: 'Chrome Valley',
  },
  description: 'Neural interface development, 500 floors',
  icon: '🧠',
})
```

### Example: Secret Club

```typescript
LANDMARKS.push({
  id: 'phantom-club',
  name: 'The Phantom',
  type: 'club',
  location: {
    lat: 40.7480,
    lng: -74.0050,
    street: 'Shadow Avenue',
    district: 'Shadow Market',
  },
  description: 'Invitation-only, hidden entrance',
  icon: '👻',
})
```

### Example: Transit Hub

```typescript
LANDMARKS.push({
  id: 'quantum-gate',
  name: 'Quantum Gate',
  type: 'transit',
  location: {
    lat: 40.7500,
    lng: -73.9800,
    street: 'Data Highway',
    district: 'Binary District',
  },
  description: 'Instant teleportation pods',
  icon: '⚡',
})
```

---

## Custom Marker Icons

### Example: Animated Marker

```typescript
// components/CustomMarkers.tsx

import L from 'leaflet'

export const createAnimatedIcon = (emoji: string, color: string) => {
  return L.divIcon({
    className: 'animated-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50%;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.75;
        "></div>
        <div style="
          position: relative;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50%;
          border: 3px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 20px ${color};
        ">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  })
}

// CSS for animation
const styles = `
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
`
```

### Example: Status-Based Marker

```typescript
export const createStatusIcon = (status: AgentStatus) => {
  const config = {
    active: { color: '#39ff14', emoji: '🟢' },
    idle: { color: '#ffd700', emoji: '🟡' },
    offline: { color: '#666', emoji: '⚫' },
    traveling: { color: '#ff10f0', emoji: '🚀' },
  }
  
  const { color, emoji } = config[status]
  
  return L.divIcon({
    className: 'status-marker',
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid #000;
        box-shadow: 0 0 15px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })
}
```

---

## WebSocket Integration

### Example: Node.js WebSocket Server

```javascript
// server/production-ws-server.js

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })

const agentData = new Map() // Store agent states

wss.on('connection', (ws) => {
  console.log('Client connected')
  
  // Send initial state
  agentData.forEach((agent, agentId) => {
    ws.send(JSON.stringify({
      type: 'position',
      agentId,
      timestamp: Date.now(),
      data: agent,
    }))
  })
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      handleClientMessage(data, ws)
    } catch (error) {
      console.error('Invalid message:', error)
    }
  })
  
  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

function handleClientMessage(data, ws) {
  // Handle incoming messages from agents
  if (data.type === 'register') {
    agentData.set(data.agentId, data.initialState)
  }
}

// Broadcast agent updates
function broadcastAgentUpdate(agentId, update) {
  const message = {
    type: 'position',
    agentId,
    timestamp: Date.now(),
    data: update,
  }
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}

// Export for use in your agent system
module.exports = { broadcastAgentUpdate }
```

### Example: Python WebSocket Server

```python
# server/ws_server.py

import asyncio
import websockets
import json
from datetime import datetime

connected_clients = set()
agent_data = {}

async def handler(websocket):
    connected_clients.add(websocket)
    
    # Send initial state
    for agent_id, agent in agent_data.items():
        await websocket.send(json.dumps({
            'type': 'position',
            'agentId': agent_id,
            'timestamp': int(datetime.now().timestamp() * 1000),
            'data': agent
        }))
    
    try:
        async for message in websocket:
            data = json.loads(message)
            # Handle incoming messages
    finally:
        connected_clients.remove(websocket)

async def broadcast_update(agent_id, update):
    message = json.dumps({
        'type': 'position',
        'agentId': agent_id,
        'timestamp': int(datetime.now().timestamp() * 1000),
        'data': update
    })
    
    await asyncio.gather(
        *[client.send(message) for client in connected_clients],
        return_exceptions=True
    )

async def main():
    async with websockets.serve(handler, "localhost", 3001):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Custom Styling

### Example: Custom Theme

```css
/* styles/custom-theme.css */

:root {
  /* Matrix green theme */
  --neon-green: #00ff41;
  --neon-pink: #00ff41;
  --neon-blue: #008f11;
  --neon-gold: #00ff41;
  --dark-bg: #000000;
  --dark-panel: #001100;
  --dark-card: #002200;
}

.darkcity-map-container {
  background: radial-gradient(circle at center, #001a00 0%, #000000 100%);
}

/* Rain effect */
.darkcity-map::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(transparent 0%, rgba(0, 255, 65, 0.1) 100%);
  animation: rain 0.5s linear infinite;
  pointer-events: none;
}

@keyframes rain {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
```

### Example: Glassmorphism UI

```css
/* styles/glass-theme.css */

.map-controls {
  background: rgba(15, 15, 26, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(57, 255, 20, 0.2);
}

.agent-card {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(57, 255, 20, 0.1);
}

.stats-panel {
  background: rgba(15, 15, 26, 0.8);
  backdrop-filter: blur(15px);
}
```

---

## Event Handlers

### Example: Click Handler

```typescript
// components/DarkCityMap.tsx

import { useMapEvents } from 'react-leaflet'

function MapClickHandler() {
  useMapEvents({
    click: (e) => {
      console.log('Clicked at:', e.latlng)
      const district = getDistrictByCoords(e.latlng.lat, e.latlng.lng)
      if (district) {
        alert(`You clicked in ${district.name}!`)
      }
    },
    zoomend: (e) => {
      console.log('Zoom level:', e.target.getZoom())
    },
  })
  
  return null
}

// Add to DarkCityMap component
<MapClickHandler />
```

### Example: Agent Selection Handler

```typescript
function handleAgentSelect(agentId: string) {
  setMapState(prev => ({
    ...prev,
    selectedAgent: agentId,
  }))
  
  // Center map on agent
  const agent = agents.get(agentId)
  if (agent) {
    mapRef.current?.setView(
      [agent.currentLocation.lat, agent.currentLocation.lng],
      15
    )
  }
  
  // Track analytics
  trackEvent('agent_selected', { agentId })
}
```

---

## Data Filtering

### Example: Time Range Filter

```typescript
function filterInteractionsByTime(
  interactions: Interaction[],
  timeRange: 'today' | 'week' | 'month' | 'all'
): Interaction[] {
  const now = Date.now()
  const ranges = {
    today: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity,
  }
  
  const cutoff = now - ranges[timeRange]
  
  return interactions.filter(i => i.timestamp >= cutoff)
}
```

### Example: District Filter

```typescript
function filterByDistrict(
  items: (Interaction | Breadcrumb)[],
  districts: string[]
): typeof items {
  if (districts.length === 0) return items
  
  return items.filter(item => {
    const district = getDistrictByCoords(item.lat, item.lng)
    return district && districts.includes(district.id)
  })
}
```

---

## Analytics Integration

### Example: Google Analytics

```typescript
// lib/analytics.ts

export function trackMapView() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: 'DARKCITY Map',
      page_location: window.location.href,
    })
  }
}

export function trackAgentInteraction(
  agentId: string,
  interactionType: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'agent_interaction', {
      agent_id: agentId,
      interaction_type: interactionType,
    })
  }
}
```

### Example: Custom Analytics

```typescript
// lib/analytics.ts

class MapAnalytics {
  private events: any[] = []
  
  track(event: string, data: any) {
    this.events.push({
      event,
      data,
      timestamp: Date.now(),
    })
    
    // Send to backend
    this.send()
  }
  
  private async send() {
    if (this.events.length === 0) return
    
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(this.events),
      })
      this.events = []
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }
}

export const analytics = new MapAnalytics()
```

---

## Complete Custom Component Example

```typescript
// components/CustomDarkCityMap.tsx

'use client'

import { useState, useEffect } from 'react'
import DarkCityMap from './DarkCityMap'
import { Agent } from '../lib/types'

export default function CustomDarkCityMap() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  
  useEffect(() => {
    // Fetch agents from your API
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data))
  }, [])
  
  return (
    <div className="custom-map-container">
      <div className="district-selector">
        <select onChange={(e) => setSelectedDistrict(e.target.value)}>
          <option value="">All Districts</option>
          <option value="platinum-heights">Platinum Heights</option>
          <option value="chrome-valley">Chrome Valley</option>
          {/* ... more districts */}
        </select>
      </div>
      
      <DarkCityMap />
      
      <div className="agent-counter">
        {agents.length} agents online
      </div>
    </div>
  )
}
```

---

For more examples, see the source code in `components/` and `lib/`.
