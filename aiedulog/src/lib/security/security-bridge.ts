/**
 * Security Bridge - Safe Communication Between Client and Server Security Systems
 * 
 * This module provides secure communication between client-side and server-side
 * security systems without causing Next.js build errors due to context conflicts.
 */

import { SecurityEventType } from './secure-logger'

// Bridge types for cross-context communication
export interface SecurityEventPayload {
  type: SecurityEventType | 'client_violation'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: number
  source: 'client' | 'server' | 'middleware'
  sessionId?: string
  userId?: string
  details: Record<string, any>
  metadata: {
    userAgent?: string
    ipAddress?: string
    requestId?: string
    url?: string
    method?: string
  }
}

export interface SecurityStatus {
  healthy: boolean
  clientProtections: {
    devToolsDetection: boolean
    consoleOverride: boolean
    debuggerProtection: boolean
    activityMonitoring: boolean
  }
  serverProtections: {
    rateLimiting: boolean
    authValidation: boolean
    auditLogging: boolean
    threatMonitoring: boolean
  }
  violations: {
    total: number
    recent: number
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  lastCheck: string
}

/**
 * Security Event Bridge - Handles communication between client and server
 */
export class SecurityBridge {
  private static instance: SecurityBridge
  private eventQueue: SecurityEventPayload[] = []
  private isClient: boolean
  private maxQueueSize: number = 100
  private flushInterval: number = 10000 // 10 seconds

  constructor() {
    this.isClient = typeof window !== 'undefined'
    this.startPeriodicFlush()
  }

  public static getInstance(): SecurityBridge {
    if (!SecurityBridge.instance) {
      SecurityBridge.instance = new SecurityBridge()
    }
    return SecurityBridge.instance
  }

  /**
   * Report a security event from client or server side
   */
  public reportSecurityEvent(payload: Omit<SecurityEventPayload, 'timestamp' | 'source'>): void {
    const event: SecurityEventPayload = {
      ...payload,
      timestamp: Date.now(),
      source: this.isClient ? 'client' : 'server'
    }

    // Add to queue for batch processing
    this.eventQueue.push(event)

    // Prevent memory leaks
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize)
    }

    // For critical events, flush immediately
    if (payload.severity === 'CRITICAL') {
      this.flushEvents()
    }
  }

  /**
   * Flush queued events to server (client-side only)
   */
  private async flushEvents(): Promise<void> {
    if (!this.isClient || this.eventQueue.length === 0) return

    const eventsToSend = [...this.eventQueue]
    this.eventQueue = []

    try {
      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        // If failed, put events back in queue (up to limit)
        this.eventQueue = [...eventsToSend.slice(-50), ...this.eventQueue]
      }
    } catch (error) {
      // If failed, put events back in queue (up to limit)
      this.eventQueue = [...eventsToSend.slice(-50), ...this.eventQueue]
    }
  }

  /**
   * Start periodic event flushing
   */
  private startPeriodicFlush(): void {
    if (this.isClient) {
      setInterval(() => {
        this.flushEvents()
      }, this.flushInterval)
    }
  }

  /**
   * Get current security status (context-aware)
   */
  public async getSecurityStatus(): Promise<SecurityStatus | null> {
    if (this.isClient) {
      // Client-side: fetch from server
      try {
        const response = await fetch('/api/security/status')
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        // Return basic client status if server unavailable
        return this.getBasicClientStatus()
      }
      return null
    } else {
      // Server-side: get from security monitor directly
      return this.getServerSecurityStatus()
    }
  }

  /**
   * Get basic client-side security status
   */
  private getBasicClientStatus(): SecurityStatus {
    return {
      healthy: true,
      clientProtections: {
        devToolsDetection: true,
        consoleOverride: process.env.NODE_ENV === 'production',
        debuggerProtection: true,
        activityMonitoring: true
      },
      serverProtections: {
        rateLimiting: false, // Unknown from client
        authValidation: false, // Unknown from client
        auditLogging: false, // Unknown from client
        threatMonitoring: false // Unknown from client
      },
      violations: {
        total: this.eventQueue.length,
        recent: this.eventQueue.filter(e => Date.now() - e.timestamp < 3600000).length, // Last hour
        severity: this.getHighestSeverity()
      },
      lastCheck: new Date().toISOString()
    }
  }

  /**
   * Get server-side security status
   */
  private async getServerSecurityStatus(): Promise<SecurityStatus> {
    try {
      // Dynamically import server-side modules to avoid client-side inclusion
      const { securityMonitor } = await import('./security-monitor')
      const { getSecurityHealth } = await import('./index')
      
      const health = await getSecurityHealth()
      const metrics = securityMonitor.getSecurityMetrics()

      return {
        healthy: health.status === 'healthy',
        clientProtections: {
          devToolsDetection: true, // Assumed enabled
          consoleOverride: true,
          debuggerProtection: true,
          activityMonitoring: true
        },
        serverProtections: {
          rateLimiting: health.components.rateLimiter,
          authValidation: health.components.auth,
          auditLogging: health.components.logger,
          threatMonitoring: health.components.monitor
        },
        violations: {
          total: metrics.totalRequests || 0,
          recent: metrics.suspiciousActivities || 0,
          severity: metrics.activeThreats > 5 ? 'CRITICAL' : 
                   metrics.suspiciousActivities > 100 ? 'HIGH' :
                   metrics.suspiciousActivities > 20 ? 'MEDIUM' : 'LOW'
        },
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      // Fallback status if server modules fail
      return {
        healthy: false,
        clientProtections: {
          devToolsDetection: false,
          consoleOverride: false,
          debuggerProtection: false,
          activityMonitoring: false
        },
        serverProtections: {
          rateLimiting: false,
          authValidation: false,
          auditLogging: false,
          threatMonitoring: false
        },
        violations: {
          total: 0,
          recent: 0,
          severity: 'LOW'
        },
        lastCheck: new Date().toISOString()
      }
    }
  }

  /**
   * Get highest severity from queued events
   */
  private getHighestSeverity(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.eventQueue.length === 0) return 'LOW'

    const severityOrder = { 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 }
    let highest = 'LOW'

    for (const event of this.eventQueue) {
      if (severityOrder[event.severity] > severityOrder[highest as keyof typeof severityOrder]) {
        highest = event.severity
      }
    }

    return highest as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }

  /**
   * Clear event queue (for testing or reset)
   */
  public clearEventQueue(): void {
    this.eventQueue = []
  }

  /**
   * Get queued events (for debugging)
   */
  public getQueuedEvents(): SecurityEventPayload[] {
    return [...this.eventQueue]
  }
}

/**
 * Utility functions for different contexts
 */

/**
 * Safe console logging that respects security settings
 */
export function secureConsoleLog(message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info'): void {
  // In production, don't log to console
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    return
  }

  // In server environment or development, allow logging
  const logFn = level === 'error' ? console.error : 
                level === 'warn' ? console.warn : 
                console.log

  if (data) {
    logFn(`[AiEduLog Security] ${message}`, data)
  } else {
    logFn(`[AiEduLog Security] ${message}`)
  }
}

/**
 * Sanitize data for safe client-server transmission
 */
export function sanitizeForTransmission(data: any): any {
  if (data === null || data === undefined) return data
  
  if (typeof data === 'string') {
    // Remove potential XSS and limit length
    return data.replace(/<[^>]*>/g, '').substring(0, 1000)
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }
  
  if (Array.isArray(data)) {
    return data.slice(0, 100).map(sanitizeForTransmission)
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {}
    const keys = Object.keys(data).slice(0, 50) // Limit object size
    
    for (const key of keys) {
      if (typeof key === 'string' && key.length < 100) {
        sanitized[key.substring(0, 50)] = sanitizeForTransmission(data[key])
      }
    }
    
    return sanitized
  }
  
  return '[sanitized]'
}

/**
 * Check if current context is client-side
 */
export function isClientSide(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if current context is server-side
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * Safe server module import (only works server-side)
 */
export async function safeServerImport<T>(modulePath: string): Promise<T | null> {
  if (isClientSide()) {
    return null
  }
  
  try {
    return await import(modulePath)
  } catch (error) {
    secureConsoleLog(`Failed to import server module: ${modulePath}`, error, 'error')
    return null
  }
}

// Export default instance
export const securityBridge = SecurityBridge.getInstance()

// Export for convenience
export default {
  SecurityBridge,
  securityBridge,
  secureConsoleLog,
  sanitizeForTransmission,
  isClientSide,
  isServerSide,
  safeServerImport
}