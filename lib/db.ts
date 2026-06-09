import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'birthday_reminder',
  password: 'password',
  port: 5432, // default PostgreSQL port
});

export default pool;
