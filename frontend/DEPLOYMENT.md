# DARKCITY Frontend Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier works)

### Steps

1. **Push to GitHub**

```bash
cd projects/darkcity/frontend
git init
git add .
git commit -m "Initial DARKCITY frontend"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to your GitHub repo
# - Set project name: darkcity-frontend
# - Set root directory: ./
# - Keep default build settings
```

3. **Configure Environment Variables**

In Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add:
  - `NEXT_PUBLIC_API_URL` - Your backend API URL
  - `NEXT_PUBLIC_SOCKET_URL` - Your WebSocket server URL

4. **Done!**

Your app will be live at `https://your-project.vercel.app`

---

## Deploy to Netlify

### Steps

1. **Build for Static Export** (if needed)

```bash
npm run build
```

2. **Deploy**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Specify build directory: .next
```

3. **Configure**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Deploy with Docker

### 1. Create Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Build & Run

```bash
# Build image
docker build -t darkcity-frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.darkcity.io \
  --build-arg NEXT_PUBLIC_SOCKET_URL=wss://api.darkcity.io \
  .

# Run container
docker run -p 3000:3000 darkcity-frontend
```

### 3. Docker Compose (with backend)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: http://backend:3001
        NEXT_PUBLIC_SOCKET_URL: ws://backend:3001
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: darkcity-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

---

## Deploy to AWS (EC2 + nginx)

### 1. Launch EC2 Instance

- AMI: Ubuntu 22.04
- Instance type: t3.small (minimum)
- Security group: Allow ports 80, 443, 22

### 2. Setup Server

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repo
git clone <your-repo>
cd darkcity/frontend

# Install dependencies
npm ci

# Build
NEXT_PUBLIC_API_URL=https://api.darkcity.io \
NEXT_PUBLIC_SOCKET_URL=wss://api.darkcity.io \
npm run build

# Start with PM2
pm2 start npm --name darkcity-frontend -- start
pm2 save
pm2 startup
```

### 3. Setup nginx

```bash
sudo apt-get install nginx

# Create config
sudo nano /etc/nginx/sites-available/darkcity
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/darkcity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Deploy to Cloudflare Pages

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push -u origin main
```

### 2. Connect to Cloudflare Pages

- Go to Cloudflare Dashboard → Pages
- Click "Create a project"
- Connect your GitHub repo
- Configure:
  - Build command: `npm run build`
  - Build output directory: `.next`
  - Environment variables: Add `NEXT_PUBLIC_*` vars

### 3. Deploy

Cloudflare will automatically build and deploy on every push to main.

---

## Environment Variables Reference

### Required

```bash
NEXT_PUBLIC_API_URL=<backend-api-url>
NEXT_PUBLIC_SOCKET_URL=<websocket-server-url>
```

### Optional

```bash
# Analytics
NEXT_PUBLIC_ANALYTICS_ID=<your-analytics-id>

# Feature flags
NEXT_PUBLIC_ENABLE_3D=false

# Debug mode
NEXT_PUBLIC_DEBUG=false
```

---

## Performance Optimization

### 1. Enable Edge Caching

In `next.config.mjs`:

```javascript
const nextConfig = {
  // ... existing config
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
```

### 2. Enable CDN

Use Cloudflare or similar CDN to cache static assets globally.

### 3. Image Optimization

Next.js automatically optimizes images. Ensure you're using the `<Image />` component:

```typescript
import Image from 'next/image';

<Image 
  src="/avatar.png" 
  width={200} 
  height={200}
  alt="Agent avatar"
  priority
/>
```

### 4. Enable Compression

In production, enable gzip/brotli compression via your hosting provider or nginx.

---

## Monitoring

### Application Insights

Add to `app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Error Tracking

Install Sentry:

```bash
npm install @sentry/nextjs
```

Initialize in `app/layout.tsx`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```
                    ┌─────────────┐
                    │ Load        │
Internet ─────────▶ │ Balancer    │
                    └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Instance 1   Instance 2   Instance 3
```

### CDN Caching

Leverage CDN for:
- Static assets (/public/)
- Font files
- Next.js static pages
- API responses (with appropriate cache headers)

### Database Connection Pooling

If your frontend makes direct DB calls (not recommended), use connection pooling:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Rollback Strategy

### Vercel

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Docker

```bash
# Tag images with version
docker build -t darkcity-frontend:v1.2.3 .
docker tag darkcity-frontend:v1.2.3 darkcity-frontend:latest

# Rollback
docker-compose down
docker run -p 3000:3000 darkcity-frontend:v1.2.2
```

### PM2

```bash
# Save current state
pm2 save

# Rollback to previous code
git checkout v1.2.2
npm ci
npm run build
pm2 restart darkcity-frontend
```

---

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### WebSocket Connection Issues

Check:
- CORS configuration on backend
- `NEXT_PUBLIC_SOCKET_URL` is correct
- Firewall allows WebSocket connections
- Load balancer supports WebSocket (sticky sessions)

### Performance Issues

- Enable React DevTools Profiler
- Check bundle size: `npm run build` (look for large chunks)
- Lazy load components with `dynamic()`:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
});
```

---

## Security Checklist

- [ ] Environment variables set correctly (no hardcoded secrets)
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured properly on backend
- [ ] Rate limiting enabled
- [ ] Content Security Policy (CSP) headers set
- [ ] Regular dependency updates (`npm audit`)
- [ ] Authentication/authorization implemented
- [ ] Input validation on all forms

---

## Maintenance

### Weekly

- Check error logs
- Monitor performance metrics
- Review user feedback

### Monthly

- Update dependencies: `npm update`
- Security audit: `npm audit fix`
- Performance audit: Lighthouse CI

### Quarterly

- Major version updates
- Infrastructure review
- Disaster recovery drill

---

**Need help?** Check the [main README](./README.md) or open an issue.
