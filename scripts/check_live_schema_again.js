const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const checks = [
      { label: 'company_settings columns', sql: `select column_name from information_schema.columns where table_schema='public' and table_name='company_settings' order by ordinal_position` },
      { label: 'clientaudit table', sql: `select to_regclass('public."ClientAudit"') as camel, to_regclass('public.clientaudit') as lower` },
      { label: 'useraudit table', sql: `select to_regclass('public."UserAudit"') as camel, to_regclass('public.useraudit') as lower` },
      { label: 'companyaudit table', sql: `select to_regclass('public."CompanyAudit"') as camel, to_regclass('public.companyaudit') as lower` },
      { label: 'messageaudit table', sql: `select to_regclass('public."MessageAudit"') as camel, to_regclass('public.messageaudit') as lower` },
      { label: 'reminderaudit table', sql: `select to_regclass('public."ReminderAudit"') as camel, to_regclass('public.reminderaudit') as lower` },
    ];

    for (const check of checks) {
      const result = await client.query(check.sql);
      console.log('\n' + check.label);
      console.log(JSON.stringify(result.rows, null, 2));
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
