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
  useTheme,
  alpha,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  School,
  Person,
  Work,
  ArrowBack,
  ArrowForward,
  Check,
} from '@mui/icons-material'

const steps = ['기본 정보', '추가 정보', '이메일 인증']

interface SignUpData {
  email: string
  password: string
  confirmPassword: string
  name: string
  school: string
  role: 'teacher' | 'student' | 'researcher' | 'other'
  interests: string[]
}

export default function SignUpPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle'
  )
  const [emailCheckTimer, setEmailCheckTimer] = useState<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    school: '',
    role: 'teacher',
    interests: [],
  })

  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  const interestOptions = [
    'AI 교육',
    '에듀테크',
    '수업 혁신',
    '평가 방법',
    '학생 상담',
    '진로 지도',
    '교육 정책',
    '교육 연구',
  ]

  const handleNext = async () => {
    setError(null)

    // 각 단계별 유효성 검사
    if (activeStep === 0) {
      // 기본 정보 검증
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('모든 필드를 입력해주세요.')
        return
      }
      if (emailStatus === 'taken') {
        setError('이미 가입된 이메일입니다.')
        return
      }
      if (formData.password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        return
      }
    } else if (activeStep === 1) {
      // 추가 정보 검증
      if (!formData.name || !formData.school) {
        setError('모든 필드를 입력해주세요.')
        return
      }
      if (formData.interests.length === 0) {
        setError('관심 분야를 하나 이상 선택해주세요.')
        return
      }
    }

    if (activeStep === steps.length - 1) {
      // 회원가입 실행
      await handleSignUp()
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)

    try {
      // Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: {
            name: formData.name,
            school: formData.school,
          },
        },
      })

      if (authError) throw authError

      // 이미 존재하는 이메일 체크 (identities가 비어있으면 기존 사용자)
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        throw new Error('이미 가입된 이메일입니다.')
      }

      if (authData.user) {
        // 2. 프로필 정보 저장
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            school: formData.school,
            role: formData.role === 'teacher' ? 'user' : 'user', // 기본 역할은 user
            interests: formData.interests,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error('프로필 업데이트 실패:', profileError)
        }
      }

      // 3. 성공 페이지로 이동
      router.push('/auth/signup-success')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  // 이메일 중복 체크 함수
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle')
      return
    }

    setEmailStatus('checking')

    try {
      // 임시로 signUp 시도하여 중복 체크
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'temporary-check-password-123456', // 임시 비밀번호
      })

      if (error) {
        setEmailStatus('idle')
        return
      }

      // identities가 비어있으면 이미 존재하는 이메일
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setEmailStatus('taken')
      } else {
        setEmailStatus('available')
        // 임시 가입 취소 (실제로는 이메일 인증을 하지 않으면 계정이 활성화되지 않음)
      }
    } catch (err) {
      setEmailStatus('idle')
    }
  }

  // 이메일 입력 핸들러
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })

    // 이전 타이머 취소
    if (emailCheckTimer) {
      clearTimeout(emailCheckTimer)
    }

    // 500ms 후에 중복 체크 (디바운싱)
    const timer = setTimeout(() => {
      checkEmailAvailability(email)
    }, 500)

    setEmailCheckTimer(timer)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        py: 4,
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
              회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              AIedulog 커뮤니티에 오신 것을 환영합니다
            </Typography>
          </Stack>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Form Content */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                required
                variant="outlined"
                error={emailStatus === 'taken'}
                helperText={
                  emailStatus === 'checking'
                    ? '이메일 확인 중...'
                    : emailStatus === 'taken'
                      ? '이미 가입된 이메일입니다.'
                      : emailStatus === 'available'
                        ? '사용 가능한 이메일입니다.'
                        : ''
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: emailStatus !== 'idle' && (
                    <InputAdornment position="end">
                      {emailStatus === 'checking' && <CircularProgress size={20} />}
                      {emailStatus === 'available' && <Check sx={{ color: 'success.main' }} />}
                      {emailStatus === 'taken' && <Typography color="error">✕</Typography>}
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
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                variant="outlined"
                helperText="최소 6자 이상"
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

              <TextField
                fullWidth
                label="비밀번호 확인"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: 'text.secondary' }} />
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
                label="학교 / 소속"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <School sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <FormControl fullWidth required>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  label="역할"
                  startAdornment={
                    <InputAdornment position="start">
                      <Work sx={{ color: 'text.secondary', ml: 1.5 }} />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="teacher">교사</MenuItem>
                  <MenuItem value="student">학생</MenuItem>
                  <MenuItem value="researcher">연구원</MenuItem>
                  <MenuItem value="other">기타</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  관심 분야 (1개 이상 선택)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {interestOptions.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      onClick={() => handleInterestToggle(interest)}
                      color={formData.interests.includes(interest) ? 'primary' : 'default'}
                      variant={formData.interests.includes(interest) ? 'filled' : 'outlined'}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={3} alignItems="center">
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
              <Typography variant="h6" textAlign="center">
                이메일 인증을 진행해주세요
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {formData.email}로 인증 메일을 발송했습니다.
                <br />
                이메일을 확인하고 인증 링크를 클릭해주세요.
              </Typography>
              <Alert severity="info" sx={{ width: '100%' }}>
                메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
              </Alert>
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            {activeStep > 0 && activeStep < 2 && (
              <Button
                onClick={handleBack}
                startIcon={<ArrowBack />}
                sx={{ flex: 1, borderRadius: 10 }}
              >
                이전
              </Button>
            )}
            {activeStep < 2 && (
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={activeStep === steps.length - 1 ? <Check /> : <ArrowForward />}
                disabled={loading}
                sx={{ flex: 1, borderRadius: 10 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : activeStep === steps.length - 1 ? (
                  '가입 완료'
                ) : (
                  '다음'
                )}
              </Button>
            )}
            {activeStep === 2 && (
              <Button
                fullWidth
                variant="contained"
                onClick={() => router.push('/auth/login')}
                sx={{ borderRadius: 10 }}
              >
                로그인 페이지로 이동
              </Button>
            )}
          </Stack>

          {/* Switch to Login */}
          {activeStep === 0 && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                이미 계정이 있으신가요?{' '}
                <Link href="/auth/login">
                  <Typography
                    component="span"
                    variant="body2"
                    color="primary"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  >
                    로그인
                  </Typography>
                </Link>
              </Typography>
            </Box>
          )}

          {/* Footer Links */}
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
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
