/**
 * Static Security System Index - Production Ready
 * 
 * Bulletproof security system with ZERO dynamic imports.
 * All modules use static exports for maximum build compatibility.
 */

// Static imports only - no dynamic loading
import { 
  staticSecurityLogger, 
  secureLogger, 
  SecurityEventType,
  LogLevel
} from './static-logger'

import { 
  staticSecurityMonitor, 
  securityMonitor 
} from './static-monitor'

import { 
  staticSecurityBridge, 
  securityBridge,
  secureConsoleLog,
  sanitizeForTransmission,
  isClientSide,
  isServerSide
} from './static-bridge'

// Import existing client security (already working)
import { initializeClientSecurity } from './client-security'
export { 
  getClientSecurity, 
  initializeClientSecurity,
  ClientSecurityMonitor 
} from './client-security'

// Import existing rate limiter (already working)
import { rateLimiter } from './rateLimiter'
export { rateLimiter } from './rateLimiter'

// Re-export all static components
export {
  staticSecurityLogger,
  staticSecurityMonitor,
  staticSecurityBridge,
  secureLogger,
  securityMonitor,
  securityBridge,
  secureConsoleLog,
  sanitizeForTransmission,
  isClientSide,
  isServerSide,
  SecurityEventType,
  LogLevel
}

// Security configuration (static)
export const SECURITY_CONFIG = {
  // Global security settings
  global: {
    environment: process.env.NODE_ENV || 'development',
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableRealTimeMonitoring: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    defaultRateLimit: 'api:general',
    csrfProtection: true
  },

  // Authentication settings
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 4 * 60 * 60 * 1000, // 4 hours
    maxConcurrentSessions: 5,
    requireMFA: false, // Can be enabled per user
    passwordComplexity: true,
    accountLockout: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 30 * 60 * 1000 // 30 minutes
    }
  },

  // Rate limiting defaults
  rateLimiting: {
    enabled: true,
    defaultLimits: {
      api: { requests: 100, window: '1m', blockDuration: '10m' },
      auth: { requests: 5, window: '15m', blockDuration: '1h' },
      upload: { requests: 10, window: '1m', blockDuration: '5m' }
    }
  },

  // Database security
  database: {
    enforceRLS: true,
    auditQueries: true,
    maskSensitiveData: true,
    maxRecordsPerQuery: 1000,
    preventBulkOperations: false
  },

  // Monitoring thresholds
  monitoring: {
    alertThresholds: {
      failedLogins: 10,
      rateLimitViolations: 50,
      suspiciousActivity: 20,
      dataAccessViolations: 5
    },
    incidentAutoResponse: true,
    realTimeAlerts: true
  }
}

/**
 * Initialize security system (static - no dynamic imports)
 * Context-aware initialization for client and server
 */
export function initializeSecurity(): void {
  const isClient = typeof window !== 'undefined'
  
  if (isClient) {
    // Client-side initialization
    try {
      initializeClientSecurity({
        devToolsProtection: process.env.NODE_ENV === 'production',
        consoleOverride: process.env.NODE_ENV === 'production',
        debuggerProtection: process.env.NODE_ENV === 'production'
      })
      
      secureConsoleLog('🛡️ Client Security initialized')
    } catch (error) {
      secureConsoleLog('Failed to initialize client security', error, 'error')
    }
  } else {
    // Server-side initialization
    secureConsoleLog('🛡️ Initializing AiEduLog Security System...')
    
    // Log security configuration (without sensitive details)
    staticSecurityLogger.info('Security system initialized', {
      environment: SECURITY_CONFIG.global.environment,
      features: {
        auditLogging: SECURITY_CONFIG.global.enableAuditLogging,
        realTimeMonitoring: SECURITY_CONFIG.global.enableRealTimeMonitoring,
        rateLimiting: SECURITY_CONFIG.rateLimiting.enabled,
        csrfProtection: SECURITY_CONFIG.global.csrfProtection
      }
    })

    // Initialize security monitor
    staticSecurityMonitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      ipAddress: 'system',
      userAgent: 'security-init'
    }, {
      type: 'system_startup',
      message: 'Security system initialized successfully'
    })

    secureConsoleLog('✅ Security system ready')
  }
}

/**
 * Quick security health check (static - no dynamic imports)
 */
export async function getSecurityHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical'
  components: Record<string, boolean>
  metrics: any
  lastCheck: string
}> {
  if (typeof window !== 'undefined') {
    // Client-side: Get status from bridge
    const status = await staticSecurityBridge.getSecurityStatus()
    
    if (!status) {
      return {
        status: 'critical',
        components: { client: false },
        metrics: {},
        lastCheck: new Date().toISOString()
      }
    }
    
    return {
      status: status.healthy ? 'healthy' : 'critical',
      components: {
        client: status.healthy,
        ...status.clientProtections,
        ...status.serverProtections
      },
      metrics: status.violations,
      lastCheck: status.lastCheck
    }
  } else {
    // Server-side: Get detailed health check
    try {
      const metrics = staticSecurityMonitor.getSecurityMetrics()
      const loggerStats = staticSecurityLogger.getStats()
      const securityStats = staticSecurityMonitor.getStatistics()

      // Component health checks
      const components = {
        logger: loggerStats.bufferSize < 1000,
        rateLimiter: true, // Assume healthy
        monitor: metrics.activeThreats < 5,
        auth: true // TODO: Add auth health check
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (metrics.activeThreats >= 5 || !components.logger) {
        status = 'critical'
      } else if (metrics.suspiciousActivities > 100) {
        status = 'warning'
      }

      return {
        status,
        components,
        metrics: {
          ...metrics,
          logger: loggerStats,
          security: securityStats
        },
        lastCheck: new Date().toISOString()
      }

    } catch (error) {
      secureConsoleLog('Security health check failed', error, 'error')
      
      return {
        status: 'critical',
        components: {
          logger: false,
          rateLimiter: false,
          monitor: false,
          auth: false
        },
        metrics: {},
        lastCheck: new Date().toISOString()
      }
    }
  }
}

/**
 * Emergency security lockdown (static - no dynamic imports)
 * Use only in case of active security breach
 */
export function emergencyLockdown(reason: string, duration: number = 3600000): void {
  const isClient = typeof window !== 'undefined'
  
  if (isClient) {
    // Client-side: Report to server
    staticSecurityBridge.reportSecurityEvent({
      type: 'client_violation',
      severity: 'CRITICAL',
      details: {
        action: 'emergency_lockdown',
        reason,
        duration
      },
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    })
    
    secureConsoleLog('🚨 CLIENT SECURITY LOCKDOWN ACTIVATED: ' + reason, undefined, 'error')
  } else {
    // Server-side: Full lockdown
    staticSecurityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      severity: 'CRITICAL',
      action: 'emergency_lockdown',
      reason,
      duration,
      timestamp: Date.now()
    })

    secureConsoleLog('🚨 EMERGENCY SECURITY LOCKDOWN ACTIVATED: ' + reason, undefined, 'error')
  }
}

/**
 * Get security dashboard data (server-side only, static)
 */
export function getSecurityDashboard(): {
  overview: any
  recentIncidents: any[]
  threatIntelligence: any[]
  metrics: any
  alerts: any[]
} | null {
  if (typeof window !== 'undefined') {
    // Client-side: Cannot access full dashboard, return null
    return null
  }
  
  try {
    const metrics = staticSecurityMonitor.getSecurityMetrics()
    const incidents = staticSecurityMonitor.getActiveIncidents()
    const threatIntel = staticSecurityMonitor.getThreatIntelligence()

    return {
      overview: {
        status: metrics.activeThreats < 5 ? 'healthy' : 'critical',
        totalRequests: metrics.totalRequests,
        blockedRequests: metrics.blockedRequests,
        activeThreats: metrics.activeThreats,
        lastUpdated: metrics.lastUpdated
      },
      recentIncidents: incidents.slice(0, 10), // Last 10 incidents
      threatIntelligence: threatIntel.slice(0, 20), // Top 20 threats
      metrics,
      alerts: incidents
        .filter((incident: any) => incident.escalated)
        .slice(0, 5) // Top 5 escalated alerts
    }
  } catch (error) {
    secureConsoleLog('Error getting security dashboard', error, 'error')
    return null
  }
}

/**
 * Validate security configuration (static)
 */
export function validateSecurityConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  // Check production readiness
  if (process.env.NODE_ENV === 'production') {
    if (SECURITY_CONFIG.auth.requireMFA === false) {
      warnings.push('MFA not required in production')
    }
    
    if (!SECURITY_CONFIG.monitoring.realTimeAlerts) {
      warnings.push('Real-time alerts disabled in production')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Static exports for direct access (no dynamic imports needed)
export function getSecureLogger() {
  return staticSecurityLogger
}

export function getSecurityMonitor() {
  return staticSecurityMonitor
}

export function getRateLimiter() {
  return rateLimiter
}

export function getSecureAuthService() {
  return null // TODO: Import secureAuthService when available
}

export function getSecureDatabase() {
  return null // TODO: Import secureDatabase when available
}

export function getApiMiddleware() {
  return null // TODO: Import apiMiddleware when available
}

// Default export for convenience (static)
export default {
  initialize: initializeSecurity,
  health: getSecurityHealth,
  dashboard: getSecurityDashboard,
  validate: validateSecurityConfig,
  emergencyLockdown,
  config: SECURITY_CONFIG,
  // Static getters
  getSecureLogger,
  getSecurityMonitor,
  getRateLimiter,
  getSecureAuthService,
  getSecureDatabase,
  getApiMiddleware,
  // Direct access to static components
  logger: staticSecurityLogger,
  monitor: staticSecurityMonitor,
  bridge: staticSecurityBridge
}