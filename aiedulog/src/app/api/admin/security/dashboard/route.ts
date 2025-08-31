/**
 * Security Dashboard API - Admin Only
 * Provides real-time security metrics and incident data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSecurityDashboard, getSecurityHealth, getApiMiddleware } from '@/lib/security'

/**
 * GET /api/admin/security/dashboard
 * Returns comprehensive security dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Get middleware wrapper
    const middlewareModule = await getApiMiddleware()
    if (!middlewareModule) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SECURITY_UNAVAILABLE', message: 'Security middleware unavailable' }
        },
        { status: 500 }
      )
    }

    const { withSecurityMiddleware } = middlewareModule as any
    const handler = withSecurityMiddleware(
      async (request: NextRequest, context: any) => {
        try {
          // Get comprehensive security data
          const dashboardData = await getSecurityDashboard()
          const healthData = await getSecurityHealth()

          return NextResponse.json({
            success: true,
            data: {
              ...dashboardData,
              health: healthData,
              timestamp: Date.now()
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          })

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'DASHBOARD_ERROR',
              message: 'Failed to retrieve security dashboard data'
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          }, { status: 500 })
        }
      },
      {
        auth: {
          required: true,
          roles: ['admin'] // Only admins can access security dashboard
        },
        rateLimit: {
          endpoint: 'api:admin-access'
        },
        validation: {
          sanitizeInput: true,
          maxRequestSize: 1024, // Very small for GET request
          allowedMethods: ['GET']
        },
        csrf: {
          enabled: false // GET request
        },
        audit: {
          logRequests: true,
          logResponses: false,
          sensitivity: 'restricted'
        },
        security: {
          validateOrigin: true,
          blockSuspiciousPatterns: true,
          requireSecureHeaders: true
        }
      }
    )

    return await handler(request)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
      },
      { status: 500 }
    )
  }
}