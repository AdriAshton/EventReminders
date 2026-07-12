/**
 * One-time test setup: marks the first active pending reminder as "due now"
 * so the Vercel cron job at 06:38 UTC will pick it up and send the email.
 *
 * Usage:  node scripts/setup-cron-test.js
 * Revert: node scripts/setup-cron-test.js --revert
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const isRevert = process.argv.includes('--revert');

  if (isRevert) {
    // Restore nextrunat back to next occurrence based on birthdate
    const result = await pool.query(`
      UPDATE reminders
      SET nextrunat = (
        SELECT
          CASE
            WHEN (DATE_TRUNC('year', NOW()) + (birthdate - DATE_TRUNC('year', birthdate))) > NOW()
            THEN DATE_TRUNC('year', NOW()) + (birthdate - DATE_TRUNC('year', birthdate))
            ELSE DATE_TRUNC('year', NOW()) + INTERVAL '1 year' + (birthdate - DATE_TRUNC('year', birthdate))
          END
        FROM clients c WHERE c.clientid = reminders.clientid
      )
      WHERE reminderid = (
        SELECT r.reminderid FROM reminders r
        JOIN clients c ON c.clientid = r.clientid
        WHERE r.isactive = TRUE
          AND r.status = 'pending_test_cron'
          AND c.birthdate IS NOT NULL
        LIMIT 1
      )
      RETURNING reminderid, clientid, nextrunat, status
    `);

    // Also restore status
    await pool.query(`
      UPDATE reminders SET status = 'Pending'
      WHERE status = 'pending_test_cron'
    `);

    if (result.rows.length === 0) {
      console.log('No test reminder found to revert.');
    } else {
      console.log('Reverted reminder:', result.rows[0]);
    }
    await pool.end();
    return;
  }

  // Find the first active pending reminder that has a client email
  const candidate = await pool.query(`
    SELECT r.reminderid, r.clientid, c.email, c.firstname, c.lastname, r.nextrunat, r.status
    FROM reminders r
    JOIN clients c ON c.clientid = r.clientid
    WHERE r.isactive = TRUE
      AND r.status = 'Pending'
      AND c.birthdate IS NOT NULL
      AND c.email IS NOT NULL AND c.email <> ''
    ORDER BY r.reminderid
    LIMIT 1
  `);

  if (candidate.rows.length === 0) {
    console.error('No eligible pending reminder with an email found. Cannot set up test.');
    await pool.end();
    process.exit(1);
  }

  const row = candidate.rows[0];
  console.log('Setting up test for reminder:', {
    reminderid: row.reminderid,
    client: `${row.firstname} ${row.lastname}`,
    email: row.email,
    currentNextRunAt: row.nextrunat,
  });

  // Mark it due 5 minutes ago and tag status so we can revert
  await pool.query(`
    UPDATE reminders
    SET nextrunat = NOW() - INTERVAL '5 minutes',
        status = 'pending_test_cron'
    WHERE reminderid = $1
  `, [row.reminderid]);

  console.log(`\nDone! Reminder ${row.reminderid} (${row.firstname} ${row.lastname} <${row.email}>) is now due.`);
  console.log('Next steps:');
  console.log('  1. git add . && git commit -m "Test cron" && git push origin main');
  console.log('  2. Wait for cron to fire at 06:38 UTC');
  console.log('  3. Check your inbox and Vercel logs');
  console.log('  4. After the test, revert: node scripts/setup-cron-test.js --revert');
  console.log('  5. Restore vercel.json cron back to "0 12 * * *" and redeploy');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
