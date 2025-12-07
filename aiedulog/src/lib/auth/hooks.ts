'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession as useNextAuthSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import type { AppUser } from './types'

type NextAuthSessionUser = {
  id?: string | null
  email?: string | null
  groups?: unknown
  [key: string]: unknown
}

type AuthProfile = {
  user_id?: string | null
  role: 'admin' | 'moderator' | 'member' | 'verified'
  email?: string | null
  nickname?: string | null
  avatar_url?: string | null
  full_name?: string | null
  bio?: string | null
  school?: string | null
  subject?: string | null
  is_active?: boolean
}

export function useUser() {
  const { data: session, status } = useNextAuthSession()
  const loading = status === 'loading'

  const sessionUser = session?.user as NextAuthSessionUser | undefined
  const user: AppUser | null = sessionUser?.id
    ? {
        id: sessionUser.id,
        email: sessionUser.email ?? null,
      }
    : null

  return { user, loading, error: null as Error | null }
}

export function useSession(): { session: Session | null; loading: boolean } {
  const { data: session, status } = useNextAuthSession()
  const loading = status === 'loading'
  return { session, loading }
}

export function useAuth() {
  const { user, loading: userLoading } = useUser()
  const { session, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const router = useRouter()
  const fetchedRef = useRef(false)

  useEffect(() => {
    const sessionUser = session?.user as NextAuthSessionUser | undefined

    if (!sessionUser) {
      setProfile(null)
      fetchedRef.current = false
      return
    }

    // Cognito groups에서 기본 role 결정
    const groups = Array.isArray(sessionUser.groups)
      ? (sessionUser.groups as unknown[])
          .filter((value): value is string => typeof value === 'string')
      : []

    const sessionRole: AuthProfile['role'] = groups.includes('admin')
      ? 'admin'
      : groups.includes('moderator')
        ? 'moderator'
        : groups.includes('verified')
          ? 'verified'
          : 'member'

    // 세션 기반 기본 프로필 설정 (빠른 응답)
    setProfile(prev => prev || {
      user_id: sessionUser.id ?? null,
      role: sessionRole,
      email: sessionUser.email ?? null,
      nickname: null,
      avatar_url: null,
      full_name: null,
      bio: null,
      school: null,
      subject: null
    })

    // API에서 DB 프로필 가져오기 (한 번만)
    if (!fetchedRef.current && sessionUser.email) {
      fetchedRef.current = true
      setProfileLoading(true)

      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile) {
            setProfile({
              user_id: data.profile.user_id,
              role: sessionRole, // Cognito groups 우선
              email: data.profile.email,
              nickname: data.profile.nickname,
              avatar_url: data.profile.avatar_url,
              full_name: data.profile.full_name,
              bio: data.profile.bio,
              school: data.profile.school,
              subject: data.profile.subject,
              is_active: data.profile.is_active
            })
          } else {
            // 프로필이 없으면 자동 생성
            fetch('/api/user/profile', { method: 'POST' })
              .then(res => res.json())
              .then(createData => {
                if (createData.profile) {
                  setProfile({
                    user_id: createData.profile.user_id,
                    role: sessionRole,
                    email: createData.profile.email,
                    nickname: createData.profile.nickname,
                    avatar_url: createData.profile.avatar_url,
                    full_name: createData.profile.full_name,
                    bio: createData.profile.bio,
                    school: createData.profile.school,
                    subject: createData.profile.subject,
                    is_active: createData.profile.is_active
                  })
                }
              })
              .catch(err => console.error('Profile creation failed:', err))
          }
        })
        .catch(err => console.error('Profile fetch failed:', err))
        .finally(() => setProfileLoading(false))
    }
  }, [session])

  const isAuthenticated = Boolean(user)

  const signIn = useCallback(async (): Promise<void> => {
    await nextAuthSignIn('cognito', { callbackUrl: '/feed' })
  }, [])

  const signUp = useCallback(async (): Promise<void> => {
    await nextAuthSignIn('cognito', { callbackUrl: '/feed' })
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await nextAuthSignOut({ callbackUrl: '/auth/login' })
    router.push('/auth/login')
  }, [router])

  const updateProfile = useCallback(async (_updates: Record<string, unknown>): Promise<void> => {
    throw new Error('updateProfile is not implemented for NextAuth-only mode')
  }, [])

  const authState = useMemo(() => ({
    user,
    session,
    profile,
    loading: userLoading || sessionLoading || profileLoading,
    error: null as Error | null,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    isVerified: profile?.role === 'verified' || profile?.role === 'moderator' || profile?.role === 'admin',
  }), [user, session, profile, userLoading, sessionLoading, profileLoading, isAuthenticated, signIn, signUp, signOut, updateProfile])

  return authState
}
