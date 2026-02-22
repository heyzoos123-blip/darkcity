# Deploy DARKCITY - Simple Manual Steps

**Time needed:** 10-15 minutes  
**I'll guide you through every step** 🚂

---

## Step 1: Deploy Backend to Railway (5 minutes)

### 1.1 Go to Railway Dashboard
- Open: https://railway.app/dashboard
- You should be logged in

### 1.2 Create New Project
- Click **"+ New Project"**
- Select **"Deploy from GitHub repo"**
- **OR** if you don't have it on GitHub: Select **"Empty Project"**

### 1.3 Add PostgreSQL Database
- In your project, click **"+ New"**
- Select **"Database"** → **"Add PostgreSQL"**
- Railway will provision it automatically

### 1.4 Add Redis
- Click **"+ New"** again
- Select **"Database"** → **"Add Redis"**
- Railway will provision it automatically

### 1.5 Deploy Backend Service

**If using GitHub:**
- Click **"+ New"** → **"GitHub Repo"**
- Select your repo
- Set root directory: `apps/backend`

**If uploading directly:**
- Click **"+ New"** → **"Empty Service"**
- Go to Settings → Source
- Connect GitHub **OR** use CLI upload

**OR easiest - I'll create a deployment package:**
- I'll zip up the backend folder
- You upload it via Railway dashboard

### 1.6 Set Environment Variables
Click on your backend service → **"Variables"** tab:

```
NODE_ENV=production
PORT=3001
```

Railway auto-sets these from your databases:
- DATABASE_URL (from PostgreSQL)
- REDIS_URL (from Redis)

**Optional (for AI features):**
```
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

### 1.7 Get Your Backend URL
- Click on backend service
- Go to **"Settings"** → **"Networking"**  
- Click **"Generate Domain"**
- Copy the URL (something like: `darkcity-backend-production-xxxx.up.railway.app`)

**✅ Backend deployed!**

---

## Step 2: Deploy Frontend to Netlify (5 minutes)

### 2.1 Build Frontend Locally

First, tell me your **backend URL from Step 1.7**, then run:

```bash
cd projects/darkcity/frontend

# I'll give you these commands with YOUR backend URL filled in
echo "NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL" > .env.production
echo "NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND-URL" >> .env.production

npm install
npm run build
```

### 2.2 Deploy to Netlify

**Option A: Drag & Drop (Easiest)**
- Go to https://app.netlify.com
- Find your darkcity.wtf site (or create new site)
- Drag the `.next` folder into Netlify
- Done!

**Option B: Netlify CLI**
```bash
netlify deploy --prod --dir=.next
```

### 2.3 Verify darkcity.wtf
- Visit https://darkcity.wtf
- Should see gothic styled interface
- Check browser console for any errors

**✅ Frontend deployed!**

---

## Step 3: Test Everything (2 minutes)

### 3.1 Health Check
Visit: `https://your-backend-url/health`  
Should return: `{"status":"ok"}`

### 3.2 Frontend Works
- Visit darkcity.wtf
- Should see gothic city interface
- Map should load
- No console errors

### 3.3 Real-Time WebSocket
- Open darkcity.wtf
- Open browser DevTools → Network tab → WS
- Should see WebSocket connection established

---

## If Anything Goes Wrong

**Backend won't start:**
- Check Railway logs: Service → Deployments → View logs
- Common issue: Missing environment variables

**Frontend can't connect:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings (backend should allow darkcity.wtf)

**Database connection fails:**
- Ensure PostgreSQL service is running
- Check DATABASE_URL variable exists

---

## What I'll Do While You Deploy

I'll be monitoring and ready to help with:
1. Environment variable issues
2. Build errors
3. Connection problems
4. Any debugging needed

**Just tell me which step you're on, and I'll verify each one** ✅

---

## Let's Start!

**Ready?** Start with Step 1.1 (go to railway.app/dashboard).

Tell me when you're there and I'll guide you through each click 🚂🏰
