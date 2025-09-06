#!/usr/bin/env node

/**
 * Simple launcher for the Development Agent
 */

import DevAgent from './dev-agent.js';

console.log('🤖 Starting Intelligent Development Agent...');
console.log('📝 Features:');
console.log('  - Auto-increment ports (3090 → 3091 → 3092...)');
console.log('  - Real-time console log monitoring');
console.log('  - Automatic error detection and fixing');
console.log('  - Infinite loop detection');
console.log('  - Server crash recovery');
console.log('  - Session logging and analytics');
console.log('');
console.log('🔧 Press Ctrl+C to stop the agent');
console.log('');

const agent = new DevAgent();
agent.start().catch(error => {
  console.error('❌ Agent startup failed:', error);
  process.exit(1);
});