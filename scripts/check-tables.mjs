import pg from 'pg';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
);

console.log('Tables in .env.local Neon DB:');
r.rows.forEach(row => console.log(' -', row.table_name));

// Specifically check company_settings
const cs = await pool.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'company_settings' ORDER BY ordinal_position`
);
console.log('\ncompany_settings columns:', cs.rows.length ? cs.rows.map(r => r.column_name) : 'TABLE DOES NOT EXIST');

await pool.end();
