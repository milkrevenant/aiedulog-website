/**
 * Admin Authentication API
 * Handles admin login, session management, and permission checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/services';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();
    const supabase = await createClient();
    const adminService = new AdminService();

    switch (action) {
      case 'login':
        return await handleAdminLogin(data, supabase, request);
      
      case 'verify_permissions':
        return await handlePermissionVerification(data, adminService, supabase);
      
      case 'refresh_session':
        return await handleSessionRefresh(supabase);
      
      case 'logout':
        return await handleAdminLogout(supabase);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin auth API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function handleAdminLogin(
  data: { email: string; password: string },
  supabase: any,
  request: NextRequest
) {
  const { email, password } = data;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password required' },
      { status: 400 }
    );
  }

  // Authenticate user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Check if user has admin permissions
  const { data: adminProfile } = await supabase
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', authData.user.id)
    .single();

  if (!adminProfile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, error: 'Admin profile not found' },
      { status: 403 }
    );
  }

  // Check for admin roles
  const { data: adminRoles } = await supabase
    .from('admin_user_roles')
    .select(`
      admin_roles (name, display_name, level)
    `)
    .eq('user_id', adminProfile.identity_id)
    .eq('is_active', true);

  if (!adminRoles || adminRoles.length === 0) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, error: 'No admin permissions found' },
      { status: 403 }
    );
  }

  // Create admin session record
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

  await supabase
    .from('admin_sessions')
    .insert({
      admin_user_id: adminProfile.identity_id,
      session_token: sessionToken,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      expires_at: expiresAt.toISOString(),
      login_method: 'password'
    });

  // Log successful admin login
  await supabase.rpc('create_audit_log', {
    p_event_type: 'login_success',
    p_event_category: 'authentication',
    p_actor_type: 'admin',
    p_actor_id: adminProfile.identity_id,
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
        identity_id: adminProfile.identity_id
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
  supabase: any
) {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { data: adminProfile } = await supabase
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', user.user.id)
    .single();

  if (!adminProfile) {
    return NextResponse.json(
      { success: false, error: 'Admin profile not found' },
      { status: 403 }
    );
  }

  const hasPermission = await adminService.permissions.userHasPermission(
    adminProfile.identity_id,
    data.permission,
    data.resource_type,
    data.resource_id
  );

  return NextResponse.json(hasPermission);
}

async function handleSessionRefresh(supabase: any) {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session.session) {
    return NextResponse.json(
      { success: false, error: 'No active session' },
      { status: 401 }
    );
  }

  // Update session activity
  const { data: adminProfile } = await supabase
    .from('auth_methods')
    .select('identity_id')
    .eq('provider_user_id', session.session.user.id)
    .single();

  if (adminProfile) {
    await supabase
      .from('admin_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('admin_user_id', adminProfile.identity_id)
      .eq('is_active', true);
  }

  return NextResponse.json({
    success: true,
    data: { session: session.session }
  });
}

async function handleAdminLogout(supabase: any) {
  const { data: user } = await supabase.auth.getUser();
  
  if (user.user) {
    const { data: adminProfile } = await supabase
      .from('auth_methods')
      .select('identity_id')
      .eq('provider_user_id', user.user.id)
      .single();

    if (adminProfile) {
      // Deactivate admin sessions
      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('admin_user_id', adminProfile.identity_id);

      // Log admin logout
      await supabase.rpc('create_audit_log', {
        p_event_type: 'logout',
        p_event_category: 'authentication',
        p_actor_type: 'admin',
        p_actor_id: adminProfile.identity_id,
        p_action: 'admin_logout',
        p_description: 'Admin user logged out'
      });
    }
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    success: true,
    data: { logged_out: true }
  });
}