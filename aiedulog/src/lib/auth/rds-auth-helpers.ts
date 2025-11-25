/**
 * RDS Authentication Helpers
 * Replaces Supabase auth patterns with NextAuth + RDS
 * Created: 2025-10-14
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { createRDSClient } from '@/lib/db/rds-client'
import { UserProfile } from '@/lib/db/types'

/**
 * Get authenticated user from request
 * Replaces: supabase.auth.getUser()
 */
export async function getAuthenticatedUser(request?: NextRequest) {
  const session = await getServerSession(authOptions)

  const sessionUser = session?.user as ({ id?: string | null; email?: string | null } | undefined)

  if (!sessionUser?.email) {
    return { user: null, error: 'Unauthorized' }
  }

  const userId = sessionUser.id ?? sessionUser.email

  if (!userId) {
    return { user: null, error: 'Unauthorized' }
  }

  return {
    user: {
      id: userId,
      email: sessionUser.email,
    },
    error: null,
  }
}

/**
 * Check if user is admin
 * Replaces: supabase.from('user_profiles').select('role').eq('user_id')...
 */
export async function checkAdminRole(userId: string): Promise<boolean> {
  const rds = createRDSClient()

  try {
    const { data, error } = await rds
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) {
      return false
    }

    const profile = data[0] as UserProfile
    return profile.role === 'admin'
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Check if user is admin or moderator
 */
export async function checkModeratorRole(userId: string): Promise<boolean> {
  const rds = createRDSClient()

  try {
    const { data, error } = await rds
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) {
      return false
    }

    const profile = data[0] as UserProfile
    return profile.role === 'admin' || profile.role === 'moderator'
  } catch (error) {
    console.error('Error checking moderator role:', error)
    return false
  }
}

/**
 * Combined auth check for API routes requiring admin access
 * Returns user and performs admin check in one call
 *
 * Usage in API routes:
 * ```typescript
 * const auth = await requireAdmin(request)
 * if (auth.error) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status })
 * }
 * // auth.user is guaranteed to exist and be admin
 * ```
 */
export async function requireAdmin(request?: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request)

  if (error || !user) {
    return {
      user: null,
      isAdmin: false,
      error: error || 'Unauthorized',
      status: 401,
    }
  }

  const isAdmin = await checkAdminRole(user.id)

  if (!isAdmin) {
    return {
      user,
      isAdmin: false,
      error: 'Forbidden',
      status: 403,
    }
  }

  return { user, isAdmin: true, error: null, status: 200 }
}

/**
 * Combined auth check for API routes requiring moderator access
 */
export async function requireModerator(request?: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request)

  if (error || !user) {
    return {
      user: null,
      isModerator: false,
      error: error || 'Unauthorized',
      status: 401,
    }
  }

  const isModerator = await checkModeratorRole(user.id)

  if (!isModerator) {
    return {
      user,
      isModerator: false,
      error: 'Forbidden',
      status: 403,
    }
  }

  return { user, isModerator: true, error: null, status: 200 }
}

/**
 * Get user profile from RDS
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const rds = createRDSClient()

  try {
    const { data, error } = await rds
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) {
      return null
    }

    return data[0] as UserProfile
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}
