import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserIdentity } from '@/lib/identity/helpers'
import { getSecureLogger, getSecurityMonitor, secureConsoleLog, SecurityEventType } from '@/lib/security'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add request tracking headers
  supabaseResponse.headers.set('X-Request-ID', requestId)
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Log request for security monitoring (async safe)
  const logRequest = async () => {
    const logger = await getSecureLogger()
    if (logger) {
      logger.debug('Middleware request', {
        requestId,
        path,
        method: request.method,
        ipAddress: ipAddress.substring(0, 10) + '...',
        userAgent,
        hasUser: !!user
      })
    }
  }
  logRequest().catch(() => {}) // Fire and forget

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Define route categories
  const publicRoutes = [
    '/',
    '/main',
    '/aboutus',
  ]

  const authRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/confirm',
    '/auth/signup-success',
    '/auth/reset-password',
  ]

  const protectedRoutes = [
    '/dashboard',
    '/feed',
    '/chat',
    '/notifications',
    '/search',
    '/settings',
    '/post',
    '/board',
  ]

  const adminRoutes = [
    '/admin',
  ]

  // Check if current path matches route patterns
  const isPublicRoute = publicRoutes.includes(path) || 
    publicRoutes.some(route => path.startsWith(route + '/'))
  
  const isAuthRoute = authRoutes.includes(path) || 
    authRoutes.some(route => path.startsWith(route))
  
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(route + '/') || path.startsWith(route + '['))
  
  const isAdminRoute = adminRoutes.some(route => 
    path === route || path.startsWith(route + '/'))

  // Test and development routes - treat as public for now
  const isTestRoute = path.startsWith('/test-') || path.startsWith('/grid-practice')

  // 1. Public routes - allow all access
  if (isPublicRoute || isTestRoute) {
    logRequestCompletion(requestId, 'public_access', startTime)
    return supabaseResponse
  }

  // 2. Auth routes - redirect to dashboard if already logged in
  if (isAuthRoute) {
    if (user && path !== '/auth/confirm') {
      // Log authenticated user redirect (async safe)
      const logRedirect = async () => {
        const logger = await getSecureLogger()
        if (logger) {
          logger.info('Authenticated user redirected from auth route', {
            requestId,
            userId: user.id,
            fromPath: path
          })
        }
      }
      logRedirect().catch(() => {}) // Fire and forget
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    logRequestCompletion(requestId, 'auth_route_access', startTime)
    return supabaseResponse
  }

  // 3. Protected routes - require authentication
  if (isProtectedRoute || isAdminRoute) {
    if (!user) {
      // Log unauthorized access attempt (async safe)
      const logUnauthorizedAccess = async () => {
        try {
          const [monitor, logger] = await Promise.all([
            getSecurityMonitor(),
            getSecureLogger()
          ])
          
          if (monitor) {
            monitor.recordSecurityEvent(SecurityEventType.AUTHORIZATION_FAILURE, {
              ipAddress,
              userAgent,
              requestId
            }, {
              attemptedPath: path,
              reason: 'no_authentication'
            })
          }
          
          if (logger) {
            logger.logAuthEvent('unauthorized_access', undefined, {
              requestId,
              path,
              ipAddress: ipAddress.substring(0, 10) + '...'
            })
          }
        } catch (error) {
          secureConsoleLog('Failed to log unauthorized access', error, 'error')
        }
      }
      logUnauthorizedAccess().catch(() => {}) // Fire and forget
      
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    // For admin routes, we'll do a basic check but leave detailed role checking to AuthGuard
    // This is because middleware should be fast and we already have AuthGuard handling roles
    if (isAdminRoute) {
      // Use standardized identity helper (server-side)
      const identity = await getUserIdentity(user, supabase)

      // Only do a basic check for moderator+ access
      // AuthGuard will handle specific page requirements (e.g., admin-only for users page)
      if (!identity?.profile || (identity.profile.role !== 'admin' && identity.profile.role !== 'moderator')) {
        // Log authorization failure (async safe)
        const logAuthorizationFailure = async () => {
          try {
            const [monitor, logger] = await Promise.all([
              getSecurityMonitor(),
              getSecureLogger()
            ])
            
            if (monitor) {
              monitor.recordSecurityEvent(SecurityEventType.AUTHORIZATION_FAILURE, {
                ipAddress,
                userAgent,
                requestId,
                userId: user.id
              }, {
                attemptedPath: path,
                userRole: identity?.profile?.role || 'unknown',
                reason: 'insufficient_role'
              })
            }
            
            if (logger) {
              logger.logAuthEvent('authorization_failure', user.id, {
                requestId,
                path,
                userRole: identity?.profile?.role,
                requiredRoles: ['admin', 'moderator']
              })
            }
          } catch (error) {
            secureConsoleLog('Failed to log authorization failure', error, 'error')
          }
        }
        logAuthorizationFailure().catch(() => {}) // Fire and forget
        
        // Redirect to dashboard with an error message
        url.pathname = '/dashboard'
        url.searchParams.set('error', 'insufficient_permissions')
        return NextResponse.redirect(url)
      }
    }
  }

  // Success - continue with request
  logRequestCompletion(requestId, 'protected_access_granted', startTime, user?.id)
  
  // Default - allow the request
  return supabaseResponse
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown' // NextRequest doesn't have ip property in all environments
}

function logRequestCompletion(
  requestId: string, 
  outcome: string, 
  startTime: number, 
  userId?: string
): void {
  const duration = Date.now() - startTime
  
  // Async safe logging
  const logCompletion = async () => {
    const logger = await getSecureLogger()
    if (logger) {
      logger.debug('Middleware request completed', {
        requestId,
        outcome,
        duration,
        userId
      })
    }
  }
  logCompletion().catch(() => {}) // Fire and forget
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files) 
     * - _next/webpack-hmr (hot reload)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public assets (images, fonts, etc.)
     * - API routes for static assets
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)',
  ],
}