/**
 * StableIdentityService Usage Examples
 * 
 * These examples demonstrate how to use the new StableIdentityService
 * with the improved ensure_user_identity() database function.
 */

import React from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { 
  getUserIdentity, 
  getAdvancedIdentityService,
  clearUserIdentityCache,
  type IdentityData,
  type UserProfile 
} from './helpers'

// =====================================================================
// BASIC USAGE EXAMPLES
// =====================================================================

/**
 * Example 1: Basic identity resolution (backward compatible)
 * This works exactly like before but now uses the improved service
 */
export async function basicIdentityResolution(user: User): Promise<IdentityData | null> {
  // This now uses ensure_user_identity() under the hood
  // Handles auth.user.id regeneration automatically
  // Includes caching for better performance
  return await getUserIdentity(user)
}

/**
 * Example 2: React component with identity loading
 * Shows how to use the service in a typical React component
 */
export function useUserIdentity(user: User | null) {
  const [identity, setIdentity] = React.useState<IdentityData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const loadIdentity = async () => {
      if (!user) {
        setIdentity(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Uses the improved service with caching
        const userIdentity = await getUserIdentity(user)
        
        if (!cancelled) {
          setIdentity(userIdentity)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }

    loadIdentity()

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.email]) // React to both ID and email changes

  return { identity, loading, error }
}

// =====================================================================
// ADVANCED USAGE EXAMPLES
// =====================================================================

/**
 * Example 3: Advanced service with custom configuration
 * Shows how to use advanced features like cache management
 */
export class AdvancedIdentityManager {
  private service = getAdvancedIdentityService()

  constructor() {
    // Configure the service for your needs
    this.service.updateConfig({
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      maxRetries: 3,
      enableLogging: process.env.NODE_ENV === 'development'
    })
  }

  async resolveUserWithFreshData(user: User): Promise<IdentityData | null> {
    // Clear cache to ensure fresh data
    this.service.clearUserCache(user.id)
    
    // Resolve identity (will bypass cache)
    return await this.service.resolveUserIdentity(user)
  }

  async batchResolveUsers(users: User[]): Promise<IdentityData[]> {
    // Resolve multiple users in parallel
    const results = await Promise.allSettled(
      users.map(user => this.service.resolveUserIdentity(user))
    )

    return results
      .filter((result): result is PromiseFulfilledResult<IdentityData> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  getCacheStatistics() {
    return this.service.getCacheStats()
  }

  clearAllCache() {
    this.service.clearCache()
  }
}

// =====================================================================
// ERROR HANDLING EXAMPLES
// =====================================================================

/**
 * Example 4: Comprehensive error handling
 * Shows how to handle different types of errors gracefully
 */
export async function robustIdentityResolution(user: User): Promise<{
  identity: IdentityData | null
  error: string | null
  fromCache: boolean
}> {
  const service = getAdvancedIdentityService()

  try {
    // Check cache first to see if we're getting cached data
    const cacheStats = service.getCacheStats()
    const cacheKey = `identity:${user.id}:${user.email}`
    const fromCache = cacheStats.keys.includes(cacheKey)

    const identity = await service.resolveUserIdentity(user)
    
    return {
      identity,
      error: null,
      fromCache
    }
  } catch (error) {
    let errorMessage = 'Unknown error occurred'
    
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Identity resolution failed:', {
        userId: user.id,
        email: user.email,
        error: errorMessage
      })
    }

    return {
      identity: null,
      error: errorMessage,
      fromCache: false
    }
  }
}

// =====================================================================
// PERFORMANCE MONITORING EXAMPLES
// =====================================================================

/**
 * Example 5: Performance monitoring wrapper
 * Tracks identity resolution performance
 */
export class IdentityPerformanceMonitor {
  private service = getAdvancedIdentityService()
  private metrics: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    averageResponseTime: number
    errors: number
  } = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    errors: 0
  }

  async resolveUserWithMetrics(user: User): Promise<{
    identity: IdentityData | null
    metrics: {
      responseTime: number
      fromCache: boolean
      success: boolean
    }
  }> {
    const startTime = performance.now()
    const initialCacheSize = this.service.getCacheStats().size
    
    try {
      this.metrics.totalRequests++
      
      const identity = await this.service.resolveUserIdentity(user)
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      // Check if response came from cache
      const finalCacheSize = this.service.getCacheStats().size
      const fromCache = finalCacheSize === initialCacheSize
      
      if (fromCache) {
        this.metrics.cacheHits++
      } else {
        this.metrics.cacheMisses++
      }
      
      // Update average response time
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
        this.metrics.totalRequests

      return {
        identity,
        metrics: {
          responseTime,
          fromCache,
          success: true
        }
      }
    } catch (error) {
      this.metrics.errors++
      const endTime = performance.now()
      
      return {
        identity: null,
        metrics: {
          responseTime: endTime - startTime,
          fromCache: false,
          success: false
        }
      }
    }
  }

  getPerformanceMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0
    
    const errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.errors / this.metrics.totalRequests) * 100 
      : 0

    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100
    }
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errors: 0
    }
  }
}

// =====================================================================
// INTEGRATION EXAMPLES
// =====================================================================

/**
 * Example 6: Integration with existing auth hooks
 * Shows how to integrate with useAuth or similar patterns
 */
export function useAuthWithIdentity() {
  const [user, setUser] = React.useState<User | null>(null)
  const [identity, setIdentity] = React.useState<IdentityData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const service = getAdvancedIdentityService()

    const loadUserAndIdentity = async () => {
      try {
        // Get auth user (this would typically come from your auth context)
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        setUser(authUser)
        
        if (authUser) {
          // Use the improved identity service
          const userIdentity = await service.resolveUserIdentity(authUser)
          setIdentity(userIdentity)
        } else {
          setIdentity(null)
        }
      } catch (error) {
        console.error('Auth/Identity loading failed:', error)
        setUser(null)
        setIdentity(null)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndIdentity()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          try {
            const userIdentity = await service.resolveUserIdentity(session.user)
            setIdentity(userIdentity)
          } catch (error) {
            console.error('Identity resolution failed:', error)
            setIdentity(null)
          }
        } else {
          setUser(null)
          setIdentity(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, identity, loading }
}

/**
 * Example 7: Profile update with cache invalidation
 * Shows how to handle profile updates properly
 */
export async function updateUserProfile(
  user: User,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the profile in the database
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('identity_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    // Clear the cache for this user to ensure fresh data on next fetch
    clearUserIdentityCache(user.id)

    // Optionally, pre-load the fresh data
    const service = getAdvancedIdentityService()
    await service.resolveUserIdentity(user)

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}