'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
  Visibility,
  VisibilityOff,
  Google,
  Apple,
  Email,
  Lock,
  School,
} from '@mui/icons-material'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // const [isSignUp, setIsSignUp] = useState(false) // 회원가입은 별도 페이지로 이동
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 로그인
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // 사용자 권한 확인
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()
      
      // 모든 사용자는 피드로 리다이렉트
      router.push('/feed')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('Google 로그인은 준비 중입니다.')
  }

  const handleAppleLogin = async () => {
    setError('Apple 로그인은 준비 중입니다.')
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
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
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
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">로그인 상태 유지</Typography>}
                />
                <Link href="/auth/forgot-password">
                  <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                    비밀번호 찾기
                  </Typography>
                </Link>
              </Stack>

              {error && (
                <Alert 
                  severity="error"
                  sx={{ borderRadius: 2 }}
                >
                  {error}
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
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  '로그인'
                )}
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

          <Stack spacing={2}>
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
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleAppleLogin}
              startIcon={<Apple />}
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
              Apple로 계속하기
            </Button>
          </Stack>

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
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 3 }}
          >
            <Link href="/about">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>
                연구회 소개
              </Typography>
            </Link>
            <Typography variant="caption" color="text.secondary">•</Typography>
            <Link href="/terms">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }}>
                이용약관
              </Typography>
            </Link>
            <Typography variant="caption" color="text.secondary">•</Typography>
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