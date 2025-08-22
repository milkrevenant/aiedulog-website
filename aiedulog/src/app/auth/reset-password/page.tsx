'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { translateAuthError } from '@/lib/utils/errorTranslator'
import { 
  checkPasswordStrength, 
  isValidEmail, 
  RateLimiter, 
  formatRateLimitTime 
} from '@/lib/auth/password-reset-utils'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  useTheme,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material'
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  ArrowBack,
  Info,
} from '@mui/icons-material'

function ResetPasswordContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof checkPasswordStrength> | null>(null)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const theme = useTheme()
  
  // Initialize rate limiter (persists across component re-renders)
  const [rateLimiter] = useState(() => new RateLimiter(3, 60000))

  useEffect(() => {
    const checkMode = async () => {
      // Check URL params for mode
      const modeParam = searchParams.get('mode')
      
      if (modeParam === 'update') {
        // We're in update mode, check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setMode('update')
          setIsValidSession(true)
        } else {
          // No valid session for password update
          setError('세션이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.')
          setMode('request')
        }
      }
      
      setCheckingSession(false)
    }
    
    checkMode()
  }, [searchParams, supabase])

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validate email format
    if (!isValidEmail(email)) {
      setError('올바른 이메일 주소를 입력해주세요.')
      setLoading(false)
      return
    }

    // Rate limiting check
    if (!rateLimiter.isAllowed(email)) {
      const remainingTime = rateLimiter.getRemainingTime(email)
      setRateLimitRemaining(remainingTime)
      setError(formatRateLimitTime(remainingTime))
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) throw error

      setSuccess('비밀번호 재설정 링크를 이메일로 전송했습니다. 이메일을 확인해주세요.')
      setEmail('')
    } catch (error: any) {
      setError(translateAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validate passwords
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      // Check session before updating
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('세션이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.')
        setMode('request')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess('비밀번호가 성공적으로 변경되었습니다.')
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut()
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login?message=password_reset_success')
      }, 2000)
    } catch (error: any) {
      setError(translateAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession && mode === 'update') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {/* Header */}
          <Box sx={{ width: '100%', mb: 3 }}>
            <Link href="/auth/login" style={{ textDecoration: 'none' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <ArrowBack sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  로그인으로 돌아가기
                </Typography>
              </Stack>
            </Link>
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {mode === 'request' ? '비밀번호 찾기' : '새 비밀번호 설정'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {mode === 'request' 
                ? '가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.'
                : '새로운 비밀번호를 입력해주세요.'}
            </Typography>
          </Box>

          {mode === 'request' ? (
            // Password Reset Request Form
            <Box component="form" onSubmit={handlePasswordResetRequest} sx={{ width: '100%' }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircleOutline />}
                    sx={{ borderRadius: 2 }}
                  >
                    {success}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !email}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '재설정 링크 받기'
                  )}
                </Button>

                <Typography variant="body2" color="text.secondary" align="center">
                  이메일이 오지 않나요?{' '}
                  <Link 
                    href="/auth/signup" 
                    style={{ 
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    새로 가입하기
                  </Link>
                </Typography>
              </Stack>
            </Box>
          ) : (
            // Password Update Form
            <Box component="form" onSubmit={handlePasswordUpdate} sx={{ width: '100%' }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="새 비밀번호"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (e.target.value) {
                      setPasswordStrength(checkPasswordStrength(e.target.value))
                    } else {
                      setPasswordStrength(null)
                    }
                  }}
                  required
                  autoComplete="new-password"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'action.active' }} />
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
                  helperText={passwordStrength ? passwordStrength.feedback : "최소 6자 이상 입력해주세요"}
                />

                {passwordStrength && password && (
                  <Box sx={{ width: '100%', mt: -2, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(passwordStrength.score / 4) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: 
                            passwordStrength.score <= 1 ? 'error.main' :
                            passwordStrength.score === 2 ? 'warning.main' :
                            passwordStrength.score === 3 ? 'info.main' :
                            'success.main'
                        }
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 
                          passwordStrength.score <= 1 ? 'error.main' :
                          passwordStrength.score === 2 ? 'warning.main' :
                          passwordStrength.score === 3 ? 'info.main' :
                          'success.main',
                        mt: 0.5,
                        display: 'block'
                      }}
                    >
                      비밀번호 강도: {
                        passwordStrength.score <= 1 ? '약함' :
                        passwordStrength.score === 2 ? '보통' :
                        passwordStrength.score === 3 ? '강함' :
                        '매우 강함'
                      }
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="새 비밀번호 확인"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  error={confirmPassword !== '' && password !== confirmPassword}
                  helperText={
                    confirmPassword !== '' && password !== confirmPassword
                      ? '비밀번호가 일치하지 않습니다'
                      : ''
                  }
                />

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircleOutline />}
                    sx={{ borderRadius: 2 }}
                  >
                    {success}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '비밀번호 변경'
                  )}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}