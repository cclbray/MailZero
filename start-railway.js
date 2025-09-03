#!/usr/bin/env node

/**
 * Simple Railway startup script for MailZero
 */

const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`🚂 Starting MailZero on Railway - Port: ${PORT}`);

// For now, let's try to start the server directly
// You may need to adapt this based on your actual server structure

if (NODE_ENV === 'production') {
  // Try to start the backend server
  console.log('Starting backend server...');
  
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
    console.log('Trying alternative startup method...');
    
    // Fallback: try running the existing start script in production mode
    const fallbackProcess = spawn('npm', ['run', 'start'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: PORT
      }
    });
    
    fallbackProcess.on('error', (fallbackErr) => {
      console.error('Fallback also failed:', fallbackErr);
      process.exit(1);
    });
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
} else {
  // Development mode
  console.log('Development mode detected, starting dev server...');
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: PORT
    }
  });
  
  devProcess.on('error', (err) => {
    console.error('Dev process error:', err);
    process.exit(1);
  });
}
