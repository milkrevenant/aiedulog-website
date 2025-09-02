/**
 * Secure API Route Example
 * 
 * This demonstrates how to use the comprehensive security system
 * for protecting API endpoints with multiple layers of security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getApiMiddleware,
  SecurityEventType,
  getSecureDatabase,
  getSecureLogger,
  getSecurityMonitor,
  secureConsoleLog
} from '@/lib/security'

/**
 * GET /api/secure-example
 * Demonstrates secure data retrieval with authentication and authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Get security modules
    const [middlewareModule, dbModule, logger] = await Promise.all([
      getApiMiddleware(),
      getSecureDatabase(),
      getSecureLogger()
    ])

    if (!middlewareModule) {
      return NextResponse.json({
        success: false,
        error: { code: 'SECURITY_UNAVAILABLE', message: 'Security middleware unavailable' }
      }, { status: 500 })
    }

    const { withSecurityMiddleware } = middlewareModule as any
    
    // Create the secure handler
    const secureHandler = withSecurityMiddleware(
      async (request: NextRequest, context: any) => {
        try {
          let posts = []
          let masked = false

          // Only attempt database operations if secure database is available
          if (dbModule) {
            const { createSecureDatabase } = dbModule as any
            
            // Create secure database client
            const db = await createSecureDatabase({
              requestId: context.requestId,
              userId: context.userId,
              userRole: context.userRole || 'user',
              ipAddress: context.ipAddress,
              operation: 'select',
              table: 'posts'
            })

            // Perform secure database operation
            const result = await db.secureSelect('posts', {
              select: 'id, title, content, created_at, author_id',
              filters: context.userRole === 'admin' ? {} : { published: true },
              limit: 50,
              orderBy: { column: 'created_at', ascending: false }
            })

            if (result.error) {
              if (logger) {
                logger.error('Database query failed', {
                  requestId: context.requestId,
                  operation: 'secure_select',
                  errorName: result.error?.name,
                  errorMessage: result.error?.message
                }, result.error)
              } else {
                secureConsoleLog('Database query failed', result.error, 'error')
              }
              
              return NextResponse.json({
                success: false,
                error: {
                  code: 'DATABASE_ERROR',
                  message: 'Failed to retrieve data'
                },
                meta: {
                  requestId: context.requestId,
                  timestamp: context.timestamp
                }
              }, { status: 500 })
            }

            posts = result.data || []
            masked = result.masked || false

            // Log successful data access
            if (logger) {
              logger.logSecurityEvent('data_access_success', {
                severity: 'LOW',
                resource: 'posts',
                action: 'read',
                result: 'SUCCESS',
                requestId: context.requestId,
                userId: context.userId,
                recordCount: posts.length,
                masked, 
                userRole: context.userRole
              })
            }
          } else {
            // Fallback: return mock data when database security is unavailable
            posts = [
              {
                id: 'example-1',
                title: 'Security System Demo',
                content: 'This is a demonstration of the security system.',
                created_at: new Date().toISOString(),
                author_id: 'system'
              }
            ]
            
            secureConsoleLog('Using fallback data - secure database unavailable', undefined, 'warn')
          }

          return NextResponse.json({
            success: true,
            data: {
              posts,
              metadata: {
                count: posts.length,
                masked,
                userRole: context.userRole,
                secureDbAvailable: !!dbModule
              }
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          })

        } catch (error) {
          if (logger) {
            logger.error('Secure API error', {
              requestId: context.requestId,
              endpoint: '/api/secure-example',
              method: 'GET',
              errorName: (error as Error).name,
              errorMessage: (error as Error).message
            }, error as Error)
          } else {
            secureConsoleLog('Secure API error', error, 'error')
          }

          return NextResponse.json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An internal error occurred'
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          }, { status: 500 })
        }
      },
      {
        // Security configuration
        auth: {
          required: true,
          roles: ['user', 'moderator', 'admin']
        },
        rateLimit: {
          endpoint: 'api:secure-example',
          maxRequests: 100,
          windowMs: 60000 // 1 minute
        },
        validation: {
          sanitizeInput: true,
          maxRequestSize: 5 * 1024, // 5KB max for GET
          allowedMethods: ['GET']
        },
        csrf: {
          enabled: false // GET request doesn't need CSRF protection
        },
        audit: {
          logRequests: true,
          logResponses: true,
          sensitivity: 'public'
        },
        security: {
          validateOrigin: true,
          blockSuspiciousPatterns: true,
          requireSecureHeaders: false // Optional for example endpoint
        }
      }
    )

    // Execute the secure handler
    return await secureHandler(request)

  } catch (error) {
    secureConsoleLog('Security middleware setup failed', error, 'error')
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SECURITY_ERROR',
        message: 'Security system unavailable'
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/secure-example
 * Demonstrates secure data creation with comprehensive validation
 */
export async function POST(request: NextRequest) {
  try {
    // Get security modules
    const [middlewareModule, dbModule, logger, monitor] = await Promise.all([
      getApiMiddleware(),
      getSecureDatabase(),
      getSecureLogger(),
      getSecurityMonitor()
    ])

    if (!middlewareModule) {
      return NextResponse.json({
        success: false,
        error: { code: 'SECURITY_UNAVAILABLE', message: 'Security middleware unavailable' }
      }, { status: 500 })
    }

    const { withSecurityMiddleware } = middlewareModule as any

    const secureHandler = withSecurityMiddleware(
      async (request: NextRequest, context: any) => {
        try {
          const body = await request.json()
          
          // Validate input
          if (!body.title || !body.content) {
            return NextResponse.json({
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'Title and content are required'
              },
              meta: {
                requestId: context.requestId,
                timestamp: context.timestamp
              }
            }, { status: 400 })
          }

          let result = { success: true, id: `mock-${Date.now()}` }

          // Attempt secure database operation if available
          if (dbModule) {
            const { createSecureDatabase } = dbModule as any

            const db = await createSecureDatabase({
              requestId: context.requestId,
              userId: context.userId,
              userRole: context.userRole || 'user',
              ipAddress: context.ipAddress,
              operation: 'insert',
              table: 'posts'
            })

            const insertResult = await db.secureInsert('posts', {
              title: body.title,
              content: body.content,
              author_id: context.userId,
              published: context.userRole === 'admin' ? body.published : false,
              created_at: new Date().toISOString()
            })

            if (insertResult.error) {
              if (logger) {
                logger.error('Database insert failed', {
                  requestId: context.requestId,
                  operation: 'secure_insert',
                  errorName: insertResult.error?.name,
                  errorMessage: insertResult.error?.message
                }, insertResult.error)
              }
              
              return NextResponse.json({
                success: false,
                error: {
                  code: 'DATABASE_ERROR',
                  message: 'Failed to create post'
                },
                meta: {
                  requestId: context.requestId,
                  timestamp: context.timestamp
                }
              }, { status: 500 })
            }

            result = insertResult
          }

          // Log successful creation
          if (logger) {
            logger.logSecurityEvent('data_modification_success', {
              severity: 'LOW',
              resource: 'posts',
              action: 'create',
              result: 'SUCCESS',
              requestId: context.requestId,
              userId: context.userId,
              recordId: result.id,
              title: body.title
            })
          }

          // Record security event for content creation
          if (monitor) {
            try {
              monitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                requestId: context.requestId,
                userId: context.userId
              }, {
                operation: 'create_post',
                table: 'posts',
                recordId: result.id
              })
            } catch (importError) {
              secureConsoleLog('Failed to record security event', importError, 'error')
            }
          }

          return NextResponse.json({
            success: true,
            data: {
              id: result.id,
              created: true,
              secureDbUsed: !!dbModule
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          })

        } catch (error) {
          if (logger) {
            logger.error('Secure POST API error', {
              requestId: context.requestId,
              endpoint: '/api/secure-example',
              method: 'POST',
              errorName: (error as Error).name,
              errorMessage: (error as Error).message
            }, error as Error)
          } else {
            secureConsoleLog('Secure POST API error', error, 'error')
          }

          return NextResponse.json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An internal error occurred'
            },
            meta: {
              requestId: context.requestId,
              timestamp: context.timestamp
            }
          }, { status: 500 })
        }
      },
      {
        // Security configuration for POST
        auth: {
          required: true,
          roles: ['user', 'moderator', 'admin']
        },
        rateLimit: {
          endpoint: 'api:secure-example-post',
          maxRequests: 10,
          windowMs: 60000 // 1 minute, more restrictive for POST
        },
        validation: {
          sanitizeInput: true,
          maxRequestSize: 50 * 1024, // 50KB max for POST with content
          allowedMethods: ['POST']
        },
        csrf: {
          enabled: true // POST requires CSRF protection
        },
        audit: {
          logRequests: true,
          logResponses: true,
          sensitivity: 'sensitive' // Content creation is sensitive
        },
        security: {
          validateOrigin: true,
          blockSuspiciousPatterns: true,
          requireSecureHeaders: true
        }
      }
    )

    return await secureHandler(request)

  } catch (error) {
    secureConsoleLog('Security middleware setup failed for POST', error, 'error')
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SECURITY_ERROR',
        message: 'Security system unavailable'
      }
    }, { status: 500 })
  }
}