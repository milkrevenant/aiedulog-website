/**
 * Enterprise Security Middleware
 * Comprehensive security checks, rate limiting, and threat detection
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuditService } from '../services/audit-service';

export interface SecurityContext {
  userId?: string;
  adminId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  permissions: string[];
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
}

export class SecurityMiddleware {
  private auditService = new AuditService();
  private supabase: any;

  constructor(supabase?: any) {
    this.supabase = supabase || createClient();
  }

  // Rate limiting storage (in production, use Redis)
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  /**
   * Main security validation middleware
   */
  async validateRequest(request: NextRequest): Promise<{
    success: boolean;
    context?: SecurityContext;
    error?: string;
    shouldBlock?: boolean;
  }> {
    try {
      const ipAddress = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';

      // 1. Check IP-based rate limiting
      const rateLimitCheck = await this.checkRateLimit(ipAddress);
      if (!rateLimitCheck.allowed) {
        await this.auditService.createAuditLog({
          event_type: 'security_incident',
          event_category: 'security',
          actor_type: 'system',
          action: 'rate_limit_exceeded',
          description: `Rate limit exceeded from IP: ${ipAddress}`,
          severity: 'warning',
          metadata: {
            ip_address: ipAddress,
            user_agent: userAgent,
            limit_info: rateLimitCheck
          }
        });

        return {
          success: false,
          error: 'Rate limit exceeded',
          shouldBlock: true
        };
      }

      // 2. Check user authentication
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      // 3. Get admin identity
      const { data: adminProfile } = await this.supabase
        .from('auth_methods')
        .select('identity_id')
        .eq('provider_user_id', user.user.id)
        .single();

      if (!adminProfile) {
        return {
          success: false,
          error: 'Admin profile not found'
        };
      }

      // 4. Validate admin session
      const sessionValidation = await this.validateAdminSession(
        adminProfile.identity_id,
        ipAddress,
        userAgent
      );

      if (!sessionValidation.valid) {
        return {
          success: false,
          error: sessionValidation.reason,
          shouldBlock: sessionValidation.shouldBlock
        };
      }

      // 5. Get user permissions
      const permissions = await this.getUserPermissions(adminProfile.identity_id);

      // 6. Calculate risk score
      const riskScore = await this.calculateRiskScore({
        userId: user.user.id,
        adminId: adminProfile.identity_id,
        ipAddress,
        userAgent,
        sessionAge: sessionValidation.sessionAge
      });

      // 7. Log high-risk access
      if (riskScore >= 75) {
        await this.auditService.createAuditLog({
          event_type: 'security_incident',
          event_category: 'security',
          actor_type: 'admin',
          // actor_id: adminProfile.identity_id,
          action: 'high_risk_access',
          description: `High risk admin access detected (score: ${riskScore})`,
          severity: 'warning',
          metadata: {
            risk_score: riskScore,
            ip_address: ipAddress,
            user_agent: userAgent
          }
        });
      }

      const context: SecurityContext = {
        userId: user.user.id,
        adminId: adminProfile.identity_id,
        sessionId: sessionValidation.sessionId,
        ipAddress,
        userAgent,
        riskScore,
        permissions,
        rateLimit: {
          remaining: rateLimitCheck.remaining,
          resetTime: rateLimitCheck.resetTime
        }
      };

      return {
        success: true,
        context
      };
    } catch (error) {
      console.error('Security validation failed:', error);
      return {
        success: false,
        error: 'Security validation failed'
      };
    }
  }

  /**
   * Check API rate limits
   */
  private async checkRateLimit(ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // 100 requests per 15 minutes

    const key = `rate_limit:${ipAddress}`;
    const current = this.rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      // New or expired window
      const resetTime = now + windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    // Increment counter
    current.count++;
    this.rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Validate admin session
   */
  private async validateAdminSession(
    adminId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    shouldBlock?: boolean;
    sessionId?: string;
    sessionAge?: number;
  }> {
    try {
      // Get active admin session
      const { data: session } = await this.supabase
        .from('admin_sessions')
        .select('*')
        .eq('admin_user_id', adminId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        return {
          valid: false,
          reason: 'No active admin session found'
        };
      }

      // Check session age
      const sessionAge = Date.now() - new Date(session.created_at).getTime();
      const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours

      if (sessionAge > maxSessionAge) {
        // Deactivate expired session
        await this.supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('id', session.id);

        return {
          valid: false,
          reason: 'Session expired',
          shouldBlock: false
        };
      }

      // Check for session hijacking (IP and User-Agent changes)
      if (session.ip_address !== ipAddress) {
        await this.auditService.createAuditLog({
          event_type: 'security_incident',
          event_category: 'security',
          actor_type: 'admin',
          // actor_id: adminId,
          action: 'session_ip_change',
          description: 'Admin session IP address changed',
          severity: 'critical',
          metadata: {
            original_ip: session.ip_address,
            new_ip: ipAddress,
            session_id: session.id
          }
        });

        // Optionally deactivate session for security
        await this.supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('id', session.id);

        return {
          valid: false,
          reason: 'Session security violation',
          shouldBlock: true
        };
      }

      // Update session activity
      await this.supabase
        .from('admin_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', session.id);

      return {
        valid: true,
        sessionId: session.id,
        sessionAge: sessionAge
      };
    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        valid: false,
        reason: 'Session validation error'
      };
    }
  }

  /**
   * Get user permissions
   */
  private async getUserPermissions(adminId: string): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('admin_user_roles')
        .select(`
          admin_roles (
            admin_role_permissions (
              admin_permissions (name)
            )
          )
        `)
        .eq('user_id', adminId)
        .eq('is_active', true);

      const permissions = new Set<string>();

      (data || []).forEach((userRole: any) => {
        userRole.admin_roles?.admin_role_permissions?.forEach((rolePermission: any) => {
          permissions.add(rolePermission.admin_permissions.name);
        });
      });

      return Array.from(permissions);
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Calculate risk score based on various factors
   */
  private async calculateRiskScore(factors: {
    userId: string;
    adminId: string;
    ipAddress: string;
    userAgent: string;
    sessionAge?: number;
  }): Promise<number> {
    let riskScore = 0;

    try {
      // 1. Check for recent failed login attempts
      const { count: failedLogins } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'login_failed')
        .eq('actor_ip_address', factors.ipAddress)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedLogins > 5) riskScore += 30;
      else if (failedLogins > 2) riskScore += 15;

      // 2. Check for unusual access patterns
      const { data: recentAccess } = await this.supabase
        .from('admin_sessions')
        .select('ip_address, user_agent')
        .eq('admin_user_id', factors.adminId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const uniqueIPs = new Set((recentAccess || []).map((a: any) => a.ip_address));
      if (uniqueIPs.size > 5) riskScore += 20;

      // 3. Check session age
      if (factors.sessionAge && factors.sessionAge > 6 * 60 * 60 * 1000) {
        riskScore += 10; // Old sessions are riskier
      }

      // 4. Check for suspicious user agent patterns
      if (!factors.userAgent || factors.userAgent.length < 10) {
        riskScore += 25; // Very short or missing user agent
      }

      // 5. Time-based risk (access during unusual hours)
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        riskScore += 10; // Late night/early morning access
      }

      // 6. Check for recent security incidents
      const { count: securityIncidents } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('actor_id', factors.adminId)
        .eq('event_category', 'security')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (securityIncidents > 0) riskScore += 40;

      return Math.min(riskScore, 100); // Cap at 100
    } catch (error) {
      console.error('Risk calculation failed:', error);
      return 50; // Default moderate risk
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    );
  }

  /**
   * Check if operation requires elevated permissions
   */
  async requiresElevatedPermissions(operation: string): Promise<boolean> {
    const dangerousOperations = [
      'user.delete',
      'system.maintenance',
      'admin.roles.manage',
      'content.delete',
      'security.investigate'
    ];

    return dangerousOperations.includes(operation);
  }

  /**
   * Validate dangerous operation with additional checks
   */
  async validateDangerousOperation(
    context: SecurityContext,
    operation: string,
    confirmationToken?: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresConfirmation?: boolean;
  }> {
    try {
      // Check if user has the required permission
      if (!context.permissions.includes(operation)) {
        return {
          allowed: false,
          reason: 'Insufficient permissions'
        };
      }

      // Check risk score
      if (context.riskScore > 75) {
        await this.auditService.createAuditLog({
          event_type: 'security_incident',
          event_category: 'security',
          actor_type: 'admin',
          // actor_id: context.adminId,
          action: 'high_risk_dangerous_operation',
          description: `Dangerous operation ${operation} attempted with high risk score`,
          severity: 'critical',
          metadata: {
            operation,
            risk_score: context.riskScore
          }
        });

        return {
          allowed: false,
          reason: 'Risk score too high for dangerous operation'
        };
      }

      // Check for confirmation token if required
      if (this.requiresConfirmationToken(operation)) {
        if (!confirmationToken) {
          return {
            allowed: false,
            requiresConfirmation: true,
            reason: 'Confirmation required for dangerous operation'
          };
        }

        // Validate confirmation token (implement your own token validation)
        if (!(await this.validateConfirmationToken(confirmationToken, context.adminId || '', operation))) {
          return {
            allowed: false,
            reason: 'Invalid confirmation token'
          };
        }
      }

      // Log dangerous operation approval
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'authorization',
        actor_type: 'admin',
        // actor_id: context.adminId,
        action: 'dangerous_operation_approved',
        description: `Dangerous operation ${operation} approved after security checks`,
        metadata: {
          operation,
          risk_score: context.riskScore,
          had_confirmation: !!confirmationToken
        }
      });

      return {
        allowed: true
      };
    } catch (error) {
      console.error('Dangerous operation validation failed:', error);
      return {
        allowed: false,
        reason: 'Security validation failed'
      };
    }
  }

  /**
   * Check if operation requires confirmation token
   */
  private requiresConfirmationToken(operation: string): boolean {
    const criticalOperations = [
      'user.delete',
      'system.maintenance',
      'admin.roles.manage'
    ];

    return criticalOperations.includes(operation);
  }

  /**
   * Validate confirmation token
   */
  private async validateConfirmationToken(
    token: string,
    adminId: string,
    operation: string
  ): Promise<boolean> {
    // This is a simplified implementation
    // In production, implement proper token-based confirmation
    // (e.g., TOTP, SMS, email confirmation, etc.)
    
    try {
      // Check if token exists and is valid (within last 5 minutes)
      const { data: tokenRecord } = await this.supabase
        .from('admin_confirmation_tokens')
        .select('*')
        .eq('admin_id', adminId)
        .eq('token', token)
        .eq('operation', operation)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!tokenRecord) {
        return false;
      }

      // Mark token as used
      await this.supabase
        .from('admin_confirmation_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id);

      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Generate confirmation token for dangerous operations
   */
  async generateConfirmationToken(
    adminId: string,
    operation: string,
    expirationMinutes: number = 5
  ): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    try {
      await this.supabase
        .from('admin_confirmation_tokens')
        .insert({
          admin_id: adminId,
          token,
          operation,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      return token;
    } catch (error) {
      console.error('Failed to generate confirmation token:', error);
      throw new Error('Failed to generate confirmation token');
    }
  }
}