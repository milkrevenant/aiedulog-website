import {
withSecurity, 
  withPublicSecurity,
  withUserSecurity, 
  withAdminSecurity, 
  withHighSecurity,
  withAuthSecurity,
  withUploadSecurity,
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { 
  createErrorResponse, 
  handleValidationError,
  handleUnexpectedError,
  ErrorType 
} from '@/lib/security/error-handler';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { createRDSClient } from '@/lib/db/rds-client';
import { getNotificationService } from '@/lib/services/notification-service';
import { TableRow } from '@/lib/db/types';

type ContentScheduleRow = TableRow<'content_schedules'>;
type MainContentSectionRow = TableRow<'main_content_sections'>;
type ContentBlockRow = TableRow<'content_blocks'>;
type IdentityRow = TableRow<'identities'>;

/**
 * GET /api/admin/scheduler
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Get all scheduled content actions
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const content_type = searchParams.get('content_type');
    const schedule_type = searchParams.get('schedule_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = rds
      .from('content_schedules')
      .select(`
        *,
        sections:content_id(title, section_key),
        blocks:content_id(content, block_type)
      `)
      .order('scheduled_time', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (content_type && content_type !== 'all') {
      query = query.eq('content_type', content_type);
    }

    if (schedule_type && schedule_type !== 'all') {
      query = query.eq('schedule_type', schedule_type);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: schedules, error, count } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await rds
      .rpc('get_schedule_stats');

    return NextResponse.json({
      success: true,
      schedules: schedules || [],
      total: count || 0,
      stats: stats || [],
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in scheduler GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/scheduler
 * Create new scheduled content action
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const body = await request.json();
    const {
      content_type,
      content_id,
      schedule_type,
      scheduled_time,
      timezone = 'Asia/Seoul',
      recurrence_rule,
      action_data = {}
    } = body;

    // Validation
    if (!content_type || !content_id || !schedule_type || !scheduled_time) {
      return NextResponse.json({ 
        error: 'Missing required fields: content_type, content_id, schedule_type, scheduled_time' 
      }, { status: 400 });
    }

    // Validate content exists
    const contentTable = content_type === 'section' ? 'main_content_sections' : 'content_blocks';
    const { data: contentRows, error: contentError } = await rds
      .from(contentTable)
      .select('id')
      .eq('id', content_id);

    const contentExists = contentRows?.[0];

    if (contentError || !contentExists) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_time);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Get current user identity
    const { data: identityRows } = await rds
      .from('identities')
      .select('id')
      .eq('auth_user_id', auth.user.id);

    const identity = identityRows?.[0];

    const scheduleData = {
      content_type,
      content_id,
      schedule_type,
      scheduled_time,
      timezone,
      recurrence_rule,
      action_data,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      created_by: identity?.id
    };

    const { data: scheduleRows, error } = await rds
      .from('content_schedules')
      .insert(scheduleData, { select: '*' });

    const schedule = scheduleRows?.[0];

    if (error) {
      console.error('Error creating schedule:', error);
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    // Send notification about schedule creation
    try {
      const contentTitle = 'New Schedule'; // Would get from content if needed
      const userIds = [identity?.id].filter(Boolean);
      
      if (userIds.length > 0) {
        await getNotificationService().createScheduleNotification(
          schedule.id,
          'schedule_created',
          userIds,
          contentTitle,
          schedule_type,
          scheduled_time
        );
      }
    } catch (notificationError) {
      console.error('Error sending schedule creation notification:', notificationError);
      // Don't fail the schedule creation due to notification errors
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    console.error('Error in scheduler POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/scheduler
 * Update existing schedule
 */
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // Handle different actions
    if (action) {
      switch (action) {
        case 'execute': {
          // Execute schedule immediately
          const result = await executeSchedule(rds, id);
          return NextResponse.json(result);
        }

        case 'pause': {
          const { data: scheduleRows, error } = await rds
            .from('content_schedules')
            .eq('id', id)
            .update({ status: 'cancelled' }, { select: '*' });

          const schedule = scheduleRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to pause schedule' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            schedule,
            message: 'Schedule paused successfully'
          });
        }

        case 'resume': {
          const { data: scheduleRows, error } = await rds
            .from('content_schedules')
            .eq('id', id)
            .eq('status', 'cancelled')
            .update({ status: 'pending' }, { select: '*' });

          const schedule = scheduleRows?.[0];

          if (error) {
            return NextResponse.json({ error: 'Failed to resume schedule' }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            schedule,
            message: 'Schedule resumed successfully'
          });
        }
      }
    }

    // Regular update
    const { data: scheduleRows, error } = await rds
      .from('content_schedules')
      .eq('id', id)
      .update(updateData, { select: '*' });

    const schedule = scheduleRows?.[0];

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Error in scheduler PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/scheduler
 * Delete scheduled action
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const { error } = await rds
      .from('content_schedules')
      .eq('id', id)
      .delete();

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error in scheduler DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Execute a scheduled action immediately
 */
async function executeSchedule(rds: any, scheduleId: string) {
  try {
    // Get schedule details
    const { data: scheduleRows, error: scheduleError } = await rds
      .from('content_schedules')
      .select('*')
      .eq('id', scheduleId);

    const schedule = scheduleRows?.[0];

    if (scheduleError || !schedule) {
      return { success: false, error: 'Schedule not found' };
    }

    // Execute based on schedule type
    let executionResult;
    const contentTable = schedule.content_type === 'section' 
      ? 'main_content_sections' 
      : 'content_blocks';

    switch (schedule.schedule_type) {
      case 'publish': {
        const { data: rows, error } = await rds
          .from(contentTable)
          .eq('id', schedule.content_id)
          .update({
            status: 'published',
            published_at: new Date().toISOString()
          }, { select: '*' });

        const data = rows?.[0];
        executionResult = { action: 'publish', content: data, error };
        break;
      }

      case 'unpublish': {
        const { data: rows, error } = await rds
          .from(contentTable)
          .eq('id', schedule.content_id)
          .update({ status: 'draft' }, { select: '*' });

        const data = rows?.[0];
        executionResult = { action: 'unpublish', content: data, error };
        break;
      }

      case 'archive': {
        const { data: rows, error } = await rds
          .from(contentTable)
          .eq('id', schedule.content_id)
          .update({ status: 'archived' }, { select: '*' });

        const data = rows?.[0];
        executionResult = { action: 'archive', content: data, error };
        break;
      }

      case 'update': {
        // Apply action_data as updates
        const { data: rows, error } = await rds
          .from(contentTable)
          .eq('id', schedule.content_id)
          .update(schedule.action_data, { select: '*' });

        const data = rows?.[0];
        executionResult = { action: 'update', content: data, error };
        break;
      }

      default: {
        executionResult = { error: 'Unknown schedule type' };
      }
    }

    // Update schedule status
    const updateData: any = {
      status: executionResult.error ? 'failed' : 'executed',
      executed_at: new Date().toISOString(),
      execution_result: executionResult,
    };

    if (executionResult.error) {
      updateData.error_message = executionResult.error.message || 'Execution failed';
      updateData.retry_count = schedule.retry_count + 1;
    }

    const { error: updateError } = await rds
      .from('content_schedules')
      .eq('id', scheduleId)
      .update(updateData, { select: '*' });

    if (updateError) {
      console.error('Error updating schedule after execution:', updateError);
    }

    // Send notification about execution result
    try {
      const contentTitle = executionResult.content?.title || executionResult.content?.content || 'Unknown Content';
      const userIds = [schedule.created_by].filter(Boolean);
      
      if (userIds.length > 0) {
        await getNotificationService().createScheduleNotification(
          schedule.id,
          executionResult.error ? 'schedule_failed' : 'schedule_executed',
          userIds,
          contentTitle,
          schedule.schedule_type,
          schedule.scheduled_time,
          executionResult.error?.message
        );
      }
    } catch (notificationError) {
      console.error('Error sending schedule execution notification:', notificationError);
      // Don't fail the schedule execution due to notification errors
    }

    return {
      success: !executionResult.error,
      executionResult,
      error: executionResult.error?.message,
      message: executionResult.error ? 'Schedule execution failed' : 'Schedule executed successfully'
    };
  } catch (error) {
    console.error('Error executing schedule:', error);
    
    // Update schedule with error
    await rds
      .from('content_schedules')
      .eq('id', scheduleId)
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
        // Note: retry_count increment needs to be handled differently in RDS
      }, { select: '*' });

    // Send notification about execution failure
    try {
      // TODO: Get schedule data for notification
      // const userIds = [schedule?.created_by].filter(Boolean);
      // if (userIds.length > 0) {
      //   await getNotificationService().createScheduleNotification(
      //     scheduleId,
      //     'schedule_failed',
      //     userIds,
      //     'Unknown Content',
      //     schedule?.schedule_type || 'unknown',
      //     schedule?.scheduled_time,
      //     error instanceof Error ? error.message : 'Unknown error'
      //   );
      // }
    } catch (notificationError) {
      console.error('Error sending schedule failure notification:', notificationError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
