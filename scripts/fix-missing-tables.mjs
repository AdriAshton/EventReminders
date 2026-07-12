import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Use NEON_URL env var if set, otherwise fall back to DATABASE_URL
const DATABASE_URL = process.env.NEON_URL || process.env.DATABASE_URL;
const safeUrl = DATABASE_URL?.replace(/:([^@]+)@/, ':***@');
console.log('Connecting to:', safeUrl);

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// Check which tables exist
const existing = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
);
const existingTables = existing.rows.map(r => r.table_name);
console.log('\nCurrently existing tables:', existingTables);

// Run only the migrations for missing tables
const toRun = [
  '015_company_onboarding.sql',
  '016_bootstrap_company_invites.sql',
  '017_company_settings.sql',
  '018_disable_company_audit_trigger.sql',
  '019_add_company_settings_credentials.sql',
  '020_fix_clientaudit_trigger_companyid.sql',
];

for (const file of toRun) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping (not found): ${file}`);
    continue;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\nRunning: ${file}`);
  try {
    await client.query(sql);
    console.log(`  ✓ Done`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
  }
}

// Verify final state
const after = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
);
console.log('\nTables after migrations:', after.rows.map(r => r.table_name));

await client.end();
