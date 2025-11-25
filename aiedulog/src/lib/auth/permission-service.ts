/**
 * Permission Service for Role-Based Access Control
 * Replaces Supabase RLS with application-level security
 */

import { UserSession } from './jwt-middleware';

// Permission types
export type Permission =
  // User permissions
  | 'read:users' | 'write:users' | 'delete:users' | 'manage:users'

  // Content permissions  
  | 'read:posts' | 'write:posts' | 'delete:posts' | 'manage:posts'
  | 'read:comments' | 'write:comments' | 'delete:comments' | 'manage:comments'

  // Chat permissions
  | 'read:chat' | 'write:chat' | 'delete:chat' | 'manage:chat'

  // Lecture permissions
  | 'read:lectures' | 'write:lectures' | 'delete:lectures' | 'manage:lectures'

  // Admin permissions
  | 'manage:system' | 'manage:content' | 'manage:notifications' | 'audit:logs'

  // Profile permissions
  | 'read:profile' | 'write:profile' | 'delete:profile';

export type Role = 'admin' | 'moderator' | 'member';

// Resource ownership check types
export interface ResourceOwnership {
  resourceType: 'post' | 'comment' | 'chat_room' | 'chat_message' | 'lecture' | 'profile';
  resourceId: string;
  userId: string;
}

type QueryFilter = { where: string; params: unknown[] };

/**
 * Role-based permission definitions
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // User management
    'read:users', 'write:users', 'delete:users', 'manage:users',
    
    // Content management (all)
    'read:posts', 'write:posts', 'delete:posts', 'manage:posts',
    'read:comments', 'write:comments', 'delete:comments', 'manage:comments',
    
    // Chat management
    'read:chat', 'write:chat', 'delete:chat', 'manage:chat',
    
    // Lecture management
    'read:lectures', 'write:lectures', 'delete:lectures', 'manage:lectures',
    
    // System administration
    'manage:system', 'manage:content', 'manage:notifications', 'audit:logs',
    
    // Profile management
    'read:profile', 'write:profile', 'delete:profile'
  ],
  
  moderator: [
    // Limited user management
    'read:users',
    
    // Content moderation
    'read:posts', 'write:posts', 'delete:posts', 'manage:posts',
    'read:comments', 'write:comments', 'delete:comments', 'manage:comments',
    
    // Chat moderation
    'read:chat', 'write:chat', 'delete:chat',
    
    // Lecture management
    'read:lectures', 'write:lectures', 'manage:lectures',
    
    // Content management
    'manage:content',
    
    // Own profile
    'read:profile', 'write:profile'
  ],
  
  member: [
    // Basic content access
    'read:posts', 'write:posts', // Can create and read posts
    'read:comments', 'write:comments', // Can create and read comments
    
    // Chat participation
    'read:chat', 'write:chat',
    
    // Lecture viewing and registration
    'read:lectures',
    
    // Own profile management
    'read:profile', 'write:profile'
  ]
};

/**
 * Permission Service Class
 */
export class PermissionService {
  /**
   * Check if user has specific permission
   */
  static hasPermission(user: UserSession | null, permission: Permission): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: UserSession | null, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(user: UserSession | null, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user owns a specific resource
   */
  static async canAccessResource(
    user: UserSession | null, 
    ownership: ResourceOwnership,
    requiredPermission: Permission
  ): Promise<boolean> {
    if (!user || !user.isActive) {
      return false;
    }

    // Admins and moderators can access most resources
    if (user.role === 'admin' || (user.role === 'moderator' && this.hasPermission(user, requiredPermission))) {
      return true;
    }

    // Check basic permission first
    if (!this.hasPermission(user, requiredPermission)) {
      return false;
    }

    // Check ownership for user's own content
    return ownership.userId === user.userId;
  }

  /**
   * Generate dynamic WHERE clause for database queries
   * This replaces RLS policies with application-level filtering
   */
  static generateAccessFilter(
    user: UserSession | null,
    resourceType: ResourceOwnership['resourceType'],
    permission: Permission
  ): QueryFilter {
    // No user = no access (except for public content)
    if (!user) {
      return {
        where: "is_published = true AND category NOT IN ('private', 'draft')",
        params: []
      };
    }

    // Admin access: no restrictions
    if (user.role === 'admin' && this.hasPermission(user, permission)) {
      return { where: '1=1', params: [] };
    }

    // Generate role-specific filters
    switch (resourceType) {
      case 'post':
        return this.generatePostFilter(user, permission);
      
      case 'comment':
        return this.generateCommentFilter(user, permission);
      
      case 'chat_room':
        return this.generateChatRoomFilter(user, permission);
      
      case 'chat_message':
        return this.generateChatMessageFilter(user, permission);
      
      case 'lecture':
        return this.generateLectureFilter(user, permission);
      
      case 'profile':
        return this.generateProfileFilter(user, permission);
      
      default:
        return { where: '1=0', params: [] }; // Deny by default
    }
  }

  /**
   * Post access filter
   */
  private static generatePostFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:posts') {
      // Users can read published posts and their own drafts
      return {
        where: '(is_published = true OR author_id = $1)',
        params: [user.userId]
      };
    }
    
    if (permission === 'write:posts' || permission === 'delete:posts') {
      // Users can only modify their own posts, moderators can modify any
      if (user.role === 'moderator') {
        return { where: '1=1', params: [] };
      }
      return {
        where: 'author_id = $1',
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Comment access filter
   */
  private static generateCommentFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:comments') {
      // Users can read all comments on public posts
      return {
        where: `post_id IN (
          SELECT id FROM posts 
          WHERE is_published = true OR author_id = $1
        )`,
        params: [user.userId]
      };
    }
    
    if (permission === 'write:comments') {
      // Users can comment on published posts
      return {
        where: `post_id IN (
          SELECT id FROM posts WHERE is_published = true
        )`,
        params: []
      };
    }
    
    if (permission === 'delete:comments') {
      // Users can delete their own comments, moderators can delete any
      if (user.role === 'moderator') {
        return { where: '1=1', params: [] };
      }
      return {
        where: 'author_id = $1',
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Chat room access filter
   */
  private static generateChatRoomFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:chat' || permission === 'write:chat') {
      // Users can access rooms they're participants in or public rooms
      return {
        where: `(
          type = 'public' OR 
          id IN (
            SELECT room_id FROM chat_participants 
            WHERE user_id = $1 AND is_active = true
          )
        )`,
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Chat message access filter
   */
  private static generateChatMessageFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:chat') {
      // Users can read messages in rooms they have access to
      return {
        where: `room_id IN (
          SELECT cr.id FROM chat_rooms cr
          LEFT JOIN chat_participants cp ON cr.id = cp.room_id
          WHERE cr.type = 'public' OR (cp.user_id = $1 AND cp.is_active = true)
        )`,
        params: [user.userId]
      };
    }
    
    if (permission === 'delete:chat') {
      // Users can delete their own messages, moderators can delete any
      if (user.role === 'moderator') {
        return { where: '1=1', params: [] };
      }
      return {
        where: 'sender_id = $1',
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Lecture access filter
   */
  private static generateLectureFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:lectures') {
      // All users can read published lectures
      return {
        where: "status = 'published'",
        params: []
      };
    }
    
    if (permission === 'write:lectures' || permission === 'delete:lectures') {
      // Only moderators and admins can modify lectures
      if (user.role === 'moderator') {
        return { where: '1=1', params: [] };
      }
      return {
        where: 'created_by = $1',
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Profile access filter
   */
  private static generateProfileFilter(user: UserSession, permission: Permission): QueryFilter {
    if (permission === 'read:profile') {
      // Admins can read all profiles, users can read their own and public profiles
      if (user.role === 'admin') {
        return { where: '1=1', params: [] };
      }
      return {
        where: '(user_id = $1 OR is_public = true)',
        params: [user.userId]
      };
    }
    
    if (permission === 'write:profile' || permission === 'delete:profile') {
      // Users can only modify their own profile, admins can modify any
      if (user.role === 'admin') {
        return { where: '1=1', params: [] };
      }
      return {
        where: 'user_id = $1',
        params: [user.userId]
      };
    }

    return { where: '1=0', params: [] };
  }

  /**
   * Check if user can perform action on specific resource
   */
  static async canPerformAction(
    user: UserSession | null,
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: ResourceOwnership['resourceType'],
    resourceId?: string,
    resourceOwnerId?: string
  ): Promise<boolean> {
    if (!user || !user.isActive) {
      return action === 'read'; // Only allow read access for anonymous users
    }

    const requiredPermission = this.resolvePermission(resourceType, action);
    
    if (!requiredPermission) {
      return false;
    }

    // Check basic permission
    if (!this.hasPermission(user, requiredPermission)) {
      return false;
    }

    // For create actions, no ownership check needed
    if (action === 'create') {
      return true;
    }

    // For read actions on public resources, allow if user has read permission
    if (action === 'read' && !resourceOwnerId) {
      return true;
    }

    // For other actions, check ownership or elevated privileges
    if (resourceOwnerId) {
      // Admins and moderators have elevated privileges
      if (user.role === 'admin' || user.role === 'moderator') {
        return true;
      }
      
      // Users can only modify their own resources
      return resourceOwnerId === user.userId;
    }

    return false;
  }

  private static resolvePermission(
    resourceType: ResourceOwnership['resourceType'],
    action: 'create' | 'read' | 'update' | 'delete'
  ): Permission | null {
    const mapping: Record<ResourceOwnership['resourceType'], Record<typeof action, Permission | null>> = {
      post: {
        create: 'write:posts',
        read: 'read:posts',
        update: 'write:posts',
        delete: 'delete:posts'
      },
      comment: {
        create: 'write:comments',
        read: 'read:comments',
        update: 'write:comments',
        delete: 'delete:comments'
      },
      chat_room: {
        create: 'manage:chat',
        read: 'read:chat',
        update: 'manage:chat',
        delete: 'manage:chat'
      },
      chat_message: {
        create: 'write:chat',
        read: 'read:chat',
        update: 'write:chat',
        delete: 'delete:chat'
      },
      lecture: {
        create: 'write:lectures',
        read: 'read:lectures',
        update: 'write:lectures',
        delete: 'delete:lectures'
      },
      profile: {
        create: null,
        read: 'read:profile',
        update: 'write:profile',
        delete: 'delete:profile'
      }
    };

    return mapping[resourceType][action] ?? null;
  }

  /**
   * Get user's effective permissions (for UI/debugging)
   */
  static getUserPermissions(user: UserSession | null): Permission[] {
    if (!user || !user.isActive) {
      return [];
    }

    return ROLE_PERMISSIONS[user.role] || [];
  }

  /**
   * Validate permission string
   */
  static isValidPermission(permission: string): permission is Permission {
    const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
    return allPermissions.includes(permission as Permission);
  }

  /**
   * Middleware helper for API routes
   */
  static requirePermission(permission: Permission) {
    return (user: UserSession | null): boolean => {
      return this.hasPermission(user, permission);
    };
  }

  /**
   * Middleware helper for resource ownership
   */
  static requireResourceAccess(
    resourceType: ResourceOwnership['resourceType'],
    permission: Permission
  ) {
    return async (user: UserSession | null, resourceId: string, resourceOwnerId: string): Promise<boolean> => {
      return this.canAccessResource(user, {
        resourceType,
        resourceId,
        userId: resourceOwnerId
      }, permission);
    };
  }
}

/**
 * Decorator for permission-based access control
 */
export function RequirePermission(permission: Permission) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const context = this as { user?: UserSession | null };
      const candidateUser = (context?.user ?? null) || (args.length > 0 ? (args[0] as UserSession | null) : null);
      
      if (!PermissionService.hasPermission(candidateUser, permission)) {
        throw new Error(`Permission denied: requires ${permission}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Error class for permission-related errors
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: Permission,
    public userId?: string,
    public resourceType?: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

// Export permission constants for use in components
export const PERMISSIONS = {
  // User permissions
  READ_USERS: 'read:users' as Permission,
  WRITE_USERS: 'write:users' as Permission,
  DELETE_USERS: 'delete:users' as Permission,
  MANAGE_USERS: 'manage:users' as Permission,
  
  // Content permissions
  READ_POSTS: 'read:posts' as Permission,
  WRITE_POSTS: 'write:posts' as Permission,
  DELETE_POSTS: 'delete:posts' as Permission,
  MANAGE_POSTS: 'manage:posts' as Permission,
  
  READ_COMMENTS: 'read:comments' as Permission,
  WRITE_COMMENTS: 'write:comments' as Permission,
  DELETE_COMMENTS: 'delete:comments' as Permission,
  MANAGE_COMMENTS: 'manage:comments' as Permission,
  
  // Chat permissions
  READ_CHAT: 'read:chat' as Permission,
  WRITE_CHAT: 'write:chat' as Permission,
  DELETE_CHAT: 'delete:chat' as Permission,
  MANAGE_CHAT: 'manage:chat' as Permission,
  
  // Lecture permissions
  READ_LECTURES: 'read:lectures' as Permission,
  WRITE_LECTURES: 'write:lectures' as Permission,
  DELETE_LECTURES: 'delete:lectures' as Permission,
  MANAGE_LECTURES: 'manage:lectures' as Permission,
  
  // Admin permissions
  MANAGE_SYSTEM: 'manage:system' as Permission,
  MANAGE_CONTENT: 'manage:content' as Permission,
  MANAGE_NOTIFICATIONS: 'manage:notifications' as Permission,
  AUDIT_LOGS: 'audit:logs' as Permission,
  
  // Profile permissions
  READ_PROFILE: 'read:profile' as Permission,
  WRITE_PROFILE: 'write:profile' as Permission,
  DELETE_PROFILE: 'delete:profile' as Permission,
} as const;
