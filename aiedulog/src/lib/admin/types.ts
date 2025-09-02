/**
 * Enterprise Admin Management System Types
 * Comprehensive TypeScript types for admin operations
 */

// ============================================================================
// 1. AUDIT SYSTEM TYPES
// ============================================================================

export interface AuditLog {
  readonly id: string;
  readonly event_type: AuditEventType;
  readonly event_category: AuditEventCategory;
  readonly actor_type: ActorType;
  readonly actor_id?: string;
  readonly actor_ip_address?: string;
  readonly actor_user_agent?: string;
  readonly target_type?: TargetType;
  readonly target_id?: string;
  readonly resource_type?: string;
  readonly resource_id?: string;
  readonly action: string;
  readonly description: string;
  readonly metadata: Record<string, any>;
  readonly severity: AuditSeverity;
  readonly session_id?: string;
  readonly request_id?: string;
  readonly correlation_id?: string;
  readonly before_state?: Record<string, any>;
  readonly after_state?: Record<string, any>;
  readonly success: boolean;
  readonly error_message?: string;
  readonly created_at: string;
  readonly retention_until: string;
  readonly is_gdpr_relevant: boolean;
  readonly gdpr_subject_id?: string;
}

export type AuditEventType = 
  | 'user_created' | 'user_updated' | 'user_deleted' | 'user_archived'
  | 'content_created' | 'content_updated' | 'content_deleted' | 'content_moderated'
  | 'role_assigned' | 'role_revoked' | 'permission_granted' | 'permission_revoked'
  | 'login_success' | 'login_failed' | 'password_reset' | 'account_locked'
  | 'admin_action' | 'system_maintenance' | 'data_export' | 'data_import'
  | 'policy_violation' | 'security_incident';

export type AuditEventCategory = 
  | 'authentication' | 'authorization' | 'user_management' | 'content_management'
  | 'system_administration' | 'security' | 'compliance' | 'maintenance';

export type ActorType = 'user' | 'admin' | 'system' | 'api';
export type TargetType = 'user' | 'content' | 'system' | 'role' | 'permission';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// ============================================================================
// 2. ADMIN ROLES AND PERMISSIONS TYPES
// ============================================================================

export interface AdminRole {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly level: number;
  readonly is_system_role: boolean;
  readonly created_at: string;
  readonly created_by?: string;
  readonly updated_at: string;
  readonly updated_by?: string;
  readonly is_active: boolean;
  readonly constraints: Record<string, any>;
}

export interface AdminPermission {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly resource_type: string;
  readonly action: string;
  readonly scope: PermissionScope;
  readonly conditions: Record<string, any>;
  readonly is_dangerous: boolean;
  readonly created_at: string;
  readonly is_active: boolean;
}

export type PermissionScope = 'global' | 'organization' | 'department' | 'self';

export interface AdminRolePermission {
  readonly id: string;
  readonly role_id: string;
  readonly permission_id: string;
  readonly granted_at: string;
  readonly granted_by?: string;
  readonly conditions: Record<string, any>;
}

export interface AdminUserRole {
  readonly id: string;
  readonly user_id: string;
  readonly role_id: string;
  readonly assigned_at: string;
  readonly assigned_by?: string;
  readonly expires_at?: string;
  readonly is_active: boolean;
  readonly conditions: Record<string, any>;
}

// ============================================================================
// 3. CONTENT MANAGEMENT TYPES
// ============================================================================

export interface ContentModeration {
  readonly id: string;
  readonly content_type: ContentType;
  readonly content_id: string;
  readonly status: ModerationStatus;
  readonly moderated_by?: string;
  readonly moderated_at?: string;
  readonly created_at: string;
  readonly reason?: string;
  readonly ai_score?: number;
  readonly ai_flags: string[];
  readonly user_reports: number;
  readonly severity: AuditSeverity;
  readonly actions_taken: ModerationAction[];
  readonly metadata: Record<string, any>;
}

export type ContentType = 
  | 'lecture' | 'announcement' | 'news' | 'regular_meeting' | 'training_program'
  | 'chat_message' | 'comment' | 'user_profile' | 'file_upload';

export type ModerationStatus = 
  | 'pending' | 'approved' | 'rejected' | 'flagged' | 'under_review' | 'auto_approved';

export interface ModerationAction {
  readonly action: string;
  readonly timestamp: string;
  readonly moderator_id?: string;
  readonly details?: Record<string, any>;
}

export interface ContentVersion {
  readonly id: string;
  readonly content_type: string;
  readonly content_id: string;
  readonly version_number: number;
  readonly content_data: Record<string, any>;
  readonly created_at: string;
  readonly created_by?: string;
  readonly change_summary?: string;
  readonly is_major_version: boolean;
  readonly approved_by?: string;
  readonly approved_at?: string;
  readonly rollback_reason?: string;
  readonly metadata: Record<string, any>;
}

// ============================================================================
// 4. USER MANAGEMENT TYPES
// ============================================================================

export interface UserActivity {
  readonly id: string;
  readonly user_id: string;
  readonly activity_type: UserActivityType;
  readonly resource_type?: string;
  readonly resource_id?: string;
  readonly ip_address?: string;
  readonly user_agent?: string;
  readonly session_id?: string;
  readonly created_at: string;
  readonly metadata: Record<string, any>;
}

export type UserActivityType = 
  | 'login' | 'logout' | 'content_view' | 'content_create' | 'content_edit'
  | 'content_delete' | 'file_upload' | 'message_send' | 'profile_update';

export interface UserStatusHistory {
  readonly id: string;
  readonly user_id: string;
  readonly old_status?: string;
  readonly new_status: string;
  readonly changed_at: string;
  readonly changed_by?: string;
  readonly reason: string;
  readonly duration_days?: number;
  readonly auto_revert_at?: string;
  readonly metadata: Record<string, any>;
}

export interface ArchivedData {
  readonly id: string;
  readonly table_name: string;
  readonly record_id: string;
  readonly archived_data: Record<string, any>;
  readonly archived_at: string;
  readonly archived_by?: string;
  readonly archive_reason: ArchiveReason;
  readonly retention_until?: string;
  readonly can_be_restored: boolean;
  readonly restored_at?: string;
  readonly restored_by?: string;
  readonly permanent_deletion_scheduled?: string;
  readonly metadata: Record<string, any>;
}

export type ArchiveReason = 
  | 'user_deletion' | 'gdpr_request' | 'content_moderation'
  | 'admin_action' | 'policy_violation' | 'data_retention';

// ============================================================================
// 5. GDPR AND COMPLIANCE TYPES
// ============================================================================

export interface UserDataRequest {
  readonly id: string;
  readonly user_id?: string;
  readonly request_type: DataRequestType;
  readonly status: DataRequestStatus;
  readonly requested_at: string;
  readonly requested_by?: string;
  readonly processed_at?: string;
  readonly processed_by?: string;
  readonly completion_deadline: string;
  readonly notes?: string;
  readonly exported_data?: Record<string, any>;
  readonly affected_tables: string[];
  readonly verification_required: boolean;
  readonly verification_completed: boolean;
  readonly verification_method?: string;
  readonly metadata: Record<string, any>;
}

export type DataRequestType = 
  | 'data_export' | 'data_deletion' | 'data_portability' | 'consent_withdrawal'
  | 'rectification' | 'processing_restriction';

export type DataRequestStatus = 
  | 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

// ============================================================================
// 6. SYSTEM MONITORING TYPES
// ============================================================================

export interface SystemMetric {
  readonly id: string;
  readonly metric_type: MetricType;
  readonly metric_name: string;
  readonly metric_value?: number;
  readonly metric_unit?: string;
  readonly collected_at: string;
  readonly metadata: Record<string, any>;
}

export type MetricType = 'performance' | 'security' | 'usage' | 'error_rate' | 'capacity';

export interface AdminSession {
  readonly id: string;
  readonly admin_user_id: string;
  readonly session_token: string;
  readonly ip_address: string;
  readonly user_agent?: string;
  readonly created_at: string;
  readonly last_activity: string;
  readonly expires_at: string;
  readonly is_active: boolean;
  readonly login_method: LoginMethod;
  readonly security_level: SecurityLevel;
  readonly metadata: Record<string, any>;
}

export type LoginMethod = 'password' | 'mfa' | 'sso';
export type SecurityLevel = 'standard' | 'elevated' | 'critical';

// ============================================================================
// 7. API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly timestamp: string;
  readonly request_id?: string;
  readonly correlation_id?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
    readonly has_next: boolean;
    readonly has_prev: boolean;
  };
}

export interface CreateAuditLogRequest {
  readonly event_type: AuditEventType;
  readonly event_category: AuditEventCategory;
  readonly actor_type: ActorType;
  readonly action: string;
  readonly description: string;
  readonly target_type?: TargetType;
  readonly target_id?: string;
  readonly resource_type?: string;
  readonly resource_id?: string;
  readonly metadata?: Record<string, any>;
  readonly severity?: AuditSeverity;
  readonly before_state?: Record<string, any>;
  readonly after_state?: Record<string, any>;
}

export interface UserManagementRequest {
  readonly user_id: string;
  readonly action: 'archive' | 'delete' | 'restore' | 'suspend' | 'activate';
  readonly reason: string;
  readonly archive_data?: boolean;
  readonly correlation_id?: string;
}

export interface ContentModerationRequest {
  readonly content_type: ContentType;
  readonly content_id: string;
  readonly status: ModerationStatus;
  readonly reason?: string;
  readonly actions_taken?: ModerationAction[];
}

export interface RoleAssignmentRequest {
  readonly user_id: string;
  readonly role_name: string;
  readonly expires_at?: string;
  readonly conditions?: Record<string, any>;
}

// ============================================================================
// 8. FILTER AND SEARCH TYPES
// ============================================================================

export interface AuditLogFilters {
  readonly event_type?: AuditEventType[];
  readonly event_category?: AuditEventCategory[];
  readonly actor_id?: string;
  readonly target_type?: TargetType;
  readonly target_id?: string;
  readonly severity?: AuditSeverity[];
  readonly date_from?: string;
  readonly date_to?: string;
  readonly success?: boolean;
  readonly search_query?: string;
}

export interface UserSearchFilters {
  readonly email?: string;
  readonly role?: string;
  readonly status?: string;
  readonly created_from?: string;
  readonly created_to?: string;
  readonly last_activity_from?: string;
  readonly last_activity_to?: string;
  readonly search_query?: string;
}

export interface ContentSearchFilters {
  readonly content_type?: ContentType[];
  readonly status?: ModerationStatus[];
  readonly created_from?: string;
  readonly created_to?: string;
  readonly moderator_id?: string;
  readonly severity?: AuditSeverity[];
  readonly search_query?: string;
}

// ============================================================================
// 9. DASHBOARD AND ANALYTICS TYPES
// ============================================================================

export interface AdminDashboardStats {
  readonly user_stats: {
    readonly total_users: number;
    readonly active_users: number;
    readonly new_users_today: number;
    readonly new_users_this_week: number;
    readonly suspended_users: number;
  };
  readonly content_stats: {
    readonly total_content: number;
    readonly pending_moderation: number;
    readonly flagged_content: number;
    readonly approved_today: number;
    readonly rejected_today: number;
  };
  readonly system_stats: {
    readonly audit_events_today: number;
    readonly security_incidents: number;
    readonly gdpr_requests_pending: number;
    readonly system_health_score: number;
  };
  readonly activity_trends: {
    readonly daily_active_users: Array<{ date: string; count: number }>;
    readonly content_creation: Array<{ date: string; count: number }>;
    readonly moderation_actions: Array<{ date: string; approved: number; rejected: number }>;
  };
}

export interface SecurityAlert {
  readonly id: string;
  readonly type: 'failed_login_attempts' | 'suspicious_activity' | 'data_breach' | 'policy_violation';
  readonly severity: AuditSeverity;
  readonly message: string;
  readonly affected_user_id?: string;
  readonly created_at: string;
  readonly resolved: boolean;
  readonly resolved_at?: string;
  readonly resolved_by?: string;
  readonly metadata: Record<string, any>;
}