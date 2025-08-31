'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
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
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError)
            router.push('/auth/login?error=Login failed')
            return
          }

          // Check if this is a new user using integrated identity system
          if (data?.user) {
            const existingIdentity = await getUserIdentity(data.user, supabase)
            
            if (!existingIdentity) {
              console.log('Creating new user identity and profile for OAuth login')
              
              try {
                // Step 1: Create identity record
                const { data: identityData, error: identityError } = await supabase
                  .from('identities')
                  .insert({
                    id: data.user.id,
                    status: 'active'
                  })
                  .select()
                  .single()

                if (identityError) {
                  console.error('Failed to create identity:', identityError)
                } else {
                  // Step 2: Create user profile linked to identity
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert({
                      identity_id: data.user.id,
                      email: data.user.email || '',
                      username: data.user.email?.split('@')[0] || 'user',
                      nickname: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
                      full_name: data.user.user_metadata?.full_name,
                      avatar_url: data.user.user_metadata?.avatar_url,
                      role: 'member',
                      is_active: true
                    })

                  if (profileError) {
                    console.error('Error creating user profile via identity system:', profileError)
                    // Try to clean up identity if profile creation failed
                    await supabase.from('identities').delete().eq('id', data.user.id)
                  } else {
                    // Step 3: Create auth_methods record
                    const { error: authMethodError } = await supabase
                      .from('auth_methods')
                      .insert({
                        identity_id: data.user.id,
                        provider: 'oauth',
                        provider_user_id: data.user.id,
                        email_confirmed_at: new Date().toISOString(),
                        last_sign_in_at: new Date().toISOString()
                      })

                    if (authMethodError) {
                      console.warn('Failed to create auth_methods record:', authMethodError)
                      // Continue anyway as the main profile is created
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to create complete identity system records:', err)
                // Continue to login even if identity creation partially failed
              }
            }
          }

          router.push('/feed')
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