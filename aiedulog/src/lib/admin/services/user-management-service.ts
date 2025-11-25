/**
 * Enterprise User Management Service
 * Comprehensive user administration with GDPR compliance and audit logging
 */

import { createClient } from '@/lib/supabase/server';
import { AuditService } from './audit-service';
import { getUserIdentity } from '@/lib/identity/helpers';
import type { 
  UserManagementRequest,
  ArchivedData,
  UserActivity,
  UserStatusHistory,
  UserDataRequest,
  ApiResponse,
  PaginatedResponse,
  UserSearchFilters
} from '../types';
import type { UserProfile } from '@/lib/identity/helpers';

export class UserManagementService {
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
   * Get users with advanced filtering and pagination
   */
  async getUsers(
    filters: UserSearchFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<UserProfile & { last_activity?: string; status?: string }>> {
    try {
      let query = this.supabase
        .from('user_profiles')
        .select(`
          *
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.created_from) {
        query = query.gte('created_at', filters.created_from);
      }
      if (filters.created_to) {
        query = query.lte('created_at', filters.created_to);
      }
      if (filters.search_query) {
        query = query.or(`email.ilike.%${filters.search_query}%,nickname.ilike.%${filters.search_query}%,full_name.ilike.%${filters.search_query}%`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      // Enrich with last activity data
      const enrichedData = await Promise.all(
        (data || []).map(async (user: any) => {
          const { data: lastActivity } = await this.supabase
            .from('user_activities')
            .select('created_at')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...user,
            last_activity: lastActivity?.created_at,
            status: user.is_active ? 'active' : 'inactive'
          };
        })
      );

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
      console.error('Failed to get users:', error);
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
   * Get detailed user information including activities
   */
  async getUserDetails(userId: string): Promise<ApiResponse<{
    profile: UserProfile;
    activities: UserActivity[];
    status_history: UserStatusHistory[];
    archived_data_count: number;
  }>> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select(`
          *
        `)
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get recent activities
      const { data: activities } = await this.supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get status history
      const { data: statusHistory } = await this.supabase
        .from('user_status_history')
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false });

      // Get archived data count
      const { count: archivedDataCount } = await this.supabase
        .from('archived_data')
        .select('id', { count: 'exact', head: true })
        .eq('record_id', userId);

      return {
        success: true,
        data: {
          profile: profile,
          activities: activities || [],
          status_history: statusHistory || [],
          archived_data_count: archivedDataCount || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get user details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Archive user data before deletion (GDPR compliant)
   */
  async archiveUserData(
    userId: string,
    adminId: string,
    reason: string = 'admin_action'
  ): Promise<ApiResponse<{ archived_count: number; correlation_id: string }>> {
    try {
      const { data, error } = await (await this.getClient()).rpc('archive_user_data', {
        p_user_id: userId,
        p_admin_id: adminId,
        p_reason: reason
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to archive user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Comprehensively delete user with cascade handling
   */
  async deleteUser(request: UserManagementRequest): Promise<ApiResponse<{
    deleted_user_email: string;
    correlation_id: string;
    archive_result?: any;
  }>> {
    try {
      // Get current user for audit
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin user not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const { data, error } = await (await this.getClient()).rpc('delete_user_comprehensive', {
        p_user_id: request.user_id,
        p_admin_id: adminIdentity.user_id,
        p_reason: request.reason,
        p_archive_data: request.archive_data !== false
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Restore archived user data
   */
  async restoreUserData(
    userId: string,
    correlationId?: string
  ): Promise<ApiResponse<{ restored_count: number }>> {
    try {
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin user not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const { data, error } = await (await this.getClient()).rpc('restore_user_data', {
        p_user_id: userId,
        p_admin_id: adminIdentity.user_id,
        p_correlation_id: correlationId
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to restore user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update user status (suspend, activate, etc.)
   */
  async updateUserStatus(
    userId: string,
    newStatus: string,
    reason: string,
    durationDays?: number
  ): Promise<ApiResponse<{ updated: boolean }>> {
    try {
      const { data: currentUser } = await (await this.getClient()).auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin user not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Get current user profile
      const { data: currentProfile } = await this.supabase
        .from('user_profiles')
        .select('is_active')
        .eq('user_id', userId)
        .single();

      if (!currentProfile) {
        throw new Error('User not found');
      }

      const currentStatus = currentProfile.is_active ? 'active' : 'inactive';

      // Update user profile status
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({ 
          is_active: newStatus === 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Record status change
      const autoRevertAt = durationDays 
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: historyError } = await this.supabase
        .from('user_status_history')
        .insert({
          user_id: userId,
          old_status: currentStatus,
          new_status: newStatus,
          changed_by: adminIdentity.user_id,
          reason,
          duration_days: durationDays,
          auto_revert_at: autoRevertAt
        });

      if (historyError) throw historyError;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'user_updated',
        event_category: 'user_management',
        actor_type: 'admin',
        action: 'update_status',
        description: `User status changed from ${currentStatus} to ${newStatus}. Reason: ${reason}`,
        target_type: 'user',
        target_id: userId,
        before_state: { status: currentStatus },
        after_state: { status: newStatus },
        metadata: {
          duration_days: durationDays,
          auto_revert_at: autoRevertAt,
          reason
        }
      });

      return {
        success: true,
        data: { updated: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update user status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get archived data for a user
   */
  async getArchivedData(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ArchivedData>> {
    try {
      const from = (page - 1) * limit;
      
      const { data, count, error } = await this.supabase
        .from('archived_data')
        .select('*', { count: 'exact' })
        .eq('record_id', userId)
        .order('archived_at', { ascending: false })
        .range(from, from + limit - 1);

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
      console.error('Failed to get archived data:', error);
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
   * Get user statistics for admin dashboard
   */
  async getUserStatistics(): Promise<ApiResponse<{
    total_users: number;
    active_users: number;
    suspended_users: number;
    new_users_today: number;
    new_users_this_week: number;
    users_by_role: Record<string, number>;
    users_by_status: Record<string, number>;
  }>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get total users
      const { count: totalUsers } = await this.supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true });

      // Get active users
      const { count: activeUsers } = await this.supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get inactive users (equivalent to suspended)
      const { count: suspendedUsers } = await this.supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('is_active', false);

      // Get new users today
      const { count: newUsersToday } = await this.supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get new users this week
      const { count: newUsersThisWeek } = await this.supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Get users by role
      const { data: roleData } = await this.supabase
        .from('user_profiles')
        .select('role');

      // Get users by status (active/inactive)
      const { data: statusData } = await this.supabase
        .from('user_profiles')
        .select('is_active');

      const usersByRole = (roleData || []).reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      const usersByStatus = (statusData || []).reduce((acc: any, user: any) => {
        const status = user.is_active ? 'active' : 'inactive';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          total_users: totalUsers || 0,
          active_users: activeUsers || 0,
          suspended_users: suspendedUsers || 0,
          new_users_today: newUsersToday || 0,
          new_users_this_week: newUsersThisWeek || 0,
          users_by_role: usersByRole,
          users_by_status: usersByStatus
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get user statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(
    userIds: string[],
    operation: 'suspend' | 'activate' | 'delete' | 'archive',
    reason: string,
    options: { duration_days?: number; archive_data?: boolean } = {}
  ): Promise<ApiResponse<{ 
    successful: string[]; 
    failed: Array<{ user_id: string; error: string }>;
    correlation_id: string;
  }>> {
    try {
      const correlationId = crypto.randomUUID();
      const successful: string[] = [];
      const failed: Array<{ user_id: string; error: string }> = [];

      // Process each user
      for (const userId of userIds) {
        try {
          switch (operation) {
            case 'suspend':
            case 'activate':
              await this.updateUserStatus(userId, operation === 'suspend' ? 'suspended' : 'active', reason, options.duration_days);
              successful.push(userId);
              break;
            case 'delete':
              await this.deleteUser({
                user_id: userId,
                action: 'delete',
                reason,
                archive_data: options.archive_data !== false,
                correlation_id: correlationId
              });
              successful.push(userId);
              break;
            case 'archive':
              const { data: currentUser } = await (await this.getClient()).auth.getUser();
              if (!currentUser.user) {
                throw new Error('Admin user not authenticated');
              }
              const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
              
              if (adminIdentity) {
                await this.archiveUserData(userId, adminIdentity.user_id, reason);
                successful.push(userId);
              } else {
                failed.push({ user_id: userId, error: 'Admin identity not found' });
              }
              break;
          }
        } catch (error) {
          failed.push({ 
            user_id: userId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Create audit log for bulk operation
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'user_management',
        actor_type: 'admin',
        action: `bulk_${operation}`,
        description: `Bulk ${operation} operation performed on ${userIds.length} users. ${successful.length} successful, ${failed.length} failed.`,
        metadata: {
          correlation_id: correlationId,
          operation,
          reason,
          user_ids: userIds,
          successful_count: successful.length,
          failed_count: failed.length,
          options
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
      console.error('Failed to perform bulk user operation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}
