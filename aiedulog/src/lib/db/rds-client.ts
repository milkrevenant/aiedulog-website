import { Pool } from 'pg';
import { RDSClient } from '@/lib/db/rds-query-builder';

/**
 * Shared PostgreSQL connection pool targeting AWS RDS.
 * Ensures `request.jwt.claims` is set per transaction so RLS policies can inspect Cognito claims.
 */
const pool = new Pool({
  host: process.env.DB_HOST || process.env.RDS_HOST,
  port: parseInt(process.env.DB_PORT || process.env.RDS_PORT || '5432', 10),
  database: process.env.DB_NAME || process.env.RDS_DATABASE,
  user: process.env.DB_USER || process.env.RDS_USERNAME,
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.RDS_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Export the pool for use in RDS adapter
 */
export function getPool() {
  return pool;
}

type PoolConnection = Awaited<ReturnType<Pool['connect']>>;

type AuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: {
    session_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type AuthSession = {
  user: AuthUser | null;
  [key: string]: unknown;
};

/**
 * Minimal storage bucket adapter to keep existing Supabase storage calls working.
 * Replace these implementations with direct S3 helpers as the migration progresses.
 */
class StorageBucket {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(path: string, file: unknown, options?: any) {
    console.warn('[Storage] Upload not implemented. Use AWS S3 SDK directly.');
    return {
      data: {
        path,
        id: `${this.bucketName}/${path}`,
        fullPath: `${this.bucketName}/${path}`,
      },
      error: null,
    };
  }

  async download(path: string) {
    console.warn('[Storage] Download not implemented. Use AWS S3 SDK directly.');
    return {
      data: null,
      error: { message: 'Download not implemented. Use AWS S3 SDK directly.' },
    };
  }

  async remove(paths: string[]) {
    console.warn('[Storage] Remove not implemented. Use AWS S3 SDK directly.');
    return {
      data: paths.map((p) => ({ name: p })),
      error: null,
    };
  }

  async list(path?: string, options?: any) {
    console.warn('[Storage] List not implemented. Use AWS S3 SDK directly.');
    return {
      data: [],
      error: null,
    };
  }

  getPublicUrl(path: string) {
    const baseUrl = process.env.NEXT_PUBLIC_STORAGE_URL || 'https://storage.example.com';
    return {
      data: {
        publicUrl: `${baseUrl}/${this.bucketName}/${path}`,
      },
    };
  }

  createSignedUrl(path: string, expiresIn: number) {
    console.warn('[Storage] Signed URL not implemented. Use AWS S3 SDK directly.');
    return {
      data: {
        signedUrl: `https://storage.example.com/${this.bucketName}/${path}?expires=${expiresIn}`,
      },
      error: null,
    };
  }
}

/**
 * Main entry point used by libraries to access RDS with a Supabase-like API.
 */
export function createRDSClient() {
  const rdsClient = new RDSClient(pool);

  return {
    from: <T = any>(tableName: string) => rdsClient.from<T>(tableName),
    query: <T = any>(sql: string, params?: any[]) => rdsClient.query<T>(sql, params),
    rpc: <T = any>(fnName: string, params?: any) => rdsClient.rpc<T>(fnName, params),
    auth: {
      getSession: async (): Promise<{ data: { session: AuthSession | null }; error: null }> => {
        const session: AuthSession | null = null;
        return { data: { session }, error: null };
      },
      getUser: async (): Promise<{ data: { user: AuthUser | null }; error: null }> => {
        const user: AuthUser | null = null;
        return { data: { user }, error: null };
      },
      signOut: async (): Promise<{ error: null }> => ({ error: null }),
      signInWithPassword: async (): Promise<{
        data: { user: AuthUser | null; session: AuthSession | null };
        error: null;
      }> => {
        const user: AuthUser | null = null;
        const session: AuthSession | null = null;
        return { data: { user, session }, error: null };
      },
      signInWithOAuth: async (): Promise<{
        data: { user: AuthUser | null; session: AuthSession | null };
        error: null;
      }> => {
        const user: AuthUser | null = null;
        const session: AuthSession | null = null;
        return { data: { user, session }, error: null };
      },
      signUp: async (): Promise<{
        data: { user: AuthUser | null; session: AuthSession | null };
        error: null;
      }> => {
        const user: AuthUser | null = null;
        const session: AuthSession | null = null;
        return { data: { user, session }, error: null };
      },
      resetPasswordForEmail: async (
        _email: string,
        _options?: { redirectTo?: string }
      ): Promise<{ data: null; error: null }> => ({
        data: null,
        error: null,
      }),
      updateUser: async (
        _attributes: Record<string, unknown>
      ): Promise<{ data: { user: AuthUser | null }; error: null }> => {
        const user: AuthUser | null = null;
        return { data: { user }, error: null };
      },
      refreshSession: async (): Promise<{ data: { session: AuthSession | null }; error: null }> => {
        const session: AuthSession | null = null;
        return { data: { session }, error: null };
      },
      onAuthStateChange: (
        callback: (event: string, session: AuthSession | null) => void
      ): {
        data: { subscription: { unsubscribe: () => void } };
        error: null;
      } => {
        // No realtime auth events in RDS adapter; return unsubscribe stub.
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                /* noop */
              },
            },
          },
          error: null,
        };
      },
    },
    storage: {
      from: (bucket: string) => new StorageBucket(bucket),
    },
    channel: (_name: string) => {
      const channelStub = {
        on: (
          _event: string,
          _filterOrCallback: unknown,
          _callback?: (...args: unknown[]) => void
        ) => channelStub,
        subscribe: (_statusCallback?: (...args: unknown[]) => void) => {
          console.warn('[Realtime] Not implemented. Use WebSocket or polling.');
          return channelStub;
        },
        unsubscribe: () => {
          /* noop */
        },
        presenceState: () => ({} as Record<string, any[]>),
        track: async (_payload: Record<string, unknown>) => ({ error: null }),
      };

      return channelStub;
    },
    removeChannel: (_channel: { unsubscribe?: () => void } | null | undefined) => {
      _channel?.unsubscribe?.();
      return { error: null };
    },
    removeAllChannels: () => ({ error: null }),
  };
}

export type DatabaseClient = ReturnType<typeof createRDSClient>;

export async function queryWithAuth<T = any>(
  queryText: string,
  params: any[] = [],
  jwtClaims?: Record<string, any>
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    if (jwtClaims) {
      // SET 문은 파라미터를 사용할 수 없으므로 문자열로 직접 삽입
      // SQL injection 방지를 위해 JSON.stringify 후 이스케이프
      const claimsJson = JSON.stringify(jwtClaims).replace(/'/g, "''");
      await client.query(`SET LOCAL request.jwt.claims = '${claimsJson}'`);
    }
    const result = await client.query(queryText, params);
    const rows = result.rows as T[];
    return { rows, rowCount: rows.length };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: PoolConnection) => Promise<T>,
  jwtClaims?: Record<string, any>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (jwtClaims) {
      const claimsJson = JSON.stringify(jwtClaims).replace(/'/g, "''");
      await client.query(`SET LOCAL request.jwt.claims = '${claimsJson}'`);
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
