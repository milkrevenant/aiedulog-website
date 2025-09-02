/**
 * Admin User Management API
 * Comprehensive user administration endpoints
 * 
 * SECURITY: Protected by withAdminSecurity wrapper
 * - Requires admin authentication
 * - Rate limited for admin operations
 * - Full audit logging enabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/services';
import { withAdminSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { createErrorResponse, ErrorType, handleValidationError } from '@/lib/security/error-handler';
import type { UserManagementRequest, UserSearchFilters } from '@/lib/admin/types';

// GET handler with security wrapper
export const GET = withAdminSecurity(async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  const adminService = new AdminService();
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  // Additional permission check for user management
  const hasPermission = await adminService.permissions.userHasPermission(
    context.userId!,
    'user.read'
  );

  if (!hasPermission.data?.has_permission) {
    return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
  }

  switch (action) {
    case 'list':
      return await handleUsersList(searchParams, adminService, context);
    
    case 'details':
      const userId = searchParams.get('userId');
      if (!userId) {
        return handleValidationError(context, ['User ID is required'], 'userId');
      }
      return await handleUserDetails(userId, adminService, context);
    
    case 'statistics':
      return await handleUserStatistics(adminService, context);
    
    case 'archived_data':
      const archiveUserId = searchParams.get('userId');
      if (!archiveUserId) {
        return handleValidationError(context, ['User ID is required'], 'userId');
      }
      return await handleArchivedData(archiveUserId, searchParams, adminService, context);
    
    default:
      return handleValidationError(context, ['Invalid action specified'], 'action');
  }
});

// POST handler with security wrapper
export const POST = withAdminSecurity(async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  const adminService = new AdminService();
  
  // Parse request body safely
  let requestData: any;
  try {
    requestData = await request.json();
  } catch (error) {
    return handleValidationError(context, ['Invalid JSON in request body']);
  }

  const { action, ...data } = requestData;

  if (!action) {
    return handleValidationError(context, ['Action is required'], 'action');
  }

  switch (action) {
    case 'delete':
      return await handleUserDeletion(data, context.userId!, adminService, context);
    
    case 'archive':
      return await handleUserArchive(data, context.userId!, adminService, context);
    
    case 'restore':
      return await handleUserRestore(data, adminService, context);
    
    case 'update_status':
      return await handleStatusUpdate(data, adminService, context);
    
    case 'bulk_operation':
      return await handleBulkOperation(data, adminService, context);
    
    default:
      return handleValidationError(context, ['Invalid action specified'], 'action');
  }
});

// Authentication is now handled by the security wrapper

async function handleUsersList(
  searchParams: URLSearchParams,
  adminService: AdminService,
  context: SecurityContext
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

async function handleUserDetails(userId: string, adminService: AdminService, context: SecurityContext) {
  const result = await adminService.users.getUserDetails(userId);
  return NextResponse.json(result);
}

async function handleUserStatistics(adminService: AdminService, context: SecurityContext) {
  const result = await adminService.users.getUserStatistics();
  return NextResponse.json(result);
}

async function handleArchivedData(
  userId: string,
  searchParams: URLSearchParams,
  adminService: AdminService,
  context: SecurityContext
) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const result = await adminService.users.getArchivedData(userId, page, limit);
  return NextResponse.json(result);
}

async function handleUserDeletion(
  data: UserManagementRequest,
  adminId: string,
  adminService: AdminService,
  context: SecurityContext
) {
  // Check delete permissions
  const hasPermission = await adminService.permissions.userHasPermission(
    adminId,
    'user.delete'
  );

  if (!hasPermission.data?.has_permission) {
    return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
  }

  if (!data.user_id || !data.reason) {
    return handleValidationError(context, ['User ID and reason are required']);
  }

  const result = await adminService.users.deleteUser(data);
  return NextResponse.json(result);
}

async function handleUserArchive(
  data: { user_id: string; reason: string },
  adminId: string,
  adminService: AdminService,
  context: SecurityContext
) {
  if (!data.user_id || !data.reason) {
    return handleValidationError(context, ['User ID and reason are required']);
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
  adminService: AdminService,
  context: SecurityContext
) {
  if (!data.user_id) {
    return handleValidationError(context, ['User ID is required']);
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
  adminService: AdminService,
  context: SecurityContext
) {
  if (!data.user_id || !data.new_status || !data.reason) {
    return handleValidationError(context, ['User ID, status, and reason are required']);
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
  adminService: AdminService,
  context: SecurityContext
) {
  const validationErrors: string[] = [];
  
  if (!data.user_ids) validationErrors.push('User IDs are required');
  if (!data.operation) validationErrors.push('Operation is required');
  if (!data.reason) validationErrors.push('Reason is required');
  if (data.user_ids && data.user_ids.length === 0) validationErrors.push('At least one user ID is required');
  if (data.user_ids && data.user_ids.length > 100) validationErrors.push('Maximum 100 users per bulk operation');
  
  if (validationErrors.length > 0) {
    return handleValidationError(context, validationErrors);
  }

  const result = await adminService.users.bulkUserOperation(
    data.user_ids,
    data.operation,
    data.reason,
    data.options || {}
  );
  return NextResponse.json(result);
}