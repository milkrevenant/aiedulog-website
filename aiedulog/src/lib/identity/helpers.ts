import { createClient as createClientClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

/**
 * Identity System Helper Functions
 * 모든 컴포넌트에서 일관된 Identity 시스템 사용을 보장
 */

export interface UserProfile {
  id: string
  identity_id: string
  email: string
  nickname?: string
  avatar_url?: string
  role: string
  full_name?: string
  school?: string
  subject?: string
}

export interface IdentityData {
  identity_id: string
  profile: UserProfile
}

/**
 * auth.user.id로부터 identity_id와 profile을 가져오는 통합 함수
 * @param user - Supabase User object
 * @param supabaseClient - Optional Supabase client instance
 */
export async function getUserIdentity(user: User, supabaseClient?: any): Promise<IdentityData | null> {
  const supabase = supabaseClient || createClientClient()
  
  try {
    // 실제 DB 구조에 맞춰 수정: provider_user_id로 매핑
    const { data: authMethod } = await supabase
      .from('auth_methods')
      .select(`
        identity_id,
        provider_user_id,
        identities!auth_methods_identity_id_fkey (
          id,
          status,
          user_profiles!user_profiles_identity_id_fkey (
            identity_id,
            email,
            nickname,
            avatar_url,
            role,
            full_name,
            school,
            subject
          )
        )
      `)
      .eq('provider_user_id', user.id)
      .single()

    console.log('Auth method lookup for user:', user.id)
    console.log('Auth method result:', authMethod)

    if (authMethod?.identities?.[0]?.user_profiles?.[0]) {
      return {
        identity_id: authMethod.identities[0].id,
        profile: {
          id: authMethod.identity_id,
          identity_id: authMethod.identities[0].id,
          email: authMethod.identities[0].user_profiles[0].email,
          nickname: authMethod.identities[0].user_profiles[0].nickname,
          avatar_url: authMethod.identities[0].user_profiles[0].avatar_url,
          role: authMethod.identities[0].user_profiles[0].role,
          full_name: authMethod.identities[0].user_profiles[0].full_name,
          school: authMethod.identities[0].user_profiles[0].school,
          subject: authMethod.identities[0].user_profiles[0].subject
        }
      }
    }
    
    // Fallback: user_profiles 테이블에서 직접 찾기
    console.log('Trying fallback: direct user_profiles lookup')
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', user.email)
      .single()
    
    if (profile) {
      return {
        identity_id: profile.identity_id,
        profile: profile
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to get user identity:', error)
    return null
  }
}

/**
 * 채팅 메시지 전송용 - identity_id 반환
 */
export async function getIdentityId(user: User): Promise<string | null> {
  const identity = await getUserIdentity(user)
  return identity?.identity_id || null
}

/**
 * 사용자 표시명 반환
 */
export function getDisplayName(profile: UserProfile): string {
  return profile.nickname || profile.email?.split('@')[0] || 'Anonymous'
}

/**
 * 메시지 소유자 확인
 */
export function isMessageOwner(messageSenderId: string, currentUserIdentityId?: string): boolean {
  return messageSenderId === currentUserIdentityId
}

/**
 * 사용자 검색 - 통합 identity 시스템 활용
 * @param searchText - 검색어
 * @param supabaseClient - Optional Supabase client instance
 * @param excludeUserId - 제외할 사용자 ID (옵션)
 * @param limit - 결과 개수 제한 (기본값: 10)
 */
export async function searchUsers(
  searchText: string,
  supabaseClient?: any,
  excludeUserId?: string,
  limit: number = 10
): Promise<UserProfile[]> {
  if (!searchText.trim()) return []
  
  const supabase = supabaseClient || createClientClient()
  
  try {
    let query = supabase
      .from('user_profiles')
      .select(`
        identity_id,
        email,
        nickname,
        avatar_url,
        role,
        full_name,
        school,
        subject
      `)
      .or(`nickname.ilike.%${searchText}%,email.ilike.%${searchText}%,full_name.ilike.%${searchText}%`)
      .limit(limit)
      
    if (excludeUserId) {
      query = query.neq('identity_id', excludeUserId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error searching users:', error)
      return []
    }
    
    return data?.map((user: any) => ({
      id: user.identity_id,
      identity_id: user.identity_id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      role: user.role,
      full_name: user.full_name,
      school: user.school,
      subject: user.subject
    })) || []
    
  } catch (error) {
    console.error('Failed to search users:', error)
    return []
  }
}

/**
 * 사용자 통계 조회 - 통합 identity 시스템 활용
 */
export async function getUserStats(supabaseClient?: any) {
  const supabase = supabaseClient || createClientClient()
  
  try {
    // Active identities 기반 통계
    const { count: totalUsers } = await supabase
      .from('identities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: newUsersToday } = await supabase
      .from('identities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

    // user_profiles 기반 역할 통계
    const { count: verifiedTeachers } = await supabase
      .from('user_profiles')
      .select('identity_id', { count: 'exact', head: true })
      .eq('role', 'verified')

    const { count: activeUsers } = await supabase
      .from('identities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      
    return {
      totalUsers: totalUsers || 0,
      newUsersToday: newUsersToday || 0,
      verifiedTeachers: verifiedTeachers || 0,
      activeUsers: activeUsers || 0
    }
    
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return {
      totalUsers: 0,
      newUsersToday: 0,
      verifiedTeachers: 0,
      activeUsers: 0
    }
  }
}