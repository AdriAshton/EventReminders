import pg from 'pg';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log('Current UTC:', new Date().toISOString());

// Check exactly what the job query sees
const r = await pool.query(
    `SELECT r.reminderid, r.clientid, r.companyid, r.remindermethod, r.status,
      r.isactive, r.nextrunat, r.lastsentat,
          c.email, c.firstname, c.lastname, c.birthdate
   FROM reminders r
   JOIN clients c ON c.clientid = r.clientid
   WHERE r.nextrunat <= NOW()
   ORDER BY r.nextrunat ASC`
);

console.log(`\nAll overdue reminders (${r.rows.length} total):`);
for (const row of r.rows) {
  console.log({
    reminderid: row.reminderid,
    status: row.status,
    isactive: row.isactive,
    method: row.remindermethod,
    email: row.email,
    birthdate: row.birthdate,
    nextrunat: row.nextrunat,
  });
}

const jobRows = r.rows.filter(row => row.isactive && row.birthdate && row.nextrunat);
console.log(`\nWhat the job would process (isactive=true, has birthdate): ${jobRows.length} reminders`);

await pool.end();
