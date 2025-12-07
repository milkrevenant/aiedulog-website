import type { AppUser } from '@/lib/auth/types'

/**
 * Fallback User Data
 *
 * UPDATED: 2025-12-07 - Simplified for Cognito + user_profiles architecture
 * Used when identity resolution fails
 */

export interface FallbackUserData {
  id: string
  email: string
  displayName: string
}

/**
 * Get fallback user data from AppUser when DB lookup fails
 */
export function getFallbackUserData(user: AppUser): FallbackUserData {
  return {
    id: user.id,
    email: user.email || 'unknown@example.com',
    displayName: user.email?.split('@')[0] || 'Anonymous'
  }
}

/**
 * Get sender ID for messages - use user.id directly
 */
export function getFallbackSenderId(user: AppUser): string {
  return user.id
}

/**
 * Check message ownership - compare IDs directly
 */
export function isFallbackMessageOwner(messageSenderId: string, currentUserId: string): boolean {
  return messageSenderId === currentUserId
}
