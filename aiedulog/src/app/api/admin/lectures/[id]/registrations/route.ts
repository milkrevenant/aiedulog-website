import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'

const pool = getPool()

const getHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Security wrapper handles auth check
  const { id } = await params

  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `
        SELECT
          lr.id,
          lr.lecture_id,
          lr.user_id,
          lr.status,
          lr.payment_status,
          lr.notes,
          lr.registered_at AS registration_date,
          up.full_name,
          up.email,
          up.nickname
        FROM lecture_registrations lr
        LEFT JOIN user_profiles up ON up.user_id = lr.user_id
        WHERE lr.lecture_id = $1
        ORDER BY lr.registered_at DESC
      `,
      [id]
    )

    const formatted = rows.map((row: any) => ({
      id: row.id,
      lecture_id: row.lecture_id,
      user_id: row.user_id,
      status: row.status,
      payment_status: row.payment_status,
      notes: row.notes,
      registration_date: row.registration_date,
      profiles: {
        name: row.full_name || row.nickname || row.email?.split('@')[0] || '사용자',
        email: row.email,
      },
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[Admin Lectures] Failed to fetch registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const GET = withAdminSecurity(getHandler)
