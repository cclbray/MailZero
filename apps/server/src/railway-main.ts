#!/usr/bin/env node

/**
 * MailZero Railway Entry Point
 * Unified Node.js server that serves both API and frontend for Railway deployment
 */

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create main Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie']
}))

// Health check endpoint for Railway
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Static file paths
const clientBuildPath = path.join(__dirname, '../../../apps/mail/build/client')
console.log(`📁 Serving static files from: ${clientBuildPath}`)

// Serve frontend static assets
app.use('/assets/*', serveStatic({ 
  root: clientBuildPath,
  rewriteRequestPath: (path) => path.replace('/assets', '')
}))

// API routes - Import your existing API router
// Note: You'll need to adapt these routes to work without Cloudflare bindings
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'api-healthy', 
    timestamp: new Date().toISOString() 
  })
})

// TODO: Import and mount your existing API routes here
// app.route('/api', yourExistingApiRouter)

// Catch-all route for React Router (SPA)
app.get('*', serveStatic({
  root: clientBuildPath,
  rewriteRequestPath: () => '/index.html' // Always serve index.html for client-side routing
}))

// Start the server
const port = parseInt(process.env.PORT || '3000')
const hostname = process.env.HOSTNAME || '0.0.0.0'

console.log(`🚀 Starting MailZero on Railway`)
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🌐 Server: http://${hostname}:${port}`)
console.log(`📂 Static files: ${clientBuildPath}`)

serve({
  fetch: app.fetch,
  port,
  hostname
}, (info) => {
  console.log(`✅ MailZero is running on http://${info.address}:${info.port}`)
})
