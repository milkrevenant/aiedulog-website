import { createBrowserClient } from '@supabase/ssr'

// Graceful shim when Supabase is not configured (migration period)
function createShimClient(): any {
  const noop = async (..._args: any[]) => ({ data: null, error: null } as any)
  const subscription = { unsubscribe() {} }
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription } }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase auth disabled' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase auth disabled' } }),
      signOut: async () => ({ error: null }),
      verifyOtp: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: null, error: { message: 'Supabase auth disabled' } }),
      resend: async () => ({ error: null }),
      mfa: { listFactors: async () => ({ data: { totp: [] }, error: null }) },
    },
    from: (_table: string) => ({
      upsert: noop,
      update: noop,
      select: (_q?: any) => ({ single: async () => ({ data: null, error: null }) }),
      eq: (_c: any, _v: any) => ({ select: (_q?: any) => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Supabase] Not configured. Falling back to no-op client.')
    }
    return createShimClient()
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      global: { headers: { apikey: supabaseKey } }
    }
  )
}
