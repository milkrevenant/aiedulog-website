'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getUserIdentity } from '@/lib/identity/helpers'

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
      // Use fully integrated identity helper with supabase client
      getUserIdentity(user, supabase)
        .then((identity) => {
          if (identity?.profile) {
            setProfile(identity.profile)
          } else {
            console.warn('No profile found for authenticated user:', user.id)
            setProfile(null)
          }
          setProfileLoading(false)
        })
        .catch((error) => {
          console.error('Failed to get user identity via integrated system:', error)
          setProfile(null)
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
    
    // Use integrated identity helper with supabase client
    const identity = await getUserIdentity(user, supabase)
    
    if (!identity?.user_id) {
      throw new Error('User identity not found in integrated system')
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', identity.user_id)
      .select()
      .single()
    
    if (error) {
      console.error('Profile update failed via identity system:', error)
      throw new Error(`Profile update failed: ${error.message}`)
    }
    
    // Update local state with the new profile data
    const updatedProfile = {
      ...data,
      id: identity.user_id // Ensure consistency with user_id
    }
    setProfile(updatedProfile)
    return updatedProfile
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