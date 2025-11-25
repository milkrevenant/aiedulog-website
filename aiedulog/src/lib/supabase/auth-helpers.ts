import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { signOut as nextAuthSignOut } from 'next-auth/react'
import { getUserIdentity } from '@/lib/identity/helpers'
import type { AppUser } from '@/lib/auth/types'

// NextAuth/Cognito replacements for legacy Supabase helpers

export async function getSession() {
  try {
    const session = await getServerSession()
    return session
  } catch (e) {
    return null
  }
}

export async function getUser(): Promise<any | null> {
  const session = await getSession()
  return session?.user || null
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  const authUser: AppUser | null = session.user
    ? { id: (session.user as any).id || 'nextauth-user', email: session.user.email }
    : null
  const identity = authUser ? await getUserIdentity(authUser, true) : null
  if (!identity?.profile || identity.profile.role !== 'admin') {
    redirect('/dashboard')
  }
  return session
}

export async function requireModerator() {
  const session = await requireAuth()
  const authUser: AppUser | null = session.user
    ? { id: (session.user as any).id || 'nextauth-user', email: session.user.email }
    : null
  const identity = authUser ? await getUserIdentity(authUser, true) : null
  if (!identity?.profile || (identity.profile.role !== 'admin' && identity.profile.role !== 'moderator')) {
    redirect('/dashboard')
  }
  return session
}

export async function getUserProfile(userId: string) {
  // Minimal object for identity helper
  const userObj: AppUser = { id: userId }
  const identity = await getUserIdentity(userObj, true)
  return identity?.profile || null
}

export async function signOut() {
  try {
    await nextAuthSignOut({ callbackUrl: '/auth/login' })
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}
