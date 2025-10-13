'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession as useNextAuthSession } from 'next-auth/react'
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

type BasicUser = {
  id: string
  email?: string | null
}

export function useUser() {
  const { data: session, status } = useNextAuthSession()
  const loading = status === 'loading'
  const user: BasicUser | null = session?.user
    ? { id: (session.user as any).id || 'nextauth-user', email: session.user.email }
    : null
  return { user, loading, error: null as Error | null }
}

export function useSession() {
  const { data: session, status } = useNextAuthSession()
  const loading = status === 'loading'
  return { session: session as any, loading }
}

export function useAuth() {
  const { user, loading: userLoading } = useUser()
  const { session, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (session?.user) {
      // Map NextAuth session to simple profile (roles via groups)
      const groups: string[] = ((session.user as any).groups as string[]) || []
      const role = groups.includes('admin') ? 'admin' : groups.includes('moderator') ? 'moderator' : 'member'
      setProfile({ role })
    } else {
      setProfile(null)
    }
  }, [session])

  const signIn = async () => {
    await nextAuthSignIn('cognito', { callbackUrl: '/feed' })
  }

  const signUp = async () => {
    await nextAuthSignIn('cognito', { callbackUrl: '/feed' })
  }

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/auth/login' })
    router.push('/auth/login')
  }

  const updateProfile = async (_updates: any) => {
    throw new Error('updateProfile is not implemented for NextAuth-only mode')
  }

  return {
    user,
    session,
    profile,
    loading: userLoading || sessionLoading,
    error: null as Error | null,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    isVerified: profile?.role === 'verified' || profile?.role === 'moderator' || profile?.role === 'admin',
  }
}