#!/usr/bin/env tsx

/**
 * Data Integrity Check Script
 */

import { IntegrityChecker } from '../src/utils/integrity';

async function main() {
  const checker = new IntegrityChecker();

  try {
    const result = await checker.runAllChecks();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('INTEGRITY CHECK SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    result.checks.forEach((check) => {
      const icon = 
        check.status === 'passed' ? '✓' :
        check.status === 'warning' ? '⚠' : '✗';
      
      console.log(`${icon} ${check.name}: ${check.status.toUpperCase()}`);
      
      if (check.details.count > 0) {
        console.log(`   Issues found: ${check.details.count}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Overall Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Cleanup old logs
    console.log('🧹 Cleaning up old integrity logs...');
    const deleted = await checker.cleanupOldLogs(30);
    console.log(`✓ Deleted ${deleted} old log entries\n`);

    process.exit(result.passed ? 0 : 1);
  } catch (error: any) {
    console.error('✗ Integrity check failed:', error.message);
    process.exit(1);
  }
}

main();
