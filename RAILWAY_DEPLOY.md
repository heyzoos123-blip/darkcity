# Deploy DARKCITY Backend to Railway

## Quick Deploy (5 minutes)

### Option 1: Railway CLI (Fastest)

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to your Railway account
railway login

# Navigate to backend
cd projects/darkcity/apps/backend

# Initialize Railway project
railway init

# Add PostgreSQL database
railway add --database postgresql

# Add Redis
railway add --database redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001

# Deploy!
railway up

# Get your backend URL
railway domain
```

Your backend will be live at: `https://darkcity-backend-xxxxx.up.railway.app`

---

### Option 2: Railway Dashboard (Manual)

1. **Go to** https://railway.app/dashboard

2. **Create New Project** → "Deploy from GitHub repo"
   - Select your darkcity repo
   - Root directory: `apps/backend`
   - Or click "Deploy from local" and upload `apps/backend` folder

3. **Add Services:**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Click "+ New" → "Database" → "Redis"
   - (Qdrant can be added later or use Qdrant Cloud)

4. **Configure Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${RAILWAY_POSTGRESQL_URL}
   REDIS_URL=${RAILWAY_REDIS_URL}
   ANTHROPIC_API_KEY=<your-key>
   OPENAI_API_KEY=<your-key>
   ```

5. **Deploy Settings:**
   - Build command: `npm install`
   - Start command: `npm start`
   - Click "Deploy"

6. **Generate Domain:**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the URL (e.g., `darkcity-backend.up.railway.app`)

---

## Environment Variables Needed

Required:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<railway-postgresql-url>
REDIS_URL=<railway-redis-url>
```

Optional (for AI features):
```env
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>
QDRANT_URL=<qdrant-cloud-url>
QDRANT_API_KEY=<qdrant-api-key>
```

Railway auto-populates `DATABASE_URL` and `REDIS_URL` when you add those services.

---

## After Backend Deployment

Once backend is deployed, you'll get a URL like:
`https://darkcity-backend-xxxxx.up.railway.app`

**Test it:**
```bash
curl https://your-backend-url/health
# Should return: {"status":"ok"}
```

**Next: Deploy Frontend to Netlify**

Update frontend environment variables:
```bash
cd projects/darkcity/frontend

echo "NEXT_PUBLIC_API_URL=https://your-backend-url" > .env.production
echo "NEXT_PUBLIC_WS_URL=wss://your-backend-url" >> .env.production

npm run build
netlify deploy --prod
```

---

## Database Migrations

After first deployment, run migrations:

```bash
# Via Railway CLI
railway run npx prisma migrate deploy

# Or via Railway dashboard
# Shell tab → run: npx prisma migrate deploy
```

---

## Monitoring

**Railway Dashboard:**
- Deployments → View logs
- Metrics → CPU/Memory usage
- Database → Query console

**Health Check:**
`GET https://your-backend-url/health`

**WebSocket Test:**
Connect to `wss://your-backend-url` (should upgrade connection)

---

## Cost Estimate

Railway Free Tier:
- $5/month credit
- Covers small projects

Darkcity Backend Usage:
- Web service: ~$3-5/month
- PostgreSQL: ~$2-3/month
- Redis: ~$1-2/month

**Total: ~$6-10/month** (may exceed free tier)

Upgrade to Hobby plan ($5/month base + usage) for more resources.

---

## Troubleshooting

**Build fails:**
- Check package.json has all dependencies
- Verify Node version (18+)

**Database connection fails:**
- Ensure DATABASE_URL is set
- Check PostgreSQL service is running

**WebSocket fails:**
- Railway may need timeout adjustment
- Check CORS settings in backend code

**Port issues:**
- Railway sets PORT automatically
- Backend must use `process.env.PORT`

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Get backend URL
3. ✅ Test health endpoint
4. ⏳ Configure frontend with backend URL
5. ⏳ Deploy frontend to Netlify
6. ✅ Test full stack integration
7. 🎉 darkcity.wtf goes live!

---

**Ready to deploy? Run:**
```bash
cd projects/darkcity/apps/backend
railway login
railway init
railway up
```

🚂 All aboard! 🏰
