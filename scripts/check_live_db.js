const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const identity = await client.query('select current_database() as db, current_user as usr');
    console.log('CONNECTION', JSON.stringify(identity.rows[0], null, 2));

    const tables = ['company_settings', 'ClientAudit', 'CompanyAudit', 'MessageAudit', 'ReminderAudit', 'UserAudit', 'useraudit'];
    for (const tableName of tables) {
      const result = await client.query(
        `select column_name, data_type
         from information_schema.columns
         where table_schema = 'public' and table_name = $1
         order by ordinal_position`,
        [tableName]
      );
      console.log('TABLE', tableName, JSON.stringify(result.rows, null, 2));
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
