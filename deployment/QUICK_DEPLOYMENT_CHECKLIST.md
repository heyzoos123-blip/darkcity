# DARKCITY - Quick Deployment Checklist

**Use this checklist during deployment to ensure nothing is missed.**

Print this page or keep it open during deployment.

---

## Pre-Flight Checks

- [ ] All documentation reviewed
- [ ] GitHub repository accessible
- [ ] Domain darkcity.wtf ownership confirmed
- [ ] API keys ready (Anthropic/OpenAI)
- [ ] Credit card ready for Railway (if needed beyond free tier)

---

## Phase 1: Backend Deployment (Railway)

### Setup (15 min)
- [ ] Create Railway account at railway.app
- [ ] Verify email
- [ ] Add payment method
- [ ] Create new project "darkcity-backend"

### PostgreSQL (5 min)
- [ ] Add PostgreSQL database service
- [ ] Verify DATABASE_URL variable created
- [ ] Check PostgreSQL is running (green status)

### Redis (5 min)
- [ ] Add Redis database service
- [ ] Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD created
- [ ] Check Redis is running (green status)

### Qdrant (10 min)
- [ ] Sign up at cloud.qdrant.io
- [ ] Create cluster "darkcity-vectors"
- [ ] Create API key
- [ ] Copy QDRANT_URL and QDRANT_API_KEY

### Backend Service (30 min)
- [ ] Add service from GitHub repo
- [ ] Set root directory: `apps/backend`
- [ ] Set build command: `npm install && npm run build`
- [ ] Set start command: `npm start`
- [ ] Add environment variables:
  - [ ] NODE_ENV=production
  - [ ] PORT=3001
  - [ ] DATABASE_URL=${{Postgres.DATABASE_URL}}
  - [ ] REDIS_HOST=${{Redis.REDIS_HOST}}
  - [ ] REDIS_PORT=${{Redis.REDIS_PORT}}
  - [ ] REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
  - [ ] QDRANT_URL=<your-url>
  - [ ] QDRANT_API_KEY=<your-key>
  - [ ] ANTHROPIC_API_KEY=<your-key>
  - [ ] OPENAI_API_KEY=<your-key>
  - [ ] FRONTEND_URL=https://darkcity.wtf
  - [ ] SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
  - [ ] SOLANA_NETWORK=mainnet-beta
- [ ] Deploy and wait for build
- [ ] Check logs for errors

### Database Migration (10 min)
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login: `railway login`
- [ ] Link to project: `railway link`
- [ ] Run migrations: `railway run npx prisma migrate deploy`
- [ ] Verify migration success

### Backend Verification (10 min)
- [ ] Get backend URL from Railway
- [ ] Test health check: `curl https://<backend-url>/health`
- [ ] Verify response shows all services healthy
- [ ] Check logs for "DARKCITY server running"
- [ ] Save backend URL for frontend deployment

**Backend URL**: `_______________________________________`

---

## Phase 2: Frontend Deployment (Netlify)

### Setup (10 min)
- [ ] Create Netlify account at netlify.com
- [ ] Sign in with GitHub
- [ ] Authorize Netlify

### Import Project (15 min)
- [ ] Click "Add new site"
- [ ] Choose "Import an existing project"
- [ ] Select darkcity repository
- [ ] Set base directory: `frontend`
- [ ] Set build command: `npm install && npm run build`
- [ ] Set publish directory: `.next`

### Environment Variables (5 min)
- [ ] Add NEXT_PUBLIC_API_URL=<backend-url-from-phase-1>
- [ ] Add NEXT_PUBLIC_WS_URL=wss://<backend-url-from-phase-1>
- [ ] Add NODE_VERSION=18

### Deploy (10 min)
- [ ] Click "Deploy site"
- [ ] Wait for build to complete (2-5 min)
- [ ] Check build logs for errors
- [ ] Get temporary Netlify URL

**Netlify URL**: `_______________________________________`

### Custom Domain (15 min)
- [ ] Site settings → Domain management
- [ ] Add custom domain: darkcity.wtf
- [ ] Choose DNS option (Netlify DNS recommended)
- [ ] Update nameservers at domain registrar
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Verify SSL certificate provisioned

### HTTPS (5 min)
- [ ] Check HTTPS enabled (auto)
- [ ] Enable "Force HTTPS"
- [ ] Test https://darkcity.wtf loads

---

## Phase 3: Backend CORS Update

- [ ] Railway → Backend service → Environment variables
- [ ] Confirm FRONTEND_URL=https://darkcity.wtf
- [ ] Redeploy backend (auto-redeploy or manual)
- [ ] Verify CORS allows darkcity.wtf

---

## Phase 4: Integration Testing

### Backend Tests (10 min)
- [ ] Health check: `curl https://<backend-url>/health`
- [ ] Create agent: `POST /api/agents` with test data
- [ ] Get agents: `GET /api/agents`
- [ ] Create event: `POST /api/events`
- [ ] Check logs for errors

### Frontend Tests (15 min)
- [ ] Visit https://darkcity.wtf
- [ ] Open DevTools → Console (check for errors)
- [ ] Check WebSocket connection (should see "Connected to server")
- [ ] Test map rendering
- [ ] Test navigation
- [ ] Check Network tab (API calls working)

### Integration Tests (15 min)
- [ ] Create agent via frontend (if UI ready)
- [ ] Verify agent appears on map
- [ ] Create event
- [ ] Verify event appears in feed
- [ ] Test real-time updates
- [ ] Test on mobile device
- [ ] Test in different browsers (Chrome, Firefox, Safari)

---

## Phase 5: Monitoring Setup

### Railway Monitoring (10 min)
- [ ] Enable notifications (Slack/Discord/Email)
- [ ] Set alert thresholds
- [ ] Bookmark metrics dashboard
- [ ] Set up daily check reminder

### Netlify Monitoring (5 min)
- [ ] Enable deploy notifications
- [ ] Check analytics (if available)
- [ ] Bookmark dashboard

---

## Phase 6: Post-Launch

### Immediate (First Hour)
- [ ] Monitor logs (Railway + Netlify)
- [ ] Check error rates
- [ ] Test all features again
- [ ] Watch for user issues
- [ ] Fix critical bugs immediately

### First 24 Hours
- [ ] Check every 2-4 hours
- [ ] Monitor metrics
- [ ] Address any issues
- [ ] Document any problems

### First Week
- [ ] Daily health checks
- [ ] Review logs
- [ ] Optimize as needed
- [ ] Gather feedback

---

## Rollback Procedure (If Needed)

### Backend Rollback
- [ ] Railway → Deployments → Previous deploy → Redeploy

### Frontend Rollback
- [ ] Netlify → Deploys → Previous deploy → Publish

### Database Rollback (DESTRUCTIVE)
- [ ] Only if absolutely necessary
- [ ] Restore from backup: `psql $DATABASE_URL < backup.sql`

---

## Success Criteria

**Deployment is successful if**:
- [ ] Backend health check returns 200 OK
- [ ] Frontend loads at https://darkcity.wtf
- [ ] No console errors (or only minor warnings)
- [ ] WebSocket connects successfully
- [ ] API calls work
- [ ] Map renders correctly
- [ ] Real-time updates work
- [ ] HTTPS enabled and working
- [ ] No critical errors in logs

---

## Contact Info

**Railway Support**: support@railway.app | Discord  
**Netlify Support**: support@netlify.com | Community  

**Emergency Discord/Slack**: _______________________________

---

## Notes & Issues

**Encountered Issues**:
```
Issue 1: _____________________________________________
Solution: ____________________________________________

Issue 2: _____________________________________________
Solution: ____________________________________________

Issue 3: _____________________________________________
Solution: ____________________________________________
```

**Deployment Start Time**: ______________________  
**Backend Deployed**: ______________________  
**Frontend Deployed**: ______________________  
**Testing Complete**: ______________________  
**GO LIVE**: ______________________  

**Backend URL**: _______________________________________  
**Frontend URL**: https://darkcity.wtf  

---

🌃 **"Launch with precision. Monitor with care. Celebrate success."** ⚡

---

## Post-Deployment Checklist

- [ ] Update README.md with production URLs
- [ ] Create DEPLOYMENT_LOG.md with all credentials (encrypt!)
- [ ] Backup environment variables securely
- [ ] Share launch announcement
- [ ] Schedule first maintenance check (1 week)
- [ ] Document lessons learned
- [ ] Celebrate! 🎉

---

**Deployment Complete!** ✅

**DARKCITY is live at https://darkcity.wtf**

**The living city for autonomous agents is now ONLINE.** 🌃⚡
