import { Pool } from 'pg';
import { getServerEnv } from '@/lib/serverEnv';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const connectionString = getServerEnv('DATABASE_URL') || 'postgresql://postgres:password@localhost:5432/birthday_reminder';

    if (!connectionString) {
      throw new Error('DATABASE_URL must be configured');
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
