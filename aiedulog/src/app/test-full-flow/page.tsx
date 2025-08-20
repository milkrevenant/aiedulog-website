'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, TextField, Typography, Alert, Stack, Paper } from '@mui/material'

export default function TestFullFlowPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'signup' | 'login'>('signup')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const supabase = createClient()

  const handleSignup = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      })
      
      if (error) {
        setError(error)
      } else {
        setResult({ message: '회원가입 성공! 이메일을 확인해주세요.', data })
        // 이메일 저장
        localStorage.setItem('testEmail', email)
        localStorage.setItem('testPassword', password)
      }
    } catch (err) {
      setError(err)
    }
  }

  const handleLogin = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        setError(error)
      } else {
        setResult({ message: '로그인 성공!', data })
      }
    } catch (err) {
      setError(err)
    }
  }

  const handleCheckUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      setError(error)
    } else {
      setResult({ message: '현재 사용자', data: user })
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error)
    } else {
      setResult({ message: '로그아웃 완료' })
    }
  }

  const handleResendEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    if (error) {
      setError(error)
    } else {
      setResult({ message: '이메일 재발송 완료' })
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>전체 인증 플로우 테스트</Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="최소 6자 이상"
          />
          
          <Stack direction="row" spacing={2}>
            <Button 
              variant={step === 'signup' ? 'contained' : 'outlined'}
              onClick={() => setStep('signup')}
            >
              회원가입 모드
            </Button>
            <Button 
              variant={step === 'login' ? 'contained' : 'outlined'}
              onClick={() => setStep('login')}
            >
              로그인 모드
            </Button>
          </Stack>

          {step === 'signup' ? (
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSignup} fullWidth>
                1. 회원가입
              </Button>
              <Button variant="outlined" onClick={handleResendEmail} fullWidth>
                이메일 재발송
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" onClick={handleLogin} fullWidth>
              2. 로그인
            </Button>
          )}

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleCheckUser} fullWidth>
              현재 사용자 확인
            </Button>
            <Button variant="outlined" onClick={handleLogout} fullWidth>
              로그아웃
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Error:</Typography>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </Alert>
        )}
        
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">{result.message}</Typography>
            {result.data && (
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
        <Typography variant="subtitle2" gutterBottom>테스트 순서:</Typography>
        <ol style={{ fontSize: '14px' }}>
          <li>새 이메일로 회원가입</li>
          <li>이메일 확인 (링크 클릭)</li>
          <li>로그인 시도</li>
          <li>현재 사용자 확인</li>
        </ol>
      </Paper>
    </Box>
  )
}