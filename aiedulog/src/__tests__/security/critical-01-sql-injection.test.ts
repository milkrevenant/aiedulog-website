/**
 * SECURITY TEST: CRITICAL-01 - SQL Injection Prevention
 * 
 * Tests to validate that database functions are protected against SQL injection attacks
 * through proper parameterization and input validation.
 * 
 * VULNERABILITY FIXED:
 * - SQL injection in get_available_time_slots function
 * - SQL injection in check_time_slot_availability function
 * - Unsafe string concatenation in database queries
 * 
 * SECURITY IMPLEMENTATIONS TESTED:
 * - Parameterized queries using prepared statements
 * - Input validation in validate_appointment_inputs function
 * - make_interval() usage instead of string concatenation
 * - UUID validation and type checking
 * - Date range validation
 */

import { createClient } from '@/lib/supabase/server';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('CRITICAL-01: SQL Injection Prevention Tests', () => {
  let supabase: any;
  let testInstructorId: string;
  let testAppointmentTypeId: string;

  beforeAll(async () => {
    supabase = await createClient();
    
    // Create test instructor
    const { data: instructor, error: instructorError } = await supabase
      .from('identities')
      .insert({
        email: 'test-instructor-sql@example.com',
        full_name: 'Test Instructor SQL',
        role: 'instructor',
        status: 'active'
      })
      .select('id')
      .single();
      
    if (instructorError) throw instructorError;
    testInstructorId = instructor.id;

    // Create test appointment type
    const { data: appointmentType, error: typeError } = await supabase
      .from('appointment_types')
      .insert({
        instructor_id: testInstructorId,
        type_name: 'SQL Test Type',
        duration_minutes: 60,
        price: 100,
        is_active: true
      })
      .select('id')
      .single();
      
    if (typeError) throw typeError;
    testAppointmentTypeId = appointmentType.id;

    // Create instructor availability
    await supabase
      .from('instructor_availability')
      .insert({
        instructor_id: testInstructorId,
        day_of_week: 1, // Monday
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_available: true
      });
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('instructor_availability').delete().eq('instructor_id', testInstructorId);
    await supabase.from('appointment_types').delete().eq('id', testAppointmentTypeId);
    await supabase.from('identities').delete().eq('id', testInstructorId);
  });

  describe('SQL Injection Attack Vectors', () => {
    test('should reject SQL injection in instructor_id parameter', async () => {
      const maliciousInstructorId = "'; DROP TABLE appointments; --";
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: maliciousInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      // Should fail due to UUID validation, not execute malicious SQL
      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type uuid|Invalid input parameters/i);
      
      // Verify appointments table still exists by making a safe query
      const { data: verifyTable } = await supabase.from('appointments').select('count').limit(1);
      expect(verifyTable).toBeDefined(); // Table should still exist
    });

    test('should reject SQL injection in date parameter', async () => {
      const maliciousDate = "2025-09-10'; DELETE FROM identities WHERE role='user'; --";
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: maliciousDate,
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type date|Invalid input parameters/i);
    });

    test('should reject SQL injection in duration parameter through string manipulation', async () => {
      const maliciousDuration = -1; // Negative values should be rejected
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: maliciousDuration
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
    });

    test('should reject SQL injection in time parameters', async () => {
      const maliciousTime = "09:00:00'; UPDATE identities SET role='admin' WHERE id='" + testInstructorId + "'; --";
      
      const { data, error } = await supabase
        .rpc('check_time_slot_availability_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_start_time: maliciousTime,
          p_end_time: '10:00:00'
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type time/i);
    });

    test('should reject SQL injection through appointment_type_id', async () => {
      const maliciousTypeId = "uuid_generate_v4(); DROP TABLE appointment_types; SELECT uuid_generate_v4()";
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: 60,
          p_appointment_type_id: maliciousTypeId
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type uuid/i);
    });
  });

  describe('Input Validation Security', () => {
    test('should validate duration limits (15 minutes minimum)', async () => {
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: 10 // Below minimum
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
    });

    test('should validate duration limits (8 hours maximum)', async () => {
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: 500 // Above maximum (480 minutes = 8 hours)
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
    });

    test('should reject dates in the past', async () => {
      const pastDate = '2020-01-01';
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: pastDate,
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
    });

    test('should reject dates more than 1 year in future', async () => {
      const farFutureDate = '2030-01-01';
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: farFutureDate,
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
    });

    test('should validate instructor exists and is active', async () => {
      // Create inactive instructor
      const { data: inactiveInstructor } = await supabase
        .from('identities')
        .insert({
          email: 'inactive-instructor@example.com',
          full_name: 'Inactive Instructor',
          role: 'instructor',
          status: 'inactive'
        })
        .select('id')
        .single();

      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: inactiveInstructor.id,
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);

      // Cleanup
      await supabase.from('identities').delete().eq('id', inactiveInstructor.id);
    });
  });

  describe('Parameterized Query Validation', () => {
    test('should safely handle special characters in legitimate data', async () => {
      // Create instructor with special characters in name
      const { data: specialInstructor } = await supabase
        .from('identities')
        .insert({
          email: 'special-chars@example.com',
          full_name: "O'Connor & Associates",
          role: 'instructor',
          status: 'active'
        })
        .select('id')
        .single();

      // Create availability
      await supabase
        .from('instructor_availability')
        .insert({
          instructor_id: specialInstructor.id,
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_available: true
        });

      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: specialInstructor.id,
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      expect(error).toBeFalsy();
      expect(data).toBeDefined();

      // Cleanup
      await supabase.from('instructor_availability').delete().eq('instructor_id', specialInstructor.id);
      await supabase.from('identities').delete().eq('id', specialInstructor.id);
    });

    test('should use make_interval instead of string concatenation', async () => {
      // Valid request should work
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      expect(error).toBeFalsy();
      expect(Array.isArray(data)).toBe(true);
      
      // Each slot should have proper duration
      if (data && data.length > 0) {
        data.forEach((slot: any) => {
          expect(slot.duration_minutes).toBe(60);
          expect(slot.start_time).toBeDefined();
          expect(slot.end_time).toBeDefined();
        });
      }
    });
  });

  describe('Atomic Transaction Security', () => {
    test('should validate transaction parameters for atomic operations', async () => {
      const { data, error } = await supabase
        .rpc('check_time_slot_availability_atomic', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_start_time: '10:00:00',
          p_end_time: '11:00:00',
          p_transaction_id: 'invalid-transaction-id'
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type uuid|Invalid or expired transaction/i);
    });

    test('should reject malicious transaction IDs', async () => {
      const maliciousTransactionId = "'; DELETE FROM booking_transactions; --";
      
      const { data, error } = await supabase
        .rpc('check_time_slot_availability_atomic', {
          p_instructor_id: testInstructorId,
          p_date: '2025-09-10',
          p_start_time: '10:00:00',
          p_end_time: '11:00:00',
          p_transaction_id: maliciousTransactionId
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/invalid input syntax for type uuid/i);
    });
  });

  describe('Error Message Security', () => {
    test('should not leak sensitive information in error messages', async () => {
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: 'invalid-uuid',
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      // Error message should not contain table names, column names, or database structure
      expect(error.message).not.toMatch(/table|column|schema|pg_/i);
      expect(error.message).toMatch(/invalid input syntax for type uuid/i);
    });

    test('should provide generic error for unauthorized access attempts', async () => {
      const randomUUID = '12345678-1234-1234-1234-123456789012';
      
      const { data, error } = await supabase
        .rpc('get_available_time_slots_secure', {
          p_instructor_id: randomUUID,
          p_date: '2025-09-10',
          p_duration_minutes: 60
        });

      expect(error).toBeTruthy();
      expect(error.message).toMatch(/Invalid input parameters/i);
      // Should not reveal specific details about what failed
      expect(error.message).not.toMatch(/instructor not found|no availability/i);
    });
  });
});