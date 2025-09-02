/**
 * Edge-Safe Logger - Compatible with all runtimes (Edge, Node.js, Browser)
 * Provides secure logging without Node.js-specific APIs
 */

import { runtimeCapabilities, safeGetEnv } from './runtime-detector'

// Log levels with severity mapping
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4,
  AUDIT = 5
}

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'auth_failure',
  AUTHORIZATION_FAILURE = 'authz_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS_VIOLATION = 'data_access_violation',
  INPUT_VALIDATION_FAILED = 'input_validation_failed',
  CSRF_ATTACK_DETECTED = 'csrf_attack_detected',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  FILE_UPLOAD_VIOLATION = 'file_upload_violation',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION_ATTEMPT = 'data_exfiltration_attempt'
}

interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  timestamp?: number
  environment?: string
  component?: string
  [key: string]: any
}

interface SecurityEvent {
  type: SecurityEventType | string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message?: string
  context: LogContext
  metadata?: Record<string, any>
}

interface AuditEvent {
  action: string
  resource: string
  result: 'SUCCESS' | 'FAILURE' | 'DENIED'
  context: LogContext
  details?: Record<string, any>
}

// Edge-safe log entry interface
interface EdgeSafeLogEntry {
  level: LogLevel
  message: string
  context: LogContext
  timestamp: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// Sensitive data patterns that should never be logged
const SENSITIVE_PATTERNS = [
  // Authentication credentials
  /password[\"'\s]*[:=][\"'\s]*[^\"'\s,}]+/gi,
  /pwd[\"'\s]*[:=][\"'\s]*[^\"'\s,}]+/gi,
  /secret[\"'\s]*[:=][\"'\s]*[^\"'\s,}]+/gi,
  /token[\"'\s]*[:=][\"'\s]*[\w\-\.]+/gi,
  /bearer\s+[\w\-\.]+/gi,
  /api[_-]?key[\"'\s]*[:=][\"'\s]*[\w\-\.]+/gi,
  
  // Personal information
  /email[\"'\s]*[:=][\"'\s]*[^\"'\s,}@]+@[^\"'\s,}]+/gi,
  /phone[\"'\s]*[:=][\"'\s]*[\d\-\+\(\)\s]+/gi,
  /ssn[\"'\s]*[:=][\"'\s]*\d{3}[\s\-]?\d{2}[\s\-]?\d{4}/gi,
  
  // Financial information
  /credit[_-]?card[\"'\s]*[:=][\"'\s]*\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/gi,
  /cvv[\"'\s]*[:=][\"'\s]*\d{3,4}/gi,
  
  // Session data
  /session[\"'\s]*[:=][\"'\s]*[\w\-\.]+/gi,
  /cookie[\"'\s]*[:=][\"'\s]*[^\"'\s,}]+/gi,
  
  // Database connection strings
  /postgres:\/\/[^\"'\s,}]+/gi,
  /mongodb:\/\/[^\"'\s,}]+/gi,
  /mysql:\/\/[^\"'\s,}]+/gi,
  
  // Supabase keys and URLs
  /sb_[\w\-\.]+/gi,
  /eyJ[A-Za-z0-9_\/+-]*={0,2}/g, // JWT tokens
]

/**
 * Edge-Safe Secure Logger
 * Works in all runtime environments without Node.js-specific APIs
 */
class EdgeSafeLogger {
  private logBuffer: EdgeSafeLogEntry[] = []
  private logThrottle: Map<string, number> = new Map()
  private isProduction: boolean
  private logger: ReturnType<typeof runtimeCapabilities.getLogger>
  private timers: ReturnType<typeof runtimeCapabilities.getTimers>
  private flushIntervalId: any = null
  private cleanupIntervalId: any = null

  constructor() {
    this.isProduction = safeGetEnv('NODE_ENV') === 'production'
    this.logger = runtimeCapabilities.getLogger()
    this.timers = runtimeCapabilities.getTimers()
    
    // Initialize runtime-appropriate intervals
    this.initializeTimers()
  }

  /**
   * Initialize timer-based functionality if supported
   */
  private initializeTimers(): void {
    if (runtimeCapabilities.canUseTimers() && this.timers.setInterval) {
      // Auto-flush logs every 5 seconds in development
      if (!this.isProduction) {
        this.flushIntervalId = this.timers.setInterval(() => this.flushLogs(), 5000)
      }
      
      // Cleanup throttle map every hour
      this.cleanupIntervalId = this.timers.setInterval(() => this.cleanupThrottle(), 60 * 60 * 1000)
    }
  }

  /**
   * Cleanup intervals on shutdown (if possible)
   */
  public cleanup(): void {
    if (this.timers.clearInterval) {
      if (this.flushIntervalId) {
        this.timers.clearInterval(this.flushIntervalId)
        this.flushIntervalId = null
      }
      if (this.cleanupIntervalId) {
        this.timers.clearInterval(this.cleanupIntervalId)
        this.cleanupIntervalId = null
      }
    }
    
    // Flush any remaining logs
    this.flushLogs()
  }

  /**
   * Sanitize log data to remove sensitive information
   */
  private sanitizeLogData(data: any): any {
    if (data === null || data === undefined) return data
    
    let sanitized = typeof data === 'string' ? data : JSON.stringify(data)
    
    // Replace sensitive patterns with placeholder
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    
    // Additional safety - remove any remaining tokens/keys
    sanitized = sanitized.replace(/["'][\w\-\.]{32,}["']/g, '"[REDACTED]"')
    
    try {
      return JSON.parse(sanitized)
    } catch {
      return sanitized
    }
  }

  /**
   * Check if logging should be throttled for this message
   */
  private shouldThrottle(messageKey: string, windowMs: number = 60000, maxCount: number = 10): boolean {
    const now = Date.now()
    const key = `${messageKey}:${Math.floor(now / windowMs)}`
    const currentCount = this.logThrottle.get(key) || 0
    
    if (currentCount >= maxCount) {
      return true
    }
    
    this.logThrottle.set(key, currentCount + 1)
    return false
  }

  /**
   * Cleanup expired throttle entries
   */
  private cleanupThrottle(): void {
    const now = Date.now()
    for (const [key, timestamp] of this.logThrottle.entries()) {
      if (now - timestamp > 3600000) { // 1 hour
        this.logThrottle.delete(key)
      }
    }
  }

  /**
   * Create standardized log context
   */
  private createLogContext(context: Partial<LogContext> = {}): LogContext {
    return {
      timestamp: Date.now(),
      environment: safeGetEnv('NODE_ENV', 'development'),
      component: 'aiedulog-api',
      runtime: runtimeCapabilities.getRuntime(),
      ...context
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context: LogContext, error?: Error): void {
    // Sanitize all log data
    const sanitizedMessage = this.sanitizeLogData(message)
    const sanitizedContext = this.sanitizeLogData(context)
    
    // Create log entry
    const logEntry: EdgeSafeLogEntry = {
      level,
      message: sanitizedMessage,
      context: sanitizedContext,
      timestamp: Date.now(),
      ...(error && {
        error: {
          name: error.name,
          message: this.sanitizeLogData(error.message),
          stack: this.isProduction ? undefined : this.sanitizeLogData(error.stack)
        }
      })
    }

    // In production, only log important events
    if (this.isProduction && level < LogLevel.WARN) {
      return
    }

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry)
    
    // Console output for development
    if (!this.isProduction) {
      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'AUDIT']
      const timestamp = new Date().toISOString()
      
      const logMessage = `[${levelNames[level]}] ${timestamp} - ${sanitizedMessage}`
      
      if (level >= LogLevel.ERROR) {
        this.logger.error(logMessage, sanitizedContext)
        if (error && !this.isProduction) {
          this.logger.error('Error details:', error)
        }
      } else if (level === LogLevel.WARN) {
        this.logger.warn(logMessage, sanitizedContext)
      } else {
        this.logger.log(logMessage, sanitizedContext)
      }
    }

    // Flush immediately for high-severity events
    if (level >= LogLevel.ERROR) {
      this.flushLogs()
    }
  }

  /**
   * Flush log buffer to persistent storage
   */
  private flushLogs(): void {
    if (this.logBuffer.length === 0) return

    // In a real implementation, send to log aggregation service
    // For now, we'll just clear the buffer
    const logsToFlush = [...this.logBuffer]
    this.logBuffer.length = 0

    // TODO: Send to logging service (e.g., DataDog, CloudWatch, etc.)
    if (this.isProduction && logsToFlush.some(log => log.level >= LogLevel.SECURITY)) {
      // In production, send security events to monitoring system
      this.sendToMonitoringSystem(logsToFlush.filter(log => log.level >= LogLevel.SECURITY))
    }
  }

  /**
   * Send critical events to monitoring system
   */
  private sendToMonitoringSystem(events: EdgeSafeLogEntry[]): void {
    // TODO: Integrate with monitoring service
    // This would typically send to DataDog, New Relic, etc.
    this.logger.warn('🚨 SECURITY EVENTS DETECTED:', events.length)
  }

  // Public API methods

  /**
   * Log debug information (development only)
   */
  debug(message: string, context: Partial<LogContext> = {}): void {
    if (!this.isProduction) {
      this.log(LogLevel.DEBUG, message, this.createLogContext(context))
    }
  }

  /**
   * Log general information
   */
  info(message: string, context: Partial<LogContext> = {}): void {
    this.log(LogLevel.INFO, message, this.createLogContext(context))
  }

  /**
   * Log warnings
   */
  warn(message: string, context: Partial<LogContext> = {}): void {
    this.log(LogLevel.WARN, message, this.createLogContext(context))
  }

  /**
   * Log errors with optional error object
   * Supports both new and legacy API signatures for backward compatibility
   */
  error(message: string, contextOrError?: Partial<LogContext> | Error, errorOrContext?: Error | Partial<LogContext>): void {
    const throttleKey = `error:${message.substring(0, 50)}`
    if (!this.shouldThrottle(throttleKey, 60000, 5)) {
      let context: Partial<LogContext> = {}
      let error: Error | undefined
      
      // Handle different API signatures
      if (contextOrError instanceof Error) {
        // Legacy signature: error(message, error, context)
        error = contextOrError
        context = (errorOrContext as Partial<LogContext>) || {}
      } else {
        // New signature: error(message, context, error)
        context = contextOrError || {}
        error = errorOrContext as Error
      }
      
      this.log(LogLevel.ERROR, message, this.createLogContext(context), error)
    }
  }

  /**
   * Log security events with automatic threat detection
   */
  security(message: string, context: Partial<LogContext> = {}): void {
    const throttleKey = `security:${message.substring(0, 50)}`
    if (!this.shouldThrottle(throttleKey, 30000, 3)) {
      this.log(LogLevel.SECURITY, `[SECURITY] ${message}`, this.createLogContext(context))
    }
  }

  /**
   * Log security events with structured data
   */
  logSecurityEvent(event: SecurityEventType | string, eventData: Partial<SecurityEvent>): void {
    const securityEvent: SecurityEvent = {
      type: event,
      severity: eventData.severity || 'MEDIUM',
      message: eventData.message || `Security event: ${event}`,
      context: this.createLogContext(eventData.context || {}),
      metadata: eventData.metadata || {}
    }

    // Don't throttle critical security events
    const shouldSkip = securityEvent.severity !== 'CRITICAL' && 
      this.shouldThrottle(`security:${event}`, 30000, 3)

    if (!shouldSkip) {
      this.log(LogLevel.SECURITY, `[${securityEvent.severity}] ${securityEvent.message}`, {
        ...securityEvent.context,
        eventType: securityEvent.type,
        severity: securityEvent.severity,
        metadata: securityEvent.metadata
      })

      // Trigger immediate alerting for critical events
      if (securityEvent.severity === 'CRITICAL') {
        this.triggerSecurityAlert(securityEvent)
      }
    }
  }

  /**
   * Log audit events for compliance
   */
  logAuditEvent(action: string, resource: string, result: 'SUCCESS' | 'FAILURE' | 'DENIED', context: Partial<LogContext> = {}, details?: Record<string, any>): void {
    const auditEvent: AuditEvent = {
      action,
      resource,
      result,
      context: this.createLogContext(context),
      details
    }

    this.log(LogLevel.AUDIT, `[AUDIT] ${action} on ${resource} - ${result}`, {
      ...auditEvent.context,
      auditAction: action,
      auditResource: resource,
      auditResult: result,
      auditDetails: details
    })
  }

  /**
   * Trigger immediate security alert (for critical events)
   */
  private triggerSecurityAlert(event: SecurityEvent): void {
    // TODO: Integrate with alerting system (Slack, PagerDuty, etc.)
    this.logger.error('🚨 CRITICAL SECURITY ALERT:', {
      type: event.type,
      message: event.message,
      context: event.context,
      timestamp: new Date().toISOString()
    })

    // In production, this would send immediate notifications
    if (this.isProduction) {
      // Send to incident management system
      // Alert security team
      // Log to SIEM
    }
  }

  /**
   * Log API calls for monitoring
   */
  logAPICall(type: 'request_start' | 'request_complete' | 'request_failed', data: Record<string, any>): void {
    const message = `API ${type}: ${data.method || 'Unknown'} ${data.url || 'Unknown'}`
    this.info(message, {
      requestId: data.requestId,
      apiCallType: type,
      ...data
    })
  }

  /**
   * Log database queries for audit
   */
  logDatabaseQuery(type: 'supabase_query' | 'direct_query', data: Record<string, any>): void {
    if (!this.isProduction) { // Only in development for debugging
      this.debug(`Database ${type}`, {
        queryType: type,
        ...data
      })
    }
  }

  /**
   * Log authentication events
   */
  logAuthEvent(event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'session_expired', userId?: string, context: Partial<LogContext> = {}): void {
    const severity = event.includes('failure') ? 'HIGH' : 'MEDIUM'
    this.logSecurityEvent(`authentication_${event}`, {
      severity,
      context: {
        ...context,
        userId,
        authEvent: event
      }
    })
  }

  /**
   * Force flush all pending logs
   */
  public flush(): void {
    this.flushLogs()
  }

  /**
   * Get current log statistics
   */
  public getStats(): { bufferSize: number; throttleEntries: number; runtime: string } {
    return {
      bufferSize: this.logBuffer.length,
      throttleEntries: this.logThrottle.size,
      runtime: runtimeCapabilities.getRuntime()
    }
  }
}

// Export singleton instance
export const edgeSafeLogger = new EdgeSafeLogger()

// Note: Process signal handling is intentionally omitted to maintain
// Edge Runtime compatibility. Applications using Node.js can manually
// call edgeSafeLogger.cleanup() during shutdown if needed.

// Export convenience alias
export const runtimeSafeLogger = edgeSafeLogger

export default edgeSafeLogger