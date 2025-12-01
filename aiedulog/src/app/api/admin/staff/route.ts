import { NextRequest, NextResponse } from 'next/server'
import { queryWithAuth } from '@/lib/db/rds-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'

export interface StaffMember {
  id: string
  user_id: string
  staff_role: string
  staff_title: string | null
  department: string | null
  is_active: boolean
  appointed_at: string
  appointed_by: string | null
  notes: string | null
  // joined from user_profiles
  email?: string
  username?: string
  nickname?: string
  full_name?: string
  avatar_url?: string
}

export interface PermissionArea {
  id: string
  area_code: string
  area_name: string
  description: string | null
  display_order: number
}

export interface UserPermission {
  id: string
  user_id: string
  area_code: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  granted_at: string
  expires_at: string | null
}

// GET - 운영진 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'staff', 'areas', 'permissions'
    const userId = searchParams.get('user_id')

    if (type === 'areas') {
      // 권한 영역 목록
      const result = await queryWithAuth<PermissionArea>(
        `SELECT * FROM permission_areas ORDER BY display_order ASC`
      )
      return NextResponse.json(result.rows)
    }

    if (type === 'permissions' && userId) {
      // 특정 사용자의 권한 목록
      const result = await queryWithAuth<UserPermission>(
        `SELECT up.*, pa.area_name
         FROM user_permissions up
         JOIN permission_areas pa ON up.area_code = pa.area_code
         WHERE up.user_id = $1
         ORDER BY pa.display_order ASC`,
        [userId]
      )
      return NextResponse.json(result.rows)
    }

    // 운영진 목록 (기본)
    const result = await queryWithAuth<StaffMember>(
      `SELECT s.*, u.email, u.username, u.nickname, u.full_name, u.avatar_url
       FROM staff_members s
       JOIN user_profiles u ON s.user_id = u.user_id
       ORDER BY
         CASE s.staff_role
           WHEN '회장' THEN 1
           WHEN '부회장' THEN 2
           WHEN '운영위원' THEN 3
           WHEN '연구위원' THEN 4
           ELSE 5
         END,
         s.appointed_at ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff members' },
      { status: 500 }
    )
  }
}

// POST - 운영진 추가
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, staff_role, staff_title, department, notes } = body

    if (!user_id || !staff_role) {
      return NextResponse.json(
        { error: 'user_id and staff_role are required' },
        { status: 400 }
      )
    }

    // 현재 사용자의 user_id 가져오기 (appointed_by 용)
    const currentUser = session.user as any
    const currentUserId = currentUser.id || currentUser.sub

    // 이미 운영진인지 확인
    const existing = await queryWithAuth(
      `SELECT id FROM staff_members WHERE user_id = $1`,
      [user_id]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'User is already a staff member' },
        { status: 400 }
      )
    }

    const result = await queryWithAuth<StaffMember>(
      `INSERT INTO staff_members (user_id, staff_role, staff_title, department, notes, appointed_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, staff_role, staff_title || null, department || null, notes || null, currentUserId]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to add staff member:', error)
    return NextResponse.json(
      { error: 'Failed to add staff member' },
      { status: 500 }
    )
  }
}

// PUT - 운영진 수정 또는 개별 권한 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 개별 권한 수정
    if (body.type === 'permission') {
      const { user_id, area_code, can_view, can_create, can_edit, can_delete } = body

      const currentUser = session.user as any
      const currentUserId = currentUser.id || currentUser.sub

      const result = await queryWithAuth<UserPermission>(
        `INSERT INTO user_permissions (user_id, area_code, can_view, can_create, can_edit, can_delete, granted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, area_code) DO UPDATE SET
           can_view = $3,
           can_create = $4,
           can_edit = $5,
           can_delete = $6,
           granted_by = $7,
           granted_at = NOW()
         RETURNING *`,
        [user_id, area_code, can_view ?? true, can_create ?? false, can_edit ?? false, can_delete ?? false, currentUserId]
      )

      return NextResponse.json(result.rows[0])
    }

    // 운영진 정보 수정
    const { id, staff_role, staff_title, department, is_active, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const result = await queryWithAuth<StaffMember>(
      `UPDATE staff_members
       SET staff_role = COALESCE($2, staff_role),
           staff_title = $3,
           department = $4,
           is_active = COALESCE($5, is_active),
           notes = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, staff_role, staff_title, department, is_active, notes]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    )
  }
}

// DELETE - 운영진 삭제 (권한도 함께 삭제됨)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')
    const areaCode = searchParams.get('area_code')

    // 개별 권한 삭제
    if (userId && areaCode) {
      await queryWithAuth(
        `DELETE FROM user_permissions WHERE user_id = $1 AND area_code = $2`,
        [userId, areaCode]
      )
      return NextResponse.json({ success: true })
    }

    // 운영진 삭제
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // 먼저 user_id 가져오기
    const staff = await queryWithAuth<{ user_id: string }>(
      `SELECT user_id FROM staff_members WHERE id = $1`,
      [id]
    )

    if (staff.rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const staffUserId = staff.rows[0].user_id

    // 운영진 삭제
    await queryWithAuth(`DELETE FROM staff_members WHERE id = $1`, [id])

    // 해당 사용자의 모든 권한도 삭제
    await queryWithAuth(`DELETE FROM user_permissions WHERE user_id = $1`, [staffUserId])

    // role을 member로 되돌리기
    await queryWithAuth(
      `UPDATE user_profiles SET role = 'member' WHERE user_id = $1`,
      [staffUserId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete staff:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}
