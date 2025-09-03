/**
 * Enterprise Permission & Role Management Service
 * RBAC system with hierarchical roles and fine-grained permissions
 */

import { createClient } from '@/lib/supabase/client';
import { AuditService } from './audit-service';
import { getUserIdentity } from '@/lib/identity/helpers';
import type {
  AdminRole,
  AdminPermission,
  AdminRolePermission,
  AdminUserRole,
  RoleAssignmentRequest,
  PermissionScope,
  ApiResponse,
  PaginatedResponse
} from '../types';

export class PermissionService {
  private supabase = createClient();
  private auditService = new AuditService();

  /**
   * Check if user has specific permission
   */
  async userHasPermission(
    userId: string,
    permissionName: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<ApiResponse<{ has_permission: boolean; roles: string[] }>> {
    try {
      const { data, error } = await this.supabase.rpc('user_has_permission', {
        p_user_id: userId,
        p_permission_name: permissionName,
        p_resource_type: resourceType,
        p_resource_id: resourceId
      });

      if (error) throw error;

      // Get user's current roles for context
      const { data: userRoles } = await this.supabase
        .from('admin_user_roles')
        .select(`
          admin_roles (name)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      const roleNames = userRoles?.map((ur: any) => ur.admin_roles.name) || [];

      return {
        success: true,
        data: {
          has_permission: data === true,
          roles: roleNames
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to check user permission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all available roles
   */
  async getRoles(includeInactive: boolean = false): Promise<ApiResponse<AdminRole[]>> {
    try {
      let query = this.supabase
        .from('admin_roles')
        .select('*')
        .order('level', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all available permissions
   */
  async getPermissions(includeInactive: boolean = false): Promise<ApiResponse<AdminPermission[]>> {
    try {
      let query = this.supabase
        .from('admin_permissions')
        .select('*')
        .order('resource_type', { ascending: true })
        .order('action', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get role with its permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<ApiResponse<AdminRole & { permissions: AdminPermission[] }>> {
    try {
      // Get role details
      const { data: role, error: roleError } = await this.supabase
        .from('admin_roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      // Get role permissions
      const { data: rolePermissions, error: permError } = await this.supabase
        .from('admin_role_permissions')
        .select(`
          *,
          admin_permissions (*)
        `)
        .eq('role_id', roleId);

      if (permError) throw permError;

      const permissions = rolePermissions?.map((rp: any) => rp.admin_permissions) || [];

      return {
        success: true,
        data: {
          ...role,
          permissions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get role with permissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create new admin role
   */
  async createRole(
    roleData: {
      name: string;
      display_name: string;
      description?: string;
      level: number;
      constraints?: Record<string, any>;
    }
  ): Promise<ApiResponse<AdminRole>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const { data, error } = await this.supabase
        .from('admin_roles')
        .insert({
          ...roleData,
          created_by: adminIdentity.user_id
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'create_role',
        description: `Created admin role: ${roleData.display_name} (${roleData.name})`,
        resource_type: 'admin_role',
        resource_id: data.id,
        after_state: data,
        metadata: {
          role_level: roleData.level,
          role_name: roleData.name
        }
      });

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update admin role
   */
  async updateRole(
    roleId: string,
    updates: {
      display_name?: string;
      description?: string;
      level?: number;
      is_active?: boolean;
      constraints?: Record<string, any>;
    }
  ): Promise<ApiResponse<AdminRole>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Get current role for audit
      const { data: currentRole } = await this.supabase
        .from('admin_roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (!currentRole) {
        throw new Error('Role not found');
      }

      // Check if it's a system role
      if (currentRole.is_system_role && (updates.is_active === false)) {
        throw new Error('Cannot deactivate system roles');
      }

      const { data, error } = await this.supabase
        .from('admin_roles')
        .update({
          ...updates,
          updated_by: adminIdentity.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'update_role',
        description: `Updated admin role: ${currentRole.display_name}`,
        resource_type: 'admin_role',
        resource_id: roleId,
        before_state: currentRole,
        after_state: data,
        metadata: {
          updates: updates
        }
      });

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Delete admin role (only non-system roles)
   */
  async deleteRole(roleId: string, transferUsersToRoleId?: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Get role details
      const { data: role } = await this.supabase
        .from('admin_roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.is_system_role) {
        throw new Error('Cannot delete system roles');
      }

      // Check for users with this role
      const { data: usersWithRole } = await this.supabase
        .from('admin_user_roles')
        .select('user_id')
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (usersWithRole && usersWithRole.length > 0) {
        if (!transferUsersToRoleId) {
          throw new Error(`Cannot delete role. ${usersWithRole.length} users are assigned to this role. Specify a transfer role.`);
        }

        // Transfer users to new role
        const { error: transferError } = await this.supabase
          .from('admin_user_roles')
          .update({
            role_id: transferUsersToRoleId,
            assigned_at: new Date().toISOString(),
            assigned_by: adminIdentity.user_id
          })
          .eq('role_id', roleId)
          .eq('is_active', true);

        if (transferError) throw transferError;
      }

      // Delete role permissions
      const { error: permError } = await this.supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (permError) throw permError;

      // Delete the role
      const { error: deleteError } = await this.supabase
        .from('admin_roles')
        .delete()
        .eq('id', roleId);

      if (deleteError) throw deleteError;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'admin_action',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'delete_role',
        description: `Deleted admin role: ${role.display_name}`,
        resource_type: 'admin_role',
        resource_id: roleId,
        before_state: role,
        metadata: {
          users_transferred: usersWithRole?.length || 0,
          transfer_to_role: transferUsersToRoleId
        }
      });

      return {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Grant permission to role
   */
  async grantPermissionToRole(
    roleId: string,
    permissionId: string,
    conditions?: Record<string, any>
  ): Promise<ApiResponse<AdminRolePermission>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const { data, error } = await this.supabase
        .from('admin_role_permissions')
        .upsert({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: adminIdentity.user_id,
          conditions: conditions || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Get role and permission names for audit
      const { data: role } = await this.supabase
        .from('admin_roles')
        .select('name, display_name')
        .eq('id', roleId)
        .single();

      const { data: permission } = await this.supabase
        .from('admin_permissions')
        .select('name, display_name')
        .eq('id', permissionId)
        .single();

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'permission_granted',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'grant_permission_to_role',
        description: `Granted permission "${permission?.display_name}" to role "${role?.display_name}"`,
        resource_type: 'role_permission',
        resource_id: data.id,
        metadata: {
          role_name: role?.name,
          permission_name: permission?.name,
          conditions: conditions
        }
      });

      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to grant permission to role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Revoke permission from role
   */
  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<ApiResponse<{ revoked: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      // Get role permission for audit before deletion
      const { data: rolePermission } = await this.supabase
        .from('admin_role_permissions')
        .select(`
          *,
          admin_roles (name, display_name),
          admin_permissions (name, display_name)
        `)
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
        .single();

      if (!rolePermission) {
        throw new Error('Role permission not found');
      }

      const { error } = await this.supabase
        .from('admin_role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (error) throw error;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'permission_revoked',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'revoke_permission_from_role',
        description: `Revoked permission "${rolePermission.admin_permissions.display_name}" from role "${rolePermission.admin_roles.display_name}"`,
        resource_type: 'role_permission',
        resource_id: rolePermission.id,
        before_state: rolePermission,
        metadata: {
          role_name: rolePermission.admin_roles.name,
          permission_name: rolePermission.admin_permissions.name
        }
      });

      return {
        success: true,
        data: { revoked: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to revoke permission from role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(request: RoleAssignmentRequest): Promise<ApiResponse<AdminUserRole>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      const { data, error } = await this.supabase.rpc('grant_user_role', {
        p_user_id: request.user_id,
        p_role_name: request.role_name,
        p_granted_by: adminIdentity.user_id,
        p_expires_at: request.expires_at,
        p_conditions: request.conditions || {}
      });

      if (error) throw error;

      // Get the created assignment
      const { data: assignment } = await this.supabase
        .from('admin_user_roles')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      return {
        success: true,
        data: assignment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to assign role to user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(userId: string, roleId: string): Promise<ApiResponse<{ revoked: boolean }>> {
    try {
      const { data: currentUser } = await this.supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('Admin not authenticated');
      }

      const adminIdentity = await getUserIdentity(currentUser.user, this.supabase);
      
      if (!adminIdentity) {
        throw new Error('Admin identity not found');
      }

      // Get assignment for audit before deletion
      const { data: assignment } = await this.supabase
        .from('admin_user_roles')
        .select(`
          *,
          admin_roles (name, display_name)
        `)
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .single();

      if (!assignment) {
        throw new Error('User role assignment not found');
      }

      const { error } = await this.supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (error) throw error;

      // Create audit log
      await this.auditService.createAuditLog({
        event_type: 'role_revoked',
        event_category: 'authorization',
        actor_type: 'admin',
        action: 'revoke_role_from_user',
        description: `Revoked role "${assignment.admin_roles.display_name}" from user`,
        target_type: 'user',
        target_id: userId,
        resource_type: 'user_role',
        resource_id: assignment.id,
        before_state: assignment,
        metadata: {
          role_name: assignment.admin_roles.name
        }
      });

      return {
        success: true,
        data: { revoked: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to revoke role from user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get user's roles and permissions
   */
  async getUserRolesAndPermissions(userId: string): Promise<ApiResponse<{
    roles: Array<AdminRole & { assigned_at: string; expires_at?: string }>;
    permissions: Array<AdminPermission & { source_role: string }>;
    effective_permissions: string[];
  }>> {
    try {
      // Get user roles
      const { data: userRoles } = await this.supabase
        .from('admin_user_roles')
        .select(`
          *,
          admin_roles (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      // Get permissions through roles
      const roleIds = userRoles?.map((ur: any) => ur.role_id) || [];
      let permissions: any[] = [];
      
      if (roleIds.length > 0) {
        const { data: rolePermissions } = await this.supabase
          .from('admin_role_permissions')
          .select(`
            *,
            admin_permissions (*),
            admin_roles (name, display_name)
          `)
          .in('role_id', roleIds);

        permissions = rolePermissions || [];
      }

      const roles = userRoles?.map((ur: any) => ({
        ...ur.admin_roles,
        assigned_at: ur.assigned_at,
        expires_at: ur.expires_at
      })) || [];

      const permissionsWithSource = permissions.map((rp: any) => ({
        ...rp.admin_permissions,
        source_role: rp.admin_roles.display_name
      }));

      const effectivePermissions = [...new Set(permissions.map((rp: any) => rp.admin_permissions.name))];

      return {
        success: true,
        data: {
          roles,
          permissions: permissionsWithSource,
          effective_permissions: effectivePermissions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get user roles and permissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get permission hierarchy and role statistics
   */
  async getPermissionStatistics(): Promise<ApiResponse<{
    total_roles: number;
    active_roles: number;
    total_permissions: number;
    most_common_permissions: Array<{ permission: string; role_count: number }>;
    role_hierarchy: Array<{ role: string; level: number; users_count: number }>;
  }>> {
    try {
      // Get role stats
      const { count: totalRoles } = await this.supabase
        .from('admin_roles')
        .select('id', { count: 'exact', head: true });

      const { count: activeRoles } = await this.supabase
        .from('admin_roles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalPermissions } = await this.supabase
        .from('admin_permissions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get permission usage
      const { data: permissionUsage } = await this.supabase
        .from('admin_role_permissions')
        .select(`
          admin_permissions (name, display_name)
        `);

      // Get role hierarchy with user counts
      const { data: rolesWithUsers } = await this.supabase
        .from('admin_roles')
        .select(`
          name,
          display_name,
          level,
          admin_user_roles (user_id)
        `)
        .eq('is_active', true)
        .order('level', { ascending: false });

      const permissionCounts = (permissionUsage || []).reduce((acc: any, rp: any) => {
        const name = rp.admin_permissions?.name;
        if (name) {
          acc[name] = (acc[name] || 0) + 1;
        }
        return acc;
      }, {});

      const mostCommonPermissions = Object.entries(permissionCounts)
        .map(([permission, count]) => ({ permission, role_count: count as number }))
        .sort((a, b) => b.role_count - a.role_count)
        .slice(0, 10);

      const roleHierarchy = (rolesWithUsers || []).map((role: any) => ({
        role: role.display_name,
        level: role.level,
        users_count: role.admin_user_roles?.length || 0
      }));

      return {
        success: true,
        data: {
          total_roles: totalRoles || 0,
          active_roles: activeRoles || 0,
          total_permissions: totalPermissions || 0,
          most_common_permissions: mostCommonPermissions,
          role_hierarchy: roleHierarchy
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get permission statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}