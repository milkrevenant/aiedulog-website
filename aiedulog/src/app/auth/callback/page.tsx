'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        // Check both hash and query params
        const access_token = hashParams.get('access_token') || queryParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token')
        const token_type = hashParams.get('token_type') || queryParams.get('token_type')
        const type = hashParams.get('type') || queryParams.get('type')
        const error = hashParams.get('error') || queryParams.get('error')
        const error_description = hashParams.get('error_description') || queryParams.get('error_description')
        
        // Handle errors
        if (error) {
          console.error('Auth callback error:', error, error_description)
          router.push(`/auth/login?error=${encodeURIComponent(error_description || error || 'Authentication failed')}`)
          return
        }

        // Handle password recovery
        if (type === 'recovery' && access_token) {
          // Set the session with the recovery token
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          })

          if (sessionError) {
            console.error('Error setting recovery session:', sessionError)
            router.push(`/auth/login?error=${encodeURIComponent('Recovery link expired or invalid')}`)
            return
          }

          // Redirect to password reset page in update mode
          router.push('/auth/reset-password?mode=update')
          return
        }

        // Handle email confirmation
        if (type === 'signup' && access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          })

          if (sessionError) {
            console.error('Error setting session:', sessionError)
            router.push('/auth/login?error=Email verification failed')
            return
          }

          router.push('/dashboard')
          return
        }

        // Handle OAuth callback
        const code = queryParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError)
            router.push('/auth/login?error=Login failed')
            return
          }

          router.push('/dashboard')
          return
        }

        // No valid callback parameters found
        console.error('Invalid callback parameters')
        router.push('/auth/login')
        
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth/login?error=An error occurred')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        인증 처리 중...
      </Typography>
    </Box>
  )
}