# MailZero Railway Quick Start Guide

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository
```bash
# Run the migration helper script
npm run migrate:railway

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your MailZero repository

### 3. Add Required Services
In your Railway dashboard:
- **Add PostgreSQL**: Click "New" → "Database" → "PostgreSQL"
- **Add Redis**: Click "New" → "Database" → "Redis"

### 4. Configure Environment Variables
Copy variables from `railway.env.example` to your Railway project:

**Essential Variables:**
```bash
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=your_32_char_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_key
```

### 5. Deploy
```bash
# Connect to your Railway project
railway link

# Deploy
railway up
```

## 📋 Files Created for Railway

- `railway.json` - Railway project configuration
- `Dockerfile.railway` - Optimized Docker build
- `railway-start.js` - Application startup script
- `railway.env.example` - Environment variables template
- `RAILWAY_DEPLOYMENT.md` - Complete deployment guide
- `scripts/migrate-to-railway.js` - Migration helper
- `scripts/deploy-railway.sh` - Automated deployment script

## ⚠️ Important Code Changes Required

### 1. Update Server Entry Point
Replace Cloudflare Workers bindings in `apps/server/src/main.ts`:

```typescript
// Add at the top
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// Replace Cloudflare bindings with Railway equivalents
// See RAILWAY_DEPLOYMENT.md for detailed examples
```

### 2. Database Connection
Replace Hyperdrive with direct PostgreSQL:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client)
```

### 3. Queue System
Replace Cloudflare Queues with Redis:
```bash
pnpm add bullmq ioredis
```

```typescript
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)
export const emailQueue = new Queue('email-processing', { connection: redis })
```

## 🔧 Architecture Changes

| Cloudflare | Railway Alternative |
|------------|-------------------|
| Workers | Node.js with Hono |
| Pages | Static files served by Node.js |
| Hyperdrive | Direct PostgreSQL connection |
| R2 Storage | Railway volumes or S3 |
| KV Store | Redis |
| Queues | BullMQ + Redis |
| Vectorize | pgvector extension |
| Durable Objects | In-memory state or Redis |

## 💰 Cost Comparison

**Cloudflare (Current):**
- Workers: $5/month + requests
- Pages: Free tier
- D1/R2/KV: Usage-based

**Railway (Estimated):**
- Hobby Plan: $5/month
- PostgreSQL: $5-20/month
- Redis: $5-15/month
- **Total: ~$15-40/month**

## 🚨 Migration Checklist

- [ ] **Backup current data** from Cloudflare services
- [ ] **Set up Railway project** with PostgreSQL and Redis
- [ ] **Update server code** to use Node.js instead of Workers
- [ ] **Configure environment variables** in Railway
- [ ] **Migrate database schema** using Drizzle
- [ ] **Test all functionality** in Railway environment
- [ ] **Update DNS** to point to Railway domain
- [ ] **Monitor performance** and optimize as needed

## 🆘 Need Help?

1. **Detailed Guide**: See `RAILWAY_DEPLOYMENT.md`
2. **Migration Notes**: See `MIGRATION_NOTES.md`
3. **Railway Docs**: [docs.railway.app](https://docs.railway.app)
4. **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)

## 🎯 Quick Commands

```bash
# Run migration helper
npm run migrate:railway

# Build for Railway
npm run railway:build

# Start in Railway mode
npm run railway:start

# Deploy to Railway
railway up

# Check deployment status
railway status

# View logs
railway logs
```

---

**Next Step**: Run `npm run migrate:railway` to generate the necessary configuration files, then follow the detailed deployment guide in `RAILWAY_DEPLOYMENT.md`.

