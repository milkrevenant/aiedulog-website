'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function EmailConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const confirmEmail = async () => {
      // Get hash parameters
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const token_hash = hashParams.get('token_hash')
      const type = hashParams.get('type')
      const error = hashParams.get('error')
      const errorCode = hashParams.get('error_code')
      const errorDescription = hashParams.get('error_description')

      // Check for errors
      if (error || errorCode) {
        console.error('Email confirmation error:', errorCode, errorDescription)
        router.push(`/auth/login?error=${encodeURIComponent(errorDescription || 'Email confirmation failed')}`)
        return
      }

      // Verify the token
      if (token_hash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'signup' | 'recovery' | 'invite' | 'email'
        })

        if (verifyError) {
          console.error('Verification error:', verifyError)
          router.push(`/auth/login?error=${encodeURIComponent(verifyError.message)}`)
        } else {
          // Success! Redirect to dashboard
          router.push('/dashboard')
        }
      } else {
        // No token, redirect to login
        router.push('/auth/login')
      }
    }

    confirmEmail()
  }, [router, supabase])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>이메일 확인 중...</Typography>
    </Box>
  )
}