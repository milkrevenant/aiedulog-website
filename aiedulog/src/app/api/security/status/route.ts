/**
 * Security Status API - Provides current security system status
 * Used by client-side to get overall security health and metrics
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
import { getSecurityHealth, secureConsoleLog } from '@/lib/security'

const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Get comprehensive security status
    const healthData = await getSecurityHealth()

    // Enhanced status response
    const status = {
      healthy: healthData.status === 'healthy',
      clientProtections: {
        devToolsDetection: true,
        consoleOverride: process.env.NODE_ENV === 'production',
        debuggerProtection: true,
        activityMonitoring: true
      },
      serverProtections: {
        rateLimiting: healthData.components.rateLimiter || false,
        authValidation: healthData.components.auth || false,
        auditLogging: healthData.components.logger || false,
        threatMonitoring: healthData.components.monitor || false
      },
      violations: {
        total: healthData.metrics?.totalSecurityEvents || 0,
        recent: healthData.metrics?.suspiciousActivities || 0,
        severity: healthData.status === 'critical' ? 'CRITICAL' as const :
                 healthData.status === 'warning' ? 'HIGH' as const : 'LOW' as const
      },
      lastCheck: healthData.lastCheck
    }

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Security-Status': healthData.status
      }
    })

  } catch (error) {
    secureConsoleLog('Security status API error', error, 'error')
    
    // Return degraded status in case of error
    return NextResponse.json({
      healthy: false,
      clientProtections: {
        devToolsDetection: false,
        consoleOverride: false,
        debuggerProtection: false,
        activityMonitoring: false
      },
      serverProtections: {
        rateLimiting: false,
        authValidation: false,
        auditLogging: false,
        threatMonitoring: false
      },
      violations: {
        total: 0,
        recent: 0,
        severity: 'CRITICAL' as const
      },
      lastCheck: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'X-Security-Status': 'error'
      }
    })
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export const GET = withHighSecurity(getHandler);