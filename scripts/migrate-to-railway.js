#!/usr/bin/env node

/**
 * Migration script to help transition MailZero from Cloudflare Workers to Railway
 */

const fs = require('fs').promises;
const path = require('path');

class RailwayMigration {
  constructor() {
    this.rootDir = process.cwd();
    this.backupDir = path.join(this.rootDir, 'migration-backup');
  }

  async run() {
    console.log('🚂 Starting MailZero Railway Migration...\n');

    try {
      await this.createBackup();
      await this.updatePackageJson();
      await this.createRailwayConfig();
      await this.updateServerConfig();
      await this.createMigrationNotes();
      
      console.log('\n✅ Migration preparation complete!');
      console.log('\nNext steps:');
      console.log('1. Review the generated files');
      console.log('2. Set up your Railway project');
      console.log('3. Configure environment variables');
      console.log('4. Deploy to Railway');
      console.log('\nSee RAILWAY_DEPLOYMENT.md for detailed instructions.');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  async createBackup() {
    console.log('📦 Creating backup of current configuration...');
    
    await fs.mkdir(this.backupDir, { recursive: true });
    
    const filesToBackup = [
      'apps/server/wrangler.jsonc',
      'apps/mail/wrangler.jsonc',
      'docker-compose.prod.yaml'
    ];

    for (const file of filesToBackup) {
      const source = path.join(this.rootDir, file);
      const dest = path.join(this.backupDir, path.basename(file));
      
      try {
        await fs.copyFile(source, dest);
        console.log(`  ✓ Backed up ${file}`);
      } catch (error) {
        console.log(`  ⚠️  Could not backup ${file}: ${error.message}`);
      }
    }
  }

  async updatePackageJson() {
    console.log('\n📝 Updating package.json for Railway...');
    
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    // Add Railway-specific scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'railway:start': 'node railway-start.js',
      'railway:build': 'turbo run build',
      'railway:dev': 'turbo run dev',
      'railway:migrate': 'pnpm run db:migrate'
    };

    // Add Railway-specific dependencies if needed
    if (!packageJson.dependencies['@hono/node-server']) {
      packageJson.dependencies['@hono/node-server'] = '^1.8.2';
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('  ✓ Updated root package.json');
  }

  async createRailwayConfig() {
    console.log('\n⚙️  Creating Railway configuration...');
    
    // Railway service configuration
    const railwayToml = `[build]
builder = "NIXPACKS"

[deploy]
numReplicas = 1
sleepApplication = false
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
PORT = "3000"
HOSTNAME = "0.0.0.0"`;

    await fs.writeFile(path.join(this.rootDir, 'railway.toml'), railwayToml);
    console.log('  ✓ Created railway.toml');
  }

  async updateServerConfig() {
    console.log('\n🔧 Creating Railway-compatible server configuration...');
    
    const serverAdapterContent = `// Railway server adapter for MailZero
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Import your existing app
import app from './main'

// Create Railway-compatible server
const railwayApp = new Hono()

// Middleware
railwayApp.use('*', cors({
  origin: process.env.VITE_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true
}))
railwayApp.use('*', logger())

// Serve static files (frontend build)
railwayApp.use('/assets/*', serveStatic({ 
  root: './apps/mail/build/client' 
}))

// API routes
railwayApp.route('/api', app)

// SPA fallback - serve index.html for all non-API routes
railwayApp.get('*', serveStatic({ 
  root: './apps/mail/build/client',
  rewriteRequestPath: (path) => {
    // Don't rewrite API paths
    if (path.startsWith('/api/')) return path;
    // Serve index.html for SPA routes
    return '/index.html';
  }
}))

// Health check endpoint
railwayApp.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Start server
const port = parseInt(process.env.PORT || '3000')
console.log(\`🚂 Starting MailZero on Railway - Port: \${port}\`)

serve({
  fetch: railwayApp.fetch,
  port,
  hostname: process.env.HOSTNAME || '0.0.0.0'
})

export default railwayApp`;

    const serverDir = path.join(this.rootDir, 'apps/server/src');
    await fs.writeFile(path.join(serverDir, 'railway-server.ts'), serverAdapterContent);
    console.log('  ✓ Created railway-server.ts');
  }

  async createMigrationNotes() {
    console.log('\n📋 Creating migration notes...');
    
    const migrationNotes = `# Railway Migration Notes

## Generated Files
- \`railway.json\` - Railway project configuration
- \`railway.toml\` - Railway service configuration  
- \`Dockerfile.railway\` - Railway-optimized Dockerfile
- \`railway-start.js\` - Railway startup script
- \`railway.env.example\` - Environment variables template
- \`apps/server/src/railway-server.ts\` - Railway server adapter

## Manual Changes Required

### 1. Database Configuration
Replace Hyperdrive bindings with direct PostgreSQL connections:

\`\`\`typescript
// Before (Cloudflare)
const db = drizzle(env.HYPERDRIVE.connectionString)

// After (Railway)
import postgres from 'postgres'
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)
\`\`\`

### 2. Redis/Queue Setup
Replace Cloudflare Queues with Redis-based queues:

\`\`\`typescript
// Install: npm install bullmq ioredis
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)
export const emailQueue = new Queue('email-processing', { connection: redis })
\`\`\`

### 3. File Storage
Replace R2 with Railway volumes or external storage:

\`\`\`typescript
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'
// Implement file operations with fs
\`\`\`

### 4. Vector Search
Replace Vectorize with pgvector:

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536),
  metadata JSONB
);
\`\`\`

### 5. Environment Variables
Copy all variables from \`railway.env.example\` to your Railway project.

### 6. Update Main Server File
Modify \`apps/server/src/main.ts\` to use the Railway adapter or replace it entirely.

## Testing Locally
1. Install Railway CLI: \`npm install -g @railway/cli\`
2. Login: \`railway login\`
3. Link project: \`railway link\`
4. Run locally: \`railway run pnpm railway:dev\`

## Deployment Steps
1. Push code to GitHub
2. Create Railway project
3. Add PostgreSQL and Redis plugins
4. Set environment variables
5. Deploy: \`railway up\`

See RAILWAY_DEPLOYMENT.md for complete instructions.
`;

    await fs.writeFile(path.join(this.rootDir, 'MIGRATION_NOTES.md'), migrationNotes);
    console.log('  ✓ Created MIGRATION_NOTES.md');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new RailwayMigration();
  migration.run().catch(console.error);
}

module.exports = RailwayMigration;

