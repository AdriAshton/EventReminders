import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured as an environment variable');
}

const pool = new Pool({
  connectionString,
});

export default pool;
