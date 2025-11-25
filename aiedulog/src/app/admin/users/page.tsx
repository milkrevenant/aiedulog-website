/**
 * Users Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { UsersClient } from './UsersClient'

type UserRole = 'admin' | 'moderator' | 'verified' | 'member'

interface AdminUser {
  id: string
  user_id: string
  email: string
  username: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  is_active: boolean
  status?: string
  school?: string
  subject?: string
  updated_at?: string
}

async function getUsers() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    // Fetch user profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      return []
    }

    // Get user IDs from profiles
    const userIds = profilesData?.map((profile: any) => profile.user_id) || []

    // Get auth methods data
    const { data: authMethodsData } = userIds.length > 0
      ? await supabase
          .from('auth_methods')
          .select('user_id, provider, last_sign_in_at, email_confirmed_at')
          .in('user_id', userIds)
      : { data: [] }

    // Create auth methods lookup map
    const authMethodsMap = new Map()
    authMethodsData?.forEach((auth: any) => {
      authMethodsMap.set(auth.user_id, auth)
    })

    // Transform and merge data
    const usersData =
      profilesData
        ?.map((profile: any) => {
          const authMethod = authMethodsMap.get(profile.user_id)

          // Only include active users
          if (!profile.is_active) {
            return null
          }

          return {
            id: profile.user_id,
            user_id: profile.user_id,
            email: profile.email || '',
            username: profile.username || profile.email?.split('@')[0] || '',
            nickname: profile.nickname,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: profile.role || 'member',
            school: profile.school,
            subject: profile.subject,
            is_active: profile.is_active ?? true,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            last_sign_in_at: authMethod?.last_sign_in_at,
            email_confirmed_at: authMethod?.email_confirmed_at,
            status: profile.is_active ? 'active' : 'inactive',
          }
        })
        .filter(Boolean) || []

    return usersData
  } catch (error) {
    console.error('Error in getUsers:', error)
    return []
  }
}

export default async function UsersManagementPage() {
  const data = await getUsers()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/users')
  }

  return (
    <AuthGuard requireAdmin>
      <UsersClient initialUsers={data} />
    </AuthGuard>
  )
}
