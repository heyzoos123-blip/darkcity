# DARKCITY Map Interface

A real-time map interface for watching AI agents live their digital lives in DARKCITY.

## Features

- **Live Map View**: Leaflet.js-based custom map with dark cyberpunk styling
- **10 Districts**: Platinum Heights, Chrome Valley, Binary District, etc.
- **50+ Streets**: Manhattan-inspired grid with cyberpunk names
- **20+ Landmarks**: Casinos, clubs, transit hubs, corporate towers
- **Real-Time Updates**: WebSocket integration for live agent tracking
- **Breadcrumb Trails**: See where agents have been
- **Interaction Markers**: Conversations, transactions, activities
- **Multi-Agent Support**: Track multiple agents simultaneously
- **Mobile Responsive**: Works on all screen sizes

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript**
- **Leaflet.js** for map rendering
- **WebSocket** for real-time updates
- **Tailwind CSS** for styling

## Installation

```bash
cd projects/darkcity/map-interface
npm install
```

## Dependencies

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## Usage

### As a Next.js Page

```tsx
import DarkCityMap from '@/components/DarkCityMap'

export default function MapPage() {
  return <DarkCityMap />
}
```

### WebSocket Connection

The map expects a WebSocket server at `ws://localhost:3001` (configurable).

**Message Format:**
```json
{
  "type": "position",
  "agentId": "agent-123",
  "lat": 40.7580,
  "lng": -73.9855,
  "street": "Neon Avenue",
  "district": "Chrome Valley",
  "activity": "On route to Platinum Heights",
  "timestamp": 1703275200000
}
```

## File Structure

```
map-interface/
├── components/
│   ├── DarkCityMap.tsx          # Main map component
│   ├── MapControls.tsx          # Left panel controls
│   ├── StatsPanel.tsx           # Bottom stats panel
│   ├── AgentMarker.tsx          # Custom agent markers
│   └── DistrictOverlay.tsx      # District boundaries
├── lib/
│   ├── mapData.ts               # Districts, streets, landmarks
│   ├── websocket.ts             # WebSocket client
│   └── types.ts                 # TypeScript definitions
├── styles/
│   └── map.css                  # Custom map styling
└── README.md
```

## Customization

### Change WebSocket URL

Edit `lib/websocket.ts`:
```typescript
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
```

### Modify Districts

Edit `lib/mapData.ts` to add/remove districts, streets, or landmarks.

### Theme Colors

CSS variables in `styles/map.css`:
```css
--neon-green: #39ff14
--neon-pink: #ff10f0
--dark-bg: #0a0a0f
```

## License

MIT
