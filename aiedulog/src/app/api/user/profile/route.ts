/**
 * User Profile API
 * GET: 현재 로그인한 사용자의 프로필 조회
 * POST: 프로필이 없으면 자동 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as any
    const email = sessionUser.email
    const cognitoSub = sessionUser.id || sessionUser.sub

    if (!email) {
      return NextResponse.json({ error: 'Email not found in session' }, { status: 400 })
    }

    const supabase = createClient()

    // 1. user_profiles 테이블에서 이메일로 프로필 조회
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (profile) {
      // Cognito groups에서 role 동기화 (세션의 groups가 더 최신)
      const groups = sessionUser.groups || []
      const sessionRole = groups.includes('admin')
        ? 'admin'
        : groups.includes('moderator')
          ? 'moderator'
          : groups.includes('verified')
            ? 'verified'
            : 'member'

      // DB role과 Cognito role이 다르면 Cognito 우선 (더 신뢰할 수 있음)
      const finalProfile = {
        ...profile,
        role: sessionRole
      }

      return NextResponse.json({ profile: finalProfile })
    }

    // 2. 프로필이 없으면 null 반환 (클라이언트에서 생성 요청 가능)
    return NextResponse.json({ profile: null })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as any
    const email = sessionUser.email
    const cognitoSub = sessionUser.id || sessionUser.sub
    const groups = sessionUser.groups || []

    if (!email || !cognitoSub) {
      return NextResponse.json({ error: 'Email or user ID not found' }, { status: 400 })
    }

    const supabase = createClient()

    // Cognito groups에서 role 결정
    const role = groups.includes('admin')
      ? 'admin'
      : groups.includes('moderator')
        ? 'moderator'
        : groups.includes('verified')
          ? 'verified'
          : 'member'

    // 1. 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // 2. 새 프로필 생성
    const newProfile = {
      user_id: cognitoSub,
      email: email,
      nickname: email.split('@')[0],
      role: role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const insertResult = await supabase
      .from('user_profiles')
      .insert(newProfile)
      
    const created = insertResult.data ? (Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data) : null
    const error = insertResult.error

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: created }, { status: 201 })

  } catch (error) {
    console.error('Profile creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
