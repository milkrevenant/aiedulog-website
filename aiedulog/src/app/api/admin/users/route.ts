/**
 * Admin User Management API
 * Comprehensive user administration endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/services';
import type { UserManagementRequest, UserSearchFilters } from '@/lib/admin/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminService = new AdminService();
    
    // Check admin authentication
    const authCheck = await checkAdminAuth(supabase);
    if (!authCheck.success) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    // Check permissions
    const hasPermission = await adminService.permissions.userHasPermission(
      authCheck.adminId,
      'user.read'
    );

    if (!hasPermission.data?.has_permission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await handleUsersList(searchParams, adminService);
      
      case 'details':
        const userId = searchParams.get('userId');
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'User ID required' },
            { status: 400 }
          );
        }
        return await handleUserDetails(userId, adminService);
      
      case 'statistics':
        return await handleUserStatistics(adminService);
      
      case 'archived_data':
        const archiveUserId = searchParams.get('userId');
        if (!archiveUserId) {
          return NextResponse.json(
            { success: false, error: 'User ID required' },
            { status: 400 }
          );
        }
        return await handleArchivedData(archiveUserId, searchParams, adminService);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminService = new AdminService();
    
    // Check admin authentication
    const authCheck = await checkAdminAuth(supabase);
    if (!authCheck.success) {
      return NextResponse.json(authCheck, { status: 401 });
    }

    const { action, ...data } = await request.json();

    switch (action) {
      case 'delete':
        return await handleUserDeletion(data, authCheck.adminId, adminService);
      
      case 'archive':
        return await handleUserArchive(data, authCheck.adminId, adminService);
      
      case 'restore':
        return await handleUserRestore(data, adminService);
      
      case 'update_status':
        return await handleStatusUpdate(data, adminService);
      
      case 'bulk_operation':
        return await handleBulkOperation(data, adminService);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function checkAdminAuth(supabase: any) {
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

async function handleUsersList(
  searchParams: URLSearchParams,
  adminService: AdminService
) {
  const filters: any = {};
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Extract filters from search params
  if (searchParams.get('email')) filters.email = searchParams.get('email')!;
  if (searchParams.get('role')) filters.role = searchParams.get('role')!;
  if (searchParams.get('status')) filters.status = searchParams.get('status')!;
  if (searchParams.get('created_from')) filters.created_from = searchParams.get('created_from')!;
  if (searchParams.get('created_to')) filters.created_to = searchParams.get('created_to')!;
  if (searchParams.get('search')) filters.search_query = searchParams.get('search')!;

  const result = await adminService.users.getUsers(filters, page, limit);
  return NextResponse.json(result);
}

async function handleUserDetails(userId: string, adminService: AdminService) {
  const result = await adminService.users.getUserDetails(userId);
  return NextResponse.json(result);
}

async function handleUserStatistics(adminService: AdminService) {
  const result = await adminService.users.getUserStatistics();
  return NextResponse.json(result);
}

async function handleArchivedData(
  userId: string,
  searchParams: URLSearchParams,
  adminService: AdminService
) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const result = await adminService.users.getArchivedData(userId, page, limit);
  return NextResponse.json(result);
}

async function handleUserDeletion(
  data: UserManagementRequest,
  adminId: string,
  adminService: AdminService
) {
  // Check delete permissions
  const hasPermission = await adminService.permissions.userHasPermission(
    adminId,
    'user.delete'
  );

  if (!hasPermission.data?.has_permission) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions for user deletion' },
      { status: 403 }
    );
  }

  if (!data.user_id || !data.reason) {
    return NextResponse.json(
      { success: false, error: 'User ID and reason required' },
      { status: 400 }
    );
  }

  const result = await adminService.users.deleteUser(data);
  return NextResponse.json(result);
}

async function handleUserArchive(
  data: { user_id: string; reason: string },
  adminId: string,
  adminService: AdminService
) {
  if (!data.user_id || !data.reason) {
    return NextResponse.json(
      { success: false, error: 'User ID and reason required' },
      { status: 400 }
    );
  }

  const result = await adminService.users.archiveUserData(
    data.user_id,
    adminId,
    data.reason
  );
  return NextResponse.json(result);
}

async function handleUserRestore(
  data: { user_id: string; correlation_id?: string },
  adminService: AdminService
) {
  if (!data.user_id) {
    return NextResponse.json(
      { success: false, error: 'User ID required' },
      { status: 400 }
    );
  }

  const result = await adminService.users.restoreUserData(
    data.user_id,
    data.correlation_id
  );
  return NextResponse.json(result);
}

async function handleStatusUpdate(
  data: { 
    user_id: string; 
    new_status: string; 
    reason: string; 
    duration_days?: number 
  },
  adminService: AdminService
) {
  if (!data.user_id || !data.new_status || !data.reason) {
    return NextResponse.json(
      { success: false, error: 'User ID, status, and reason required' },
      { status: 400 }
    );
  }

  const result = await adminService.users.updateUserStatus(
    data.user_id,
    data.new_status,
    data.reason,
    data.duration_days
  );
  return NextResponse.json(result);
}

async function handleBulkOperation(
  data: {
    user_ids: string[];
    operation: 'suspend' | 'activate' | 'delete' | 'archive';
    reason: string;
    options?: { duration_days?: number; archive_data?: boolean };
  },
  adminService: AdminService
) {
  if (!data.user_ids || !data.operation || !data.reason) {
    return NextResponse.json(
      { success: false, error: 'User IDs, operation, and reason required' },
      { status: 400 }
    );
  }

  if (data.user_ids.length === 0) {
    return NextResponse.json(
      { success: false, error: 'At least one user ID required' },
      { status: 400 }
    );
  }

  if (data.user_ids.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Maximum 100 users per bulk operation' },
      { status: 400 }
    );
  }

  const result = await adminService.users.bulkUserOperation(
    data.user_ids,
    data.operation,
    data.reason,
    data.options || {}
  );
  return NextResponse.json(result);
}