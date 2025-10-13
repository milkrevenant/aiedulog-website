'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { translateAuthError, getErrorSuggestion } from '@/lib/utils/errorTranslator'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material'
import { Visibility, VisibilityOff, Google, Email, Lock, School } from '@mui/icons-material'
import { ActivityTracker } from '@/lib/auth/activity-tracker'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // const [isSignUp, setIsSignUp] = useState(false) // 회원가입은 별도 페이지로 이동
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  // Using NextAuth Cognito
  const theme = useTheme()

  useEffect(() => {
    // Check for messages in URL params
    const message = searchParams.get('message')
    const error = searchParams.get('error')
    
    if (message === 'password_reset_success') {
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해주세요.')
    } else if (error) {
      setError(decodeURIComponent(error))
    }
  }, [searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 로그인 유지 설정을 ActivityTracker에 저장
      ActivityTracker.setRememberMe(rememberMe)
      
      // Use the new identity-based sign in
      // Delegate to Cognito Hosted UI (username/password via Hosted UI)
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (error: any) {
      console.error('Login error:', error)
      const translatedError = translateAuthError(error)
      setError(translatedError)
      setErrorSuggestion(getErrorSuggestion(error.message || error))
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (error: any) {
      setError('Google 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }


  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* Logo & Title */}
          <Stack spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <School sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" fontWeight={600} textAlign="center">
              로그인
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              AIedulog
            </Typography>
          </Stack>

          {/* Form */}
          <form onSubmit={handleAuth}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                fullWidth
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => {
                        setRememberMe(e.target.checked)
                        // 즉시 ActivityTracker에도 반영 (로그인 전에도 설정값 저장)
                        ActivityTracker.setRememberMe(e.target.checked)
                      }}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      로그인 상태 유지 
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        (체크 시 자동 로그아웃 안함)
                      </Typography>
                    </Typography>
                  }
                />
                <Link href="/auth/reset-password" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                    비밀번호 찾기
                  </Typography>
                </Link>
              </Stack>

              {successMessage && (
                <Alert severity="success" sx={{ borderRadius: 2, mb: 2 }}>
                  {successMessage}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2">{error}</Typography>
                    {errorSuggestion && (
                      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.9 }}>
                        💡 {errorSuggestion}
                      </Typography>
                    )}
                  </Box>
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 10,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
              </Button>
            </Stack>
          </form>

          {/* Social Login */}
          <Box sx={{ my: 3 }}>
            <Divider>
              <Typography variant="body2" color="text.secondary">
                또는
              </Typography>
            </Divider>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleGoogleLogin}
            startIcon={<Google />}
            sx={{
              borderRadius: 10,
              textTransform: 'none',
              py: 1.2,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            Google로 계속하기
          </Button>

          {/* Switch Auth Mode */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              아직 회원이 아니신가요?{' '}
              <Link href="/auth/signup">
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                >
                  회원가입
                </Typography>
              </Link>
            </Typography>
          </Box>

          {/* Footer Links */}
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            <Link href="/about">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>
                연구회 소개
              </Typography>
            </Link>
            <Typography variant="caption" color="text.secondary">
              •
            </Typography>
            <Link href="/terms">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>
                이용약관
              </Typography>
            </Link>
            <Typography variant="caption" color="text.secondary">
              •
            </Typography>
            <Link href="/privacy">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>
                개인정보처리방침
              </Typography>
            </Link>
          </Stack>
        </Paper>

        {/* Back to Home */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link href="/main">
            <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
              ← 홈으로 돌아가기
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    }>
      <LoginContent />
    </Suspense>
  )
}
