#!/usr/bin/env node

/**
 * Test the agent by simulating some errors and checking its monitoring capabilities
 */

import { spawn } from 'child_process';

console.log('🧪 Testing agent monitoring capabilities...');

// Test 1: Check if agent is monitoring server logs
console.log('\n📝 Test 1: Simulating server logs to see if agent responds...');

// Simulate some test patterns
const testLogs = [
  '🏗️ Rendering SingleModel 1/9: accessory concrete.glb',
  '🏗️ Rendering SingleModel 2/9: buildings.glb', 
  '🏗️ Rendering SingleModel 1/9: accessory concrete.glb', // Repeat to trigger loop detection
  'Error: Cannot read properties of undefined',
  '🏗️ Rendering SingleModel 1/9: accessory concrete.glb', // More repeats
  'Warning: Maximum update depth exceeded'
];

// Output test logs with delays to simulate real application behavior
async function simulateErrorOutput() {
  for (const log of testLogs) {
    console.log(log);
    // Wait a bit between logs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

simulateErrorOutput();

console.log('\n🔍 Agent should detect patterns in the above logs...');
console.log('💡 If no response, agent might be monitoring browser console instead of server logs');

// Test 2: Check current processes
console.log('\n📊 Current development processes:');
const ps = spawn('ps', ['aux']);
ps.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n');
  const relevant = lines.filter(line => 
    line.includes('vite') || 
    line.includes('node') || 
    line.includes('dev-agent') ||
    line.includes('start-agent')
  );
  
  if (relevant.length > 0) {
    console.log('🔍 Found processes:', relevant.join('\n'));
  }
});