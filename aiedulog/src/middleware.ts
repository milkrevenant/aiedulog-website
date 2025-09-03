import { createServerClient } from '@supabase/ssr'
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

  // Create Supabase client with optimized edge runtime configuration
  let user = null
  
  try {
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
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
        global: {
          // Edge runtime compatible fetch with timeout
          fetch: (url, options = {}) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
            
            return fetch(url, {
              ...options,
              signal: controller.signal,
              headers: {
                ...options.headers,
                // Add DNS resolution hint for edge runtime
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              }
            }).finally(() => clearTimeout(timeoutId))
          }
        }
      }
    )

    // Try to get user with timeout protection
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 2000)
    )
    
    const result = await Promise.race([authPromise, timeoutPromise]) as any
    user = result?.data?.user || null
    
  } catch (error) {
    // Log DNS/network errors for debugging but don't block the request
    console.warn(`[${requestId}] Auth check failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      path,
      timestamp: new Date().toISOString()
    })
    
    // For protected routes, if auth fails completely, redirect to login
    // This ensures the app doesn't break due to network issues
    if (isProtectedRoute || isAdminRoute) {
      console.warn(`[${requestId}] Redirecting to login due to auth failure`)
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }
    
    // For other routes, allow through (auth will be handled by individual pages)
    return response
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
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)',
  ],
}