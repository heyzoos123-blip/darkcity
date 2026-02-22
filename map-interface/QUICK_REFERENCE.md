# DARKCITY Map Interface - Quick Reference Card

## 🚀 Get Started in 3 Commands

```bash
cd projects/darkcity/map-interface
npm install
npm run dev
```

Open: http://localhost:3000

## 📁 File Structure

```
map-interface/
├── app/                    # Next.js pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── DarkCityMap.tsx   # Main map
│   ├── MapControls.tsx   # Left panel
│   └── StatsPanel.tsx    # Bottom panel
├── lib/                   # Core logic
│   ├── mapData.ts        # Districts, streets, landmarks
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Helper functions
│   └── websocket.ts      # WebSocket client
├── server/                # Dev server
│   └── mock-ws-server.js # Mock WebSocket
└── styles/                # Styling
    └── map.css           # Custom styles
```

## 🎨 Districts (10)

| ID | Name | Color | Type |
|----|------|-------|------|
| platinum-heights | Platinum Heights | #9370DB | Luxury |
| chrome-valley | Chrome Valley | #00CED1 | Tech |
| binary-district | Binary District | #39FF14 | Data |
| neon-gardens | Neon Gardens | #FF10F0 | Entertainment |
| rust-quarter | Rust Quarter | #8B4513 | Industrial |
| crystal-exchange | Crystal Exchange | #FFD700 | Financial |
| shadow-market | Shadow Market | #2F4F4F | Underground |
| voltage-park | Voltage Park | #4169E1 | Residential |
| echo-district | Echo District | #FF6347 | Arts |
| glitch-zone | Glitch Zone | #FF00FF | Experimental |

## 🗺️ Street Types

- **Avenues** (N-S): Neon, Chrome, Binary, Voltage, Shadow, Pulse
- **Streets** (E-W): Platinum, Diamond, Crystal, Zenith, Eclipse, Nova, Quantum, Flux, Cipher
- **Boulevards**: Midnight, Ethereal
- **Highway**: Data Highway

## 📍 Landmark Types

- 🎰 Casino
- 🎵 Club
- 🚇 Transit
- 🏢 Corporate
- 🏘️ Residential
- 🎭 Entertainment
- 🛒 Market
- 🏛️ Government

## 🔌 WebSocket Messages

### Position Update
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
    "activity": "Exploring"
  }
}
```

### Interaction Event
```json
{
  "type": "interaction",
  "agentId": "agent-123",
  "timestamp": 1703275200000,
  "data": {
    "type": "conversation",
    "location": {...},
    "details": "Met with agent",
    "participants": ["agent-456"],
    "amount": 0.05
  }
}
```

### Stats Update
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

## 🎨 Color Palette

```css
--neon-green: #39ff14   /* Primary */
--neon-pink: #ff10f0    /* Secondary */
--neon-blue: #00f0ff    /* Tertiary */
--neon-gold: #ffd700    /* Value */
--dark-bg: #0a0a0f      /* Background */
--dark-panel: #0f0f1a   /* Panels */
--dark-card: #1a1a2e    /* Cards */
```

## 📦 NPM Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run linter
```

## 🔧 Common Tasks

### Add a District
Edit `lib/mapData.ts`:
```typescript
DISTRICTS.push({
  id: 'my-district',
  name: 'My District',
  description: 'Description',
  bounds: [[lat1,lng1], [lat2,lng2], ...],
  color: '#FF00FF',
  characteristics: ['Trait1', 'Trait2'],
})
```

### Add a Landmark
```typescript
LANDMARKS.push({
  id: 'my-landmark',
  name: 'My Landmark',
  type: 'casino',
  location: {lat, lng, street, district},
  description: 'Description',
  icon: '🎰',
})
```

### Change Colors
Edit `styles/map.css`:
```css
:root {
  --neon-green: #00ff00;  /* Your color */
}
```

### Configure WebSocket
Create `.env.local`:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 🧪 Testing

### Mock WebSocket Server
```bash
node server/mock-ws-server.js
```

### Manual Testing
- [ ] Map loads
- [ ] Districts render
- [ ] Landmarks appear
- [ ] Agent markers show
- [ ] Breadcrumbs work
- [ ] Interactions appear
- [ ] Panels update
- [ ] Layers toggle
- [ ] Mobile responsive

## 🚀 Deployment

### Vercel
```bash
vercel
```

### Netlify
```bash
npm run build
# Upload .next folder
```

### Docker
```bash
docker build -t darkcity-map .
docker run -p 3000:3000 darkcity-map
```

## 📊 Performance Targets

- Initial load: <2s
- Time to interactive: <500ms
- WebSocket connect: <100ms
- Memory usage: ~50MB (5 agents)
- CPU usage: <15% (active)

## 🔍 Troubleshooting

### Map not loading
- Check Leaflet CSS imported
- Verify dynamic import with `ssr: false`
- Check browser console

### WebSocket not connecting
- Verify server running
- Check firewall
- Confirm port not in use
- Enable mock data fallback

### Markers not showing
- Verify coordinates in bounds
- Check data format
- Inspect custom icon rendering

### Performance issues
- Reduce breadcrumb limit
- Limit interaction history
- Disable unused layers
- Increase update interval

## 📖 Documentation

- **README.md** - Overview
- **SETUP.md** - Installation guide
- **INTEGRATION.md** - Backend integration
- **FEATURES.md** - Feature list
- **EXAMPLES.md** - Code examples
- **PROJECT_SUMMARY.md** - Complete summary
- **QUICK_REFERENCE.md** - This document

## 🎯 Key Components

### DarkCityMap.tsx
Main map component with Leaflet integration, district overlays, markers, and real-time updates.

### MapControls.tsx
Left panel with agent selector, filters, and layer toggles.

### StatsPanel.tsx
Bottom panel showing current location, activity, earnings, and recent interactions.

### lib/mapData.ts
Geographic data: 10 districts, 50+ streets, 20+ landmarks.

### lib/websocket.ts
WebSocket client with auto-reconnect and mock data fallback.

### lib/types.ts
TypeScript type definitions for all data structures.

## 💡 Pro Tips

- Start with mock data
- Customize colors first
- Keep breadcrumb limits reasonable
- Monitor performance
- Use TypeScript
- Read the docs

## 🎊 Quick Wins

1. Change theme colors in `map.css`
2. Add your favorite landmark
3. Customize district names
4. Adjust map center/zoom
5. Add custom marker icons

## 🔗 Dependencies

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0"
}
```

## 📞 Getting Help

1. Check error in browser console
2. Review relevant doc file
3. Try mock data server
4. Inspect network tab
5. Check coordinates are valid

---

**Everything you need to know on one page.**
