/**
 * Enterprise Content Management Service
 * Comprehensive content moderation, versioning, and management system
 */

import { createClient } from '@/lib/supabase/client';
import { AuditService } from './audit-service';
import { getUserIdentity } from '@/lib/identity/helpers';
import type {
  ContentModeration,
  ContentModerationRequest,
  ContentVersion,
  ContentSearchFilters,
  ContentType,
  ModerationStatus,
  ApiResponse,
  PaginatedResponse
} from '../types';

export class ContentManagementService {
  private supabase = createClient();
  private auditService = new AuditService();

  /**
   * Get content with moderation status and filtering
   */
  async getContent(
    contentType: ContentType,
    filters: ContentSearchFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<any>> {
    try {
      // Map content types to table names
      const tableMap: Record<ContentType, string> = {
        'lecture': 'lectures',
        'announcement': 'announcements', 
        'news': 'news',
        'regular_meeting': 'regular_meetings',
        'training_program': 'training_programs',
        'chat_message': 'chat_messages',
        'comment': 'comments',
        'user_profile': 'user_profiles',
        'file_upload': 'file_uploads'
      };

      const tableName = tableMap[contentType];
      if (!tableName) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      let query = this.supabase
        .from(tableName)
        .select(`
          *,
          content_moderation (
            id,
            status,
            moderated_by,
            moderated_at,
            reason,
            severity,
            user_reports
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status?.length) {
        // Filter by moderation status through join
        const statusFilter = filters.status.map(s => `content_moderation.status.eq.${s}`).join(',');
        query = query.or(statusFilter);
      }
      
      if (filters.created_from) {
        query = query.gte('created_at', filters.created_from);
      }
      
      if (filters.created_to) {
        query = query.lte('created_at', filters.created_to);
      }
      
      if (filters.moderator_id) {
        query = query.eq('content_moderation.moderated_by', filters.moderator_id);
      }
      
      if (filters.search_query) {
        // Generic search across common text fields
        query = query.or(`title.ilike.%${filters.search_query}%,content.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`);
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
      console.error('Failed to get content:', error);
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
   * Moderate content (approve, reject, flag)
   */
  async moderateContent(request: ContentModerationRequest): Promise<ApiResponse<ContentModeration>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Moderator not authenticated');
      }

      const moderatorIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!moderatorIdentity) {
        throw new Error('Moderator identity not found');
      }

      const { data, error } = await this.supabase.rpc('moderate_content', {
        p_content_type: request.content_type,
        p_content_id: request.content_id,
        p_status: request.status,
        p_moderator_id: moderatorIdentity.user_id,
        p_reason: request.reason,
        p_actions_taken: request.actions_taken || []
      });

      if (error) throw error;

      // Get the moderation record
      const { data: moderationRecord } = await this.supabase
        .from('content_moderation')
        .select('*')
        .eq('content_type', request.content_type)
        .eq('content_id', request.content_id)
        .single();

      return {
        success: true,
        data: moderationRecord,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to moderate content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create content version snapshot
   */
  async createContentVersion(
    contentType: string,
    contentId: string,
    changeSummary?: string,
    isMajorVersion: boolean = false
  ): Promise<ApiResponse<ContentVersion>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const versionId = await this.supabase.rpc('create_content_version', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_admin_id: adminIdentity.user_id,
        p_change_summary: changeSummary,
        p_is_major_version: isMajorVersion
      });

      // Get the created version
      const { data: version, error } = await this.supabase
        .from('content_versions')
        .select('*')
        .eq('id', versionId.data)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: version,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create content version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get content version history
   */
  async getContentVersions(
    contentType: string,
    contentId: string,
    limit: number = 20
  ): Promise<ApiResponse<ContentVersion[]>> {
    try {
      const { data, error } = await this.supabase
        .from('content_versions')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version_number', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get content versions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Rollback content to previous version
   */
  async rollbackContent(
    versionId: string,
    reason: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Get version details
      const { data: version, error: versionError } = await this.supabase
        .from('content_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      if (!version) {
        throw new Error('Version not found');
      }

      // Map content types to table names (same as above)
      const tableMap: Record<string, string> = {
        'lecture': 'lectures',
        'announcement': 'announcements',
        'news': 'news',
        'regular_meeting': 'regular_meetings',
        'training_program': 'training_programs',
        'chat_message': 'chat_messages',
        'comment': 'comments',
        'user_profile': 'user_profiles',
        'file_upload': 'file_uploads'
      };

      const tableName = tableMap[version.content_type];
      if (!tableName) {
        throw new Error(`Invalid content type: ${version.content_type}`);
      }

      // Get current content for audit
      const { data: currentContent } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', version.content_id)
        .single();

      // Create version of current content before rollback
      await this.createContentVersion(
        version.content_type,
        version.content_id,
        `Pre-rollback snapshot (rolling back to version ${version.version_number})`,
        false
      );

      // Update content with version data
      const updateData = {
        ...version.content_data,
        updated_at: new Date().toISOString(),
        // Remove system fields that shouldn't be updated
        id: undefined,
        created_at: undefined
      };

      const { error: updateError } = await this.supabase
        .from(tableName)
        .update(updateData)
        .eq('id', version.content_id);

      if (updateError) throw updateError;

      // Record rollback in version history
      const { error: rollbackError } = await this.supabase
        .from('content_versions')
        .update({
          rollback_reason: reason,
          approved_by: adminIdentity.user_id,
          approved_at: new Date().toISOString()
        })
        .eq('id', versionId);

      if (rollbackError) throw rollbackError;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'content_updated',
        event_category: 'content_management',
        actor_type: 'admin',
        action: 'rollback_content',
        description: `Content rolled back to version ${version.version_number}. Reason: ${reason}`,
        target_type: 'content',
        target_id: version.content_id,
        resource_type: version.content_type,
        resource_id: version.content_id,
        before_state: currentContent,
        after_state: version.content_data,
        metadata: {
          version_id: versionId,
          version_number: version.version_number,
          rollback_reason: reason
        }
      });

      return {
        success: true,
        data: { success: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to rollback content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Soft delete content with archival
   */
  async deleteContent(
    contentType: ContentType,
    contentId: string,
    reason: string,
    archiveData: boolean = true
  ): Promise<ApiResponse<{ deleted: boolean; archived: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const tableMap: Record<ContentType, string> = {
        'lecture': 'lectures',
        'announcement': 'announcements',
        'news': 'news',
        'regular_meeting': 'regular_meetings',
        'training_program': 'training_programs',
        'chat_message': 'chat_messages',
        'comment': 'comments',
        'user_profile': 'user_profiles',
        'file_upload': 'file_uploads'
      };

      const tableName = tableMap[contentType];
      if (!tableName) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Get current content for archival and audit
      const { data: currentContent, error: fetchError } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', contentId)
        .single();

      if (fetchError) throw fetchError;

      let archived = false;

      // Archive content if requested
      if (archiveData) {
        const { error: archiveError } = await this.supabase
          .from('archived_data')
          .insert({
            table_name: tableName,
            record_id: contentId,
            archived_data: currentContent,
            archived_by: adminIdentity.user_id,
            archive_reason: 'content_deletion',
            metadata: { deletion_reason: reason }
          });

        if (!archiveError) {
          archived = true;
        }
      }

      // Soft delete content (mark as deleted rather than actual deletion)
      const { error: deleteError } = await this.supabase
        .from(tableName)
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: adminIdentity.user_id
        })
        .eq('id', contentId);

      if (deleteError) throw deleteError;

      // Update moderation status
      await this.supabase
        .from('content_moderation')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          status: 'rejected',
          moderated_by: adminIdentity.user_id,
          moderated_at: new Date().toISOString(),
          reason: `Content deleted: ${reason}`,
          severity: 'warning',
          actions_taken: [{ action: 'deleted', timestamp: new Date().toISOString(), moderator_id: adminIdentity.user_id }]
        });

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'content_deleted',
        event_category: 'content_management',
        actor_type: 'admin',
        action: 'delete_content',
        description: `Content deleted. Reason: ${reason}`,
        target_type: 'content',
        target_id: contentId,
        resource_type: contentType,
        resource_id: contentId,
        before_state: currentContent,
        after_state: { is_deleted: true },
        metadata: {
          deletion_reason: reason,
          archived: archived
        }
      });

      return {
        success: true,
        data: { deleted: true, archived },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Restore deleted content
   */
  async restoreContent(
    contentType: ContentType,
    contentId: string,
    reason: string
  ): Promise<ApiResponse<{ restored: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const tableMap: Record<ContentType, string> = {
        'lecture': 'lectures',
        'announcement': 'announcements',
        'news': 'news',
        'regular_meeting': 'regular_meetings',
        'training_program': 'training_programs',
        'chat_message': 'chat_messages',
        'comment': 'comments',
        'user_profile': 'user_profiles',
        'file_upload': 'file_uploads'
      };

      const tableName = tableMap[contentType];
      if (!tableName) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Restore content
      const { error: restoreError } = await this.supabase
        .from(tableName)
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (restoreError) throw restoreError;

      // Update moderation status
      await this.supabase
        .from('content_moderation')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          status: 'approved',
          moderated_by: adminIdentity.user_id,
          moderated_at: new Date().toISOString(),
          reason: `Content restored: ${reason}`,
          actions_taken: [{ action: 'restored', timestamp: new Date().toISOString(), moderator_id: adminIdentity.user_id }]
        });

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'content_updated',
        event_category: 'content_management',
        actor_type: 'admin',
        action: 'restore_content',
        description: `Content restored. Reason: ${reason}`,
        target_type: 'content',
        target_id: contentId,
        resource_type: contentType,
        resource_id: contentId,
        after_state: { is_deleted: false },
        metadata: {
          restoration_reason: reason
        }
      });

      return {
        success: true,
        data: { restored: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to restore content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Bulk content moderation
   */
  async bulkModerateContent(
    requests: ContentModerationRequest[],
    globalReason?: string
  ): Promise<ApiResponse<{
    successful: Array<{ content_type: ContentType; content_id: string }>;
    failed: Array<{ content_type: ContentType; content_id: string; error: string }>;
    correlation_id: string;
  }>> {
    try {
      const correlationId = crypto.randomUUID();
      const successful: Array<{ content_type: ContentType; content_id: string }> = [];
      const failed: Array<{ content_type: ContentType; content_id: string; error: string }> = [];

      // Process each content item
      for (const request of requests) {
        try {
          const moderationRequest = {
            ...request,
            reason: request.reason || globalReason || 'Bulk moderation action'
          };

          await this.moderateContent(moderationRequest);
          successful.push({
            content_type: request.content_type,
            content_id: request.content_id
          });
        } catch (error) {
          failed.push({
            content_type: request.content_type,
            content_id: request.content_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Create audit log for bulk operation
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'content_management',
        actor_type: 'admin',
        action: 'bulk_moderate_content',
        description: `Bulk moderation performed on ${requests.length} content items. ${successful.length} successful, ${failed.length} failed.`,
        metadata: {
          correlation_id: correlationId,
          global_reason: globalReason,
          successful_count: successful.length,
          failed_count: failed.length,
          requests: requests.map(r => ({ content_type: r.content_type, content_id: r.content_id, status: r.status }))
        }
      });

      return {
        success: true,
        data: {
          successful,
          failed,
          correlation_id: correlationId
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to bulk moderate content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get content moderation statistics
   */
  async getModerationStatistics(days: number = 30): Promise<ApiResponse<{
    total_moderated: number;
    approved: number;
    rejected: number;
    flagged: number;
    pending: number;
    moderation_by_type: Record<ContentType, number>;
    moderator_stats: Array<{ moderator_id: string; count: number }>;
  }>> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      // Get total moderated content
      const { count: totalModerated } = await this.supabase
        .from('content_moderation')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', fromDate.toISOString());

      // Get moderation by status
      const { data: statusData } = await this.supabase
        .from('content_moderation')
        .select('status')
        .gte('created_at', fromDate.toISOString());

      // Get moderation by content type
      const { data: typeData } = await this.supabase
        .from('content_moderation')
        .select('content_type')
        .gte('created_at', fromDate.toISOString());

      // Get moderator statistics
      const { data: moderatorData } = await this.supabase
        .from('content_moderation')
        .select('moderated_by')
        .gte('moderated_at', fromDate.toISOString())
        .not('moderated_by', 'is', null);

      const statusCounts = (statusData || []).reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const typeCounts = (typeData || []).reduce((acc: any, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
      }, {});

      const moderatorCounts = (moderatorData || []).reduce((acc: any, item) => {
        const id = item.moderated_by;
        const existing = acc.find((m: any) => m.moderator_id === id);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ moderator_id: id, count: 1 });
        }
        return acc;
      }, []);

      return {
        success: true,
        data: {
          total_moderated: totalModerated || 0,
          approved: statusCounts.approved || 0,
          rejected: statusCounts.rejected || 0,
          flagged: statusCounts.flagged || 0,
          pending: statusCounts.pending || 0,
          moderation_by_type: typeCounts,
          moderator_stats: moderatorCounts.sort((a: any, b: any) => b.count - a.count)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get moderation statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}