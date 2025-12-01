import { NextRequest, NextResponse } from 'next/server'
import { queryWithAuth } from '@/lib/db/rds-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'

export interface TrainingMaterial {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  type: string
  file_url: string | null
  embed_code: string | null
  tags: string[] | null
  category: string
  training_date: string
  instructor: string | null
  created_at: string
  updated_at: string
}

// GET - 모든 자료 조회 (공개)
export async function GET() {
  try {
    const result = await queryWithAuth<TrainingMaterial>(
      `SELECT * FROM training_materials
       ORDER BY training_date DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch training materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training materials' },
      { status: 500 }
    )
  }
}

// POST - 새 자료 추가 (관리자만)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, subtitle, description, type, file_url, embed_code, tags, category, training_date, instructor } = body

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      )
    }

    const result = await queryWithAuth<TrainingMaterial>(
      `INSERT INTO training_materials (title, subtitle, description, type, file_url, embed_code, tags, category, training_date, instructor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, subtitle || null, description || null, type, file_url || null, embed_code || null, tags || null, category || 'etc', training_date || new Date().toISOString().split('T')[0], instructor || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to create training material:', error)
    return NextResponse.json(
      { error: 'Failed to create training material' },
      { status: 500 }
    )
  }
}

// PUT - 자료 수정 (관리자만)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, subtitle, description, type, file_url, embed_code, tags, category, training_date, instructor } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await queryWithAuth<TrainingMaterial>(
      `UPDATE training_materials
       SET title = COALESCE($2, title),
           subtitle = $3,
           description = $4,
           type = COALESCE($5, type),
           file_url = $6,
           embed_code = $7,
           tags = $8,
           category = COALESCE($9, category),
           training_date = COALESCE($10, training_date),
           instructor = $11,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, title, subtitle, description, type, file_url, embed_code, tags, category, training_date, instructor]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Failed to update training material:', error)
    return NextResponse.json(
      { error: 'Failed to update training material' },
      { status: 500 }
    )
  }
}

// DELETE - 자료 삭제 (관리자만)
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

    await queryWithAuth('DELETE FROM training_materials WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete training material:', error)
    return NextResponse.json(
      { error: 'Failed to delete training material' },
      { status: 500 }
    )
  }
}
