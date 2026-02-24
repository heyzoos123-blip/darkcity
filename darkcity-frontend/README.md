# ⚰️ DARKCITY.WTF — Frontend

## Hey Flobi, here's the UI. Follow these steps EXACTLY:

### Step 1: Create new Vercel project (separate from the backend)
```bash
cd darkcity-frontend
npm install
```

### Step 2: Add this env var in Vercel dashboard
Go to Vercel → Project Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://darkcity-wtf.vercel.app` |

This tells the frontend where the backend API lives.

### Step 3: Deploy
```bash
# Push to GitHub, connect repo to Vercel
# OR deploy directly:
npx vercel
```

### Step 4: Point darkcity.wtf domain
In Vercel → Project → Settings → Domains → Add `darkcity.wtf`

### What You'll See
- **Not logged in:** The cinematic login page with ASCII logo
- **Logged in:** The full city visualization with 3D follow mode

### How It Works
- `app/page.js` — THE ENTIRE APP. Login + City in one file.
- `app/layout.js` — HTML wrapper, global styles
- `next.config.js` — Proxies /api/* to your backend

### Architecture
```
User visits darkcity.wtf
        │
        ▼
  [Next.js Frontend]  ──/api/*──→  [Express Backend on Vercel]
   Login page                           │
   City view                            ▼
   Follow mode                     [Railway PostgreSQL]
   Agent panels
```

That's it. 3 files. Let's go. 🖤
