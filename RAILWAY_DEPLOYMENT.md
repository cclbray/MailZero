# MailZero Railway Deployment Guide

This guide will help you deploy your MailZero application to Railway, migrating from the current Cloudflare Workers setup.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your MailZero code should be in a GitHub repository
3. **External Services**: Gmail API credentials, AI service API keys

## Architecture Overview

### Current (Cloudflare)
- Frontend: Cloudflare Pages
- Backend: Cloudflare Workers with Hono
- Database: Hyperdrive + PostgreSQL
- Storage: R2, KV, Durable Objects
- Queue: Cloudflare Queues

### Railway Migration
- **Single Service**: Combined frontend + backend
- **Database**: Railway PostgreSQL plugin
- **Cache/Queue**: Railway Redis plugin
- **Storage**: Railway volumes or external (S3/Supabase)
- **Background Jobs**: In-process or separate worker service

## Deployment Steps

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new
```

### 2. Add Database Services

In your Railway dashboard:

1. **Add PostgreSQL Plugin**
   - Click "New" → "Database" → "PostgreSQL"
   - Note the connection details

2. **Add Redis Plugin**
   - Click "New" → "Database" → "Redis"
   - Note the connection details

### 3. Configure Environment Variables

Copy all variables from `railway.env.example` to your Railway project:

```bash
# Set environment variables via CLI
railway variables set NODE_ENV=production
railway variables set PORT=3000
# ... add all other variables
```

Or use the Railway dashboard to set them via the web interface.

### 4. Deploy the Application

```bash
# Connect your GitHub repo
railway connect

# Deploy
railway up
```

## Code Modifications Required

### 1. Server Adaptation (`apps/server/src/main.ts`)

You'll need to modify the server to work outside Cloudflare Workers:

```typescript
// Replace Cloudflare Workers bindings with Railway equivalents
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Serve static files (frontend build)
app.use('/assets/*', serveStatic({ root: './apps/mail/build/client' }))
app.get('*', serveStatic({ 
  root: './apps/mail/build/client',
  rewriteRequestPath: (path) => path === '/' ? '/index.html' : path
}))

// API routes
app.route('/api', apiRoutes)

// Start server
const port = parseInt(process.env.PORT || '3000')
serve({
  fetch: app.fetch,
  port
})
```

### 2. Database Connection

Replace Hyperdrive with direct PostgreSQL connection:

```typescript
// apps/server/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client)
```

### 3. Redis/Queue Implementation

Replace Cloudflare Queues with Redis-based queues:

```typescript
// apps/server/src/lib/queue.ts
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export const emailQueue = new Queue('email-processing', {
  connection: redis
})

// Worker
export const emailWorker = new Worker('email-processing', 
  async (job) => {
    // Process email job
  },
  { connection: redis }
)
```

### 4. File Storage

Replace R2 with Railway volumes or external storage:

```typescript
// apps/server/src/lib/storage.ts
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'

export async function saveFile(filename: string, data: Buffer) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const filepath = path.join(UPLOAD_DIR, filename)
  await fs.writeFile(filepath, data)
  return filepath
}
```

### 5. Vector Search

Replace Vectorize with pgvector:

```sql
-- Add to your database migration
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536),
  metadata JSONB
);

CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

## Migration Checklist

### Pre-Migration
- [ ] Backup all data from Cloudflare services
- [ ] Export KV store data
- [ ] Document all environment variables
- [ ] Test locally with Railway services

### Code Changes
- [ ] Adapt server for Node.js environment
- [ ] Replace Cloudflare bindings with Railway equivalents
- [ ] Update database connections
- [ ] Implement Redis-based queuing
- [ ] Set up file storage solution
- [ ] Migrate vector search to pgvector

### Deployment
- [ ] Set up Railway project and services
- [ ] Configure environment variables
- [ ] Deploy and test basic functionality
- [ ] Migrate data from Cloudflare
- [ ] Update DNS and domain settings
- [ ] Set up monitoring and alerts

### Post-Migration
- [ ] Verify all features work correctly
- [ ] Monitor performance and errors
- [ ] Update documentation
- [ ] Train team on Railway platform

## Service Architecture Options

### Option A: Monolith (Recommended for MVP)
Single Railway service running both frontend and backend.

**Pros:**
- Simplest deployment
- Lower cost
- Easier debugging

**Cons:**
- Less scalable
- Single point of failure

### Option B: Microservices
Separate Railway services for different components.

**Services:**
1. **Frontend Service**: Static file serving
2. **API Service**: Main backend logic
3. **Worker Service**: Background job processing
4. **Webhook Service**: Handle external webhooks

**Pros:**
- Better scalability
- Independent deployments
- Fault isolation

**Cons:**
- More complex setup
- Higher costs
- Network latency between services

## Cost Estimation

### Railway Services (Monthly)
- **Hobby Plan**: $5/month + usage
- **PostgreSQL**: ~$5-20/month depending on usage
- **Redis**: ~$5-15/month depending on usage
- **Compute**: ~$10-50/month depending on traffic

### Total Estimated Cost: $25-90/month

## Performance Considerations

### Optimizations for Railway
1. **Connection Pooling**: Use pgBouncer for database connections
2. **Caching**: Implement Redis caching for frequent queries
3. **CDN**: Use Railway's built-in CDN or external CDN
4. **Image Optimization**: Implement image resizing and compression
5. **Background Jobs**: Use Redis queues for heavy processing

### Monitoring
- **Railway Metrics**: Built-in monitoring dashboard
- **Sentry**: Error tracking and performance monitoring
- **Custom Metrics**: Implement application-specific metrics

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check connection limits

2. **Memory Issues**
   - Monitor memory usage in Railway dashboard
   - Optimize database queries
   - Implement proper garbage collection

3. **File Upload Issues**
   - Check volume mounts
   - Verify upload directory permissions
   - Monitor disk space usage

### Debug Commands

```bash
# Check service logs
railway logs

# Connect to database
railway connect postgres

# Connect to Redis
railway connect redis

# SSH into service (if needed)
railway shell
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets to code
2. **Database Security**: Use SSL connections
3. **API Security**: Implement rate limiting and authentication
4. **CORS**: Configure proper CORS policies
5. **Headers**: Set security headers (HSTS, CSP, etc.)

## Backup Strategy

1. **Database Backups**: Railway provides automatic backups
2. **File Backups**: Implement regular file system backups
3. **Configuration Backups**: Store environment variables securely
4. **Code Backups**: Use Git for version control

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Railway Status**: [status.railway.app](https://status.railway.app)

## Next Steps

After successful deployment:

1. **Domain Setup**: Configure custom domain
2. **SSL Certificates**: Enable HTTPS
3. **Monitoring**: Set up alerts and dashboards
4. **Scaling**: Configure auto-scaling if needed
5. **Backup**: Set up automated backups
6. **Documentation**: Update team documentation

---

This guide provides a comprehensive roadmap for migrating MailZero from Cloudflare Workers to Railway. The migration will require code changes but will result in a more traditional and potentially more cost-effective deployment.
