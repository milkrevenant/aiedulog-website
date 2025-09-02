/**
 * Security Violations API - Receives and processes individual security violations
 * Used by client-side security monitoring for immediate violation reporting
 */

import {
withSecurity, 
  withPublicSecurity,
  withUserSecurity, 
  withAdminSecurity, 
  withHighSecurity,
  withAuthSecurity,
  withUploadSecurity,
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { 
  createErrorResponse, 
  handleValidationError,
  handleUnexpectedError,
  ErrorType 
} from '@/lib/security/error-handler';
import { NextRequest, NextResponse } from 'next/server'
import { getSecureLogger, getSecurityMonitor, secureConsoleLog, SecurityEventType } from '@/lib/security'

const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const violation = await request.json()
    
    if (!violation || typeof violation !== 'object') {
      return createErrorResponse(ErrorType.BAD_REQUEST, context);
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get security modules
    const [logger, monitor] = await Promise.all([
      getSecureLogger(),
      getSecurityMonitor()
    ])

    const requestId = `violation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    // Log the violation
    if (logger) {
      logger.logSecurityEvent(SecurityEventType.SECURITY_VIOLATION, {
        severity: mapSeverity(violation.severity),
        context: {
          type: violation.type,
          details: violation.details,
          timestamp: violation.timestamp,
          serverTimestamp: Date.now(),
          ipAddress: ipAddress.substring(0, 10) + '...',
          userAgent,
          requestId
        }
      })
    }

    // Record in security monitor for high/critical violations
    if (monitor && (violation.severity === 'high' || violation.severity === 'critical')) {
      try {
        monitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
          ipAddress,
          userAgent,
          requestId
        }, {
          violationType: violation.type,
          severity: violation.severity,
          details: violation.details,
          source: 'client_monitoring'
        })
      } catch (importError) {
        secureConsoleLog('Failed to import SecurityEventType', importError, 'error')
      }
    }

    // For critical violations, consider additional actions
    if (violation.severity === 'high' && violation.type === 'devtools') {
      secureConsoleLog(`🚨 High-severity security violation detected: ${violation.type}`, {
        ipAddress: ipAddress.substring(0, 10) + '...',
        userAgent,
        details: violation.details
      }, 'warn')
    }

    return NextResponse.json({
      success: true,
      requestId,
      timestamp: Date.now(),
      action: violation.severity === 'high' ? 'logged_and_monitored' : 'logged'
    })

  } catch (error) {
    secureConsoleLog('Security violation API error', error, 'error')
    
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

// Helper function to map client severity to server severity
function mapSeverity(clientSeverity: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (clientSeverity) {
    case 'low': return 'LOW'
    case 'medium': return 'MEDIUM'
    case 'high': return 'HIGH'
    case 'critical': return 'CRITICAL'
    default: return 'MEDIUM'
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export const POST = withHighSecurity(postHandler);