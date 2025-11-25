'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const router = useRouter()

  useEffect(() => {
    const sessionUser = session?.user as NextAuthSessionUser | undefined

    if (!sessionUser) {
      setProfile(null)
      return
    }

    const groups = Array.isArray(sessionUser.groups)
      ? (sessionUser.groups as unknown[])
          .filter((value): value is string => typeof value === 'string')
      : []

    const role: AuthProfile['role'] = groups.includes('admin')
      ? 'admin'
      : groups.includes('moderator')
        ? 'moderator'
        : groups.includes('verified')
          ? 'verified'
          : 'member'

    setProfile({
      user_id: sessionUser.id ?? null,
      role,
      email: sessionUser.email ?? null,
      nickname: (sessionUser as any)?.nickname ?? null,
      avatar_url: (sessionUser as any)?.avatar_url ?? null,
      full_name: (sessionUser as any)?.full_name ?? null,
      bio: (sessionUser as any)?.bio ?? null,
      school: (sessionUser as any)?.school ?? null,
      subject: (sessionUser as any)?.subject ?? null
    })
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
    loading: userLoading || sessionLoading,
    error: null as Error | null,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    isVerified: profile?.role === 'verified' || profile?.role === 'moderator' || profile?.role === 'admin',
  }), [user, session, profile, userLoading, sessionLoading, isAuthenticated, signIn, signUp, signOut, updateProfile])

  return authState
}
