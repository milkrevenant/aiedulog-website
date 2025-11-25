import { 
  withSecurity, 
  withPublicSecurity,
  withUserSecurity, 
  withAdminSecurity, 
  withHighSecurity,
  withAuthSecurity,
  withUploadSecurity
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { 
  createErrorResponse, 
  handleValidationError,
  handleUnexpectedError,
  ErrorType 
} from '@/lib/security/error-handler';
import { NextRequest, NextResponse } from 'next/server'
import { createRDSClient } from '@/lib/db/rds-client'
import { getNotificationService } from '@/lib/services/notification-service'
import { z } from 'zod'

// =====================================================================
// VALIDATION SCHEMAS
// =====================================================================

const queryParamsSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  category: z.enum(['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']).optional(),
  type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical', 'urgent']).optional(),
  is_read: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  is_archived: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  user_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_archived: z.enum(['true', 'false']).transform(val => val === 'true').default(false),
  unread_only: z.enum(['true', 'false']).transform(val => val === 'true').default(false)
})

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function validateUserAccess(context: SecurityContext, userId?: string) {
  if (!context.userId) {
    return { userId: null, identityId: null, isAdmin: false, error: 'Unauthorized' }
  }

  const identityId = context.userId
  const userRole = context.userRole
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // If accessing specific user's notifications, check permissions
  if (userId && userId !== identityId && !isAdmin) {
    return { userId: context.userId, identityId, isAdmin: false, error: 'Forbidden' }
  }

  return { userId: context.userId, identityId, isAdmin, error: null }
}

/**
 * GET /api/notifications
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Enhanced notification retrieval with comprehensive filtering, pagination, and real-time support
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient()
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    // Validate query parameters
    const validationResult = queryParamsSchema.safeParse(searchParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const params = validationResult.data
    
    // Validate user access
    const { userId, identityId, isAdmin, error } = await validateUserAccess(context, params.user_id)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : error === 'User identity not found' ? 404 : 403 }
      )
    }

    const targetUserId = params.user_id || identityId

    // Build comprehensive query
    let baseQuery = rds
      .from('notifications')
      .select(`
        id,
        user_id,
        user_group,
        title,
        message,
        category,
        type,
        priority,
        link,
        is_read,
        read_at,
        is_archived,
        archived_at,
        channels,
        schedule_id,
        related_content_type,
        related_content_id,
        action_data,
        metadata,
        delivery_attempts,
        max_delivery_attempts,
        scheduled_for,
        expires_at,
        created_at,
        updated_at,
        created_by
      `)
      .eq('user_id', targetUserId)

    // Apply filters
    if (params.category) {
      baseQuery = baseQuery.eq('category', params.category)
    }
    if (params.type) {
      baseQuery = baseQuery.eq('type', params.type)
    }
    if (params.priority) {
      baseQuery = baseQuery.eq('priority', params.priority)
    }
    if (params.is_read !== undefined) {
      baseQuery = baseQuery.eq('is_read', params.is_read)
    }
    if (!params.include_archived) {
      baseQuery = baseQuery.eq('is_archived', false)
    } else if (params.is_archived !== undefined) {
      baseQuery = baseQuery.eq('is_archived', params.is_archived)
    }
    if (params.unread_only) {
      baseQuery = baseQuery.eq('is_read', false)
    }
    if (params.search) {
      baseQuery = baseQuery.or(
        `title.ilike.%${params.search}%,message.ilike.%${params.search}%`
      )
    }

    // Get total count for pagination
    const { count } = await rds
      .from('notifications')
      .select('*', { count: 'exact' as any, head: true })
      .eq('user_id', targetUserId)
    
    // Execute main query with pagination and sorting
    const offset = (params.page - 1) * params.limit
    const { data: notifications, error: fetchError } = await baseQuery
      .order(params.sort_by, { ascending: params.sort_order === 'asc' })
      .range(offset, offset + params.limit - 1)

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get summary statistics
    const { data: stats } = await rds
      .from('notifications')
      .select('is_read, category, priority', { count: 'exact' })
      .eq('user_id', targetUserId)
      .eq('is_archived', false)

    const summary = {
      total: count || 0,
      unread: stats?.filter((n: any) => !n.is_read).length || 0,
      byCategory: stats?.reduce((acc: any, n: any) => {
        acc[n.category] = (acc[n.category] || 0) + 1
        return acc
      }, {}) || {},
      byPriority: stats?.reduce((acc: any, n: any) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1
        return acc
      }, {}) || {}
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / params.limit)
    const hasNextPage = params.page < totalPages
    const hasPreviousPage = params.page > 1

    return NextResponse.json({
      success: true,
      data: notifications || [],
      pagination: {
        page: params.page,
        limit: params.limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      summary,
      meta: {
        filters: {
          category: params.category,
          type: params.type,
          priority: params.priority,
          is_read: params.is_read,
          is_archived: params.is_archived,
          search: params.search,
          unread_only: params.unread_only
        },
        sort: {
          by: params.sort_by,
          order: params.sort_order
        },
        user: {
          id: targetUserId,
          is_admin_view: isAdmin && params.user_id
        }
      }
    })

  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create new notification with enhanced validation and template support
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient()
    
    // Validate user access (admin only for creating notifications)
    const { userId, identityId, isAdmin, error } = await validateUserAccess(context)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Enhanced validation schema
    const createNotificationSchema = z.object({
      user_id: z.string().uuid().optional(),
      user_ids: z.array(z.string().uuid()).optional(),
      user_group: z.string().optional(),
      title: z.string().min(1).max(255),
      message: z.string().min(1),
      category: z.enum(['schedule', 'content', 'system', 'security', 'user', 'admin', 'marketing']).default('system'),
      type: z.string().min(1).max(100).default('admin_notification'),
      priority: z.enum(['low', 'normal', 'high', 'critical', 'urgent']).default('normal'),
      channels: z.array(z.enum(['in_app', 'email', 'push', 'sms', 'webhook'])).default(['in_app']),
      link: z.string().url().optional(),
      schedule_id: z.string().uuid().optional(),
      related_content_type: z.string().max(50).optional(),
      related_content_id: z.string().uuid().optional(),
      action_data: z.any().optional(),
      metadata: z.any().optional(),
      scheduled_for: z.string().datetime().optional(),
      expires_at: z.string().datetime().optional(),
      max_delivery_attempts: z.number().int().min(1).max(10).default(3),
      template_key: z.string().optional(),
      template_data: z.any().optional()
    })
    
    const validationResult = createNotificationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const notificationData = validationResult.data

    // Validate targeting - must have user_id, user_ids, or user_group
    if (!notificationData.user_id && !notificationData.user_ids && !notificationData.user_group) {
      return NextResponse.json(
        { error: 'Must specify user_id, user_ids, or user_group for notification targeting' },
        { status: 400 }
      )
    }

    let result

    // Handle different targeting scenarios
    if (notificationData.user_ids && notificationData.user_ids.length > 0) {
      // Bulk notifications
      result = await getNotificationService().createBulkNotifications(
        notificationData.user_ids,
        {
          title: notificationData.title,
          message: notificationData.message,
          category: notificationData.category,
          type: notificationData.type,
          priority: notificationData.priority,
          link: notificationData.link,
          scheduleId: notificationData.schedule_id,
          relatedContentType: notificationData.related_content_type,
          relatedContentId: notificationData.related_content_id,
          actionData: notificationData.action_data,
          metadata: notificationData.metadata,
          channels: notificationData.channels,
          scheduledFor: notificationData.scheduled_for,
          expiresAt: notificationData.expires_at,
          templateKey: notificationData.template_key,
          templateData: notificationData.template_data
        }
      )
    } else {
      // Single notification
      result = await getNotificationService().createNotification({
        userId: notificationData.user_id,
        userGroup: notificationData.user_group,
        title: notificationData.title,
        message: notificationData.message,
        category: notificationData.category,
        type: notificationData.type,
        priority: notificationData.priority,
        link: notificationData.link,
        scheduleId: notificationData.schedule_id,
        relatedContentType: notificationData.related_content_type,
        relatedContentId: notificationData.related_content_id,
        actionData: notificationData.action_data,
        metadata: notificationData.metadata,
        channels: notificationData.channels,
        scheduledFor: notificationData.scheduled_for,
        expiresAt: notificationData.expires_at,
        templateKey: notificationData.template_key,
        templateData: notificationData.template_data
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create notification',
          details: (result as any).errors
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          notification_ids: (result as any).notificationIds || [(result as any).notificationId],
          count: (result as any).notificationIds ? (result as any).notificationIds.length : 1
        },
        message: `${(result as any).notificationIds ? (result as any).notificationIds.length : 1} notification(s) created successfully`
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications
 * Bulk update notifications (mark as read, archive, etc.)
 */
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient()
    
    // Validate user access
    const { userId, identityId, isAdmin, error } = await validateUserAccess(context)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const body = await request.json()
    
    const updateSchema = z.object({
      notification_ids: z.array(z.string().uuid()).min(1),
      updates: z.object({
        is_read: z.boolean().optional(),
        is_archived: z.boolean().optional(),
        metadata: z.any().optional()
      })
    })
    
    const validationResult = updateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (validationResult.error as any).errors
        },
        { status: 400 }
      )
    }

    const { notification_ids, updates } = validationResult.data
    
    // Build update data with automatic timestamps
    const updateData: any = { ...updates }
    
    if (updates.is_read === true && !updateData.read_at) {
      updateData.read_at = new Date().toISOString()
    }
    
    if (updates.is_archived === true && !updateData.archived_at) {
      updateData.archived_at = new Date().toISOString()
    }

    updateData.updated_at = new Date().toISOString()

    // Execute bulk update with user permission check
    let query = rds
      .from('notifications')
      .in('id', notification_ids)

    // Non-admin users can only update their own notifications
    if (!isAdmin) {
      query = query.eq('user_id', identityId)
    }

    const { data: updatedNotifications, error: updateError } = await query
      .update(updateData, { select: 'id, user_id, title, is_read, is_archived, updated_at' })

    if (updateError) {
      console.error('Error updating notifications:', updateError)
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_notifications: updatedNotifications || [],
        count: updatedNotifications?.length || 0
      },
      message: `${updatedNotifications?.length || 0} notifications updated successfully`
    })

  } catch (error) {
    console.error('Error in PUT /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications
 * Delete notifications (with admin override)
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient()
    
    // Validate user access
    const { userId, identityId, isAdmin, error } = await validateUserAccess(context)
    if (error) {
      return NextResponse.json(
        { error },
        { status: error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const url = new URL(request.url)
    const ids = url.searchParams.get('ids')?.split(',') || []
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No notification IDs provided' },
        { status: 400 }
      )
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const invalidIds = ids.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid notification IDs', invalid_ids: invalidIds },
        { status: 400 }
      )
    }

    // Delete notifications with user permission check
    let query = rds
      .from('notifications')
      .in('id', ids)

    // Non-admin users can only delete their own notifications
    if (!isAdmin) {
      query = query.eq('user_id', identityId)
    }

    const { data: deletedNotifications, error: deleteError } = await query.delete()

    if (deleteError) {
      console.error('Error deleting notifications:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted_notifications: deletedNotifications || [],
        count: deletedNotifications?.length || 0,
        deleted_ids: deletedNotifications?.map(n => n.id) || []
      },
      message: `${deletedNotifications?.length || 0} notifications deleted successfully`
    })

  } catch (error) {
    console.error('Error in DELETE /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withPublicSecurity(getHandler);
export const POST = withPublicSecurity(postHandler);
export const PUT = withPublicSecurity(putHandler);
export const DELETE = withPublicSecurity(deleteHandler);