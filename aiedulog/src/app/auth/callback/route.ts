import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  const supabase = await createClient()

  // Handle email confirmation with token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'recovery' | 'invite' | 'email'
    })
    
    if (error) {
      console.error('Error verifying OTP:', error)
      // Check for specific error types
      if (error.message.includes('expired')) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Email link expired. Please request a new one.`)
      }
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }
    
    // Successful email verification
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // Handle OAuth callback with code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Unable to confirm email`)
    }
    
    // Successful authentication
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  // No code or token_hash present, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
