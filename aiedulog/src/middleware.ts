import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JWTAuthMiddleware } from '@/lib/auth/jwt-middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const user = await JWTAuthMiddleware.verifyToken(request);
    if (user) {
      response.headers.set('x-user-id', user.userId);
      response.headers.set('x-user-email', user.email);
      response.headers.set('x-user-role', user.role);
      response.headers.set('x-cognito-sub', user.cognitoSub);
      response.headers.set('x-user-active', user.isActive.toString());

      const jwtClaims = {
        sub: user.cognitoSub,
        email: user.email,
        role: user.role,
        exp: user.expiresAt,
      };
      response.headers.set('x-jwt-claims', JSON.stringify(jwtClaims));
    }
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/dashboard/:path*', '/chat/:path*'],
};
