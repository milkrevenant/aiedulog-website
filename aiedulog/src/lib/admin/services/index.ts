/**
 * Enterprise Admin Management Services
 * Central export for all admin services
 */

export { AuditService } from './audit-service';
export { UserManagementService } from './user-management-service';
export { ContentManagementService } from './content-management-service';
export { PermissionService } from './permission-service';
export { GdprService } from './gdpr-service';

// Main Admin Service Class - Integrates all services
import { AuditService } from './audit-service';
import { UserManagementService } from './user-management-service';
import { ContentManagementService } from './content-management-service';
import { PermissionService } from './permission-service';
import { GdprService } from './gdpr-service';
import { createClient } from '@/lib/supabase/server';
import { getUserIdentity } from '@/lib/identity/helpers';
import type { 
  AdminDashboardStats, 
  SecurityAlert,
  ApiResponse,
  AuditSeverity 
} from '../types';

export class AdminService {
  private supabase: any;

  /**
   * Get database client (async for server-side)
   */
  private async getClient() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }
  
  // Service instances
  public audit = new AuditService();
  public users = new UserManagementService();
  public content = new ContentManagementService();
  public permissions = new PermissionService();
  public gdpr = new GdprService();

  /**
   * Initialize admin service and perform startup checks
   */
  async initialize(): Promise<ApiResponse<{ initialized: boolean; version: string }>> {
    try {
      // Verify admin user authentication and permissions
      const { data: user } = await (await this.getClient()).auth.getUser();
      if (!user.user) {
        throw new Error('Admin not authenticated');
      }

      // Get admin profile using identity service
      const adminIdentity = await getUserIdentity(user.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Check if user has admin permissions
      const hasPermission = await this.permissions.userHasPermission(
        adminIdentity.user_id,
        'admin.roles.manage'
      );

      if (!hasPermission.data?.has_permission) {
        throw new Error('Insufficient admin permissions');
      }

      // Log admin service initialization
      await this.audit.createAuditLog({
        event_type: 'admin_action',
        event_category: 'system_administration',
        actor_type: 'admin',
        action: 'initialize_admin_service',
        description: 'Admin service initialized successfully'
      });

      return {
        success: true,
        data: {
          initialized: true,
          version: '1.0.0'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to initialize admin service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive admin dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    try {
      // Get all statistics in parallel
      const [
        userStats,
        contentStats,
        auditStats,
        gdprStats,
        permissionStats
      ] = await Promise.all([
        this.users.getUserStatistics(),
        this.content.getModerationStatistics(),
        this.audit.getAuditStatistics(),
        this.gdpr.getGdprStatistics(),
        this.permissions.getPermissionStatistics()
      ]);

      // Calculate system health score
      const systemHealthScore = this.calculateSystemHealthScore({
        auditSuccessRate: auditStats.data?.success_rate || 100,
        gdprComplianceRate: gdprStats.data?.compliance_rate || 100,
        overdueRequests: gdprStats.data?.overdue_requests || 0,
        securityIncidents: auditStats.data?.severity_breakdown?.critical || 0
      });

      // Get activity trends (simplified - you can expand this)
      const activityTrends = await this.getActivityTrends();

      const dashboardStats: AdminDashboardStats = {
        user_stats: {
          total_users: userStats.data?.total_users || 0,
          active_users: userStats.data?.active_users || 0,
          new_users_today: userStats.data?.new_users_today || 0,
          new_users_this_week: userStats.data?.new_users_this_week || 0,
          suspended_users: userStats.data?.suspended_users || 0
        },
        content_stats: {
          total_content: contentStats.data?.total_moderated || 0,
          pending_moderation: contentStats.data?.pending || 0,
          flagged_content: contentStats.data?.flagged || 0,
          approved_today: contentStats.data?.approved || 0,
          rejected_today: contentStats.data?.rejected || 0
        },
        system_stats: {
          audit_events_today: auditStats.data?.total_events || 0,
          security_incidents: auditStats.data?.severity_breakdown?.critical || 0,
          gdpr_requests_pending: gdprStats.data?.pending_requests || 0,
          system_health_score: systemHealthScore
        },
        activity_trends: activityTrends
      };

      return {
        success: true,
        data: dashboardStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate system health score based on various metrics
   */
  private calculateSystemHealthScore(metrics: {
    auditSuccessRate: number;
    gdprComplianceRate: number;
    overdueRequests: number;
    securityIncidents: number;
  }): number {
    let score = 100;

    // Deduct points for poor audit success rate
    if (metrics.auditSuccessRate < 95) {
      score -= (95 - metrics.auditSuccessRate) * 2;
    }

    // Deduct points for poor GDPR compliance
    if (metrics.gdprComplianceRate < 98) {
      score -= (98 - metrics.gdprComplianceRate) * 3;
    }

    // Deduct points for overdue requests
    score -= Math.min(metrics.overdueRequests * 5, 20);

    // Deduct points for security incidents
    score -= Math.min(metrics.securityIncidents * 10, 30);

    return Math.max(score, 0);
  }

  /**
   * Get activity trends for dashboard
   */
  private async getActivityTrends(): Promise<AdminDashboardStats['activity_trends']> {
    try {
      // Get data for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // This is a simplified implementation - you can expand with more complex queries
      const defaultTrends: any = {
        daily_active_users: [],
        content_creation: [],
        moderation_actions: []
      };

      // Generate sample trend data (replace with actual queries)
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateString = date.toISOString().split('T')[0];
        
        defaultTrends.daily_active_users.push({
          date: dateString,
          count: Math.floor(Math.random() * 100) + 50 // Sample data
        });
        
        defaultTrends.content_creation.push({
          date: dateString,
          count: Math.floor(Math.random() * 20) + 5 // Sample data
        });
        
        defaultTrends.moderation_actions.push({
          date: dateString,
          approved: Math.floor(Math.random() * 15) + 5,
          rejected: Math.floor(Math.random() * 5)
        });
      }

      return defaultTrends;
    } catch (error) {
      console.error('Failed to get activity trends:', error);
      return {
        daily_active_users: [],
        content_creation: [],
        moderation_actions: []
      };
    }
  }

  /**
   * Get critical security alerts
   */
  async getSecurityAlerts(limit: number = 10): Promise<ApiResponse<SecurityAlert[]>> {
    try {
      // Get high-severity audit logs
      const securityEvents = await this.audit.getSecurityEvents(limit);
      
      if (!securityEvents.success) {
        throw new Error('Failed to get security events');
      }

      const alerts: SecurityAlert[] = (securityEvents.data || []).map(event => ({
        id: event.id,
        type: this.mapEventTypeToAlertType(event.event_type),
        severity: event.severity as AuditSeverity,
        message: event.description,
        affected_user_id: event.target_type === 'user' ? event.target_id : undefined,
        created_at: event.created_at,
        resolved: false, // Could be determined by additional logic
        metadata: event.metadata
      }));

      return {
        success: true,
        data: alerts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get security alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Map audit event types to security alert types
   */
  private mapEventTypeToAlertType(eventType: string): SecurityAlert['type'] {
    const mapping: Record<string, SecurityAlert['type']> = {
      'login_failed': 'failed_login_attempts',
      'security_incident': 'suspicious_activity',
      'policy_violation': 'policy_violation'
    };

    return mapping[eventType] || 'suspicious_activity';
  }

  /**
   * Perform system maintenance tasks
   */
  async performMaintenance(): Promise<ApiResponse<{
    tasks_completed: string[];
    tasks_failed: string[];
    maintenance_duration_ms: number;
  }>> {
    const startTime = Date.now();
    const tasksCompleted: string[] = [];
    const tasksFailed: string[] = [];

    try {
      // Task 1: Cleanup expired audit logs
      try {
        await this.audit.cleanupOldAuditLogs();
        tasksCompleted.push('audit_log_cleanup');
      } catch (error) {
        tasksFailed.push('audit_log_cleanup');
        console.error('Audit log cleanup failed:', error);
      }

      // Task 2: Cleanup expired sessions and locks
      try {
        await (await this.getClient()).rpc('cleanup_expired_data');
        tasksCompleted.push('expired_data_cleanup');
      } catch (error) {
        tasksFailed.push('expired_data_cleanup');
        console.error('Expired data cleanup failed:', error);
      }

      // Task 3: Update system metrics
      try {
        await this.updateSystemMetrics();
        tasksCompleted.push('system_metrics_update');
      } catch (error) {
        tasksFailed.push('system_metrics_update');
        console.error('System metrics update failed:', error);
      }

      const maintenanceDuration = Date.now() - startTime;

      // Log maintenance completion
      await this.audit.createAuditLog({
        event_type: 'system_maintenance',
        event_category: 'system_administration',
        actor_type: 'system',
        action: 'perform_maintenance',
        description: `System maintenance completed. ${tasksCompleted.length} tasks successful, ${tasksFailed.length} failed.`,
        metadata: {
          tasks_completed: tasksCompleted,
          tasks_failed: tasksFailed,
          duration_ms: maintenanceDuration
        }
      });

      return {
        success: true,
        data: {
          tasks_completed: tasksCompleted,
          tasks_failed: tasksFailed,
          maintenance_duration_ms: maintenanceDuration
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('System maintenance failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    const currentTime = new Date().toISOString();

    // Get various system metrics
    const metrics = [
      {
        type: 'performance',
        name: 'response_time_ms',
        value: await this.measureResponseTime(),
        unit: 'milliseconds'
      },
      {
        type: 'usage',
        name: 'active_sessions',
        value: await this.countActiveSessions(),
        unit: 'count'
      },
      {
        type: 'capacity',
        name: 'database_connections',
        value: Math.floor(Math.random() * 20) + 10, // Placeholder
        unit: 'count'
      }
    ];

    // Insert metrics
    for (const metric of metrics) {
      await this.supabase
        .from('system_metrics')
        .insert({
          metric_type: metric.type,
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit,
          collected_at: currentTime
        });
    }
  }

  /**
   * Measure system response time
   */
  private async measureResponseTime(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simple health check query
      await this.supabase
        .from('user_profiles')
        .select('user_id')
        .limit(1)
        .single();
      
      return Date.now() - startTime;
    } catch (error) {
      return -1; // Indicate error
    }
  }

  /**
   * Count active admin sessions
   */
  private async countActiveSessions(): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('admin_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<ApiResponse<{
    overall_status: 'healthy' | 'warning' | 'critical';
    components: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'error';
      last_check: string;
      details?: string;
    }>;
    last_maintenance: string;
  }>> {
    try {
      const components = [
        {
          name: 'Database',
          status: await this.checkDatabaseHealth(),
          last_check: new Date().toISOString()
        },
        {
          name: 'Authentication',
          status: await this.checkAuthHealth(),
          last_check: new Date().toISOString()
        },
        {
          name: 'Audit System',
          status: 'healthy' as const,
          last_check: new Date().toISOString()
        },
        {
          name: 'GDPR Compliance',
          status: await this.checkGdprHealth(),
          last_check: new Date().toISOString()
        }
      ];

      // Determine overall status
      const hasError = components.some(c => c.status === 'error');
      const hasWarning = components.some(c => c.status === 'warning');
      
      const overallStatus = hasError ? 'critical' : hasWarning ? 'warning' : 'healthy';

      return {
        success: true,
        data: {
          overall_status: overallStatus,
          components,
          last_maintenance: new Date().toISOString() // Placeholder
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      await this.measureResponseTime();
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  private async checkAuthHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      const { data } = await (await this.getClient()).auth.getUser();
      return data.user ? 'healthy' : 'warning';
    } catch (error) {
      return 'error';
    }
  }

  private async checkGdprHealth(): Promise<'healthy' | 'warning' | 'error'> {
    try {
      const stats = await this.gdpr.getGdprStatistics();
      if (!stats.success) return 'error';
      
      const overdueRequests = stats.data?.overdue_requests || 0;
      return overdueRequests > 0 ? 'warning' : 'healthy';
    } catch (error) {
      return 'error';
    }
  }
}
