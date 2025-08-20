import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  // Query parameters
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  // Hash fragment parameters (Supabase sometimes uses these)
  const hashParams = new URLSearchParams(requestUrl.hash.slice(1))
  const hashTokenHash = hashParams.get('token_hash')
  const hashType = hashParams.get('type')
  const errorCode = hashParams.get('error_code')
  const errorDescription = hashParams.get('error_description')
  
  // Use hash parameters if query parameters are not present
  const finalTokenHash = token_hash || hashTokenHash
  const finalType = type || hashType
  
  const supabase = await createClient()

  // Check for errors first
  if (errorCode || errorDescription) {
    console.error('Auth error:', errorCode, errorDescription)
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorDescription || errorCode || 'Authentication failed')}`)
  }
  
  // Handle email confirmation with token_hash
  if (finalTokenHash && finalType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: finalTokenHash,
      type: finalType as 'signup' | 'recovery' | 'invite' | 'email'
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
