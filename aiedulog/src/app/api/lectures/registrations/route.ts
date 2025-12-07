import { NextRequest, NextResponse } from 'next/server'
import { withUserSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getAuthenticatedUser } from '@/lib/auth/rds-auth-helpers'
import { getPool } from '@/lib/db/rds-client'
const pool = getPool()
const getHandler = async (
  _request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  const { user, error } = await getAuthenticatedUser()

  if (!user || error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await pool.connect()

  try {
    const { rows: profiles } = await client.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM user_profiles
        WHERE user_id = $1 OR email = $2
        LIMIT 1
      `,
      [user.id, user.email || null]
    )

    const userId = profiles[0]?.user_id

    if (!userId) {
      return NextResponse.json([])
    }

    const { rows } = await client.query(
      `
        SELECT lecture_id, status, payment_status
        FROM lecture_registrations
        WHERE user_id = $1
      `,
      [userId]
    )

    return NextResponse.json(rows || [])
  } catch (err) {
    console.error('[Lectures] Failed to fetch user registrations:', err)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const GET = withUserSecurity(getHandler)
