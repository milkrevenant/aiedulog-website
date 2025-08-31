import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserIdentity } from '@/lib/identity/helpers'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  let supabaseResponse = NextResponse.next({
    request,
  })

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
    return supabaseResponse
  }

  // 2. Auth routes - redirect to dashboard if already logged in
  if (isAuthRoute) {
    if (user && path !== '/auth/confirm') {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 3. Protected routes - require authentication
  if (isProtectedRoute || isAdminRoute) {
    if (!user) {
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
        // Redirect to dashboard with an error message
        url.pathname = '/dashboard'
        url.searchParams.set('error', 'insufficient_permissions')
        return NextResponse.redirect(url)
      }
    }
  }

  // Success - continue with request

  // Default - allow the request
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images (public images)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}