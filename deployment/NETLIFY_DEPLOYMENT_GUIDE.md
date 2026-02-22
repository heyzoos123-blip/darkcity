# Netlify Deployment Guide - DARKCITY Frontend

**Platform**: Netlify (netlify.com)  
**Purpose**: Deploy Next.js frontend  
**Domain**: darkcity.wtf  

---

## Prerequisites

- GitHub account with darkcity repository
- Netlify account (sign up at netlify.com)
- Domain darkcity.wtf (verify ownership)
- Backend deployed to Railway with URL

---

## Step 1: Create Netlify Account

1. Go to https://netlify.com
2. Click "Sign up"
3. Choose "Sign up with GitHub" (recommended)
4. Authorize Netlify to access your GitHub account
5. Verify email if required

---

## Step 2: Import Project from GitHub

1. Click "Add new site" → "Import an existing project"
2. Choose "GitHub" as your Git provider
3. Authorize Netlify (if not already done)
4. Search for your `darkcity` repository
5. Click on the repository to select it

---

## Step 3: Configure Build Settings

### Site Configuration:

**Owner**: Your Netlify team (personal or organization)

**Branch to deploy**: `main` (or your production branch)

**Base directory**: `frontend`
- ⚠️ **Important**: Set this to `frontend` since Next.js app is in a subdirectory

**Build command**:
```bash
npm install && npm run build
```

**Publish directory**:
```
.next
```

**Functions directory**: (leave empty)

### Advanced Build Settings:

Click "Show advanced" and add environment variables (see Step 4)

---

## Step 4: Set Environment Variables

Click "Advanced build settings" → "New variable"

Add these variables:

```env
# Backend API URL (from Railway deployment)
NEXT_PUBLIC_API_URL=https://darkcity-backend-production-xxxx.up.railway.app

# Backend WebSocket URL (same as API but wss://)
NEXT_PUBLIC_WS_URL=wss://darkcity-backend-production-xxxx.up.railway.app

# Node version (optional, ensure consistency)
NODE_VERSION=18
```

**Important**:
- Replace `darkcity-backend-production-xxxx.up.railway.app` with your actual Railway backend URL
- Use `wss://` for WebSocket (secure WebSocket)
- Do NOT include trailing slashes

---

## Step 5: Deploy Site

1. Click "Deploy site"
2. Netlify will:
   - Clone your repository
   - Install dependencies
   - Run build command
   - Deploy to their CDN

3. Watch the deploy log for any errors
4. Typical build time: 2-5 minutes

### Expected Build Output:

```
Installing dependencies
✓ Dependencies installed

Building Next.js app
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages
✓ Finalizing page optimization

Deploy successful!
```

---

## Step 6: Verify Deployment

Once deployed, you'll get a temporary URL like:
```
https://random-name-12345.netlify.app
```

### Test the deployment:

1. Click "Open production deploy"
2. Verify:
   - [ ] Site loads
   - [ ] No console errors (open browser DevTools)
   - [ ] Map renders
   - [ ] API connection works (check Network tab)
   - [ ] WebSocket connects (check console for connection logs)

### Common Issues:

**"API connection failed"**:
- Check NEXT_PUBLIC_API_URL is correct
- Verify backend is running on Railway
- Check CORS settings in backend (should allow your Netlify URL)

**"WebSocket connection failed"**:
- Verify NEXT_PUBLIC_WS_URL uses `wss://` not `http://`
- Check backend WebSocket server is running
- Check firewall/proxy settings

**"Build failed"**:
- Check build logs for errors
- Verify dependencies are in package.json
- Check Node version compatibility

---

## Step 7: Configure Custom Domain (darkcity.wtf)

### Option A: If you own darkcity.wtf already

1. In Netlify dashboard → Site settings → Domain management
2. Click "Add custom domain"
3. Enter: `darkcity.wtf`
4. Netlify will check domain availability
5. Click "Verify" then "Add domain"

6. Netlify will provide DNS configuration:
   - **Option 1 (Recommended)**: Use Netlify DNS
   - **Option 2**: Keep your current DNS provider

#### Option 1: Netlify DNS (Recommended)

1. Click "Set up Netlify DNS"
2. Netlify will show name servers:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```
3. Go to your domain registrar (where you bought darkcity.wtf)
4. Update name servers to Netlify's name servers
5. Wait for DNS propagation (up to 24 hours, usually faster)

#### Option 2: External DNS

1. Keep your current DNS provider
2. Add these records to your DNS:
   
   **A Record**:
   ```
   Type: A
   Name: @ (or leave blank for root domain)
   Value: 75.2.60.5
   ```
   
   **CNAME Record (for www subdomain)**:
   ```
   Type: CNAME
   Name: www
   Value: random-name-12345.netlify.app
   ```

3. Save DNS records
4. Wait for DNS propagation (5-30 minutes typically)

### Option B: If you DON'T own darkcity.wtf yet

1. Purchase domain from registrar (Namecheap, Google Domains, etc.)
2. Follow Option A above once you own it

---

## Step 8: Enable HTTPS

**Netlify automatically provisions SSL certificates!**

1. Go to Site settings → Domain management → HTTPS
2. Netlify will auto-provision Let's Encrypt certificate
3. This usually takes 1-10 minutes
4. Once provisioned, you'll see "HTTPS enabled" ✅

### Force HTTPS:

1. Scroll to "Force HTTPS"
2. Toggle ON
3. This redirects all HTTP traffic to HTTPS

---

## Step 9: Configure Deploy Settings

### Deploy Contexts:

1. Go to Site settings → Build & deploy → Deploy contexts
2. Configure:
   - **Production branch**: `main`
   - **Branch deploys**: All (or specific branches)
   - **Deploy previews**: Pull request reviews

### Build Hooks (Optional):

Create webhook for manual/automated deploys:
1. Go to Site settings → Build & deploy → Build hooks
2. Click "Add build hook"
3. Name: "Deploy Production"
4. Branch: `main`
5. Copy webhook URL (useful for CI/CD)

---

## Step 10: Set Up Redirects and Rewrites

Create `frontend/public/_redirects` file:

```
# Redirect all traffic to HTTPS
http://* https://:splat 301!

# SPA fallback for client-side routing
/* /index.html 200
```

Or use `netlify.toml` in frontend directory:

```toml
# frontend/netlify.toml
[build]
  command = "npm install && npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

Commit and push these files, then redeploy.

---

## Step 11: Configure Environment Variables for Production

After backend is deployed and custom domain is set:

1. Go to Site settings → Environment variables
2. Update:
   - `NEXT_PUBLIC_API_URL`: Update if using custom backend domain
   - `NEXT_PUBLIC_WS_URL`: Update if using custom backend domain

3. Trigger a new deploy:
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

---

## Step 12: Set Up Deploy Notifications (Optional)

1. Go to Site settings → Build & deploy → Deploy notifications
2. Add notifications for:
   - **Deploy started**
   - **Deploy succeeded**
   - **Deploy failed**

3. Choose notification method:
   - Email
   - Slack webhook
   - Discord webhook

---

## Step 13: Performance Optimization

### Enable Prerendering:

Netlify automatically optimizes Next.js:
- Static page generation
- Automatic image optimization
- CDN caching

### Configure Caching:

In `netlify.toml`:
```toml
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Step 14: Update Backend CORS

After frontend is live at darkcity.wtf:

1. Go to Railway backend service
2. Update environment variable:
   ```
   FRONTEND_URL=https://darkcity.wtf
   ```
3. Redeploy backend (or it will auto-redeploy)

This ensures CORS allows requests from your custom domain.

---

## Step 15: Verify Full Integration

### Test Checklist:

- [ ] Visit https://darkcity.wtf
- [ ] Site loads with no errors
- [ ] Check browser console (should show WebSocket connection)
- [ ] Test agent creation (if UI ready)
- [ ] Test map rendering
- [ ] Test real-time updates (create event, see it appear)
- [ ] Test on mobile device
- [ ] Test API calls (Network tab)
- [ ] Verify HTTPS certificate (padlock icon)

### Integration Test:

1. Open browser DevTools → Console
2. You should see:
   ```
   [City] Connected to server
   WebSocket connection established
   ```
3. Open Network tab → Filter "WS"
4. You should see active WebSocket connection to backend

---

## Netlify Dashboard Overview

### Key Sections:

**Deploys**:
- View deploy history
- Rollback to previous deploy
- See deploy logs

**Site settings**:
- Domain management
- Environment variables
- Build settings

**Functions** (if using serverless functions):
- Not needed for this deployment

**Analytics** (paid feature):
- Visitor stats
- Page views
- Performance metrics

---

## Deployment Checklist

- [ ] Netlify account created
- [ ] GitHub repository connected
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Initial deploy successful
- [ ] Custom domain added (darkcity.wtf)
- [ ] DNS configured
- [ ] HTTPS enabled
- [ ] Force HTTPS enabled
- [ ] Redirects configured
- [ ] Backend CORS updated
- [ ] Full integration tested
- [ ] Performance optimized

---

## Rollback Procedure

If something goes wrong:

1. Go to Deploys tab
2. Find last working deploy
3. Click "..." → "Publish deploy"
4. Confirm rollback
5. Site will revert to previous version

---

## Monitoring & Maintenance

### Monitor Deploy Status:
- Check Deploys tab daily
- Set up email/Slack notifications
- Watch for failed builds

### Update Dependencies:
```bash
cd frontend
npm update
git commit -am "Update dependencies"
git push
# Netlify auto-deploys on push to main
```

### Update Environment Variables:
1. Site settings → Environment variables
2. Update as needed
3. Trigger new deploy (required for changes to take effect)

---

## Cost

**Netlify Pricing**:
- **Free tier** (should be sufficient for MVP):
  - 100GB bandwidth/month
  - 300 build minutes/month
  - Unlimited sites
  - HTTPS included
  - Basic analytics

- **Pro tier** ($19/month):
  - 400GB bandwidth
  - Unlimited build minutes
  - Advanced analytics
  - Team collaboration

**Expected Cost**: $0/month (free tier)

---

## Useful Netlify CLI Commands

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Link to site
netlify link

# Deploy manually
netlify deploy

# Deploy to production
netlify deploy --prod

# Open site
netlify open

# View logs
netlify logs

# Run functions locally
netlify dev
```

---

## Support & Resources

- **Netlify Docs**: https://docs.netlify.com
- **Next.js on Netlify**: https://docs.netlify.com/frameworks/next-js/
- **Netlify Community**: https://answers.netlify.com
- **Netlify Status**: https://www.netlifystatus.com

---

## Final Steps After Deployment

1. **Test thoroughly** - Go through all features
2. **Monitor for 24 hours** - Check for errors
3. **Update documentation** - Record all URLs and settings
4. **Announce launch** - Share darkcity.wtf with the world

---

🌃 **"The frontend is the city's face. Make it beautiful."** ⚡

**Result**: DARKCITY live at https://darkcity.wtf
