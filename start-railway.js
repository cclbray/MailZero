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
  // Try to start using the existing mail app start script
  console.log('Starting MailZero mail app...');
  
  const mailProcess = spawn('pnpm', ['--filter=@zero/mail', 'start'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: PORT,
      NODE_ENV: NODE_ENV
    }
  });

  mailProcess.on('error', (err) => {
    console.error('Mail process error:', err);
    console.log('Trying direct turbo start...');
    
    // Fallback: try running turbo start
    const fallbackProcess = spawn('pnpm', ['run', 'start'], {
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

  mailProcess.on('close', (code) => {
    console.log(`Mail process exited with code ${code}`);
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
