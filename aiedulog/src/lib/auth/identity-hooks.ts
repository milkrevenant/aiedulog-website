'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export interface Identity {
  id: string
  status: 'active' | 'inactive' | 'suspended' | 'deleted'
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface UserProfile {
  id?: string
  identity_id: string
  email: string
  username?: string
  full_name?: string
  nickname?: string
  avatar_url?: string
  bio?: string
  school?: string
  subject?: string
  interests: string[]
  role: 'member' | 'moderator' | 'admin' | 'lecturer' | 'verified'
  is_lecturer: boolean
  lecturer_info: any
  is_active: boolean
  last_sign_in_at?: string
  last_active_at?: string
  created_at: string
  updated_at: string
}

export interface AuthMethod {
  id: string
  identity_id: string
  provider: string
  provider_user_id: string
  provider_data?: Record<string, any>
  is_primary: boolean
  is_verified: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
}

export function useIdentity() {
  const [user, setUser] = useState<User | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    async function loadUserData() {
      try {
        // Get current auth user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (!user || !isMounted) {
          setUser(null)
          setIdentity(null)
          setProfile(null)
          setAuthMethods([])
          setLoading(false)
          return
        }

        setUser(user)

        // Get identity through auth method
        const { data: authMethod, error: authError } = await supabase
          .from('auth_methods')
          .select(`
            *,
            identities (*)
          `)
          .eq('provider', 'supabase')
          .eq('provider_user_id', user.id)
          .single()

        if (authError) {
          // If no auth method found, this might be a legacy user
          // Try to find them in the old profiles table and migration mapping
          const { data: migrationData, error: migrationError } = await supabase
            .from('migration_mapping')
            .select(`
              new_identity_id,
              identities!inner (*)
            `)
            .eq('old_profile_id', user.id)
            .single()

          if (migrationError) throw authError // Original error

          if (migrationData && isMounted) {
            setIdentity(migrationData.identities as any)

            // Get auth method for this identity
            const { data: methods } = await supabase
              .from('auth_methods')
              .select('*')
              .eq('identity_id', migrationData.new_identity_id)
              .order('is_primary', { ascending: false })

            if (methods && isMounted) {
              setAuthMethods(methods)
            }

            // Get user profile
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('identity_id', migrationData.new_identity_id)
              .single()

            if (profileData && isMounted) {
              setProfile(profileData)
            }
          }
          return
        }

        if (!authMethod || !isMounted) return

        setIdentity(authMethod.identities as Identity)

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('identity_id', authMethod.identities.id)
          .single()

        if (profileError) throw profileError
        if (isMounted) {
          setProfile(profileData)
        }

        // Get all auth methods for this identity
        const { data: methods, error: methodsError } = await supabase
          .from('auth_methods')
          .select('*')
          .eq('identity_id', authMethod.identities.id)
          .order('is_primary', { ascending: false })

        if (methodsError) throw methodsError
        if (isMounted) {
          setAuthMethods(methods || [])
        }

        // Update last used timestamp for this auth method
        await supabase
          .from('auth_methods')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', authMethod.id)

      } catch (err) {
        if (isMounted) {
          setError(err as Error)
          console.error('Identity loading error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUserData()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setLoading(true)
          await loadUserData()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIdentity(null)
          setProfile(null)
          setAuthMethods([])
          setError(null)
          router.refresh()
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user)
          // Optionally reload identity data
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return {
    user,
    identity,
    profile,
    authMethods,
    loading,
    error,
    isAuthenticated: !!user && !!identity,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    isLecturer: profile?.is_lecturer || profile?.role === 'lecturer',
    isVerified: profile?.role === 'verified' || profile?.role === 'moderator' || profile?.role === 'admin',
  }
}

// Enhanced auth hook with backward compatibility
export function useAuth() {
  const identityData = useIdentity()
  const supabase = createClient()
  const router = useRouter()

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
    try {
      // Create auth user first
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      // Create complete user identity if auth was successful
      if (data.user) {
        try {
          const { data: identityData, error: identityError } = await supabase.rpc('create_complete_user', {
            p_email: email,
            p_username: metadata?.username,
            p_full_name: metadata?.full_name,
            p_nickname: metadata?.nickname || metadata?.username,
            p_auth_provider: 'supabase',
            p_auth_user_id: data.user.id,
            p_school: metadata?.school,
            p_interests: metadata?.interests || [],
            p_role: metadata?.role || 'member'
          })
          
          if (identityError) {
            console.error('Failed to create identity:', identityError)
            // Note: We don't throw here to avoid breaking the signup flow
            // The user will still be created in auth, and can be migrated later
          }
        } catch (identityError) {
          console.error('Failed to create identity:', identityError)
        }
      }
      
      return data
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error
    
    router.push('/auth/login')
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!identityData.identity) throw new Error('No identity found')
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('identity_id', identityData.identity.id)
      .select()
      .single()
    
    if (error) throw error
    
    // Trigger a reload of the identity data
    window.location.reload() // Simple approach, could be optimized
    
    return data
  }

  const addAuthMethod = async (provider: string, providerUserId: string, providerData?: any) => {
    if (!identityData.identity) throw new Error('No identity found')
    
    const { data, error } = await supabase
      .from('auth_methods')
      .insert({
        identity_id: identityData.identity.id,
        provider,
        provider_user_id: providerUserId,
        provider_data: providerData || {},
        is_primary: false,
        is_verified: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    return data
  }

  const setPrimaryAuthMethod = async (authMethodId: string) => {
    if (!identityData.identity) throw new Error('No identity found')
    
    // First, set all methods to non-primary
    await supabase
      .from('auth_methods')
      .update({ is_primary: false })
      .eq('identity_id', identityData.identity.id)
    
    // Then set the selected method as primary
    const { data, error } = await supabase
      .from('auth_methods')
      .update({ is_primary: true })
      .eq('id', authMethodId)
      .eq('identity_id', identityData.identity.id)
      .select()
      .single()
    
    if (error) throw error
    
    return data
  }

  // Backward compatibility interface with new functionality
  return {
    ...identityData,
    // Legacy properties for existing code
    user: identityData.user,
    session: null, // Could be enhanced if needed
    profile: identityData.profile,
    signIn,
    signUp,
    signOut,
    updateProfile,
    
    // New identity-specific functionality
    identity: identityData.identity,
    authMethods: identityData.authMethods,
    addAuthMethod,
    setPrimaryAuthMethod,
    
    // Enhanced capabilities
    canAddAuthMethod: !!identityData.identity,
    hasMultipleAuthMethods: identityData.authMethods.length > 1,
    primaryAuthMethod: identityData.authMethods.find(m => m.is_primary),
  }
}