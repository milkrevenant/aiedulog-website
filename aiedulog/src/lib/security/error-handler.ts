/**
 * Production Error Handler
 * Sanitizes error messages and provides safe error responses
 * 
 * SECURITY FEATURES:
 * - Removes sensitive information from error messages
 * - Provides consistent error response format
 * - Logs detailed errors internally while showing generic messages to users
 * - Environment-aware error handling (detailed in dev, generic in prod)
 */

import { NextResponse } from 'next/server';
import { SecurityContext, logSecurityEvent } from './core-security';

// Error types for consistent handling
export enum ErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    riskLevel?: string;
  };
}

// HTTP status codes for error types
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  [ErrorType.AUTHENTICATION_FAILED]: 401,
  [ErrorType.AUTHORIZATION_FAILED]: 403,
  [ErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorType.INVALID_INPUT]: 400,
  [ErrorType.RESOURCE_NOT_FOUND]: 404,
  [ErrorType.SECURITY_VIOLATION]: 403,
  [ErrorType.INTERNAL_ERROR]: 500,
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.METHOD_NOT_ALLOWED]: 405
};

// Safe error messages for production (no sensitive information)
const SAFE_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTHENTICATION_FAILED]: 'Authentication required. Please log in to access this resource.',
  [ErrorType.AUTHORIZATION_FAILED]: 'Insufficient permissions to access this resource.',
  [ErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ErrorType.INVALID_INPUT]: 'Invalid request data provided.',
  [ErrorType.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.SECURITY_VIOLATION]: 'Request blocked by security policy.',
  [ErrorType.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
  [ErrorType.BAD_REQUEST]: 'Invalid request format or parameters.',
  [ErrorType.METHOD_NOT_ALLOWED]: 'HTTP method not allowed for this endpoint.'
};

// Development error messages (more detailed for debugging)
const DEV_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTHENTICATION_FAILED]: 'Authentication failed: No valid session found',
  [ErrorType.AUTHORIZATION_FAILED]: 'Authorization failed: User role insufficient for requested operation',
  [ErrorType.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded: Too many requests from this client',
  [ErrorType.INVALID_INPUT]: 'Invalid input: Request validation failed',
  [ErrorType.RESOURCE_NOT_FOUND]: 'Resource not found: The requested item does not exist',
  [ErrorType.SECURITY_VIOLATION]: 'Security violation: Request blocked due to security policy',
  [ErrorType.INTERNAL_ERROR]: 'Internal error: An unexpected error occurred during processing',
  [ErrorType.BAD_REQUEST]: 'Bad request: Invalid request format or missing required parameters',
  [ErrorType.METHOD_NOT_ALLOWED]: 'Method not allowed: This HTTP method is not supported for this endpoint'
};

/**
 * Create standardized error response
 */
export function createErrorResponse(
  errorType: ErrorType,
  context: SecurityContext,
  originalError?: Error | string,
  additionalDetails?: string
): NextResponse<ErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = ERROR_STATUS_CODES[errorType];
  
  // Choose appropriate error message based on environment
  const message = isDevelopment ? DEV_ERROR_MESSAGES[errorType] : SAFE_ERROR_MESSAGES[errorType];
  
  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorType,
      message,
      ...(isDevelopment && additionalDetails && { details: additionalDetails })
    },
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      riskLevel: context.riskLevel
    }
  };
  
  // Log detailed error information internally
  logErrorInternal(errorType, context, originalError, additionalDetails);
  
  // Create NextResponse with appropriate status code
  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'X-Request-ID': context.requestId,
      'X-Error-Code': errorType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Handle unexpected errors safely
 */
export function handleUnexpectedError(
  error: Error,
  context: SecurityContext,
  operation?: string
): NextResponse<ErrorResponse> {
  console.error(`Unexpected error${operation ? ` in ${operation}` : ''}:`, {
    error: error.message,
    stack: error.stack,
    requestId: context.requestId,
    userId: context.userId,
    ipAddress: context.ipAddress
  });
  
  // Log as security event if it might be an attack
  if (isSuspiciousError(error)) {
    logSecurityEvent('SUSPICIOUS_ERROR', context, {
      errorMessage: error.message,
      operation: operation || 'unknown'
    });
  }
  
  return createErrorResponse(
    ErrorType.INTERNAL_ERROR,
    context,
    error,
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
}

/**
 * Handle rate limiting errors with retry headers
 */
export function handleRateLimitError(
  context: SecurityContext,
  retryAfter: number,
  limit: number,
  remaining: number
): NextResponse<ErrorResponse> {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorType.RATE_LIMIT_EXCEEDED,
      message: SAFE_ERROR_MESSAGES[ErrorType.RATE_LIMIT_EXCEEDED]
    },
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      riskLevel: context.riskLevel
    }
  };
  
  return NextResponse.json(errorResponse, {
    status: 429,
    headers: {
      'X-Request-ID': context.requestId,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + (retryAfter * 1000)).toISOString(),
      'Retry-After': retryAfter.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  context: SecurityContext,
  validationErrors: string[],
  field?: string
): NextResponse<ErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorType.INVALID_INPUT,
      message: SAFE_ERROR_MESSAGES[ErrorType.INVALID_INPUT],
      ...(isDevelopment && {
        details: validationErrors.join('; ') + (field ? ` (field: ${field})` : '')
      })
    },
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      riskLevel: context.riskLevel
    }
  };
  
  return NextResponse.json(errorResponse, {
    status: 400,
    headers: {
      'X-Request-ID': context.requestId,
      'X-Error-Code': ErrorType.INVALID_INPUT
    }
  });
}

/**
 * Extract safe error message from unknown error
 */
export function extractSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove potentially sensitive information
    const message = error.message
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/\b\d{16,}\b/g, '[CARD_NUMBER]') // Credit card numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]'); // Emails
    
    return message.length > 200 ? message.substring(0, 200) + '...' : message;
  }
  
  if (typeof error === 'string') {
    return error.length > 200 ? error.substring(0, 200) + '...' : error;
  }
  
  return 'Unknown error occurred';
}

/**
 * Check if error might indicate suspicious activity
 */
function isSuspiciousError(error: Error): boolean {
  const suspiciousPatterns = [
    /sql/i,
    /injection/i,
    /xss/i,
    /script/i,
    /eval/i,
    /exec/i,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /delete.*from/i
  ];
  
  return suspiciousPatterns.some(pattern => 
    pattern.test(error.message) || pattern.test(error.stack || '')
  );
}

/**
 * Log error internally with full details
 */
function logErrorInternal(
  errorType: ErrorType,
  context: SecurityContext,
  originalError?: Error | string,
  additionalDetails?: string
): void {
  const errorDetails = {
    errorType,
    originalError: originalError instanceof Error ? {
      message: originalError.message,
      stack: originalError.stack,
      name: originalError.name
    } : originalError,
    additionalDetails,
    context: {
      requestId: context.requestId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      riskLevel: context.riskLevel,
      timestamp: context.timestamp
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
  
  // Use appropriate log level based on error type
  if (errorType === ErrorType.INTERNAL_ERROR || errorType === ErrorType.SECURITY_VIOLATION) {
    console.error('Security/Internal Error:', errorDetails);
  } else {
    console.warn('API Error:', errorDetails);
  }
  
  // Log to security audit if it's a security-related error
  if (errorType === ErrorType.SECURITY_VIOLATION || errorType === ErrorType.AUTHENTICATION_FAILED) {
    logSecurityEvent('ERROR_LOGGED', context, {
      errorType,
      severity: errorType === ErrorType.SECURITY_VIOLATION ? 'HIGH' : 'MEDIUM'
    });
  }
}