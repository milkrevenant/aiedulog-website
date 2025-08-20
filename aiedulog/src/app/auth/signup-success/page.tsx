'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material'
import { CheckCircleOutline, EmailOutlined, LoginOutlined } from '@mui/icons-material'
import confetti from 'canvas-confetti'

export default function SignupSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // 축하 애니메이션
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })

    // 카운트다운
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // 카운트다운이 0이 되면 리다이렉트
    if (countdown === 0) {
      router.push('/auth/login')
    }
  }, [countdown, router])

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
          }}
        >
          <CheckCircleOutline
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 2,
            }}
          />

          <Typography variant="h4" gutterBottom fontWeight="bold">
            회원가입 완료!
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            전남에듀테크교육연구회에 오신 것을 환영합니다!
          </Typography>

          <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Stack spacing={2} alignItems="center">
              <EmailOutlined color="action" />
              <Typography variant="body2" color="text.secondary">
                인증 메일이 발송되었습니다.
                <br />
                이메일을 확인하여 계정을 활성화해주세요.
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginOutlined />}
              onClick={() => router.push('/auth/login')}
              fullWidth
            >
              로그인 페이지로
            </Button>

            <Button variant="outlined" size="large" onClick={() => router.push('/')} fullWidth>
              홈으로 돌아가기
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            {countdown > 0 && `${countdown}초 후 로그인 페이지로 이동합니다...`}
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
