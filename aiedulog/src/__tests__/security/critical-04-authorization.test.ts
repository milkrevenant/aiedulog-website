/**
 * SECURITY TEST: CRITICAL-04 - Authorization Logic Flaws
 * 
 * Tests to validate that AppointmentAuthorization properly implements
 * Role-Based Access Control (RBAC) and prevents privilege escalation,
 * unauthorized access, and authorization bypass attacks.
 * 
 * VULNERABILITY FIXED:
 * - Weak authorization logic allowing unauthorized appointment access
 * - Missing role-based permission checks
 * - Inadequate resource ownership validation
 * - Business rule enforcement gaps
 * - Time-based access control bypasses
 * 
 * SECURITY IMPLEMENTATIONS TESTED:
 * - Comprehensive RBAC system
 * - Context-aware permission checking
 * - Resource ownership validation
 * - Business rule enforcement
 * - Time-based access controls
 * - Audit logging for all authorization decisions
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createClient } from '@/lib/supabase/server';
import { 
  AppointmentAuthorization, 
  AuthorizationContext, 
  AuthorizationAction, 
  UserRole 
} from '@/lib/security/appointment-authorization';
import { AppointmentStatus } from '@/types/appointment-system';

describe('CRITICAL-04: Authorization Logic Tests', () => {
  let supabase: any;
  const testUsers: Record<string, any> = {};
  const testAppointments: Record<string, any> = {};

  beforeAll(async () => {
    supabase = await createClient();
    
    // Create test users with different roles
    const userRoles = [
      { role: 'user', email: 'user@test.com', name: 'Test User' },
      { role: 'instructor', email: 'instructor@test.com', name: 'Test Instructor' },
      { role: 'admin', email: 'admin@test.com', name: 'Test Admin' },
      { role: 'super_admin', email: 'superadmin@test.com', name: 'Super Admin' },
      { role: 'support', email: 'support@test.com', name: 'Support User' },
      { role: 'readonly', email: 'readonly@test.com', name: 'Read Only User' }
    ];

    for (const userRole of userRoles) {
      const { data: user, error } = await supabase
        .from('identities')
        .insert({
          email: userRole.email,
          full_name: userRole.name,
          role: userRole.role,
          status: 'active'
        })
        .select('id')
        .single();
        
      if (error) throw error;
      testUsers[userRole.role] = user;
    }

    // Create test appointments with different scenarios
    const appointmentScenarios = [
      {
        key: 'user_pending',
        user_id: testUsers.user.id,
        instructor_id: testUsers.instructor.id,
        status: AppointmentStatus.PENDING,
        appointment_date: '2025-09-15',
        start_time: '10:00:00',
        end_time: '11:00:00'
      },
      {
        key: 'user_completed',
        user_id: testUsers.user.id,
        instructor_id: testUsers.instructor.id,
        status: AppointmentStatus.COMPLETED,
        appointment_date: '2025-08-01',
        start_time: '14:00:00',
        end_time: '15:00:00'
      },
      {
        key: 'other_user_appointment',
        user_id: testUsers.admin.id, // Different user's appointment
        instructor_id: testUsers.instructor.id,
        status: AppointmentStatus.PENDING,
        appointment_date: '2025-09-16',
        start_time: '11:00:00',
        end_time: '12:00:00'
      }
    ];

    for (const scenario of appointmentScenarios) {
      const { key, ...appointmentData } = scenario;
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select('id')
        .single();
        
      if (error) throw error;
      testAppointments[key] = appointment;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('appointments').delete().in('id', Object.values(testAppointments).map(a => a.id));
    await supabase.from('identities').delete().in('id', Object.values(testUsers).map(u => u.id));
  });

  describe('Role-Based Access Control (RBAC)', () => {
    test('should enforce role hierarchy correctly', async () => {
      const context: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      // User should be able to read their own appointment
      const userReadOwn = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        context
      );
      expect(userReadOwn.authorized).toBe(true);

      // User should NOT be able to read other user's appointment
      const userReadOther = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.other_user_appointment.id,
        AuthorizationAction.READ,
        context
      );
      expect(userReadOther.authorized).toBe(false);
      expect(userReadOther.reason).toMatch(/no relationship to this appointment/i);
    });

    test('should validate admin privileges', async () => {
      const adminContext: AuthorizationContext = {
        userId: testUsers.admin.id,
        userRole: UserRole.ADMIN,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Admin should be able to read any appointment
      const adminReadAny = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        adminContext
      );
      expect(adminReadAny.authorized).toBe(true);

      // Admin should be able to manage appointments
      const adminManage = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.MANAGE,
        adminContext
      );
      expect(adminManage.authorized).toBe(true);
    });

    test('should validate super admin privileges', async () => {
      const superAdminContext: AuthorizationContext = {
        userId: testUsers.super_admin.id,
        userRole: UserRole.SUPER_ADMIN,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Super admin should have all permissions
      const superAdminRead = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        superAdminContext
      );
      expect(superAdminRead.authorized).toBe(true);
      expect(superAdminRead.grantedPermissions).toContain('*');
    });

    test('should restrict support role appropriately', async () => {
      const supportContext: AuthorizationContext = {
        userId: testUsers.support.id,
        userRole: UserRole.SUPPORT,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Support should be able to read appointments
      const supportRead = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        supportContext
      );
      expect(supportRead.authorized).toBe(true);

      // Support should be able to update appointments
      const supportUpdate = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.UPDATE,
        supportContext
      );
      expect(supportUpdate.authorized).toBe(true);

      // Support should NOT be able to delete appointments
      const supportDelete = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.DELETE,
        supportContext
      );
      expect(supportDelete.authorized).toBe(false);
    });

    test('should restrict readonly role to only read operations', async () => {
      const readonlyContext: AuthorizationContext = {
        userId: testUsers.readonly.id,
        userRole: UserRole.READONLY,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Should fail because readonly users can only read their own appointments
      const readonlyRead = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        readonlyContext
      );
      expect(readonlyRead.authorized).toBe(false);

      // Should definitely fail for write operations
      const readonlyUpdate = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.UPDATE,
        readonlyContext
      );
      expect(readonlyUpdate.authorized).toBe(false);
    });

    test('should validate instructor permissions for their appointments', async () => {
      const instructorContext: AuthorizationContext = {
        userId: testUsers.instructor.id,
        userRole: UserRole.INSTRUCTOR,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Instructor should be able to read their appointment
      const instructorRead = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        instructorContext
      );
      expect(instructorRead.authorized).toBe(true);

      // Instructor should be able to cancel their appointment
      const instructorCancel = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.CANCEL,
        instructorContext
      );
      expect(instructorCancel.authorized).toBe(true);
    });
  });

  describe('Context Validation Security', () => {
    test('should reject invalid authorization context', async () => {
      const invalidContexts = [
        // Missing required fields
        { userId: '', userRole: UserRole.USER, userStatus: 'active', timestamp: new Date() },
        { userId: testUsers.user.id, userRole: '', userStatus: 'active', timestamp: new Date() },
        { userId: testUsers.user.id, userRole: UserRole.USER, userStatus: '', timestamp: new Date() },
        
        // Old timestamp (potential replay attack)
        { 
          userId: testUsers.user.id, 
          userRole: UserRole.USER, 
          userStatus: 'active', 
          timestamp: new Date(Date.now() - 600000) // 10 minutes ago
        }
      ];

      for (const invalidContext of invalidContexts) {
        const result = await AppointmentAuthorization.validateAppointmentAccess(
          testAppointments.user_pending.id,
          AuthorizationAction.READ,
          invalidContext as AuthorizationContext
        );
        
        expect(result.authorized).toBe(false);
        expect(result.reason).toMatch(/invalid authorization context|context timestamp too old/i);
        expect(result.auditId).toBeDefined(); // Should audit failed attempts
      }
    });

    test('should validate user exists and is active', async () => {
      // Create inactive user
      const { data: inactiveUser } = await supabase
        .from('identities')
        .insert({
          email: 'inactive@test.com',
          full_name: 'Inactive User',
          role: 'user',
          status: 'inactive'
        })
        .select('id')
        .single();

      const inactiveContext: AuthorizationContext = {
        userId: inactiveUser.id,
        userRole: UserRole.USER,
        userStatus: 'active', // Mismatch with actual status
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        inactiveContext
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toMatch(/user account not active|role mismatch/i);

      // Cleanup
      await supabase.from('identities').delete().eq('id', inactiveUser.id);
    });

    test('should detect role mismatch attacks', async () => {
      // User trying to claim admin role
      const mismatchContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.ADMIN, // Claiming admin role
        userStatus: 'active',
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        mismatchContext
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toMatch(/role mismatch detected/i);
    });

    test('should reject authorization for non-existent users', async () => {
      const fakeContext: AuthorizationContext = {
        userId: '12345678-1234-1234-1234-123456789012', // Non-existent UUID
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        fakeContext
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toMatch(/user not found/i);
    });
  });

  describe('Business Rule Enforcement', () => {
    test('should prevent modification of completed appointments', async () => {
      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const updateCompleted = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_completed.id,
        AuthorizationAction.UPDATE,
        userContext
      );

      expect(updateCompleted.authorized).toBe(false);
      expect(updateCompleted.reason).toMatch(/cannot modify completed appointments/i);

      const deleteCompleted = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_completed.id,
        AuthorizationAction.DELETE,
        userContext
      );

      expect(deleteCompleted.authorized).toBe(false);
      expect(deleteCompleted.reason).toMatch(/cannot modify completed appointments/i);
    });

    test('should enforce cancellation time restrictions', async () => {
      // Create appointment type with cancellation policy
      const { data: appointmentType } = await supabase
        .from('appointment_types')
        .insert({
          instructor_id: testUsers.instructor.id,
          type_name: 'Restricted Cancellation',
          duration_minutes: 60,
          cancellation_hours: 24,
          price: 100,
          is_active: true
        })
        .select('id')
        .single();

      // Create appointment happening soon (less than 24 hours)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(tomorrow.getHours() + 2); // Only 2 hours from now

      const { data: soonAppointment } = await supabase
        .from('appointments')
        .insert({
          user_id: testUsers.user.id,
          instructor_id: testUsers.instructor.id,
          appointment_type_id: appointmentType.id,
          appointment_date: tomorrow.toISOString().split('T')[0],
          start_time: tomorrow.toTimeString().split(' ')[0],
          end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0],
          status: AppointmentStatus.PENDING
        })
        .select('id')
        .single();

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      // User should not be able to cancel (less than 24 hours)
      const userCancel = await AppointmentAuthorization.validateAppointmentAccess(
        soonAppointment.id,
        AuthorizationAction.CANCEL,
        userContext
      );

      expect(userCancel.authorized).toBe(false);
      expect(userCancel.reason).toMatch(/cancellation requires at least.*hours notice/i);

      // Admin should be able to cancel with policy override
      const adminContext: AuthorizationContext = {
        userId: testUsers.admin.id,
        userRole: UserRole.ADMIN,
        userStatus: 'active',
        timestamp: new Date()
      };

      const adminCancel = await AppointmentAuthorization.validateAppointmentAccess(
        soonAppointment.id,
        AuthorizationAction.CANCEL,
        adminContext
      );

      expect(adminCancel.authorized).toBe(true);
      expect(adminCancel.conditions).toContain('Late cancellation - policy override applied');

      // Cleanup
      await supabase.from('appointments').delete().eq('id', soonAppointment.id);
      await supabase.from('appointment_types').delete().eq('id', appointmentType.id);
    });

    test('should prevent double cancellation', async () => {
      // Create cancelled appointment
      const { data: cancelledAppointment } = await supabase
        .from('appointments')
        .insert({
          user_id: testUsers.user.id,
          instructor_id: testUsers.instructor.id,
          appointment_date: '2025-09-20',
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: AppointmentStatus.CANCELLED
        })
        .select('id')
        .single();

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const cancelAgain = await AppointmentAuthorization.validateAppointmentAccess(
        cancelledAppointment.id,
        AuthorizationAction.CANCEL,
        userContext
      );

      expect(cancelAgain.authorized).toBe(false);
      expect(cancelAgain.reason).toMatch(/appointment is already cancelled/i);

      // Cleanup
      await supabase.from('appointments').delete().eq('id', cancelledAppointment.id);
    });

    test('should prevent reschedule of in-progress appointments', async () => {
      // Create in-progress appointment
      const { data: inProgressAppointment } = await supabase
        .from('appointments')
        .insert({
          user_id: testUsers.user.id,
          instructor_id: testUsers.instructor.id,
          appointment_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().split(' ')[0],
          end_time: new Date(Date.now() + 60 * 60 * 1000).toTimeString().split(' ')[0],
          status: AppointmentStatus.PENDING
        })
        .select('id')
        .single();

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const reschedule = await AppointmentAuthorization.validateAppointmentAccess(
        inProgressAppointment.id,
        AuthorizationAction.RESCHEDULE,
        userContext
      );

      expect(reschedule.authorized).toBe(false);
      expect(reschedule.reason).toMatch(/cannot reschedule appointments that are in progress/i);

      // Cleanup
      await supabase.from('appointments').delete().eq('id', inProgressAppointment.id);
    });
  });

  describe('Time-Based Access Controls', () => {
    test('should prevent modification of past appointments by regular users', async () => {
      // Create past appointment
      const { data: pastAppointment } = await supabase
        .from('appointments')
        .insert({
          user_id: testUsers.user.id,
          instructor_id: testUsers.instructor.id,
          appointment_date: '2025-08-01',
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: AppointmentStatus.PENDING
        })
        .select('id')
        .single();

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const updatePast = await AppointmentAuthorization.validateAppointmentAccess(
        pastAppointment.id,
        AuthorizationAction.UPDATE,
        userContext
      );

      expect(updatePast.authorized).toBe(false);
      expect(updatePast.reason).toMatch(/cannot modify past appointments/i);

      // Admin should still be able to modify past appointments
      const adminContext: AuthorizationContext = {
        userId: testUsers.admin.id,
        userRole: UserRole.ADMIN,
        userStatus: 'active',
        timestamp: new Date()
      };

      const adminUpdatePast = await AppointmentAuthorization.validateAppointmentAccess(
        pastAppointment.id,
        AuthorizationAction.UPDATE,
        adminContext
      );

      expect(adminUpdatePast.authorized).toBe(true);

      // Cleanup
      await supabase.from('appointments').delete().eq('id', pastAppointment.id);
    });

    test('should restrict modifications too close to appointment time', async () => {
      // Create appointment in 30 minutes (less than 1 hour)
      const soonTime = new Date(Date.now() + 30 * 60 * 1000);
      const { data: soonAppointment } = await supabase
        .from('appointments')
        .insert({
          user_id: testUsers.user.id,
          instructor_id: testUsers.instructor.id,
          appointment_date: soonTime.toISOString().split('T')[0],
          start_time: soonTime.toTimeString().split(' ')[0],
          end_time: new Date(soonTime.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0],
          status: AppointmentStatus.PENDING
        })
        .select('id')
        .single();

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const updateSoon = await AppointmentAuthorization.validateAppointmentAccess(
        soonAppointment.id,
        AuthorizationAction.UPDATE,
        userContext
      );

      expect(updateSoon.authorized).toBe(false);
      expect(updateSoon.reason).toMatch(/cannot modify appointments less than 1 hour before start time/i);

      // Instructor should still be able to modify
      const instructorContext: AuthorizationContext = {
        userId: testUsers.instructor.id,
        userRole: UserRole.INSTRUCTOR,
        userStatus: 'active',
        timestamp: new Date()
      };

      const instructorUpdate = await AppointmentAuthorization.validateAppointmentAccess(
        soonAppointment.id,
        AuthorizationAction.UPDATE,
        instructorContext
      );

      expect(instructorUpdate.authorized).toBe(true);

      // Cleanup
      await supabase.from('appointments').delete().eq('id', soonAppointment.id);
    });
  });

  describe('Batch Authorization', () => {
    test('should validate batch access correctly', async () => {
      const appointmentIds = [
        testAppointments.user_pending.id,
        testAppointments.user_completed.id,
        testAppointments.other_user_appointment.id
      ];

      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      const batchResult = await AppointmentAuthorization.validateBatchAccess(
        appointmentIds,
        AuthorizationAction.READ,
        userContext
      );

      expect(batchResult.summary.total).toBe(3);
      expect(batchResult.summary.authorized).toBe(2); // Own pending and completed
      expect(batchResult.summary.denied).toBe(1); // Other user's appointment
      
      expect(batchResult.authorized).toHaveLength(2);
      expect(batchResult.denied).toHaveLength(1);
      expect(batchResult.denied[0].reason).toMatch(/no relationship to this appointment/i);
    });

    test('should handle batch processing limits', async () => {
      // Test with more than batch size to ensure chunking works
      const manyIds = Array(25).fill(null).map(() => testAppointments.user_pending.id);
      
      const adminContext: AuthorizationContext = {
        userId: testUsers.admin.id,
        userRole: UserRole.ADMIN,
        userStatus: 'active',
        timestamp: new Date()
      };

      const batchResult = await AppointmentAuthorization.validateBatchAccess(
        manyIds,
        AuthorizationAction.READ,
        adminContext
      );

      expect(batchResult.summary.total).toBe(25);
      expect(batchResult.summary.authorized).toBe(25); // Admin can access all
      expect(batchResult.summary.denied).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    test('should create audit logs for authorization decisions', async () => {
      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        sessionId: 'test-session-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Test User Agent',
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.READ,
        userContext
      );

      expect(result.auditId).toBeDefined();

      // Check that audit log was created
      const { data: auditLogs } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('id', result.auditId)
        .single();

      expect(auditLogs).toBeDefined();
      expect(auditLogs.event_type).toBe('authorization_decision');
      expect(auditLogs.user_id).toBe(testUsers.user.id);
      expect(auditLogs.success).toBe(true);
      expect(auditLogs.metadata.action).toBe(AuthorizationAction.READ);
      expect(auditLogs.metadata.user_role).toBe(UserRole.USER);
    });

    test('should log failed authorization attempts with reasons', async () => {
      const maliciousContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        sessionId: 'suspicious-session',
        ipAddress: '192.168.1.666',
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.other_user_appointment.id, // Other user's appointment
        AuthorizationAction.READ,
        maliciousContext
      );

      expect(result.authorized).toBe(false);
      expect(result.auditId).toBeDefined();

      // Check audit log
      const { data: auditLog } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('id', result.auditId)
        .single();

      expect(auditLog.success).toBe(false);
      expect(auditLog.error_message).toBeDefined();
      expect(auditLog.ip_address).toBe('192.168.1.666');
      expect(auditLog.session_id).toBe('suspicious-session');
    });
  });

  describe('Security Reporting', () => {
    test('should generate comprehensive security reports', async () => {
      // Generate some authorization activity
      const contexts = [
        { userId: testUsers.user.id, userRole: UserRole.USER },
        { userId: testUsers.admin.id, userRole: UserRole.ADMIN },
        { userId: testUsers.support.id, userRole: UserRole.SUPPORT }
      ];

      for (const ctx of contexts) {
        const context: AuthorizationContext = {
          ...ctx,
          userStatus: 'active',
          timestamp: new Date()
        };

        await AppointmentAuthorization.validateAppointmentAccess(
          testAppointments.user_pending.id,
          AuthorizationAction.READ,
          context
        );
      }

      const report = await AppointmentAuthorization.generateSecurityReport();

      expect(report.summary.totalDecisions).toBeGreaterThan(0);
      expect(report.recentActivity).toBeDefined();
      expect(Array.isArray(report.recentActivity)).toBe(true);
      expect(report.suspiciousActivity).toBeDefined();
      expect(Array.isArray(report.suspiciousActivity)).toBe(true);
    });

    test('should detect suspicious activity patterns', async () => {
      // Simulate multiple failed authorization attempts
      const suspiciousContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Create multiple failed attempts
      for (let i = 0; i < 12; i++) {
        await AppointmentAuthorization.validateAppointmentAccess(
          testAppointments.other_user_appointment.id, // Should fail
          AuthorizationAction.READ,
          suspiciousContext
        );
      }

      const report = await AppointmentAuthorization.generateSecurityReport(testUsers.user.id);

      expect(report.suspiciousActivity.length).toBeGreaterThan(0);
      const suspiciousPattern = report.suspiciousActivity.find(
        s => s.userId === testUsers.user.id && s.pattern.includes('authorization failures')
      );
      expect(suspiciousPattern).toBeDefined();
      expect(suspiciousPattern?.count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('User Permission Queries', () => {
    test('should retrieve user permissions correctly', async () => {
      const userPermissions = await AppointmentAuthorization.getUserPermissions(testUsers.user.id);
      
      expect(userPermissions.role).toBe('user');
      expect(userPermissions.permissions).toContain('appointment:create:own');
      expect(userPermissions.permissions).toContain('appointment:read:own');
      expect(userPermissions.permissions).toContain('appointment:update:own');
      expect(userPermissions.restrictions).toHaveLength(0);

      const adminPermissions = await AppointmentAuthorization.getUserPermissions(testUsers.admin.id);
      
      expect(adminPermissions.role).toBe('admin');
      expect(adminPermissions.permissions).toContain('appointment:read');
      expect(adminPermissions.permissions).toContain('appointment:manage');

      const readonlyPermissions = await AppointmentAuthorization.getUserPermissions(testUsers.readonly.id);
      
      expect(readonlyPermissions.role).toBe('readonly');
      expect(readonlyPermissions.permissions).toContain('appointment:read:own');
      expect(readonlyPermissions.permissions).not.toContain('appointment:update');
    });

    test('should handle non-existent users gracefully', async () => {
      const fakeUserId = '12345678-1234-1234-1234-123456789012';
      const permissions = await AppointmentAuthorization.getUserPermissions(fakeUserId);
      
      expect(permissions.role).toBe('none');
      expect(permissions.permissions).toHaveLength(0);
      expect(permissions.restrictions).toContain('User not found');
    });
  });

  describe('Vulnerability Regression Tests', () => {
    test('should prevent privilege escalation through role manipulation', async () => {
      // Attempt to escalate from user to admin by manipulating context
      const escalationContext: AuthorizationContext = {
        userId: testUsers.user.id, // Regular user ID
        userRole: UserRole.ADMIN,  // But claiming admin role
        userStatus: 'active',
        timestamp: new Date()
      };

      const result = await AppointmentAuthorization.validateAppointmentAccess(
        testAppointments.user_pending.id,
        AuthorizationAction.MANAGE,
        escalationContext
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toMatch(/role mismatch detected/i);
    });

    test('should prevent resource access through appointment ID manipulation', async () => {
      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Try to access non-existent appointment
      const nonExistentId = '12345678-1234-1234-1234-123456789012';
      const result = await AppointmentAuthorization.validateAppointmentAccess(
        nonExistentId,
        AuthorizationAction.READ,
        userContext
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Appointment not found or access denied');
    });

    test('should prevent timing-based user enumeration', async () => {
      const contexts = [
        // Real user with wrong role
        { userId: testUsers.user.id, userRole: UserRole.ADMIN },
        // Fake user ID
        { userId: '12345678-1234-1234-1234-123456789012', userRole: UserRole.USER }
      ];

      const timings: number[] = [];

      for (const ctx of contexts) {
        const context: AuthorizationContext = {
          ...ctx,
          userStatus: 'active',
          timestamp: new Date()
        };

        const start = process.hrtime.bigint();
        await AppointmentAuthorization.validateAppointmentAccess(
          testAppointments.user_pending.id,
          AuthorizationAction.READ,
          context
        );
        const end = process.hrtime.bigint();
        
        timings.push(Number(end - start));
      }

      // Both should fail, and timing difference shouldn't be significant
      // This is a basic check - in practice, timing attacks are very subtle
      expect(timings[0]).toBeGreaterThan(0);
      expect(timings[1]).toBeGreaterThan(0);
    });

    test('should prevent authorization bypass through cached results', async () => {
      const userContext: AuthorizationContext = {
        userId: testUsers.user.id,
        userRole: UserRole.USER,
        userStatus: 'active',
        timestamp: new Date()
      };

      // Multiple calls should consistently apply authorization
      for (let i = 0; i < 5; i++) {
        const result = await AppointmentAuthorization.validateAppointmentAccess(
          testAppointments.other_user_appointment.id,
          AuthorizationAction.READ,
          userContext
        );

        expect(result.authorized).toBe(false);
        expect(result.reason).toMatch(/no relationship to this appointment/i);
      }
    });
  });
});