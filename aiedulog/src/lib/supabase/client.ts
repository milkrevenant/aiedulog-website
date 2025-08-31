import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Secure logging: Only log errors in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Missing Supabase environment variables:', {
        url: !!supabaseUrl,
        key: !!supabaseKey
      })
    }
    throw new Error('Missing required Supabase configuration')
  }

  // 새로운 API 키 형식을 위한 옵션
  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    {
      global: {
        headers: {
          'apikey': supabaseKey!
        }
      }
    }
  )
}
