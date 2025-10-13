import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { JWTAuthMiddleware } from './lib/auth/jwt-middleware'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const ipAddress = getClientIP(request)
  
  let response = NextResponse.next({
    request,
  })

  // Add essential security headers
  response.headers.set('X-Request-ID', requestId)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Define route categories
  const publicRoutes = [
    '/',
    '/main',
    '/aboutus',
    '/posts', // Public post viewing
    '/board', // Public board browsing
    '/feed',  // Public feed (filtered for anonymous users)
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
    '/chat',
    '/notifications',
    '/search',
    '/settings',
    '/post/create',
    '/post/edit',
    '/profile',
  ]

  const adminRoutes = [
    '/admin',
  ]

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/posts/create',
    '/api/posts/edit',
    '/api/posts/delete',
    '/api/comments',
    '/api/chat',
    '/api/notifications',
    '/api/profile',
  ]

  const adminApiRoutes = [
    '/api/admin',
    '/api/users/admin',
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

  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    path === route || path.startsWith(route + '/'))

  const isAdminApiRoute = adminApiRoutes.some(route => 
    path === route || path.startsWith(route + '/'))

  // Test and development routes - treat as public for now
  const isTestRoute = path.startsWith('/test-') || path.startsWith('/grid-practice')

  // 1. Public routes - allow all access
  if (isPublicRoute || isTestRoute) {
    return response
  }

  // Skip authentication for public API routes
  if (path.startsWith('/api/public') || path.startsWith('/api/auth')) {
    return response
  }

  // JWT Authentication for protected routes
  let user = null
  try {
    // Try JWT authentication first
    user = await JWTAuthMiddleware.verifyToken(request)
    
    // Fallback: Check for NextAuth session (during migration period)
    if (!user) {
      const hasNextAuth = request.cookies.getAll().some((c) => 
        c.name.includes('next-auth.session-token') || 
        c.name.includes('__Secure-next-auth.session-token')
      )
      
      if (hasNextAuth) {
        // Create temporary user object for NextAuth sessions
        user = { 
          id: 'nextauth-user', 
          role: 'member', 
          isActive: true,
          email: 'nextauth@temp.com' 
        }
      }
    }
  } catch (error) {
    console.error(`[${requestId}] Auth verification failed:`, error)
    user = null
  }

  // 2. Auth routes - redirect to dashboard if already logged in
  if (isAuthRoute) {
    if (user && path !== '/auth/confirm') {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Redirecting authenticated user from ${path} to dashboard`)
      }
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return response
  }

  // 3. Protected routes and APIs - require authentication
  if (isProtectedRoute || isAdminRoute || isProtectedApiRoute || isAdminApiRoute) {
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Unauthorized access attempt to ${path}`)
      }
      
      // For API routes, return JSON error
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }
      
      // For pages, redirect to login
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    // Check if user account is active
    if (!user.isActive) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Inactive user attempting to access ${path}`)
      }
      
      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Account inactive', code: 'ACCOUNT_INACTIVE' },
          { status: 403 }
        )
      }
      
      url.pathname = '/auth/login'
      url.searchParams.set('error', 'account_inactive')
      return NextResponse.redirect(url)
    }

    // Admin route authorization
    if (isAdminRoute || isAdminApiRoute) {
      const isAdmin = user.role === 'admin' || user.role === 'moderator'
      
      if (!isAdmin) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${requestId}] User ${user.email || user.id} lacks admin privileges for ${path}`)
        }
        
        if (path.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Insufficient privileges', code: 'INSUFFICIENT_ROLE' },
            { status: 403 }
          )
        }
        
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    // Add user context to response headers for downstream use
    if (user && typeof user === 'object') {
      response.headers.set('x-user-id', user.userId || user.id || '')
      response.headers.set('x-user-email', user.email || '')
      response.headers.set('x-user-role', user.role || 'member')
      response.headers.set('x-user-active', (user.isActive !== false).toString())
      
      if ('cognitoSub' in user) {
        response.headers.set('x-cognito-sub', user.cognitoSub)
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${requestId}] Authorized ${user.role || 'user'} access to ${path}`)
    }
  }

  // Success - continue with request
  return response
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
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
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)',
  ],
}