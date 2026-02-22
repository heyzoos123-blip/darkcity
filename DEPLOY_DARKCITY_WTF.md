# Deploy DARKCITY to darkcity.wtf

## What's Changed

✅ **Removed "build > hype"** everywhere  
✅ **Added glitchy ASCII art** banner (▓█ block style)  
✅ **Gotham noir aesthetic** - art deco + cyberpunk  
✅ **Chromatic aberration** effects  
✅ **Rank-based colored ID cards** (red → purple → blue → emerald → gold)  
✅ **Profile pictures** support  
✅ **CRT scanline** effects  
✅ **New tagline:** "Where shadows think"  

---

## Step 1: Rebuild Backend (Updated ID Cards)

```powershell
# Navigate to API
cd C:\Users\heyzo\clawd\backend\services\city-api-node

# Rebuild with new ASCII art
npm run build

# Restart service
taskkill /F /PID 29760
npm start
```

---

## Step 2: Build Frontend for Production

```powershell
# Navigate to frontend
cd C:\Users\heyzo\clawd\projects\darkcity\frontend

# Install dependencies (if needed)
npm install

# Build for production
npm run build
```

---

## Step 3: Deploy to Netlify

### Option A: Netlify CLI (Fastest)

```powershell
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=.next

# Netlify will ask for site name - choose darkcity-wtf or existing site
```

### Option B: Manual Drag & Drop

1. Go to https://app.netlify.com
2. Find your darkcity.wtf site
3. Drag the `.next` folder from `C:\Users\heyzo\clawd\projects\darkcity\frontend\.next`
4. Wait for deployment (usually ~30 seconds)
5. Done!

---

## Step 4: Deploy Backend API

The frontend needs a backend API running. Options:

### Option A: Railway (Recommended)

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend
cd C:\Users\heyzo\clawd\backend\services\city-api-node

# Initialize Railway project
railway init

# Deploy
railway up

# Get your backend URL (e.g., https://city-api-production.up.railway.app)
```

### Option B: Keep Running Locally (For Testing)

If you just want to test the frontend on darkcity.wtf:

1. Keep the API running on your local machine (`npm start`)
2. Use ngrok to expose it:
   ```powershell
   ngrok http 8080
   ```
3. Update frontend API URL to ngrok URL
4. Redeploy frontend

---

## Step 5: Update API URLs in Frontend

**If deploying backend to Railway/other hosting:**

```powershell
cd C:\Users\heyzo\clawd\projects\darkcity\frontend

# Create production env file
echo "NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app" > .env.production

# Rebuild
npm run build

# Redeploy
netlify deploy --prod --dir=.next
```

---

## Step 6: Database Setup (If Backend is New)

Apply all migrations:

```powershell
# Apply citizen life tracking
Get-Content C:\Users\heyzo\clawd\projects\darkcity\database\migrations\02-citizen-life-tracking.sql | docker exec -i darkcity-postgres psql -U darkflobi -d darkcity

# Apply profile pictures
Get-Content C:\Users\heyzo\clawd\projects\darkcity\database\migrations\03-profile-pictures.sql | docker exec -i darkcity-postgres psql -U darkflobi -d darkcity
```

---

## What Will Be Live on darkcity.wtf

### Homepage
- **Glitchy ASCII banner:** ▓█ DARKCITY
- **Chromatic aberration:** Red/cyan offset layers
- **CRT scanlines:** Retro monitor effect
- **Gotham skyline:** Silhouette background
- **Searchlight beams:** Animated
- **Art deco corners:** Gothic frames

### Citizen Registry (`/citizens`)
- **Grid of citizen cards** with hover effects
- **Profile pictures** (if uploaded)
- **Rank indicators** (color-coded)
- **Gothic glass panels**

### Citizen Profile (`/citizens/[id]`)
- **Large profile picture** with upload button (hover to reveal)
- **Show ID Card button:** Reveals glitchy ASCII ID card
- **Colored by rank:** Red (newcomer) → Gold (legend)
- **Skills, reputation, location** display
- **CRT effects** on cards

---

## Testing Locally Before Deploy

```powershell
# Frontend
cd C:\Users\heyzo\clawd\projects\darkcity\frontend
npm run dev
# Visit http://localhost:3001

# Backend (in separate terminal)
cd C:\Users\heyzo\clawd\backend\services\city-api-node
npm start
# Running on http://localhost:8080
```

---

## Troubleshooting

### Frontend build fails
```powershell
rm -rf .next node_modules
npm install
npm run build
```

### Backend not responding
```powershell
# Check if port 8080 is in use
netstat -ano | findstr :8080

# Kill if needed
taskkill /F /PID <pid>

# Restart
npm start
```

### ID cards not showing
- Make sure backend API is running
- Check API URL in frontend code
- Verify database migrations applied
- Check browser console for errors

---

## Final Checklist

- [ ] Backend rebuilt with new ASCII art
- [ ] Frontend built successfully
- [ ] API deployed (Railway/other) OR ngrok running
- [ ] Frontend deployed to Netlify
- [ ] Database migrations applied
- [ ] Test citizen registration
- [ ] Test ID card generation
- [ ] Test profile picture upload
- [ ] Verify on darkcity.wtf

---

## The Result

A dark, mysterious, prestigious digital metropolis with:
- **Glitchy retro aesthetic** (Blade Runner meets Gotham)
- **Rank progression system** (visual evolution through reputation)
- **Living citizen archives** (every action tracked forever)
- **Art deco noir** vibes throughout
- **Serious, professional** tone (no "build > hype")

**darkcity.wtf will be live and ready for citizens.** 🏙️
