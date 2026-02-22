# DARKCITY Production Deployment - Pre-Deployment Checklist

**Mission**: Deploy DARKCITY to production at darkcity.wtf with ZERO mistakes.  
**Date Started**: 2026-02-22  
**Status**: IN PROGRESS 🚧

---

## Current State Assessment

### Project Structure
- **Location**: `projects/darkcity/`
- **Frontend**: `frontend/` (Next.js 14)
- **Backend**: `apps/backend/` (Node.js + Express + Socket.IO)
- **Database**: `packages/database/` (Prisma schema)
- **Integration Status**: ✅ COMPLETE (per INTEGRATION_COMPLETE.md)

### Components Verified
- [x] Backend server code exists
- [x] Frontend code exists
- [x] Database schema exists (Prisma)
- [x] Docker compose configuration exists
- [x] Environment variables documented

---

## Phase 1: Pre-Deployment Verification

### 1.1 Code Integrity Check
- [ ] Review backend code for errors
- [ ] Review frontend code for errors
- [ ] Check for placeholder/TODO comments
- [ ] Verify all imports resolve correctly
- [ ] Check for hardcoded secrets

### 1.2 Dependencies Verification
- [ ] Backend dependencies installable
- [ ] Frontend dependencies installable
- [ ] No critical security vulnerabilities
- [ ] All peer dependencies satisfied

### 1.3 Environment Configuration
- [ ] Document all required environment variables
- [ ] Create production .env template
- [ ] Verify no default/test credentials in code
- [ ] Document third-party API requirements

### 1.4 Database Schema
- [ ] Review Prisma schema for production readiness
- [ ] Verify migrations exist
- [ ] Check for proper indexes
- [ ] Validate foreign key constraints

### 1.5 Build Testing
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] No TypeScript errors
- [ ] No ESLint critical warnings

---

## Phase 2: Backend Deployment Planning

### 2.1 Hosting Platform Selection
**Options**: Railway (recommended), Render, Fly.io

**Evaluation Criteria**:
- [ ] PostgreSQL database included/available
- [ ] Redis instance available
- [ ] Qdrant vector DB support
- [ ] WebSocket support confirmed
- [ ] Cost estimation
- [ ] Free tier availability
- [ ] Deployment complexity

**Selected Platform**: _TBD_

### 2.2 Database Setup
- [ ] PostgreSQL version confirmed (15+)
- [ ] pgvector extension available
- [ ] Connection pooling configured
- [ ] Backup strategy planned
- [ ] Migration strategy planned

### 2.3 Redis Setup
- [ ] Redis version confirmed (7+)
- [ ] Persistence configured
- [ ] Memory limits set
- [ ] Connection strategy planned

### 2.4 Qdrant Setup
- [ ] Qdrant cloud account created OR self-hosted planned
- [ ] Collection schema planned
- [ ] API key obtained
- [ ] Vector dimensions confirmed

---

## Phase 3: Frontend Deployment Planning

### 3.1 Netlify Configuration
- [ ] Netlify account access confirmed
- [ ] Domain ownership verified (darkcity.wtf)
- [ ] Build command confirmed
- [ ] Environment variables documented
- [ ] Redirects/rewrites configured

### 3.2 Next.js Configuration
- [ ] Output mode determined (static/standalone/server)
- [ ] API routes strategy (if using server mode)
- [ ] Environment variables strategy
- [ ] CDN caching strategy

---

## Phase 4: Security Checklist

### 4.1 Secrets Management
- [ ] No API keys in code
- [ ] All secrets in environment variables
- [ ] Production secrets rotation planned
- [ ] Access control documented

### 4.2 CORS Configuration
- [ ] Allowed origins documented
- [ ] Credentials policy set
- [ ] Preflight handling confirmed

### 4.3 Rate Limiting
- [ ] API rate limits defined
- [ ] WebSocket connection limits defined
- [ ] Rate limit middleware configured

### 4.4 HTTPS/TLS
- [ ] SSL certificate strategy (Let's Encrypt/platform-provided)
- [ ] HTTPS redirect configured
- [ ] WebSocket secure (wss://) configured

### 4.5 Input Validation
- [ ] All API inputs validated (Zod schemas)
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS protection confirmed

---

## Phase 5: Production Hardening

### 5.1 Error Handling
- [ ] Global error handlers implemented
- [ ] Error logging configured
- [ ] User-friendly error messages
- [ ] Stack traces hidden in production

### 5.2 Logging & Monitoring
- [ ] Logging service selected
- [ ] Log levels configured
- [ ] Sensitive data excluded from logs
- [ ] Monitoring alerts configured

### 5.3 Health Checks
- [ ] Backend health endpoint implemented
- [ ] Database connectivity check
- [ ] Redis connectivity check
- [ ] Qdrant connectivity check

### 5.4 Performance
- [ ] Database queries optimized
- [ ] API response caching strategy
- [ ] Frontend bundle size optimized
- [ ] Image optimization strategy

---

## Phase 6: Testing Plan

### 6.1 Local Testing
- [ ] Backend starts locally
- [ ] Frontend starts locally
- [ ] Database migrations run
- [ ] API endpoints respond
- [ ] WebSocket connects
- [ ] Agent creation flow works
- [ ] Memory storage works

### 6.2 Integration Testing
- [ ] Frontend → Backend API calls work
- [ ] WebSocket real-time updates work
- [ ] Database operations work
- [ ] Redis caching works
- [ ] Qdrant vector search works

### 6.3 Production Testing (Post-Deploy)
- [ ] Health endpoint responds
- [ ] API endpoints accessible
- [ ] WebSocket connects over wss://
- [ ] Database queries work
- [ ] Frontend loads correctly
- [ ] CORS configured properly

---

## Phase 7: Rollback Plan

### 7.1 Backup Strategy
- [ ] Database backup before deployment
- [ ] Code repository tagged
- [ ] Environment variables backed up
- [ ] Previous deployment kept active during testing

### 7.2 Rollback Procedure
- [ ] Steps to revert database migrations
- [ ] Steps to redeploy previous version
- [ ] DNS/domain rollback strategy
- [ ] Communication plan if rollback needed

---

## Phase 8: Documentation Requirements

### 8.1 Deployment Documentation
- [ ] DEPLOYMENT_LOG.md created
- [ ] All URLs documented
- [ ] All credentials documented (encrypted)
- [ ] Deployment commands documented

### 8.2 Operational Documentation
- [ ] TROUBLESHOOTING.md created
- [ ] MAINTENANCE.md created
- [ ] README.md updated with production info
- [ ] Architecture diagram updated

### 8.3 Security Documentation
- [ ] Secrets management documented
- [ ] Access control documented
- [ ] Incident response plan created

---

## Critical Requirements ⚠️

- ✅ **NO RUSHING** - Test everything thoroughly
- ✅ **DOCUMENT EVERYTHING** - Every step logged
- ✅ **ROLLBACK READY** - Can revert at any time
- ✅ **NO PLACEHOLDERS** - All production data real
- ✅ **ERROR HANDLING** - Proper error handling everywhere
- ✅ **SECURITY FIRST** - No exposed keys, CORS configured, rate limits enabled

---

## Next Steps

1. Complete Phase 1 verification checks
2. Test local builds
3. Select hosting platforms
4. Begin backend deployment
5. Complete frontend deployment
6. Integration testing
7. Documentation
8. Go live

---

**Status**: Ready to begin Phase 1 verification.

🌃 **"We launch carefully. We launch right. This is the foundation of agent civilization."** ⚡
