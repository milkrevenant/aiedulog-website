import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/analytics
 * Get notification analytics and metrics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: identity } = await supabase
      .from('identities')
      .select('id, role')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!identity || !['admin', 'super_admin'].includes(identity.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const category = searchParams.get('category') as any;
    const channel = searchParams.get('channel') as any;

    // Get analytics data
    const analytics = await getNotificationService().getNotificationAnalytics(
      startDate,
      endDate,
      category,
      channel
    );

    // Get summary statistics
    const { data: summaryStats, error: summaryError } = await supabase
      .from('notification_analytics')
      .select(`
        category,
        channel,
        SUM(total_sent) as total_sent,
        SUM(total_delivered) as total_delivered,
        SUM(total_opened) as total_opened,
        SUM(total_clicked) as total_clicked,
        SUM(total_failed) as total_failed,
        AVG(delivery_rate) as avg_delivery_rate,
        AVG(open_rate) as avg_open_rate,
        AVG(click_rate) as avg_click_rate
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      // // .group(['category', 'channel']); // PostgreSQL group by not available in this context

    // Get recent notification counts
    const { data: recentCounts, error: recentError } = await supabase
      .from('notifications')
      .select(`
        category,
        priority,
        COUNT(*) as count
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      // // .group(['category', 'priority']); // PostgreSQL group by not available

    // Get delivery status distribution
    const { data: deliveryStatus, error: deliveryError } = await supabase
      .from('notification_deliveries')
      .select(`
        status,
        channel,
        COUNT(*) as count
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      // .group(['status', 'channel']);

    // Get template performance
    const { data: templateStats, error: templateError } = await supabase
      .from('notification_analytics')
      .select(`
        template_key,
        SUM(total_sent) as total_sent,
        SUM(total_delivered) as total_delivered,
        SUM(total_opened) as total_opened,
        SUM(total_clicked) as total_clicked,
        AVG(delivery_rate) as delivery_rate,
        AVG(open_rate) as open_rate,
        AVG(click_rate) as click_rate
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('template_key', 'is', null)
      // .group(['template_key'])
      .order('total_sent', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        timeSeriesData: analytics,
        summaryStats: summaryStats || [],
        recentCounts: recentCounts || [],
        deliveryStatus: deliveryStatus || [],
        templatePerformance: templateStats || [],
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error in notification analytics GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}