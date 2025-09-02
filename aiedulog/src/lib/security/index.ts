/**
 * Runtime-Safe Security System Index
 * 
 * Comprehensive security system that works across all runtime environments:
 * - Edge Runtime (Vercel, Cloudflare Workers)
 * - Node.js (API routes, middleware)
 * - Browser (client-side protection)
 * 
 * Uses factory pattern and runtime detection for maximum compatibility.
 */

// Runtime detection and core components
import { runtimeCapabilities, detectRuntime } from './runtime-detector'
import { edgeSafeLogger, SecurityEventType, LogLevel } from './edge-safe-logger'
import { 
  RuntimeSafeFactory,
  getSecurityLogger as getRuntimeLogger,
  getSecurityMonitor as getRuntimeMonitor, 
  getSecurityRateLimiter as getRuntimeRateLimiter,
  initializeSecurity as initFactory,
  cleanupSecurity
} from './runtime-safe-factory'

// Get runtime-appropriate security components
const secureLogger = getRuntimeLogger()
const securityMonitor = getRuntimeMonitor()
const securityRateLimiter = getRuntimeRateLimiter()
const runtime = detectRuntime()

// Runtime-safe utility functions
export const secureConsoleLog = (message: string, data?: any, level: string = 'info'): void => {
  const logger = runtimeCapabilities.getLogger()
  
  try {
    if (level === 'error') {
      logger.error(message, data)
    } else if (level === 'warn') {
      logger.warn(message, data)
    } else {
      logger.log(message, data)
    }
  } catch {
    // Silent fallback
  }
}

export const sanitizeForTransmission = (data: any): any => {
  // Basic sanitization that works in all runtimes
  if (!data) return data
  
  if (typeof data === 'string') {
    return data.replace(/[<>"'`]/g, '').trim().substring(0, 1000)
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeForTransmission(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForTransmission(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }
  
  return data
}

export const isClientSide = (): boolean => runtimeCapabilities.isClientSide()
export const isServerSide = (): boolean => runtimeCapabilities.isServerSide()

// Conditionally import client security if available
let clientSecurity: any = null
try {
  if (runtimeCapabilities.isBrowser()) {
    const clientSecurityModule = require('./client-security')
    clientSecurity = {
      getClientSecurity: clientSecurityModule.getClientSecurity,
      initializeClientSecurity: clientSecurityModule.initializeClientSecurity,
      ClientSecurityMonitor: clientSecurityModule.ClientSecurityMonitor
    }
  }
} catch {
  // Client security not available or not needed
}

// Export client security with fallbacks
export const getClientSecurity = clientSecurity?.getClientSecurity || (() => null)
export const initializeClientSecurity = clientSecurity?.initializeClientSecurity || (() => {})
export const ClientSecurityMonitor = clientSecurity?.ClientSecurityMonitor || class {}

// Export runtime-safe rate limiter
export const rateLimiter = securityRateLimiter

// Re-export all runtime-safe components
export {
  secureLogger,
  securityMonitor,
  securityRateLimiter,
  SecurityEventType,
  LogLevel,
  runtimeCapabilities,
  RuntimeSafeFactory
}

// Backward compatibility aliases
export const staticSecurityLogger = secureLogger
export const staticSecurityMonitor = securityMonitor
export const staticSecurityBridge = {
  reportSecurityEvent: (event: any) => securityMonitor.recordSecurityEvent(event.type, event.context, event.metadata),
  getSecurityStatus: () => RuntimeSafeFactory.getHealthStatus(),
  secureConsoleLog,
  sanitizeForTransmission,
  isClientSide,
  isServerSide
}

// Legacy compatibility
export const securityBridge = staticSecurityBridge

// Security configuration (runtime-safe)
export const SECURITY_CONFIG = {
  // Global security settings
  global: {
    environment: runtimeCapabilities.canUseProcessEnv() ? 
      (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'development' : 'unknown',
    enableSecurityHeaders: true,
    enableAuditLogging: true,
    enableRealTimeMonitoring: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    defaultRateLimit: 'api:general',
    csrfProtection: true,
    runtime: detectRuntime()
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
 * Initialize security system (runtime-safe)
 * Context-aware initialization for all runtime environments
 */
export function initializeSecurity(): void {
  secureConsoleLog(`🛡️ Initializing AiEduLog Security System (${runtime})...`)
  
  // Initialize factory components
  const components = initFactory()
  
  if (runtimeCapabilities.isClientSide()) {
    // Client-side initialization
    try {
      if (clientSecurity?.initializeClientSecurity) {
        const isProduction = SECURITY_CONFIG.global.environment === 'production'
        clientSecurity.initializeClientSecurity({
          devToolsProtection: isProduction,
          consoleOverride: isProduction,
          debuggerProtection: isProduction
        })
      }
      
      secureConsoleLog('🛡️ Client Security initialized')
    } catch (error) {
      secureConsoleLog('Failed to initialize client security', error, 'error')
    }
  } else {
    // Server-side initialization (Edge Runtime or Node.js)
    
    // Log security configuration (without sensitive details)
    secureLogger.info('Security system initialized', {
      environment: SECURITY_CONFIG.global.environment,
      runtime: SECURITY_CONFIG.global.runtime,
      features: {
        auditLogging: SECURITY_CONFIG.global.enableAuditLogging,
        realTimeMonitoring: SECURITY_CONFIG.global.enableRealTimeMonitoring,
        rateLimiting: SECURITY_CONFIG.rateLimiting.enabled,
        csrfProtection: SECURITY_CONFIG.global.csrfProtection
      },
      runtimeFeatures: runtimeCapabilities.getFeatures()
    })

    // Initialize security monitor
    securityMonitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      ipAddress: 'system',
      userAgent: 'security-init'
    }, {
      type: 'system_startup',
      message: `Security system initialized successfully in ${runtime} runtime`
    })

    secureConsoleLog('✅ Security system ready')
  }
}

/**
 * Quick security health check (runtime-safe)
 */
export async function getSecurityHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical'
  components: Record<string, boolean>
  metrics: any
  lastCheck: string
  runtime: string
}> {
  if (runtimeCapabilities.isClientSide()) {
    // Client-side: Get status from available components
    const healthStatus = RuntimeSafeFactory.getHealthStatus()
    
    return {
      status: healthStatus.logger && healthStatus.monitor ? 'healthy' : 'critical',
      components: {
        logger: healthStatus.logger,
        monitor: healthStatus.monitor,
        rateLimiter: healthStatus.rateLimiter,
        client: true
      },
      metrics: {},
      lastCheck: new Date().toISOString(),
      runtime: healthStatus.runtime
    }
  } else {
    // Server-side: Get detailed health check
    try {
      const metrics = securityMonitor.getSecurityMetrics()
      const loggerStats = secureLogger.getStats()
      const securityStats = securityMonitor.getStatistics()
      const healthStatus = RuntimeSafeFactory.getHealthStatus()

      // Component health checks
      const components = {
        logger: healthStatus.logger && (loggerStats.bufferSize < 1000),
        rateLimiter: healthStatus.rateLimiter,
        monitor: healthStatus.monitor && (metrics.activeThreats < 5),
        runtime: true
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
        lastCheck: new Date().toISOString(),
        runtime: healthStatus.runtime
      }

    } catch (error) {
      secureConsoleLog('Security health check failed', error, 'error')
      
      return {
        status: 'critical',
        components: {
          logger: false,
          rateLimiter: false,
          monitor: false,
          runtime: false
        },
        metrics: {},
        lastCheck: new Date().toISOString(),
        runtime: detectRuntime()
      }
    }
  }
}

/**
 * Emergency security lockdown (runtime-safe)
 * Use only in case of active security breach
 */
export function emergencyLockdown(reason: string, duration: number = 3600000): void {
  if (runtimeCapabilities.isClientSide()) {
    // Client-side: Report to server via security bridge
    staticSecurityBridge.reportSecurityEvent({
      type: 'client_violation',
      severity: 'CRITICAL',
      details: {
        action: 'emergency_lockdown',
        reason,
        duration
      },
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        runtime: detectRuntime()
      }
    })
    
    secureConsoleLog('🚨 CLIENT SECURITY LOCKDOWN ACTIVATED: ' + reason, undefined, 'error')
  } else {
    // Server-side: Full lockdown
    secureLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      severity: 'CRITICAL',
      context: {
        action: 'emergency_lockdown',
        reason,
        duration,
        runtime: detectRuntime(),
        timestamp: Date.now()
      }
    })

    securityMonitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      ipAddress: 'system',
      action: 'emergency_lockdown',
      reason
    }, {
      severity: 'CRITICAL',
      duration,
      runtime: detectRuntime()
    })

    secureConsoleLog('🚨 EMERGENCY SECURITY LOCKDOWN ACTIVATED: ' + reason, undefined, 'error')
  }
}

/**
 * Get security dashboard data (server-side only, runtime-safe)
 */
export function getSecurityDashboard(): {
  overview: any
  recentIncidents: any[]
  threatIntelligence: any[]
  metrics: any
  alerts: any[]
  runtime: string
} | null {
  if (runtimeCapabilities.isClientSide()) {
    // Client-side: Cannot access full dashboard, return null
    return null
  }
  
  try {
    const metrics = securityMonitor.getSecurityMetrics()
    const incidents = securityMonitor.getActiveIncidents()
    const threatIntel = securityMonitor.getThreatIntelligence()

    return {
      overview: {
        status: metrics.activeThreats < 5 ? 'healthy' : 'critical',
        totalRequests: metrics.totalRequests,
        blockedRequests: metrics.blockedRequests,
        activeThreats: metrics.activeThreats,
        lastUpdated: metrics.lastUpdated,
        runtime: detectRuntime()
      },
      recentIncidents: incidents.slice(0, 10), // Last 10 incidents
      threatIntelligence: threatIntel.slice(0, 20), // Top 20 threats
      metrics,
      alerts: incidents
        .filter((incident: any) => incident.escalated)
        .slice(0, 5), // Top 5 escalated alerts
      runtime: detectRuntime()
    }
  } catch (error) {
    secureConsoleLog('Error getting security dashboard', error, 'error')
    return null
  }
}

/**
 * Validate security configuration (runtime-safe)
 */
export function validateSecurityConfig(): { 
  valid: boolean
  errors: string[]
  warnings: string[]
  runtime: string
  features: any
} {
  const errors: string[] = []
  const warnings: string[] = []
  const features = runtimeCapabilities.getFeatures()
  const runtime = detectRuntime()

  // Check environment variables if process is available
  if (runtimeCapabilities.canUseProcessEnv()) {
    try {
      if (typeof process !== 'undefined' && process.env) {
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
      }
    } catch (error) {
      warnings.push('Unable to access environment variables')
    }
  } else {
    warnings.push(`Runtime ${runtime} does not support environment variables`)
  }

  // Runtime-specific validations
  if (runtime === 'edge') {
    if (!features.hasConsole) {
      warnings.push('Console logging not available in Edge Runtime')
    }
    if (!features.supportsTimers) {
      warnings.push('Timer-based features disabled in Edge Runtime')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    runtime,
    features
  }
}

// Runtime-safe exports for direct access
export function getSecureLogger() {
  return secureLogger
}

export function getSecurityMonitor() {
  return securityMonitor
}

export function getRateLimiter() {
  return securityRateLimiter
}

// Export factory functions with different names
export const getSecurityLogger = getRuntimeLogger
export const getMonitor = getRuntimeMonitor
export const getRateLimiterFactory = getRuntimeRateLimiter

export function getSecureAuthService() {
  try {
    return require('./secure-auth').secureAuthService
  } catch {
    return null
  }
}

export function getSecureDatabase() {
  try {
    return require('./secure-database')
  } catch {
    return null
  }
}

export function getApiMiddleware() {
  try {
    return require('./api-middleware')
  } catch {
    return null
  }
}

// Cleanup function for graceful shutdown
export function cleanupSecuritySystem(): void {
  cleanupSecurity()
  secureConsoleLog('🛡️ Security system cleaned up')
}

// Default export for convenience (runtime-safe)
export default {
  // Core functions
  initialize: initializeSecurity,
  health: getSecurityHealth,
  dashboard: getSecurityDashboard,
  validate: validateSecurityConfig,
  emergencyLockdown,
  cleanup: cleanupSecuritySystem,
  
  // Configuration
  config: SECURITY_CONFIG,
  
  // Getters
  getSecureLogger,
  getSecurityMonitor,
  getRateLimiter,
  getSecureAuthService,
  getSecureDatabase,
  getApiMiddleware,
  
  // Direct access to components
  logger: secureLogger,
  monitor: securityMonitor,
  rateLimiter: securityRateLimiter,
  bridge: staticSecurityBridge,
  
  // Runtime information
  runtime: detectRuntime(),
  capabilities: runtimeCapabilities,
  
  // Utilities
  secureConsoleLog,
  sanitizeForTransmission,
  isClientSide,
  isServerSide
}