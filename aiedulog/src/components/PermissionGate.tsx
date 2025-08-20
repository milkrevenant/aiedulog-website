'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { Permission, UserRole } from '@/lib/auth/permissions'
import { Box, Typography, Paper, Button } from '@mui/material'
import { Lock } from '@mui/icons-material'
import Link from 'next/link'

interface PermissionGateProps {
  children: ReactNode
  permission?: Permission
  role?: UserRole
  minimumRole?: UserRole
  fallback?: ReactNode
  showError?: boolean
}

export function PermissionGate({
  children,
  permission,
  role,
  minimumRole,
  fallback,
  showError = true,
}: PermissionGateProps) {
  const { user, loading, can, hasRole, hasMinimumRole } = usePermission()

  // 로딩 중
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>권한 확인 중...</Typography>
      </Box>
    )
  }

  // 로그인 필요
  if (!user) {
    if (!showError) return null

    return (
      fallback || (
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, mx: 'auto', my: 4 }}>
          <Lock sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            로그인이 필요합니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            이 페이지에 접근하려면 로그인이 필요합니다.
          </Typography>
          <Button component={Link} href="/auth/login" variant="contained" sx={{ borderRadius: 10 }}>
            로그인하기
          </Button>
        </Paper>
      )
    )
  }

  // 권한 확인
  let hasAccess = true

  if (permission) {
    hasAccess = can(permission)
  }

  if (role) {
    hasAccess = hasAccess && hasRole(role)
  }

  if (minimumRole) {
    hasAccess = hasAccess && hasMinimumRole(minimumRole)
  }

  // 권한 없음
  if (!hasAccess) {
    if (!showError) return null

    return (
      fallback || (
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400, mx: 'auto', my: 4 }}>
          <Lock sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom color="error">
            접근 권한이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            이 페이지에 접근할 수 있는 권한이 없습니다.
            {permission && (
              <Box component="span" sx={{ display: 'block', mt: 1 }}>
                필요한 권한: {permission}
              </Box>
            )}
            {role && (
              <Box component="span" sx={{ display: 'block', mt: 1 }}>
                필요한 역할: {role}
              </Box>
            )}
          </Typography>
          <Button component={Link} href="/dashboard" variant="outlined" sx={{ borderRadius: 10 }}>
            대시보드로 이동
          </Button>
        </Paper>
      )
    )
  }

  // 권한 있음
  return <>{children}</>
}

// 권한 확인 컴포넌트 (조건부 렌더링용)
interface CanProps {
  permission?: Permission
  role?: UserRole
  minimumRole?: UserRole
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ permission, role, minimumRole, children, fallback = null }: CanProps) {
  return (
    <PermissionGate
      permission={permission}
      role={role}
      minimumRole={minimumRole}
      fallback={fallback}
      showError={false}
    >
      {children}
    </PermissionGate>
  )
}
