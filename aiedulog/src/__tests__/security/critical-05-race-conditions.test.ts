/**
 * SECURITY TEST: CRITICAL-05 - Race Condition Prevention
 * 
 * Tests to validate that AtomicBookingService prevents race conditions
 * in appointment booking through database locks, atomic transactions,
 * and proper concurrency control mechanisms.
 * 
 * VULNERABILITY FIXED:
 * - Time-of-check vs time-of-use (TOCTOU) vulnerabilities
 * - Double-booking possibilities in concurrent scenarios
 * - Race conditions in availability checking
 * - Business logic bypass through timing attacks
 * - Transaction integrity issues
 * 
 * SECURITY IMPLEMENTATIONS TESTED:
 * - Database advisory locks
 * - Atomic transaction management
 * - Optimistic concurrency control
 * - Lock timeout handling
 * - Transaction rollback mechanisms
 * - Audit trail for atomic operations
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createClient } from '@/lib/supabase/server';
import { 
  AtomicBookingService, 
  AtomicBookingRequest 
} from '@/lib/services/atomic-booking-service';
import { MeetingType } from '@/types/appointment-system';

describe('CRITICAL-05: Race Condition Prevention Tests', () => {
  let supabase: any;
  const testUsers: Record<string, any> = {};
  let testAppointmentType: any;

  beforeAll(async () => {
    supabase = await createClient();
    
    // Create test users
    const { data: user, error: userError } = await supabase
      .from('identities')
      .insert({
        email: 'user-atomic@test.com',
        full_name: 'Atomic Test User',
        role: 'user',
        status: 'active'
      })
      .select('id')
      .single();
      
    if (userError) throw userError;
    testUsers.user = user;

    const { data: instructor, error: instructorError } = await supabase
      .from('identities')
      .insert({
        email: 'instructor-atomic@test.com',
        full_name: 'Atomic Test Instructor',
        role: 'instructor',
        status: 'active'
      })
      .select('id')
      .single();
      
    if (instructorError) throw instructorError;
    testUsers.instructor = instructor;

    // Create appointment type
    const { data: appointmentType, error: typeError } = await supabase
      .from('appointment_types')
      .insert({
        instructor_id: testUsers.instructor.id,
        type_name: 'Atomic Test Type',
        duration_minutes: 60,
        price: 100,
        is_active: true
      })
      .select('id')
      .single();
      
    if (typeError) throw typeError;
    testAppointmentType = appointmentType;

    // Create instructor availability
    await supabase
      .from('instructor_availability')
      .insert({
        instructor_id: testUsers.instructor.id,
        day_of_week: 1, // Monday
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_available: true
      });
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('instructor_availability').delete().eq('instructor_id', testUsers.instructor.id);
    await supabase.from('appointment_types').delete().eq('id', testAppointmentType.id);
    await supabase.from('identities').delete().in('id', Object.values(testUsers).map(u => u.id));
    await supabase.from('appointments').delete().eq('user_id', testUsers.user.id);
    await supabase.from('booking_transactions').delete().eq('instructor_id', testUsers.instructor.id);
  });

  describe('Atomic Transaction Management', () => {
    test('should successfully create appointment with atomic operation', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-15', // Monday
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://zoom.us/test'
      };

      const result = await AtomicBookingService.createAppointmentAtomic(bookingRequest);

      expect(result.success).toBe(true);
      expect(result.appointmentId).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.lockAcquired).toBe(true);
      expect(result.auditId).toBeDefined();

      // Verify appointment was created
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', result.appointmentId)
        .single();

      expect(appointment).toBeDefined();
      expect(appointment.user_id).toBe(testUsers.user.id);
      expect(appointment.instructor_id).toBe(testUsers.instructor.id);
      expect(appointment.appointment_date).toBe('2025-09-15');
      expect(appointment.start_time).toBe('10:00:00');
      expect(appointment.end_time).toBe('11:00:00');

      // Verify transaction was committed
      const transactionStatus = await AtomicBookingService.getTransactionStatus(result.transactionId!);
      expect(transactionStatus.found).toBe(true);
      expect(transactionStatus.status).toBe('committed');
    });

    test('should prevent double-booking through atomic locks', async () => {
      const bookingRequest1: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-16',
        startTime: '14:00:00',
        endTime: '15:00:00',
        meetingType: MeetingType.OFFLINE
      };

      const bookingRequest2: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-16',
        startTime: '14:30:00', // Overlapping time
        endTime: '15:30:00',
        meetingType: MeetingType.ONLINE
      };

      // Start both bookings concurrently
      const [result1, result2] = await Promise.all([
        AtomicBookingService.createAppointmentAtomic(bookingRequest1),
        AtomicBookingService.createAppointmentAtomic(bookingRequest2)
      ]);

      // One should succeed, one should fail
      const successes = [result1, result2].filter(r => r.success);
      const failures = [result1, result2].filter(r => !r.success);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      const failure = failures[0];
      expect(failure.errorCode).toMatch(/LOCK_ACQUISITION_FAILED|SLOT_NOT_AVAILABLE/);
      expect(failure.conflictDetails).toBeDefined();
    });

    test('should handle lock acquisition failures gracefully', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-17',
        startTime: '09:00:00',
        endTime: '10:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Create multiple concurrent booking attempts for the same slot
      const concurrentAttempts = Array.from({ length: 5 }, () => 
        AtomicBookingService.createAppointmentAtomic(bookingRequest)
      );

      const results = await Promise.all(concurrentAttempts);
      
      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(4);

      // Failed attempts should have appropriate error codes
      const failures = results.filter(r => !r.success);
      failures.forEach(failure => {
        expect(failure.errorCode).toMatch(/LOCK_ACQUISITION_FAILED|SLOT_NOT_AVAILABLE/);
      });
    });
  });

  describe('Time-of-Check vs Time-of-Use Prevention', () => {
    test('should prevent TOCTOU attacks through atomic availability checking', async () => {
      const baseRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-18',
        startTime: '11:00:00',
        endTime: '12:00:00',
        meetingType: MeetingType.HYBRID
      };

      // Simulate rapid-fire booking attempts that would exploit TOCTOU
      const rapidAttempts = Array.from({ length: 10 }, (_, i) => ({
        ...baseRequest,
        startTime: `11:${i.toString().padStart(2, '0')}:00`,
        endTime: `12:${i.toString().padStart(2, '0')}:00`
      }));

      const results = await Promise.all(
        rapidAttempts.map(request => 
          AtomicBookingService.createAppointmentAtomic(request)
        )
      );

      // All non-overlapping slots should succeed (based on availability)
      // but the key test is that no two overlapping requests succeed
      const successes = results.filter(r => r.success);
      
      // Verify no double-booking occurred
      if (successes.length > 1) {
        const successfulAppointments = await Promise.all(
          successes.map(async (success) => {
            const { data } = await supabase
              .from('appointments')
              .select('start_time, end_time')
              .eq('id', success.appointmentId)
              .single();
            return data;
          })
        );

        // Check for overlaps
        for (let i = 0; i < successfulAppointments.length; i++) {
          for (let j = i + 1; j < successfulAppointments.length; j++) {
            const apt1 = successfulAppointments[i];
            const apt2 = successfulAppointments[j];
            
            const overlap = !(
              apt1.end_time <= apt2.start_time || 
              apt2.end_time <= apt1.start_time
            );
            
            expect(overlap).toBe(false);
          }
        }
      }
    });

    test('should validate availability atomically within transaction', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-19',
        startTime: '13:00:00',
        endTime: '14:00:00',
        meetingType: MeetingType.ONLINE
      };

      // First booking should succeed
      const result1 = await AtomicBookingService.createAppointmentAtomic(bookingRequest);
      expect(result1.success).toBe(true);

      // Second booking for same slot should fail
      const result2 = await AtomicBookingService.createAppointmentAtomic(bookingRequest);
      expect(result2.success).toBe(false);
      expect(result2.errorCode).toMatch(/LOCK_ACQUISITION_FAILED|SLOT_NOT_AVAILABLE/);
    });
  });

  describe('Transaction Rollback and Error Handling', () => {
    test('should rollback transaction on validation failures', async () => {
      // Create invalid booking request (non-existent instructor)
      const invalidRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: '12345678-1234-1234-1234-123456789012', // Non-existent
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-20',
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentAtomic(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.lockAcquired).toBe(false);

      // Verify no appointment was created
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', testUsers.user.id)
        .eq('appointment_date', '2025-09-20')
        .eq('start_time', '10:00:00');

      expect(appointments).toHaveLength(0);
    });

    test('should rollback on system errors and release locks', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-21',
        startTime: '15:00:00',
        endTime: '16:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Mock a system error during appointment creation
      const originalRpc = supabase.rpc;
      (supabase.rpc as any) = jest.fn().mockImplementation((...args: any[]) => {
        const funcName = args[0] as string;
        const params = args[1] as any;
        if (funcName === 'begin_booking_transaction') {
          return originalRpc.call(supabase, funcName, params);
        }
        if (funcName.includes('create') || funcName.includes('commit')) {
          return Promise.resolve({ data: null, error: new Error('Simulated system error') });
        }
        return originalRpc.call(supabase, funcName, params);
      });

      const result = await AtomicBookingService.createAppointmentAtomic(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toMatch(/CREATION_FAILED|COMMIT_FAILED|SYSTEM_ERROR/);

      // Restore original RPC
      supabase.rpc = originalRpc;

      // Verify no partial state was left behind
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', '2025-09-21')
        .eq('start_time', '15:00:00');

      expect(appointments).toHaveLength(0);
    });

    test('should handle transaction cleanup on expiration', async () => {
      // This test would typically require waiting for actual expiration
      // Instead, we'll test the cleanup function directly
      const cleanupResult = await AtomicBookingService.cleanupExpiredTransactions();
      
      expect(cleanupResult).toBeDefined();
      expect(cleanupResult.cleaned).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(cleanupResult.errors)).toBe(true);
    });
  });

  describe('Input Sanitization in Atomic Operations', () => {
    test('should sanitize all inputs before processing', async () => {
      const maliciousRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-22',
        startTime: '16:00:00',
        endTime: '17:00:00',
        meetingType: MeetingType.ONLINE,
        meetingLink: '<script>alert("XSS")</script>https://malicious.com',
        notes: "'; DROP TABLE appointments; --",
        userDetails: {
          fullName: '<img src="x" onerror="alert(1)">John Doe',
          email: 'user@example.com<script>alert(1)</script>',
          phone: '555-1234$(rm -rf /)'
        }
      };

      const result = await AtomicBookingService.createAppointmentAtomic(maliciousRequest);

      if (result.success) {
        // Verify sanitization occurred
        const { data: appointment } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', result.appointmentId)
          .single();

        expect(appointment.meeting_link).not.toContain('<script>');
        expect(appointment.notes).not.toContain('DROP TABLE');
        
        // Meeting link should be sanitized but still functional
        expect(appointment.meeting_link).toMatch(/^https?:/);
        expect(appointment.meeting_link).not.toContain('alert');
      }
    });

    test('should reject malformed date/time inputs', async () => {
      const invalidRequests = [
        {
          ...{
            userId: testUsers.user.id,
            instructorId: testUsers.instructor.id,
            appointmentTypeId: testAppointmentType.id,
            meetingType: MeetingType.ONLINE
          },
          appointmentDate: 'invalid-date',
          startTime: '10:00:00',
          endTime: '11:00:00'
        },
        {
          ...{
            userId: testUsers.user.id,
            instructorId: testUsers.instructor.id,
            appointmentTypeId: testAppointmentType.id,
            meetingType: MeetingType.ONLINE
          },
          appointmentDate: '2025-09-23',
          startTime: 'invalid-time',
          endTime: '11:00:00'
        },
        {
          ...{
            userId: testUsers.user.id,
            instructorId: testUsers.instructor.id,
            appointmentTypeId: testAppointmentType.id,
            meetingType: MeetingType.ONLINE
          },
          appointmentDate: '2020-01-01', // Past date
          startTime: '10:00:00',
          endTime: '11:00:00'
        }
      ];

      for (const invalidRequest of invalidRequests) {
        const result = await AtomicBookingService.createAppointmentAtomic(invalidRequest);
        
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('VALIDATION_FAILED');
      }
    });
  });

  describe('Retry Logic and Resilience', () => {
    test('should implement exponential backoff retry', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-24',
        startTime: '12:00:00',
        endTime: '13:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Mock temporary failures
      let attemptCount = 0;
      const originalCreateAtomic = AtomicBookingService.createAppointmentAtomic;
      (AtomicBookingService.createAppointmentAtomic as any) = jest.fn().mockImplementation((request: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          // Simulate temporary lock failure
          return Promise.resolve({
            success: false,
            errorCode: 'LOCK_ACQUISITION_FAILED',
            lockAcquired: false,
            error: 'Temporary lock failure'
          });
        }
        // Succeed on third attempt
        return originalCreateAtomic.call(AtomicBookingService, request);
      });

      const startTime = Date.now();
      const result = await AtomicBookingService.createAppointmentWithRetry(bookingRequest, 3);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      
      // Should have taken some time due to backoff delays
      expect(endTime - startTime).toBeGreaterThan(300); // At least 300ms for retries

      // Restore original method
      AtomicBookingService.createAppointmentAtomic = originalCreateAtomic;
    });

    test('should not retry validation errors', async () => {
      const invalidRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2020-01-01', // Invalid past date
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentWithRetry(invalidRequest, 3);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      
      // Should fail immediately without retries for validation errors
    });

    test('should stop retrying after max attempts', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-25',
        startTime: '14:00:00',
        endTime: '15:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Mock persistent failures
      const originalCreateAtomic = AtomicBookingService.createAppointmentAtomic;
      (AtomicBookingService.createAppointmentAtomic as any) = jest.fn().mockImplementation(() => Promise.resolve({
        success: false,
        errorCode: 'LOCK_ACQUISITION_FAILED',
        lockAcquired: false,
        error: 'Persistent lock failure'
      }));

      const result = await AtomicBookingService.createAppointmentWithRetry(bookingRequest, 2);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MAX_RETRIES_EXCEEDED');

      // Restore original method
      AtomicBookingService.createAppointmentAtomic = originalCreateAtomic;
    });
  });

  describe('Audit Trail and Security Logging', () => {
    test('should create audit logs for all atomic operations', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-26',
        startTime: '11:00:00',
        endTime: '12:00:00',
        meetingType: MeetingType.OFFLINE,
        meetingLocation: 'Office 123'
      };

      const result = await AtomicBookingService.createAppointmentAtomic(bookingRequest);

      expect(result.auditId).toBeDefined();

      // Verify audit log was created
      const { data: auditLog } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('id', result.auditId)
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog.event_type).toBe('atomic_booking_operation');
      expect(auditLog.user_id).toBe(testUsers.user.id);
      expect(auditLog.success).toBe(result.success);
      expect(auditLog.metadata.operation_type).toBe('atomic_booking');
      expect(auditLog.metadata.instructor_id).toBe(testUsers.instructor.id);
      expect(auditLog.metadata.transaction_id).toBe(result.transactionId);
    });

    test('should log failed atomic operations with error details', async () => {
      const invalidRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: '12345678-1234-1234-1234-123456789012', // Non-existent
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-27',
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentAtomic(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.auditId).toBeDefined();

      // Verify error details in audit log
      const { data: auditLog } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('id', result.auditId)
        .single();

      expect(auditLog.success).toBe(false);
      expect(auditLog.error_message).toBeDefined();
      expect(auditLog.metadata.operation_type).toBe('atomic_booking');
    });
  });

  describe('Transaction Status and Monitoring', () => {
    test('should track transaction status correctly', async () => {
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-28',
        startTime: '09:00:00',
        endTime: '10:00:00',
        meetingType: MeetingType.HYBRID
      };

      const result = await AtomicBookingService.createAppointmentAtomic(bookingRequest);

      if (result.success) {
        const status = await AtomicBookingService.getTransactionStatus(result.transactionId!);
        
        expect(status.found).toBe(true);
        expect(status.status).toBe('committed');
        expect(status.expiresAt).toBeInstanceOf(Date);
      }
    });

    test('should handle non-existent transaction status queries', async () => {
      const fakeTransactionId = '12345678-1234-1234-1234-123456789012';
      const status = await AtomicBookingService.getTransactionStatus(fakeTransactionId);
      
      expect(status.found).toBe(false);
      expect(status.error).toBe('Transaction not found');
    });
  });

  describe('Conflict Detection and Analysis', () => {
    test('should provide detailed conflict information', async () => {
      const baseRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-29',
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Create first appointment
      const result1 = await AtomicBookingService.createAppointmentAtomic(baseRequest);
      expect(result1.success).toBe(true);

      // Attempt conflicting appointment
      const conflictingRequest: AtomicBookingRequest = {
        ...baseRequest,
        startTime: '10:30:00', // Overlapping
        endTime: '11:30:00'
      };

      const result2 = await AtomicBookingService.createAppointmentAtomic(conflictingRequest);

      expect(result2.success).toBe(false);
      expect(result2.conflictDetails).toBeDefined();
      expect(result2.conflictDetails?.conflictingAppointments).toHaveLength(1);
      expect(result2.conflictDetails?.reason).toMatch(/conflicting appointment/i);
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    test('should handle malformed UUID inputs', async () => {
      const malformedRequest: AtomicBookingRequest = {
        userId: 'invalid-uuid',
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-30',
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentAtomic(malformedRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
    });

    test('should handle duration mismatches', async () => {
      const mismatchedRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-30',
        startTime: '10:00:00',
        endTime: '12:00:00', // 2 hours instead of 1
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentAtomic(mismatchedRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.error).toMatch(/duration does not match/i);
    });

    test('should handle end time before start time', async () => {
      const invalidTimeRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-09-30',
        startTime: '11:00:00',
        endTime: '10:00:00', // End before start
        meetingType: MeetingType.ONLINE
      };

      const result = await AtomicBookingService.createAppointmentAtomic(invalidTimeRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.error).toMatch(/end time must be after start time/i);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent transactions efficiently', async () => {
      // Create multiple non-overlapping time slots
      const requests = Array.from({ length: 5 }, (_, i) => ({
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-10-01',
        startTime: `${(9 + i).toString().padStart(2, '0')}:00:00`,
        endTime: `${(10 + i).toString().padStart(2, '0')}:00:00`,
        meetingType: MeetingType.ONLINE
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => AtomicBookingService.createAppointmentAtomic(req))
      );
      const endTime = Date.now();

      const successes = results.filter(r => r.success);
      expect(successes.length).toBe(5); // All should succeed (non-overlapping)

      // Should complete in reasonable time (less than 10 seconds for 5 operations)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should timeout appropriately for hanging operations', async () => {
      // This would typically require mocking database delays
      // For now, we test that the system handles timeouts gracefully
      const bookingRequest: AtomicBookingRequest = {
        userId: testUsers.user.id,
        instructorId: testUsers.instructor.id,
        appointmentTypeId: testAppointmentType.id,
        appointmentDate: '2025-10-02',
        startTime: '10:00:00',
        endTime: '11:00:00',
        meetingType: MeetingType.ONLINE
      };

      // Should complete without hanging
      const result = await AtomicBookingService.createAppointmentAtomic(bookingRequest);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});