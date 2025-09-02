import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withUserSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  AppointmentWithDetails,
  UpdateAppointmentRequest,
  CancelAppointmentRequest,
  RescheduleAppointmentRequest,
  ApiResponse,
  AppointmentStatus,
  NotificationType
} from '@/types/appointment-system';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/appointments/[id] - Get specific appointment details
 * Security: User can only access their own appointments or appointments they're instructing
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const supabase = await createClient();

    const { data: appointment, error } = await supabase
      .from('appointments')
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
        appointment_type:appointment_types(*),
        notifications:appointment_notifications(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      return NextResponse.json(
        { error: 'Appointment not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if user has permission to view this appointment
    const hasAccess = appointment.user_id === context.userId || 
                     appointment.instructor_id === context.userId;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }

    const response: ApiResponse<AppointmentWithDetails> = {
      data: appointment
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in appointment GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * PUT /api/appointments/[id] - Update appointment details
 * Security: User can only update their own appointments
 */
const putHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const body: UpdateAppointmentRequest = await request.json();
    const supabase = await createClient();

    // First, get the existing appointment
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, appointment_type:appointment_types(*)')
      .eq('id', id)
      .single();

    if (fetchError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Check permission
    if (existingAppointment.user_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }

    // Prevent updates to completed or cancelled appointments
    if (['completed', 'cancelled'].includes(existingAppointment.status)) {
      return NextResponse.json(
        { error: 'Cannot update completed or cancelled appointments' } as ApiResponse,
        { status: 400 }
      );
    }

    // If updating date/time, check availability
    if (body.appointment_date || body.start_time) {
      const newDate = body.appointment_date || existingAppointment.appointment_date;
      const newStartTime = body.start_time || existingAppointment.start_time;
      
      // Calculate new end time if needed
      let newEndTime = existingAppointment.end_time;
      if (body.start_time) {
        const startTime = new Date(`${newDate}T${newStartTime}`);
        const endTime = new Date(startTime.getTime() + existingAppointment.duration_minutes * 60000);
        newEndTime = endTime.toTimeString().slice(0, 5);
      }

      // Check availability (exclude current appointment from conflict check)
      const availabilityCheck = await checkTimeSlotAvailability(
        supabase,
        existingAppointment.instructor_id,
        newDate,
        newStartTime,
        newEndTime,
        id // Exclude current appointment
      );

      if (!availabilityCheck.available) {
        return NextResponse.json(
          { 
            error: 'Time slot not available',
            message: availabilityCheck.reason 
          } as ApiResponse,
          { status: 409 }
        );
      }

      body.appointment_date = newDate;
      body.start_time = newStartTime;
      // Update end_time if start_time changed
      if (newEndTime !== existingAppointment.end_time) {
        (body as any).end_time = newEndTime;
      }
    }

    // Update appointment
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email,
          profile_image_url,
          bio
        ),
        appointment_type:appointment_types(*)
      `)
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment' } as ApiResponse,
        { status: 500 }
      );
    }

    // If date/time was changed, schedule reschedule notification
    if (body.appointment_date || body.start_time) {
      await scheduleNotification(
        supabase,
        id,
        NotificationType.RESCHEDULE,
        new Date()
      );
    }

    const response: ApiResponse<AppointmentWithDetails> = {
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in appointment PUT handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/appointments/[id] - Cancel appointment
 * Security: User can only cancel their own appointments
 */
const deleteHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const supabase = await createClient();

    // Get cancellation details from request body
    let cancelRequest: CancelAppointmentRequest = { reason: 'User cancellation' };
    try {
      const body = await request.json();
      cancelRequest = body;
    } catch {
      // Body is optional for DELETE requests
    }

    // Get existing appointment
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Check permission
    if (existingAppointment.user_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }

    // Check if appointment can be cancelled
    if (existingAppointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' } as ApiResponse,
        { status: 400 }
      );
    }

    if (existingAppointment.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed appointments' } as ApiResponse,
        { status: 400 }
      );
    }

    // Check cancellation policy
    const appointmentDateTime = new Date(`${existingAppointment.appointment_date}T${existingAppointment.start_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Get appointment type for cancellation policy
    const { data: appointmentType } = await supabase
      .from('appointment_types')
      .select('cancellation_hours')
      .eq('id', existingAppointment.appointment_type_id)
      .single();

    if (appointmentType && hoursUntilAppointment < appointmentType.cancellation_hours) {
      return NextResponse.json(
        { 
          error: 'Cancellation policy violation',
          message: `Appointments must be cancelled at least ${appointmentType.cancellation_hours} hours in advance`
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Cancel the appointment
    const { data: cancelledAppointment, error: cancelError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled' as AppointmentStatus,
        cancellation_reason: cancelRequest.reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email,
          profile_image_url,
          bio
        ),
        appointment_type:appointment_types(*)
      `)
      .single();

    if (cancelError) {
      console.error('Error cancelling appointment:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel appointment' } as ApiResponse,
        { status: 500 }
      );
    }

    // Send cancellation notification
    await scheduleNotification(
      supabase,
      id,
      NotificationType.CANCELLATION,
      new Date()
    );

    const response: ApiResponse<AppointmentWithDetails> = {
      data: cancelledAppointment,
      message: 'Appointment cancelled successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in appointment DELETE handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Helper function to check time slot availability (with exclusion)
 */
async function checkTimeSlotAvailability(
  supabase: any,
  instructorId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; reason?: string }> {
  // Build conflict check query
  let conflictQuery = supabase
    .from('appointments')
    .select('id')
    .eq('instructor_id', instructorId)
    .eq('appointment_date', date)
    .not('status', 'eq', 'cancelled')
    .or(`start_time.lte.${startTime},end_time.gte.${endTime}`)
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  // Exclude current appointment if updating
  if (excludeAppointmentId) {
    conflictQuery = conflictQuery.neq('id', excludeAppointmentId);
  }

  const { data: conflicts, error: conflictError } = await conflictQuery;

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
  }
}

export const GET = withUserSecurity(getHandler);
export const PUT = withUserSecurity(putHandler);
export const DELETE = withUserSecurity(deleteHandler);