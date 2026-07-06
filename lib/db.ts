import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/birthday_reminder';

const pool = new Pool({
  connectionString,
});

export default pool;
