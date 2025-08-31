import { createClient } from './server'
import { redirect } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { getUserIdentity } from '@/lib/identity/helpers'

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
  
  // Use standardized identity helper (server-side)
  const identity = await getUserIdentity(session.user, true)
  
  if (!identity?.profile || identity.profile.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return session
}

export async function requireModerator() {
  const session = await requireAuth()
  
  // Use standardized identity helper (server-side)
  const identity = await getUserIdentity(session.user, true)
  
  if (!identity?.profile || (identity.profile.role !== 'admin' && identity.profile.role !== 'moderator')) {
    redirect('/dashboard')
  }
  
  return session
}

export async function getUserProfile(userId: string) {
  // Create a User object for the helper function
  const userObj = { id: userId } as User
  
  // Use standardized identity helper (server-side)
  const identity = await getUserIdentity(userObj, true)
  
  return identity?.profile || null
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