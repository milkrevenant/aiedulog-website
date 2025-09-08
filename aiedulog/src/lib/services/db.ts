const databaseUrl = process.env.APP_DATABASE_URL

let pool: any = null

export function getDb(): any {
  if (!pool) {
    if (!databaseUrl) {
      throw new Error('APP_DATABASE_URL is not set')
    }
    // Lazy require to avoid hard dependency at build time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg')
    pool = new Pool({ connectionString: databaseUrl, max: 10 })
    pool.on('error', (err: any) => {
      console.error('Postgres pool error', err)
    })
  }
  return pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await getDb().connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}


