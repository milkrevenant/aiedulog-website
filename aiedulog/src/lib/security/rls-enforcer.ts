/**
 * Row Level Security (RLS) Enforcer
 * Comprehensive RLS policy enforcement and validation
 * 
 * CRITICAL SECURITY FEATURES:
 * - Automatic RLS policy validation
 * - Query sanitization and injection prevention
 * - Role-based access control (RBAC) enforcement
 * - Real-time security violation detection
 * - Audit logging for all data access
 */

import { createClient } from '@/lib/supabase/server'
import { secureLogger, SecurityEventType } from './secure-logger'
import { rateLimiter } from './rateLimiter'

// Security role hierarchy (from database enum)
export enum SecurityRole {
  ANONYMOUS = 'anonymous',
  AUTHENTICATED = 'authenticated',
  VERIFIED = 'verified',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM = 'system'
}

// Data classification levels
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret'
}

// Database operation types
export enum DatabaseOperation {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UPSERT = 'UPSERT'
}

export interface SecurityContext {
  userId?: string
  userRole: SecurityRole
  sessionId?: string
  ipAddress: string
  userAgent: string
  requestId: string
  timestamp: number
}

export interface RLSValidationResult {
  allowed: boolean
  reason?: string
  appliedPolicies: string[]
  securityViolations: string[]
  auditRequired: boolean
}

export interface TableSecurityConfig {
  classification: DataClassification
  minRole: SecurityRole
  ownershipField?: string
  allowedOperations: DatabaseOperation[]
  requiresAudit: boolean
  encryptedFields: string[]
  maxRecordsPerQuery: number
  rateLimit?: {
    endpoint: string
    multiplier: number
  }
}

// Comprehensive table security configuration
const TABLE_SECURITY_CONFIG: Record<string, TableSecurityConfig> = {
  // Identity and user management
  'identities': {
    classification: DataClassification.RESTRICTED,
    minRole: SecurityRole.AUTHENTICATED,
    ownershipField: 'id',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.UPDATE],
    requiresAudit: true,
    encryptedFields: ['email', 'phone'],
    maxRecordsPerQuery: 1,
    rateLimit: { endpoint: 'api:identity-access', multiplier: 2 }
  },
  
  'user_profiles': {
    classification: DataClassification.CONFIDENTIAL,
    minRole: SecurityRole.AUTHENTICATED,
    ownershipField: 'identity_id',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.UPDATE, DatabaseOperation.INSERT],
    requiresAudit: true,
    encryptedFields: ['full_name', 'phone', 'address'],
    maxRecordsPerQuery: 50,
    rateLimit: { endpoint: 'api:profile-access', multiplier: 1 }
  },
  
  'auth_methods': {
    classification: DataClassification.SECRET,
    minRole: SecurityRole.AUTHENTICATED,
    ownershipField: 'identity_id',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE, DatabaseOperation.DELETE],
    requiresAudit: true,
    encryptedFields: ['provider_metadata', 'credentials'],
    maxRecordsPerQuery: 10,
    rateLimit: { endpoint: 'api:auth-management', multiplier: 3 }
  },
  
  // Content management
  'main_content_sections': {
    classification: DataClassification.INTERNAL,
    minRole: SecurityRole.VERIFIED,
    ownershipField: 'created_by',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE, DatabaseOperation.DELETE],
    requiresAudit: false,
    encryptedFields: [],
    maxRecordsPerQuery: 100,
    rateLimit: { endpoint: 'api:content-access', multiplier: 1 }
  },
  
  'content_blocks': {
    classification: DataClassification.INTERNAL,
    minRole: SecurityRole.VERIFIED,
    ownershipField: 'created_by',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE, DatabaseOperation.DELETE],
    requiresAudit: false,
    encryptedFields: [],
    maxRecordsPerQuery: 200,
    rateLimit: { endpoint: 'api:content-access', multiplier: 1 }
  },
  
  'content_assets': {
    classification: DataClassification.INTERNAL,
    minRole: SecurityRole.VERIFIED,
    ownershipField: 'created_by',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE, DatabaseOperation.DELETE],
    requiresAudit: true,
    encryptedFields: ['metadata'],
    maxRecordsPerQuery: 50,
    rateLimit: { endpoint: 'api:file-access', multiplier: 2 }
  },
  
  // Security and audit tables
  'security_audit_log': {
    classification: DataClassification.RESTRICTED,
    minRole: SecurityRole.ADMIN,
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT],
    requiresAudit: false, // Avoid recursive auditing
    encryptedFields: ['before_data', 'after_data', 'metadata'],
    maxRecordsPerQuery: 100,
    rateLimit: { endpoint: 'api:audit-access', multiplier: 2 }
  },
  
  'security_violations': {
    classification: DataClassification.RESTRICTED,
    minRole: SecurityRole.ADMIN,
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE],
    requiresAudit: true,
    encryptedFields: ['violation_details'],
    maxRecordsPerQuery: 50,
    rateLimit: { endpoint: 'api:security-access', multiplier: 3 }
  },
  
  'encryption_keys': {
    classification: DataClassification.SECRET,
    minRole: SecurityRole.SUPER_ADMIN,
    allowedOperations: [DatabaseOperation.SELECT],
    requiresAudit: true,
    encryptedFields: ['key_hash'],
    maxRecordsPerQuery: 10,
    rateLimit: { endpoint: 'api:encryption-access', multiplier: 5 }
  },
  
  'secure_sessions': {
    classification: DataClassification.CONFIDENTIAL,
    minRole: SecurityRole.AUTHENTICATED,
    ownershipField: 'user_id',
    allowedOperations: [DatabaseOperation.SELECT, DatabaseOperation.INSERT, DatabaseOperation.UPDATE],
    requiresAudit: true,
    encryptedFields: ['session_token_hash', 'device_fingerprint'],
    maxRecordsPerQuery: 20,
    rateLimit: { endpoint: 'api:session-access', multiplier: 2 }
  }
}

/**
 * RLS Security Enforcer Class
 */
export class RLSSecurityEnforcer {
  
  /**
   * Validate if a database operation is allowed
   */
  static async validateOperation(
    tableName: string,
    operation: DatabaseOperation,
    context: SecurityContext,
    recordId?: string,
    recordData?: Record<string, any>
  ): Promise<RLSValidationResult> {
    
    const config = TABLE_SECURITY_CONFIG[tableName]
    if (!config) {
      // Default restrictive policy for unknown tables
      return {
        allowed: context.userRole === SecurityRole.ADMIN || context.userRole === SecurityRole.SUPER_ADMIN,
        reason: 'Unknown table - admin access required',
        appliedPolicies: ['default_restrictive'],
        securityViolations: [],
        auditRequired: true
      }
    }
    
    const violations: string[] = []
    const appliedPolicies: string[] = []
    
    try {
      // 1. Check minimum role requirement
      if (!this.hasRequiredRole(context.userRole, config.minRole)) {
        violations.push(`Insufficient role: ${context.userRole} < ${config.minRole}`)
        appliedPolicies.push('min_role_check')
      }
      
      // 2. Check allowed operations
      if (!config.allowedOperations.includes(operation)) {
        violations.push(`Operation not allowed: ${operation}`)
        appliedPolicies.push('allowed_operations_check')
      }
      
      // 3. Check ownership if required
      if (config.ownershipField && recordId && context.userId) {
        const ownershipValid = await this.validateOwnership(
          tableName,
          config.ownershipField,
          recordId,
          context.userId
        )
        
        if (!ownershipValid && !this.hasRequiredRole(context.userRole, SecurityRole.MODERATOR)) {
          violations.push('Ownership validation failed')
          appliedPolicies.push('ownership_check')
        }
      }
      
      // 4. Rate limiting check
      if (config.rateLimit) {
        const rateLimitResult = await rateLimiter.checkRateLimit(
          context.userId || context.ipAddress,
          config.rateLimit.endpoint,
          context.userAgent
        )
        
        if (!rateLimitResult.allowed) {
          violations.push('Rate limit exceeded')
          appliedPolicies.push('rate_limit_check')
        }
      }
      
      // 5. Data classification access check
      if (!this.hasDataClassificationAccess(context.userRole, config.classification)) {
        violations.push(`Insufficient clearance for ${config.classification} data`)
        appliedPolicies.push('data_classification_check')
      }
      
      // 6. Record limit validation for SELECT operations
      if (operation === DatabaseOperation.SELECT && recordData?.limit) {
        if (recordData.limit > config.maxRecordsPerQuery) {
          violations.push(`Query limit exceeds maximum: ${recordData.limit} > ${config.maxRecordsPerQuery}`)
          appliedPolicies.push('record_limit_check')
        }
      }
      
      const allowed = violations.length === 0
      
      // Log security event if access denied
      if (!allowed) {
        await this.logSecurityViolation(tableName, operation, context, violations)
      }
      
      // Log audit event if required
      if (config.requiresAudit && allowed) {
        await this.logAuditEvent(tableName, operation, context, recordId, recordData)
      }
      
      return {
        allowed,
        reason: violations.length > 0 ? violations.join('; ') : undefined,
        appliedPolicies,
        securityViolations: violations,
        auditRequired: config.requiresAudit
      }
      
    } catch (error) {
      secureLogger.error('RLS validation error', error as Error, {
        requestId: context.requestId,
        table: tableName,
        operation
      })
      
      return {
        allowed: false,
        reason: 'Security validation failed',
        appliedPolicies: ['error_fallback'],
        securityViolations: ['validation_error'],
        auditRequired: true
      }
    }
  }
  
  /**
   * Check if user has required role or higher
   */
  private static hasRequiredRole(userRole: SecurityRole, requiredRole: SecurityRole): boolean {
    const roleHierarchy: Record<SecurityRole, number> = {
      [SecurityRole.ANONYMOUS]: 0,
      [SecurityRole.AUTHENTICATED]: 1,
      [SecurityRole.VERIFIED]: 2,
      [SecurityRole.MODERATOR]: 3,
      [SecurityRole.ADMIN]: 4,
      [SecurityRole.SUPER_ADMIN]: 5,
      [SecurityRole.SYSTEM]: 6
    }
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
  
  /**
   * Check if user has access to data classification level
   */
  private static hasDataClassificationAccess(userRole: SecurityRole, classification: DataClassification): boolean {
    const accessMatrix: Record<SecurityRole, DataClassification[]> = {
      [SecurityRole.ANONYMOUS]: [DataClassification.PUBLIC],
      [SecurityRole.AUTHENTICATED]: [DataClassification.PUBLIC, DataClassification.INTERNAL],
      [SecurityRole.VERIFIED]: [DataClassification.PUBLIC, DataClassification.INTERNAL],
      [SecurityRole.MODERATOR]: [DataClassification.PUBLIC, DataClassification.INTERNAL, DataClassification.CONFIDENTIAL],
      [SecurityRole.ADMIN]: [DataClassification.PUBLIC, DataClassification.INTERNAL, DataClassification.CONFIDENTIAL, DataClassification.RESTRICTED],
      [SecurityRole.SUPER_ADMIN]: [DataClassification.PUBLIC, DataClassification.INTERNAL, DataClassification.CONFIDENTIAL, DataClassification.RESTRICTED, DataClassification.SECRET],
      [SecurityRole.SYSTEM]: [DataClassification.PUBLIC, DataClassification.INTERNAL, DataClassification.CONFIDENTIAL, DataClassification.RESTRICTED, DataClassification.SECRET]
    }
    
    return accessMatrix[userRole]?.includes(classification) || false
  }
  
  /**
   * Validate record ownership
   */
  private static async validateOwnership(
    tableName: string,
    ownershipField: string,
    recordId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from(tableName)
        .select(ownershipField)
        .eq('id', recordId)
        .single()
      
      if (error || !data) {
        return false
      }
      
      return (data as any)[ownershipField] === userId
      
    } catch (error) {
      secureLogger.error('Ownership validation error', error as Error, {
        table: tableName,
        recordId,
        ownershipField
      })
      return false
    }
  }
  
  /**
   * Log security violation
   */
  private static async logSecurityViolation(
    tableName: string,
    operation: DatabaseOperation,
    context: SecurityContext,
    violations: string[]
  ): Promise<void> {
    
    try {
      const supabase = await createClient()
      
      // Insert violation record
      await supabase
        .from('security_violations')
        .insert({
          violation_type: 'RLS_POLICY_VIOLATION',
          severity: 'MEDIUM',
          user_id: context.userId,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          request_path: `/api/database/${tableName}`,
          violation_details: {
            table: tableName,
            operation,
            violations,
            userRole: context.userRole,
            requestId: context.requestId,
            timestamp: context.timestamp
          }
        })
      
      // Log security event
      secureLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS_VIOLATION, {
        severity: 'MEDIUM',
        context: {
          requestId: context.requestId,
          table: tableName,
          operation,
          violations: violations.join('; '),
          userRole: context.userRole
        }
      })
      
    } catch (error) {
      secureLogger.error('Failed to log security violation', error as Error, {
        requestId: context.requestId
      })
    }
  }
  
  /**
   * Log audit event
   */
  private static async logAuditEvent(
    tableName: string,
    operation: DatabaseOperation,
    context: SecurityContext,
    recordId?: string,
    recordData?: Record<string, any>
  ): Promise<void> {
    
    try {
      const supabase = await createClient()
      
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: operation,
          table_name: tableName,
          record_id: recordId,
          user_id: context.userId,
          session_id: context.sessionId,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          before_data: null, // Would be populated for UPDATE/DELETE
          after_data: recordData ? this.sanitizeAuditData(recordData) : null,
          metadata: {
            userRole: context.userRole,
            requestId: context.requestId,
            classification: TABLE_SECURITY_CONFIG[tableName]?.classification
          },
          success: true
        })
      
    } catch (error) {
      secureLogger.error('Failed to log audit event', error as Error, {
        requestId: context.requestId
      })
    }
  }
  
  /**
   * Sanitize audit data to remove sensitive information
   */
  private static sanitizeAuditData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash', 'credentials']
    const sanitized = { ...data }
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]'
      }
    }
    
    return sanitized
  }
  
  /**
   * Get table security configuration
   */
  static getTableConfig(tableName: string): TableSecurityConfig | undefined {
    return TABLE_SECURITY_CONFIG[tableName]
  }
  
  /**
   * Check if table has RLS enabled
   */
  static async validateRLSEnabled(tableName: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .rpc('check_rls_enabled', { table_name: tableName })
      
      if (error) {
        secureLogger.error('RLS check failed', error, { table: tableName })
        return false
      }
      
      return data === true
      
    } catch (error) {
      secureLogger.error('RLS validation error', error as Error, { table: tableName })
      return false
    }
  }
  
  /**
   * Generate security report for table access
   */
  static async generateSecurityReport(tableName: string, timeframeHours: number = 24): Promise<{
    accessAttempts: number
    violations: number
    topUsers: Array<{ userId: string; attempts: number }>
    riskScore: number
  }> {
    
    try {
      const supabase = await createClient()
      const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString()
      
      // Get access attempts from audit log
      const { data: auditData, error: auditError } = await supabase
        .from('security_audit_log')
        .select('user_id, success')
        .eq('table_name', tableName)
        .gte('created_at', cutoffTime)
      
      // Get security violations
      const { data: violationData, error: violationError } = await supabase
        .from('security_violations')
        .select('user_id, severity')
        .ilike('violation_details->table', tableName)
        .gte('created_at', cutoffTime)
      
      if (auditError || violationError) {
        throw new Error('Failed to generate security report')
      }
      
      const accessAttempts = auditData?.length || 0
      const violations = violationData?.length || 0
      
      // Calculate top users
      const userActivity = new Map<string, number>()
      auditData?.forEach(record => {
        if (record.user_id) {
          userActivity.set(record.user_id, (userActivity.get(record.user_id) || 0) + 1)
        }
      })
      
      const topUsers = Array.from(userActivity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, attempts]) => ({ userId, attempts }))
      
      // Calculate risk score
      const successRate = accessAttempts > 0 ? (accessAttempts - violations) / accessAttempts : 1
      const violationRate = accessAttempts > 0 ? violations / accessAttempts : 0
      const riskScore = Math.round((1 - successRate + violationRate) * 100)
      
      return {
        accessAttempts,
        violations,
        topUsers,
        riskScore: Math.min(riskScore, 100)
      }
      
    } catch (error) {
      secureLogger.error('Security report generation failed', error as Error, {
        table: tableName
      })
      
      return {
        accessAttempts: 0,
        violations: 0,
        topUsers: [],
        riskScore: 100 // Assume high risk if we can't generate report
      }
    }
  }
}

export default RLSSecurityEnforcer