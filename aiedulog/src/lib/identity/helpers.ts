import { createClient as createClientClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { 
  StableIdentityService, 
  getIdentityService,
  type UserProfile as ServiceUserProfile,
  type IdentityData as ServiceIdentityData,
  type UserStats as ServiceUserStats
} from './stable-identity-service'

/**
 * Identity System Helper Functions
 * 
 * UPDATED: Now uses StableIdentityService for improved reliability and performance
 * These functions maintain backward compatibility while leveraging the new service.
 * 
 * The new service provides:
 * - Email-first identity resolution using ensure_user_identity()
 * - In-memory caching for better performance
 * - Improved error handling and fallbacks
 * - Future Cognito compatibility
 * 
 * 모든 컴포넌트에서 일관된 Identity 시스템 사용을 보장
 */

// Re-export types from the service for backward compatibility
export interface UserProfile extends ServiceUserProfile {}
export interface IdentityData extends ServiceIdentityData {}
export interface UserStats extends ServiceUserStats {}

// Export service types for advanced usage
export type { 
  IdentityNotFoundError,
  IdentityResolutionError,
  ServiceConfig
} from './stable-identity-service'

// Export the error class (not interface)
export { IdentityServiceError } from './stable-identity-service'

/**
 * auth.user.id로부터 identity_id와 profile을 가져오는 통합 함수
 * 
 * UPDATED: Now uses StableIdentityService with ensure_user_identity() for improved reliability
 * 
 * @param user - Supabase User object
 * @param supabaseClient - Optional Supabase client instance
 * @returns Promise<IdentityData | null> - User identity data or null if not found
 */
export async function getUserIdentity(user: User, supabaseClient?: any): Promise<IdentityData | null> {
  try {
    const service = getIdentityService(supabaseClient)
    return await service.resolveUserIdentity(user)
  } catch (error) {
    // Maintain backward compatibility by returning null on error
    console.error('Failed to get user identity:', error)
    return null
  }
}

/**
 * 채팅 메시지 전송용 - identity_id 반환
 * 
 * UPDATED: Now uses StableIdentityService for better performance
 */
export async function getIdentityId(user: User, supabaseClient?: any): Promise<string | null> {
  try {
    const service = getIdentityService(supabaseClient)
    return await service.getIdentityId(user)
  } catch (error) {
    console.error('Failed to get identity ID:', error)
    return null
  }
}

/**
 * 사용자 표시명 반환
 * 
 * UPDATED: Now uses StableIdentityService for consistent display name logic
 */
export function getDisplayName(profile: UserProfile): string {
  const service = getIdentityService()
  return service.getDisplayName(profile)
}

/**
 * 메시지 소유자 확인
 * 
 * UPDATED: Now uses StableIdentityService for consistent ownership logic
 */
export function isMessageOwner(messageSenderId: string, currentUserIdentityId?: string): boolean {
  const service = getIdentityService()
  return service.isMessageOwner(messageSenderId, currentUserIdentityId)
}

/**
 * 사용자 검색 - 통합 identity 시스템 활용
 * 
 * UPDATED: Now uses StableIdentityService with caching for better performance
 * 
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
  try {
    const service = getIdentityService(supabaseClient)
    return await service.searchUsers(searchText, limit, excludeUserId)
  } catch (error) {
    console.error('Failed to search users:', error)
    return []
  }
}

/**
 * 사용자 통계 조회 - 통합 identity 시스템 활용
 * 
 * UPDATED: Now uses StableIdentityService with caching and parallel queries
 */
export async function getUserStats(supabaseClient?: any): Promise<UserStats> {
  try {
    const service = getIdentityService(supabaseClient)
    return await service.getUserStats()
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

// =====================================================================
// ADVANCED SERVICE ACCESS
// =====================================================================

/**
 * Get the StableIdentityService instance for advanced usage
 * 
 * This allows components to access advanced features like:
 * - Cache management
 * - Configuration updates
 * - Error handling
 * - Performance monitoring
 */
export function getAdvancedIdentityService(supabaseClient?: any): StableIdentityService {
  return getIdentityService(supabaseClient)
}

/**
 * Clear identity cache for a specific user
 * Useful when user data has been updated
 */
export function clearUserIdentityCache(userId: string): void {
  const service = getIdentityService()
  service.clearUserCache(userId)
}

/**
 * Clear all identity cache
 * Useful for testing or when major data changes occur
 */
export function clearAllIdentityCache(): void {
  const service = getIdentityService()
  service.clearCache()
}

/**
 * Get identity service cache statistics
 */
export function getIdentityCacheStats(): { size: number; keys: string[] } {
  const service = getIdentityService()
  return service.getCacheStats()
}