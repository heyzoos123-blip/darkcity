# DARKCITY Frontend - Quick Start

Get the DARKCITY frontend running in **5 minutes**.

## Prerequisites

- Node.js 18+ installed
- npm (comes with Node.js)
- A terminal

## Steps

### 1. Navigate to Frontend

```bash
cd projects/darkcity/frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- Tailwind CSS
- Socket.io client
- Zustand
- Framer Motion
- TanStack Query
- All dev dependencies

**Time: ~2 minutes**

### 3. Run Development Server

```bash
npm run dev
```

Output:
```
 ▲ Next.js 14.2.32
  - Local:        http://localhost:3000
  - Ready in 1.5s
```

**Time: ~10 seconds**

### 4. Open in Browser

Visit: **http://localhost:3000**

You should see:
- Dark cyberpunk interface
- Interactive city map
- Agent control panel
- Live event feed

**Done! 🎉**

---

## What You'll See

### Main Page (`/`)

```
┌─────────────────────────────────────────────────────────┐
│ DARKCITY Header                                         │
├──────────┬─────────────────────────────────────┬────────┤
│ Agent    │        City Map                     │ Event  │
│ Panel    │                                     │ Feed   │
│          │   [Interactive Districts]           │        │
│ • Stats  │                                     │ • Live │
│ • Skills │   Downtown  Arts  Industrial        │ • Real │
│ • Goals  │                                     │ • Time │
│ • Action │   [Agent Locations]                 │        │
└──────────┴─────────────────────────────────────┴────────┘
```

### Features You Can Use

✅ **Click districts** on the map to select them  
✅ **Hover districts** to see details  
✅ **Agent panel** shows mock agent "Cypher"  
✅ **Event feed** is empty (no backend connected yet)  
✅ **Navigate** to `/agents` to see agent list  
✅ **View profile** at `/agents/agent-1`  

---

## Common Tasks

### View Different Pages

```bash
# Agent list
open http://localhost:3000/agents

# Agent profile
open http://localhost:3000/agents/agent-1
```

### Make Changes

1. Edit any file in `app/` or `components/`
2. Save the file
3. Browser auto-refreshes (Fast Refresh)

Example:

```typescript
// Edit components/AgentPanel.tsx
// Change line 50:
<h2>Agent Control Panel</h2>
// To:
<h2>🤖 Agent Control Panel</h2>
// Save, see instant update!
```

### Add New Page

```bash
# Create new page
mkdir -p app/test
echo 'export default function Test() { return <h1>Test Page</h1>; }' > app/test/page.tsx

# Visit http://localhost:3000/test
```

### Customize Theme

Edit `tailwind.config.ts`:

```typescript
// Change primary accent color
colors: {
  accent: {
    primary: '#ff0088', // Change from green to pink
  }
}
```

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### TypeScript Errors

```bash
# Restart TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
npm run build
```

### Slow Performance

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

---

## Next Steps

### 1. Connect to Backend

When your backend is ready:

```bash
# Create .env.local
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' > .env.local
echo 'NEXT_PUBLIC_SOCKET_URL=http://localhost:3001' >> .env.local

# Restart dev server
npm run dev
```

Update `app/page.tsx` to uncomment WebSocket connection:

```typescript
// Line ~150
// connectSocket('user-1', 'agent-1');  // Uncomment this
connectSocket('user-1', 'agent-1');
```

### 2. Replace Mock Data

Replace mock data in:
- `app/page.tsx` - Districts
- `app/agents/page.tsx` - Agent list
- `app/agents/[id]/page.tsx` - Agent identity

With API calls:

```typescript
// Before
const mockAgents = [...];

// After
const { data: agents } = useQuery({
  queryKey: ['agents'],
  queryFn: () => fetch('/api/agents').then(r => r.json())
});
```

### 3. Build for Production

```bash
npm run build
npm start

# Or deploy
vercel
```

---

## Keyboard Shortcuts

While developing:

- **Cmd/Ctrl + R** - Refresh page
- **Cmd/Ctrl + Shift + C** - Open dev tools
- **Cmd/Ctrl + K** - Clear console

---

## Project Structure Quick Reference

```
app/
├── page.tsx              # Main city view
├── agents/
│   ├── page.tsx          # Agent list
│   └── [id]/page.tsx     # Agent profile
├── globals.css           # Global styles
└── layout.tsx            # Root layout

components/
├── CityMap.tsx           # District map
├── AgentPanel.tsx        # Agent sidebar
├── EventFeed.tsx         # Event stream
├── MiniMap.tsx           # Mini map overlay
└── ui/
    ├── Button.tsx        # Reusable button
    └── Spinner.tsx       # Loading spinner

lib/
├── store.ts              # Zustand state
├── socket.ts             # WebSocket client
├── utils.ts              # Helper functions
└── hooks.ts              # Custom hooks

types/
└── index.ts              # TypeScript types
```

---

## Development Workflow

### Typical Session

```bash
# 1. Start dev server
npm run dev

# 2. Open editor (VS Code recommended)
code .

# 3. Make changes, see live updates

# 4. Check for errors
npm run lint

# 5. Build to verify
npm run build

# 6. Commit changes
git add .
git commit -m "Add feature"

# 7. Deploy (optional)
vercel
```

---

## Resources

- **Main Docs**: [README.md](./README.md)
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Need Help?

1. Check [README.md](./README.md) for detailed docs
2. Check [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture
3. Check TypeScript errors in IDE
4. Search Next.js docs
5. Check browser console for errors

---

## Tips

💡 **Use TypeScript autocomplete** - Type safety catches errors early  
💡 **Use Tailwind IntelliSense** - VS Code extension helps with classes  
💡 **Check browser console** - Errors show up there first  
💡 **Use React DevTools** - Chrome extension for debugging  
💡 **Read component props** - Hover over components in IDE  

---

**Ready to build? Let's go! 🚀**

```bash
npm run dev
```

*The city is waiting...*
