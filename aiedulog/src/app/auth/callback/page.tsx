'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography, Button } from '@mui/material'
import { signIn } from 'next-auth/react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // 이 경로는 Supabase 시절 콜백을 위한 것이었음.
    // 현재는 NextAuth API(/api/auth/callback/cognito)가 콜백을 처리하므로
    // Cognito Hosted UI로 이동시키거나 홈으로 보냅니다.
    signIn('cognito', { callbackUrl: '/feed' })
  }, [router])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        로그인 페이지로 이동 중...
      </Typography>
      <Button onClick={() => signIn('cognito', { callbackUrl: '/feed' })} variant="contained">
        바로 이동
      </Button>
    </Box>
  )
}