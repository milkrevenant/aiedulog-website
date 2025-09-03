/**
 * Stable Identity Service
 * 
 * Provides consistent user resolution using the improved ensure_user_identity() 
 * database function with caching, error handling, and future provider compatibility.
 * 
 * Key Features:
 * - Uses email-first resolution strategy from ensure_user_identity()
 * - Handles auth.user.id regeneration scenarios
 * - In-memory caching for performance
 * - Graceful error handling and fallbacks
 * - Provider-agnostic design for future Cognito compatibility
 * - Comprehensive TypeScript typing
 */

import { createClient as createClientClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

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
  social_links?: Record<string, any>
  preferences?: Record<string, any>
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
    super('IDENTITY_NOT_FOUND', `Identity not found: ${identifier}`, details)
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
   * Resolves user identity using the improved ensure_user_identity() database function
   * This is the primary method that should be used throughout the application
   */
  async resolveUserIdentity(authUser: User): Promise<IdentityData> {
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
      // Use the improved ensure_user_identity() function
      const { data: identityId, error } = await this.supabaseClient
        .rpc('ensure_user_identity', {
          new_auth_user_id: authUser.id,
          user_email: authUser.email
        })

      if (error) {
        throw new IdentityResolutionError(
          'Failed to ensure user identity',
          { error, userId: authUser.id, email: authUser.email }
        )
      }

      if (!identityId) {
        throw new IdentityResolutionError(
          'ensure_user_identity returned null',
          { userId: authUser.id, email: authUser.email }
        )
      }

      // Fetch the complete identity data
      const identityData = await this.getIdentityById(identityId)
      
      if (!identityData) {
        throw new IdentityNotFoundError(identityId)
      }

      // Cache the result
      if (this.config.cacheEnabled) {
        this.setCachedData(cacheKey, identityData)
      }

      this.log('Successfully resolved user identity', { 
        userId: authUser.id, 
        identityId: identityData.user_id 
      })

      return identityData

    } catch (error) {
      this.log('Identity resolution failed, attempting fallback', { 
        error: error instanceof Error ? error.message : error,
        userId: authUser.id 
      })

      // Fallback to legacy method with retries
      return await this.fallbackUserIdentity(authUser)
    }
  }

  /**
   * Get identity by ID with caching
   */
  async getIdentityById(identityId: string): Promise<IdentityData | null> {
    const cacheKey = `identity_by_id:${identityId}`
    
    if (this.config.cacheEnabled) {
      const cached = this.getCachedData<IdentityData>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const { data: profile, error } = await this.supabaseClient
        .from('profiles')
        .select(`
          id,
          email,
          username,
          nickname,
          avatar_url,
          role,
          full_name,
          school,
          subject,
          bio,
          created_at,
          updated_at
        `)
        .eq('id', identityId)
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
        user_id: identityId,
        profile: {
          id: profile.id,
          user_id: profile.id, // In profiles table, id serves as user_id
          email: profile.email,
          nickname: profile.nickname || profile.username,
          avatar_url: profile.avatar_url,
          role: profile.role || 'member',
          full_name: profile.full_name,
          school: profile.school,
          subject: profile.subject,
          bio: profile.bio,
          social_links: {},  // profiles table doesn't have social_links
          preferences: {},   // profiles table doesn't have preferences
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
        identityId 
      })
      throw error
    }
  }

  /**
   * Get user statistics with caching
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
      // Run queries in parallel for better performance
      const [totalUsersResult, newUsersTodayResult, verifiedTeachersResult, activeUsersResult] = 
        await Promise.all([
          this.supabaseClient
            .from('identities')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          
          this.supabaseClient
            .from('identities')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
          
          this.supabaseClient
            .from('user_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('role', 'verified'),
          
          this.supabaseClient
            .from('identities')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
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
  // FALLBACK AND LEGACY METHODS
  // =====================================================================

  /**
   * Fallback identity resolution using legacy method with retries
   */
  private async fallbackUserIdentity(authUser: User): Promise<IdentityData> {
    let lastError: any
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Legacy method similar to getUserIdentity
        const { data: authMethod } = await this.supabaseClient
          .from('auth_methods')
          .select(`
            user_id,
            provider_user_id,
            identities!auth_methods_user_id_fkey (
              id,
              status,
              user_profiles!user_profiles_user_id_fkey (
                user_id,
                email,
                nickname,
                avatar_url,
                role,
                full_name,
                school,
                subject,
                bio,
                social_links,
                preferences
              )
            )
          `)
          .eq('provider_user_id', authUser.id)
          .single()

        if (authMethod?.identities?.[0]?.user_profiles?.[0]) {
          const identity = authMethod.identities[0]
          const profile = identity.user_profiles[0]
          
          return {
            user_id: identity.id,
            profile: {
              id: authMethod.user_id,
              user_id: identity.id,
              email: profile.email,
              nickname: profile.nickname,
              avatar_url: profile.avatar_url,
              role: profile.role,
              full_name: profile.full_name,
              school: profile.school,
              subject: profile.subject,
              bio: profile.bio,
              social_links: profile.social_links,
              preferences: profile.preferences
            }
          }
        }
        
        // Fallback: Direct profile lookup by email
        const { data: profile } = await this.supabaseClient
          .from('user_profiles')
          .select('*')
          .eq('email', authUser.email)
          .single()
        
        if (profile) {
          return {
            user_id: profile.user_id,
            profile: {
              id: profile.user_id,
              user_id: profile.user_id,
              email: profile.email,
              nickname: profile.nickname,
              avatar_url: profile.avatar_url,
              role: profile.role,
              full_name: profile.full_name,
              school: profile.school,
              subject: profile.subject,
              bio: profile.bio,
              social_links: profile.social_links,
              preferences: profile.preferences
            }
          }
        }
        
        // If we get here, no identity was found
        throw new IdentityNotFoundError(authUser.id, { email: authUser.email })

      } catch (error) {
        lastError = error
        this.log(`Fallback attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : error,
          userId: authUser.id
        })
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt)
        }
      }
    }

    throw new IdentityResolutionError(
      'All fallback attempts failed',
      { lastError, userId: authUser.id, email: authUser.email }
    )
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
  isMessageOwner(messageSenderId: string, currentUserIdentityId?: string): boolean {
    return messageSenderId === currentUserIdentityId
  }

  /**
   * Get identity ID from user (convenience method)
   */
  async getIdentityId(user: User): Promise<string | null> {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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