/**
 * JWT Authentication Middleware for RDS Migration
 * Replaces Supabase Auth with AWS Cognito + NextAuth.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { headers } from 'next/headers';

// Types
export interface UserSession {
  userId: string;
  email: string;
  role: 'admin' | 'moderator' | 'member';
  isActive: boolean;
  cognitoSub: string;
  sessionId?: string;
  expiresAt: number;
}

export interface AuthContext {
  user: UserSession | null;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

// Configuration
const AUTH_CONFIG = {
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    region: process.env.COGNITO_REGION || 'ap-northeast-2',
  },
  // Internal JWT settings (disabled in edge middleware)
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || '',
    issuer: process.env.JWT_ISSUER || 'aiedulog',
    audience: process.env.JWT_AUDIENCE || 'aiedulog-web',
    expiresIn: '24h',
  },
  session: {
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60,   // Update every hour
  }
};

/**
 * Cognito JWT Verifier instance
 */
const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId: AUTH_CONFIG.cognito.userPoolId,
  tokenUse: 'access',
  clientId: AUTH_CONFIG.cognito.clientId,
});

/**
 * JWT Authentication Middleware
 */
export class JWTAuthMiddleware {
  /**
   * Extract and verify JWT token from request
   */
  static async verifyToken(request: NextRequest): Promise<UserSession | null> {
    try {
      // Try multiple token sources
      const token = this.extractToken(request);
      
      if (!token) {
        return null;
      }

      // Try Cognito JWT verification
      try {
        const cognitoPayload = await cognitoVerifier.verify(token);
        return await this.createUserSessionFromCognito(cognitoPayload);
      } catch (cognitoError) {
        console.error('Cognito JWT verification failed:', cognitoError);
        return null;
      }

    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Extract token from various sources
   */
  private static extractToken(request: NextRequest): string | null {
    // 1. Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Cookie (for web sessions)
    const cookieToken = request.cookies.get('auth-token')?.value;
    if (cookieToken) {
      return cookieToken;
    }

    // 3. Query parameter (for API requests)
    const queryToken = request.nextUrl.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }

    // 4. Custom header
    const customHeader = request.headers.get('x-auth-token');
    if (customHeader) {
      return customHeader;
    }

    return null;
  }

  /**
   * Validate internal JWT token structure
   */
  // Note: Internal JWT validation disabled in edge runtime to avoid Node.js crypto deps

  /**
   * Create user session from Cognito token
   */
  private static async createUserSessionFromCognito(cognitoPayload: any): Promise<UserSession> {
    // Cognito tokens contain different fields
    const cognitoSub = cognitoPayload.sub;
    const email = cognitoPayload.email || cognitoPayload.username;

    // Look up user profile in our database to get role and other info
    const userProfile = await this.getUserProfileByCognitoSub(cognitoSub);

    return {
      userId: userProfile?.user_id || cognitoSub,
      email: email,
      role: userProfile?.role || 'member',
      isActive: userProfile?.is_active !== false,
      cognitoSub: cognitoSub,
      expiresAt: cognitoPayload.exp * 1000, // Convert to milliseconds
    };
  }

  /**
   * Look up user profile by Cognito subject ID
   */
  private static async getUserProfileByCognitoSub(cognitoSub: string) {
    // This would query your RDS database
    // Implementation depends on your database client (pg, Prisma, etc.)
    try {
      // Example with pg client:
      /*
      const { rows } = await db.query(
        `SELECT user_id, email, role, is_active, full_name 
         FROM user_profiles 
         WHERE user_id IN (
           SELECT user_id FROM auth_methods 
           WHERE provider = 'cognito' AND auth_provider_id = $1
         )`,
        [cognitoSub]
      );
      
      return rows[0] || null;
      */
      
      // Placeholder for now
      return null;
    } catch (error) {
      console.error('Failed to lookup user profile:', error);
      return null;
    }
  }

  /**
   * Generate internal JWT token for user
   */
  // Internal token generation is not available in edge middleware

  /**
   * Middleware function for API routes
   */
  static async middleware(request: NextRequest, response: NextResponse) {
    const user = await this.verifyToken(request);
    
    // Add user context to request headers for downstream consumption
    if (user) {
      response.headers.set('x-user-id', user.userId);
      response.headers.set('x-user-email', user.email);
      response.headers.set('x-user-role', user.role);
      response.headers.set('x-user-active', user.isActive.toString());
    }

    return response;
  }

  /**
   * Refresh token if it's close to expiry
   */
  static async refreshTokenIfNeeded(user: UserSession): Promise<string | null> {
    const timeUntilExpiry = user.expiresAt - Date.now();
    const refreshThreshold = AUTH_CONFIG.session.updateAge * 1000; // Convert to milliseconds

    if (timeUntilExpiry < refreshThreshold) {
      // Skip refresh in middleware; handled by application layer if needed
      return null;
    }

    return null;
  }
}

/**
 * Authentication context helper for React components
 */
export function createAuthContext(user: UserSession | null): AuthContext {
  return {
    user,
    isAuthenticated: !!user,
    
    hasRole: (role: string | string[]): boolean => {
      if (!user) return false;
      
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    
    hasPermission: (permission: string): boolean => {
      if (!user) return false;
      
      // Define role-based permissions
      const rolePermissions: Record<string, string[]> = {
        admin: [
          'read:users', 'write:users', 'delete:users',
          'read:posts', 'write:posts', 'delete:posts',
          'read:comments', 'write:comments', 'delete:comments',
          'manage:system', 'manage:content', 'manage:notifications'
        ],
        moderator: [
          'read:users', 'read:posts', 'write:posts', 'delete:posts',
          'read:comments', 'write:comments', 'delete:comments',
          'manage:content'
        ],
        member: [
          'read:posts', 'write:posts', 'read:comments', 'write:comments',
          'read:profile', 'write:profile'
        ]
      };

      const permissions = rolePermissions[user.role] || [];
      return permissions.includes(permission);
    }
  };
}

/**
 * Route protection HOC for API routes
 */
export function requireAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse> | NextResponse,
  options: {
    roles?: string[];
    permissions?: string[];
    requireActive?: boolean;
  } = {}
) {
  return async (req: NextRequest) => {
    const user = await JWTAuthMiddleware.verifyToken(req);
    const authContext = createAuthContext(user);

    // Check authentication
    if (!authContext.isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (options.requireActive !== false && !user!.isActive) {
      return NextResponse.json(
        { error: 'Account inactive', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    // Check role requirements
    if (options.roles && !authContext.hasRole(options.roles)) {
      return NextResponse.json(
        { error: 'Insufficient privileges', code: 'INSUFFICIENT_ROLE' },
        { status: 403 }
      );
    }

    // Check permission requirements
    if (options.permissions) {
      const hasAllPermissions = options.permissions.every(permission => 
        authContext.hasPermission(permission)
      );
      
      if (!hasAllPermissions) {
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        );
      }
    }

    // All checks passed, call the handler
    return handler(req, authContext);
  };
}

/**
 * Utility function to get current user from server components
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    const userEmail = headersList.get('x-user-email');
    const userRole = headersList.get('x-user-role');
    const userActive = headersList.get('x-user-active');

    if (!userId || !userEmail || !userRole) {
      return null;
    }

    return {
      userId,
      email: userEmail,
      role: userRole as 'admin' | 'moderator' | 'member',
      isActive: userActive !== 'false',
      cognitoSub: userId, // Fallback
      expiresAt: Date.now() + AUTH_CONFIG.session.maxAge * 1000,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Error types for authentication
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Export authentication errors
export const AUTH_ERRORS = {
  TOKEN_MISSING: new AuthError('Authentication token missing', 'TOKEN_MISSING', 401),
  TOKEN_INVALID: new AuthError('Invalid authentication token', 'TOKEN_INVALID', 401),
  TOKEN_EXPIRED: new AuthError('Authentication token expired', 'TOKEN_EXPIRED', 401),
  USER_NOT_FOUND: new AuthError('User not found', 'USER_NOT_FOUND', 401),
  USER_INACTIVE: new AuthError('User account is inactive', 'USER_INACTIVE', 403),
  INSUFFICIENT_ROLE: new AuthError('Insufficient role privileges', 'INSUFFICIENT_ROLE', 403),
  INSUFFICIENT_PERMISSIONS: new AuthError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403),
} as const;