import { createClient } from './server'
import { redirect } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  
  return session
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  
  return user
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    redirect('/auth/login')
  }
  
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  const supabase = await createClient()
  
  // Identity 시스템을 통한 profile 조회
  const { data: authMethod } = await supabase
    .from('auth_methods')
    .select(`
      identities!inner (
        user_profiles!inner (role)
      )
    `)
    .eq('provider', 'supabase')
    .eq('provider_user_id', session.user.id)
    .single()
  
  const profile = authMethod?.identities?.user_profiles
  
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return session
}

export async function requireModerator() {
  const session = await requireAuth()
  const supabase = await createClient()
  
  // Identity 시스템을 통한 profile 조회
  const { data: authMethod } = await supabase
    .from('auth_methods')
    .select(`
      identities!inner (
        user_profiles!inner (role)
      )
    `)
    .eq('provider', 'supabase')
    .eq('provider_user_id', session.user.id)
    .single()
  
  const profile = authMethod?.identities?.user_profiles
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
    redirect('/dashboard')
  }
  
  return session
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()
  
  // Identity 시스템을 통한 profile 조회 (userId는 auth user id)
  const { data: authMethod, error } = await supabase
    .from('auth_methods')
    .select(`
      identities!inner (
        user_profiles!inner (*)
      )
    `)
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return authMethod?.identities?.user_profiles || null
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    return { success: false, error }
  }
  
  redirect('/auth/login')
}