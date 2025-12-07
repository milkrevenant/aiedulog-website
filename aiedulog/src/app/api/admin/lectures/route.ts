import { NextRequest, NextResponse } from 'next/server'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { getPool } from '@/lib/db/rds-client'
import type { Lecture } from '@/lib/db/types'

const pool = getPool()

type LecturePayload = {
  title: string
  subtitle?: string | null
  description?: string | null
  instructor_name: string
  instructor_bio?: string | null
  instructor_image?: string | null
  category: string
  level?: string | null
  duration?: string | null
  price: number
  max_participants: number
  start_date: string
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  schedule_details?: string | null
  location_type: string
  location_address?: string | null
  location_url?: string | null
  thumbnail_image?: string | null
  banner_image?: string | null
  status: string
  registration_open: boolean
  featured: boolean
  tags?: string[] | null
  created_by?: string | null
}

const normalizePayload = (body: any, createdBy?: string | null): LecturePayload | null => {
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
    tags: Array.isArray(body.tags) ? body.tags : [],
    created_by: createdBy ?? null,
  }
}

const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query<Lecture>(
      'SELECT * FROM lectures ORDER BY created_at DESC'
    )
    return NextResponse.json(rows || [])
  } catch (error) {
    console.error('[Admin Lectures] Failed to fetch lectures:', error)
    return NextResponse.json({ error: 'Failed to fetch lectures' }, { status: 500 })
  } finally {
    client.release()
  }
}

const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  // Security wrapper handles auth check
  const authUserId = context.userId;
  
  if (!authUserId) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const payload = normalizePayload(body, authUserId)

  if (!payload) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    const { rows } = await client.query<Lecture>(
      `
        INSERT INTO lectures (
          title, subtitle, description, instructor_name, instructor_bio, instructor_image,
          category, level, duration, price, max_participants,
          start_date, end_date, start_time, end_time, schedule_details,
          location_type, location_address, location_url,
          thumbnail_image, banner_image, status, registration_open, featured, created_by, tags
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26
        )
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
        payload.created_by,
        payload.tags ?? [],
      ]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error('[Admin Lectures] Failed to create lecture:', error)
    return NextResponse.json({ error: 'Failed to create lecture' }, { status: 500 })
  } finally {
    client.release()
  }
}

export const GET = withAdminSecurity(getHandler)
export const POST = withAdminSecurity(postHandler)
