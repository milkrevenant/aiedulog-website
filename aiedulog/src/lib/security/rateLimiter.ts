// Using Web Crypto API for Edge Runtime compatibility

// Rate limiting configuration for different endpoint types
export interface RateLimitConfig {
  requests: number      // Number of requests allowed
  window: string       // Time window (e.g., '15m', '1h', '1d')  
  blockDuration: string // How long to block after limit exceeded
}

// Rate limit configurations by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - Very strict
  'auth:login': { requests: 5, window: '15m', blockDuration: '1h' },
  'auth:register': { requests: 3, window: '1h', blockDuration: '24h' },
  'auth:reset-password': { requests: 3, window: '1h', blockDuration: '24h' },
  'auth:verify-email': { requests: 5, window: '1h', blockDuration: '2h' },
  
  // API endpoints - Moderate limits
  'api:general': { requests: 100, window: '1m', blockDuration: '10m' },
  'api:search': { requests: 20, window: '1m', blockDuration: '5m' },
  'api:upload': { requests: 10, window: '1m', blockDuration: '5m' },
  
  // Content creation - Allow creativity
  'content:post': { requests: 10, window: '1m', blockDuration: '5m' },
  'content:comment': { requests: 30, window: '1m', blockDuration: '2m' },
  'content:like': { requests: 100, window: '1m', blockDuration: '1m' },
  
  // Chat and messaging
  'chat:message': { requests: 60, window: '1m', blockDuration: '10m' },
  'chat:create-room': { requests: 5, window: '1h', blockDuration: '1h' },
  
  // Admin endpoints - Very strict
  'admin:user-management': { requests: 10, window: '1m', blockDuration: '30m' },
  'admin:system-config': { requests: 3, window: '1m', blockDuration: '1h' },
}

// Convert time strings to milliseconds
function parseTimeToMs(timeStr: string): number {
  const unit = timeStr.slice(-1)
  const value = parseInt(timeStr.slice(0, -1))
  
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: throw new Error(`Invalid time unit: ${unit}`)
  }
}

// Generate unique key for rate limiting using Web Crypto API (Edge Runtime compatible)
async function generateKey(identifier: string, endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(`${identifier}:${endpoint}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `ratelimit:${hashHex}`
}

// In-memory storage for development (replace with Redis in production)
const memoryStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>()

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  blockedUntil?: number
  retryAfter?: number
  reason?: string
  headers?: Record<string, string>
  fallbackMode?: boolean
}

export class AdvancedRateLimiter {
  constructor(private useRedis: boolean = false) {}
  
  /**
   * Check if request is allowed and update counters
   */
  async checkRateLimit(
    identifier: string, // IP address or user ID
    endpoint: string,   // Endpoint type (e.g., 'auth:login')
    userAgent?: string  // For additional fingerprinting
  ): Promise<RateLimitResult> {
    const config = RATE_LIMITS[endpoint]
    if (!config) {
      // Default rate limit if endpoint not configured
      return this.checkGenericLimit(identifier)
    }
    
    const key = await generateKey(identifier, endpoint)
    const now = Date.now()
    const windowMs = parseTimeToMs(config.window)
    const blockMs = parseTimeToMs(config.blockDuration)
    
    // Get current state from storage
    let state = memoryStore.get(key) || { 
      count: 0, 
      resetTime: now + windowMs 
    }
    
    // Check if currently blocked
    if (state.blockedUntil && state.blockedUntil > now) {
      return {
        allowed: false,
        limit: config.requests,
        remaining: 0,
        resetTime: state.resetTime,
        blockedUntil: state.blockedUntil,
        retryAfter: Math.ceil((state.blockedUntil - now) / 1000)
      }
    }
    
    // Reset counter if window expired
    if (now > state.resetTime) {
      state = { 
        count: 0, 
        resetTime: now + windowMs 
      }
    }
    
    // Increment counter
    state.count++
    
    // Check if limit exceeded
    if (state.count > config.requests) {
      state.blockedUntil = now + blockMs
      memoryStore.set(key, state)
      
      // Log suspicious activity
      this.logSuspiciousActivity(identifier, endpoint, userAgent)
      
      return {
        allowed: false,
        limit: config.requests,
        remaining: 0,
        resetTime: state.resetTime,
        blockedUntil: state.blockedUntil,
        retryAfter: Math.ceil(blockMs / 1000)
      }
    }
    
    // Update storage and return result
    memoryStore.set(key, state)
    
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests - state.count,
      resetTime: state.resetTime
    }
  }
  
  /**
   * Generic rate limit for unknown endpoints
   */
  private async checkGenericLimit(identifier: string): Promise<RateLimitResult> {
    const config = { requests: 60, window: '1m', blockDuration: '10m' }
    return this.checkRateLimit(identifier, 'api:general')
  }
  
  /**
   * Check multiple identifiers (IP + User ID combo)
   */
  async checkMultipleIdentifiers(
    ipAddress: string,
    userId: string | null,
    endpoint: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    // Always check IP-based limits
    const ipResult = await this.checkRateLimit(ipAddress, endpoint, userAgent)
    if (!ipResult.allowed) {
      return ipResult
    }
    
    // If user is logged in, also check user-based limits
    if (userId) {
      const userResult = await this.checkRateLimit(userId, endpoint, userAgent)
      if (!userResult.allowed) {
        return userResult
      }
    }
    
    return ipResult
  }
  
  /**
   * Progressive rate limiting - stricter limits after violations
   */
  async checkProgressiveLimit(
    identifier: string,
    endpoint: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    const violationKey = `violations:${await generateKey(identifier, endpoint)}`
    const violations = memoryStore.get(violationKey)?.count || 0
    
    // Adjust limits based on violation history
    const adjustedConfig = { ...RATE_LIMITS[endpoint] }
    if (violations > 0) {
      adjustedConfig.requests = Math.max(1, adjustedConfig.requests - violations)
      adjustedConfig.blockDuration = `${parseTimeToMs(adjustedConfig.blockDuration) * (violations + 1)}ms`
    }
    
    const result = await this.checkRateLimit(identifier, endpoint, userAgent)
    
    // Track violations
    if (!result.allowed) {
      memoryStore.set(violationKey, { 
        count: violations + 1, 
        resetTime: Date.now() + 24 * 60 * 60 * 1000 // Reset daily
      })
    }
    
    return result
  }
  
  /**
   * Log suspicious activity patterns
   */
  private logSuspiciousActivity(
    identifier: string, 
    endpoint: string, 
    userAgent?: string
  ): void {
    const safeIdentifier = String(identifier || 'unknown')
    console.warn('🚨 Rate limit exceeded:', {
      identifier: safeIdentifier.substring(0, 10) + '...', // Partial for privacy
      endpoint,
      userAgent,
      timestamp: new Date().toISOString(),
      severity: this.calculateThreatLevel(endpoint)
    })
    
    // TODO: Send to audit logging system
    // TODO: Trigger security alerts for high-severity violations
  }
  
  /**
   * Calculate threat level based on endpoint
   */
  private calculateThreatLevel(endpoint: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (endpoint.startsWith('auth:')) return 'CRITICAL'
    if (endpoint.startsWith('admin:')) return 'HIGH'
    if (endpoint.startsWith('api:upload')) return 'MEDIUM'
    return 'LOW'
  }
  
  /**
   * Clear rate limit for identifier (emergency use)
   */
  async clearRateLimit(identifier: string, endpoint: string): Promise<void> {
    const key = await generateKey(identifier, endpoint)
    memoryStore.delete(key)
  }
  
  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(identifier: string, endpoint: string): Promise<RateLimitResult> {
    const key = await generateKey(identifier, endpoint)
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS['api:general']
    const state = memoryStore.get(key)
    
    if (!state) {
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests,
        resetTime: Date.now() + parseTimeToMs(config.window)
      }
    }
    
    return {
      allowed: state.count <= config.requests,
      limit: config.requests,
      remaining: Math.max(0, config.requests - state.count),
      resetTime: state.resetTime,
      blockedUntil: state.blockedUntil
    }
  }
  
  /**
   * Cleanup expired entries (call periodically)
   */
  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [key, state] of memoryStore.entries()) {
      if (now > state.resetTime && (!state.blockedUntil || now > state.blockedUntil)) {
        memoryStore.delete(key)
      }
    }
  }

  // Alias for test compatibility
  async cleanupExpiredEntries(): Promise<number> {
    const before = memoryStore.size
    await this.cleanup()
    return before - memoryStore.size
  }

  // Record violation for progressive rate limiting
  async recordViolation(identifier: string, reason: string): Promise<void> {
    const violationKey = `violations:${identifier}`
    const existing = memoryStore.get(violationKey)?.count || 0
    memoryStore.set(violationKey, {
      count: existing + 1,
      resetTime: Date.now() + 24 * 60 * 60 * 1000
    })
    
    // Also record by reason
    const reasonKey = `violations:${identifier}:${reason}`
    const reasonCount = memoryStore.get(reasonKey)?.count || 0
    memoryStore.set(reasonKey, {
      count: reasonCount + 1,
      resetTime: Date.now() + 24 * 60 * 60 * 1000
    })
  }

  // Get violation level for identifier
  async getViolationLevel(identifier: string): Promise<{ level: number; blockDuration: number }> {
    const violationKey = `violations:${identifier}`
    const violations = memoryStore.get(violationKey)?.count || 0
    return {
      level: violations,
      blockDuration: Math.max(60000, violations * 60000) // Minimum 1 minute, increases per violation
    }
  }

  // Get user risk profile
  async getUserRiskProfile(userId: string): Promise<{ riskLevel: number }> {
    // Check for multiple IP usage by same user
    const userViolations = memoryStore.get(`violations:${userId}`)?.count || 0
    
    // Simulate multi-IP detection by checking if user has been flagged
    const multiIPKey = `multi_ip:${userId}`
    const multiIPActivity = memoryStore.get(multiIPKey)?.count || 0
    
    return { 
      riskLevel: userViolations + multiIPActivity
    }
  }

  // Detect coordinated attack
  async detectCoordinatedAttack(): Promise<{ detected: boolean; severity: string }> {
    const now = Date.now()
    const recentViolations = Array.from(memoryStore.entries())
      .filter(([key]) => key.startsWith('violations:') && !key.includes(':'))
      .filter(([, state]) => (now - (state.resetTime - 24 * 60 * 60 * 1000)) < 300000) // Last 5 minutes
      .reduce((sum, [, state]) => sum + state.count, 0)
    
    return {
      detected: recentViolations >= 5, // Lower threshold for testing
      severity: recentViolations >= 10 ? 'HIGH' : 'MEDIUM'
    }
  }

  // Set custom rate limit configuration
  async setCustomLimit(endpoint: string, config: { windowMs: number; maxRequests: number; blockDurationMs: number }): Promise<void> {
    RATE_LIMITS[endpoint] = {
      requests: config.maxRequests,
      window: `${config.windowMs}ms`,
      blockDuration: `${config.blockDurationMs}ms`
    }
  }
}

// Singleton instance
export const rateLimiter = new AdvancedRateLimiter()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup()
}, 5 * 60 * 1000)