/**
 * Enterprise Audit Service
 * Comprehensive audit logging and monitoring system
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  AuditLog, 
  CreateAuditLogRequest, 
  AuditLogFilters,
  PaginatedResponse,
  ApiResponse
} from '../types';

export class AuditService {
  private supabase = createClient();
  
  /**
   * Create a comprehensive audit log entry
   */
  async createAuditLog(request: CreateAuditLogRequest): Promise<ApiResponse<AuditLog>> {
    try {
      const { data, error } = await this.supabase.rpc('create_audit_log', {
        p_event_type: request.event_type,
        p_event_category: request.event_category,
        p_actor_type: request.actor_type,
        p_action: request.action,
        p_description: request.description,
        p_target_type: request.target_type,
        p_target_id: request.target_id,
        p_resource_type: request.resource_type,
        p_resource_id: request.resource_id,
        p_metadata: request.metadata || {},
        p_severity: request.severity || 'info',
        p_before_state: request.before_state,
        p_after_state: request.after_state
      });

      if (error) throw error;

      return {
        success: true,
        data: { id: data } as AuditLog,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get paginated audit logs with advanced filtering
   */
  async getAuditLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<AuditLog>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.event_type?.length) {
        query = query.in('event_type', filters.event_type);
      }
      if (filters.event_category?.length) {
        query = query.in('event_category', filters.event_category);
      }
      if (filters.actor_id) {
        query = query.eq('actor_id', filters.actor_id);
      }
      if (filters.target_type) {
        query = query.eq('target_type', filters.target_type);
      }
      if (filters.target_id) {
        query = query.eq('target_id', filters.target_id);
      }
      if (filters.severity?.length) {
        query = query.in('severity', filters.severity);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.success !== undefined) {
        query = query.eq('success', filters.success);
      }
      if (filters.search_query) {
        query = query.or(`description.ilike.%${filters.search_query}%,action.ilike.%${filters.search_query}%`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total,
          total_pages,
          has_next: page < total_pages,
          has_prev: page > 1
        }
      };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    }
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<ApiResponse<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get resource audit trail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get security events (high severity audit logs)
   */
  async getSecurityEvents(limit: number = 50): Promise<ApiResponse<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .in('severity', ['error', 'critical'])
        .or('event_type.eq.security_incident,event_type.eq.policy_violation,event_type.eq.login_failed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get security events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get GDPR relevant audit logs for a user
   */
  async getGdprAuditLogs(userId: string): Promise<ApiResponse<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('gdpr_subject_id', userId)
        .eq('is_gdpr_relevant', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get GDPR audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(days: number = 30): Promise<ApiResponse<any>> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      // Get total events
      const { count: totalEvents } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', fromDate.toISOString());

      // Get events by severity
      const { data: severityStats } = await this.supabase
        .from('audit_logs')
        .select('severity')
        .gte('created_at', fromDate.toISOString());

      // Get events by category
      const { data: categoryStats } = await this.supabase
        .from('audit_logs')
        .select('event_category')
        .gte('created_at', fromDate.toISOString());

      // Get failed events
      const { count: failedEvents } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('success', false)
        .gte('created_at', fromDate.toISOString());

      // Process severity stats
      const severityCounts = (severityStats || []).reduce((acc: any, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      }, {});

      // Process category stats
      const categoryCounts = (categoryStats || []).reduce((acc: any, log) => {
        acc[log.event_category] = (acc[log.event_category] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          total_events: totalEvents || 0,
          failed_events: failedEvents || 0,
          success_rate: totalEvents ? ((totalEvents - (failedEvents || 0)) / totalEvents * 100) : 100,
          severity_breakdown: severityCounts,
          category_breakdown: categoryCounts,
          period_days: days
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    filters: AuditLogFilters = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<ApiResponse<any>> {
    try {
      // Get all matching logs (no pagination for export)
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply same filters as getAuditLogs
      if (filters.event_type?.length) {
        query = query.in('event_type', filters.event_type);
      }
      if (filters.event_category?.length) {
        query = query.in('event_category', filters.event_category);
      }
      // ... apply other filters ...

      const { data, error } = await query;

      if (error) throw error;

      // Log the export action
      await this.createAuditLog({
        event_type: 'data_export',
        event_category: 'compliance',
        actor_type: 'admin',
        action: 'export_audit_logs',
        description: `Audit logs exported in ${format} format`,
        metadata: {
          export_format: format,
          record_count: data?.length || 0,
          filters: filters
        }
      });

      return {
        success: true,
        data: {
          records: data || [],
          format,
          export_timestamp: new Date().toISOString(),
          record_count: data?.length || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up old audit logs (called by system maintenance)
   */
  async cleanupOldAuditLogs(): Promise<ApiResponse<{ deleted_count: number }>> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_data');

      if (error) throw error;

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}