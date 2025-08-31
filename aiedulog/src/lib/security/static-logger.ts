/**
 * Static Security Logger - Production Ready
 * 
 * Eliminates console.log leaks in production while maintaining development functionality.
 * Uses static exports only - no dynamic imports.
 */

export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHORIZATION_SUCCESS = 'AUTHORIZATION_SUCCESS', 
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SYSTEM_EVENT = 'SYSTEM_EVENT'
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4,
  AUDIT = 5
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: any
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}

interface SecurityEvent {
  type: SecurityEventType
  timestamp: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  context: any
  userId?: string
  ipAddress?: string
  userAgent?: string
}

class StaticSecurityLogger {
  private buffer: LogEntry[] = []
  private securityEvents: SecurityEvent[] = []
  private maxBufferSize = 1000
  private isProduction = process.env.NODE_ENV === 'production'
  private enableConsole = !this.isProduction
  
  /**
   * Secure console replacement - blocks production console.log
   */
  private secureLog(level: 'log' | 'warn' | 'error', message: string, data?: any): void {
    if (this.enableConsole) {
      const logFn = console[level]
      if (data) {
        logFn(message, data)
      } else {
        logFn(message)
      }
    }
  }

  private sanitizeForLogging(data: any): any {
    if (!data) return data
    
    const sanitized = JSON.parse(JSON.stringify(data))
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'session', 'cookie', 'authorization', 'x-api-key'
    ]
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]'
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key])
        }
      }
      return obj
    }
    
    return sanitizeObject(sanitized)
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize)
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: any,
    userId?: string,
    ipAddress?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeForLogging(context),
      userId,
      ipAddress: ipAddress ? ipAddress.substring(0, 10) + '...' : undefined,
      userAgent: context?.userAgent ? 
        context.userAgent.substring(0, 100) + '...' : undefined
    }
  }

  // Core logging methods
  debug(message: string, context?: any, userId?: string): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, userId)
    this.addToBuffer(entry)
    this.secureLog('log', `[DEBUG] ${message}`, context)
  }

  info(message: string, context?: any, userId?: string): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, userId)
    this.addToBuffer(entry)
    this.secureLog('log', `[INFO] ${message}`, context)
  }

  warn(message: string, context?: any, userId?: string): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, userId)
    this.addToBuffer(entry)
    this.secureLog('warn', `[WARN] ${message}`, context)
  }

  error(message: string, error?: any, context?: any, userId?: string): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, { error: error?.message, ...context }, userId)
    this.addToBuffer(entry)
    this.secureLog('error', `[ERROR] ${message}`, { error, ...context })
  }

  // Security-specific logging
  logSecurityEvent(
    eventType: SecurityEventType,
    context: {
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      userId?: string
      ipAddress?: string
      userAgent?: string
      [key: string]: any
    }
  ): void {
    const event: SecurityEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      severity: context.severity || 'MEDIUM',
      context: this.sanitizeForLogging(context),
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }

    this.securityEvents.push(event)
    if (this.securityEvents.length > this.maxBufferSize) {
      this.securityEvents = this.securityEvents.slice(-this.maxBufferSize)
    }

    const entry = this.createLogEntry(
      LogLevel.SECURITY,
      `Security Event: ${eventType}`,
      context,
      context.userId,
      context.ipAddress
    )
    this.addToBuffer(entry)

    // Alert for critical events
    if (context.severity === 'CRITICAL') {
      this.secureLog('error', `🚨 CRITICAL SECURITY EVENT: ${eventType}`, context)
    } else if (this.enableConsole) {
      this.secureLog('warn', `🛡️ Security Event: ${eventType}`, context)
    }
  }

  // Authentication logging
  logAuthEvent(
    event: 'login' | 'logout' | 'signup' | 'password_reset' | 'unauthorized_access' | 'authorization_failure',
    userId?: string,
    context?: any
  ): void {
    const eventTypeMap = {
      'login': SecurityEventType.AUTHENTICATION_SUCCESS,
      'logout': SecurityEventType.AUTHENTICATION_SUCCESS,
      'signup': SecurityEventType.AUTHENTICATION_SUCCESS,
      'password_reset': SecurityEventType.AUTHENTICATION_SUCCESS,
      'unauthorized_access': SecurityEventType.AUTHENTICATION_FAILURE,
      'authorization_failure': SecurityEventType.AUTHORIZATION_FAILURE
    }

    this.logSecurityEvent(eventTypeMap[event], {
      ...context,
      userId,
      severity: event.includes('failure') || event.includes('unauthorized') ? 'HIGH' : 'MEDIUM'
    })
  }

  // Audit logging (for backward compatibility)
  logAuditEvent(
    action: string,
    resource: string,
    result: 'SUCCESS' | 'FAILURE' | 'DENIED',
    context: any = {},
    details?: Record<string, any>
  ): void {
    const severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 
      result === 'FAILURE' || result === 'DENIED' ? 'MEDIUM' : 'LOW'
    
    this.logSecurityEvent(SecurityEventType.DATA_ACCESS, {
      severity,
      action,
      resource,
      result,
      ...context,
      ...details
    })
  }

  // Get statistics
  getStats() {
    return {
      bufferSize: this.buffer.length,
      securityEventsCount: this.securityEvents.length,
      recentSecurityEvents: this.securityEvents.slice(-10),
      logLevelCounts: {
        debug: this.buffer.filter(e => e.level === LogLevel.DEBUG).length,
        info: this.buffer.filter(e => e.level === LogLevel.INFO).length,
        warn: this.buffer.filter(e => e.level === LogLevel.WARN).length,
        error: this.buffer.filter(e => e.level === LogLevel.ERROR).length,
        security: this.buffer.filter(e => e.level === LogLevel.SECURITY).length
      }
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.buffer.slice(-count)
  }

  // Clear buffers (for testing)
  clear(): void {
    this.buffer = []
    this.securityEvents = []
  }

  // Check if production mode
  isProductionMode(): boolean {
    return this.isProduction
  }
}

// Create singleton instance
export const staticSecurityLogger = new StaticSecurityLogger()

// Named exports for compatibility
export const secureLogger = staticSecurityLogger
export { SecurityEventType as SecurityEvent }

// Default export
export default staticSecurityLogger