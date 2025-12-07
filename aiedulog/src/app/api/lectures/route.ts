import { NextRequest, NextResponse } from 'next/server'
import { withPublicSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'
import type { Lecture } from '@/lib/db/types'
const pool = getPool()
const getHandler = async (
  _request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query<Lecture>(
      `
        SELECT *
        FROM lectures
        WHERE status = $1
        ORDER BY featured DESC, start_date ASC, created_at DESC
      `,
      ['published']
    )

    return NextResponse.json(rows || [])
  } catch (error) {
    console.error('[Lectures] Failed to fetch lectures:', error)
    return NextResponse.json({ error: 'Failed to fetch lectures' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const GET = withPublicSecurity(getHandler)
