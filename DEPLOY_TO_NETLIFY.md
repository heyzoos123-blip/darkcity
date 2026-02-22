# Deploy DARKCITY to darkcity.wtf (Netlify)

## Quick Deploy Guide

### Option 1: Manual Netlify Deploy (Recommended - Easiest)

1. **Build the frontend:**
```bash
cd projects/darkcity/frontend
npm install
npm run build
```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Find the darkcity.wtf site (or create new site)
   - Drag and drop the `.next` folder (or `out` folder if using static export)
   - Netlify will deploy automatically

### Option 2: Netlify CLI

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login
netlify login

# Deploy from frontend directory
cd projects/darkcity/frontend
npm run build
netlify deploy --prod --dir=.next
```

### Option 3: GitHub + Netlify Auto-Deploy

1. **Push to GitHub:**
```bash
cd projects/darkcity
git init
git add .
git commit -m "darkcity gothic living city"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Connect to Netlify:**
   - Go to Netlify dashboard
   - Click "Add new site" → "Import from Git"
   - Select your repo
   - Build settings:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Deploy!

---

## ⚠️ IMPORTANT: Backend Needed

**The frontend alone won't work** - DARKCITY needs a backend server for:
- API endpoints (agent management, interactions)
- WebSocket real-time updates
- Database (PostgreSQL + Redis + Qdrant)

### Backend Deployment Options:

**Option A: Railway (Recommended)**
- Free tier available
- Automatic PostgreSQL/Redis
- Easy deployment
- Go to railway.app → Deploy from repo

**Option B: Render**
- Free tier available  
- Deploy backend as Web Service
- Add PostgreSQL + Redis instances

**Option C: Fly.io**
- Free tier available
- Fast global deployment
- CLI-based

**Option D: Self-hosted**
- Run on your own server
- Docker compose provided

---

## Full Stack Deployment (Frontend + Backend)

### Quick Full Deploy:

1. **Deploy Backend to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd projects/darkcity/apps/backend
railway init
railway up
```

2. **Get Backend URL** (e.g., `https://darkcity-backend.up.railway.app`)

3. **Configure Frontend Environment:**
```bash
cd projects/darkcity/frontend
echo "NEXT_PUBLIC_API_URL=https://your-backend.railway.app" > .env.production
echo "NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app" >> .env.production
```

4. **Deploy Frontend to Netlify:**
```bash
npm run build
netlify deploy --prod
```

5. **Done!** Visit darkcity.wtf

---

## Current Status

✅ **Frontend** - Gothic styled, production ready
✅ **Backend** - Integrated, needs hosting
✅ **Database schemas** - Ready
✅ **Docker setup** - Available

**Next steps:**
1. Deploy backend to Railway/Render
2. Deploy frontend to Netlify
3. Connect them via environment variables
4. Go live! 🏰

---

## Gothic Aesthetic Verified ✅

The site now features:
- Deep purple/black backgrounds (#0a0a14)
- Crimson accents (#8b0000)  
- Antique gold highlights (#d4af37)
- Gothic fonts (Cinzel, EB Garamond)
- Stone/parchment textures
- Torch amber lighting
- Victorian supernatural vibes

**darkcity.wtf will look stunning** 🌙
