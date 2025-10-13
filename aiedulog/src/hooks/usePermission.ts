'use client'

import { useEffect, useState } from 'react'
import { hasPermission, UserRole, Permission } from '@/lib/auth/permissions'
import { useSession } from 'next-auth/react'

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
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const groups = ((session.user as any).groups as string[]) || []
      const role: UserRole = groups.includes('admin') ? 'admin'
        : groups.includes('moderator') ? 'moderator'
        : 'member'

      setUser({
        id: (session.user as any).id || (session.user as any).sub || '',
        identity_id: (session.user as any).sub || '',
        email: session.user.email || '',
        role,
        full_name: (session.user as any).name,
        nickname: (session.user as any).nickname,
        avatar_url: (session.user as any).image,
      })
    } else if (status === 'unauthenticated') {
      setUser(null)
    }
  }, [session, status])

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
