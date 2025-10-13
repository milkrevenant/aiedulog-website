'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
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
  const [passwordScore, setPasswordScore] = useState<number>(0)

  const router = useRouter()
  const searchParams = useSearchParams()
  const theme = useTheme()

  // Determine mode from URL (?mode=update)
  const modeParam = searchParams.get('mode')
  if (modeParam === 'update' && mode !== 'update') {
    setMode('update')
  }

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // Delegate to Cognito Hosted UI (includes "Forgot password" link)
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (err: any) {
      setError('요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // Password change is handled in Cognito flows
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (err: any) {
      setError('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
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
                ? '가입하신 이메일을 입력하시면 Cognito 화면에서 재설정을 진행합니다.'
                : 'Cognito에서 비밀번호 변경 과정을 완료해주세요.'}
            </Typography>
          </Box>

          {mode === 'request' ? (
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
                  sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '재설정 진행'
                  )}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handlePasswordUpdate} sx={{ width: '100%' }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="새 비밀번호"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordScore(Math.min(4, Math.floor((e.target.value.length || 0) / 3)))
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
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText={password ? '안전한 비밀번호를 사용하세요.' : '최소 8자 이상 입력해주세요'}
                />

                {password && (
                  <Box sx={{ width: '100%', mt: -2, mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(passwordScore / 4) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
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
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
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
                  sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '비밀번호 변경 진행'}
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