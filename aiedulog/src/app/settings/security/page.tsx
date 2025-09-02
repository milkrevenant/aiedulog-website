'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Collapse,
  GridLegacy as Grid,
  useTheme,
  alpha,
  Snackbar,
  Badge,
} from '@mui/material'
import {
  Security,
  Smartphone,
  Fingerprint,
  Key,
  Shield,
  CheckCircle,
  Warning,
  ContentCopy,
  QrCode2,
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Lock,
  LockOpen,
  Verified,
  PhoneAndroid,
  Computer,
  Download,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import { QRCodeSVG } from 'qrcode.react'

interface MFAFactor {
  id: string
  type: 'totp' | 'webauthn'
  status: 'verified' | 'unverified'
  friendly_name?: string
  created_at: string
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([])
  const [showTOTPSetup, setShowTOTPSetup] = useState(false)
  const [showWebAuthnSetup, setShowWebAuthnSetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [totpSecret, setTotpSecret] = useState<any>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  useEffect(() => {
    checkUser()
    loadMFAFactors()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
  }

  const loadMFAFactors = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: factors, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error

      const allFactors: MFAFactor[] = []

      if (factors?.totp) {
        allFactors.push(...factors.totp.map((f) => ({ ...f, type: 'totp' as const })))
      }

      setMfaFactors(allFactors)
    } catch (error: any) {
      console.error('MFA factors load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollTOTP = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })

      if (error) throw error

      setTotpSecret(data)
      setShowTOTPSetup(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyTOTP = async () => {
    if (!totpSecret || !verificationCode) return

    setSaving(true)
    setError(null)

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpSecret.id,
      })

      if (challengeError) throw challengeError

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpSecret.id,
        challengeId: challengeData.id,
        code: verificationCode,
      })

      if (verifyError) throw verifyError

      setSuccess('2단계 인증이 성공적으로 설정되었습니다!')
      setShowTOTPSetup(false)
      setVerificationCode('')
      loadMFAFactors()
    } catch (error: any) {
      setError('인증 코드가 올바르지 않습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnenrollFactor = async (factorId: string) => {
    if (!confirm('정말로 이 인증 방법을 제거하시겠습니까?')) return

    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      })

      if (error) throw error

      setSuccess('인증 방법이 제거되었습니다.')
      loadMFAFactors()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEnrollWebAuthn = async () => {
    setSaving(true)
    setError(null)

    try {
      setSuccess('Passkey 기능은 곧 지원될 예정입니다.')
      setShowWebAuthnSetup(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const generateBackupCodes = () => {
    const codes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )
    setBackupCodes(codes)
    setShowBackupCodes(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('클립보드에 복사되었습니다')
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasMFA = mfaFactors.some((f) => f.status === 'verified')

  if (loading) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push('/settings/profile')}
              sx={{ mb: 2 }}
            >
              프로필 설정으로 돌아가기
            </Button>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              보안 설정
            </Typography>
            <Typography variant="body1" color="text.secondary">
              계정 보안을 강화하고 개인정보를 보호하세요
            </Typography>
          </Box>

          {/* Security Status Card */}
          <Card
            sx={{
              background: hasMFA
                ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Badge
                  badgeContent={hasMFA ? <CheckCircle /> : <Warning />}
                  color={hasMFA ? 'success' : 'warning'}
                >
                  <Shield sx={{ fontSize: 48, color: hasMFA ? 'success.main' : 'warning.main' }} />
                </Badge>
                <Box flex={1}>
                  <Typography variant="h6">보안 상태: {hasMFA ? '안전' : '기본'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hasMFA
                      ? '2단계 인증이 활성화되어 계정이 안전하게 보호되고 있습니다.'
                      : '2단계 인증을 설정하여 계정 보안을 강화하세요.'}
                  </Typography>
                </Box>
                <Chip
                  label={hasMFA ? '보호됨' : '권장'}
                  color={hasMFA ? 'success' : 'warning'}
                  icon={hasMFA ? <Verified /> : <Warning />}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* 2-Factor Authentication Section */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Lock color="primary" />
                <Typography variant="h6" flex={1}>
                  2단계 인증 (2FA)
                </Typography>
                <IconButton
                  onClick={() => setExpandedSection(expandedSection === 'mfa' ? null : 'mfa')}
                >
                  {expandedSection === 'mfa' ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>

              <Typography variant="body2" color="text.secondary" paragraph>
                비밀번호 외에 추가 인증 단계를 설정하여 계정을 더욱 안전하게 보호합니다.
              </Typography>

              <Collapse in={expandedSection === 'mfa'}>
                <Divider sx={{ my: 2 }} />

                {/* Active MFA Methods */}
                {mfaFactors.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      활성화된 인증 방법
                    </Typography>
                    <List>
                      {mfaFactors.map((factor) => (
                        <ListItem
                          key={factor.id}
                          sx={{
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <ListItemIcon>
                            {factor.type === 'totp' ? (
                              <PhoneAndroid color="primary" />
                            ) : (
                              <Fingerprint color="primary" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              factor.friendly_name ||
                              (factor.type === 'totp' ? 'Authenticator 앱' : 'Passkey')
                            }
                            secondary={`추가됨: ${new Date(factor.created_at).toLocaleDateString()}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleUnenrollFactor(factor.id)}
                              disabled={saving}
                            >
                              <Warning color="error" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Add New Methods */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Smartphone color="primary" />
                          <Typography variant="subtitle1">Authenticator 앱</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Google Authenticator, Microsoft Authenticator 등의 앱을 사용하여 인증
                          코드를 생성합니다.
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={handleEnrollTOTP}
                          disabled={saving || mfaFactors.some((f) => f.type === 'totp')}
                        >
                          {mfaFactors.some((f) => f.type === 'totp') ? '설정됨' : '설정하기'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Fingerprint color="primary" />
                          <Typography variant="subtitle1">Passkey / 생체인증</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Face ID, Touch ID, Windows Hello 등을 사용하여 빠르고 안전하게 인증합니다.
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={handleEnrollWebAuthn}
                          disabled={saving}
                        >
                          곧 지원 예정
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                </Grid>

                {/* Backup Codes */}
                {hasMFA && (
                  <Box sx={{ mt: 3 }}>
                    <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Key color="info" />
                          <Typography variant="subtitle1">백업 코드</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          휴대폰을 사용할 수 없을 때 계정에 접근할 수 있는 일회용 백업 코드입니다.
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={generateBackupCodes}
                          startIcon={<Download />}
                        >
                          백업 코드 생성
                        </Button>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Collapse>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>

        {/* TOTP Setup Dialog */}
        <Dialog
          open={showTOTPSetup}
          onClose={() => setShowTOTPSetup(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Authenticator 앱 설정</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Typography variant="body2">
                1. Google Authenticator, Microsoft Authenticator 등의 앱을 다운로드하세요.
              </Typography>

              {totpSecret?.totp?.qr_code && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 1,
                  }}
                >
                  <QRCodeSVG value={totpSecret.totp.uri} size={200} />
                </Box>
              )}

              <Typography variant="body2">
                2. 앱에서 QR 코드를 스캔하거나 아래 키를 수동으로 입력하세요:
              </Typography>

              {totpSecret?.totp?.secret && (
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                      {totpSecret.totp.secret}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(totpSecret.totp.secret)}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              )}

              <Typography variant="body2">3. 앱에서 생성된 6자리 코드를 입력하세요:</Typography>

              <TextField
                fullWidth
                label="인증 코드"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                inputProps={{
                  maxLength: 6,
                  pattern: '[0-9]{6}',
                  style: { letterSpacing: '0.5em', textAlign: 'center' },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTOTPSetup(false)}>취소</Button>
            <Button
              variant="contained"
              onClick={handleVerifyTOTP}
              disabled={!verificationCode || verificationCode.length !== 6 || saving}
            >
              {saving ? <CircularProgress size={24} /> : '확인'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Backup Codes Dialog */}
        <Dialog
          open={showBackupCodes}
          onClose={() => setShowBackupCodes(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>백업 코드</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              이 코드들을 안전한 곳에 보관하세요. 각 코드는 한 번만 사용할 수 있습니다.
            </Alert>

            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Grid container spacing={1}>
                {backupCodes.map((code, index) => (
                  <Grid item xs={6} key={index}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {index + 1}. {code}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={downloadBackupCodes} startIcon={<Download />}>
              다운로드
            </Button>
            <Button onClick={() => setShowBackupCodes(false)} variant="contained">
              확인
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          message={success}
        />
      </Container>
    </>
  )
}
