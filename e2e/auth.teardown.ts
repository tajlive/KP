import { test as teardown } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Auth teardown - Cleanup after all tests
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

teardown('cleanup auth state', async () => {
  const authFile = join(__dirname, '../.auth/user.json');
  
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('🧹 Auth state cleaned up');
  }
  
  // Cleanup test results older than 7 days
  const resultsDir = join(__dirname, '../test-results');
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = join(resultsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > sevenDays) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }
  }
});
