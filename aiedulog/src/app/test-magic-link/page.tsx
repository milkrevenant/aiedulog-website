'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material'

export default function TestMagicLinkPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const supabase = createClient()

  const handleMagicLink = async () => {
    setError(null)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        setError(error)
      } else {
        setResult({ 
          message: 'Magic Link를 이메일로 보냈습니다! 이메일을 확인하고 링크를 클릭하세요.',
          data 
        })
      }
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Magic Link 로그인</Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        비밀번호 없이 이메일 링크로 로그인합니다
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <TextField
          fullWidth
          label="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          sx={{ mb: 2 }}
        />
        
        <Button 
          variant="contained" 
          onClick={handleMagicLink}
          disabled={!email}
          fullWidth
        >
          Magic Link 보내기
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {JSON.stringify(error, null, 2)}
          </Alert>
        )}
        
        {result && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {result.message}
          </Alert>
        )}
      </Paper>
    </Box>
  )
}