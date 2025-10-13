'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Link,
  Divider,
  useTheme,
  alpha,
} from '@mui/material'
import { Smartphone, Key, ArrowBack, CheckCircle } from '@mui/icons-material'

interface MFAVerificationProps {
  // factorId kept for backward compatibility; unused in Cognito Hosted UI flow
  factorId?: string
  onSuccess: () => void
  onCancel?: () => void
  showBackupOption?: boolean
}

export default function MFAVerification({
  onSuccess,
  onCancel,
  showBackupOption = false,
}: MFAVerificationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme()
  const { status } = useSession()

  // If user has completed Cognito MFA and returned with a valid session, proceed
  useEffect(() => {
    if (status === 'authenticated') {
      onSuccess()
    }
  }, [status, onSuccess])

  const handleRetrySignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signIn('cognito', { callbackUrl: '/feed' })
    } catch (e: any) {
      setError('로그인 재시도 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  const handleContinue = () => {
    onSuccess()
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
            }}
          >
            <Smartphone sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>

          <Typography variant="h5" gutterBottom fontWeight={600}>
            2단계 인증
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Cognito MFA 인증이 필요합니다. 새 창 또는 리디렉션된 화면에서 인증을 완료한 뒤 아래 버튼을 사용해 계속 진행하거나, 문제가 있으면 다시 시도하세요.
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Actions */}
        <Stack spacing={2}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleContinue}
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            계속
          </Button>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              또는
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleRetrySignIn}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Key />}
          >
            {loading ? '다시 시도 중...' : '다시 로그인'}
          </Button>

          {onCancel && (
            <Button fullWidth variant="text" onClick={onCancel} startIcon={<ArrowBack />}>
              취소
            </Button>
          )}
        </Stack>

        {/* Help Text */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            문제가 있으신가요?{' '}
            <Link href="/help/mfa" underline="hover">
              도움말 보기
            </Link>
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
