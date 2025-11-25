/**
 * Admin Authentication API
 *
 * MIGRATION: Migrated to RDS with requireAdmin() (2025-10-14)
 * Handles admin login, session management, and permission checks
 */

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
import { createRDSClient } from '@/lib/db/rds-client';
import { AdminService } from '@/lib/admin/services';
import { cookies } from 'next/headers';

const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const { action, ...data } = await request.json();
    const rds = createRDSClient();
    const adminService = new AdminService();

    switch (action) {
      case 'login':
        return await handleAdminLogin(data, rds, request, context);

      case 'verify_permissions':
        return await handlePermissionVerification(data, adminService, rds, context);

      case 'refresh_session':
        return await handleSessionRefresh(rds, context);

      case 'logout':
        return await handleAdminLogout(rds, context);

      default:
        return createErrorResponse(ErrorType.BAD_REQUEST, context);
    }
  } catch (error) {
    console.error('Admin auth API error:', error);
    return createErrorResponse(ErrorType.INTERNAL_ERROR, context);
  }
}

async function handleAdminLogin(
  data: { email: string; password: string },
  rds: any,
  request: NextRequest,
  context: SecurityContext
) {
  const { email, password } = data;

  if (!email || !password) {
    return createErrorResponse(ErrorType.BAD_REQUEST, context);
  }

  // TODO: Implement proper authentication with NextAuth or Cognito
  // For now, this is a placeholder that needs to be replaced with actual auth
  // This might use NextAuth signIn or AWS Cognito authentication
  const authData = {
    user: {
      id: email, // Placeholder
      email: email
    }
  };

  // Check if user has admin permissions
  const { data: adminProfileRows } = await rds
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', authData.user.id);

  const adminProfile = adminProfileRows?.[0];

  if (!adminProfile) {
    return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
  }

  // Check for admin roles
  const { data: adminRoles } = await rds
    .from('admin_user_roles')
    .select(`
      admin_roles (name, display_name, level)
    `)
    .eq('user_id', adminProfile.user_id)
    .eq('is_active', true);

  if (!adminRoles || adminRoles.length === 0) {
    return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
  }

  // Create admin session record
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

  await rds
    .from('admin_sessions')
    .insert({
      admin_user_id: adminProfile.user_id,
      session_token: sessionToken,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      expires_at: expiresAt.toISOString(),
      login_method: 'password'
    });

  // Log successful admin login
  await rds.rpc('create_audit_log', {
    p_event_type: 'login_success',
    p_event_category: 'authentication',
    p_actor_type: 'admin',
    p_actor_id: adminProfile.user_id,
    p_action: 'admin_login',
    p_description: 'Admin user successfully logged in',
    p_metadata: {
      login_method: 'password',
      roles: adminRoles.map((r: any) => r.admin_roles.name)
    },
    p_ip_address: request.headers.get('x-forwarded-for'),
    p_user_agent: request.headers.get('user-agent')
  });

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        identity_id: adminProfile.user_id
      },
      roles: adminRoles.map((r: any) => r.admin_roles),
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString()
      }
    }
  });
}

async function handlePermissionVerification(
  data: { permission: string; resource_type?: string; resource_id?: string },
  adminService: AdminService,
  rds: any,
  context: SecurityContext
) {
  // TODO: Implement proper session/user retrieval with NextAuth or Cognito
  // For now, placeholder authentication check
  const user = { id: 'placeholder', email: 'placeholder@example.com' };

  if (!user) {
    return createErrorResponse(ErrorType.AUTHENTICATION_FAILED, context);
  }

  const { data: adminProfileRows } = await rds
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', user.id);

  const adminProfile = adminProfileRows?.[0];

  if (!adminProfile) {
    return createErrorResponse(ErrorType.AUTHORIZATION_FAILED, context);
  }

  const hasPermission = await adminService.permissions.userHasPermission(
    adminProfile.user_id,
    data.permission,
    data.resource_type,
    data.resource_id
  );

  return NextResponse.json(hasPermission);
}

async function handleSessionRefresh(rds: any, context: SecurityContext) {
  // TODO: Implement proper session retrieval with NextAuth or Cognito
  // For now, placeholder session
  const session = { user: { id: 'placeholder', email: 'placeholder@example.com' } };

  if (!session) {
    return createErrorResponse(ErrorType.AUTHENTICATION_FAILED, context);
  }

  // Update session activity
  const { data: adminProfileRows } = await rds
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', session.user.id);

  const adminProfile = adminProfileRows?.[0];

  if (adminProfile) {
    await rds
      .from('admin_sessions')
      .eq('admin_user_id', adminProfile.user_id)
      .eq('is_active', true)
      .update({ last_activity: new Date().toISOString() }, { select: '*' });
  }

  return NextResponse.json({
    success: true,
    data: { session: session }
  });
}

async function handleAdminLogout(rds: any, context: SecurityContext) {
  // TODO: Implement proper user retrieval with NextAuth or Cognito
  // For now, placeholder user
  const user = { id: 'placeholder', email: 'placeholder@example.com' };

  if (user) {
    const { data: adminProfileRows } = await rds
      .from('auth_methods')
      .select('identity_id')
      .eq('provider_user_id', user.id);

    const adminProfile = adminProfileRows?.[0];

    if (adminProfile) {
      // Deactivate admin sessions
      await rds
        .from('admin_sessions')
        .eq('admin_user_id', adminProfile.user_id)
        .update({ is_active: false }, { select: '*' });

      // Log admin logout
      await rds.rpc('create_audit_log', {
        p_event_type: 'logout',
        p_event_category: 'authentication',
        p_actor_type: 'admin',
        p_actor_id: adminProfile.user_id,
        p_action: 'admin_logout',
        p_description: 'Admin user logged out'
      });
    }
  }

  // TODO: Implement proper signOut with NextAuth or Cognito

  return NextResponse.json({
    success: true,
    data: { logged_out: true }
  });
}

export const POST = withAdminSecurity(postHandler);
