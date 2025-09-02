/**
 * Scheduling Notifications API
 * 
 * Comprehensive API endpoints for managing appointment booking notifications.
 * Supports all 11 notification types with multi-channel delivery,
 * calendar integration, and user preference management.
 * 
 * Actions supported:
 * - send_booking_confirmation
 * - send_appointment_confirmation  
 * - schedule_reminders
 * - send_cancellation
 * - send_reschedule
 * - send_completion
 * - send_no_show
 * - send_waitlist_available
 * - generate_calendar_file
 * - get_notification_preferences
 * - update_notification_preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getSchedulingNotificationService, 
  NotificationConfig,
  AppointmentData,
  AppointmentTypeData,
  UserData
} from '@/lib/services/scheduling-notification-service';

interface APIResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// POST handler for sending notifications
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    const schedulingNotificationService = getSchedulingNotificationService();

    switch (action) {
      case 'send_booking_confirmation':
        return await handleBookingConfirmation(schedulingNotificationService, params, supabase);

      case 'send_appointment_confirmation':
        return await handleAppointmentConfirmation(schedulingNotificationService, params, supabase);

      case 'schedule_reminders':
        return await handleScheduleReminders(schedulingNotificationService, params, supabase);

      case 'send_cancellation':
        return await handleCancellation(schedulingNotificationService, params, supabase);

      case 'send_reschedule':
        return await handleReschedule(schedulingNotificationService, params, supabase);

      case 'send_completion':
        return await handleCompletion(schedulingNotificationService, params, supabase);

      case 'send_no_show':
        return await handleNoShow(schedulingNotificationService, params, supabase);

      case 'send_waitlist_available':
        return await handleWaitlistAvailable(schedulingNotificationService, params, supabase);

      case 'generate_calendar_file':
        return await handleGenerateCalendarFile(schedulingNotificationService, params, supabase) as NextResponse<APIResponse>;

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Scheduling notifications API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// GET handler for retrieving notification data
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const appointmentId = searchParams.get('appointmentId');

    switch (action) {
      case 'get_notification_preferences':
        return await handleGetNotificationPreferences(user.id, supabase);

      case 'get_appointment_notifications':
        if (!appointmentId) {
          return NextResponse.json({
            success: false,
            error: 'appointmentId is required'
          }, { status: 400 });
        }
        return await handleGetAppointmentNotifications(appointmentId, supabase);

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported GET action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Scheduling notifications GET API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// PUT handler for updating preferences
export async function PUT(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'update_notification_preferences':
        return await handleUpdateNotificationPreferences(user.id, params, supabase);

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported PUT action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Scheduling notifications PUT API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// =============================================================================
// NOTIFICATION HANDLERS
// =============================================================================

async function handleBookingConfirmation(
  service: any,
  params: {
    appointmentId: string;
    config?: NotificationConfig;
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, config = {} } = params;

    // Fetch appointment data
    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.sendBookingConfirmation(
      appointment,
      appointmentType,
      user,
      instructor,
      config
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Booking confirmation sent successfully' : 'Failed to send booking confirmation',
      data: result,
      error: result.errors?.join(', ')
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send booking confirmation'
    }, { status: 500 });
  }
}

async function handleAppointmentConfirmation(
  service: any,
  params: {
    appointmentId: string;
    config?: NotificationConfig;
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, config = {} } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.sendAppointmentConfirmation(
      appointment,
      appointmentType,
      user,
      instructor,
      config
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Appointment confirmation sent successfully' : 'Failed to send appointment confirmation',
      data: result,
      error: result.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send appointment confirmation'
    }, { status: 500 });
  }
}

async function handleScheduleReminders(
  service: any,
  params: {
    appointmentId: string;
    config: NotificationConfig;
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, config } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.scheduleReminderNotifications(
      appointment,
      appointmentType,
      user,
      instructor,
      config
    );

    return NextResponse.json({
      success: result.success,
      message: `${result.remindersScheduled} reminders scheduled successfully`,
      data: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule reminders'
    }, { status: 500 });
  }
}

async function handleCancellation(
  service: any,
  params: {
    appointmentId: string;
    cancelledBy: 'user' | 'instructor' | 'system';
    reason?: string;
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, cancelledBy, reason } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.sendCancellationNotification(
      appointment,
      appointmentType,
      user,
      instructor,
      cancelledBy,
      reason
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Cancellation notification sent successfully' : 'Failed to send cancellation notification',
      data: result,
      error: result.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send cancellation notification'
    }, { status: 500 });
  }
}

async function handleReschedule(
  service: any,
  params: {
    originalAppointmentId: string;
    newAppointmentId: string;
    rescheduledBy: 'user' | 'instructor' | 'system';
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { originalAppointmentId, newAppointmentId, rescheduledBy } = params;

    const [originalData, newData] = await Promise.all([
      fetchAppointmentData(originalAppointmentId, supabase),
      fetchAppointmentData(newAppointmentId, supabase)
    ]);

    if (!originalData || !newData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment data not found'
      }, { status: 404 });
    }

    const result = await service.sendRescheduleNotification(
      originalData.appointment,
      newData.appointment,
      newData.appointmentType,
      newData.user,
      newData.instructor,
      rescheduledBy
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Reschedule notification sent successfully' : 'Failed to send reschedule notification',
      data: result,
      error: result.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reschedule notification'
    }, { status: 500 });
  }
}

async function handleCompletion(
  service: any,
  params: {
    appointmentId: string;
    completedBy?: 'instructor' | 'system';
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, completedBy = 'instructor' } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.sendCompletionNotification(
      appointment,
      appointmentType,
      user,
      instructor,
      completedBy
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Completion notification sent successfully' : 'Failed to send completion notification',
      data: result,
      error: result.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send completion notification'
    }, { status: 500 });
  }
}

async function handleNoShow(
  service: any,
  params: {
    appointmentId: string;
    noShowBy: 'user' | 'instructor';
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, noShowBy } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const result = await service.sendNoShowNotification(
      appointment,
      appointmentType,
      user,
      instructor,
      noShowBy
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'No-show notification sent successfully' : 'Failed to send no-show notification',
      data: result,
      error: result.error
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send no-show notification'
    }, { status: 500 });
  }
}

async function handleWaitlistAvailable(
  service: any,
  params: {
    appointmentId: string;
    waitlistedUserIds: string[];
  },
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { appointmentId, waitlistedUserIds } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    // Fetch waitlisted users
    const { data: waitlistedUsers, error } = await supabase
      .from('identities')
      .select('id, full_name, email, preferred_language')
      .in('id', waitlistedUserIds);

    if (error) {
      throw new Error(`Failed to fetch waitlisted users: ${error.message}`);
    }

    const { appointment, appointmentType, instructor } = appointmentData;

    const result = await service.sendWaitlistAvailableNotification(
      appointment,
      appointmentType,
      waitlistedUsers,
      instructor
    );

    return NextResponse.json({
      success: result.success,
      message: `Waitlist notifications sent to ${result.notifiedUsers} users`,
      data: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send waitlist notifications'
    }, { status: 500 });
  }
}

async function handleGenerateCalendarFile(
  service: any,
  params: {
    appointmentId: string;
  },
  supabase: any
): Promise<NextResponse> {
  try {
    const { appointmentId } = params;

    const appointmentData = await fetchAppointmentData(appointmentId, supabase);
    if (!appointmentData) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 });
    }

    const { appointment, appointmentType, user, instructor } = appointmentData;

    const icsContent = service.generateICSFile(
      appointment,
      appointmentType,
      user,
      instructor
    );

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="appointment-${appointment.id}.ics"`
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate calendar file'
    }, { status: 500 });
  }
}

// =============================================================================
// PREFERENCE HANDLERS
// =============================================================================

async function handleGetNotificationPreferences(
  userId: string,
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'schedule')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: preferences || getDefaultSchedulingPreferences(userId)
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch notification preferences'
    }, { status: 500 });
  }
}

async function handleUpdateNotificationPreferences(
  userId: string,
  params: any,
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        category: 'schedule',
        ...params,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,category'
      });

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notification preferences'
    }, { status: 500 });
  }
}

async function handleGetAppointmentNotifications(
  appointmentId: string,
  supabase: any
): Promise<NextResponse<APIResponse>> {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_content_id', appointmentId)
      .eq('category', 'schedule')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: notifications || []
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch appointment notifications'
    }, { status: 500 });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function fetchAppointmentData(appointmentId: string, supabase: any) {
  try {
    // Fetch appointment with related data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_type:appointment_types(*),
        user:user_id(id, full_name, email, preferred_language),
        instructor:instructor_id(id, full_name, email, preferred_language)
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      console.error('Failed to fetch appointment:', appointmentError);
      return null;
    }

    return {
      appointment,
      appointmentType: appointment.appointment_type,
      user: appointment.user,
      instructor: appointment.instructor
    };

  } catch (error) {
    console.error('Error fetching appointment data:', error);
    return null;
  }
}

function getDefaultSchedulingPreferences(userId: string) {
  return {
    user_id: userId,
    category: 'schedule',
    channels: ['in_app', 'email'],
    timezone: 'Asia/Seoul',
    digest_frequency: 'immediate',
    max_notifications_per_hour: 10,
    schedule_notifications: true,
    appointment_confirmations: true,
    appointment_reminders_24h: true,
    appointment_reminders_1h: true,
    appointment_reminders_15m: false,
    appointment_changes: true,
    instructor_notifications: true,
    waitlist_notifications: true,
    is_active: true
  };
}