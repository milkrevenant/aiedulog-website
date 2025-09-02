/**
 * Admin Dashboard API
 * Provides comprehensive dashboard data and system health information
 */

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
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/services';

const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    const adminService = new AdminService();
    
    // Check admin authentication
    const authCheck = await checkAdminAuth(supabase, context);
    if (!authCheck.success) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    // Check permissions
    const hasPermission = await adminService.permissions.userHasPermission(
      authCheck.adminId,
      'system.monitor'
    );

    if (!hasPermission.data?.has_permission) {
      return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        return await handleDashboardStats(adminService, context);
      
      case 'health':
        return await handleSystemHealth(adminService, context);
      
      case 'alerts':
        const limit = parseInt(searchParams.get('limit') || '10');
        return await handleSecurityAlerts(adminService, limit, context);
      
      case 'activity_trends':
        const days = parseInt(searchParams.get('days') || '30');
        return await handleActivityTrends(adminService, days, supabase, context);
      
      case 'system_metrics':
        const metricDays = parseInt(searchParams.get('days') || '7');
        return await handleSystemMetrics(adminService, metricDays, supabase, context);
      
      default:
        return createErrorResponse(ErrorType.BAD_REQUEST, context);
    }
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const supabase = await createClient();
    const adminService = new AdminService();
    
    // Check admin authentication
    const authCheck = await checkAdminAuth(supabase, context);
    if (!authCheck.success) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    const { action, ...data } = await request.json();

    switch (action) {
      case 'maintenance':
        return await handleSystemMaintenance(authCheck.adminId, adminService, context);
      
      case 'initialize':
        return await handleServiceInitialization(adminService, context);
      
      case 'refresh_stats':
        return await handleStatsRefresh(adminService, context);
      
      default:
        return createErrorResponse(ErrorType.BAD_REQUEST, context);
    }
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function checkAdminAuth(supabase: any, context: SecurityContext) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: adminProfile } = await supabase
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', user.user.id)
    .single();

  if (!adminProfile) {
    return { success: false, error: 'Admin profile not found' };
  }

  return { success: true, adminId: adminProfile.identity_id };
}

async function handleDashboardStats(adminService: AdminService, context: SecurityContext) {
  try {
    const result = await adminService.getDashboardStats();
    
    // Add additional computed metrics
    if (result.success && result.data) {
      const stats = result.data;
      
      // Calculate growth rates
      const userGrowthRate = stats.user_stats.total_users > 0 
        ? (stats.user_stats.new_users_this_week / stats.user_stats.total_users) * 100 
        : 0;
      
      // Calculate user engagement rate
      const engagementRate = stats.user_stats.total_users > 0 
        ? (stats.user_stats.active_users / stats.user_stats.total_users) * 100 
        : 0;
      
      // Add computed metrics
      (result.data as any).computed_metrics = {
        user_growth_rate_percent: Math.round(userGrowthRate * 100) / 100,
        user_engagement_rate_percent: Math.round(engagementRate * 100) / 100,
        content_approval_rate_percent: stats.content_stats.total_content > 0 
          ? Math.round((stats.content_stats.approved_today / stats.content_stats.total_content) * 10000) / 100
          : 0,
        system_health_status: stats.system_stats.system_health_score >= 95 ? 'excellent' :
                            stats.system_stats.system_health_score >= 85 ? 'good' :
                            stats.system_stats.system_health_score >= 70 ? 'fair' : 'poor'
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleSystemHealth(adminService: AdminService, context: SecurityContext) {
  try {
    const result = await adminService.getSystemHealth();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get system health:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleSecurityAlerts(adminService: AdminService, limit: number, context: SecurityContext) {
  try {
    const result = await adminService.getSecurityAlerts(limit);
    
    // Add alert prioritization
    if (result.success && result.data) {
      (result as any).data = result.data.map(alert => ({
        ...alert,
        priority: calculateAlertPriority(alert),
        age_hours: Math.floor(
          (new Date().getTime() - new Date(alert.created_at).getTime()) / (1000 * 60 * 60)
        )
      }));
      
      // Sort by priority and age
      result.data.sort((a: any, b: any) => {
        if (a.priority !== b.priority) {
          return getPriorityValue(b.priority) - getPriorityValue(a.priority);
        }
        return a.age_hours - b.age_hours; // Newer alerts first for same priority
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get security alerts:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

function calculateAlertPriority(alert: any): 'critical' | 'high' | 'medium' | 'low' {
  if (alert.severity === 'critical') return 'critical';
  if (alert.severity === 'error') return 'high';
  if (alert.type === 'failed_login_attempts' && alert.metadata?.attempt_count > 10) return 'high';
  if (alert.severity === 'warning') return 'medium';
  return 'low';
}

function getPriorityValue(priority: string): number {
  const values = { critical: 4, high: 3, medium: 2, low: 1 };
  return values[priority as keyof typeof values] || 0;
}

async function handleActivityTrends(adminService: AdminService, days: number, supabase: any, context: SecurityContext) {
  try {
    // Get activity data for the specified period
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get user activity trends
    const { data: userActivities } = await supabase
      .from('user_activities')
      .select('created_at, activity_type')
      .gte('created_at', fromDate.toISOString());
    
    // Get audit events
    const { data: auditEvents } = await supabase
      .from('audit_logs')
      .select('created_at, event_type, severity')
      .gte('created_at', fromDate.toISOString());
    
    // Process data into daily buckets
    const dailyData: Record<string, any> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      dailyData[dateKey] = {
        date: dateKey,
        user_activities: 0,
        audit_events: 0,
        security_events: 0
      };
    }
    
    // Count user activities
    (userActivities || []).forEach((activity: any) => {
      const dateKey = activity.created_at.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].user_activities++;
      }
    });
    
    // Count audit events
    (auditEvents || []).forEach((event: any) => {
      const dateKey = event.created_at.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].audit_events++;
        if (event.severity === 'error' || event.severity === 'critical') {
          dailyData[dateKey].security_events++;
        }
      }
    });
    
    const trends = Object.values(dailyData).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );
    
    return NextResponse.json({
      success: true,
      data: {
        period_days: days,
        trends: trends
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get activity trends:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleSystemMetrics(adminService: AdminService, days: number, supabase: any, context: SecurityContext) {
  try {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data: metrics } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('collected_at', fromDate.toISOString())
      .order('collected_at', { ascending: true });
    
    // Group metrics by type and name
    const groupedMetrics: Record<string, any[]> = {};
    
    (metrics || []).forEach((metric: any) => {
      const key = `${metric.metric_type}_${metric.metric_name}`;
      if (!groupedMetrics[key]) {
        groupedMetrics[key] = [];
      }
      groupedMetrics[key].push(metric);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        period_days: days,
        metrics: groupedMetrics,
        summary: {
          total_metrics: metrics?.length || 0,
          metric_types: Object.keys(groupedMetrics).length,
          latest_collection: metrics?.[metrics.length - 1]?.collected_at
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleSystemMaintenance(adminId: string, adminService: AdminService, context: SecurityContext) {
  try {
    // Check maintenance permissions
    const hasPermission = await adminService.permissions.userHasPermission(
      adminId,
      'system.maintenance'
    );

    if (!hasPermission.data?.has_permission) {
      return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
    }

    const result = await adminService.performMaintenance();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to perform system maintenance:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleServiceInitialization(adminService: AdminService, context: SecurityContext) {
  try {
    const result = await adminService.initialize();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to initialize admin service:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleStatsRefresh(adminService: AdminService, context: SecurityContext) {
  try {
    // Force refresh of cached statistics
    const result = await adminService.getDashboardStats();
    
    if (result.success) {
      // Log stats refresh
      await adminService.audit.createAuditLog({
        event_type: 'admin_action',
        event_category: 'system_administration',
        actor_type: 'admin',
        action: 'refresh_dashboard_stats',
        description: 'Dashboard statistics refreshed manually'
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to refresh stats:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);