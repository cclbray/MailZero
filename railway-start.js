#!/usr/bin/env node

/**
 * Railway startup script for MailZero
 * Handles both frontend and backend in a single service
 */

const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`Starting MailZero on Railway - Port: ${PORT}, Environment: ${NODE_ENV}`);

// In Railway, we'll serve the frontend statically and run the API
if (NODE_ENV === 'production') {
  // Production: Start the server which will serve both API and static files
  const serverProcess = spawn('node', ['apps/server/dist/main.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: PORT,
      NODE_ENV: NODE_ENV
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Server process error:', err);
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
} else {
  // Development: Run both frontend and backend
  console.log('Development mode - starting both frontend and backend');
  
  const frontendProcess = spawn('pnpm', ['--filter=@zero/mail', 'dev'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  const backendProcess = spawn('pnpm', ['--filter=@zero/server', 'dev'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Handle process cleanup
  process.on('SIGTERM', () => {
    frontendProcess.kill('SIGTERM');
    backendProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    frontendProcess.kill('SIGINT');
    backendProcess.kill('SIGINT');
  });
}

