'use client'

import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/auth/types'

/**
 * Identity Migration Helper
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 기존 사용자를 identity 시스템으로 마이그레이션
 */

export async function ensureUserIdentity(user: AppUser): Promise<string | null> {
  const supabase = createClient()
  
  try {
    // 1. 먼저 기존 identity 매핑 확인
    const { data: existingAuth } = await supabase
      .from('auth_methods')
      .select('identity_id')
      .eq('provider_user_id', user.id)
      .single()
    
    if (existingAuth?.identity_id) {
      console.log('Identity already exists:', existingAuth.identity_id)
      return existingAuth.identity_id
    }
    
    // 2. Identity 생성
    const { data: insertedIdentities, error: identityError } = await supabase
      .from('identities')
      .insert({
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { select: 'id' })

    const newIdentityRecord = Array.isArray(insertedIdentities)
      ? insertedIdentities[0]
      : insertedIdentities
    const newIdentityId = (newIdentityRecord as { id?: string | null } | null | undefined)?.id || null
    
    if (identityError || !newIdentityId) {
      console.error('Failed to create identity:', identityError)
      return null
    }
    
    // 3. Auth method 매핑 생성
    const { error: authMethodError } = await supabase
      .from('auth_methods')
      .insert({
        identity_id: newIdentityId,
        provider: 'supabase',  // 중요: 'email'이 아니라 'supabase'
        provider_user_id: user.id,
        auth_user_id: user.id,  // auth.users.id와 동일
        created_at: new Date().toISOString()
      })
    
    if (authMethodError) {
      console.error('Failed to create auth method:', authMethodError)
      // Rollback identity
      await supabase.from('identities').eq('id', newIdentityId).delete()
      return null
    }
    
    // 4. User profile 업데이트 또는 생성
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('identity_id', newIdentityId)
      .single()
    
    if (existingProfile) {
      // 기존 프로필에 identity_id 업데이트
      await supabase
        .from('user_profiles')
        .eq('identity_id', newIdentityId)
        .update({ updated_at: new Date().toISOString() })
    } else {
      // 새 프로필 생성
      await supabase
        .from('user_profiles')
        .insert({
          identity_id: newIdentityId,
          email: user.email || '',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
    
    console.log('Successfully created identity:', newIdentityId)
    return newIdentityId
  } catch (error) {
    console.error('Identity migration error:', error)
    return null
  }
}

/**
 * Get or create identity for current user
 */
export async function getOrCreateIdentity(user: AppUser): Promise<string | null> {
  const supabase = createClient()
  
  // 1. Try to get existing identity
  const { data: authMethod } = await supabase
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', user.id)
    .single()
  
  if (authMethod?.identity_id) {
    return authMethod.identity_id
  }
  
  // 2. Create new identity if not exists
  return await ensureUserIdentity(user)
}
