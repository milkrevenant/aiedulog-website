/**
 * Stable Identity Service
 *
 * UPDATED: 2025-12-07 - Simplified for Cognito + user_profiles architecture
 *
 * Provides consistent user resolution using user_profiles table directly.
 * The legacy 'identities' table layer has been removed as it was designed
 * for Supabase auth.users.id regeneration scenarios which don't apply to Cognito.
 *
 * Key Features:
 * - Direct user_profiles lookup by email
 * - In-memory caching for performance
 * - Graceful error handling
 * - Comprehensive TypeScript typing
 */

import { createClient as createClientClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/auth/types'

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface UserProfile {
  id: string
  user_id: string
  email: string
  nickname?: string
  avatar_url?: string
  role: string
  full_name?: string
  school?: string
  subject?: string
  bio?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface IdentityData {
  user_id: string
  profile: UserProfile
}

export interface UserStats {
  totalUsers: number
  newUsersToday: number
  verifiedTeachers: number
  activeUsers: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface ServiceConfig {
  cacheEnabled: boolean
  cacheTTL: number
  maxRetries: number
  retryDelay: number
  enableLogging: boolean
}

// =====================================================================
// ERROR CLASSES
// =====================================================================

export class IdentityServiceError extends Error {
  public readonly code: string
  public readonly details?: any

  constructor(code: string, message: string, details?: any) {
    super(message)
    this.name = 'IdentityServiceError'
    this.code = code
    this.details = details
  }
}

export class IdentityNotFoundError extends IdentityServiceError {
  constructor(identifier: string, details?: any) {
    super('IDENTITY_NOT_FOUND', `User not found: ${identifier}`, details)
  }
}

export class IdentityResolutionError extends IdentityServiceError {
  constructor(message: string, details?: any) {
    super('IDENTITY_RESOLUTION_ERROR', message, details)
  }
}

// =====================================================================
// STABLE IDENTITY SERVICE CLASS
// =====================================================================

export class StableIdentityService {
  private supabaseClient: any
  private cache = new Map<string, CacheEntry<any>>()
  private config: ServiceConfig

  constructor(supabaseClient?: any, config?: Partial<ServiceConfig>) {
    this.supabaseClient = supabaseClient || createClientClient()
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: process.env.NODE_ENV === 'development',
      ...config
    }
  }

  // =====================================================================
  // CORE IDENTITY RESOLUTION
  // =====================================================================

  /**
   * Resolves user identity by looking up user_profiles directly by email
   * This is the primary method that should be used throughout the application
   */
  async resolveUserIdentity(authUser: AppUser): Promise<IdentityData> {
    const cacheKey = `identity:${authUser.id}:${authUser.email}`

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getCachedData<IdentityData>(cacheKey)
      if (cached) {
        this.log('Cache hit for identity resolution', { userId: authUser.id })
        return cached
      }
    }

    try {
      // Direct lookup by email in user_profiles
      const { data: profile, error } = await this.supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('email', authUser.email)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new IdentityNotFoundError(authUser.email || authUser.id, { email: authUser.email })
        }
        throw new IdentityResolutionError(
          'Failed to resolve user identity',
          { error, userId: authUser.id, email: authUser.email }
        )
      }

      if (!profile) {
        throw new IdentityNotFoundError(authUser.email || authUser.id, { email: authUser.email })
      }

      const identityData: IdentityData = {
        user_id: profile.user_id,
        profile: {
          id: profile.user_id,
          user_id: profile.user_id,
          email: profile.email,
          nickname: profile.nickname || profile.username,
          avatar_url: profile.avatar_url,
          role: profile.role || 'member',
          full_name: profile.full_name,
          school: profile.school,
          subject: profile.subject,
          bio: profile.bio,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      }

      // Cache the result
      if (this.config.cacheEnabled) {
        this.setCachedData(cacheKey, identityData)
      }

      this.log('Successfully resolved user identity', {
        userId: authUser.id,
        profileUserId: profile.user_id
      })

      return identityData

    } catch (error) {
      this.log('Identity resolution failed', {
        error: error instanceof Error ? error.message : error,
        userId: authUser.id
      })
      throw error
    }
  }

  /**
   * Get user profile by user_id with caching
   */
  async getIdentityById(userId: string): Promise<IdentityData | null> {
    const cacheKey = `identity_by_id:${userId}`

    if (this.config.cacheEnabled) {
      const cached = this.getCachedData<IdentityData>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const { data: profile, error } = await this.supabaseClient
        .from('user_profiles')
        .select(`
          user_id,
          email,
          username,
          nickname,
          avatar_url,
          role,
          full_name,
          school,
          subject,
          bio,
          is_active,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new IdentityServiceError('PROFILE_FETCH_ERROR', error.message, error)
      }

      if (!profile) {
        return null
      }

      const identityData: IdentityData = {
        user_id: profile.user_id,
        profile: {
          id: profile.user_id,
          user_id: profile.user_id,
          email: profile.email,
          nickname: profile.nickname || profile.username,
          avatar_url: profile.avatar_url,
          role: profile.role || 'member',
          full_name: profile.full_name,
          school: profile.school,
          subject: profile.subject,
          bio: profile.bio,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      }

      if (this.config.cacheEnabled) {
        this.setCachedData(cacheKey, identityData)
      }

      return identityData

    } catch (error) {
      this.log('Failed to get identity by ID', {
        error: error instanceof Error ? error.message : error,
        userId
      })
      throw error
    }
  }

  /**
   * Get user statistics with caching - using user_profiles table
   */
  async getUserStats(): Promise<UserStats> {
    const cacheKey = 'user_stats'

    if (this.config.cacheEnabled) {
      const cached = this.getCachedData<UserStats>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      // Run queries in parallel for better performance - all using user_profiles
      const [totalUsersResult, newUsersTodayResult, verifiedTeachersResult, activeUsersResult] =
        await Promise.all([
          // Total active users
          this.supabaseClient
            .from('user_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_active', true),

          // New users today
          this.supabaseClient
            .from('user_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_active', true)
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

          // Verified teachers (is_lecturer = true)
          this.supabaseClient
            .from('user_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_lecturer', true),

          // Active users (same as total for now)
          this.supabaseClient
            .from('user_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_active', true)
        ])

      const stats: UserStats = {
        totalUsers: totalUsersResult.count || 0,
        newUsersToday: newUsersTodayResult.count || 0,
        verifiedTeachers: verifiedTeachersResult.count || 0,
        activeUsers: activeUsersResult.count || 0
      }

      if (this.config.cacheEnabled) {
        this.setCachedData(cacheKey, stats, 60000) // Cache for 1 minute
      }

      return stats

    } catch (error) {
      this.log('Failed to get user stats', {
        error: error instanceof Error ? error.message : error
      })

      // Return zero stats on error
      return {
        totalUsers: 0,
        newUsersToday: 0,
        verifiedTeachers: 0,
        activeUsers: 0
      }
    }
  }

  /**
   * Search users with caching and improved query optimization
   */
  async searchUsers(
    query: string,
    limit: number = 10,
    excludeUserId?: string
  ): Promise<UserProfile[]> {
    if (!query.trim()) {
      return []
    }

    const cacheKey = `search:${query}:${limit}:${excludeUserId || 'none'}`

    if (this.config.cacheEnabled) {
      const cached = this.getCachedData<UserProfile[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      let queryBuilder = this.supabaseClient
        .from('user_profiles')
        .select(`
          user_id,
          email,
          nickname,
          avatar_url,
          role,
          full_name,
          school,
          subject
        `)
        .eq('is_active', true)
        .or(`nickname.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(limit)

      if (excludeUserId) {
        queryBuilder = queryBuilder.neq('user_id', excludeUserId)
      }

      const { data, error } = await queryBuilder

      if (error) {
        throw new IdentityServiceError('USER_SEARCH_ERROR', error.message, error)
      }

      const users = (data || []).map((user: any): UserProfile => ({
        id: user.user_id,
        user_id: user.user_id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        role: user.role,
        full_name: user.full_name,
        school: user.school,
        subject: user.subject
      }))

      if (this.config.cacheEnabled) {
        this.setCachedData(cacheKey, users, 60000) // Cache for 1 minute
      }

      return users

    } catch (error) {
      this.log('User search failed', {
        error: error instanceof Error ? error.message : error,
        query,
        limit
      })
      return []
    }
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Get display name for a user profile
   */
  getDisplayName(profile: UserProfile): string {
    return profile.nickname || profile.full_name || profile.email?.split('@')[0] || 'Anonymous'
  }

  /**
   * Check if a message belongs to the current user
   */
  isMessageOwner(messageSenderId: string, currentUserId?: string): boolean {
    return messageSenderId === currentUserId
  }

  /**
   * Get user_id from AppUser (convenience method)
   */
  async getIdentityId(user: AppUser): Promise<string | null> {
    try {
      const identity = await this.resolveUserIdentity(user)
      return identity.user_id
    } catch (error) {
      this.log('Failed to get identity ID', {
        error: error instanceof Error ? error.message : error,
        userId: user.id
      })
      return null
    }
  }

  // =====================================================================
  // CACHE MANAGEMENT
  // =====================================================================

  private getCachedData<T>(key: string): T | null {
    if (!this.config.cacheEnabled) {
      return null
    }

    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.cacheEnabled) {
      return
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL
    })
  }

  /**
   * Clear cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(userId)
    )
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // =====================================================================
  // CONFIGURATION AND LIFECYCLE
  // =====================================================================

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  // =====================================================================
  // PRIVATE UTILITIES
  // =====================================================================

  private log(message: string, data?: any): void {
    if (!this.config.enableLogging) {
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[StableIdentityService] ${message}`, data)
    }
  }
}

// =====================================================================
// SINGLETON INSTANCE
// =====================================================================

let serviceInstance: StableIdentityService | null = null

/**
 * Get the singleton instance of StableIdentityService
 */
export function getIdentityService(supabaseClient?: any): StableIdentityService {
  if (!serviceInstance || supabaseClient) {
    serviceInstance = new StableIdentityService(supabaseClient)
  }
  return serviceInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetIdentityService(): void {
  serviceInstance = null
}

// =====================================================================
// CONVENIENCE EXPORTS
// =====================================================================

export default StableIdentityService
