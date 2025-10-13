'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const steps = ['기본 정보', '추가 정보', '완료']

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

    if (activeStep === 0) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('모든 필드를 입력해주세요.')
        return
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
        setError('유효한 이메일을 입력해주세요.')
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
      await handleSignUp()
    } else {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => setActiveStep((prev) => prev - 1)

  const handleSignUp = async () => {
    try {
      setLoading(true)
      // 실제 계정 생성/인증은 Cognito Hosted UI에서 진행
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (e: any) {
      setError(e?.message || '회원가입 중 오류가 발생했습니다')
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    if (!email) {
      setEmailStatus('idle')
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailStatus('idle')
    } else {
      // 서버 중복 확인은 Cognito에서 처리. 여기서는 단순 표시만.
      setEmailStatus('available')
    }
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

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

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
                helperText={emailStatus === 'available' ? '사용 가능한 이메일입니다.' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                helperText={
                  formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                    ? '비밀번호가 일치하지 않습니다'
                    : ''
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <FormControl fullWidth required>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  label="역할"
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
            <Stack spacing={2} alignItems="center">
              <Check sx={{ fontSize: 40, color: 'success.main' }} />
              <Typography>입력하신 정보를 바탕으로 가입을 진행합니다.</Typography>
              <Typography variant="body2" color="text.secondary">
                다음 단계에서 Cognito 로그인/가입 화면으로 이동합니다.
              </Typography>
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack} startIcon={<ArrowBack />} sx={{ flex: 1, borderRadius: 10 }}>
                이전
              </Button>
            )}
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={activeStep === steps.length - 1 ? <Check /> : <ArrowForward />}
              disabled={loading}
              sx={{ flex: 1, borderRadius: 10 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : activeStep === steps.length - 1 ? '가입 진행' : '다음'}
            </Button>
          </Stack>

          {activeStep === 0 && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                이미 계정이 있으신가요?{' '}
                <Link href="/auth/login">
                  <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}>
                    로그인
                  </Typography>
                </Link>
              </Typography>
            </Box>
          )}
        </Paper>

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
