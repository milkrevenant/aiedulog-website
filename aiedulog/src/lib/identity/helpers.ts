import type { AppUser } from '@/lib/auth/types'
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
 * UPDATED: 2025-12-07 - Simplified for Cognito + user_profiles architecture
 *
 * These functions provide a simple API for identity operations using
 * the StableIdentityService which queries user_profiles directly.
 */

// Re-export types for backward compatibility
export type UserProfile = ServiceUserProfile
export type IdentityData = ServiceIdentityData
export type UserStats = ServiceUserStats

// Export service types for advanced usage
export type {
  IdentityNotFoundError,
  IdentityResolutionError,
  ServiceConfig
} from './stable-identity-service'

export { IdentityServiceError } from './stable-identity-service'

/**
 * Get user identity by looking up user_profiles by email
 *
 * @param user - AppUser object (from Cognito session)
 * @param supabaseClient - Optional Supabase client instance
 * @returns Promise<IdentityData | null>
 */
export async function getUserIdentity(user: AppUser, supabaseClient?: any): Promise<IdentityData | null> {
  try {
    const service = getIdentityService(supabaseClient)
    return await service.resolveUserIdentity(user)
  } catch (error) {
    console.error('Failed to get user identity:', error)
    return null
  }
}

/**
 * Get user_id from user_profiles by email
 */
export async function getIdentityId(user: AppUser, supabaseClient?: any): Promise<string | null> {
  try {
    const service = getIdentityService(supabaseClient)
    return await service.getIdentityId(user)
  } catch (error) {
    console.error('Failed to get identity ID:', error)
    return null
  }
}

/**
 * Get display name from user profile
 */
export function getDisplayName(profile: UserProfile): string {
  const service = getIdentityService()
  return service.getDisplayName(profile)
}

/**
 * Check if message sender matches current user
 */
export function isMessageOwner(messageSenderId: string, currentUserId?: string): boolean {
  const service = getIdentityService()
  return service.isMessageOwner(messageSenderId, currentUserId)
}

/**
 * Search users by name/email
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
 * Get user statistics
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
 */
export function getAdvancedIdentityService(supabaseClient?: any): StableIdentityService {
  return getIdentityService(supabaseClient)
}

/**
 * Clear identity cache for a specific user
 */
export function clearUserIdentityCache(userId: string): void {
  const service = getIdentityService()
  service.clearUserCache(userId)
}

/**
 * Clear all identity cache
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
