import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withUserSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  AppointmentWithDetails,
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
 * POST /api/appointments/[id]/reschedule - Reschedule appointment to new date/time
 * Security: User can only reschedule their own appointments
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const body: RescheduleAppointmentRequest = await request.json();
    const supabase = await createClient();

    // Validate required fields
    if (!body.new_date || !body.new_time) {
      return NextResponse.json(
        { error: 'New date and time are required' } as ApiResponse,
        { status: 400 }
      );
    }

    // Get existing appointment
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_type:appointment_types(*),
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email
        )
      `)
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

    // Check if appointment can be rescheduled
    if (['completed', 'cancelled'].includes(existingAppointment.status)) {
      return NextResponse.json(
        { error: 'Cannot reschedule completed or cancelled appointments' } as ApiResponse,
        { status: 400 }
      );
    }

    // Check rescheduling policy - same as cancellation policy
    const originalDateTime = new Date(`${existingAppointment.appointment_date}T${existingAppointment.start_time}`);
    const now = new Date();
    const hoursUntilOriginal = (originalDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilOriginal < existingAppointment.appointment_type.cancellation_hours) {
      return NextResponse.json(
        { 
          error: 'Rescheduling policy violation',
          message: `Appointments must be rescheduled at least ${existingAppointment.appointment_type.cancellation_hours} hours in advance`
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate new date is not in the past
    const newDateTime = new Date(`${body.new_date}T${body.new_time}`);
    if (newDateTime <= now) {
      return NextResponse.json(
        { error: 'Cannot schedule appointments in the past' } as ApiResponse,
        { status: 400 }
      );
    }

    // Check booking advance limit
    const daysUntilNew = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilNew > existingAppointment.appointment_type.booking_advance_days) {
      return NextResponse.json(
        { 
          error: 'Booking advance limit exceeded',
          message: `Cannot book more than ${existingAppointment.appointment_type.booking_advance_days} days in advance`
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Calculate new end time
    const startTime = new Date(`${body.new_date}T${body.new_time}`);
    const endTime = new Date(startTime.getTime() + existingAppointment.duration_minutes * 60000);
    const newEndTime = endTime.toTimeString().slice(0, 5);

    // Check availability of new time slot
    const availabilityCheck = await checkTimeSlotAvailability(
      supabase,
      existingAppointment.instructor_id,
      body.new_date,
      body.new_time,
      newEndTime,
      id // Exclude current appointment
    );

    if (!availabilityCheck.available) {
      return NextResponse.json(
        { 
          error: 'New time slot not available',
          message: availabilityCheck.reason 
        } as ApiResponse,
        { status: 409 }
      );
    }

    // Store original appointment details for notification
    const originalDetails = {
      date: existingAppointment.appointment_date,
      start_time: existingAppointment.start_time,
      end_time: existingAppointment.end_time
    };

    // Update appointment with new date/time
    const updateData = {
      appointment_date: body.new_date,
      start_time: body.new_time,
      end_time: newEndTime,
      status: 'pending' as AppointmentStatus, // Reset to pending for confirmation
      notes: body.reason ? 
        `${existingAppointment.notes || ''}\n\nRescheduled: ${body.reason}`.trim() : 
        existingAppointment.notes,
      updated_at: new Date().toISOString()
    };

    const { data: rescheduledAppointment, error: updateError } = await supabase
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
      console.error('Error rescheduling appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to reschedule appointment' } as ApiResponse,
        { status: 500 }
      );
    }

    // Cancel old reminder notifications
    await supabase
      .from('appointment_notifications')
      .update({ is_sent: true }) // Mark as sent to prevent sending
      .eq('appointment_id', id)
      .in('notification_type', ['reminder_24h', 'reminder_1h'])
      .eq('is_sent', false);

    // Schedule new notifications
    const newAppointmentDateTime = new Date(`${body.new_date}T${body.new_time}`);
    const reminder24h = new Date(newAppointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    const reminder1h = new Date(newAppointmentDateTime.getTime() - 60 * 60 * 1000);

    await Promise.all([
      // Send reschedule notification immediately
      scheduleNotification(
        supabase,
        id,
        NotificationType.RESCHEDULE,
        new Date(),
        {
          original_date: originalDetails.date,
          original_time: originalDetails.start_time,
          new_date: body.new_date,
          new_time: body.new_time,
          reason: body.reason
        }
      ),
      // Schedule new reminder notifications
      scheduleNotification(supabase, id, NotificationType.REMINDER_24H, reminder24h),
      scheduleNotification(supabase, id, NotificationType.REMINDER_1H, reminder1h)
    ]);

    const response: ApiResponse<AppointmentWithDetails> = {
      data: rescheduledAppointment,
      message: 'Appointment rescheduled successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in appointment reschedule handler:', error);
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
  scheduledTime: Date,
  templateData: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase
      .from('appointment_notifications')
      .insert({
        appointment_id: appointmentId,
        notification_type: type,
        scheduled_time: scheduledTime.toISOString(),
        is_sent: false,
        template_data: templateData
      });
  } catch (error) {
    console.error(`Error scheduling ${type} notification:`, error);
  }
}

export const POST = withUserSecurity(postHandler);