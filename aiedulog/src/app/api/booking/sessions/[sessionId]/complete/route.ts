import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  BookingSession,
  AppointmentWithDetails,
  ApiResponse,
  AppointmentStatus,
  NotificationType
} from '@/types/appointment-system';

interface RouteParams {
  params: {
    sessionId: string;
  };
}

/**
 * POST /api/booking/sessions/[sessionId]/complete - Complete booking session and create appointment
 * Security: Public access with session ownership validation
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');
    const supabase = await createClient();
    
    // Get booking session
    let sessionQuery = supabase
      .from('booking_sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString());
    
    // Apply access control
    if (context.userId) {
      sessionQuery = sessionQuery.eq('user_id', context.userId);
    } else {
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Session token is required for anonymous access' } as ApiResponse,
          { status: 400 }
        );
      }
      sessionQuery = sessionQuery.eq('session_token', sessionToken).is('user_id', null);
    }
    
    const { data: session, error: sessionError } = await sessionQuery.single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Booking session not found or expired' } as ApiResponse,
        { status: 404 }
      );
    }
    
    // Validate session data completeness
    const sessionData = session.data;
    const requiredFields = [
      'instructor_id',
      'appointment_type_id',
      'appointment_date',
      'start_time',
      'end_time',
      'duration_minutes',
      'meeting_type'
    ];
    
    const missingFields = requiredFields.filter(field => !sessionData[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Incomplete booking session',
          message: `Missing required fields: ${missingFields.join(', ')}` 
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate user details for anonymous users
    if (!context.userId && (!sessionData.user_details || !sessionData.user_details.email)) {
      return NextResponse.json(
        { error: 'User details are required for anonymous bookings' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Get appointment type for title and validation
    const { data: appointmentType, error: typeError } = await supabase
      .from('appointment_types')
      .select('*')
      .eq('id', sessionData.appointment_type_id)
      .eq('is_active', true)
      .single();
    
    if (typeError || !appointmentType) {
      return NextResponse.json(
        { error: 'Invalid or inactive appointment type' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Final availability check
    const availabilityCheck = await checkTimeSlotAvailability(
      supabase,
      sessionData.instructor_id,
      sessionData.appointment_date,
      sessionData.start_time,
      sessionData.end_time
    );
    
    if (!availabilityCheck.available) {
      return NextResponse.json(
        { 
          error: 'Time slot no longer available',
          message: availabilityCheck.reason 
        } as ApiResponse,
        { status: 409 }
      );
    }
    
    let finalUserId = context.userId;
    
    // Handle anonymous user registration
    if (!context.userId && sessionData.user_details) {
      const { email, full_name, phone } = sessionData.user_details;
      
      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('identities')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Error checking existing user:', userCheckError);
        return NextResponse.json(
          { error: 'Failed to validate user information' } as ApiResponse,
          { status: 500 }
        );
      }
      
      if (existingUser) {
        finalUserId = existingUser.id;
      } else {
        // Create temporary user entry for anonymous booking
        const { data: newUser, error: createUserError } = await supabase
          .from('identities')
          .insert({
            email,
            full_name: full_name || 'Anonymous User',
            phone,
            role: 'user',
            status: 'pending', // Pending until they complete registration
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (createUserError) {
          console.error('Error creating user:', createUserError);
          return NextResponse.json(
            { error: 'Failed to create user account' } as ApiResponse,
            { status: 500 }
          );
        }
        
        finalUserId = newUser.id;
      }
    }
    
    // Create appointment
    const appointmentData = {
      user_id: finalUserId!,
      instructor_id: sessionData.instructor_id,
      appointment_type_id: sessionData.appointment_type_id,
      appointment_date: sessionData.appointment_date,
      start_time: sessionData.start_time,
      end_time: sessionData.end_time,
      duration_minutes: sessionData.duration_minutes,
      status: 'pending' as AppointmentStatus,
      meeting_type: sessionData.meeting_type,
      meeting_location: sessionData.meeting_location,
      title: appointmentType.type_name,
      description: appointmentType.description,
      notes: sessionData.notes,
      reminder_sent: false
    };
    
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select(`
        *,
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email,
          profile_image_url,
          bio
        ),
        user:identities!appointments_user_id_fkey(
          id,
          full_name,
          email
        ),
        appointment_type:appointment_types(*)
      `)
      .single();
    
    if (createError) {
      console.error('Error creating appointment:', createError);
      return NextResponse.json(
        { error: 'Failed to create appointment' } as ApiResponse,
        { status: 500 }
      );
    }
    
    // Schedule notifications
    try {
      // Immediate confirmation notification
      await scheduleNotification(
        supabase,
        appointment.id,
        NotificationType.CONFIRMATION,
        new Date()
      );
      
      // Schedule reminder notifications
      const appointmentDateTime = new Date(`${sessionData.appointment_date}T${sessionData.start_time}`);
      const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      const reminder1h = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
      
      await Promise.all([
        scheduleNotification(supabase, appointment.id, NotificationType.REMINDER_24H, reminder24h),
        scheduleNotification(supabase, appointment.id, NotificationType.REMINDER_1H, reminder1h)
      ]);
    } catch (notificationError) {
      console.error('Error scheduling notifications:', notificationError);
      // Don't fail the appointment creation if notifications fail
    }
    
    // Delete the completed booking session
    try {
      await supabase
        .from('booking_sessions')
        .delete()
        .eq('id', sessionId);
    } catch (deleteError) {
      console.warn('Error deleting booking session:', deleteError);
      // Don't fail if session cleanup fails
    }
    
    const response: ApiResponse<AppointmentWithDetails> = {
      data: appointment,
      message: 'Appointment booked successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('Error in booking completion handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Helper function to check time slot availability
 */
async function checkTimeSlotAvailability(
  supabase: any,
  instructorId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; reason?: string }> {
  // Check for conflicting appointments
  const { data: conflicts, error: conflictError } = await supabase
    .from('appointments')
    .select('id')
    .eq('instructor_id', instructorId)
    .eq('appointment_date', date)
    .not('status', 'eq', 'cancelled')
    .or(`start_time.lte.${startTime},end_time.gte.${endTime}`)
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  if (conflictError) {
    console.error('Error checking conflicts:', conflictError);
    return { available: false, reason: 'Unable to verify availability' };
  }

  if (conflicts && conflicts.length > 0) {
    return { available: false, reason: 'Time slot already booked' };
  }

  // Check instructor availability rules
  const dayOfWeek = new Date(date).getDay();
  const { data: availability, error: availError } = await supabase
    .from('instructor_availability')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true);

  if (availError) {
    console.error('Error checking availability rules:', availError);
    return { available: false, reason: 'Unable to verify availability' };
  }

  if (!availability || availability.length === 0) {
    return { available: false, reason: 'Instructor not available on this day' };
  }

  const timeSlotValid = availability.some((slot: any) => 
    slot.start_time <= startTime && slot.end_time >= endTime
  );

  if (!timeSlotValid) {
    return { available: false, reason: 'Time slot outside working hours' };
  }

  // Check for blocked time periods
  const { data: blocks, error: blockError } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('block_date', date)
    .eq('is_blocked', true);

  if (blockError) {
    console.error('Error checking time blocks:', blockError);
    return { available: false, reason: 'Unable to verify availability' };
  }

  if (blocks && blocks.length > 0) {
    const hasConflict = blocks.some((block: any) =>
      block.start_time <= startTime && block.end_time >= endTime ||
      block.start_time < endTime && block.end_time > startTime
    );

    if (hasConflict) {
      return { available: false, reason: 'Time slot blocked by instructor' };
    }
  }

  return { available: true };
}

/**
 * Helper function to schedule notifications
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
        template_data: {}
      });
  } catch (error) {
    console.error(`Error scheduling ${type} notification:`, error);
    throw error; // Re-throw to handle in caller
  }
}

export const POST = withPublicSecurity(postHandler);