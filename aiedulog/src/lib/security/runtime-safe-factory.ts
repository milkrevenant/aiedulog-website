/**
 * Runtime-Safe Security Component Factory
 * Creates security components appropriate for the current runtime environment
 */

import { runtimeCapabilities, safeGetEnv } from './runtime-detector'
import { edgeSafeLogger, SecurityEventType, LogLevel } from './edge-safe-logger'
import { rateLimiter } from './rateLimiter'

// Base interfaces for runtime-agnostic components
export interface RuntimeSafeLogger {
  debug(message: string, context?: any): void
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, context?: any, error?: Error): void
  security(message: string, context?: any): void
  logSecurityEvent(event: SecurityEventType | string, eventData: any): void
  logAuditEvent(action: string, resource: string, result: string, context?: any, details?: any): void
  logAPICall(type: string, data: Record<string, any>): void
  logDatabaseQuery(type: string, data: Record<string, any>): void
  logAuthEvent(event: string, userId?: string, context?: any): void
  flush(): void
  getStats(): any
  cleanup?(): void
}

export interface RuntimeSafeMonitor {
  recordSecurityEvent(event: SecurityEventType, context: any, metadata?: any): void
  getSecurityMetrics(): any
  getThreatIntelligence(): any[]
  getActiveIncidents(): any[]
  getStatistics(): any
  cleanup?(): void
}

export interface RuntimeSafeRateLimiter {
  checkRateLimit(identifier: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }>
  cleanup?(): void
}

/**
 * Edge-safe monitor implementation
 */
class EdgeSafeMonitor implements RuntimeSafeMonitor {
  private securityEvents: Array<{
    type: SecurityEventType
    context: any
    metadata?: any
    timestamp: number
  }> = []
  
  private threatIntelligence: Array<{
    type: string
    severity: string
    count: number
    lastSeen: number
  }> = []

  private incidents: Array<{
    id: string
    type: string
    severity: string
    escalated: boolean
    timestamp: number
    context: any
  }> = []

  recordSecurityEvent(event: SecurityEventType, context: any, metadata?: any): void {
    const eventRecord = {
      type: event,
      context: this.sanitizeContext(context),
      metadata: metadata || {},
      timestamp: Date.now()
    }

    this.securityEvents.push(eventRecord)
    
    // Update threat intelligence
    this.updateThreatIntelligence(event, context)
    
    // Create incident if severe enough
    if (this.isSevereEvent(event)) {
      this.createIncident(event, context, metadata)
    }

    // Log the security event
    edgeSafeLogger.logSecurityEvent(event, {
      severity: this.getEventSeverity(event),
      context,
      metadata
    })

    // Cleanup old events (keep last 1000)
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000)
    }
  }

  getSecurityMetrics(): any {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const recentEvents = this.securityEvents.filter(e => e.timestamp > oneHourAgo)
    const dailyEvents = this.securityEvents.filter(e => e.timestamp > oneDayAgo)

    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      activeThreats: this.threatIntelligence.filter(t => t.lastSeen > oneHourAgo).length,
      activeIncidents: this.incidents.filter(i => !i.escalated).length,
      suspiciousActivities: recentEvents.filter(e => e.type.includes('suspicious')).length,
      totalRequests: dailyEvents.length,
      blockedRequests: dailyEvents.filter(e => e.type.includes('blocked') || e.type.includes('denied')).length,
      lastUpdated: now
    }
  }

  getThreatIntelligence(): any[] {
    return [...this.threatIntelligence].sort((a, b) => b.count - a.count)
  }

  getActiveIncidents(): any[] {
    return [...this.incidents].sort((a, b) => b.timestamp - a.timestamp)
  }

  getStatistics(): any {
    const eventsByType = this.securityEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalSecurityEvents: this.securityEvents.length,
      eventsByType,
      threatIntelligenceEntries: this.threatIntelligence.length,
      activeIncidents: this.incidents.filter(i => !i.escalated).length,
      escalatedIncidents: this.incidents.filter(i => i.escalated).length
    }
  }

  private sanitizeContext(context: any): any {
    // Basic sanitization to prevent sensitive data leakage
    if (!context || typeof context !== 'object') return context

    const sanitized = { ...context }
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'session']
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  private updateThreatIntelligence(event: SecurityEventType, context: any): void {
    const existingThreat = this.threatIntelligence.find(t => t.type === event)
    
    if (existingThreat) {
      existingThreat.count++
      existingThreat.lastSeen = Date.now()
    } else {
      this.threatIntelligence.push({
        type: event,
        severity: this.getEventSeverity(event),
        count: 1,
        lastSeen: Date.now()
      })
    }

    // Keep only top 100 threats
    if (this.threatIntelligence.length > 100) {
      this.threatIntelligence.sort((a, b) => b.count - a.count)
      this.threatIntelligence = this.threatIntelligence.slice(0, 100)
    }
  }

  private createIncident(event: SecurityEventType, context: any, metadata?: any): void {
    const incident = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event,
      severity: this.getEventSeverity(event),
      escalated: this.getEventSeverity(event) === 'CRITICAL',
      timestamp: Date.now(),
      context: this.sanitizeContext(context)
    }

    this.incidents.push(incident)

    // Keep only last 50 incidents
    if (this.incidents.length > 50) {
      this.incidents = this.incidents.slice(-50)
    }
  }

  private isSevereEvent(event: SecurityEventType): boolean {
    const severeEvents = [
      SecurityEventType.DATA_EXFILTRATION_ATTEMPT,
      SecurityEventType.PRIVILEGE_ESCALATION,
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.SESSION_HIJACK_ATTEMPT
    ]

    return severeEvents.includes(event)
  }

  private getEventSeverity(event: SecurityEventType): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = [
      SecurityEventType.DATA_EXFILTRATION_ATTEMPT,
      SecurityEventType.PRIVILEGE_ESCALATION,
      SecurityEventType.SQL_INJECTION_ATTEMPT
    ]

    const highEvents = [
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecurityEventType.SESSION_HIJACK_ATTEMPT,
      SecurityEventType.AUTHENTICATION_FAILURE
    ]

    if (criticalEvents.includes(event)) return 'CRITICAL'
    if (highEvents.includes(event)) return 'HIGH'
    return 'MEDIUM'
  }

  cleanup(): void {
    // Clear all stored data
    this.securityEvents.length = 0
    this.threatIntelligence.length = 0
    this.incidents.length = 0
  }
}

/**
 * Edge-safe rate limiter implementation
 */
class EdgeSafeRateLimiter implements RuntimeSafeRateLimiter {
  private rateLimits: Map<string, {
    count: number
    resetTime: number
    blocked: boolean
  }> = new Map()

  private readonly defaultLimits: Record<string, { requests: number; window: number; blockDuration: number }> = {
    'api:general': { requests: 100, window: 60000, blockDuration: 600000 },
    'api:auth': { requests: 5, window: 900000, blockDuration: 3600000 },
    'api:upload': { requests: 10, window: 60000, blockDuration: 300000 },
    'api:profile-access': { requests: 50, window: 60000, blockDuration: 600000 },
    'api:content-access': { requests: 200, window: 60000, blockDuration: 300000 },
    'api:admin-access': { requests: 20, window: 60000, blockDuration: 1800000 },
    'api:audit-access': { requests: 10, window: 60000, blockDuration: 3600000 }
  }

  async checkRateLimit(identifier: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${identifier}:${endpoint}`
    const now = Date.now()
    const limits = this.defaultLimits[endpoint] || this.defaultLimits['api:general']
    
    let rateLimit = this.rateLimits.get(key)
    
    if (!rateLimit) {
      rateLimit = {
        count: 0,
        resetTime: now + limits.window,
        blocked: false
      }
      this.rateLimits.set(key, rateLimit)
    }

    // Check if blocked
    if (rateLimit.blocked && now < rateLimit.resetTime) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimit.resetTime
      }
    }

    // Reset window if expired
    if (now >= rateLimit.resetTime) {
      rateLimit.count = 0
      rateLimit.resetTime = now + limits.window
      rateLimit.blocked = false
    }

    // Check if limit exceeded
    if (rateLimit.count >= limits.requests) {
      rateLimit.blocked = true
      rateLimit.resetTime = now + limits.blockDuration
      
      // Log rate limit violation
      edgeSafeLogger.security(`Rate limit exceeded: ${identifier} - ${endpoint}`, {
        identifier,
        endpoint,
        count: rateLimit.count,
        limit: limits.requests
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimit.resetTime
      }
    }

    // Increment count and allow
    rateLimit.count++
    
    return {
      allowed: true,
      remaining: limits.requests - rateLimit.count,
      resetTime: rateLimit.resetTime
    }
  }

  cleanup(): void {
    this.rateLimits.clear()
  }
}

/**
 * Security component factory
 */
export class RuntimeSafeFactory {
  private static loggerInstance: RuntimeSafeLogger | null = null
  private static monitorInstance: RuntimeSafeMonitor | null = null
  private static rateLimiterInstance: RuntimeSafeRateLimiter | null = null

  /**
   * Get runtime-appropriate logger
   */
  static getLogger(): RuntimeSafeLogger {
    if (!this.loggerInstance) {
      // For all runtimes, use the edge-safe logger
      this.loggerInstance = edgeSafeLogger
    }
    return this.loggerInstance!
  }

  /**
   * Get runtime-appropriate security monitor
   */
  static getMonitor(): RuntimeSafeMonitor {
    if (!this.monitorInstance) {
      if (runtimeCapabilities.isNodeRuntime()) {
        // For Node.js runtime, we can use the EdgeSafeMonitor or try to load a Node-specific one
        // For now, use EdgeSafeMonitor in all environments for consistency
        this.monitorInstance = new EdgeSafeMonitor()
        
        // TODO: In future, we could load Node.js-specific monitor with more features:
        // try {
        //   const { nodeSecurityMonitor } = require('./node-security-monitor')
        //   this.monitorInstance = nodeSecurityMonitor
        // } catch {
        //   this.monitorInstance = new EdgeSafeMonitor()
        // }
      } else {
        // Use edge-safe monitor for Edge Runtime and browser
        this.monitorInstance = new EdgeSafeMonitor()
      }
    }
    return this.monitorInstance!
  }

  /**
   * Get runtime-appropriate rate limiter
   */
  static getRateLimiter(): RuntimeSafeRateLimiter {
    if (!this.rateLimiterInstance) {
      if (runtimeCapabilities.isNodeRuntime()) {
        // Try to load existing rate limiter if available
        try {
          this.rateLimiterInstance = rateLimiter
        } catch {
          // Fallback to edge-safe rate limiter
          this.rateLimiterInstance = new EdgeSafeRateLimiter()
        }
      } else {
        // Use edge-safe rate limiter for Edge Runtime and browser
        this.rateLimiterInstance = new EdgeSafeRateLimiter()
      }
    }
    return this.rateLimiterInstance!
  }

  /**
   * Get security health status
   */
  static getHealthStatus(): {
    runtime: string
    logger: boolean
    monitor: boolean
    rateLimiter: boolean
    timestamp: number
  } {
    const runtime = runtimeCapabilities.getRuntime()
    
    return {
      runtime,
      logger: !!this.loggerInstance,
      monitor: !!this.monitorInstance,
      rateLimiter: !!this.rateLimiterInstance,
      timestamp: Date.now()
    }
  }

  /**
   * Initialize all security components
   */
  static initialize(): {
    logger: RuntimeSafeLogger
    monitor: RuntimeSafeMonitor
    rateLimiter: RuntimeSafeRateLimiter
  } {
    const logger = this.getLogger()
    const monitor = this.getMonitor()
    const rateLimiter = this.getRateLimiter()

    // Log initialization
    logger.info('Security components initialized', {
      runtime: runtimeCapabilities.getRuntime(),
      features: runtimeCapabilities.getFeatures()
    })

    return { logger, monitor, rateLimiter }
  }

  /**
   * Cleanup all components
   */
  static cleanup(): void {
    if (this.loggerInstance?.cleanup) {
      this.loggerInstance.cleanup()
    }
    if (this.monitorInstance?.cleanup) {
      this.monitorInstance.cleanup()
    }
    if (this.rateLimiterInstance?.cleanup) {
      this.rateLimiterInstance.cleanup()
    }

    this.loggerInstance = null
    this.monitorInstance = null
    this.rateLimiterInstance = null
  }
}

// Export convenience functions
export const getSecurityLogger = () => RuntimeSafeFactory.getLogger()
export const getSecurityMonitor = () => RuntimeSafeFactory.getMonitor()
export const getSecurityRateLimiter = () => RuntimeSafeFactory.getRateLimiter()
export const initializeSecurity = () => RuntimeSafeFactory.initialize()
export const cleanupSecurity = () => RuntimeSafeFactory.cleanup()

// Export instances for backward compatibility
export const securityLogger = RuntimeSafeFactory.getLogger()
export const securityMonitor = RuntimeSafeFactory.getMonitor()
export const securityRateLimiter = RuntimeSafeFactory.getRateLimiter()