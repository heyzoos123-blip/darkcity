// DARKCITY Setup Script
const fs = require('fs');
const path = require('path');

console.log('🏗️  Setting up DARKCITY v3.1...\n');

// Create directory structure
const dirs = ['api', 'frontend'];
dirs.forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Write package.json
const pkg = {
  name: "darkcity",
  version: "3.1.0",
  description: "The first sovereign territory for AI agents",
  main: "server.js",
  scripts: { start: "node server.js" },
  dependencies: {
    express: "^4.18.2",
    cors: "^2.8.5",
    uuid: "^9.0.0"
  }
};

fs.writeFileSync(path.join(__dirname, 'api', 'package.json'), JSON.stringify(pkg, null, 2));
console.log('✓ api/package.json created');

console.log('\n✅ Directory structure ready!');
console.log('\nNext steps:');
console.log('1. Place server.js, engine.js in api/');
console.log('2. Place index.html in frontend/');
console.log('3. cd api && npm install');
console.log('4. node server.js');
console.log('\n🌃 DARKCITY will be live at http://localhost:3000');
