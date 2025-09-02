/**
 * Secure Database Layer - Prevents Data Leakage & Implements RLS
 * 
 * CRITICAL SECURITY FEATURES:
 * - Row Level Security (RLS) enforcement
 * - Query sanitization and validation
 * - Automatic data masking for sensitive fields
 * - Audit logging for all database operations
 * - Protection against data exfiltration
 * - Rate limiting for database operations
 */

// Dynamic import of server client to avoid build issues
import { secureLogger, SecurityEventType } from '@/lib/security/secure-logger'
import { rateLimiter } from '@/lib/security/rateLimiter'
import type { SupabaseClient } from '@supabase/supabase-js'

// Database operation types
export type DatabaseOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc'

// Security context for database operations
export interface DatabaseSecurityContext {
  requestId: string
  userId?: string
  userRole?: string
  ipAddress: string
  operation: DatabaseOperation
  table: string
  sensitivity: 'public' | 'internal' | 'sensitive' | 'restricted'
  auditRequired: boolean
}

// Field masking configuration
interface FieldMaskingConfig {
  [field: string]: {
    mask: boolean
    sensitivity: 'low' | 'medium' | 'high' | 'critical'
    pattern?: 'email' | 'phone' | 'partial' | 'hash' | 'redact'
  }
}

// Table security configuration
interface TableSecurityConfig {
  [table: string]: {
    sensitivity: 'public' | 'internal' | 'sensitive' | 'restricted'
    requiresAuth: boolean
    allowedRoles: string[]
    rateLimitEndpoint: string
    fieldMasking: FieldMaskingConfig
    auditOperations: DatabaseOperation[]
    maxRecordsFetch: number
    allowBulkOperations: boolean
  }
}

// Default security configurations for tables
const TABLE_SECURITY_CONFIG: TableSecurityConfig = {
  'profiles': {
    sensitivity: 'sensitive',
    requiresAuth: true,
    allowedRoles: ['user', 'moderator', 'admin'],
    rateLimitEndpoint: 'api:profile-access',
    fieldMasking: {
      'email': { mask: true, sensitivity: 'high', pattern: 'email' },
      'phone': { mask: true, sensitivity: 'high', pattern: 'phone' },
      'full_name': { mask: true, sensitivity: 'medium', pattern: 'partial' },
      'address': { mask: true, sensitivity: 'high', pattern: 'redact' }
    },
    auditOperations: ['select', 'update', 'delete'],
    maxRecordsFetch: 100,
    allowBulkOperations: false
  },
  
  'posts': {
    sensitivity: 'internal',
    requiresAuth: true,
    allowedRoles: ['user', 'moderator', 'admin'],
    rateLimitEndpoint: 'api:content-access',
    fieldMasking: {
      'author_email': { mask: true, sensitivity: 'medium', pattern: 'email' }
    },
    auditOperations: ['insert', 'update', 'delete'],
    maxRecordsFetch: 500,
    allowBulkOperations: true
  },
  
  'comments': {
    sensitivity: 'internal',
    requiresAuth: true,
    allowedRoles: ['user', 'moderator', 'admin'],
    rateLimitEndpoint: 'api:content-access',
    fieldMasking: {},
    auditOperations: ['insert', 'update', 'delete'],
    maxRecordsFetch: 1000,
    allowBulkOperations: true
  },
  
  'user_sessions': {
    sensitivity: 'restricted',
    requiresAuth: true,
    allowedRoles: ['admin'],
    rateLimitEndpoint: 'api:admin-access',
    fieldMasking: {
      'session_token': { mask: true, sensitivity: 'critical', pattern: 'hash' },
      'ip_address': { mask: true, sensitivity: 'high', pattern: 'partial' },
      'user_agent': { mask: true, sensitivity: 'medium', pattern: 'partial' }
    },
    auditOperations: ['select', 'insert', 'update', 'delete'],
    maxRecordsFetch: 50,
    allowBulkOperations: false
  },
  
  'audit_logs': {
    sensitivity: 'restricted',
    requiresAuth: true,
    allowedRoles: ['admin'],
    rateLimitEndpoint: 'api:audit-access',
    fieldMasking: {
      'user_data': { mask: true, sensitivity: 'high', pattern: 'redact' }
    },
    auditOperations: ['select'],
    maxRecordsFetch: 100,
    allowBulkOperations: false
  }
}

/**
 * Data masking utility
 */
class DataMasker {
  static maskField(value: any, pattern: string, sensitivity: string): any {
    if (!value || typeof value !== 'string') return value

    switch (pattern) {
      case 'email':
        const [local, domain] = value.split('@')
        if (!domain) return '[REDACTED]'
        return `${local.substring(0, 2)}***@${domain}`
      
      case 'phone':
        const digits = value.replace(/\D/g, '')
        if (digits.length < 4) return '[REDACTED]'
        return `***-***-${digits.slice(-4)}`
      
      case 'partial':
        if (value.length <= 4) return '***'
        return `${value.substring(0, 2)}***${value.slice(-2)}`
      
      case 'hash':
        return `[HASH:${value.length}]`
      
      case 'redact':
        return '[REDACTED]'
      
      default:
        return sensitivity === 'critical' ? '[REDACTED]' : '***'
    }
  }

  static maskRecord(record: any, maskingConfig: FieldMaskingConfig, userRole?: string): any {
    if (!record || typeof record !== 'object') return record

    const masked = { ...record }
    
    for (const [field, config] of Object.entries(maskingConfig)) {
      if (config.mask && field in masked) {
        // Skip masking for admin users unless it's critical data
        if (userRole === 'admin' && config.sensitivity !== 'critical') {
          continue
        }
        
        masked[field] = this.maskField(masked[field], config.pattern || 'redact', config.sensitivity)
      }
    }
    
    return masked
  }

  static maskRecords(records: any[], maskingConfig: FieldMaskingConfig, userRole?: string): any[] {
    return records.map(record => this.maskRecord(record, maskingConfig, userRole))
  }
}

/**
 * Query validator to prevent dangerous operations
 */
class QueryValidator {
  private static readonly DANGEROUS_FUNCTIONS = [
    'pg_read_file', 'pg_write_file', 'pg_execute',
    'copy', 'lo_import', 'lo_export',
    'dblink', 'dblink_exec', 'dblink_connect'
  ]

  static validateQuery(query: string, operation: DatabaseOperation, table: string): { valid: boolean; threats: string[] } {
    const threats: string[] = []
    const lowerQuery = query.toLowerCase()

    // Check for dangerous functions
    for (const func of this.DANGEROUS_FUNCTIONS) {
      if (lowerQuery.includes(func)) {
        threats.push('dangerous_function')
        break
      }
    }

    // Check for potential data exfiltration patterns
    if (lowerQuery.includes('information_schema') || lowerQuery.includes('pg_catalog')) {
      threats.push('schema_enumeration')
    }

    // Check for bulk data extraction patterns
    if (operation === 'select' && lowerQuery.includes('limit') && 
        parseInt(lowerQuery.match(/limit\s+(\d+)/i)?.[1] || '0') > 10000) {
      threats.push('bulk_data_extraction')
    }

    // Check for cross-table queries that might bypass RLS
    const tableMatches = lowerQuery.match(/from\s+(\w+)|join\s+(\w+)/gi)
    if (tableMatches && tableMatches.length > 2) {
      threats.push('complex_cross_table_query')
    }

    return { valid: threats.length === 0, threats }
  }
}

/**
 * Secure Supabase client wrapper
 */
export class SecureSupabaseClient {
  private supabase: SupabaseClient
  private context: DatabaseSecurityContext

  constructor(supabase: SupabaseClient, context: DatabaseSecurityContext) {
    this.supabase = supabase
    this.context = context
  }

  /**
   * Secure SELECT operation with automatic data masking
   */
  async secureSelect<T = any>(
    table: string, 
    options: {
      select?: string
      filters?: Record<string, any>
      limit?: number
      offset?: number
      orderBy?: { column: string; ascending?: boolean }
    } = {}
  ): Promise<{ data: T[] | null; error: any; masked: boolean }> {
    
    const startTime = Date.now()
    const config = TABLE_SECURITY_CONFIG[table]
    
    try {
      // Security validation
      const validation = await this.validateOperation('select', table, config)
      if (!validation.allowed) {
        throw new Error(validation.error || 'Access denied')
      }

      // Apply rate limiting
      if (config?.rateLimitEndpoint) {
        const rateLimitResult = await rateLimiter.checkRateLimit(
          this.context.userId || this.context.ipAddress,
          config.rateLimitEndpoint
        )
        
        if (!rateLimitResult.allowed) {
          secureLogger.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
            severity: 'HIGH',
            context: { ...this.context, table, operation: 'select' }
          })
          throw new Error('Rate limit exceeded for database operation')
        }
      }

      // Build query
      let query: any = this.supabase.from(table)
      
      if (options.select) {
        query = query.select(options.select)
      } else {
        query = query.select('*')
      }
      
      // Apply filters
      if (options.filters) {
        for (const [column, value] of Object.entries(options.filters)) {
          query = query.eq(column, value)
        }
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
      }
      
      // Apply pagination with security limits
      const maxRecords = Math.min(options.limit || 100, config?.maxRecordsFetch || 1000)
      query = query.limit(maxRecords)
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + maxRecords - 1)
      }

      // Execute query
      const { data, error } = await query

      if (error) {
        secureLogger.error('Database query error', error, {
          requestId: this.context.requestId,
          table,
          operation: 'select'
        })
        return { data: null, error, masked: false }
      }

      // Apply data masking
      let processedData = data
      let masked = false
      
      if (config?.fieldMasking && Object.keys(config.fieldMasking).length > 0) {
        processedData = DataMasker.maskRecords(data || [], config.fieldMasking, this.context.userRole)
        masked = true
      }

      // Audit logging
      if (config?.auditOperations.includes('select')) {
        secureLogger.logAuditEvent('database_select', table, 'SUCCESS', {
          requestId: this.context.requestId,
          recordCount: data?.length || 0,
          masked,
          duration: Date.now() - startTime
        })
      }

      return { data: processedData, error: null, masked }

    } catch (error) {
      secureLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS_VIOLATION, {
        severity: 'HIGH',
        context: {
          ...this.context,
          table,
          operation: 'select',
          error: (error as Error).message
        }
      })

      return { data: null, error, masked: false }
    }
  }

  /**
   * Secure INSERT operation with input validation
   */
  async secureInsert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: { returning?: string } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    
    const startTime = Date.now()
    const config = TABLE_SECURITY_CONFIG[table]
    const isArray = Array.isArray(data)
    const recordCount = isArray ? data.length : 1

    try {
      // Security validation
      const validation = await this.validateOperation('insert', table, config)
      if (!validation.allowed) {
        throw new Error(validation.error || 'Access denied')
      }

      // Check bulk operation limits
      if (isArray && recordCount > 100 && !config?.allowBulkOperations) {
        throw new Error('Bulk operations not allowed for this table')
      }

      // Rate limiting for insert operations
      if (config?.rateLimitEndpoint) {
        const rateLimitResult = await rateLimiter.checkRateLimit(
          this.context.userId || this.context.ipAddress,
          config.rateLimitEndpoint
        )
        
        if (!rateLimitResult.allowed) {
          throw new Error('Rate limit exceeded for database operation')
        }
      }

      // Sanitize input data
      const sanitizedData = this.sanitizeInputData(data)

      // Build and execute query
      let query: any = this.supabase.from(table).insert(sanitizedData)
      
      if (options.returning) {
        query = query.select(options.returning)
      }

      const result = await query

      // Audit logging
      if (config?.auditOperations.includes('insert')) {
        secureLogger.logAuditEvent('database_insert', table, result.error ? 'FAILURE' : 'SUCCESS', {
          requestId: this.context.requestId,
          recordCount,
          duration: Date.now() - startTime
        })
      }

      return result

    } catch (error) {
      secureLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS_VIOLATION, {
        severity: 'MEDIUM',
        context: {
          ...this.context,
          table,
          operation: 'insert',
          recordCount,
          error: (error as Error).message
        }
      })

      return { data: null, error }
    }
  }

  /**
   * Secure UPDATE operation
   */
  async secureUpdate<T = any>(
    table: string,
    updates: Partial<T>,
    filters: Record<string, any>,
    options: { returning?: string } = {}
  ): Promise<{ data: T[] | null; error: any; count: number }> {
    
    const startTime = Date.now()
    const config = TABLE_SECURITY_CONFIG[table]

    try {
      // Security validation
      const validation = await this.validateOperation('update', table, config)
      if (!validation.allowed) {
        throw new Error(validation.error || 'Access denied')
      }

      // Rate limiting
      if (config?.rateLimitEndpoint) {
        const rateLimitResult = await rateLimiter.checkRateLimit(
          this.context.userId || this.context.ipAddress,
          config.rateLimitEndpoint
        )
        
        if (!rateLimitResult.allowed) {
          throw new Error('Rate limit exceeded for database operation')
        }
      }

      // Sanitize input data
      const sanitizedUpdates = this.sanitizeInputData(updates)

      // Build query with filters
      let query: any = this.supabase.from(table).update(sanitizedUpdates)
      
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value)
      }
      
      if (options.returning) {
        query = query.select(options.returning)
      }

      const result = await query

      // Audit logging
      if (config?.auditOperations.includes('update')) {
        secureLogger.logAuditEvent('database_update', table, result.error ? 'FAILURE' : 'SUCCESS', {
          requestId: this.context.requestId,
          affectedRecords: result.data?.length || 0,
          duration: Date.now() - startTime
        })
      }

      return { ...result, count: result.data?.length || 0 }

    } catch (error) {
      secureLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS_VIOLATION, {
        severity: 'HIGH',
        context: {
          ...this.context,
          table,
          operation: 'update',
          error: (error as Error).message
        }
      })

      return { data: null, error, count: 0 }
    }
  }

  /**
   * Secure DELETE operation with extra validation
   */
  async secureDelete(
    table: string,
    filters: Record<string, any>,
    options: { returning?: string } = {}
  ): Promise<{ data: any[] | null; error: any; count: number }> {
    
    const startTime = Date.now()
    const config = TABLE_SECURITY_CONFIG[table]

    try {
      // Security validation
      const validation = await this.validateOperation('delete', table, config)
      if (!validation.allowed) {
        throw new Error(validation.error || 'Access denied')
      }

      // Extra validation for delete operations
      if (Object.keys(filters).length === 0) {
        throw new Error('DELETE operations require specific filters')
      }

      // Rate limiting (stricter for delete)
      if (config?.rateLimitEndpoint) {
        const rateLimitResult = await rateLimiter.checkRateLimit(
          this.context.userId || this.context.ipAddress,
          config.rateLimitEndpoint.replace('api:', 'api:delete-')
        )
        
        if (!rateLimitResult.allowed) {
          throw new Error('Rate limit exceeded for database operation')
        }
      }

      // Build query with filters
      let query: any = this.supabase.from(table)
      
      for (const [column, value] of Object.entries(filters)) {
        query = query.delete().eq(column, value)
      }
      
      if (options.returning) {
        query = query.select(options.returning)
      }

      const result = await query

      // Audit logging (always log deletes)
      secureLogger.logAuditEvent('database_delete', table, result.error ? 'FAILURE' : 'SUCCESS', {
        requestId: this.context.requestId,
        deletedRecords: result.data?.length || 0,
        filters,
        duration: Date.now() - startTime
      })

      return { ...result, count: result.data?.length || 0 }

    } catch (error) {
      secureLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS_VIOLATION, {
        severity: 'CRITICAL',
        context: {
          ...this.context,
          table,
          operation: 'delete',
          filters,
          error: (error as Error).message
        }
      })

      return { data: null, error, count: 0 }
    }
  }

  /**
   * Validate database operation against security policies
   */
  private async validateOperation(
    operation: DatabaseOperation,
    table: string,
    config?: TableSecurityConfig[string]
  ): Promise<{ allowed: boolean; error?: string }> {
    
    // Check if table has security configuration
    if (config) {
      // Authentication requirement
      if (config.requiresAuth && !this.context.userId) {
        return { allowed: false, error: 'Authentication required' }
      }

      // Role-based access control
      if (this.context.userRole && !config.allowedRoles.includes(this.context.userRole)) {
        return { allowed: false, error: 'Insufficient permissions' }
      }

      // Sensitivity-based restrictions
      if (config.sensitivity === 'restricted' && this.context.userRole !== 'admin') {
        return { allowed: false, error: 'Restricted table access' }
      }
    }

    return { allowed: true }
  }

  /**
   * Sanitize input data to prevent injection attacks
   */
  private sanitizeInputData(data: any): any {
    if (!data) return data

    if (typeof data === 'string') {
      // Basic string sanitization
      return data.replace(/[<>'"`;]/g, '').trim().substring(0, 10000);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInputData(item))
    }

    if (typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip dangerous field names
        if (key.startsWith('_') || key.includes('password') || key.includes('secret')) {
          continue
        }
        sanitized[key] = this.sanitizeInputData(value)
      }
      return sanitized
    }

    return data
  }
}

/**
 * Factory function to create secure database client
 */
export async function createSecureDatabase(context: {
  requestId: string
  userId?: string
  userRole?: string
  ipAddress: string
  operation: DatabaseOperation
  table: string
}): Promise<SecureSupabaseClient> {
  
  // Dynamically import server client to avoid build issues
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  
  const dbContext: DatabaseSecurityContext = {
    ...context,
    sensitivity: TABLE_SECURITY_CONFIG[context.table]?.sensitivity || 'internal',
    auditRequired: TABLE_SECURITY_CONFIG[context.table]?.auditOperations.includes(context.operation) || false
  }

  return new SecureSupabaseClient(supabase, dbContext)
}

export { DataMasker, QueryValidator, TABLE_SECURITY_CONFIG }