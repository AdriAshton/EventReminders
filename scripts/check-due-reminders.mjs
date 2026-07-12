import pg from 'pg';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const now = new Date().toISOString();
console.log('Current UTC:', now);

// Check pending reminders due soon or already due
const r = await pool.query(
  `SELECT reminderid, clientid, status, nextrunat,
          nextrunat <= NOW() as is_due
   FROM reminders
   WHERE status = 'Pending'
   ORDER BY nextrunat ASC
   LIMIT 10`
);

console.log('\nTop 10 pending reminders:');
console.log(JSON.stringify(r.rows, null, 2));

// Mark the first one as due right now (for testing)
if (r.rows.length > 0) {
  const id = r.rows[0].reminderid;
  await pool.query(
    `UPDATE reminders SET nextrunat = NOW() - INTERVAL '1 minute' WHERE reminderid = $1`,
    [id]
  );
  console.log(`\n✓ Set reminder ${id} nextrunat to 1 minute ago so cron picks it up.`);
}

await pool.end();
