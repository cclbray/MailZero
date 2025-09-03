#!/usr/bin/env node

/**
 * Railway Proxy Server for MailZero
 * Since Wrangler dev only binds to localhost, this proxy allows Railway to access it
 */

const http = require('http');
const url = require('url');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const WRANGLER_PORT = 3001; // Use a different port for Wrangler

console.log(`🚂 Starting Railway Proxy on 0.0.0.0:${PORT} -> localhost:${WRANGLER_PORT}`);

// Create simple proxy server using Node.js built-in modules
const server = http.createServer((req, res) => {
  // Enable CORS for Railway
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url);
  
  // Create proxy request to Wrangler
  const proxyOptions = {
    hostname: 'localhost',
    port: WRANGLER_PORT,
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${WRANGLER_PORT}`
    }
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    // Copy status and headers from Wrangler response
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    
    // Pipe response data
    proxyRes.pipe(res);
  });

  // Handle proxy errors
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Could not connect to Wrangler server');
    }
  });

  // Pipe request data
  req.pipe(proxyReq);
});

// Start Wrangler in background
console.log(`Starting Wrangler on localhost:${WRANGLER_PORT}...`);
const wranglerProcess = spawn('npx', ['wrangler', 'dev', '--port', WRANGLER_PORT.toString(), '--show-interactive-dev-session=false'], {
  stdio: 'inherit',
  cwd: '/app/apps/mail'
});

wranglerProcess.on('error', (err) => {
  console.error('Failed to start Wrangler:', err);
  process.exit(1);
});

// Wait a bit for Wrangler to start, then start proxy
setTimeout(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Railway Proxy listening on 0.0.0.0:${PORT}`);
    console.log(`🔄 Proxying to Wrangler at localhost:${WRANGLER_PORT}`);
  });
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  wranglerProcess.kill();
  process.exit(0);
});
