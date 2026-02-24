#!/usr/bin/env node

/**
 * darkcity agent monitor
 * Live dashboard showing all active agent sessions
 */

const path = require('path');

// This will be run by Clawdbot with access to internal APIs
// For now, create a simple launcher that the agent can use

console.log('darkcity agent monitor');
console.log('======================');
console.log('');
console.log('Dashboard URL: file://' + path.join(__dirname, 'agent-monitor.html'));
console.log('');
console.log('To start monitoring:');
console.log('1. Agent will present the canvas');
console.log('2. Agent will poll sessions_list every 5 seconds');
console.log('3. Agent will push updates to canvas via eval');
console.log('');
console.log('This script is a placeholder - the agent handles the actual monitoring.');
