'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Container, Typography, Button, Paper, Stack, Alert } from '@mui/material'
import { CheckCircleOutline, EmailOutlined, LoginOutlined, RefreshOutlined } from '@mui/icons-material'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'

export default function SignupSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    // 축하 애니메이션
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })

    // 저장된 이메일 가져오기
    const email = localStorage.getItem('signupEmail')
    if (email) {
      setUserEmail(email)
    }

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

  const handleResendEmail = async () => {
    if (!userEmail) {
      setResendMessage('이메일 정보를 찾을 수 없습니다.')
      return
    }

    setResending(true)
    setResendMessage('')
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      })
      
      if (error) {
        setResendMessage(`재발송 실패: ${error.message}`)
      } else {
        setResendMessage('이메일이 재발송되었습니다! 받은 편지함을 확인해주세요.')
      }
    } catch (error: any) {
      setResendMessage(`오류: ${error.message}`)
    } finally {
      setResending(false)
    }
  }

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

          <Box sx={{ mb: 4, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Stack spacing={2} alignItems="center">
              <EmailOutlined color="action" />
              <Typography variant="body2" color="text.primary" fontWeight="bold">
                ⚠️ 중요: 이메일 인증 필수!
                <br />
                이메일을 확인하여 인증 링크를 클릭해주세요.
                <br />
                <Typography variant="caption" color="text.secondary">
                  인증 완료 후 로그인이 가능합니다.
                </Typography>
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

            <Button 
              variant="outlined" 
              size="large" 
              startIcon={<RefreshOutlined />}
              onClick={handleResendEmail}
              disabled={resending}
              fullWidth
            >
              {resending ? '재발송 중...' : '이메일을 받지 못하셨나요? 재발송'}
            </Button>

            <Button variant="text" size="large" onClick={() => router.push('/')} fullWidth>
              홈으로 돌아가기
            </Button>
          </Stack>

          {resendMessage && (
            <Alert 
              severity={resendMessage.includes('실패') || resendMessage.includes('오류') ? 'error' : 'success'}
              sx={{ mt: 2 }}
            >
              {resendMessage}
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            {countdown > 0 && `${countdown}초 후 로그인 페이지로 이동합니다...`}
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
