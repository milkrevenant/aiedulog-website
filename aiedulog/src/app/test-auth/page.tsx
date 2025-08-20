'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, TextField, Typography, Alert } from '@mui/material'

export default function TestAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)

  const handleTest = async () => {
    try {
      console.log('Environment variables:')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      
      const supabase = createClient()
      console.log('Supabase client created:', supabase)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('Auth result:', { data, error })
      setResult(data)
      setError(error)
    } catch (err) {
      console.error('Caught error:', err)
      setError(err)
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">Auth Test Page</Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography>ENV URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</Typography>
        <Typography>ENV KEY: {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}</Typography>
      </Box>
      
      <Box sx={{ mt: 4 }}>
        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleTest}>
          Test Login
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {JSON.stringify(error, null, 2)}
        </Alert>
      )}
      
      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Success! User: {result.user?.email}
        </Alert>
      )}
    </Box>
  )
}