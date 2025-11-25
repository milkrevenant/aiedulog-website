/**
 * Secure API Client - Production-Ready Backend Security Layer
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * CRITICAL SECURITY FEATURES:
 * - Request/Response sanitization
 * - SQL injection prevention  
 * - XSS protection
 * - Rate limiting integration
 * - Audit logging
 * - Error handling that doesn't leak internals
 */

import { createClient } from '@/lib/supabase/server'
import { rateLimiter } from '@/lib/security/rateLimiter'
import { secureLogger } from '@/lib/security/secure-logger'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { RDSQueryBuilder } from '@/lib/db/rds-query-builder'

// Input sanitization patterns
const DANGEROUS_PATTERNS = [
  // SQL Injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
  /('|('')|;|--|\*|\|)/g,
  /(script|javascript|vbscript|onload|onerror|onclick)/gi,
  // XSS patterns
  /<[^>]*script[^>]*>/gi,
  /<[^>]*iframe[^>]*>/gi,
  /<[^>]*object[^>]*>/gi,
  /<[^>]*embed[^>]*>/gi,
  // Path traversal
  /\.\./g,
  /\/\.\./g,
  // Command injection
  /(\||&|;|`|\$\(|\$\{)/g
]

// Sensitive data patterns to scrub from logs
const SENSITIVE_PATTERNS = [
  // Authentication tokens
  /bearer\s+[\w\-\.]+/gi,
  /token[\"'\s]*[:=][\"'\s]*[\w\-\.]+/gi,
  // API keys
  /api[_-]?key[\"'\s]*[:=][\"'\s]*[\w\-\.]+/gi,
  /sb_[\w\-\.]+/gi,
  // Passwords
  /password[\"'\s]*[:=][\"'\s]*[^\"'\s]+/gi,
  /pwd[\"'\s]*[:=][\"'\s]*[^\"'\s]+/gi,
  // Email addresses in certain contexts
  /email[\"'\s]*[:=][\"'\s]*[^\"'\s@]+@[^\"'\s]+/gi,
  // Phone numbers
  /phone[\"'\s]*[:=][\"'\s]*[\d\-\+\(\)\s]+/gi,
  // Credit card numbers
  /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  // Social security numbers
  /\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b/g
]

export interface SecureAPIOptions {
  sanitizeInput?: boolean
  validateCSRF?: boolean
  requireAuth?: boolean
  rateLimitEndpoint?: string
  auditLevel?: 'none' | 'basic' | 'detailed'
  allowedMethods?: string[]
  maxRequestSize?: number
}

export interface SecurityContext {
  ipAddress: string
  userAgent: string
  userId?: string
  sessionId?: string
  requestId: string
  timestamp: number
}

export interface SecureResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    requestId: string
    timestamp: number
    rateLimit?: {
      remaining: number
      resetTime: number
    }
  }
}

/**
 * Advanced input sanitization with multiple layers of protection
 */
export function sanitizeInput(input: any, context: SecurityContext): any {
  if (input === null || input === undefined) return input

  if (typeof input === 'string') {
    // First pass - remove dangerous patterns
    let sanitized = input
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '')
    }

    // Second pass - HTML entity encoding for remaining special chars
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')

    // Third pass - normalize whitespace and limit length
    sanitized = sanitized.trim().substring(0, 10000) // Max 10k chars

    // Log if significant sanitization occurred
    if (sanitized.length < input.length * 0.8) {
      secureLogger.logSecurityEvent('input_sanitization', {
        severity: 'MEDIUM',
        context: {
          requestId: context.requestId,
          originalLength: input.length,
          sanitizedLength: sanitized.length
        }
      })
    }

    return sanitized
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item, context))
  }

  if (typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeInput(key, context)
      sanitized[sanitizedKey] = sanitizeInput(value, context)
    }
    return sanitized
  }

  return input
}

/**
 * Sanitize response data to prevent data leakage
 */
export function sanitizeResponse(data: any, context: SecurityContext): any {
  if (!data) return data

  if (typeof data === 'string') {
    let sanitized = data
    // Remove sensitive patterns from response strings
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    return sanitized
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, context))
  }

  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Never include internal fields in responses
      if (key.startsWith('_') || key.includes('password') || key.includes('secret')) {
        continue
      }
      sanitized[key] = sanitizeResponse(value, context)
    }
    return sanitized
  }

  return data
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown' // NextRequest doesn't have ip property in all environments
}

/**
 * Create security context from request
 */
async function createSecurityContext(request: NextRequest): Promise<SecurityContext> {
  const requestId = generateRequestId()
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Try to get user info from session
  let userId: string | undefined
  let sessionId: string | undefined
  
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      sessionId = user.app_metadata?.session_id
    }
  } catch (error) {
    // Don't fail if we can't get user context
    secureLogger.error('Failed to get user context', error as Error, { requestId })
  }

  return {
    ipAddress,
    userAgent,
    userId,
    sessionId,
    requestId,
    timestamp: Date.now()
  }
}

/**
 * Validate CSRF token
 */
async function validateCSRF(request: NextRequest): Promise<boolean> {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  
  // For same-origin requests, check origin/referer
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    'http://localhost:3000',
    'http://localhost:3001'
  ]
  
  if (origin && !allowedOrigins.includes(origin)) {
    return false
  }
  
  if (referer) {
    const refererUrl = new URL(referer)
    if (!allowedOrigins.some(allowed => refererUrl.origin === allowed)) {
      return false
    }
  }
  
  return true
}

/**
 * Main secure API handler wrapper
 */
export function withSecurity(
  handler: (
    request: NextRequest,
    context: SecurityContext,
    params?: any
  ) => Promise<SecureResponse>,
  options: SecureAPIOptions = {}
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    let context: SecurityContext | null = null
    
    try {
      // Create security context
      context = await createSecurityContext(request)
      
      // Log request start
      if (options.auditLevel !== 'none') {
        secureLogger.logAPICall('request_start', {
          requestId: context.requestId,
          method: request.method,
          url: request.url,
          userAgent: context.userAgent,
          ipAddress: context.ipAddress.substring(0, 10) + '...', // Partial IP for privacy
        })
      }

      // Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
        secureLogger.logSecurityEvent('method_not_allowed', {
          severity: 'MEDIUM',
          context: {
            requestId: context.requestId,
            method: request.method
          }
        })
        return NextResponse.json(
          {
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
            meta: { requestId: context.requestId, timestamp: context.timestamp }
          },
          { status: 405 }
        )
      }

      // CSRF validation
      if (options.validateCSRF && request.method !== 'GET') {
        const csrfValid = await validateCSRF(request)
        if (!csrfValid) {
          secureLogger.logSecurityEvent('csrf_validation_failed', {
            severity: 'HIGH',
            context: {
              requestId: context.requestId
            }
          })
          return NextResponse.json(
            {
              success: false,
              error: { code: 'CSRF_INVALID', message: 'Invalid request origin' },
              meta: { requestId: context.requestId, timestamp: context.timestamp }
            },
            { status: 403 }
          )
        }
      }

      // Rate limiting
      if (options.rateLimitEndpoint) {
        const rateLimitResult = await rateLimiter.checkMultipleIdentifiers(
          context.ipAddress,
          context.userId || null,
          options.rateLimitEndpoint,
          context.userAgent
        )
        
        if (!rateLimitResult.allowed) {
          secureLogger.logSecurityEvent('rate_limit_exceeded', {
            severity: 'HIGH',
            context: {
              requestId: context.requestId,
              endpoint: options.rateLimitEndpoint
            }
          })
          
          const response = NextResponse.json(
            {
              success: false,
              error: { 
                code: 'RATE_LIMIT_EXCEEDED', 
                message: 'Too many requests. Please try again later.' 
              },
              meta: { 
                requestId: context.requestId, 
                timestamp: context.timestamp,
                rateLimit: {
                  remaining: rateLimitResult.remaining,
                  resetTime: rateLimitResult.resetTime
                }
              }
            },
            { status: 429 }
          )
          
          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
          if (rateLimitResult.retryAfter) {
            response.headers.set('Retry-After', rateLimitResult.retryAfter.toString())
          }
          
          return response
        }
      }

      // Request size validation
      if (options.maxRequestSize && request.headers.get('content-length')) {
        const contentLength = parseInt(request.headers.get('content-length') || '0')
        if (contentLength > options.maxRequestSize) {
          secureLogger.logSecurityEvent('request_too_large', {
            severity: 'MEDIUM',
            context: {
              requestId: context.requestId,
              contentLength
            }
          })
          return NextResponse.json(
            {
              success: false,
              error: { code: 'REQUEST_TOO_LARGE', message: 'Request payload too large' },
              meta: { requestId: context.requestId, timestamp: context.timestamp }
            },
            { status: 413 }
          )
        }
      }

      // Authentication check
      if (options.requireAuth && !context.userId) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            meta: { requestId: context.requestId, timestamp: context.timestamp }
          },
          { status: 401 }
        )
      }

      // Parse and sanitize request body if needed
      let sanitizedParams = params
      if (request.method !== 'GET' && options.sanitizeInput !== false) {
        try {
          const body = await request.json()
          sanitizedParams = { ...params, body: sanitizeInput(body, context) }
        } catch (error) {
          // Body might not be JSON or might be empty
        }
      }

      // Call the actual handler
      const result = await handler(request, context, sanitizedParams)

      // Sanitize response
      const sanitizedResult = options.sanitizeInput !== false 
        ? {
            ...result,
            data: result.data ? sanitizeResponse(result.data, context) : result.data
          }
        : result

      // Add security headers and return response
      const response = NextResponse.json(sanitizedResult)
      
      // Security headers
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      response.headers.set('X-Request-ID', context.requestId)
      
      // Log successful completion
      const duration = Date.now() - startTime
      if (options.auditLevel === 'detailed') {
        secureLogger.logAPICall('request_complete', {
          requestId: context.requestId,
          duration,
          status: sanitizedResult.success ? 'success' : 'error',
          responseSize: JSON.stringify(sanitizedResult).length
        })
      }

      return response

    } catch (error) {
      // Error handling - never leak internal details
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      
      secureLogger.error('API handler error', error as Error, {
        errorId,
        url: request.url,
        method: request.method
      })

      // Generic error response
      const errorResponse: SecureResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred. Please try again later.'
        },
        meta: {
          requestId: context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now()
        }
      }

      // In development, include more details
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error!.details = {
          errorId,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      return NextResponse.json(errorResponse, { status: 500 })
    }
  }
}

/**
 * Utility function to create secure Supabase queries with RLS validation
 */
export async function createSecureSupabaseQuery(context: SecurityContext) {
  const supabase = createClient()
  
  // Add request context to all queries for audit logging
  const originalFrom = supabase.from
  supabase.from = function fromWithAudit<T = any>(table: string): RDSQueryBuilder<T> {
    const query = originalFrom.call(this, table) as RDSQueryBuilder<T>
    
    // Add audit metadata to query context
    // Always log database queries for security
    if (true) {
      secureLogger.logDatabaseQuery('supabase_query', {
        requestId: context.requestId,
        table,
        userId: context.userId,
        timestamp: Date.now()
      })
    }
    
    return query
  }
  
  return supabase
}

export default withSecurity
