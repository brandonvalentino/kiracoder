#!/usr/bin/env node

/**
 * Quick setup test - verifies that all components are in place
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'dist/backend/server.js',
  'dist/backend/rpc-manager.js',
  'dist/backend/websocket-handler.js',
  'dist/backend/types.js',
  'public/index.html',
  'public/style.css',
  'public/app.js',
  'public/websocket-client.js',
  'public/state.js',
  'public/message-renderer.js',
  'public/tool-card.js',
  'public/dialogs.js'
];

console.log('🔍 Checking Pi Web UI setup...\n');

let allGood = true;

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${file}`);
  
  if (!exists) {
    allGood = false;
  }
}

console.log('');

if (allGood) {
  console.log('✅ All files in place!');
  console.log('');
  console.log('To start the server:');
  console.log('  npm start');
  console.log('');
  console.log('Then open: http://localhost:3000');
  process.exit(0);
} else {
  console.log('❌ Some files are missing. Run: npm run build');
  process.exit(1);
}
