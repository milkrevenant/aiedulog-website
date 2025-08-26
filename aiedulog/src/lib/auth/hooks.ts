'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) throw error
        
        if (isMounted) {
          setUser(user)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
          setError(null)
          router.refresh()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setError(null)
          router.refresh()
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user)
          setError(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return { user, loading, error }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (isMounted) {
          setSession(session)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return { session, loading }
}

export function useAuth() {
  const { user, loading: userLoading, error: userError } = useUser()
  const { session, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (user && !profile) {
      setProfileLoading(true)
      // Identity 시스템을 통한 profile 조회
      supabase
        .from('auth_methods')
        .select(`
          identities!inner (
            user_profiles!inner (*)
          )
        `)
        .eq('provider', 'supabase')
        .eq('provider_user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.identities?.user_profiles) {
            setProfile(data.identities.user_profiles)
          }
          setProfileLoading(false)
        })
    } else if (!user) {
      setProfile(null)
    }
  }, [user, profile, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    router.refresh()
    return data
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    
    if (error) throw error
    
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error
    
    setProfile(null)
    router.push('/auth/login')
  }

  const updateProfile = async (updates: any) => {
    if (!user) throw new Error('No user logged in')
    
    // Identity 시스템을 통해 identity_id 조회 후 업데이트
    const { data: authMethod } = await supabase
      .from('auth_methods')
      .select('identities!inner(id)')
      .eq('provider', 'supabase')
      .eq('provider_user_id', user.id)
      .single()
    
    if (!authMethod?.identities?.id) {
      throw new Error('Identity not found')
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('identity_id', authMethod.identities.id)
      .select()
      .single()
    
    if (error) throw error
    
    setProfile(data)
    return data
  }

  return {
    user,
    session,
    profile,
    loading: userLoading || sessionLoading || profileLoading,
    error: userError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    isVerified: profile?.role === 'verified' || profile?.role === 'moderator' || profile?.role === 'admin',
  }
}