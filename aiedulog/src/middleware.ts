import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    return response
  }

  // Edge-safe auth presence check using cookies only (no Supabase import)
  // Looks for Supabase auth cookie names; adjust if your project uses different names
  // NextAuth session cookie presence check (defensive)
  const hasNextAuth = request.cookies.getAll().some((c) => c.name.includes('next-auth.session-token') || c.name.includes('__Secure-next-auth.session-token'))
  const user = hasNextAuth ? { id: 'placeholder' } : null

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

  // 3. Protected routes - require authentication
  if (isProtectedRoute || isAdminRoute) {
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Unauthorized access attempt to ${path}`)
      }
      
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    // For admin routes, defer detailed role checking to AuthGuard component
    // This keeps middleware fast and avoids complex database calls in edge runtime
    if (isAdminRoute) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Admin route access for user ${user.id}`)
      }
      // Let AuthGuard handle detailed role validation on the client side
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