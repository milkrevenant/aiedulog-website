import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';

/**
 * GET /api/notifications/realtime
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Server-Sent Events endpoint for real-time notifications
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<Response> => {
  try {
    const rds = createRDSClient();

    // Check authentication from SecurityContext
    if (!context.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const identityId = context.userId;

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const data = `data: ${JSON.stringify({
          type: 'connected',
          message: 'Real-time notifications connected',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Set up heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            const heartbeatData = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeatData));
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeat);
            controller.close();
          }
        }, 30000); // 30 seconds

        // Set up notification polling (in a real implementation, you'd use WebSocket or database triggers)
        const pollInterval = setInterval(async () => {
          try {
            // Get recent notifications for user
            const { data: notifications, error } = await rds
              .from('notifications')
              .select('*')
              .eq('user_id', identityId)
              .eq('is_read', false)
              .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Error fetching notifications:', error);
              return;
            }

            // Send notifications to client
            if (notifications && notifications.length > 0) {
              notifications.forEach((notification: any) => {
                const notificationData = `data: ${JSON.stringify({
                  type: 'notification',
                  data: notification
                })}\n\n`;
                controller.enqueue(encoder.encode(notificationData));
              });
            }
          } catch (error) {
            console.error('Polling error:', error);
            clearInterval(pollInterval);
            clearInterval(heartbeat);
            controller.close();
          }
        }, 5000); // Poll every 5 seconds

        // Cleanup on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          clearInterval(pollInterval);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  } catch (error) {
    console.error('Error in realtime notifications:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export const GET = withPublicSecurity(getHandler as any);