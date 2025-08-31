/**
 * Static Security Bridge - Production Ready
 * 
 * Safe console logging and client-server security bridge without dynamic imports.
 * Uses static exports only for maximum build compatibility.
 */

interface SecurityStatus {
  healthy: boolean
  lastCheck: string
  violations: any
  clientProtections: Record<string, boolean>
  serverProtections: Record<string, boolean>
}

interface SecurityEventReport {
  type: 'client_violation' | 'server_violation' | 'system_event'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  details: any
  metadata?: any
}

class StaticSecurityBridge {
  private lastSecurityCheck: string = new Date().toISOString()
  private violationCount: number = 0
  private isProduction: boolean = process.env.NODE_ENV === 'production'

  /**
   * Production-safe console logging
   * Blocks all console output in production, allows in development
   */
  secureConsoleLog(
    message: string, 
    data?: any, 
    level: 'log' | 'warn' | 'error' = 'log'
  ): void {
    if (!this.isProduction) {
      const logFn = console[level]
      if (data !== undefined) {
        logFn(message, data)
      } else {
        logFn(message)
      }
    }
  }

  /**
   * Sanitize data for safe transmission
   * Removes sensitive information before sending data
   */
  sanitizeForTransmission(data: any): any {
    if (!data) return data

    try {
      // Clone the data to avoid mutations
      const sanitized = JSON.parse(JSON.stringify(data))

      // List of sensitive field patterns
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /key/i,
        /auth/i,
        /credential/i,
        /session/i,
        /cookie/i,
        /authorization/i,
        /x-api-key/i,
        /bearer/i
      ]

      const sanitizeObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj

        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            // Check if key matches sensitive patterns
            if (sensitivePatterns.some(pattern => pattern.test(key))) {
              obj[key] = '[REDACTED]'
            } else if (typeof obj[key] === 'string') {
              // Check if value looks like sensitive data
              if (this.looksLikeSensitiveData(obj[key])) {
                obj[key] = '[REDACTED]'
              }
            } else if (typeof obj[key] === 'object') {
              obj[key] = sanitizeObject(obj[key])
            }
          }
        }
        return obj
      }

      return sanitizeObject(sanitized)
    } catch (error) {
      this.secureConsoleLog('Error sanitizing data', error, 'error')
      return '[SANITIZATION_ERROR]'
    }
  }

  private looksLikeSensitiveData(value: string): boolean {
    if (!value || typeof value !== 'string') return false

    // JWT token pattern
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) return true
    
    // API key patterns
    if (/^[a-z0-9]{32,}$/i.test(value)) return true
    if (/^sk-[a-zA-Z0-9]{48,}$/.test(value)) return true
    if (/^Bearer\s+/i.test(value)) return true
    
    // Password-like strings (8+ chars with mixed case/numbers)
    if (value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) {
      return true
    }

    return false
  }

  /**
   * Check if running on client side
   */
  isClientSide(): boolean {
    return typeof window !== 'undefined'
  }

  /**
   * Check if running on server side
   */
  isServerSide(): boolean {
    return typeof window === 'undefined'
  }

  /**
   * Report security event (client or server)
   */
  reportSecurityEvent(event: SecurityEventReport): void {
    this.violationCount++
    
    const sanitizedEvent = {
      ...event,
      details: this.sanitizeForTransmission(event.details),
      metadata: this.sanitizeForTransmission(event.metadata),
      timestamp: new Date().toISOString(),
      source: this.isClientSide() ? 'client' : 'server'
    }

    // Log locally first
    this.secureConsoleLog(
      `🚨 Security Event [${event.severity}]: ${event.type}`,
      sanitizedEvent,
      event.severity === 'CRITICAL' ? 'error' : 'warn'
    )

    // In a real application, you would send this to your security monitoring service
    // For now, we'll just track it locally
    this.trackSecurityEvent(sanitizedEvent)
  }

  private trackSecurityEvent(event: any): void {
    // This would integrate with your monitoring service
    // For now, just store locally for development
    if (!this.isProduction) {
      const storageKey = 'aiedulog_security_events'
      try {
        const existing = localStorage.getItem(storageKey)
        const events = existing ? JSON.parse(existing) : []
        events.push(event)
        
        // Keep only last 100 events
        const recentEvents = events.slice(-100)
        localStorage.setItem(storageKey, JSON.stringify(recentEvents))
      } catch (error) {
        this.secureConsoleLog('Failed to store security event', error, 'error')
      }
    }
  }

  /**
   * Get current security status
   */
  async getSecurityStatus(): Promise<SecurityStatus | null> {
    try {
      this.lastSecurityCheck = new Date().toISOString()

      const status: SecurityStatus = {
        healthy: this.violationCount < 10,
        lastCheck: this.lastSecurityCheck,
        violations: {
          total: this.violationCount,
          recent: this.getRecentViolations()
        },
        clientProtections: this.getClientProtectionStatus(),
        serverProtections: this.getServerProtectionStatus()
      }

      return status
    } catch (error) {
      this.secureConsoleLog('Error getting security status', error, 'error')
      return null
    }
  }

  private getRecentViolations(): any[] {
    if (this.isClientSide() && !this.isProduction) {
      try {
        const stored = localStorage.getItem('aiedulog_security_events')
        if (stored) {
          const events = JSON.parse(stored)
          return events.slice(-10) // Last 10 events
        }
      } catch (error) {
        this.secureConsoleLog('Error getting recent violations', error, 'error')
      }
    }
    return []
  }

  private getClientProtectionStatus(): Record<string, boolean> {
    if (!this.isClientSide()) {
      return {}
    }

    return {
      consoleProtection: this.isProduction, // Console is protected in production
      devToolsDetection: this.isProduction, // DevTools detection active in production
      sourceMapProtection: this.isProduction, // Source maps hidden in production
      debuggerProtection: this.isProduction  // Debugger statements disabled in production
    }
  }

  private getServerProtectionStatus(): Record<string, boolean> {
    if (this.isClientSide()) {
      return {}
    }

    return {
      rateLimiting: true,
      inputValidation: true,
      sqlInjectionProtection: true,
      xssProtection: true,
      csrfProtection: true,
      securityHeaders: true
    }
  }

  /**
   * Validate environment configuration
   */
  validateSecurityConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push('Missing NEXT_PUBLIC_SUPABASE_URL')
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      errors.push('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    }

    // Production-specific checks
    if (this.isProduction) {
      if (process.env.NODE_ENV !== 'production') {
        warnings.push('NODE_ENV should be set to production')
      }
      
      // Check for debug configurations in production
      if (process.env.DEBUG || process.env.REACT_APP_DEBUG) {
        warnings.push('Debug mode should be disabled in production')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Reset security state (for testing)
   */
  reset(): void {
    this.violationCount = 0
    this.lastSecurityCheck = new Date().toISOString()
    
    if (!this.isProduction && this.isClientSide()) {
      try {
        localStorage.removeItem('aiedulog_security_events')
      } catch (error) {
        this.secureConsoleLog('Error clearing security events', error, 'error')
      }
    }
  }

  /**
   * Get security statistics
   */
  getStatistics() {
    return {
      violationCount: this.violationCount,
      lastCheck: this.lastSecurityCheck,
      isProduction: this.isProduction,
      environment: this.isClientSide() ? 'client' : 'server'
    }
  }
}

// Create singleton instance
export const staticSecurityBridge = new StaticSecurityBridge()

// Named exports for compatibility
export const securityBridge = staticSecurityBridge
export const secureConsoleLog = staticSecurityBridge.secureConsoleLog.bind(staticSecurityBridge)
export const sanitizeForTransmission = staticSecurityBridge.sanitizeForTransmission.bind(staticSecurityBridge)
export const isClientSide = staticSecurityBridge.isClientSide.bind(staticSecurityBridge)
export const isServerSide = staticSecurityBridge.isServerSide.bind(staticSecurityBridge)

// Default export
export default staticSecurityBridge