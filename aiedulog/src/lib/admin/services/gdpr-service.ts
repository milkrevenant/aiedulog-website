/**
 * GDPR Compliance Service
 * Handles data protection, privacy rights, and regulatory compliance
 */

import { createClient } from '@/lib/supabase/server';
import { AuditService } from './audit-service';
import { getUserIdentity } from '@/lib/identity/helpers';
import type {
  UserDataRequest,
  DataRequestType,
  DataRequestStatus,
  ApiResponse,
  PaginatedResponse
} from '../types';

export class GdprService {
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
  private auditService = new AuditService();

  /**
   * Create a GDPR data request
   */
  async createDataRequest(
    userId: string,
    requestType: DataRequestType,
    notes?: string
  ): Promise<ApiResponse<UserDataRequest>> {
    try {
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const requestId = await (await this.getClient()).rpc('process_gdpr_request', {
        p_user_id: userId,
        p_request_type: requestType,
        p_requested_by: adminIdentity.user_id
      });

      if (!requestId.data) {
        throw new Error('Failed to create GDPR request');
      }

      // Update notes if provided
      if (notes) {
        await this.supabase
          .from('user_data_requests')
          .update({ notes })
          .eq('id', requestId.data);
      }

      // Get the created request
      const { data: request, error } = await this.supabase
        .from('user_data_requests')
        .select('*')
        .eq('id', requestId.data)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: request,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create GDPR request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get GDPR data requests with filtering
   */
  async getDataRequests(
    filters: {
      user_id?: string;
      request_type?: DataRequestType;
      status?: DataRequestStatus;
      overdue_only?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<UserDataRequest & { user_email?: string; days_remaining?: number }>> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;

      let query = this.supabase
        .from('user_data_requests')
        .select(`
          *,
          user_profiles!user_data_requests_user_id_fkey (
            email
          )
        `, { count: 'exact' })
        .order('requested_at', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.request_type) {
        query = query.eq('request_type', filters.request_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.overdue_only) {
        query = query.lt('completion_deadline', new Date().toISOString())
                   .neq('status', 'completed')
                   .neq('status', 'cancelled');
      }

      // Apply pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      // Enrich with calculated fields
      const enrichedData = (data || []).map((request: any) => {
        const deadline = new Date(request.completion_deadline);
        const now = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...request,
          user_email: request.user_profiles?.email,
          days_remaining: daysRemaining
        };
      });

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);

      return {
        success: true,
        data: enrichedData,
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
      console.error('Failed to get GDPR requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string, requestId?: string): Promise<ApiResponse<{
    user_data: Record<string, any>;
    export_metadata: {
      export_date: string;
      request_id?: string;
      tables_included: string[];
      total_records: number;
    };
  }>> {
    try {
      const exportDate = new Date().toISOString();
      const userData: Record<string, any> = {};
      let totalRecords = 0;
      const tablesIncluded: string[] = [];

      // Define tables to export user data from
      const userDataTables = [
        'user_profiles',
        'chat_messages',
        'chat_participants',
        'user_activities',
        'file_uploads',
        // Add more tables as needed based on your schema
      ];

      // Export data from each table
      for (const tableName of userDataTables) {
        try {
          let query;
          
          // Different user ID field names in different tables
          if (tableName === 'user_profiles') {
            query = this.supabase
              .from(tableName)
              .select('*')
              .eq('identity_id', userId);
          } else if (tableName === 'chat_messages') {
            query = this.supabase
              .from(tableName)
              .select('*')
              .eq('sender_id', userId);
          } else {
            // Default to user_id field
            query = this.supabase
              .from(tableName)
              .select('*')
              .eq('user_id', userId);
          }

          const { data, error } = await query;

          if (!error && data && data.length > 0) {
            userData[tableName] = data;
            totalRecords += data.length;
            tablesIncluded.push(tableName);
          }
        } catch (tableError) {
          console.warn(`Failed to export data from ${tableName}:`, tableError);
          // Continue with other tables
        }
      }

      // Export audit logs related to this user
      try {
        const { data: auditLogs } = await this.auditService.getGdprAuditLogs(userId);
        if (auditLogs && auditLogs.length > 0) {
          userData['audit_logs'] = auditLogs;
          totalRecords += auditLogs.length;
          tablesIncluded.push('audit_logs');
        }
      } catch (auditError) {
        console.warn('Failed to export audit logs:', auditError);
      }

      const exportMetadata = {
        export_date: exportDate,
        request_id: requestId,
        tables_included: tablesIncluded,
        total_records: totalRecords
      };

      // Update request if provided
      if (requestId) {
        await this.supabase
          .from('user_data_requests')
          .update({
            status: 'completed',
            processed_at: exportDate,
            exported_data: {
              export_metadata: exportMetadata,
              record_counts: Object.fromEntries(
                tablesIncluded.map(table => [table, userData[table]?.length || 0])
              )
            }
          })
          .eq('id', requestId);
      }

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'data_export',
        event_category: 'compliance',
        actor_type: 'admin',
        action: 'export_user_data',
        description: `GDPR data export completed for user. ${totalRecords} records from ${tablesIncluded.length} tables.`,
        target_type: 'user',
        target_id: userId,
        metadata: {
          request_id: requestId,
          export_metadata: exportMetadata
        }
      });

      return {
        success: true,
        data: {
          user_data: userData,
          export_metadata: exportMetadata
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process right to be forgotten (complete data deletion)
   */
  async processRightToBeForgotten(
    userId: string,
    requestId?: string,
    verificationCode?: string
  ): Promise<ApiResponse<{
    deleted: boolean;
    anonymized_records: number;
    archived_records: number;
    affected_tables: string[];
  }>> {
    try {
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Verify request if verification code provided
      if (requestId && verificationCode) {
        const { data: request } = await this.supabase
          .from('user_data_requests')
          .select('verification_method, metadata')
          .eq('id', requestId)
          .single();

        // Simple verification - in production, implement proper verification
        if (request?.metadata?.verification_code !== verificationCode) {
          throw new Error('Invalid verification code');
        }
      }

      // Export user data before deletion (for legal compliance)
      const exportResult = await this.exportUserData(userId, requestId);
      if (!exportResult.success) {
        throw new Error('Failed to export user data before deletion');
      }

      // Archive critical data that must be retained for legal reasons
      const archiveResult = await (await this.getClient()).rpc('archive_user_data', {
        p_user_id: userId,
        p_admin_id: adminIdentity.user_id,
        p_reason: 'gdpr_right_to_be_forgotten'
      });

      // Anonymize data that cannot be deleted but references must be removed
      const anonymizedTables = await this.anonymizeUserReferences(userId);

      // Perform comprehensive user deletion
      const deletionResult = await (await this.getClient()).rpc('delete_user_comprehensive', {
        p_user_id: userId,
        p_admin_id: adminIdentity.user_id,
        p_reason: 'GDPR Right to be Forgotten',
        p_archive_data: false // Already archived above
      });

      if (!deletionResult.data?.success) {
        throw new Error(deletionResult.data?.error || 'Failed to delete user');
      }

      // Update request status
      if (requestId) {
        await this.supabase
          .from('user_data_requests')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: adminIdentity.user_id,
            notes: `Right to be forgotten processed. User data deleted and references anonymized.`
          })
          .eq('id', requestId);
      }

      const affectedTables = [
        ...Object.keys(exportResult.data?.user_data || {}),
        ...anonymizedTables,
        'user_profiles',
        'auth_methods'
      ];

      return {
        success: true,
        data: {
          deleted: true,
          anonymized_records: anonymizedTables.length,
          archived_records: archiveResult.data?.archived_count || 0,
          affected_tables: [...new Set(affectedTables)]
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to process right to be forgotten:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Anonymize user references in tables that can't be deleted
   */
  private async anonymizeUserReferences(userId: string): Promise<string[]> {
    const anonymizedTables: string[] = [];

    // Tables where user references should be anonymized rather than deleted
    const anonymizationRules = [
      {
        table: 'audit_logs',
        field: 'actor_id',
        anonymizeValue: null // Set to null to remove personal reference
      },
      {
        table: 'chat_messages',
        field: 'sender_id',
        anonymizeValue: null,
        additionalFields: {
          message: '[Message deleted - user exercised right to be forgotten]'
        }
      }
      // Add more tables as needed
    ];

    for (const rule of anonymizationRules) {
      try {
        const updateData: any = { [rule.field]: rule.anonymizeValue };
        
        if (rule.additionalFields) {
          Object.assign(updateData, rule.additionalFields);
        }

        const { error } = await this.supabase
          .from(rule.table)
          .update(updateData)
          .eq(rule.field, userId);

        if (!error) {
          anonymizedTables.push(rule.table);
        }
      } catch (error) {
        console.warn(`Failed to anonymize references in ${rule.table}:`, error);
      }
    }

    return anonymizedTables;
  }

  /**
   * Update data request status
   */
  async updateRequestStatus(
    requestId: string,
    status: DataRequestStatus,
    notes?: string,
    processingData?: Record<string, any>
  ): Promise<ApiResponse<UserDataRequest>> {
    try {
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed' || status === 'rejected') {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = adminIdentity.user_id;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (processingData) {
        updateData.exported_data = processingData;
      }

      const { data, error } = await this.supabase
        .from('user_data_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'compliance',
        actor_type: 'admin',
        action: 'update_gdpr_request',
        description: `Updated GDPR request status to ${status}`,
        resource_type: 'data_request',
        resource_id: requestId,
        metadata: {
          new_status: status,
          notes: notes
        }
      });

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update request status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get GDPR compliance statistics
   */
  async getGdprStatistics(): Promise<ApiResponse<{
    total_requests: number;
    pending_requests: number;
    overdue_requests: number;
    completed_requests: number;
    requests_by_type: Record<DataRequestType, number>;
    average_processing_time_days: number;
    compliance_rate: number;
  }>> {
    try {
      // Get total requests
      const { count: totalRequests } = await this.supabase
        .from('user_data_requests')
        .select('id', { count: 'exact', head: true });

      // Get pending requests
      const { count: pendingRequests } = await this.supabase
        .from('user_data_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Get overdue requests
      const { count: overdueRequests } = await this.supabase
        .from('user_data_requests')
        .select('id', { count: 'exact', head: true })
        .lt('completion_deadline', new Date().toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      // Get completed requests
      const { count: completedRequests } = await this.supabase
        .from('user_data_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get requests by type
      const { data: requestTypes } = await this.supabase
        .from('user_data_requests')
        .select('request_type');

      // Get processing times for completed requests
      const { data: processingTimes } = await this.supabase
        .from('user_data_requests')
        .select('requested_at, processed_at')
        .eq('status', 'completed')
        .not('processed_at', 'is', null);

      const requestsByType = (requestTypes || []).reduce((acc: any, request: any) => {
        acc[request.request_type] = (acc[request.request_type] || 0) + 1;
        return acc;
      }, {});

      // Calculate average processing time
      let averageProcessingTime = 0;
      if (processingTimes && processingTimes.length > 0) {
        const totalProcessingTime = processingTimes.reduce((sum: number, request: any) => {
          const requested = new Date(request.requested_at);
          const processed = new Date(request.processed_at);
          const timeDiff = processed.getTime() - requested.getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          return sum + daysDiff;
        }, 0);
        
        averageProcessingTime = totalProcessingTime / processingTimes.length;
      }

      // Calculate compliance rate (completed within deadline)
      const complianceRate = totalRequests ? 
        ((completedRequests || 0) / (totalRequests - (overdueRequests || 0))) * 100 : 100;

      return {
        success: true,
        data: {
          total_requests: totalRequests || 0,
          pending_requests: pendingRequests || 0,
          overdue_requests: overdueRequests || 0,
          completed_requests: completedRequests || 0,
          requests_by_type: requestsByType,
          average_processing_time_days: Math.round(averageProcessingTime * 100) / 100,
          compliance_rate: Math.round(complianceRate * 100) / 100
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get GDPR statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResponse<{
    report_period: { from: string; to: string };
    summary: Record<string, any>;
    detailed_requests: UserDataRequest[];
    recommendations: string[];
  }>> {
    try {
      const from = fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const to = toDate || new Date().toISOString();

      // Get statistics for the period
      const statsResult = await this.getGdprStatistics();
      
      // Get detailed requests for the period
      const requestsResult = await this.getDataRequests({
        page: 1,
        limit: 1000 // Get all for report
      });

      // Filter requests by date range
      const detailedRequests = (requestsResult.data || []).filter(request => {
        const requestDate = new Date(request.requested_at);
        return requestDate >= new Date(from) && requestDate <= new Date(to);
      });

      // Generate recommendations based on current status
      const recommendations: string[] = [];
      
      if (((statsResult.data as any) as any)?.overdue_requests > 0) {
        recommendations.push(`${((statsResult.data as any) as any).overdue_requests} requests are overdue. Immediate action required.`);
      }
      
      if ((statsResult.data as any)?.compliance_rate < 95) {
        recommendations.push(`Compliance rate is ${(statsResult.data as any).compliance_rate}%. Improve processing times.`);
      }
      
      if ((statsResult.data as any)?.average_processing_time_days > 25) {
        recommendations.push(`Average processing time is ${(statsResult.data as any).average_processing_time_days} days. Target is under 25 days.`);
      }
      
      if ((statsResult.data as any)?.pending_requests > 10) {
        recommendations.push(`${(statsResult.data as any).pending_requests} requests are pending. Consider increasing processing capacity.`);
      }

      // Create audit log for report generation
      await this.auditService.createAuditLog({
        event_type: 'data_export',
        event_category: 'compliance',
        actor_type: 'admin',
        action: 'generate_compliance_report',
        description: `Generated GDPR compliance report for period ${from} to ${to}`,
        metadata: {
          report_period: { from, to },
          requests_included: detailedRequests.length
        }
      });

      return {
        success: true,
        data: {
          report_period: { from, to },
          summary: (statsResult.data as any) || {},
          detailed_requests: detailedRequests,
          recommendations
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}
