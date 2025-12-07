import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'

const pool = getPool()
const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled', 'attended']

const putHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Security wrapper handles auth check
  const { id } = await params


  const body = await request.json().catch(() => null)
  const newStatus: string | undefined = body?.status

  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query<{ lecture_id: string; status: string }>(
      `
        SELECT lecture_id, status
        FROM lecture_registrations
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    )

    if (!rows || rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const registration = rows[0]

    await client.query(
      `
        UPDATE lecture_registrations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [newStatus, id]
    )

    if (registration.status !== 'cancelled' && newStatus === 'cancelled') {
      await client.query(
        `
          UPDATE lectures
          SET current_participants = GREATEST(current_participants - 1, 0)
          WHERE id = $1
        `,
        [registration.lecture_id]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Admin Lecture Registrations] Failed to update status:', error)
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const PUT = withAdminSecurity(putHandler)
