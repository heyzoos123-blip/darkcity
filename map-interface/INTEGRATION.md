# Integration Guide

How to integrate the DARKCITY map interface into your application.

## Quick Start

### 1. Install Dependencies

```bash
cd projects/darkcity/map-interface
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Test with Mock Data

In a separate terminal:

```bash
node server/mock-ws-server.js
```

The map will automatically connect and show live agent movements.

---

## WebSocket Integration

### Message Protocol

The map expects WebSocket messages in this format:

#### Position Update
```json
{
  "type": "position",
  "agentId": "agent-123",
  "timestamp": 1703275200000,
  "data": {
    "lat": 40.7580,
    "lng": -73.9855,
    "street": "Neon Avenue",
    "district": "Chrome Valley",
    "activity": "Exploring the city"
  }
}
```

#### Interaction Event
```json
{
  "type": "interaction",
  "agentId": "agent-123",
  "timestamp": 1703275200000,
  "data": {
    "type": "conversation",
    "location": {
      "lat": 40.7580,
      "lng": -73.9855,
      "street": "Neon Avenue",
      "district": "Chrome Valley",
      "landmark": "Neon Pulse"
    },
    "details": "Met with another agent at the club",
    "participants": ["agent-456"],
    "amount": 0.05
  }
}
```

#### Stats Update
```json
{
  "type": "stats",
  "agentId": "agent-123",
  "timestamp": 1703275200000,
  "data": {
    "balance": 12.5,
    "status": "active"
  }
}
```

### Backend Implementation Example (Node.js)

```javascript
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3001 })

function broadcastAgentPosition(agent) {
  const message = {
    type: 'position',
    agentId: agent.id,
    timestamp: Date.now(),
    data: {
      lat: agent.currentLat,
      lng: agent.currentLng,
      street: agent.currentStreet,
      district: agent.currentDistrict,
      activity: agent.currentActivity,
    }
  }
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}
```

---

## Customization

### Change Map Center & Zoom

Edit `lib/mapData.ts`:

```typescript
export const DARKCITY_CENTER: [number, number] = [40.7580, -73.9855]
export const DEFAULT_ZOOM = 13
```

### Add Districts

Edit `lib/mapData.ts` and add to the `DISTRICTS` array:

```typescript
{
  id: 'new-district',
  name: 'New District',
  description: 'A brand new area',
  bounds: [
    [40.7700, -73.9700],
    [40.7700, -73.9550],
    [40.7580, -73.9550],
    [40.7580, -73.9700],
  ],
  color: '#FF00FF',
  characteristics: ['Trait1', 'Trait2'],
}
```

### Add Landmarks

```typescript
{
  id: 'new-landmark',
  name: 'New Landmark',
  type: 'casino',
  location: { 
    lat: 40.7580, 
    lng: -73.9855, 
    street: 'Main Street', 
    district: 'District Name' 
  },
  description: 'Description of the landmark',
  icon: '🎰',
}
```

### Change Color Theme

Edit `styles/map.css`:

```css
:root {
  --neon-green: #39ff14;  /* Primary accent */
  --neon-pink: #ff10f0;   /* Secondary accent */
  --dark-bg: #0a0a0f;     /* Background */
  --dark-panel: #0f0f1a;  /* Panels */
}
```

---

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://your-production-server.com:3001
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
# Upload the .next folder
```

---

## API Reference

### DarkCityMap Component Props

```typescript
interface DarkCityMapProps {
  wsUrl?: string              // WebSocket server URL (optional)
  initialCenter?: [number, number]  // Map center (optional)
  initialZoom?: number        // Zoom level (optional)
}
```

### WebSocket Client Methods

```typescript
const ws = new DarkCityWebSocket('ws://localhost:3001')

ws.connect()                  // Connect to server
ws.disconnect()               // Disconnect
ws.isConnected()              // Check connection status
ws.subscribe(callback)        // Subscribe to messages
ws.send(message)              // Send message to server
```

---

## Troubleshooting

### Map Not Loading

- Check browser console for errors
- Ensure Leaflet CSS is loaded
- Verify component is dynamically imported (no SSR)

### WebSocket Not Connecting

- Verify server is running on correct port
- Check firewall settings
- Enable mock data fallback in `lib/websocket.ts`

### Markers Not Showing

- Verify coordinates are within map bounds
- Check custom icon rendering in browser dev tools
- Ensure data format matches expected types

### Performance Issues

- Limit breadcrumb history (default: 50 per agent)
- Limit interaction history (default: 100 total)
- Reduce WebSocket update frequency
- Disable unused layers (districts, landmarks)

---

## Advanced Features

### Multi-User Support

To add role management:

1. Add `role` field to Agent type
2. Filter agents based on user permissions
3. Implement authentication in WebSocket server

### Custom Marker Types

```typescript
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div>Your HTML</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})
```

### Real-Time Notifications

```typescript
ws.subscribe((message) => {
  if (message.type === 'interaction') {
    // Show browser notification
    new Notification('Agent Activity', {
      body: message.data.details
    })
  }
})
```

---

## Support

For issues or questions:
- Check the README.md
- Review example implementations
- Inspect browser console logs
- Test with mock WebSocket server first
