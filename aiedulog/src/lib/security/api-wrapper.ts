/**
 * Universal API Security Wrapper
 * Automatically applies security to ALL API routes
 * 
 * CORE FEATURES:
 * - Automatic security enforcement on all API routes
 * - Rate limiting with DDoS protection
 * - Input validation and sanitization
 * - Authentication and authorization checks
 * - Production-safe error handling
 * - Security audit logging
 * - Clear fallback mechanisms
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SecurityContext,
  SecurityConfig,
  SecurityRole,
  DEFAULT_SECURITY_CONFIG,
  createSecurityContext,
  hasRequiredRole,
  validateRequestSize,
  detectMaliciousPatterns,
  validateOrigin,
  getSecurityHeaders,
  logSecurityEvent
} from './core-security';
import { checkRateLimit } from './rate-limiter';
import {
  createErrorResponse,
  handleUnexpectedError,
  handleRateLimitError,
  ErrorType
} from './error-handler';

// Handler function type
export type SecureAPIHandler = (
  request: NextRequest,
  context: SecurityContext,
  params?: any
) => Promise<NextResponse>;

// Security wrapper configuration
export interface WrapperConfig extends SecurityConfig {
  skipSecurityChecks?: boolean;  // Emergency override (use with caution)
  customValidation?: (request: NextRequest, context: SecurityContext) => Promise<boolean>;
}

/**
 * Main security wrapper function
 * Apply this to ALL API routes to ensure consistent security
 */
export function withSecurity(
  handler: SecureAPIHandler,
  config: WrapperConfig = {}
): (request: NextRequest, params?: any) => Promise<NextResponse> {
  // Merge with default configuration
  const finalConfig: WrapperConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    ...config
  };
  
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    let context: SecurityContext | undefined;
    
    try {
      // Step 1: Create security context
      context = await createSecurityContext(request);
      
      // Emergency bypass (use only in extreme cases)
      if (finalConfig.skipSecurityChecks && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Security checks bypassed for development');
        return await handler(request, context, params);
      }
      
      // Step 2: Basic security validation
      const basicValidation = await validateBasicSecurity(request, context, finalConfig);
      if (!basicValidation.allowed) {
        return basicValidation.response!;
      }
      
      // Step 3: Rate limiting
      const rateLimitResult = checkRateLimit(context, finalConfig.rateLimitKey);
      if (!rateLimitResult.allowed) {
        await logSecurityEvent('RATE_LIMIT_EXCEEDED', context, {
          rateLimitKey: finalConfig.rateLimitKey,
          limit: rateLimitResult.limit,
          retryAfter: rateLimitResult.retryAfter
        });
        
        return handleRateLimitError(
          context,
          rateLimitResult.retryAfter!,
          rateLimitResult.limit,
          rateLimitResult.remaining
        );
      }
      
      // Step 4: Authentication check
      if (finalConfig.requireAuth && !context.sessionValid) {
        await logSecurityEvent('AUTHENTICATION_FAILED', context);
        return createErrorResponse(ErrorType.AUTHENTICATION_FAILED, context);
      }
      
      // Step 5: Authorization check
      if (finalConfig.minimumRole && !hasRequiredRole(context.userRole, finalConfig.minimumRole)) {
        await logSecurityEvent('AUTHORIZATION_FAILED', context, {
          requiredRole: finalConfig.minimumRole,
          actualRole: context.userRole
        });
        return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
      }
      
      // Step 6: Custom validation
      if (finalConfig.customValidation) {
        const customValid = await finalConfig.customValidation(request, context);
        if (!customValid) {
          await logSecurityEvent('CUSTOM_VALIDATION_FAILED', context);
          return createErrorResponse(ErrorType.SECURITY_VIOLATION, context);
        }
      }
      
      // Step 7: Execute the actual handler
      const response = await handler(request, context, params);
      
      // Step 8: Apply security headers to response
      const securityHeaders = getSecurityHeaders(context);
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Step 9: Log successful request if audit enabled
      if (finalConfig.auditLevel !== 'none') {
        await logSecurityEvent('API_REQUEST_SUCCESS', context, {
          method: request.method,
          url: request.url,
          statusCode: response.status
        });
      }
      
      return response;
      
    } catch (error) {
      // Handle unexpected errors safely
      console.error('Security wrapper error:', error);
      
      // Create fallback context if context creation failed
      const errorContext = context || {
        requestId: `error_${Date.now()}`,
        timestamp: Date.now(),
        ipAddress: '0.0.0.0',
        userAgent: 'unknown',
        userRole: SecurityRole.ANONYMOUS,
        sessionValid: false,
        riskLevel: 'HIGH' as const
      };
      
      return handleUnexpectedError(error as Error, errorContext, 'security_wrapper');
    }
  };
}

/**
 * Validate basic security requirements
 */
async function validateBasicSecurity(
  request: NextRequest,
  context: SecurityContext,
  config: WrapperConfig
): Promise<{ allowed: boolean; response?: NextResponse }> {
  // Check request size
  if (config.maxRequestSizeMB && !validateRequestSize(request, config.maxRequestSizeMB)) {
    await logSecurityEvent('REQUEST_TOO_LARGE', context, {
      maxSizeMB: config.maxRequestSizeMB
    });
    return {
      allowed: false,
      response: createErrorResponse(ErrorType.BAD_REQUEST, context, undefined, 'Request too large')
    };
  }
  
  // Check for malicious patterns
  const threats = detectMaliciousPatterns(request);
  if (threats.length > 0) {
    await logSecurityEvent('MALICIOUS_PATTERNS_DETECTED', context, {
      threats,
      url: request.url
    });
    return {
      allowed: false,
      response: createErrorResponse(ErrorType.SECURITY_VIOLATION, context)
    };
  }
  
  // CORS validation
  if (config.allowedOrigins) {
    const origin = request.headers.get('origin');
    if (!validateOrigin(origin, config.allowedOrigins)) {
      await logSecurityEvent('CORS_VIOLATION', context, {
        origin,
        allowedOrigins: config.allowedOrigins
      });
      return {
        allowed: false,
        response: createErrorResponse(ErrorType.SECURITY_VIOLATION, context)
      };
    }
  }
  
  // CSRF validation for state-changing operations
  if (config.enableCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token') || request.headers.get('csrf-token');
    
    // Simple CSRF validation (in production, use proper token validation)
    if (!csrfToken || csrfToken.length < 16) {
      await logSecurityEvent('CSRF_VIOLATION', context);
      return {
        allowed: false,
        response: createErrorResponse(ErrorType.SECURITY_VIOLATION, context)
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Quick security wrapper for public endpoints (no auth required)
 */
export function withPublicSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: false,
    minimumRole: SecurityRole.ANONYMOUS,
    rateLimitKey: 'api_default',
    enableCSRF: false
  });
}

/**
 * Security wrapper for authenticated user endpoints
 */
export function withUserSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: true,
    minimumRole: SecurityRole.AUTHENTICATED,
    rateLimitKey: 'api_default'
  });
}

/**
 * Security wrapper for admin endpoints
 */
export function withAdminSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: true,
    minimumRole: SecurityRole.ADMIN,
    rateLimitKey: 'admin',
    auditLevel: 'detailed'
  });
}

/**
 * Security wrapper for high-risk operations
 */
export function withHighSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: true,
    minimumRole: SecurityRole.VERIFIED,
    rateLimitKey: 'security',
    maxRequestSizeMB: 5,
    auditLevel: 'detailed'
  });
}

/**
 * Security wrapper for authentication endpoints
 */
export function withAuthSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: false,
    rateLimitKey: 'auth',
    maxRequestSizeMB: 1,
    auditLevel: 'detailed'
  });
}

/**
 * Security wrapper for upload endpoints
 */
export function withUploadSecurity(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  return withSecurity(handler, {
    requireAuth: true,
    minimumRole: SecurityRole.VERIFIED,
    rateLimitKey: 'upload',
    maxRequestSizeMB: 50, // Allow larger uploads
    auditLevel: 'basic'
  });
}

/**
 * Emergency bypass wrapper (development only)
 * Use ONLY when security is blocking legitimate development work
 */
export function withDevBypass(handler: SecureAPIHandler): (request: NextRequest, params?: any) => Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Emergency bypass can only be used in development mode');
  }
  
  console.warn('🚨 USING EMERGENCY SECURITY BYPASS - REMOVE BEFORE PRODUCTION 🚨');
  
  return withSecurity(handler, {
    skipSecurityChecks: true,
    requireAuth: false,
    enableCSRF: false,
    auditLevel: 'none'
  });
}