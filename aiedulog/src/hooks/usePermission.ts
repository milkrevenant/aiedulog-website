'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasPermission, UserRole, Permission } from '@/lib/auth/permissions'
import { getUserIdentity } from '@/lib/identity/helpers'

interface UserProfile {
  id: string
  identity_id: string
  email: string
  role: UserRole
  full_name?: string
  school?: string
  subject?: string
  nickname?: string
  avatar_url?: string
}

export function usePermission() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          // Use identity helper for consistent user data retrieval
          const identity = await getUserIdentity(authUser)
          
          if (identity && identity.profile) {
            const profile = identity.profile
            
            setUser({
              id: authUser.id,
              identity_id: identity.user_id,
              email: profile.email,
              role: profile.role as UserRole,
              full_name: profile.full_name,
              nickname: profile.nickname,
              avatar_url: profile.avatar_url,
              school: profile.school,
              subject: profile.subject
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()

    // Auth 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use the same logic as fetchUserProfile for consistency
        await fetchUserProfile()
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // 권한 확인 함수
  const can = (permission: Permission): boolean => {
    if (!user) return false
    return hasPermission(user.role, permission)
  }

  // 역할 확인 함수
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role
  }

  // 최소 역할 확인 함수
  const hasMinimumRole = (minRole: UserRole): boolean => {
    if (!user) return false

    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      moderator: 3,
      verified: 2,
      member: 1,
    }

    return roleHierarchy[user.role] >= roleHierarchy[minRole]
  }

  return {
    user,
    loading,
    can,
    hasPermission: can, // 별칭 추가 (호환성)
    hasRole,
    hasMinimumRole,
    role: user?.role, // 현재 사용자 role 추가
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator',
    isVerified: user?.role === 'verified',
    isMember: user?.role === 'member',
    isAuthenticated: !!user,
  }
}
