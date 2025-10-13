import { Pool, PoolClient } from 'pg';

/**
 * Shared PostgreSQL connection pool targeting AWS RDS.
 * Ensures `request.jwt.claims` is set per transaction so RLS policies can inspect Cognito claims.
 */
const pool = new Pool({
  host: process.env.RDS_HOST!,
  port: parseInt(process.env.RDS_PORT || '5432', 10),
  database: process.env.RDS_DATABASE!,
  user: process.env.RDS_USERNAME!,
  password: process.env.RDS_PASSWORD!,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.RDS_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function queryWithAuth<T = any>(
  queryText: string,
  params: any[] = [],
  jwtClaims?: Record<string, any>
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    if (jwtClaims) {
      await client.query('SET LOCAL request.jwt.claims = $1', [JSON.stringify(jwtClaims)]);
    }
    const result = await client.query(queryText, params);
    return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  jwtClaims?: Record<string, any>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (jwtClaims) {
      await client.query('SET LOCAL request.jwt.claims = $1', [JSON.stringify(jwtClaims)]);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
