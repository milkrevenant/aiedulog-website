/**
 * API Security Middleware - Comprehensive Request Protection
 * 
 * CRITICAL SECURITY FEATURES:
 * - SQL injection prevention
 * - XSS protection  
 * - CSRF validation
 * - Input sanitization
 * - Rate limiting
 * - Request validation
 * - Security headers
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiter } from '@/lib/security/rateLimiter'
import { secureLogger, SecurityEventType } from '@/lib/security/secure-logger'
// Note: createClient from server is imported dynamically to avoid build issues

// Security configuration types
export interface SecurityConfig {
  // Rate limiting
  rateLimit?: {
    endpoint: string
    skipForAuthenticated?: boolean
  }
  
  // Authentication requirements
  auth?: {
    required: boolean
    roles?: string[]
    permissions?: string[]
  }
  
  // Input validation
  validation?: {
    sanitizeInput: boolean
    maxRequestSize: number
    allowedMethods: string[]
    requiredHeaders?: string[]
  }
  
  // CSRF protection
  csrf?: {
    enabled: boolean
    skipForSameOrigin?: boolean
  }
  
  // Audit logging
  audit?: {
    logRequests: boolean
    logResponses: boolean
    sensitivity: 'public' | 'internal' | 'sensitive' | 'restricted'
  }
  
  // Additional security checks
  security?: {
    validateOrigin: boolean
    blockSuspiciousPatterns: boolean
    requireSecureHeaders: boolean
  }
}

// Request context with security metadata
export interface SecurityContext {
  requestId: string
  timestamp: number
  ipAddress: string
  userAgent: string
  origin?: string
  userId?: string
  userRole?: string
  sessionValid: boolean
  riskScore: number
  flags: string[]
}

// Security validation result
interface SecurityValidationResult {
  allowed: boolean
  status?: number
  error?: {
    code: string
    message: string
    details?: any
  }
  warnings?: string[]
  context: SecurityContext
}

/**
 * Advanced input sanitization with pattern detection
 */
class InputSanitizer {
  private static readonly SQL_INJECTION_PATTERNS = [
    // Basic SQL injection attempts
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"].*['"]\s*=\s*['"].*['"])/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/gi,
    /(\bhex\(|\bchar\(|\bascii\(|\bord\()/gi,
    /(\bunion\s+select|\bunion\s+all\s+select)/gi,
    
    // Advanced SQL injection patterns
    /(benchmark\s*\(|\bsleep\s*\(|\bwaitfor\s+delay)/gi,
    /(load_file\s*\(|\binto\s+outfile|\binto\s+dumpfile)/gi,
    /(\buser\(\)|\bdatabase\(\)|\bversion\(\))/gi,
    /(information_schema|mysql\.user|pg_user)/gi
  ]
  
  private static readonly XSS_PATTERNS = [
    // Script tag variations
    /<[^>]*script[^>]*>/gi,
    /<[^>]*javascript:[^>]*>/gi,
    /<[^>]*vbscript:[^>]*>/gi,
    /<[^>]*expression\s*\([^>]*>/gi,
    /<[^>]*data:text\/html[^>]*>/gi,
    
    // Event handlers
    /on\w+\s*=\s*[^>]*>/gi,
    /(onclick|onload|onerror|onmouseover|onfocus|onblur|onsubmit)/gi,
    
    // Other dangerous tags
    /<[^>]*(iframe|object|embed|applet|form)[^>]*>/gi,
    /<[^>]*style\s*=.*expression\s*\([^>]*>/gi,
    /<[^>]*href\s*=\s*['"]javascript:[^>]*>/gi
  ]
  
  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ]
  
  private static readonly COMMAND_INJECTION_PATTERNS = [
    /(\||&|;|`|\$\(|\$\{)/g,
    /(nc|netcat|wget|curl|bash|sh|cmd|powershell)/gi,
    /(\|\s*(cat|ls|pwd|whoami|id|uname))/gi
  ]

  static sanitizeString(input: string, context: SecurityContext): { sanitized: string; threats: string[] } {
    let sanitized = input
    const threats: string[] = []
    
    // Check for SQL injection
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('sql_injection')
        sanitized = sanitized.replace(pattern, '')
      }
    }
    
    // Check for XSS
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('xss_attempt')
        sanitized = sanitized.replace(pattern, '')
      }
    }
    
    // Check for path traversal
    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('path_traversal')
        sanitized = sanitized.replace(pattern, '')
      }
    }
    
    // Check for command injection
    for (const pattern of this.COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push('command_injection')
        sanitized = sanitized.replace(pattern, '')
      }
    }
    
    // HTML entity encoding for remaining special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
    
    // Length limit
    if (sanitized.length > 10000) {
      threats.push('oversized_input')
      sanitized = sanitized.substring(0, 10000)
    }
    
    return { sanitized, threats }
  }
  
  static sanitizeObject(obj: any, context: SecurityContext): { sanitized: any; threats: string[] } {
    const threats: string[] = []
    
    if (obj === null || obj === undefined) {
      return { sanitized: obj, threats }
    }
    
    if (typeof obj === 'string') {
      const result = this.sanitizeString(obj, context)
      return { sanitized: result.sanitized, threats: result.threats }
    }
    
    if (Array.isArray(obj)) {
      const sanitized: any[] = []
      for (const item of obj) {
        const result = this.sanitizeObject(item, context)
        sanitized.push(result.sanitized)
        threats.push(...result.threats)
      }
      return { sanitized, threats }
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const keyResult = this.sanitizeString(key, context)
        const valueResult = this.sanitizeObject(value, context)
        
        sanitized[keyResult.sanitized] = valueResult.sanitized
        threats.push(...keyResult.threats, ...valueResult.threats)
      }
      return { sanitized, threats }
    }
    
    return { sanitized: obj, threats }
  }
}

/**
 * Security context analyzer
 */
class SecurityAnalyzer {
  static async analyzeRequest(request: NextRequest): Promise<SecurityContext> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const timestamp = Date.now()
    
    // Extract client information
    const ipAddress = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const origin = request.headers.get('origin') || undefined
    
    // Initialize context
    const context: SecurityContext = {
      requestId,
      timestamp,
      ipAddress,
      userAgent,
      origin,
      sessionValid: false,
      riskScore: 0,
      flags: []
    }
    
    // Try to get user information
    try {
      // Dynamically import server client to avoid build issues
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        context.userId = user.id
        context.sessionValid = true
        
        // Try to get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          context.userRole = profile.role
        }
      }
    } catch (error) {
      // Don't fail if we can't get user context
      context.flags.push('auth_context_error')
    }
    
    // Calculate risk score
    context.riskScore = await this.calculateRiskScore(request, context)
    
    return context
  }
  
  private static getClientIP(request: NextRequest): string {
    // Check various headers for real IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()
    
    return 'unknown' // NextRequest doesn't have ip property in all environments
  }
  
  private static async calculateRiskScore(request: NextRequest, context: SecurityContext): Promise<number> {
    let riskScore = 0
    
    // IP-based risk factors
    if (context.ipAddress === 'unknown') riskScore += 10
    
    // User agent risk factors
    if (!context.userAgent || context.userAgent === 'unknown') riskScore += 15
    if (context.userAgent.includes('bot') || context.userAgent.includes('crawler')) riskScore += 5
    
    // Origin risk factors
    if (!context.origin && request.method !== 'GET') riskScore += 20
    
    // Rate limiting history
    try {
      const rateLimitStatus = await rateLimiter.getRateLimitStatus(context.ipAddress, 'api:general')
      if (!rateLimitStatus.allowed) riskScore += 30
      if (rateLimitStatus.remaining < 5) riskScore += 10
    } catch (error) {
      riskScore += 5
    }
    
    // Request patterns
    const url = request.url.toLowerCase()
    if (url.includes('admin') || url.includes('config')) riskScore += 10
    if (url.includes('../') || url.includes('..\\')) riskScore += 25
    
    // Header analysis
    const headers = request.headers
    if (!headers.get('accept')) riskScore += 5
    if (!headers.get('accept-language')) riskScore += 5
    
    return Math.min(riskScore, 100) // Cap at 100
  }
}

/**
 * CSRF validation
 */
class CSRFValidator {
  private static readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
  private static readonly ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://aiedulog.vercel.app' // Add your production domain
  ]
  
  static async validateCSRF(request: NextRequest, context: SecurityContext): Promise<boolean> {
    // Skip CSRF for safe methods
    if (this.SAFE_METHODS.includes(request.method)) {
      return true
    }
    
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')
    
    // Check origin header
    if (origin) {
      const allowedOrigins = [
        ...this.ALLOWED_ORIGINS,
        `https://${host}`,
        `http://${host}`
      ]
      
      if (!allowedOrigins.includes(origin)) {
        secureLogger.logSecurityEvent(SecurityEventType.CSRF_ATTACK_DETECTED, {
          severity: 'HIGH',
          context: {
            requestId: context.requestId,
            origin,
            host,
            method: request.method
          }
        })
        return false
      }
    }
    
    // Check referer header as backup
    if (!origin && referer) {
      try {
        const refererUrl = new URL(referer)
        const allowedHosts = [host, 'localhost:3000', 'localhost:3001']
        
        if (!allowedHosts.includes(refererUrl.host)) {
          secureLogger.logSecurityEvent(SecurityEventType.CSRF_ATTACK_DETECTED, {
            severity: 'HIGH',
            context: {
              requestId: context.requestId,
              referer,
              host,
              method: request.method
            }
          })
          return false
        }
      } catch (error) {
        return false
      }
    }
    
    // For state-changing methods without proper origin/referer, reject
    if (!origin && !referer && !this.SAFE_METHODS.includes(request.method)) {
      secureLogger.logSecurityEvent(SecurityEventType.CSRF_ATTACK_DETECTED, {
        severity: 'MEDIUM',
        context: {
          requestId: context.requestId,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries())
        }
      })
      return false
    }
    
    return true
  }
}

/**
 * Main security middleware function
 */
export async function validateSecurity(
  request: NextRequest, 
  config: SecurityConfig = {}
): Promise<SecurityValidationResult> {
  
  // Analyze request and create security context
  const context = await SecurityAnalyzer.analyzeRequest(request)
  
  // Initialize result
  const result: SecurityValidationResult = {
    allowed: true,
    context,
    warnings: []
  }
  
  try {
    // 1. Method validation
    if (config.validation?.allowedMethods && !config.validation.allowedMethods.includes(request.method)) {
      secureLogger.logSecurityEvent('method_not_allowed', {
        severity: 'MEDIUM',
        context: { requestId: context.requestId, method: request.method }
      })
      
      return {
        allowed: false,
        status: 405,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'HTTP method not allowed' },
        context
      }
    }
    
    // 2. Request size validation
    if (config.validation?.maxRequestSize) {
      const contentLength = parseInt(request.headers.get('content-length') || '0')
      if (contentLength > config.validation.maxRequestSize) {
        secureLogger.logSecurityEvent('request_too_large', {
          severity: 'MEDIUM',
          context: { requestId: context.requestId, contentLength }
        })
        
        return {
          allowed: false,
          status: 413,
          error: { code: 'REQUEST_TOO_LARGE', message: 'Request payload too large' },
          context
        }
      }
    }
    
    // 3. Rate limiting
    if (config.rateLimit) {
      const skipRateLimit = config.rateLimit.skipForAuthenticated && context.sessionValid
      
      if (!skipRateLimit) {
        const rateLimitResult = await rateLimiter.checkMultipleIdentifiers(
          context.ipAddress,
          context.userId || null,
          config.rateLimit.endpoint,
          context.userAgent
        )
        
        if (!rateLimitResult.allowed) {
          secureLogger.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
            severity: 'HIGH',
            context: {
              requestId: context.requestId,
              endpoint: config.rateLimit.endpoint,
              ipAddress: context.ipAddress.substring(0, 10) + '...'
            }
          })
          
          return {
            allowed: false,
            status: 429,
            error: { 
              code: 'RATE_LIMIT_EXCEEDED', 
              message: 'Too many requests. Please try again later.',
              details: {
                retryAfter: rateLimitResult.retryAfter,
                resetTime: rateLimitResult.resetTime
              }
            },
            context
          }
        }
      }
    }
    
    // 4. Authentication validation
    if (config.auth?.required && !context.sessionValid) {
      secureLogger.logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, {
        severity: 'MEDIUM',
        context: { requestId: context.requestId, reason: 'no_valid_session' }
      })
      
      return {
        allowed: false,
        status: 401,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Valid authentication required' },
        context
      }
    }
    
    // 5. Role-based authorization
    if (config.auth?.roles && context.userRole && !config.auth.roles.includes(context.userRole)) {
      secureLogger.logSecurityEvent(SecurityEventType.AUTHORIZATION_FAILURE, {
        severity: 'HIGH',
        context: { 
          requestId: context.requestId, 
          userRole: context.userRole,
          requiredRoles: config.auth.roles
        }
      })
      
      return {
        allowed: false,
        status: 403,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions' },
        context
      }
    }
    
    // 6. CSRF validation
    if (config.csrf?.enabled) {
      const csrfValid = await CSRFValidator.validateCSRF(request, context)
      if (!csrfValid) {
        return {
          allowed: false,
          status: 403,
          error: { code: 'CSRF_VALIDATION_FAILED', message: 'Invalid request origin' },
          context
        }
      }
    }
    
    // 7. Input sanitization (if request has body)
    if (config.validation?.sanitizeInput && request.method !== 'GET') {
      try {
        const body = await request.json()
        const sanitizationResult = InputSanitizer.sanitizeObject(body, context)
        
        if (sanitizationResult.threats.length > 0) {
          // Log security threats
          for (const threat of sanitizationResult.threats) {
            secureLogger.logSecurityEvent(threat as SecurityEventType, {
              severity: 'HIGH',
              context: { 
                requestId: context.requestId,
                threatType: threat,
                inputSize: JSON.stringify(body).length
              }
            })
          }
          
          // For high-risk threats, block the request
          const highRiskThreats = ['sql_injection', 'command_injection']
          if (sanitizationResult.threats.some(t => highRiskThreats.includes(t))) {
            return {
              allowed: false,
              status: 400,
              error: { code: 'MALICIOUS_INPUT_DETECTED', message: 'Request contains potentially malicious content' },
              context
            }
          }
          
          result.warnings?.push(`Input sanitization applied: ${sanitizationResult.threats.join(', ')}`)
        }
      } catch (error) {
        // Body might not be JSON or might be empty - that's OK
      }
    }
    
    // 8. Risk score evaluation
    if (context.riskScore > 80) {
      secureLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
        severity: 'HIGH',
        context: { 
          requestId: context.requestId,
          riskScore: context.riskScore,
          flags: context.flags
        }
      })
      
      // Don't block high-risk requests, but log them for analysis
      result.warnings?.push(`High risk score: ${context.riskScore}`)
    }
    
    // Log successful validation for audit
    if (config.audit?.logRequests) {
      secureLogger.logAuditEvent('api_request_validated', request.url, 'SUCCESS', {
        requestId: context.requestId,
        method: request.method,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress.substring(0, 10) + '...'
      })
    }
    
    return result
    
  } catch (error) {
    // Log validation error
    secureLogger.error('Security validation error', error as Error, {
      requestId: context.requestId,
      url: request.url
    })
    
    // Fail secure - reject on validation error
    return {
      allowed: false,
      status: 500,
      error: { code: 'SECURITY_VALIDATION_ERROR', message: 'Security validation failed' },
      context
    }
  }
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse, context: SecurityContext): NextResponse {
  // Core security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;")
  
  // Request tracking headers
  response.headers.set('X-Request-ID', context.requestId)
  response.headers.set('X-Timestamp', context.timestamp.toString())
  
  // Remove server information
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  return response
}

/**
 * Convenience function to wrap API handlers with security
 */
export function withSecurityMiddleware(
  handler: (request: NextRequest, context: SecurityContext) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    // Validate security
    const validationResult = await validateSecurity(request, config)
    
    if (!validationResult.allowed) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          meta: {
            requestId: validationResult.context.requestId,
            timestamp: validationResult.context.timestamp
          }
        },
        { status: validationResult.status || 400 }
      )
      
      return applySecurityHeaders(errorResponse, validationResult.context)
    }
    
    try {
      // Call the handler with security context
      const response = await handler(request, validationResult.context)
      
      // Apply security headers
      return applySecurityHeaders(response, validationResult.context)
      
    } catch (error) {
      // Log handler error
      secureLogger.error('API handler error', error as Error, {
        requestId: validationResult.context.requestId
      })
      
      // Return secure error response
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred'
          },
          meta: {
            requestId: validationResult.context.requestId,
            timestamp: validationResult.context.timestamp
          }
        },
        { status: 500 }
      )
      
      return applySecurityHeaders(errorResponse, validationResult.context)
    }
  }
}

export default withSecurityMiddleware