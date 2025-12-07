/**
 * 🔒 SECURE APPOINTMENTS API ENDPOINT
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * SECURITY FIXES IMPLEMENTED:
 * ✅ CRITICAL-01: SQL injection prevention (database functions secured)
 * ✅ CRITICAL-02: Secure token generation (SecureTokenGenerator)
 * ✅ CRITICAL-03: Input sanitization (InputSanitizer + Zod validation)
 * ✅ CRITICAL-04: Authorization system (AppointmentAuthorization)
 * ✅ CRITICAL-05: Race condition prevention (AtomicBookingService)
 * 
 * COMPREHENSIVE SECURITY LAYERS:
 * - Input validation and sanitization
 * - Role-based authorization  
 * - Business rule enforcement
 * - Atomic operations with locks
 * - Comprehensive audit logging
 * - Error handling without information disclosure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withUserSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { InputSanitizer } from '@/lib/security/input-sanitizer';
import { 
  AppointmentAuthorization, 
  AuthorizationAction, 
  AuthorizationContext 
} from '@/lib/security/appointment-authorization';
import { AtomicBookingService } from '@/lib/services/atomic-booking-service';
import { 
  CreateAppointmentSchema,
  AppointmentFilterSchema,
  validate
} from '@/lib/validation/appointment-schemas';
import {
  AppointmentWithDetails,
  CreateAppointmentRequest,
  AppointmentFilters,
  ApiResponse,
  PaginatedResponse,
  AppointmentStatus,
  MeetingType,
  NotificationType
} from '@/types/appointment-system';

/**
 * 🔒 SECURE GET HANDLER - Get user's appointments with comprehensive security
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    
    // 🔒 SECURITY: Sanitize and validate all query parameters
    const rawFilters = Object.fromEntries(searchParams.entries());
    const sanitizedFilters = InputSanitizer.sanitizeObject(rawFilters).sanitized;
    
    // 🔒 VALIDATION: Validate filters with Zod schema
    const filterValidation = validate.appointmentFilter(sanitizedFilters);
    if (!filterValidation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid filter parameters',
          details: filterValidation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        } as ApiResponse,
        { status: 400 }
      );
    }

    const filters = filterValidation.data;
    
    // 🔒 AUTHORIZATION: Create authorization context
    const authContext: AuthorizationContext = {
      userId: context.userId!,
      userRole: context.userRole || 'user',
      userStatus: 'active', // Should be validated by security wrapper
      timestamp: new Date(),
      sessionId: (context as any).sessionId || 'unknown',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    };

    const rds = createRDSClient();

    // 🔒 SECURITY: Build query with proper access controls
    let query = rds
      .from('appointments')
      .select(`
        *,
        instructor:user_profiles!appointments_instructor_id_fkey(
          id:user_id,
          full_name,
          email,
          profile_image_url:avatar_url,
          bio
        ),
        user:user_profiles!appointments_user_id_fkey(
          id:user_id,
          full_name,
          email
        ),
        appointment_type:appointment_types(
          id,
          type_name,
          description,
          duration_minutes,
          price,
          currency
        )
      `);

    // 🔒 ACCESS CONTROL: Filter by user access rights
    const userRole = context.userRole as any;
    if (userRole === 'user') {
      // Regular users can only see their own appointments
      query = query.eq('user_id', context.userId!);
    } else if (userRole === 'instructor') {
      // Instructors can see appointments they're teaching or their own bookings
      query = query.or(`user_id.eq.${context.userId!},instructor_id.eq.${context.userId!}`);
    } else if (['admin', 'super_admin', 'support'].includes(userRole || '')) {
      // Admin roles can see all appointments (will be further filtered by authorization)
      // No additional filtering needed
    } else {
      // Unknown role - deny access
      return NextResponse.json(
        { error: 'Insufficient permissions' } as ApiResponse,
        { status: 403 }
      );
    }

    // 🔒 APPLY FILTERS: Apply validated filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.instructor_id) {
      query = query.eq('instructor_id', filters.instructor_id);
    }
    
    if (filters.user_id && ['admin', 'super_admin', 'support'].includes(userRole || '')) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters.date_from) {
      query = query.gte('appointment_date', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('appointment_date', filters.date_to);
    }
    
    if (filters.meeting_type) {
      query = query.in('meeting_type', filters.meeting_type);
    }

    if (filters.appointment_type_id) {
      query = query.eq('appointment_type_id', filters.appointment_type_id);
    }

    // 🔒 SEARCH: Add search functionality with sanitization
    if (filters.search) {
      const searchTerm = InputSanitizer.sanitizeString(filters.search).sanitizedValue;
      query = query.or(`title.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    const sortColumn = filters.sort_by === 'date' ? 'appointment_date' : filters.sort_by;
    query = query.order(sortColumn!, { ascending: filters.sort_order === 'asc' });
    
    // Apply pagination
    query = query.range(filters.offset!, filters.offset! + filters.limit! - 1);

    // Execute query
    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' } as ApiResponse,
        { status: 500 }
      );
    }

    // 🔒 POST-QUERY AUTHORIZATION: Verify user has access to each appointment
    const authorizedAppointments: AppointmentWithDetails[] = [];
    
    if (appointments) {
      for (const appointment of appointments) {
        const authResult = await AppointmentAuthorization.validateAppointmentAccess(
          appointment.id,
          AuthorizationAction.READ,
          authContext
        );
        
        if (authResult.authorized) {
          authorizedAppointments.push(appointment as AppointmentWithDetails);
        }
      }
    }

    // Get total count with same filters (for pagination)
    let countQuery = rds
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    // Apply same access control filters for count
    if (userRole === 'user') {
      countQuery = countQuery.eq('user_id', context.userId!);
    } else if (userRole === 'instructor') {
      countQuery = countQuery.or(`user_id.eq.${context.userId!},instructor_id.eq.${context.userId!}`);
    }

    // Apply same filters to count query
    if (filters.status && filters.status.length > 0) {
      countQuery = countQuery.in('status', filters.status);
    }
    if (filters.instructor_id) {
      countQuery = countQuery.eq('instructor_id', filters.instructor_id);
    }
    if (filters.user_id && ['admin', 'super_admin', 'support'].includes(userRole || '')) {
      countQuery = countQuery.eq('user_id', filters.user_id);
    }

    const { count } = await countQuery;

    const response: PaginatedResponse<AppointmentWithDetails> = {
      data: authorizedAppointments,
      meta: {
        total: count || 0,
        page: Math.floor(filters.offset! / filters.limit!) + 1,
        limit: filters.limit!,
        has_more: (filters.offset! + filters.limit!) < (count || 0),
        total_pages: Math.ceil((count || 0) / filters.limit!)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in appointments GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * 🔒 SECURE POST HANDLER - Create appointment with comprehensive security
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    // 🔒 SECURITY: Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedBody = InputSanitizer.sanitizeObject(rawBody).sanitized;

    // 🔒 VALIDATION: Validate with Zod schema  
    const validation = validate.createAppointment(sanitizedBody);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid appointment data',
          details: validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        } as ApiResponse,
        { status: 400 }
      );
    }

    const appointmentData = validation.data;

    // 🔒 AUTHORIZATION: Create authorization context
    const authContext: AuthorizationContext = {
      userId: context.userId!,
      userRole: context.userRole || 'user',
      userStatus: 'active',
      timestamp: new Date(),
      sessionId: (context as any).sessionId || 'unknown',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    };

    // 🔒 AUTHORIZATION: Verify user can create appointments
    const createAuthResult = await AppointmentAuthorization.validateAppointmentAccess(
      'new', // Placeholder for new appointment
      AuthorizationAction.CREATE,
      authContext
    );

    if (!createAuthResult.authorized) {
      return NextResponse.json(
        { 
          error: 'Not authorized to create appointments',
          reason: createAuthResult.reason 
        } as ApiResponse,
        { status: 403 }
      );
    }

    const rds = createRDSClient();

    // 🔒 BUSINESS VALIDATION: Get appointment type and validate
    const { data: appointmentType, error: typeError } = await rds
      .from('appointment_types')
      .select('*')
      .eq('id', appointmentData.appointment_type_id)
      .eq('is_active', true)
      .single();

    if (typeError || !appointmentType) {
      return NextResponse.json(
        { error: 'Invalid or inactive appointment type' } as ApiResponse,
        { status: 400 }
      );
    }

    // 🔒 AUTHORIZATION: Verify appointment type belongs to instructor
    if (appointmentType.instructor_id !== appointmentData.instructor_id) {
      return NextResponse.json(
        { error: 'Appointment type does not belong to selected instructor' } as ApiResponse,
        { status: 400 }
      );
    }

    // 🔒 CALCULATE END TIME: Calculate end time based on appointment type duration
    const startDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`);
    const endDateTime = new Date(startDateTime.getTime() + appointmentType.duration_minutes * 60000);
    const endTimeString = endDateTime.toTimeString().slice(0, 5);

    // 🔒 ATOMIC BOOKING: Use AtomicBookingService to prevent race conditions
    const atomicBookingRequest = {
      userId: context.userId!,
      instructorId: appointmentData.instructor_id,
      appointmentTypeId: appointmentData.appointment_type_id,
      appointmentDate: appointmentData.appointment_date,
      startTime: appointmentData.start_time,
      endTime: endTimeString,
      meetingType: appointmentData.meeting_type,
      meetingLocation: appointmentData.meeting_location,
      meetingLink: appointmentData.meeting_link,
      notes: appointmentData.notes,
      userDetails: appointmentData.user_details
    };

    const bookingResult = await AtomicBookingService.createAppointmentWithRetry(
      atomicBookingRequest,
      3 // Max retry attempts
    );

    if (!bookingResult.success) {
      let statusCode = 500;
      
      // Map error codes to appropriate HTTP status codes
      switch (bookingResult.errorCode) {
        case 'VALIDATION_FAILED':
          statusCode = 400;
          break;
        case 'SLOT_NOT_AVAILABLE':
          statusCode = 409;
          break;
        case 'LOCK_ACQUISITION_FAILED':
          statusCode = 423; // Locked
          break;
        default:
          statusCode = 500;
      }

      return NextResponse.json(
        { 
          error: bookingResult.error,
          errorCode: bookingResult.errorCode,
          conflictDetails: bookingResult.conflictDetails
        } as ApiResponse,
        { status: statusCode }
      );
    }

    // 🔒 SUCCESS: Get the created appointment with full details
    const { data: appointment, error: fetchError } = await rds
      .from('appointments')
      .select(`
        *,
        instructor:user_profiles!appointments_instructor_id_fkey(
          id:user_id,
          full_name,
          email,
          profile_image_url:avatar_url,
          bio
        ),
        user:user_profiles!appointments_user_id_fkey(
          id:user_id,
          full_name,
          email
        ),
        appointment_type:appointment_types(
          id,
          type_name,
          description,
          duration_minutes,
          price,
          currency
        )
      `)
      .eq('id', bookingResult.appointmentId!)
      .single();

    if (fetchError) {
      console.error('Error fetching created appointment:', fetchError);
      return NextResponse.json(
        { error: 'Appointment created but failed to retrieve details' } as ApiResponse,
        { status: 201 } // Still created successfully
      );
    }

    // 🔒 NOTIFICATIONS: Schedule notifications (async, don't block response)
    const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`);
    const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    const reminder1h = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);

    // Don't await - let notifications be scheduled asynchronously
    Promise.all([
      scheduleNotification(rds, bookingResult.appointmentId!, NotificationType.CONFIRMATION, new Date()),
      scheduleNotification(rds, bookingResult.appointmentId!, NotificationType.REMINDER_24H, reminder24h),
      scheduleNotification(rds, bookingResult.appointmentId!, NotificationType.REMINDER_1H, reminder1h)
    ]).catch(error => {
      console.error('Failed to schedule notifications:', error);
      // Don't fail the appointment creation due to notification errors
    });

    const response: ApiResponse<AppointmentWithDetails> = {
      data: appointment as AppointmentWithDetails,
      message: 'Appointment created successfully'
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error in appointments POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * 🔒 SECURE NOTIFICATION SCHEDULING
 * Helper function with error handling
 */
async function scheduleNotification(
  supabase: any,
  appointmentId: string,
  type: NotificationType,
  scheduledTime: Date
): Promise<void> {
  try {
    await supabase
      .from('appointment_notifications')
      .insert({
        appointment_id: appointmentId,
        notification_type: type,
        scheduled_time: scheduledTime.toISOString(),
        is_sent: false,
        template_data: {},
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error(`Error scheduling ${type} notification:`, error);
    // Log but don't throw - notification failures shouldn't break appointment creation
  }
}

// 🔒 SECURE EXPORTS: All handlers use security wrappers
export const GET = withUserSecurity(getHandler);
export const POST = withUserSecurity(postHandler);
