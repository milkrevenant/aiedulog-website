import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { createRDSClient } from '@/lib/db/rds-client';
import { withAdminSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  AppointmentWithDetails,
  AppointmentFilters,
  BulkOperationRequest,
  AppointmentStats,
  ApiResponse,
  PaginatedResponse,
  AppointmentStatus,
  NotificationType
} from '@/types/appointment-system';

/**
 * GET /api/admin/appointments - Get all appointments with admin filters
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Security: Admin access only
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filters: AppointmentFilters = {
      status: searchParams.get('status')?.split(',') as AppointmentStatus[] || undefined,
      instructor_id: searchParams.get('instructor_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: (searchParams.get('sort_by') as 'date' | 'created_at' | 'updated_at') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
    };

    // Build query with full appointment details
    let query: any = rds
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
      `);

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.instructor_id) {
      query = query.eq('instructor_id', filters.instructor_id);
    }
    
    if (filters.date_from) {
      query = query.gte('appointment_date', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('appointment_date', filters.date_to);
    }

    // Apply sorting
    const sortColumn = filters.sort_by === 'date' ? 'appointment_date' : filters.sort_by;
    query = query.order(sortColumn!, { ascending: filters.sort_order === 'asc' });
    
    // Apply pagination
    query = query.range(filters.offset!, filters.offset! + filters.limit! - 1);

    // Get total count for pagination
    const { count } = await rds
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    // Execute query
    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching admin appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' } as ApiResponse,
        { status: 500 }
      );
    }

    const response: PaginatedResponse<AppointmentWithDetails> = {
      data: (appointments ?? []) as AppointmentWithDetails[],
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
    console.error('Error in admin appointments GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * POST /api/admin/appointments - Bulk operations on appointments
 * Security: Admin access only
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();
    const body: BulkOperationRequest = await request.json();

    if (!body.appointment_ids || !Array.isArray(body.appointment_ids) || body.appointment_ids.length === 0) {
      return NextResponse.json(
        { error: 'appointment_ids array is required' } as ApiResponse,
        { status: 400 }
      );
    }

    if (!body.action) {
      return NextResponse.json(
        { error: 'action is required' } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate appointments exist and get current status
    const { data: existingAppointments, error: fetchError } = await rds
      .from('appointments')
      .select('id, status, user_id, instructor_id, appointment_date, start_time')
      .in('id', body.appointment_ids);

    if (fetchError) {
      console.error('Error fetching appointments for bulk operation:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' } as ApiResponse,
        { status: 500 }
      );
    }

    if (!existingAppointments || existingAppointments.length === 0) {
      return NextResponse.json(
        { error: 'No appointments found with provided IDs' } as ApiResponse,
        { status: 404 }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };
    let notificationType: NotificationType | null = null;

    // Prepare update based on action
    switch (body.action) {
      case 'confirm':
        updateData.status = 'confirmed';
        updateData.confirmed_at = new Date().toISOString();
        notificationType = NotificationType.CONFIRMATION;
        break;
        
      case 'cancel':
        updateData.status = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = body.data?.reason || 'Cancelled by administrator';
        notificationType = NotificationType.CANCELLATION;
        break;
        
      case 'reschedule':
        if (!body.data?.new_date || !body.data?.new_time) {
          return NextResponse.json(
            { error: 'new_date and new_time are required for reschedule action' } as ApiResponse,
            { status: 400 }
          );
        }
        
        // For reschedule, we need to check availability for each appointment
        // This is simplified - in practice, you might want to do this per appointment
        updateData.appointment_date = body.data.new_date;
        updateData.start_time = body.data.new_time;
        updateData.status = 'pending'; // Reset to pending after reschedule
        notificationType = NotificationType.RESCHEDULE;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: confirm, cancel, or reschedule' } as ApiResponse,
          { status: 400 }
        );
    }

    // Filter appointments that can be processed
    const processableAppointments = (existingAppointments || []).filter((appointment: any) => {
      switch (body.action) {
        case 'confirm':
          return appointment.status === 'pending';
        case 'cancel':
          return ['pending', 'confirmed'].includes(appointment.status);
        case 'reschedule':
          return ['pending', 'confirmed'].includes(appointment.status);
        default:
          return false;
      }
    });

    if (processableAppointments.length === 0) {
      return NextResponse.json({
        error: 'No appointments can be processed with this action',
        message: `All appointments are in states that cannot be ${body.action}ed`
      } as ApiResponse, { status: 400 });
    }

    const processableIds = processableAppointments.map((a: any) => a.id);

    // Perform bulk update using IN query for all processable appointments
    const queryBuilder = rds
      .from('appointments')
      .in('id', processableIds);

    const { data: updatedAppointments, error: updateError } = await queryBuilder.update(updateData, {
      select: `
        *,
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email
        ),
        user:identities!appointments_user_id_fkey(
          id,
          full_name,
          email
        )
      `
    });

    if (updateError) {
      console.error('Error performing bulk update:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointments' } as ApiResponse,
        { status: 500 }
      );
    }

    // Schedule notifications for all updated appointments
    if (notificationType && updatedAppointments) {
      const notificationPromises = updatedAppointments.map((appointment: any) =>
        scheduleNotification(rds, appointment.id, notificationType!, new Date())
      );

      try {
        await Promise.allSettled(notificationPromises);
      } catch (notificationError) {
        console.warn('Some notifications failed to schedule:', notificationError);
        // Don't fail the operation if notifications fail
      }
    }

    const response: ApiResponse<AppointmentWithDetails[]> = {
      data: updatedAppointments || [],
      message: `Successfully ${body.action}ed ${processableIds.length} appointment(s)`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in admin appointments POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Helper function to schedule notifications
 */
async function scheduleNotification(
  rds: any,
  appointmentId: string,
  type: NotificationType,
  scheduledTime: Date
): Promise<void> {
  try {
    await rds
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
    throw error;
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
