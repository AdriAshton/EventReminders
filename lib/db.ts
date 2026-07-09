import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL must be configured as an environment variable');
    }

    pool = new Pool({
      connectionString,
    });
  }

  return pool;
}

export default new Proxy({} as Pool, {
  get(_target, property) {
    const currentPool = getPool();
    const value = currentPool[property as keyof Pool];
    return typeof value === 'function' ? value.bind(currentPool) : value;
  },
});
