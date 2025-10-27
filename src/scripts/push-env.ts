#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Script to push environment variables from .env.production to Cloudflare Workers
 * Usage: npm run push:env
 */

const environment = 'production';
const envFile = join(process.cwd(), `.env.${environment}`);

if (!existsSync(envFile)) {
  console.error(`❌ Error: ${envFile} not found`);
  console.log(`Please create a .env.production file first`);
  process.exit(1);
}

console.log(`📦 Pushing environment variables from .env.production to Cloudflare Workers\n`);

// Read and parse .env file
const envContent = readFileSync(envFile, 'utf-8');
const envVars = envContent
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const [key, ...valueParts] = line.split('=');
    return { key: key.trim(), value: valueParts.join('=').trim() };
  })
  .filter(({ key, value }) => key && value);

if (envVars.length === 0) {
  console.warn(`⚠️  No environment variables found in ${envFile}`);
  process.exit(0);
}

console.log(`Found ${envVars.length} environment variable(s):\n`);

// Push each environment variable as a secret
let successCount = 0;
let errorCount = 0;

for (const { key, value } of envVars) {
  try {
    console.log(`  → Setting ${key}...`);

    // Use wrangler secret put to set the value
    execSync(`echo "${value}" | npx wrangler secret put ${key}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });

    console.log(`  ✓ ${key} set successfully`);
    successCount++;
  } catch (error) {
    console.error(`  ✗ Failed to set ${key}:`, error instanceof Error ? error.message : error);
    errorCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  ✓ Success: ${successCount}`);
if (errorCount > 0) {
  console.log(`  ✗ Errors: ${errorCount}`);
  process.exit(1);
}

console.log(`\n✅ All environment variables pushed successfully!`);
