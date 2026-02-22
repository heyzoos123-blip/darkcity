# DARKCITY Map Interface - Setup Guide

Complete setup instructions for getting the map interface running.

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation Steps

### 1. Navigate to Project Directory

```bash
cd projects/darkcity/map-interface
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `next` - React framework
- `react` & `react-dom` - React libraries
- `leaflet` - Mapping library
- `react-leaflet` - React bindings for Leaflet
- TypeScript types and tooling

### 3. Verify Installation

```bash
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Running with Mock Data

The map will automatically fall back to mock data if no WebSocket server is available.

### Option 1: Automatic Mock Data (No Setup Required)

Just run the development server:

```bash
npm run dev
```

The map will detect no WebSocket server and generate mock agent movements automatically.

### Option 2: Mock WebSocket Server

For more realistic testing, run the included mock server:

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
node server/mock-ws-server.js
```

You'll see:
```
[MockWS] Server running on ws://localhost:3001
[MockWS] Broadcasting mock data...
```

The map will now connect to the WebSocket server and show live updates.

## Connecting to Real Backend

### 1. Set WebSocket URL

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_WS_URL=ws://your-backend-url:3001
```

### 2. Implement Backend WebSocket Server

Your backend needs to:
- Accept WebSocket connections on port 3001 (or configured port)
- Send position updates in the expected format
- Handle client connections/disconnections

See `INTEGRATION.md` for detailed protocol documentation.

## Project Structure

```
map-interface/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page (imports DarkCityMap)
├── components/            # React components
│   ├── DarkCityMap.tsx   # Main map component
│   ├── MapControls.tsx   # Left control panel
│   └── StatsPanel.tsx    # Bottom stats panel
├── lib/                   # Utilities and data
│   ├── mapData.ts        # Districts, streets, landmarks
│   ├── types.ts          # TypeScript definitions
│   └── websocket.ts      # WebSocket client
├── server/               # Development servers
│   └── mock-ws-server.js # Mock WebSocket server
├── styles/               # CSS
│   └── map.css          # Custom map styling
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── next.config.js       # Next.js config
├── README.md            # Overview
├── INTEGRATION.md       # Integration guide
└── SETUP.md            # This file
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

### Make Changes

Edit files in `components/`, `lib/`, or `styles/`. Next.js will hot-reload automatically.

### Add New Districts

Edit `lib/mapData.ts`:

```typescript
DISTRICTS.push({
  id: 'my-district',
  name: 'My District',
  description: 'A new area',
  bounds: [[lat1, lng1], [lat2, lng2], ...],
  color: '#FF00FF',
  characteristics: ['Trait1', 'Trait2'],
})
```

### Add New Landmarks

```typescript
LANDMARKS.push({
  id: 'my-landmark',
  name: 'My Landmark',
  type: 'casino',
  location: { lat: 40.7580, lng: -73.9855, street: 'Street', district: 'District' },
  description: 'Description',
  icon: '🎰',
})
```

### Customize Styling

Edit `styles/map.css` to change colors, fonts, animations.

## Building for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized build in `.next/`.

### Start Production Server

```bash
npm start
```

### Deploy

**Vercel (Recommended):**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm run build
# Upload .next folder to Netlify
```

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
EXPOSE 3000
```

## Configuration Options

### Environment Variables

Create `.env.local`:

```env
# WebSocket server URL
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Map defaults
NEXT_PUBLIC_MAP_CENTER_LAT=40.7580
NEXT_PUBLIC_MAP_CENTER_LNG=-73.9855
NEXT_PUBLIC_MAP_ZOOM=13
```

### next.config.js

```javascript
module.exports = {
  reactStrictMode: true,
  // Add custom configuration here
}
```

## Troubleshooting

### "Module not found: Can't resolve 'leaflet'"

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### "window is not defined" Error

Ensure `DarkCityMap` is dynamically imported with `ssr: false`:

```typescript
const DarkCityMap = dynamic(
  () => import('../components/DarkCityMap'),
  { ssr: false }
)
```

### Map Tiles Not Loading

- Check internet connection
- Verify tile server URL in `DarkCityMap.tsx`
- Try alternative tile provider (Mapbox, OpenStreetMap, etc.)

### WebSocket Connection Failed

- Verify server is running: `node server/mock-ws-server.js`
- Check port is not in use: `lsof -i :3001` (Mac/Linux) or `netstat -ano | findstr :3001` (Windows)
- Disable firewall temporarily for testing
- Check browser console for CORS errors

### Markers Not Appearing

- Verify coordinates are within map bounds (40.73-40.77, -74.01 to -73.94)
- Check data format matches TypeScript types
- Inspect browser dev tools for errors

### Performance Issues

- Reduce breadcrumb limit in `DarkCityMap.tsx` (default: 50)
- Reduce interaction history (default: 100)
- Disable unused map layers
- Increase WebSocket update interval

## Testing

### Manual Testing Checklist

- [ ] Map loads without errors
- [ ] Districts render with correct colors
- [ ] Street grid displays
- [ ] Landmarks appear with correct icons
- [ ] Agent markers show and update
- [ ] Breadcrumb trails follow agents
- [ ] Interaction markers appear
- [ ] Click markers to see popups
- [ ] Left panel shows agent list
- [ ] Bottom panel shows stats
- [ ] Toggle layers on/off
- [ ] Select different agents
- [ ] Filter by time range
- [ ] WebSocket connection indicator works
- [ ] Responsive on mobile

### Browser Compatibility

Tested on:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

### Mobile Testing

Test on:
- iPhone (Safari)
- Android (Chrome)
- Tablet devices

## Performance Optimization

### Reduce Bundle Size

```bash
npm run build
# Check output for large modules
```

### Enable Compression

In `next.config.js`:

```javascript
module.exports = {
  compress: true,
}
```

### Optimize Images

Use Next.js `<Image>` component for marker icons.

### Lazy Load Components

```typescript
const StatsPanel = dynamic(() => import('./StatsPanel'), {
  loading: () => <div>Loading...</div>
})
```

## Security Considerations

### WebSocket Authentication

Add token-based auth:

```typescript
const ws = new DarkCityWebSocket('ws://server?token=YOUR_TOKEN')
```

### Data Validation

Validate incoming WebSocket messages:

```typescript
if (!message.type || !message.agentId || !message.timestamp) {
  console.error('Invalid message format')
  return
}
```

### HTTPS/WSS in Production

Always use secure connections in production:

```env
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
```

## Next Steps

1. **Customize the map** - Add your districts, streets, landmarks
2. **Connect to backend** - Implement WebSocket server
3. **Add features** - Notifications, analytics, filters
4. **Deploy** - Choose hosting platform
5. **Monitor** - Track performance and errors

## Support & Resources

- **README.md** - Project overview
- **INTEGRATION.md** - Backend integration guide
- **Leaflet Docs** - https://leafletjs.com/reference.html
- **Next.js Docs** - https://nextjs.org/docs
- **React Leaflet** - https://react-leaflet.js.org/

---

Happy mapping! 🗺️✨
