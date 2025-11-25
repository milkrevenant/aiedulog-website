/**
 * Authentication utilities for API endpoints
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Extract user information from request using Supabase auth
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    
    // Get the session from the request
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get additional user profile data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role
    };
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

/**
 * Check if user has required role or higher
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user || !user.role) return false;
  
  const roleHierarchy = ['user', 'moderator', 'admin'];
  const userRoleIndex = roleHierarchy.indexOf(user.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Get authorization header from request
 */
export function getAuthHeader(request: NextRequest): string | null {
  return request.headers.get('authorization');
}

// Re-export from other auth modules
export * from './context';
export * from './hooks';
export * from './permissions';
export type { AppUser } from './types';
