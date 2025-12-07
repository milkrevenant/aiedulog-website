'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Box, Container, Paper, Typography, Button, CircularProgress } from '@mui/material'
import { LockOutlined } from '@mui/icons-material'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireModerator?: boolean
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireModerator = false,
}: AuthGuardProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const groups = ((session?.user as any)?.groups as string[]) || []
  const role = groups.includes('admin') ? 'admin'
    : groups.includes('moderator') ? 'moderator'
    : 'member'
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator'

  // Simple permission check logic
  const isAuthorized = () => {
    if (!requireAuth) return true
    if (!isAuthenticated) return false

    if (requireAdmin) return isAdmin
    if (requireModerator) return isAdmin || isModerator  // admin도 moderator 페이지 접근 가능

    return true
  }

  const getRoleDisplayName = (role: string | undefined) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'moderator': return '운영진'
      case 'verified': return '인증 교사'
      case 'lecturer': return '강사'
      default: return '일반 회원'
    }
  }

  if (status === 'loading') {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated && requireAuth) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <LockOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            로그인이 필요합니다
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            이 페이지를 보려면 먼저 로그인해주세요.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/auth/login')}
            sx={{ minWidth: 200 }}
          >
            로그인하기
          </Button>
        </Paper>
      </Container>
    )
  }

  if (isAuthenticated && !isAuthorized() && (requireAdmin || requireModerator)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'error.main',
            borderRadius: 2,
            bgcolor: '#fff5f5',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <LockOutlined sx={{ fontSize: 40, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom color="error.dark">
            접근 권한이 없습니다
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {requireAdmin ? '관리자' : '운영진'} 권한이 필요한 페이지입니다.
            <br />
            현재 권한: {getRoleDisplayName(role)}
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push('/dashboard')}
            sx={{ minWidth: 200 }}
          >
            대시보드로 이동
          </Button>
        </Paper>
      </Container>
    )
  }

  return <>{children}</>
}
