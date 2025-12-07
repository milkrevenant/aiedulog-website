'use client'

import { useEffect, useState } from 'react'
import { hasPermission, UserRole, Permission } from '@/lib/auth/permissions'
import { useSession } from 'next-auth/react'

type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

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

interface AreaPermission {
  area_code: string
  area_name: string
  description?: string | null
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

interface PermissionResponse {
  user?: Partial<UserProfile> & { user_id?: string; identity_id?: string; role?: UserRole | string }
  permissions?: AreaPermission[]
}

const permissionAreaMap: Partial<Record<Permission, Array<{ area: string; action: PermissionAction }>>> = {
  manage_users: [{ area: 'users', action: 'edit' }],
  manage_content: [
    { area: 'posts', action: 'edit' },
    { area: 'comments', action: 'edit' },
    { area: 'training_materials', action: 'edit' },
    { area: 'lectures', action: 'edit' },
  ],
  manage_columns: [{ area: 'posts', action: 'edit' }],
  manage_settings: [{ area: 'settings', action: 'edit' }],
  manage_reports: [{ area: 'reports', action: 'view' }],
  delete_any_post: [{ area: 'posts', action: 'delete' }],
  delete_any_comment: [{ area: 'comments', action: 'delete' }],
  pin_posts: [{ area: 'posts', action: 'edit' }],
  send_announcements: [{ area: 'notifications', action: 'create' }],
  write_columns: [{ area: 'posts', action: 'create' }],
  create_lectures: [{ area: 'lectures', action: 'create' }],
  upload_resources: [{ area: 'training_materials', action: 'create' }],
  create_job_posts: [{ area: 'posts', action: 'create' }],
}

const deriveRoleFromGroups = (groups: string[]): UserRole => {
  if (groups.includes('admin')) return 'admin'
  if (groups.includes('moderator')) return 'moderator'
  if (groups.includes('verified')) return 'verified'
  return 'member'
}

export function usePermission() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [areaPermissions, setAreaPermissions] = useState<Record<string, AreaPermission>>({})
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true)
      return
    }

    if (status === 'unauthenticated') {
      setUser(null)
      setAreaPermissions({})
      setLoading(false)
      return
    }

    const loadPermissions = async () => {
      setLoading(true)
      const fallbackRole = deriveRoleFromGroups(((session?.user as any)?.groups as string[]) || [])

      try {
        const res = await fetch('/api/me/permissions', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Failed to load permissions: ${res.status}`)
        }

        const data: PermissionResponse = await res.json()

        const mappedUser: UserProfile = {
          id: data.user?.user_id || (session?.user as any)?.id || (session?.user as any)?.sub || '',
          identity_id: data.user?.identity_id || (session?.user as any)?.sub || '',
          email: data.user?.email || session?.user?.email || '',
          role: (data.user?.role as UserRole) || fallbackRole,
          full_name: data.user?.full_name || (session?.user as any)?.name,
          nickname: data.user?.nickname || (session?.user as any)?.nickname,
          avatar_url: data.user?.avatar_url || (session?.user as any)?.image,
        }
        setUser(mappedUser)

        const permissionMap = (data.permissions || []).reduce((acc, perm) => {
          acc[perm.area_code] = perm
          return acc
        }, {} as Record<string, AreaPermission>)

        setAreaPermissions(permissionMap)
      } catch (error) {
        console.error('usePermission: failed to load permissions', error)

        if (session?.user) {
          const groups = ((session.user as any).groups as string[]) || []
          const role = deriveRoleFromGroups(groups)

          setUser({
            id: (session.user as any).id || (session.user as any).sub || '',
            identity_id: (session.user as any).sub || '',
            email: session.user.email || '',
            role,
            full_name: (session.user as any).name,
            nickname: (session.user as any).nickname,
            avatar_url: (session.user as any).image,
          })
        } else {
          setUser(null)
        }

        setAreaPermissions({})
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [session, status])

  const canArea = (areaCode: string, action: PermissionAction = 'view'): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true

    const permission = areaPermissions[areaCode]
    if (!permission) return false

    switch (action) {
      case 'create':
        return permission.can_create
      case 'edit':
        return permission.can_edit || permission.can_create
      case 'delete':
        return permission.can_delete || permission.can_edit
      case 'view':
      default:
        return (
          permission.can_view ||
          permission.can_create ||
          permission.can_edit ||
          permission.can_delete
        )
    }
  }

  // 권한 확인 함수
  const can = (permission: Permission): boolean => {
    if (!user) return false
    if (hasPermission(user.role, permission)) return true

    const mappedAreas = permissionAreaMap[permission]
    if (!mappedAreas) return false

    return mappedAreas.some(({ area, action }) => canArea(area, action))
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
    canArea,
    hasRole,
    hasMinimumRole,
    role: user?.role, // 현재 사용자 role 추가
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator',
    isVerified: user?.role === 'verified',
    isMember: user?.role === 'member',
    isAuthenticated: !!user,
    areaPermissions,
  }
}
