import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/services/notification-service';

/**
 * PUT /api/notifications/[id]
 * Update notification (mark as read, archive, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user identity
    const { data: identity } = await supabase
      .from('identities')
      .select('id, role')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!identity) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const notificationId = pathSegments[pathSegments.length - 1];

    switch (action) {
      case 'mark_read': {
        const success = await getNotificationService().markAsRead(notificationId, identity.id);
        if (!success) {
          return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'Notification marked as read'
        });
      }

      case 'archive': {
        const success = await getNotificationService().archiveNotification(notificationId, identity.id);
        if (!success) {
          return NextResponse.json({ error: 'Failed to archive notification' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: 'Notification archived'
        });
      }

      case 'mark_all_read': {
        const success = await getNotificationService().markAllAsRead(identity.id);
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
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user identity
    const { data: identity } = await supabase
      .from('identities')
      .select('id, role')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!identity) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const notificationId = pathSegments[pathSegments.length - 1];

    // Check if user owns the notification or is admin
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const isOwner = notification.user_id === identity.id;
    const isAdmin = ['admin', 'super_admin'].includes(identity.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

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