import { NextRequest, NextResponse } from 'next/server'
import { queryWithAuth } from '@/lib/db/rds-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'

export const runtime = 'nodejs'

export interface ResearchMember {
  id: string
  name: string
  position: string
  role_title: string | null
  organization: string
  specialty: string | null
  photo_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// GET - 모든 멤버 조회 (공개)
export async function GET() {
  try {
    const result = await queryWithAuth<ResearchMember>(
      `SELECT * FROM research_members
       WHERE is_active = true
       ORDER BY display_order ASC, created_at ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch research members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research members' },
      { status: 500 }
    )
  }
}

// POST - 새 멤버 추가 (관리자만)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, position, role_title, organization, specialty, photo_url, display_order } = body

    if (!name || !position || !organization) {
      return NextResponse.json(
        { error: 'Name, position, and organization are required' },
        { status: 400 }
      )
    }

    const result = await queryWithAuth<ResearchMember>(
      `INSERT INTO research_members (name, position, role_title, organization, specialty, photo_url, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, position, role_title || null, organization, specialty || null, photo_url || null, display_order || 0]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to create research member:', error)
    return NextResponse.json(
      { error: 'Failed to create research member' },
      { status: 500 }
    )
  }
}

// PUT - 멤버 수정 (관리자만)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, position, role_title, organization, specialty, photo_url, display_order, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await queryWithAuth<ResearchMember>(
      `UPDATE research_members
       SET name = COALESCE($2, name),
           position = COALESCE($3, position),
           role_title = $4,
           organization = COALESCE($5, organization),
           specialty = $6,
           photo_url = $7,
           display_order = COALESCE($8, display_order),
           is_active = COALESCE($9, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, name, position, role_title, organization, specialty, photo_url, display_order, is_active]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Failed to update research member:', error)
    return NextResponse.json(
      { error: 'Failed to update research member' },
      { status: 500 }
    )
  }
}

// DELETE - 멤버 삭제 (관리자만)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await queryWithAuth('DELETE FROM research_members WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete research member:', error)
    return NextResponse.json(
      { error: 'Failed to delete research member' },
      { status: 500 }
    )
  }
}
