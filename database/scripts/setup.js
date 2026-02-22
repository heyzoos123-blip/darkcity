#!/usr/bin/env node

/**
 * DARKCITY Database Setup Script
 * Initializes the database and creates necessary resources
 */

const { execSync } = require('child_process');
const { existsSync, copyFileSync } = require('fs');
const path = require('path');

console.log('🏗️  DARKCITY Database Setup\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!existsSync(envPath)) {
  console.log('📝 Creating .env file from .env.example...');
  copyFileSync(envExamplePath, envPath);
  console.log('✓ Created .env file');
  console.log('⚠️  Please edit .env with your database credentials before continuing\n');
  process.exit(0);
}

console.log('✓ .env file found\n');

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✓ Dependencies installed\n');
} catch (error) {
  console.error('✗ Failed to install dependencies');
  process.exit(1);
}

// Generate Prisma client
console.log('🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✓ Prisma client generated\n');
} catch (error) {
  console.error('✗ Failed to generate Prisma client');
  process.exit(1);
}

// Run migrations
console.log('🗄️  Running database migrations...');
try {
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✓ Migrations completed\n');
} catch (error) {
  console.error('✗ Failed to run migrations');
  process.exit(1);
}

// Build TypeScript
console.log('🔨 Building TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✓ Build completed\n');
} catch (error) {
  console.error('✗ Failed to build TypeScript');
  process.exit(1);
}

console.log('✅ Setup complete!\n');
console.log('Next steps:');
console.log('  1. Run seed data: npm run db:seed');
console.log('  2. View database: npm run db:studio');
console.log('  3. Test integrity: npm run db:integrity');
console.log('');
