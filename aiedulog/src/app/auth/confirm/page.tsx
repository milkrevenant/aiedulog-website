'use client'

import { Box, Button, CircularProgress, Typography, Paper, Container, Stack } from '@mui/material'
import { signIn } from 'next-auth/react'

export default function EmailConfirmPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h4" fontWeight={700}>이메일 확인</Typography>
            <Typography variant="body2" color="text.secondary">이메일 확인 단계는 Cognito Hosted UI에서 처리됩니다.</Typography>
            <Button variant="contained" onClick={() => signIn('cognito', { callbackUrl: '/feed' })}>로그인으로 이동</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}