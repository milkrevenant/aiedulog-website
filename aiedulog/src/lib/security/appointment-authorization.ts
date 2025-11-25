/**
 * Comprehensive Authorization System for Appointment Management
 * 
 * FIXES: CRITICAL-04 - Authorization Logic Flaws (CVSS 8.5)
 * 
 * SECURITY FEATURES:
 * - Role-based access control (RBAC)
 * - Resource-level authorization
 * - Context-aware permission checking
 * - Audit logging for all authorization decisions
 * - Time-based access controls
 * - Business rule enforcement
 * - Multi-layer security validation
 * - Defense against privilege escalation
 * 
 * REPLACES VULNERABLE CODE:
 * ```typescript
 * // BEFORE (VULNERABLE):
 * const hasAccess = appointment.user_id === context.userId || 
 *                  appointment.instructor_id === context.userId;
 * ```
 * 
 * WITH SECURE IMPLEMENTATION:
 * - Comprehensive role validation
 * - Context verification
 * - Business rule enforcement
 * - Audit trail logging
 * - Time-based restrictions
 */

import { createClient } from '@/lib/supabase/server';
import { AppointmentStatus, MeetingType } from '@/types/appointment-system';

export interface AuthorizationContext {
  userId: string;
  userRole: string;
  userStatus: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  grantedPermissions?: string[];
  deniedPermissions?: string[];
  conditions?: string[];
  auditId?: string;
}

export interface ResourceAccess {
  resource: string;
  resourceId: string;
  action: AuthorizationAction;
  context: AuthorizationContext;
  businessRules?: Record<string, any>;
}

export enum AuthorizationAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  CANCEL = 'cancel',
  RESCHEDULE = 'reschedule',
  APPROVE = 'approve',
  REJECT = 'reject',
  VIEW_DETAILS = 'view_details',
  MANAGE = 'manage'
}

export enum UserRole {
  USER = 'user',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support',
  READONLY = 'readonly'
}

export interface AppointmentAccessRules {
  allowedStatuses: AppointmentStatus[];
  timeRestrictions?: {
    minHoursBefore?: number;
    maxDaysAfter?: number;
    businessHoursOnly?: boolean;
  };
  roleSpecificRules?: Record<string, any>;
}

/**
 * 🔒 SECURE AUTHORIZATION SERVICE
 * Replaces vulnerable simple OR logic with comprehensive RBAC
 */
export class AppointmentAuthorization {
  private static readonly ROLE_HIERARCHY = {
    [UserRole.SUPER_ADMIN]: 100,
    [UserRole.ADMIN]: 80,
    [UserRole.SUPPORT]: 60,
    [UserRole.INSTRUCTOR]: 40,
    [UserRole.USER]: 20,
    [UserRole.READONLY]: 10
  };

  private static readonly ROLE_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: [
      'appointment:*',
      'user:*',
      'system:*'
    ],
    [UserRole.ADMIN]: [
      'appointment:read',
      'appointment:update',
      'appointment:cancel',
      'appointment:manage',
      'user:read',
      'user:update'
    ],
    [UserRole.SUPPORT]: [
      'appointment:read',
      'appointment:update',
      'user:read'
    ],
    [UserRole.INSTRUCTOR]: [
      'appointment:read:own',
      'appointment:update:own',
      'appointment:create:as_instructor',
      'appointment:cancel:as_instructor',
      'appointment:reschedule:own'
    ],
    [UserRole.USER]: [
      'appointment:create:own',
      'appointment:read:own',
      'appointment:update:own',
      'appointment:cancel:own',
      'appointment:reschedule:own'
    ],
    [UserRole.READONLY]: [
      'appointment:read:own'
    ]
  };

  /**
   * 🔒 MAIN AUTHORIZATION FUNCTION
   * Validates appointment access with comprehensive security checks
   */
  static async validateAppointmentAccess(
    appointmentId: string,
    action: AuthorizationAction,
    context: AuthorizationContext
  ): Promise<AuthorizationResult> {
    try {
      // 🔒 SECURITY: Comprehensive context validation
      const contextValidation = await this.validateAuthorizationContext(context);
      if (!contextValidation.valid) {
        return {
          authorized: false,
          reason: `Invalid authorization context: ${contextValidation.reason}`,
          auditId: await this.auditAuthorizationDecision(context, appointmentId, action, false, contextValidation.reason)
        };
      }

      // 🔒 SECURITY: Get appointment with full security context
      const appointment = await this.getAppointmentWithSecurityContext(appointmentId);
      if (!appointment) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, 'Appointment not found');
        return {
          authorized: false,
          reason: 'Appointment not found or access denied',
          auditId
        };
      }

      // 🔒 SECURITY: Verify user and related entities are active
      const entityValidation = await this.validateEntityStates(appointment);
      if (!entityValidation.valid) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, entityValidation.reason);
        return {
          authorized: false,
          reason: entityValidation.reason,
          auditId
        };
      }

      // 🔒 SECURITY: Role-based permission checking
      const rolePermission = await this.checkRolePermissions(context.userRole, action, appointment, context.userId);
      if (!rolePermission.authorized) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, rolePermission.reason);
        return {
          authorized: false,
          reason: rolePermission.reason,
          auditId
        };
      }

      // 🔒 SECURITY: Resource ownership validation
      const ownershipValidation = await this.validateResourceOwnership(appointment, context, action);
      if (!ownershipValidation.authorized) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, ownershipValidation.reason);
        return {
          authorized: false,
          reason: ownershipValidation.reason,
          auditId
        };
      }

      // 🔒 SECURITY: Business rule validation
      const businessRuleValidation = await this.validateBusinessRules(appointment, action, context);
      if (!businessRuleValidation.authorized) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, businessRuleValidation.reason);
        return {
          authorized: false,
          reason: businessRuleValidation.reason,
          auditId
        };
      }

      // 🔒 SECURITY: Time-based access controls
      const timeValidation = await this.validateTimeBasedAccess(appointment, action, context);
      if (!timeValidation.authorized) {
        const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, timeValidation.reason);
        return {
          authorized: false,
          reason: timeValidation.reason,
          auditId
        };
      }

      // ✅ AUTHORIZATION GRANTED
      const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, true);
      
      return {
        authorized: true,
        grantedPermissions: rolePermission.permissions,
        conditions: businessRuleValidation.conditions,
        auditId
      };

    } catch (error) {
      const errorMessage = `Authorization check failed: ${error instanceof Error ? error.message : 'unknown error'}`;
      const auditId = await this.auditAuthorizationDecision(context, appointmentId, action, false, errorMessage);
      
      return {
        authorized: false,
        reason: 'Authorization system error',
        auditId
      };
    }
  }

  /**
   * 🔒 CONTEXT VALIDATION: Ensure authorization context is secure
   */
  private static async validateAuthorizationContext(context: AuthorizationContext): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Validate required fields
    if (!context.userId || !context.userRole || !context.userStatus) {
      return { valid: false, reason: 'Missing required context fields' };
    }

    // Validate user exists and is active
    const supabase = createClient();
    const { data: user, error } = await supabase
      .from('identities')
      .select('id, status, role, created_at')
      .eq('id', context.userId)
      .single();

    if (error || !user) {
      return { valid: false, reason: 'User not found' };
    }

    if (user.status !== 'active') {
      return { valid: false, reason: 'User account not active' };
    }

    // Validate role consistency
    if (user.role !== context.userRole) {
      return { valid: false, reason: 'Role mismatch detected' };
    }

    // Validate timestamp is recent (prevent replay attacks)
    const now = new Date();
    const contextAge = now.getTime() - context.timestamp.getTime();
    if (contextAge > 300000) { // 5 minutes
      return { valid: false, reason: 'Context timestamp too old' };
    }

    return { valid: true };
  }

  /**
   * 🔒 GET APPOINTMENT WITH SECURITY CONTEXT
   */
  private static async getAppointmentWithSecurityContext(appointmentId: string): Promise<any> {
    const supabase = createClient();
    
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        user:identities!appointments_user_id_fkey(
          id, 
          full_name, 
          email, 
          status,
          role,
          created_at
        ),
        instructor:identities!appointments_instructor_id_fkey(
          id, 
          full_name, 
          email, 
          status,
          role,
          created_at
        ),
        appointment_type:appointment_types(
          id,
          type_name,
          instructor_id,
          price,
          cancellation_hours,
          is_active
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment for authorization:', error);
      return null;
    }

    return appointment;
  }

  /**
   * 🔒 ENTITY STATE VALIDATION
   */
  private static async validateEntityStates(appointment: any): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check user status
    if (appointment.user?.status !== 'active') {
      return { valid: false, reason: 'Appointment user is not active' };
    }

    // Check instructor status
    if (appointment.instructor?.status !== 'active') {
      return { valid: false, reason: 'Appointment instructor is not active' };
    }

    // Check appointment type is active
    if (appointment.appointment_type && !appointment.appointment_type.is_active) {
      return { valid: false, reason: 'Appointment type is not active' };
    }

    return { valid: true };
  }

  /**
   * 🔒 ROLE PERMISSION CHECKING
   */
  private static async checkRolePermissions(
    userRole: string,
    action: AuthorizationAction,
    appointment: any,
    userId: string
  ): Promise<{
    authorized: boolean;
    reason?: string;
    permissions?: string[];
  }> {
    const permissions = this.ROLE_PERMISSIONS[userRole as UserRole] || [];
    
    // Super admin has all permissions
    if (userRole === UserRole.SUPER_ADMIN) {
      return {
        authorized: true,
        permissions: ['*']
      };
    }

    // Admin permissions (can manage most appointments)
    if (userRole === UserRole.ADMIN) {
      const adminActions = [
        AuthorizationAction.READ,
        AuthorizationAction.UPDATE,
        AuthorizationAction.CANCEL,
        AuthorizationAction.MANAGE
      ];
      
      if (adminActions.includes(action)) {
        return {
          authorized: true,
          permissions: ['appointment:admin']
        };
      }
    }

    // Support permissions (read/update only)
    if (userRole === UserRole.SUPPORT) {
      const supportActions = [
        AuthorizationAction.READ,
        AuthorizationAction.UPDATE
      ];
      
      if (supportActions.includes(action)) {
        return {
          authorized: true,
          permissions: ['appointment:support']
        };
      }
    }

    // Instructor permissions (for their own appointments)
    if (userRole === UserRole.INSTRUCTOR && appointment.instructor_id === userId) {
      const instructorActions = [
        AuthorizationAction.READ,
        AuthorizationAction.UPDATE,
        AuthorizationAction.CANCEL,
        AuthorizationAction.RESCHEDULE
      ];
      
      if (instructorActions.includes(action)) {
        return {
          authorized: true,
          permissions: ['appointment:instructor:own']
        };
      }
    }

    // User permissions (for their own appointments)
    if (userRole === UserRole.USER && appointment.user_id === userId) {
      const userActions = [
        AuthorizationAction.CREATE,
        AuthorizationAction.READ,
        AuthorizationAction.UPDATE,
        AuthorizationAction.CANCEL,
        AuthorizationAction.RESCHEDULE
      ];
      
      if (userActions.includes(action)) {
        return {
          authorized: true,
          permissions: ['appointment:user:own']
        };
      }
    }

    return {
      authorized: false,
      reason: `Role ${userRole} does not have permission for action ${action}`
    };
  }

  /**
   * 🔒 RESOURCE OWNERSHIP VALIDATION
   */
  private static async validateResourceOwnership(
    appointment: any,
    context: AuthorizationContext,
    action: AuthorizationAction
  ): Promise<{
    authorized: boolean;
    reason?: string;
  }> {
    const { userId, userRole } = context;

    // Admin and support roles bypass ownership checks
    if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT].includes(userRole as UserRole)) {
      return { authorized: true };
    }

    // For regular users and instructors, check ownership
    const isOwner = appointment.user_id === userId;
    const isInstructor = appointment.instructor_id === userId;
    const hasRelationship = isOwner || isInstructor;

    if (!hasRelationship) {
      return {
        authorized: false,
        reason: 'User has no relationship to this appointment'
      };
    }

    // Additional ownership validation based on action
    if (action === AuthorizationAction.DELETE && !isOwner && userRole !== UserRole.INSTRUCTOR) {
      return {
        authorized: false,
        reason: 'Only appointment owner or instructor can delete appointments'
      };
    }

    return { authorized: true };
  }

  /**
   * 🔒 BUSINESS RULE VALIDATION
   */
  private static async validateBusinessRules(
    appointment: any,
    action: AuthorizationAction,
    context: AuthorizationContext
  ): Promise<{
    authorized: boolean;
    reason?: string;
    conditions?: string[];
  }> {
    const conditions: string[] = [];

    // Rule 1: Cannot modify completed appointments
    if (appointment.status === AppointmentStatus.COMPLETED && 
        [AuthorizationAction.UPDATE, AuthorizationAction.DELETE].includes(action)) {
      return {
        authorized: false,
        reason: 'Cannot modify completed appointments'
      };
    }

    // Rule 2: Cannot cancel already cancelled appointments
    if (appointment.status === AppointmentStatus.CANCELLED && 
        action === AuthorizationAction.CANCEL) {
      return {
        authorized: false,
        reason: 'Appointment is already cancelled'
      };
    }

    // Rule 3: Cancellation time restrictions
    if (action === AuthorizationAction.CANCEL && appointment.appointment_type?.cancellation_hours) {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilAppointment < appointment.appointment_type.cancellation_hours) {
        // Allow admin/instructor to override, but add condition
        if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(context.userRole as UserRole)) {
          conditions.push('Late cancellation - policy override applied');
        } else {
          return {
            authorized: false,
            reason: `Cancellation requires at least ${appointment.appointment_type.cancellation_hours} hours notice`
          };
        }
      }
    }

    // Rule 4: Update restrictions based on appointment status
    if (action === AuthorizationAction.UPDATE) {
      const restrictedStatuses = [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED];
      if (restrictedStatuses.includes(appointment.status)) {
        return {
          authorized: false,
          reason: `Cannot update appointments with status: ${appointment.status}`
        };
      }
    }

    // Rule 5: Reschedule restrictions
    if (action === AuthorizationAction.RESCHEDULE) {
      if (appointment.status === AppointmentStatus.COMPLETED) {
        return {
          authorized: false,
          reason: 'Cannot reschedule completed appointments'
        };
      }
    }

    return {
      authorized: true,
      conditions: conditions.length > 0 ? conditions : undefined
    };
  }

  /**
   * 🔒 TIME-BASED ACCESS VALIDATION
   */
  private static async validateTimeBasedAccess(
    appointment: any,
    action: AuthorizationAction,
    context: AuthorizationContext
  ): Promise<{
    authorized: boolean;
    reason?: string;
  }> {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);

    // Rule 1: Cannot modify past appointments (except admins)
    if (appointmentDateTime < now && 
        [AuthorizationAction.UPDATE, AuthorizationAction.RESCHEDULE].includes(action) &&
        ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(context.userRole as UserRole)) {
      return {
        authorized: false,
        reason: 'Cannot modify past appointments'
      };
    }

    // Rule 2: Restrict modifications too close to appointment time
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 1 && 
        [AuthorizationAction.UPDATE, AuthorizationAction.RESCHEDULE].includes(action) &&
        context.userRole === UserRole.USER) {
      return {
        authorized: false,
        reason: 'Cannot modify appointments less than 1 hour before start time'
      };
    }

    return { authorized: true };
  }

  /**
   * 🔒 AUDIT LOGGING: Log all authorization decisions for security monitoring
   */
  private static async auditAuthorizationDecision(
    context: AuthorizationContext,
    resourceId: string,
    action: AuthorizationAction,
    authorized: boolean,
    reason?: string
  ): Promise<string> {
    try {
      const supabase = createClient();
      const insertOptions = { select: 'id' };

      const { data: insertedAudit, error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'authorization_decision',
          user_id: context.userId,
          table_name: 'appointments',
          record_id: resourceId,
          session_id: context.sessionId,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          success: authorized,
          error_message: reason,
          metadata: {
            action,
            user_role: context.userRole,
            user_status: context.userStatus,
            timestamp: context.timestamp.toISOString(),
            resource_type: 'appointment'
          }
        }, insertOptions);

      if (error) {
        throw error;
      }

      const auditRecord = Array.isArray(insertedAudit) ? insertedAudit[0] : insertedAudit;
      const auditId = (auditRecord as { id?: string | null } | null | undefined)?.id || null;

      return auditId || 'audit-log-failed';
    } catch (error) {
      console.error('Failed to audit authorization decision:', error);
      return 'audit-log-error';
    }
  }

  /**
   * 🔒 BATCH AUTHORIZATION: Validate access to multiple appointments
   */
  static async validateBatchAccess(
    appointmentIds: string[],
    action: AuthorizationAction,
    context: AuthorizationContext
  ): Promise<{
    authorized: string[];
    denied: Array<{ id: string; reason: string }>;
    summary: {
      total: number;
      authorized: number;
      denied: number;
    };
  }> {
    const authorized: string[] = [];
    const denied: Array<{ id: string; reason: string }> = [];

    // Process in parallel with rate limiting
    const batchSize = 10; // Process 10 at a time to prevent overload
    
    for (let i = 0; i < appointmentIds.length; i += batchSize) {
      const batch = appointmentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (appointmentId) => {
        const result = await this.validateAppointmentAccess(appointmentId, action, context);
        
        if (result.authorized) {
          authorized.push(appointmentId);
        } else {
          denied.push({ 
            id: appointmentId, 
            reason: result.reason || 'Access denied' 
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      authorized,
      denied,
      summary: {
        total: appointmentIds.length,
        authorized: authorized.length,
        denied: denied.length
      }
    };
  }

  /**
   * 🔒 GET USER PERMISSIONS: Get all permissions for a user
   */
  static async getUserPermissions(userId: string): Promise<{
    role: string;
    permissions: string[];
    restrictions: string[];
  }> {
    try {
      const supabase = createClient();
      
      const { data: user, error } = await supabase
        .from('identities')
        .select('role, status')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          role: 'none',
          permissions: [],
          restrictions: ['User not found']
        };
      }

      const permissions = this.ROLE_PERMISSIONS[user.role as UserRole] || [];
      const restrictions: string[] = [];

      if (user.status !== 'active') {
        restrictions.push('Account not active');
      }

      return {
        role: user.role,
        permissions,
        restrictions
      };
    } catch (error) {
      return {
        role: 'error',
        permissions: [],
        restrictions: ['Permission check failed']
      };
    }
  }

  /**
   * 🔒 SECURITY REPORT: Generate authorization security report
   */
  static async generateSecurityReport(userId?: string): Promise<{
    summary: {
      totalDecisions: number;
      authorizedDecisions: number;
      deniedDecisions: number;
      errorDecisions: number;
    };
    recentActivity: Array<{
      timestamp: string;
      userId: string;
      action: string;
      resource: string;
      authorized: boolean;
      reason?: string;
    }>;
    suspiciousActivity: Array<{
      userId: string;
      pattern: string;
      count: number;
      lastOccurrence: string;
    }>;
  }> {
    try {
      const supabase = createClient();
      
      // Get recent authorization decisions
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .eq('event_type', 'authorization_decision')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: auditLogs, error } = await query;

      if (error) {
        throw error;
      }

      type AuditLogRecord = {
        success?: boolean;
        error_message?: string | null;
        created_at?: string;
        user_id?: string;
        metadata?: { action?: string } | null;
        record_id?: string | null;
      };

      const logs: AuditLogRecord[] = (auditLogs || []) as AuditLogRecord[];

      // Calculate summary
      const summary = {
        totalDecisions: logs.length,
        authorizedDecisions: logs.filter(log => log.success).length,
        deniedDecisions: logs.filter(log => !log.success && !log.error_message?.includes('system error')).length,
        errorDecisions: logs.filter(log => log.error_message?.includes('system error')).length
      };

      // Format recent activity
      const recentActivity = logs.slice(0, 20).map(log => ({
        timestamp: log.created_at ?? '',
        userId: log.user_id ?? 'unknown',
        action: log.metadata?.action || 'unknown',
        resource: log.record_id || 'unknown',
        authorized: Boolean(log.success),
        reason: log.error_message ?? undefined
      }));

      // Detect suspicious activity patterns
      const suspiciousActivity: Array<any> = [];
      const toTimestamp = (value?: string | null) => (value ? new Date(value).getTime() : 0);
      
      // Pattern 1: Multiple failed authorizations
      const failedByUser = logs
        .filter(log => !log.success)
        .reduce((acc, log) => {
          const failedUserId = log.user_id;
          if (!failedUserId) {
            return acc;
          }
          acc[failedUserId] = (acc[failedUserId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      Object.entries(failedByUser).forEach(([userId, count]) => {
        if ((count as number) >= 10) { // 10 or more failures
          const lastFailure = logs
            .filter(log => log.user_id === userId && !log.success)
            .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))[0];
          
          suspiciousActivity.push({
            userId,
            pattern: 'Multiple authorization failures',
            count,
            lastOccurrence: lastFailure?.created_at || 'unknown'
          });
        }
      });

      return {
        summary,
        recentActivity,
        suspiciousActivity
      };
    } catch (error) {
      console.error('Failed to generate security report:', error);
      return {
        summary: { totalDecisions: 0, authorizedDecisions: 0, deniedDecisions: 0, errorDecisions: 0 },
        recentActivity: [],
        suspiciousActivity: []
      };
    }
  }
}

// Export types and utilities
export default AppointmentAuthorization;

/**
 * Helper functions for common authorization checks
 */
export const authorize = {
  appointment: {
    read: (appointmentId: string, context: AuthorizationContext) =>
      AppointmentAuthorization.validateAppointmentAccess(appointmentId, AuthorizationAction.READ, context),
    update: (appointmentId: string, context: AuthorizationContext) =>
      AppointmentAuthorization.validateAppointmentAccess(appointmentId, AuthorizationAction.UPDATE, context),
    cancel: (appointmentId: string, context: AuthorizationContext) =>
      AppointmentAuthorization.validateAppointmentAccess(appointmentId, AuthorizationAction.CANCEL, context),
    reschedule: (appointmentId: string, context: AuthorizationContext) =>
      AppointmentAuthorization.validateAppointmentAccess(appointmentId, AuthorizationAction.RESCHEDULE, context),
    delete: (appointmentId: string, context: AuthorizationContext) =>
      AppointmentAuthorization.validateAppointmentAccess(appointmentId, AuthorizationAction.DELETE, context)
  }
};
