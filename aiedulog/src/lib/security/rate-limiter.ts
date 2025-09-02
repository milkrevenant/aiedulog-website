/**
 * Global Rate Limiting System
 * Simple, effective rate limiting with Redis-like in-memory store
 * 
 * FEATURES:
 * - Per-IP and per-user rate limiting
 * - Progressive blocking for DDoS protection
 * - Memory-efficient sliding window algorithm
 * - Environment-based configuration
 */

import { SecurityContext } from './core-security';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  blockDurationMs: number; // How long to block after limit exceeded
  progressiveBlock: boolean; // Enable progressive blocking
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked: boolean;
}

// In-memory store for rate limiting (production should use Redis)
class RateLimitStore {
  private requests = new Map<string, number[]>();
  private blocked = new Map<string, number>();
  
  /**
   * Add request timestamp to store
   */
  addRequest(key: string, timestamp: number): void {
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key)!.push(timestamp);
  }
  
  /**
   * Get request count within window
   */
  getRequestCount(key: string, windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    
    if (!this.requests.has(key)) {
      return 0;
    }
    
    const timestamps = this.requests.get(key)!;
    const validRequests = timestamps.filter(t => t > cutoff);
    
    // Update store with only valid requests
    this.requests.set(key, validRequests);
    
    return validRequests.length;
  }
  
  /**
   * Block a key for specified duration
   */
  blockKey(key: string, durationMs: number): void {
    const unblockTime = Date.now() + durationMs;
    this.blocked.set(key, unblockTime);
  }
  
  /**
   * Check if key is blocked
   */
  isBlocked(key: string): { blocked: boolean; unblockTime?: number } {
    if (!this.blocked.has(key)) {
      return { blocked: false };
    }
    
    const unblockTime = this.blocked.get(key)!;
    
    if (Date.now() >= unblockTime) {
      this.blocked.delete(key);
      return { blocked: false };
    }
    
    return { blocked: true, unblockTime };
  }
  
  /**
   * Clean up old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    // Remove old request timestamps (keep 24 hours worth)
    const maxAge = 24 * 60 * 60 * 1000;
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < maxAge);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
    
    // Remove expired blocks
    for (const [key, unblockTime] of this.blocked.entries()) {
      if (now >= unblockTime) {
        this.blocked.delete(key);
      }
    }
  }
}

// Global rate limit configurations
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Default API rate limits
  'api_default': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    blockDurationMs: 15 * 60 * 1000,
    progressiveBlock: false
  },
  
  // Authentication endpoints
  'auth': {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    maxRequests: 10,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    progressiveBlock: true
  },
  
  // Admin endpoints
  'admin': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 500,
    blockDurationMs: 60 * 60 * 1000,
    progressiveBlock: false
  },
  
  // User management
  'user_management': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    blockDurationMs: 10 * 60 * 1000,
    progressiveBlock: true
  },
  
  // File uploads
  'upload': {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50,
    blockDurationMs: 20 * 60 * 1000,
    progressiveBlock: true
  },
  
  // High-security operations
  'security': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    progressiveBlock: true
  }
};

// Global store instance
const store = new RateLimitStore();

// Cleanup interval (run every 5 minutes)
setInterval(() => {
  store.cleanup();
}, 5 * 60 * 1000);

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  context: SecurityContext,
  rateLimitKey: string = 'api_default'
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[rateLimitKey];
  if (!config) {
    console.warn(`Unknown rate limit key: ${rateLimitKey}`);
    return {
      allowed: true,
      limit: 100,
      remaining: 99,
      resetTime: Date.now() + 15 * 60 * 1000,
      blocked: false
    };
  }
  
  const now = Date.now();
  
  // Create composite key (IP + user for authenticated requests)
  const identifier = context.userId ? 
    `user:${context.userId}:${rateLimitKey}` : 
    `ip:${context.ipAddress}:${rateLimitKey}`;
  
  // Check if currently blocked
  const blockStatus = store.isBlocked(identifier);
  if (blockStatus.blocked) {
    const retryAfter = Math.ceil((blockStatus.unblockTime! - now) / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: blockStatus.unblockTime!,
      retryAfter,
      blocked: true
    };
  }
  
  // Get current request count
  const currentCount = store.getRequestCount(identifier, config.windowMs);
  
  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    // Calculate progressive block duration if enabled
    let blockDuration = config.blockDurationMs;
    if (config.progressiveBlock) {
      // Increase block duration based on how many times blocked recently
      const blockKey = `${identifier}:blocks`;
      const recentBlocks = store.getRequestCount(blockKey, 24 * 60 * 60 * 1000); // 24 hours
      blockDuration = config.blockDurationMs * Math.pow(2, Math.min(recentBlocks, 5));
      
      // Track this block for progressive calculation
      store.addRequest(blockKey, now);
    }
    
    // Block the identifier
    store.blockKey(identifier, blockDuration);
    
    const retryAfter = Math.ceil(blockDuration / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: now + blockDuration,
      retryAfter,
      blocked: true
    };
  }
  
  // Add this request to the count
  store.addRequest(identifier, now);
  
  // Calculate remaining requests and reset time
  const remaining = config.maxRequests - currentCount - 1;
  const resetTime = now + config.windowMs;
  
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, remaining),
    resetTime,
    blocked: false
  };
}

/**
 * Add custom rate limit configuration
 */
export function addRateLimitConfig(key: string, config: RateLimitConfig): void {
  RATE_LIMIT_CONFIGS[key] = config;
}

/**
 * Get rate limit configuration
 */
export function getRateLimitConfig(key: string): RateLimitConfig | undefined {
  return RATE_LIMIT_CONFIGS[key];
}

/**
 * Detect coordinated attack patterns
 */
export function detectCoordinatedAttack(): { detected: boolean; severity: string; details?: string } {
  const now = Date.now();
  const attackWindow = 5 * 60 * 1000; // 5 minutes
  
  // Count requests from different IPs in the last 5 minutes
  const ipCounts = new Map<string, number>();
  let totalRequests = 0;
  
  for (const [key, timestamps] of (store as any).requests.entries()) {
    if (key.startsWith('ip:')) {
      const ip = key.split(':')[1];
      const recentRequests = timestamps.filter((t: number) => now - t < attackWindow);
      
      if (recentRequests.length > 0) {
        ipCounts.set(ip, recentRequests.length);
        totalRequests += recentRequests.length;
      }
    }
  }
  
  const uniqueIPs = ipCounts.size;
  
  // Detection criteria
  if (totalRequests > 1000 && uniqueIPs > 50) {
    return {
      detected: true,
      severity: 'HIGH',
      details: `${totalRequests} requests from ${uniqueIPs} IPs in ${attackWindow/1000}s`
    };
  }
  
  if (totalRequests > 500 && uniqueIPs > 20) {
    return {
      detected: true,
      severity: 'MEDIUM',
      details: `${totalRequests} requests from ${uniqueIPs} IPs in ${attackWindow/1000}s`
    };
  }
  
  return { detected: false, severity: 'LOW' };
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(): {
  activeKeys: number;
  blockedKeys: number;
  totalRequests: number;
  memoryUsage: string;
} {
  const activeKeys = (store as any).requests.size;
  const blockedKeys = (store as any).blocked.size;
  
  let totalRequests = 0;
  for (const timestamps of (store as any).requests.values()) {
    totalRequests += timestamps.length;
  }
  
  const memoryUsage = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
  
  return {
    activeKeys,
    blockedKeys,
    totalRequests,
    memoryUsage
  };
}