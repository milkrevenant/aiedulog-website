/**
 * Core Security Functions
 * Simplified, focused security utilities for API protection
 * 
 * DESIGN PRINCIPLES:
 * - Keep it simple and maintainable (~300 lines total)
 * - Fail securely by default
 * - Clear environment-based configuration
 * - Easy to understand and debug
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Security roles in order of privilege
export enum SecurityRole {
  ANONYMOUS = 'anonymous',
  AUTHENTICATED = 'authenticated',
  VERIFIED = 'verified', 
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM = 'system'
}

// Simple security context for requests
export interface SecurityContext {
  requestId: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  origin?: string;
  userId?: string;
  userRole: SecurityRole;
  sessionValid: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Security configuration with sensible defaults
export interface SecurityConfig {
  requireAuth?: boolean;
  minimumRole?: SecurityRole;
  rateLimitKey?: string;
  maxRequestSizeMB?: number;
  allowedOrigins?: string[];
  enableCSRF?: boolean;
  auditLevel?: 'none' | 'basic' | 'detailed';
}

// Default security settings
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  requireAuth: true,
  minimumRole: SecurityRole.AUTHENTICATED,
  maxRequestSizeMB: 10,
  enableCSRF: true,
  auditLevel: 'basic'
};

/**
 * Extract client IP address from request headers
 */
export function extractClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIP || realIP || forwarded?.split(',')[0].trim() || '127.0.0.1';
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(userRole: SecurityRole, requiredRole: SecurityRole): boolean {
  const roleHierarchy: Record<SecurityRole, number> = {
    [SecurityRole.ANONYMOUS]: 0,
    [SecurityRole.AUTHENTICATED]: 1,
    [SecurityRole.VERIFIED]: 2,
    [SecurityRole.MODERATOR]: 3,
    [SecurityRole.ADMIN]: 4,
    [SecurityRole.SUPER_ADMIN]: 5,
    [SecurityRole.SYSTEM]: 6
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Map database role to security role
 */
export function mapDatabaseRole(dbRole: string): SecurityRole {
  const roleMap: Record<string, SecurityRole> = {
    'super_admin': SecurityRole.SUPER_ADMIN,
    'admin': SecurityRole.ADMIN,
    'moderator': SecurityRole.MODERATOR,
    'verified': SecurityRole.VERIFIED,
    'user': SecurityRole.AUTHENTICATED
  };
  
  return roleMap[dbRole] || SecurityRole.AUTHENTICATED;
}

/**
 * Calculate request risk level based on simple indicators
 */
export function calculateRiskLevel(request: NextRequest, ipAddress: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check for missing user agent
  if (!userAgent) riskScore += 20;
  
  // Check for automation indicators
  const automationIndicators = ['bot', 'crawler', 'script', 'automated', 'curl', 'wget'];
  if (automationIndicators.some(indicator => userAgent.toLowerCase().includes(indicator))) {
    riskScore += 15;
  }
  
  // Check for suspicious paths
  const url = request.url.toLowerCase();
  const suspiciousPaths = ['admin', 'config', '.env', 'database', 'backup'];
  if (suspiciousPaths.some(path => url.includes(path))) {
    riskScore += 10;
  }
  
  // Check request method
  if (['DELETE', 'PUT', 'PATCH'].includes(request.method)) {
    riskScore += 5;
  }
  
  // Return risk level
  if (riskScore >= 35) return 'HIGH';
  if (riskScore >= 15) return 'MEDIUM';
  return 'LOW';
}

/**
 * Validate request size
 */
export function validateRequestSize(request: NextRequest, maxSizeMB: number): boolean {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return true; // Allow requests without content-length
  
  const sizeBytes = parseInt(contentLength);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  return sizeBytes <= maxSizeBytes;
}

/**
 * Check for malicious patterns in request
 */
export function detectMaliciousPatterns(request: NextRequest): string[] {
  const threats: string[] = [];
  const url = request.url.toLowerCase();
  
  // Path traversal
  if (url.includes('../') || url.includes('..\\') || url.includes('%2e%2e')) {
    threats.push('PATH_TRAVERSAL');
  }
  
  // SQL injection indicators
  const sqlPatterns = ['union+select', 'drop+table', 'delete+from', "'or'1'='1"];
  if (sqlPatterns.some(pattern => url.includes(pattern))) {
    threats.push('SQL_INJECTION');
  }
  
  // XSS indicators
  if (url.includes('<script') || url.includes('javascript:') || url.includes('%3cscript')) {
    threats.push('XSS_ATTEMPT');
  }
  
  return threats;
}

/**
 * Validate CORS origin
 */
export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Allow same-origin requests
  if (allowedOrigins.includes('*')) return true;
  
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }
    return origin === allowed;
  });
}

/**
 * Create security context from request
 */
export async function createSecurityContext(request: NextRequest): Promise<SecurityContext> {
  const requestId = generateRequestId();
  const timestamp = Date.now();
  const ipAddress = extractClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const origin = request.headers.get('origin') || undefined;
  const riskLevel = calculateRiskLevel(request, ipAddress);
  
  let userId: string | undefined;
  let userRole: SecurityRole = SecurityRole.ANONYMOUS;
  let sessionValid = false;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userId = user.id;
      sessionValid = true;
      
      // Get user role from database
      const { data: identity } = await supabase
        .from('identities')
        .select('role, status')
        .eq('id', user.id)
        .single();
      
      if (identity && identity.status === 'active') {
        userRole = mapDatabaseRole(identity.role);
      } else {
        sessionValid = false; // Invalid if user blocked/suspended
      }
    }
  } catch (error) {
    // Authentication failed, keep as anonymous
    console.warn('Authentication check failed:', error);
  }
  
  return {
    requestId,
    timestamp,
    ipAddress,
    userAgent,
    origin,
    userId,
    userRole,
    sessionValid,
    riskLevel
  };
}

/**
 * Generate security headers for responses
 */
export function getSecurityHeaders(context?: SecurityContext): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none';",
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
  };
  
  if (context) {
    headers['X-Request-ID'] = context.requestId;
    headers['X-Risk-Level'] = context.riskLevel;
  }
  
  return headers;
}

/**
 * Log security events (simple version)
 */
export async function logSecurityEvent(
  eventType: string,
  context: SecurityContext,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: eventType,
        user_id: context.userId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        metadata: {
          ...metadata,
          requestId: context.requestId,
          riskLevel: context.riskLevel,
          timestamp: context.timestamp
        },
        success: !eventType.includes('VIOLATION') && !eventType.includes('BLOCKED')
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}