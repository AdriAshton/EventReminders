import pg from 'pg';

const DATABASE_URL = process.env.NEON_URL;
const pool = new pg.Pool({ connectionString: DATABASE_URL });

await pool.query(
  `UPDATE reminders SET nextrunat = NOW() - INTERVAL '1 minute', isactive = TRUE WHERE reminderid = 35`
);

const r = await pool.query(
  `SELECT r.reminderid, r.clientid, r.status, r.isactive, r.nextrunat, c.email
   FROM reminders r JOIN clients c ON c.clientid = r.clientid
   WHERE r.reminderid = 35`
);

console.log('Reminder 35 ready for cron:', JSON.stringify(r.rows[0], null, 2));
await pool.end();
