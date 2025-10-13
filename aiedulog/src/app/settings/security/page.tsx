'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  Collapse,
  useTheme,
  alpha,
  Snackbar,
  Badge,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { Shield, CheckCircle, Warning, ArrowBack, ExpandMore, ExpandLess, Lock } from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const router = useRouter()
  const theme = useTheme()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    setLoading(false)
  }, [status, router])

  const openCognitoSecurity = async () => {
    try {
      await signIn('cognito', { callbackUrl: '/settings/security' })
    } catch (e: any) {
      setError('Cognito 보안 설정으로 이동 중 오류가 발생했습니다.')
    }
  }

  // MFA 상태는 Cognito가 관리하므로 앱에서는 알 수 없음 (중립 상태 표시)
  const hasMFA = false

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
              계정 보안을 강화하고 개인정보를 보호하세요. MFA 및 보안 설정은 Cognito에서 관리됩니다.
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
                  icon={hasMFA ? <CheckCircle /> : <Warning />}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* 2-Factor Authentication Section (Cognito-managed) */}
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
                비밀번호 외에 추가 인증 단계를 설정하여 계정을 더욱 안전하게 보호합니다. 현재 이 기능은 AWS Cognito에서 관리되며, 아래 버튼을 통해 Hosted UI에서 설정/변경할 수 있습니다.
              </Typography>

              <Collapse in={expandedSection === 'mfa'}>
                <Divider sx={{ my: 2 }} />
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Cognito에서 2FA 관리
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      2단계 인증(앱/문자/이메일 등)은 AWS Cognito Hosted UI에서 설정 및 변경할 수 있습니다. 아래 버튼을 눌러 보안 설정으로 이동하세요.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button fullWidth variant="outlined" onClick={openCognitoSecurity}>
                      Cognito 보안 설정 열기
                    </Button>
                  </CardActions>
                </Card>
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

        {/* Removed inline MFA setup dialogs; managed via Cognito Hosted UI */}

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          message={success}
        />
      </Container>
    </>
  );
}
