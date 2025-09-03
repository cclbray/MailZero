#!/usr/bin/env node

/**
 * Railway startup script for MailZero
 * This runs the development server directly since MailZero uses Cloudflare Workers
 */

const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;

console.log(`🚂 Starting MailZero on Railway - Port: ${PORT}`);

// Run the development server which will handle both frontend and backend
const startCommand = `pnpm run dev`;

console.log(`Executing: ${startCommand}`);

const child = exec(startCommand, {
  env: {
    ...process.env,
    PORT: PORT,
    NODE_ENV: 'development' // Use dev mode since the app is designed for Cloudflare Workers
  }
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Error starting process:', err);
  process.exit(1);
});
