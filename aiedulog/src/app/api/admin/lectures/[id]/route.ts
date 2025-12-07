import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'
import type { Lecture } from '@/lib/db/types'

const pool = getPool()

const normalizePayload = (body: any): Omit<Lecture, 'id'> | null => {
  if (!body?.title || !body?.instructor_name || !body?.start_date) {
    return null
  }

  return {
    title: String(body.title),
    subtitle: body.subtitle ?? null,
    description: body.description ?? null,
    instructor_name: String(body.instructor_name),
    instructor_bio: body.instructor_bio ?? null,
    instructor_image: body.instructor_image ?? null,
    category: body.category ?? 'workshop',
    level: body.level ?? null,
    duration: body.duration ?? null,
    price: Number(body.price) || 0,
    max_participants: Number(body.max_participants) || 0,
    current_participants: Number(body.current_participants ?? 0),
    start_date: String(body.start_date),
    end_date: body.end_date || null,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    schedule_details: body.schedule_details ?? null,
    location_type: body.location_type ?? 'offline',
    location_address: body.location_address ?? null,
    location_url: body.location_url ?? null,
    thumbnail_image: body.thumbnail_image ?? null,
    banner_image: body.banner_image ?? null,
    status: body.status ?? 'draft',
    registration_open: body.registration_open !== false,
    featured: Boolean(body.featured),
    created_by: body.created_by ?? null,
    created_at: body.created_at ?? null,
    updated_at: body.updated_at ?? null,
    view_count: Number(body.view_count ?? 0),
    tags: Array.isArray(body.tags) ? body.tags : [],
  }
}

const putHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Security wrapper handles auth check
  const { id } = await params

  const body = await request.json().catch(() => null)
  const payload = normalizePayload(body)

  if (!payload) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN') 
    
    const { rows } = await client.query<Lecture>(
      `
        UPDATE lectures
        SET title = $1,
            subtitle = $2,
            description = $3,
            instructor_name = $4,
            instructor_bio = $5,
            instructor_image = $6,
            category = $7,
            level = $8,
            duration = $9,
            price = $10,
            max_participants = $11,
            start_date = $12,
            end_date = $13,
            start_time = $14,
            end_time = $15,
            schedule_details = $16,
            location_type = $17,
            location_address = $18,
            location_url = $19,
            thumbnail_image = $20,
            banner_image = $21,
            status = $22,
            registration_open = $23,
            featured = $24,
            tags = $25,
            updated_at = NOW()
        WHERE id = $26
        RETURNING *
      `,
      [
        payload.title,
        payload.subtitle,
        payload.description,
        payload.instructor_name,
        payload.instructor_bio,
        payload.instructor_image,
        payload.category,
        payload.level,
        payload.duration,
        payload.price,
        payload.max_participants,
        payload.start_date,
        payload.end_date,
        payload.start_time,
        payload.end_time,
        payload.schedule_details,
        payload.location_type,
        payload.location_address,
        payload.location_url,
        payload.thumbnail_image,
        payload.banner_image,
        payload.status,
        payload.registration_open,
        payload.featured,
        payload.tags ?? [],
        id,
      ]
    )

    if (!rows || rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    await client.query('COMMIT')
    return NextResponse.json(rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Admin Lectures] Failed to update lecture:', error)
    return NextResponse.json({ error: 'Failed to update lecture' }, { status: 500 })
  } finally {
    client.release()
  }
}

const deleteHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Security wrapper handles auth check
  const { id } = await params

  const client = await pool.connect()
  try {
    const result = await client.query('DELETE FROM lectures WHERE id = $1', [id])
    const rowCount = (result as any).rowCount

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Lectures] Failed to delete lecture:', error)
    return NextResponse.json({ error: 'Failed to delete lecture' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const PUT = withAdminSecurity(putHandler)
export const DELETE = withAdminSecurity(deleteHandler)
