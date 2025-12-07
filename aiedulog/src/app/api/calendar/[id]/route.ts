import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { queryWithAuth } from '@/lib/db/rds-client'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roles = (session.user as any).groups || []
    const isStaff = roles.some((r: string) => ['admin', 'moderator', 'verified'].includes(r))
    
    // We also need to check if the user is the CREATOR if they are not admin/staff (though our policy says verify/staff can manage).
    // Let's assume strict RBAC: Staff/Verified can edit.
    if (!isStaff) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, start_date, end_date, category, is_public } = body

    const sql = `
      UPDATE calendar_events 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        category = COALESCE($5, category),
        is_public = COALESCE($6, is_public)
      WHERE id = $7
      RETURNING *
    `
    // Note: We count parameters carefully
    const queryParams = [
      title, description, start_date, end_date, category, is_public, id
    ]
    
    // RLS will enforce permissions if we pass jwtClaims, but we also did a check above.
    const jwtClaims = { sub: (session.user as any).sub }
    
    const { rows, rowCount } = await queryWithAuth(sql, queryParams, jwtClaims)

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Event not found or permission denied' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error: any) {
    console.error('Failed to update event:', error)
    return NextResponse.json(
      { error: 'Failed to update event', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roles = (session.user as any).groups || []
    const isStaff = roles.some((r: string) => ['admin', 'moderator', 'verified'].includes(r))
    
    if (!isStaff) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const sql = `DELETE FROM calendar_events WHERE id = $1 RETURNING id`
    
    const jwtClaims = { sub: (session.user as any).sub }
    const { rowCount } = await queryWithAuth(sql, [id], jwtClaims)

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Event not found or permission denied' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('Failed to delete event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    )
  }
}
