'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Link,
  Divider,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material'
import { Lock, Smartphone, Fingerprint, Key, ArrowBack, CheckCircle } from '@mui/icons-material'

interface MFAVerificationProps {
  factorId: string
  onSuccess: () => void
  onCancel?: () => void
  showBackupOption?: boolean
}

export default function MFAVerification({
  factorId,
  onSuccess,
  onCancel,
  showBackupOption = true,
}: MFAVerificationProps) {
  const [code, setCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)

  const supabase = createClient()
  const theme = useTheme()

  // Initialize challenge when component mounts
  useState(() => {
    initializeChallenge()
  })

  const initializeChallenge = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (error) throw error
      setChallengeId(data.id)
    } catch (error: any) {
      setError('인증 초기화 실패: ' + error.message)
    }
  }

  const handleVerify = async () => {
    if (!code || code.length !== 6 || !challengeId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      setError('인증 코드가 올바르지 않습니다. 다시 시도해주세요.')
      setCode('')
      // Re-initialize challenge for retry
      initializeChallenge()
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)

    // Auto-submit when 6 digits are entered
    if (value.length === 6 && challengeId) {
      handleVerify()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && challengeId) {
      handleVerify()
    }
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
            {useBackupCode ? (
              <Key sx={{ fontSize: 32, color: 'primary.main' }} />
            ) : (
              <Smartphone sx={{ fontSize: 32, color: 'primary.main' }} />
            )}
          </Box>

          <Typography variant="h5" gutterBottom fontWeight={600}>
            2단계 인증
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {useBackupCode
              ? '백업 코드 중 하나를 입력하세요'
              : '인증 앱에 표시된 6자리 코드를 입력하세요'}
          </Typography>
        </Box>

        {/* Code Input */}
        <TextField
          fullWidth
          value={code}
          onChange={handleCodeChange}
          onKeyPress={handleKeyPress}
          placeholder={useBackupCode ? '백업 코드' : '000000'}
          label={useBackupCode ? '백업 코드' : '인증 코드'}
          variant="outlined"
          disabled={loading}
          inputProps={{
            maxLength: useBackupCode ? 20 : 6,
            style: useBackupCode
              ? {}
              : {
                  fontSize: '1.5rem',
                  letterSpacing: '0.5em',
                  textAlign: 'center',
                  fontWeight: 600,
                },
          }}
          sx={{
            '& input': {
              py: 2,
            },
          }}
        />

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
            onClick={handleVerify}
            disabled={loading || (useBackupCode ? !code : code.length !== 6) || !challengeId}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {loading ? '확인 중...' : '확인'}
          </Button>

          {showBackupOption && (
            <>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  또는
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setCode('')
                  setError(null)
                }}
                startIcon={useBackupCode ? <Smartphone /> : <Key />}
              >
                {useBackupCode ? '인증 앱 사용' : '백업 코드 사용'}
              </Button>
            </>
          )}

          {onCancel && (
            <Button fullWidth variant="outlined" onClick={onCancel} startIcon={<ArrowBack />}>
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
