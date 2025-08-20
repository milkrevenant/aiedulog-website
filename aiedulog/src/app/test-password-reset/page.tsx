'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, TextField, Typography, Alert, Stack, Paper } from '@mui/material'

export default function TestPasswordResetPage() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState<'request' | 'update'>('request')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const supabase = createClient()

  const handleRequestReset = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      
      if (error) {
        setError(error)
      } else {
        setResult({ message: '비밀번호 재설정 이메일을 보냈습니다. 이메일을 확인해주세요.' })
        setStep('update')
      }
    } catch (err) {
      setError(err)
    }
  }

  const handleUpdatePassword = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        setError(error)
      } else {
        setResult({ message: '비밀번호가 변경되었습니다! 새 비밀번호로 로그인해보세요.', data })
      }
    } catch (err) {
      setError(err)
    }
  }

  const handleTestLogin = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword
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

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>비밀번호 재설정 테스트</Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={3}>
          {step === 'request' ? (
            <>
              <Typography variant="body1">
                비밀번호를 재설정하여 로그인 문제를 해결합니다.
              </Typography>
              
              <TextField
                fullWidth
                label="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              
              <Button 
                variant="contained" 
                onClick={handleRequestReset}
                disabled={!email}
                fullWidth
              >
                비밀번호 재설정 이메일 보내기
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body1">
                이메일의 재설정 링크를 클릭한 후, 여기서 새 비밀번호를 설정하세요.
              </Typography>
              
              <TextField
                fullWidth
                label="새 비밀번호"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="최소 6자 이상"
              />
              
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="contained" 
                  onClick={handleUpdatePassword}
                  disabled={!newPassword}
                  fullWidth
                >
                  비밀번호 변경
                </Button>
                
                <Button 
                  variant="outlined" 
                  onClick={handleTestLogin}
                  disabled={!newPassword || !email}
                  fullWidth
                >
                  새 비밀번호로 로그인
                </Button>
              </Stack>
              
              <Button 
                variant="text" 
                onClick={() => setStep('request')}
                size="small"
              >
                ← 다시 시작
              </Button>
            </>
          )}
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
          <Alert severity={result.message.includes('성공') ? 'success' : 'info'} sx={{ mt: 2 }}>
            <Typography>{result.message}</Typography>
            {result.data && (
              <pre style={{ fontSize: '12px', overflow: 'auto', marginTop: '8px' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          해결 방법:
        </Typography>
        <ol style={{ fontSize: '14px', margin: '8px 0' }}>
          <li>비밀번호 재설정 이메일 요청</li>
          <li>이메일에서 재설정 링크 클릭</li>
          <li>새 비밀번호 설정</li>
          <li>새 비밀번호로 로그인</li>
        </ol>
      </Paper>
    </Box>
  )
}