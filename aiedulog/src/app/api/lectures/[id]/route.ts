import { NextRequest, NextResponse } from 'next/server'
import { withPublicSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'
import type { Lecture } from '@/lib/db/types'

const pool = getPool()

const getHandler = async (
  _request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params
  
  const client = await pool.connect()
  try {
    const { rows } = await client.query<Lecture>(
      `
        SELECT *
        FROM lectures
        WHERE id = $1
          AND status IN ('published', 'ongoing', 'completed')
        LIMIT 1
      `,
      [id]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('[Lectures] Failed to fetch lecture detail:', error)
    return NextResponse.json({ error: 'Failed to fetch lecture' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const GET = withPublicSecurity(getHandler)
