const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const SQL_FILE = path.join(__dirname, '..', 'migrations', '016_bootstrap_company_invites.sql');

if (!DATABASE_URL) {
  console.error('Set DATABASE_URL environment variable (e.g. postgres://user:pass@host:port/db)');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    console.log('Running:', path.basename(SQL_FILE));
    await client.query(sql);
    console.log('Bootstrap completed successfully.');
  } catch (err) {
    console.error('Bootstrap failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();