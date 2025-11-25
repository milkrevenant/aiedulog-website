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
import { createRDSClient } from '@/lib/db/rds-client';
import { getNotificationService } from '@/lib/services/notification-service';

/**
 * PUT /api/notifications/[id]
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Update notification (mark as read, archive, etc.)
 */
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient();

    // Use authentication from SecurityContext
    if (!context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use userId from context as the identity ID
    const identityId = context.userId;

    const body = await request.json();
    const { action } = body;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const notificationId = pathSegments[pathSegments.length - 1];

    switch (action) {
      case 'mark_read': {
        const success = await getNotificationService().markAsRead(notificationId, identityId);
        if (!success) {
          return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'Notification marked as read'
        });
      }

      case 'archive': {
        const success = await getNotificationService().archiveNotification(notificationId, identityId);
        if (!success) {
          return NextResponse.json({ error: 'Failed to archive notification' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'Notification archived'
        });
      }

      case 'mark_all_read': {
        const success = await getNotificationService().markAllAsRead(identityId);
        if (!success) {
          return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        });
      }

      default: {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Error in notification PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete notification (admin only or own notifications)
 */
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const rds = createRDSClient();

    // Use authentication from SecurityContext
    if (!context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identityId = context.userId;
    const userRole = context.userRole;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const notificationId = pathSegments[pathSegments.length - 1];

    // Check if user owns the notification or is admin
    const { data: notifications, error: fetchError } = await rds
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId);

    const notification = notifications?.[0] || null;

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const isOwner = notification.user_id === identityId;
    const isAdmin = ['admin', 'super_admin'].includes(userRole || '');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete notification
    const { error: deleteError } = await rds
      .from('notifications')
      .eq('id', notificationId)
      .delete();

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error in notification DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = withPublicSecurity(putHandler);
export const DELETE = withPublicSecurity(deleteHandler);