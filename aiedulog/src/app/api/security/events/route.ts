/**
 * Security Events API - Receives client-side security violations
 * Processes and logs security events from client-side monitoring
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
    const body = await request.json()
    const { events, timestamp } = body

    if (!events || !Array.isArray(events)) {
      return createErrorResponse(ErrorType.BAD_REQUEST, context);
    }

    // Get security modules
    const [logger, monitor] = await Promise.all([
      getSecureLogger(),
      getSecurityMonitor()
    ])

    // Process each event
    for (const event of events) {
      try {
        // Log the security event
        if (logger) {
          logger.logSecurityEvent('security_violation', {
            severity: event.severity,
            context: {
              type: event.type,
              source: event.source,
              sessionId: event.sessionId,
              userId: event.userId,
              details: event.details,
              metadata: event.metadata,
              clientTimestamp: event.timestamp,
              serverTimestamp: Date.now()
            }
          })
        }

        // Record in security monitor
        if (monitor && (event.severity === 'HIGH' || event.severity === 'CRITICAL')) {
          monitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            ipAddress: event.metadata?.ipAddress || 'unknown',
            userAgent: event.metadata?.userAgent || 'unknown',
            requestId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: event.userId
          }, {
            violationType: event.type,
            severity: event.severity,
            details: event.details,
            source: 'client'
          })
        }
      } catch (eventError) {
        secureConsoleLog('Failed to process security event', eventError, 'error')
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      processed: events.length,
      timestamp: Date.now()
    })

  } catch (error) {
    secureConsoleLog('Security events API error', error, 'error')
    
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
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