import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { queryWithAuth } from '@/lib/db/rds-client'

export const runtime = 'nodejs'

interface ProfileRow {
  user_id: string
  email: string | null
  role: string | null
  full_name?: string | null
  nickname?: string | null
  avatar_url?: string | null
}

interface AreaPermissionRow {
  area_code: string
  area_name: string
  description: string | null
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authId =
      (session.user as any).sub ||
      (session.user as any).id ||
      (session.user as any).userId ||
      session.user.email

    if (!authId) {
      return NextResponse.json({ error: 'Missing identity' }, { status: 400 })
    }

    // Find profile by Cognito subject (preferred)
    let profile: ProfileRow | null = null
    try {
      const { rows } = await queryWithAuth<ProfileRow>(
        `SELECT up.user_id, up.email, up.role, up.full_name, up.nickname, up.avatar_url
         FROM auth_methods am
         JOIN user_profiles up ON am.user_id = up.user_id
         WHERE am.provider = 'cognito' AND am.auth_provider_id = $1
         LIMIT 1`,
        [authId]
      )
      profile = rows[0] || null
    } catch (error) {
      console.error('Failed to load profile via auth_methods:', error)
    }

    // Fallback: match by email if profile not found
    if (!profile && session.user.email) {
      const { rows } = await queryWithAuth<ProfileRow>(
        `SELECT user_id, email, role, full_name, nickname, avatar_url
         FROM user_profiles
         WHERE email = $1
         LIMIT 1`,
        [session.user.email]
      )
      profile = rows[0] || null
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { rows: permissions } = await queryWithAuth<AreaPermissionRow>(
      `SELECT
         pa.area_code,
         pa.area_name,
         pa.description,
         COALESCE(up.can_view, false) AS can_view,
         COALESCE(up.can_create, false) AS can_create,
         COALESCE(up.can_edit, false) AS can_edit,
         COALESCE(up.can_delete, false) AS can_delete
       FROM permission_areas pa
       LEFT JOIN user_permissions up
         ON up.area_code = pa.area_code
         AND up.user_id = $1
       ORDER BY pa.display_order ASC`,
      [profile.user_id]
    )

    return NextResponse.json({
      user: {
        user_id: profile.user_id,
        identity_id: authId,
        email: profile.email,
        role: profile.role || 'member',
        full_name: profile.full_name,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      },
      permissions,
    })
  } catch (error) {
    console.error('Failed to load current user permissions:', error)
    return NextResponse.json({ error: 'Failed to load permissions' }, { status: 500 })
  }
}
