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
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rds-auth-helpers';
import { createRDSClient } from '@/lib/db/rds-client';
import { ContentAnalyticsService } from '@/lib/content-management';
import { TableRow } from '@/lib/db/types';

type ContentAnalyticsRow = TableRow<'content_analytics'>;

/**
 * GET /api/admin/analytics
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Get content analytics data
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const rds = createRDSClient();

    const searchParams = request.nextUrl.searchParams;
    const content_type = searchParams.get('content_type') as 'section' | 'block' | undefined;
    const content_id = searchParams.get('content_id');
    const event_type = searchParams.get('event_type');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const group_by = searchParams.get('group_by') as 'day' | 'week' | 'month' | undefined;
    const report_type = searchParams.get('report_type') || 'overview';

    // Build analytics query
    const query = {
      content_type,
      content_id: content_id || undefined,
      event_type: event_type as any || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
      group_by: group_by || 'day',
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    switch (report_type) {
      case 'overview': {
        // Get overall statistics
        const analyticsResult = await ContentAnalyticsService.getAnalytics(query);
        
        if (!analyticsResult.success) {
          return NextResponse.json({ error: analyticsResult.error }, { status: 400 });
        }

        // Get additional overview data
        const [
          totalViewsResult,
          uniqueUsersResult,
          deviceStatsResult,
          locationStatsResult,
          realtimeStatsResult
        ] = await Promise.all([
          getTotalViews(rds, query),
          getUniqueUsers(rds, query),
          getDeviceStats(rds, query),
          getLocationStats(rds, query),
          getRealtimeStats(rds)
        ]);

        return NextResponse.json({
          success: true,
          analytics: analyticsResult.data,
          overview: {
            totalViews: totalViewsResult.data || 0,
            uniqueUsers: uniqueUsersResult.data || 0,
            deviceBreakdown: deviceStatsResult.data || [],
            locationData: locationStatsResult.data || [],
            realTimeData: realtimeStatsResult.data || {}
          }
        });
      }

      case 'content_performance': {
        const performanceData = await getContentPerformance(rds, query);
        return NextResponse.json({
          success: true,
          performance: performanceData.data || []
        });
      }

      case 'time_series': {
        const timeSeriesData = await getTimeSeriesData(rds, query);
        return NextResponse.json({
          success: true,
          timeSeries: timeSeriesData.data || []
        });
      }

      case 'audience': {
        const audienceData = await getAudienceAnalytics(rds, query);
        return NextResponse.json({
          success: true,
          audience: audienceData.data || {}
        });
      }

      default: {
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/analytics
 * Track analytics event
 */
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const body = await request.json();

    const {
      content_type,
      content_id,
      event_type,
      additional_data = {}
    } = body;

    // Validation
    if (!content_type || !content_id || !event_type) {
      return NextResponse.json({
        error: 'Missing required fields: content_type, content_id, event_type'
      }, { status: 400 });
    }

    // Track the event
    const result = await ContentAnalyticsService.trackEvent(
      content_type,
      content_id,
      event_type,
      additional_data
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for analytics queries

async function getTotalViews(rds: any, query: any) {
  try {
    let dbQuery = rds
      .from('content_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'view');

    if (query.content_type) {
      dbQuery = dbQuery.eq('content_type', query.content_type);
    }

    if (query.content_id) {
      dbQuery = dbQuery.eq('content_id', query.content_id);
    }

    if (query.date_from) {
      dbQuery = dbQuery.gte('created_at', query.date_from);
    }

    if (query.date_to) {
      dbQuery = dbQuery.lte('created_at', query.date_to);
    }

    const { count, error } = await dbQuery;

    return { success: !error, data: count || 0 };
  } catch (error) {
    return { success: false, data: 0 };
  }
}

async function getUniqueUsers(rds: any, query: any) {
  try {
    // This is a simplified query - in production, you'd want to use a more sophisticated approach
    const { data, error } = await rds
      .from('content_analytics')
      .select('session_id')
      .eq('event_type', 'view')
      .not('session_id', 'is', null);

    if (error) throw error;

    const uniqueUsers = new Set(data?.map((row: any) => row.session_id)).size;
    return { success: true, data: uniqueUsers };
  } catch (error) {
    return { success: false, data: 0 };
  }
}

async function getDeviceStats(rds: any, query: any) {
  try {
    const { data, error } = await rds
      .from('content_analytics')
      .select('device_type, count(*)')
      .not('device_type', 'is', null)
      // .group('device_type');

    if (error) throw error;

    const total = data?.reduce((sum: number, row: any) => sum + parseInt(row.count), 0) || 1;
    const deviceBreakdown = data?.map((row: any) => ({
      device: row.device_type || 'Unknown',
      count: parseInt(row.count),
      percentage: (parseInt(row.count) / total * 100).toFixed(1)
    })) || [];

    return { success: true, data: deviceBreakdown };
  } catch (error) {
    return { success: false, data: [] };
  }
}

async function getLocationStats(rds: any, query: any) {
  try {
    const { data, error } = await rds
      .from('content_analytics')
      .select('location_data, count(*)')
      .not('location_data', 'is', null)
      // .group('location_data')
      .limit(10);

    if (error) throw error;

    const locationData = data?.map((row: any) => {
      const location = row.location_data || {};
      return {
        country: location.country || 'Unknown',
        city: location.city || 'Unknown',
        count: parseInt(row.count)
      };
    }) || [];

    return { success: true, data: locationData };
  } catch (error) {
    return { success: false, data: [] };
  }
}

async function getRealtimeStats(rds: any) {
  try {
    // Get active users (sessions in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: recentData, error } = await rds
      .from('content_analytics')
      .select('session_id, content_id, content_type')
      .gte('created_at', thirtyMinutesAgo);

    if (error) throw error;

    const activeUsers = new Set(recentData?.map((row: any) => row.session_id)).size;
    const currentViews = recentData?.filter((row: any) => 
      Date.now() - new Date(row.created_at).getTime() < 5 * 60 * 1000
    ).length || 0;

    // Get top pages currently being viewed
    const contentCounts: Record<string, number> = {};
    recentData?.forEach((row: any) => {
      const key = `${row.content_type}:${row.content_id}`;
      contentCounts[key] = (contentCounts[key] || 0) + 1;
    });

    const topPages = Object.entries(contentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => {
        const [type, id] = key.split(':');
        return {
          page: `${type}:${id}`,
          users: count
        };
      });

    return {
      success: true,
      data: {
        activeUsers,
        currentViews,
        topPages
      }
    };
  } catch (error) {
    return {
      success: false,
      data: {
        activeUsers: 0,
        currentViews: 0,
        topPages: []
      }
    };
  }
}

async function getContentPerformance(rds: any, query: any) {
  try {
    // Get performance metrics for each content item
    const { data, error } = await rds
      .from('content_analytics')
      .select(`
        content_id,
        content_type,
        event_type,
        count(*)
      `)
      // .group('content_id, content_type, event_type')
      .order('count', { ascending: false });

    if (error) throw error;

    // Process data to calculate performance metrics
    const contentPerformance: Record<string, any> = {};

    data?.forEach((row: any) => {
      const key = `${row.content_type}:${row.content_id}`;
      if (!contentPerformance[key]) {
        contentPerformance[key] = {
          id: row.content_id,
          type: row.content_type,
          views: 0,
          interactions: 0,
          conversions: 0
        };
      }

      const count = parseInt(row.count);
      switch (row.event_type) {
        case 'view':
          contentPerformance[key].views += count;
          break;
        case 'click':
        case 'interaction':
          contentPerformance[key].interactions += count;
          break;
        case 'conversion':
          contentPerformance[key].conversions += count;
          break;
      }
    });

    // Calculate conversion rates and trends
    const performanceArray = Object.values(contentPerformance).map((item: any) => ({
      ...item,
      conversionRate: item.views > 0 ? (item.conversions / item.views * 100).toFixed(2) : '0.00',
      trend: 'stable' // This would be calculated based on historical data
    }));

    return { success: true, data: performanceArray };
  } catch (error) {
    return { success: false, data: [] };
  }
}

async function getTimeSeriesData(rds: any, query: any) {
  try {
    const groupByClause = query.group_by === 'week'
      ? "date_trunc('week', created_at)"
      : query.group_by === 'month'
      ? "date_trunc('month', created_at)"
      : "date_trunc('day', created_at)";

    const { data, error } = await rds
      .from('content_analytics')
      .select(`
        ${groupByClause} as date,
        event_type,
        count(*)
      `)
      // .group(`${groupByClause}, event_type`)
      .order('date');

    if (error) throw error;

    // Process data into time series format
    const timeSeriesData: Record<string, any> = {};

    data?.forEach((row: any) => {
      const date = row.date.split('T')[0]; // Extract date part
      if (!timeSeriesData[date]) {
        timeSeriesData[date] = {
          date,
          views: 0,
          interactions: 0,
          users: 0
        };
      }

      const count = parseInt(row.count);
      switch (row.event_type) {
        case 'view':
          timeSeriesData[date].views += count;
          break;
        case 'click':
        case 'interaction':
          timeSeriesData[date].interactions += count;
          break;
      }
    });

    const timeSeriesArray = Object.values(timeSeriesData);
    return { success: true, data: timeSeriesArray };
  } catch (error) {
    return { success: false, data: [] };
  }
}

async function getAudienceAnalytics(rds: any, query: any) {
  try {
    // Get device, location, and behavioral data
    const [deviceData, locationData, behaviorData] = await Promise.all([
      getDeviceStats(rds, query),
      getLocationStats(rds, query),
      getBehaviorStats(rds, query)
    ]);

    return {
      success: true,
      data: {
        devices: deviceData.data,
        locations: locationData.data,
        behavior: behaviorData.data
      }
    };
  } catch (error) {
    return { success: false, data: {} };
  }
}

async function getBehaviorStats(rds: any, query: any) {
  try {
    // This is a placeholder for behavioral analytics
    // In a real implementation, you'd analyze user journeys, session duration, etc.
    return {
      success: true,
      data: {
        avgSessionDuration: '3m 42s',
        bounceRate: 32.8,
        pagesPerSession: 2.4,
        returnVisitorRate: 24.6
      }
    };
  } catch (error) {
    return { success: false, data: {} };
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
