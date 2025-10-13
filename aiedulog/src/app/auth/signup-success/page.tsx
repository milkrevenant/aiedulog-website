'use client'

import { Box, Button, Container, Paper, Stack, Typography, Alert } from '@mui/material'
import { LoginOutlined } from '@mui/icons-material'
import { signIn } from 'next-auth/react'

export default function SignupSuccessPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">회원가입 완료</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            이메일 인증이 필요합니다. 아래 버튼을 눌러 로그인/인증을 완료하세요.
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            가입/인증 절차는 Cognito 관리형 로그인 화면에서 진행됩니다.
          </Alert>
          <Stack spacing={2}>
            <Button variant="contained" size="large" startIcon={<LoginOutlined />} onClick={() => signIn('cognito', { callbackUrl: '/feed' })}>
              로그인/인증 진행
            </Button>
            <Button variant="text" size="large" onClick={() => location.assign('/auth/login')}>
              로그인 페이지로 이동
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  )
}
