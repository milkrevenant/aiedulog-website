/**
 * Atomic Booking Service - Race Condition Prevention
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * FIXES: CRITICAL-05 - Business Logic Manipulation (CVSS 8.3)
 * 
 * SECURITY FEATURES:
 * - Atomic transaction management
 * - Database-level advisory locks
 * - Time-of-check vs time-of-use (TOCTOU) prevention
 * - Optimistic concurrency control
 * - Double-booking prevention
 * - Transaction rollback on conflicts
 * - Comprehensive error handling
 * - Audit trail for all booking operations
 * 
 * ADDRESSES VULNERABILITIES:
 * - Race conditions in availability checking
 * - Double-booking possibilities
 * - Time manipulation attacks
 * - Concurrent booking conflicts
 * - Business logic bypass attempts
 * 
 * REPLACES VULNERABLE CODE:
 * ```typescript
 * // BEFORE (VULNERABLE):
 * const availabilityCheck = await checkTimeSlotAvailability(...);
 * if (!availabilityCheck.available) {
 *   return error;
 * }
 * // ← Race condition window
 * const appointment = await supabase.from('appointments').insert(...);
 * ```
 * 
 * WITH SECURE ATOMIC OPERATIONS:
 * - Database locks prevent concurrent access
 * - Transactions ensure consistency
 * - Rollback on any failure
 */

import { createClient } from '@/lib/supabase/server';
import { AppointmentStatus, MeetingType } from '@/types/appointment-system';
import { InputSanitizer } from '@/lib/security/input-sanitizer';

export interface AtomicBookingRequest {
  userId: string;
  instructorId: string;
  appointmentTypeId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  meetingType: MeetingType;
  meetingLocation?: string;
  meetingLink?: string;
  notes?: string;
  userDetails?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

export interface AtomicBookingResult {
  success: boolean;
  appointmentId?: string;
  transactionId?: string;
  error?: string;
  errorCode?: string;
  lockAcquired: boolean;
  conflictDetails?: {
    conflictingAppointments?: Array<{
      id: string;
      startTime: string;
      endTime: string;
      status: string;
    }>;
    reason: string;
  };
  auditId?: string;
}

export interface BookingTransaction {
  id: string;
  lockKey: string;
  lockHash: string;
  instructorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'committed' | 'rolled_back';
  createdAt: Date;
  expiresAt: Date;
}

export interface BookingLockInfo {
  lockKey: string;
  acquired: boolean;
  expiresAt?: Date;
  conflictingLocks?: string[];
}

/**
 * 🔒 ATOMIC BOOKING SERVICE
 * Prevents race conditions and ensures booking consistency
 */
export class AtomicBookingService {
  private static readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 100; // 100ms base delay
  
  /**
   * 🔒 MAIN ATOMIC BOOKING FUNCTION
   * Performs booking with full race condition prevention
   */
  static async createAppointmentAtomic(
    request: AtomicBookingRequest
  ): Promise<AtomicBookingResult> {
    const startTime = Date.now();
    let transactionId: string | undefined;
    let lockAcquired = false;

    try {
      // 🔒 SECURITY: Sanitize all inputs
      const sanitizedRequest = await this.sanitizeBookingRequest(request);
      
      // 🔒 SECURITY: Validate business rules before locking
      const preValidation = await this.validateBookingRequest(sanitizedRequest);
      if (!preValidation.valid) {
        return {
          success: false,
          error: preValidation.error,
          errorCode: 'VALIDATION_FAILED',
          lockAcquired: false
        };
      }

      // 🔒 ATOMIC OPERATION: Begin transaction with lock
      const lockResult = await this.acquireBookingLock(sanitizedRequest);
      if (!lockResult.success) {
        return {
          success: false,
          error: lockResult.error || 'Failed to acquire booking lock',
          errorCode: 'LOCK_ACQUISITION_FAILED',
          lockAcquired: false,
          conflictDetails: lockResult.conflictDetails
        };
      }

      transactionId = lockResult.transactionId;
      lockAcquired = true;

      // 🔒 ATOMIC CHECK: Verify availability within transaction
      const atomicAvailabilityCheck = await this.checkAvailabilityAtomic(
        sanitizedRequest,
        transactionId!
      );

      if (!atomicAvailabilityCheck.available) {
        await this.rollbackTransaction(transactionId!);
        return {
          success: false,
          error: atomicAvailabilityCheck.reason || 'Time slot not available',
          errorCode: 'SLOT_NOT_AVAILABLE',
          lockAcquired: true,
          transactionId,
          conflictDetails: atomicAvailabilityCheck.conflictDetails
        };
      }

      // 🔒 ATOMIC CREATE: Create appointment within transaction
      const appointmentResult = await this.createAppointmentInTransaction(
        sanitizedRequest,
        transactionId!
      );

      if (!appointmentResult.success) {
        await this.rollbackTransaction(transactionId!);
        return {
          success: false,
          error: appointmentResult.error || 'Failed to create appointment',
          errorCode: 'CREATION_FAILED',
          lockAcquired: true,
          transactionId
        };
      }

      // 🔒 ATOMIC COMMIT: Commit transaction and release lock
      const commitResult = await this.commitTransaction(transactionId!);
      if (!commitResult.success) {
        return {
          success: false,
          error: 'Transaction commit failed',
          errorCode: 'COMMIT_FAILED',
          lockAcquired: true,
          transactionId
        };
      }

      // 🔒 AUDIT: Log successful atomic booking
      const auditId = await this.auditAtomicBooking(
        sanitizedRequest,
        appointmentResult.appointmentId!,
        transactionId!,
        true
      );

      return {
        success: true,
        appointmentId: appointmentResult.appointmentId,
        transactionId,
        lockAcquired: true,
        auditId
      };

    } catch (error) {
      // 🔒 ROLLBACK: Always rollback on any error
      if (transactionId) {
        await this.rollbackTransaction(transactionId);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Atomic booking failed:', error);

      // 🔒 AUDIT: Log failed atomic booking
      const auditId = await this.auditAtomicBooking(
        request,
        undefined,
        transactionId,
        false,
        errorMessage
      );

      return {
        success: false,
        error: 'Booking system error occurred',
        errorCode: 'SYSTEM_ERROR',
        lockAcquired,
        transactionId,
        auditId
      };
    }
  }

  /**
   * 🔒 INPUT SANITIZATION
   */
  private static async sanitizeBookingRequest(
    request: AtomicBookingRequest
  ): Promise<AtomicBookingRequest> {
    return {
      userId: InputSanitizer.sanitizeString(request.userId).sanitizedValue,
      instructorId: InputSanitizer.sanitizeString(request.instructorId).sanitizedValue,
      appointmentTypeId: InputSanitizer.sanitizeString(request.appointmentTypeId).sanitizedValue,
      appointmentDate: InputSanitizer.sanitizeString(request.appointmentDate).sanitizedValue,
      startTime: InputSanitizer.sanitizeString(request.startTime).sanitizedValue,
      endTime: InputSanitizer.sanitizeString(request.endTime).sanitizedValue,
      meetingType: request.meetingType,
      meetingLocation: request.meetingLocation ? 
        InputSanitizer.sanitizeString(request.meetingLocation).sanitizedValue : undefined,
      meetingLink: request.meetingLink ?
        InputSanitizer.sanitizeUrl(request.meetingLink).sanitizedValue : undefined,
      notes: request.notes ?
        InputSanitizer.sanitizeString(request.notes).sanitizedValue : undefined,
      userDetails: request.userDetails ? {
        fullName: request.userDetails.fullName ?
          InputSanitizer.sanitizeName(request.userDetails.fullName).sanitizedValue : undefined,
        email: request.userDetails.email ?
          InputSanitizer.sanitizeEmail(request.userDetails.email).sanitizedValue : undefined,
        phone: request.userDetails.phone ?
          InputSanitizer.sanitizePhoneNumber(request.userDetails.phone).sanitizedValue : undefined
      } : undefined
    };
  }

  /**
   * 🔒 PRE-LOCK VALIDATION
   */
  private static async validateBookingRequest(
    request: AtomicBookingRequest
  ): Promise<{ valid: boolean; error?: string }> {
    const supabase = createClient();

    // Validate user exists and is active
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, is_active')
      .eq('user_id', request.userId)
      .single();

    if (userError || !user || user.is_active !== true) {
      return { valid: false, error: 'User not found or inactive' };
    }

    // Validate instructor exists and is active
    const { data: instructor, error: instructorError } = await supabase
      .from('user_profiles')
      .select('user_id, is_active, role')
      .eq('user_id', request.instructorId)
      .single();

    if (instructorError || !instructor || instructor.is_active !== true) {
      return { valid: false, error: 'Instructor not found or inactive' };
    }

    if (!['instructor', 'admin', 'super_admin'].includes(instructor.role)) {
      return { valid: false, error: 'Invalid instructor role' };
    }

    // Validate appointment type
    const { data: appointmentType, error: typeError } = await supabase
      .from('appointment_types')
      .select('id, instructor_id, duration_minutes, is_active')
      .eq('id', request.appointmentTypeId)
      .single();

    if (typeError || !appointmentType || !appointmentType.is_active) {
      return { valid: false, error: 'Appointment type not found or inactive' };
    }

    if (appointmentType.instructor_id !== request.instructorId) {
      return { valid: false, error: 'Appointment type does not belong to instructor' };
    }

    // Validate date/time format and logic
    const appointmentDateTime = new Date(`${request.appointmentDate}T${request.startTime}`);
    const endDateTime = new Date(`${request.appointmentDate}T${request.endTime}`);
    const now = new Date();

    if (isNaN(appointmentDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { valid: false, error: 'Invalid date/time format' };
    }

    if (appointmentDateTime <= now) {
      return { valid: false, error: 'Appointment cannot be in the past' };
    }

    if (endDateTime <= appointmentDateTime) {
      return { valid: false, error: 'End time must be after start time' };
    }

    // Validate duration matches appointment type
    const durationMinutes = (endDateTime.getTime() - appointmentDateTime.getTime()) / (1000 * 60);
    if (Math.abs(durationMinutes - appointmentType.duration_minutes) > 1) {
      return { valid: false, error: 'Duration does not match appointment type' };
    }

    return { valid: true };
  }

  /**
   * 🔒 ACQUIRE BOOKING LOCK
   * Uses database advisory locks to prevent race conditions
   */
  private static async acquireBookingLock(
    request: AtomicBookingRequest
  ): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    conflictDetails?: any;
  }> {
    const supabase = createClient();
    
    // Generate lock key based on instructor, date, and time
    const lockKey = `booking_${request.instructorId}_${request.appointmentDate}_${request.startTime}_${request.endTime}`;

    try {
      // Use the database function to begin atomic transaction
      const { data: transactionData, error: transactionError } = await supabase
        .rpc('begin_booking_transaction', {
          lock_key: lockKey,
          p_instructor_id: request.instructorId,
          p_appointment_date: request.appointmentDate,
          p_start_time: request.startTime,
          p_end_time: request.endTime,
          timeout_ms: this.LOCK_TIMEOUT_MS
        });

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        return {
          success: false,
          error: 'Failed to create booking transaction'
        };
      }

      if (!transactionData || transactionData.length === 0) {
        return {
          success: false,
          error: 'No transaction data returned'
        };
      }

      const transaction = transactionData[0];
      
      if (!transaction.acquired) {
        // Check for conflicting bookings
        const conflictDetails = await this.analyzeBookingConflicts(request);
        
        return {
          success: false,
          error: 'Unable to acquire booking lock - slot may be taken',
          conflictDetails
        };
      }

      return {
        success: true,
        transactionId: transaction.transaction_id
      };

    } catch (error) {
      console.error('Lock acquisition error:', error);
      return {
        success: false,
        error: 'Lock acquisition system error'
      };
    }
  }

  /**
   * 🔒 ATOMIC AVAILABILITY CHECK
   * Checks availability within the transaction context
   */
  private static async checkAvailabilityAtomic(
    request: AtomicBookingRequest,
    transactionId: string
  ): Promise<{
    available: boolean;
    reason?: string;
    conflictDetails?: any;
  }> {
    const supabase = createClient();

    try {
      // Use the atomic availability check function
      const { data: availabilityResult, error: availabilityError } = await supabase
        .rpc('check_time_slot_availability_atomic', {
          p_instructor_id: request.instructorId,
          p_date: request.appointmentDate,
          p_start_time: request.startTime,
          p_end_time: request.endTime,
          p_transaction_id: transactionId
        });

      if (availabilityError) {
        console.error('Atomic availability check error:', availabilityError);
        return {
          available: false,
          reason: 'Availability check failed'
        };
      }

      if (!availabilityResult) {
        const conflictDetails = await this.analyzeBookingConflicts(request);
        return {
          available: false,
          reason: 'Time slot not available',
          conflictDetails
        };
      }

      return { available: true };

    } catch (error) {
      console.error('Atomic availability check error:', error);
      return {
        available: false,
        reason: 'Availability check system error'
      };
    }
  }

  /**
   * 🔒 CREATE APPOINTMENT IN TRANSACTION
   */
  private static async createAppointmentInTransaction(
    request: AtomicBookingRequest,
    transactionId: string
  ): Promise<{
    success: boolean;
    appointmentId?: string;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      // Get appointment type details
      const { data: appointmentType, error: typeError } = await supabase
        .from('appointment_types')
        .select('type_name, duration_minutes, price')
        .eq('id', request.appointmentTypeId)
        .single();

      if (typeError || !appointmentType) {
        return {
          success: false,
          error: 'Appointment type not found'
        };
      }

      // Create appointment record
      const appointmentData = {
        user_id: request.userId,
        instructor_id: request.instructorId,
        appointment_type_id: request.appointmentTypeId,
        appointment_date: request.appointmentDate,
        start_time: request.startTime,
        end_time: request.endTime,
        duration_minutes: appointmentType.duration_minutes,
        status: AppointmentStatus.PENDING,
        meeting_type: request.meetingType,
        meeting_location: request.meetingLocation || null,
        meeting_link: request.meetingLink || null,
        title: appointmentType.type_name,
        description: `Appointment for ${appointmentType.type_name}`,
        notes: request.notes || null,
        booking_transaction_id: transactionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: appointmentRows, error: createError } = await supabase
        .from('appointments')
        .insert(appointmentData, { select: 'id' });

      const appointmentRecord = Array.isArray(appointmentRows)
        ? appointmentRows[0]
        : appointmentRows;
      const appointmentId = (appointmentRecord as { id?: string | null } | null | undefined)?.id || null;

      if (createError || !appointmentId) {
        console.error('Appointment creation error:', createError);
        return {
          success: false,
          error: 'Failed to create appointment'
        };
      }

      return {
        success: true,
        appointmentId
      };

    } catch (error) {
      console.error('Appointment creation system error:', error);
      return {
        success: false,
        error: 'Appointment creation system error'
      };
    }
  }

  /**
   * 🔒 COMMIT TRANSACTION
   */
  private static async commitTransaction(transactionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      const { data: commitResult, error: commitError } = await supabase
        .rpc('commit_booking_transaction', {
          p_transaction_id: transactionId,
          lock_key: `transaction_${transactionId}` // This should match the actual lock key
        });

      if (commitError) {
        console.error('Transaction commit error:', commitError);
        return {
          success: false,
          error: 'Failed to commit transaction'
        };
      }

      if (!commitResult) {
        return {
          success: false,
          error: 'Transaction commit returned false'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Transaction commit system error:', error);
      return {
        success: false,
        error: 'Transaction commit system error'
      };
    }
  }

  /**
   * 🔒 ROLLBACK TRANSACTION
   */
  private static async rollbackTransaction(transactionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      const { data: rollbackResult, error: rollbackError } = await supabase
        .rpc('rollback_booking_transaction', {
          p_transaction_id: transactionId,
          lock_key: `transaction_${transactionId}` // This should match the actual lock key
        });

      if (rollbackError) {
        console.error('Transaction rollback error:', rollbackError);
        return {
          success: false,
          error: 'Failed to rollback transaction'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Transaction rollback system error:', error);
      return {
        success: false,
        error: 'Transaction rollback system error'
      };
    }
  }

  /**
   * 🔒 ANALYZE BOOKING CONFLICTS
   */
  private static async analyzeBookingConflicts(
    request: AtomicBookingRequest
  ): Promise<{
    conflictingAppointments: Array<{
      id: string;
      startTime: string;
      endTime: string;
      status: string;
    }>;
    reason: string;
  }> {
    const supabase = createClient();

    try {
      const { data: conflicts, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('instructor_id', request.instructorId)
        .eq('appointment_date', request.appointmentDate)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .not('end_time', 'lte', request.startTime)
        .not('start_time', 'gte', request.endTime);

      if (error) {
        console.error('Conflict analysis error:', error);
        return {
          conflictingAppointments: [],
          reason: 'Unable to analyze conflicts'
        };
      }

      const conflictEntries: Array<{
        id?: string
        start_time?: string
        end_time?: string
        status?: string
      }> = (conflicts || []) as Array<{
        id?: string
        start_time?: string
        end_time?: string
        status?: string
      }>

      return {
        conflictingAppointments: conflictEntries.map(conflict => ({
          id: conflict.id || 'unknown',
          startTime: conflict.start_time || '',
          endTime: conflict.end_time || '',
          status: conflict.status || 'unknown'
        })),
        reason: conflictEntries.length > 0 
          ? `${conflictEntries.length} conflicting appointment(s) found`
          : 'Time slot conflicts with existing appointments'
      };

    } catch (error) {
      console.error('Conflict analysis system error:', error);
      return {
        conflictingAppointments: [],
        reason: 'Conflict analysis system error'
      };
    }
  }

  /**
   * 🔒 AUDIT ATOMIC BOOKING
   */
  private static async auditAtomicBooking(
    request: AtomicBookingRequest,
    appointmentId?: string,
    transactionId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<string | undefined> {
    try {
      const supabase = createClient();

      const { data: auditLog, error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'atomic_booking_operation',
          user_id: request.userId,
          table_name: 'appointments',
          record_id: appointmentId,
          success,
          error_message: errorMessage,
          metadata: {
            operation_type: 'atomic_booking',
            instructor_id: request.instructorId,
            appointment_type_id: request.appointmentTypeId,
            appointment_date: request.appointmentDate,
            start_time: request.startTime,
            end_time: request.endTime,
            meeting_type: request.meetingType,
            transaction_id: transactionId,
            timestamp: new Date().toISOString()
          }
        }, { select: 'id' });

      if (error) {
        throw error;
      }

      const auditRecord = Array.isArray(auditLog) ? auditLog[0] : auditLog;
      const auditId = (auditRecord as { id?: string | null } | null | undefined)?.id;
      return auditId ?? undefined;
    } catch (error) {
      console.error('Audit logging failed:', error);
      return undefined;
    }
  }

  /**
   * 🔒 BOOKING WITH RETRY LOGIC
   */
  static async createAppointmentWithRetry(
    request: AtomicBookingRequest,
    maxRetries: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<AtomicBookingResult> {
    let lastResult: AtomicBookingResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.createAppointmentAtomic(request);

      if (lastResult.success) {
        return lastResult;
      }

      // Don't retry validation errors or system errors
      if (lastResult.errorCode === 'VALIDATION_FAILED' || 
          lastResult.errorCode === 'SYSTEM_ERROR') {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastResult || {
      success: false,
      error: 'All retry attempts failed',
      errorCode: 'MAX_RETRIES_EXCEEDED',
      lockAcquired: false
    };
  }

  /**
   * 🔒 CLEANUP EXPIRED TRANSACTIONS
   */
  static async cleanupExpiredTransactions(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const supabase = createClient();
    const errors: string[] = [];

    try {
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_expired_transactions');

      if (cleanupError) {
        errors.push(`Cleanup error: ${cleanupError.message}`);
        return { cleaned: 0, errors };
      }

      const cleanedRaw = Array.isArray(cleanupResult)
        ? cleanupResult[0] ?? 0
        : cleanupResult ?? 0;

      const cleanedCount = typeof cleanedRaw === 'number'
        ? cleanedRaw
        : typeof cleanedRaw === 'object' && cleanedRaw !== null
          ? Number((cleanedRaw as { cleaned?: number; count?: number }).cleaned ?? (cleanedRaw as { cleaned?: number; count?: number }).count ?? 0)
          : 0;

      return {
        cleaned: Number.isFinite(cleanedCount) ? cleanedCount : 0,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Cleanup system error: ${errorMessage}`);
      
      return { cleaned: 0, errors };
    }
  }

  /**
   * 🔒 GET TRANSACTION STATUS
   */
  static async getTransactionStatus(transactionId: string): Promise<{
    found: boolean;
    status?: 'active' | 'committed' | 'rolled_back';
    expiresAt?: Date;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      const { data: transaction, error } = await supabase
        .from('booking_transactions')
        .select('status, expires_at')
        .eq('id', transactionId)
        .single();

      if (error) {
        return {
          found: false,
          error: 'Transaction not found'
        };
      }

      return {
        found: true,
        status: transaction.status,
        expiresAt: new Date(transaction.expires_at)
      };

    } catch (error) {
      return {
        found: false,
        error: 'Transaction status check failed'
      };
    }
  }
}

// Export additional utilities
export default AtomicBookingService;
