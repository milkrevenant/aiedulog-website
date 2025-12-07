import { Pool } from 'pg'

const databaseUrl = process.env.APP_DATABASE_URL

let pool: Pool | null = null

export function getDb(): any {
  if (!pool) {
    if (!databaseUrl) {
      throw new Error('APP_DATABASE_URL is not set')
    }
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

