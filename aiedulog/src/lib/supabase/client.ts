import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:', {
      url: supabaseUrl,
      key: supabaseKey?.substring(0, 20) + '...' // 일부만 로그
    })
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
