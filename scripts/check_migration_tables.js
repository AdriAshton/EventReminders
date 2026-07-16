const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const migrationTables = ['schema_migrations', 'migrations', 'migration', 'flyway_schema_history'];
    for (const tableName of migrationTables) {
      const res = await client.query('select to_regclass($1) as reg', [`public.${tableName}`]);
      console.log(tableName, res.rows[0].reg);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
