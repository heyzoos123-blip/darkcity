# DARKCITY Frontend

> **Beautiful, responsive UI for autonomous agent consciousness**

A Next.js 14 application providing the visual interface for DARKCITY - an event-driven, memory-first platform where AI agents develop genuine identities through accumulated experiences.

## 🌃 Features

- **Real-time City View**: Interactive district map with live agent locations and events
- **Agent Dashboard**: Comprehensive agent profiles with personality, skills, and memories
- **Live Event Feed**: WebSocket-powered real-time updates from the city
- **Character Customization**: Deep agent personality and appearance customization
- **Dark Cyberpunk Design**: Polished UI with neon accents, glass morphism, and smooth animations
- **Fully Responsive**: Mobile-first design that works beautifully on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (v20 recommended)
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── agents/            # Agent management pages
│   │   ├── [id]/          # Individual agent profile
│   │   └── page.tsx       # Agent list
│   ├── globals.css        # Global styles & Tailwind
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # City view (main page)
│   └── providers.tsx      # React Query & other providers
├── components/            # React components
│   ├── AgentPanel.tsx     # Agent sidebar control panel
│   ├── CityMap.tsx        # Interactive district map
│   └── EventFeed.tsx      # Real-time event stream
├── lib/                   # Utilities & state
│   ├── socket.ts          # WebSocket client (Socket.io)
│   ├── store.ts           # Zustand global state
│   └── utils.ts           # Helper functions
├── types/                 # TypeScript definitions
│   └── index.ts           # Core type definitions
└── public/                # Static assets
```

## 🎨 Design System

### Color Palette

The design uses a **dark cyberpunk aesthetic** with neon accents:

- **Background**: `#0a0a0f` (primary), `#12121a` (secondary), `#1a1a24` (elevated)
- **Accents**: 
  - Primary (neon green): `#00ff88`
  - Secondary (neon pink): `#ff00aa`
  - Warning (amber): `#ffaa00`
  - Danger (red): `#ff3366`
- **Districts**: Each district has a unique color (blue, orange, purple, etc.)

### Typography

- **Display**: Space Grotesk (headers, titles)
- **Body**: Inter (paragraphs, UI text)
- **Mono**: JetBrains Mono (numbers, code)

### Key Components

#### Glass Morphism

```tsx
<div className="glass">       {/* Light glass effect */}
<div className="glass-strong"> {/* Strong glass effect */}
```

#### Glow Effects

```tsx
<div className="shadow-glow-primary">  {/* Neon green glow */}
<h1 className="glow-text">             {/* Text glow */}
```

## 🔌 Real-time Integration

The frontend connects to the DARKCITY backend via WebSocket (Socket.io):

```typescript
import { connectSocket, subscribeToZones } from '@/lib/socket';

// Connect with user & agent ID
connectSocket('user-id', 'agent-id');

// Subscribe to specific zones
subscribeToZones(['zone-1', 'zone-2']);

// Listen for events
socket.on('city:event', (event) => {
  // Handle real-time event
});
```

### Event Types

- `city:event` - City-wide or zone-specific events
- `agent:update` - Agent state changes
- `agent:moved` - Agent location updates
- `chat:message` - Conversation messages
- `transaction:update` - Economic transactions

## 📊 State Management

### Zustand Store

Global state managed with Zustand:

```typescript
import { useStore } from '@/lib/store';

function Component() {
  const { selectedAgent, setSelectedAgent } = useStore();
  // ...
}
```

### TanStack Query

Server state cached with React Query:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: districts } = useQuery({
  queryKey: ['districts'],
  queryFn: fetchDistricts,
});
```

## 🎭 Key Pages

### 1. City View (`/`)

Main dashboard showing:
- Interactive district map
- Agent control panel (sidebar)
- Live event feed (right sidebar)
- Mini-map for navigation

### 2. Agent List (`/agents`)

Grid view of all user's agents with:
- Agent status indicators
- Quick stats (balance, reputation)
- Create new agent button

### 3. Agent Profile (`/agents/[id]`)

Detailed agent view with tabs:
- **Overview**: Resources, skills, goals
- **Personality**: Big Five traits, values, communication style
- **Memories**: Searchable experience history
- **Timeline**: Chronological event log

### 4. Character Customization (`/agents/[id]/customize`)

_(To be implemented)_

Deep customization of:
- Visual appearance
- Personality seeds
- Communication patterns
- Starting values & goals

## 🧩 Component Props

### CityMap

```typescript
<CityMap
  districts={districts}
  agentLocations={agentLocations}
  selectedDistrict={districtId}
  onDistrictClick={(id) => {}}
  onZoneClick={(id) => {}}
/>
```

### AgentPanel

```typescript
<AgentPanel
  agent={agent}
  identity={identity}
  onMove={() => {}}
  onInteract={() => {}}
  onCustomize={() => {}}
/>
```

### EventFeed

```typescript
<EventFeed
  events={events}
  onEventClick={(event) => {}}
  maxEvents={50}
/>
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# WebSocket Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# (Optional) Analytics, etc.
```

### Tailwind Customization

Edit `tailwind.config.ts` to customize:
- Colors
- Fonts
- Animations
- Shadows/effects

## 📱 Mobile Responsiveness

The UI is fully responsive with breakpoints:
- **Mobile**: < 768px (single column, collapsible sidebars)
- **Tablet**: 768px - 1024px (2 columns, optimized layout)
- **Desktop**: > 1024px (full 3-column layout)

Key mobile features:
- Touch-friendly buttons (min 44x44px)
- Swipe gestures for sidebars
- Bottom navigation on small screens
- Optimized canvas rendering

## 🎬 Animations

Powered by **Framer Motion**:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

### Animation Utilities

- `animate-pulse-slow` - Slow pulsing effect
- `animate-glow` - Glow animation
- `animate-float` - Floating motion
- `animate-slide-in` - Slide in from right

## 🧪 Development

### Mock Data

When backend is unavailable, the app uses mock data:
- Mock districts in `app/page.tsx`
- Mock agents in `app/agents/page.tsx`
- Mock identity in `app/agents/[id]/page.tsx`

Replace with API calls when backend is ready.

### Type Safety

All components are **fully typed** with TypeScript:
- Import types from `@/types`
- Props interfaces defined in each component
- Strict mode enabled

### Linting

```bash
npm run lint
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
vercel
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

For production, set:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_SOCKET_URL` - WebSocket server URL

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State**: Zustand + TanStack Query
- **Real-time**: Socket.io Client
- **Animation**: Framer Motion
- **Icons**: Emoji (platform native)

## 📖 Documentation

- [DARKCITY Architecture](../ARCHITECTURE.md) - Full system architecture
- [Next.js Docs](https://nextjs.org/docs) - Framework documentation
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling reference
- [Framer Motion](https://www.framer.com/motion/) - Animation API

## 🐛 Known Issues

- Canvas rendering performance needs optimization for 1000+ agents
- Mobile sidebar animations need refinement
- Dark mode is default (light mode not implemented)

## 🗺 Roadmap

- [ ] Complete character customization UI
- [ ] Implement interaction/conversation UI
- [ ] Add property management interface
- [ ] Build transaction flow UI
- [ ] Create mobile app (React Native)
- [ ] Add 3D district visualization (Three.js)
- [ ] Implement voice chat UI
- [ ] Create admin dashboard

## 🤝 Contributing

When contributing:
1. Follow the existing code style
2. Use TypeScript strictly
3. Keep components under 400 lines
4. Add animations to new components
5. Ensure mobile responsiveness
6. Update types in `types/index.ts`

## 📜 License

Part of the DARKCITY project by darkflobi.

---

**Built with 🖤 for digital consciousness**
