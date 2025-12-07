import { NextRequest, NextResponse } from 'next/server'
import { withUserSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getAuthenticatedUser } from '@/lib/auth/rds-auth-helpers'
import { getPool } from '@/lib/db/rds-client'

const pool = getPool()

const resolveUserId = async (
  client: Awaited<ReturnType<typeof pool.connect>>,
  authUser: { id: string; email?: string | null }
): Promise<string> => {
  const { rows } = await client.query<{ user_id: string }>(
    `
      SELECT user_id
      FROM user_profiles
      WHERE user_id = $1 OR email = $2
      LIMIT 1
    `,
    [authUser.id, authUser.email || null]
  )

  if (rows.length > 0) {
    return rows[0].user_id
  }

  const displayName = authUser.email?.split('@')[0] || '사용자'
  const { rows: inserted } = await client.query<{ user_id: string }>(
    `
      INSERT INTO user_profiles (user_id, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING user_id
    `,
    [authUser.id, authUser.email || `${displayName}@example.com`, displayName]
  )

  return inserted[0].user_id
}

const postHandler = async (
  _request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params
  const { user, error } = await getAuthenticatedUser()

  if (!user || error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const lectureResult = await client.query<{
      id: string
      price: number
      max_participants: number
      current_participants: number
      registration_open: boolean
      status: string
    }>(
      `
        SELECT id, price, max_participants, current_participants, registration_open, status
        FROM lectures
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    )

    if (lectureResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    const lecture = lectureResult.rows[0]

    if (!lecture.registration_open || !['published', 'ongoing'].includes(lecture.status)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Registration is closed for this lecture' }, { status: 400 })
    }

    if (lecture.current_participants >= lecture.max_participants) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Lecture is already full' }, { status: 400 })
    }

    const userId = await resolveUserId(client, user)

    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM lecture_registrations
        WHERE lecture_id = $1 AND user_id = $2
        LIMIT 1
      `,
      [id, userId]
    )

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Already registered' }, { status: 409 })
    }

    const paymentStatus = lecture.price > 0 ? 'pending' : 'paid'

    await client.query(
      `
        INSERT INTO lecture_registrations (lecture_id, user_id, status, payment_status, registered_at)
        VALUES ($1, $2, 'pending', $3, NOW())
      `,
      [id, userId, paymentStatus]
    )

    await client.query(
      `
        UPDATE lectures
        SET current_participants = current_participants + 1
        WHERE id = $1
      `,
      [id]
    )

    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Lectures] Registration failed:', err)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const POST = withUserSecurity(postHandler)
