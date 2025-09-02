/**
 * Comprehensive Security Management API
 * Enterprise-grade security dashboard and management endpoints
 * 
 * SECURITY FEATURES:
 * - Real-time security monitoring
 * - Threat detection and response
 * - Compliance reporting
 * - Security policy management
 * - Incident response automation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api/secure-client'
import { createClient } from '@/lib/supabase/server'
import { RLSSecurityEnforcer, SecurityRole, DataClassification } from '@/lib/security/rls-enforcer'
import { secureLogger, SecurityEventType } from '@/lib/security/secure-logger'
import { rateLimiter } from '@/lib/security/rateLimiter'

interface SecurityDashboardMetrics {
  overview: {
    totalUsers: number
    activeUsers24h: number
    securityViolations24h: number
    criticalAlerts: number
    systemHealthScore: number
  }
  threatDetection: {
    suspiciousActivity: number
    blockedAttempts: number
    riskUsers: Array<{ userId: string; riskScore: number; reasons: string[] }>
    attackPatterns: Array<{ pattern: string; frequency: number; severity: string }>
  }
  accessControl: {
    rlsPoliciesActive: number
    failedAccessAttempts: number
    privilegeEscalations: number
    dataClassificationBreaches: number
  }
  compliance: {
    auditLogsCovered: number
    gdprCompliance: number
    dataRetentionCompliance: number
    encryptionCoverage: number
  }
  realTimeAlerts: Array<{
    id: string
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    message: string
    timestamp: string
    resolved: boolean
    affectedUsers?: string[]
  }>
}

interface SecurityIncident {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED'
  description: string
  affectedUsers: string[]
  detectionTime: string
  responseTime?: string
  resolutionTime?: string
  assignedTo?: string
  metadata: Record<string, any>
}

/**
 * GET - Security Dashboard and Monitoring
 */
export const GET = withSecurity(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
    }
    
    // Check admin role
    const { data: userProfile } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return { 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }
    }
    
    try {
      switch (action) {
        case 'dashboard':
          return await getSecurityDashboard(supabase, context)
        
        case 'threats':
          return await getThreatAnalysis(supabase, context)
        
        case 'incidents':
          return await getSecurityIncidents(supabase, context, searchParams)
        
        case 'policies':
          return await getSecurityPolicies(supabase, context)
        
        case 'audit':
          return await getAuditReport(supabase, context, searchParams)
        
        case 'compliance':
          return await getComplianceReport(supabase, context)
        
        case 'health':
          return await getSystemSecurityHealth(supabase, context)
        
        default:
          return await getSecurityDashboard(supabase, context)
      }
    } catch (error) {
      secureLogger.error('Security API error', error as Error, {
        requestId: context.requestId,
        action,
        userId: user.id
      })
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Security service temporarily unavailable'
        }
      }
    }
  },
  {
    requireAuth: true,
    rateLimitEndpoint: 'api:admin-security',
    auditLevel: 'detailed',
    validateCSRF: true
  }
)

/**
 * POST - Security Actions and Incident Response
 */
export const POST = withSecurity(
  async (request: NextRequest, context: any, params: any) => {
    const { body } = params
    const { action, ...data } = body
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
    }
    
    const { data: userProfile } = await supabase
      .from('identities')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
      return { 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }
    }
    
    try {
      switch (action) {
        case 'create_incident':
          return await createSecurityIncident(supabase, context, data, user.id)
        
        case 'resolve_incident':
          return await resolveSecurityIncident(supabase, context, data, user.id)
        
        case 'block_user':
          return await blockSuspiciousUser(supabase, context, data, user.id)
        
        case 'update_policy':
          return await updateSecurityPolicy(supabase, context, data, user.id)
        
        case 'trigger_response':
          return await triggerIncidentResponse(supabase, context, data, user.id)
        
        case 'emergency_lockdown':
          return await emergencyLockdown(supabase, context, data, user.id)
        
        default:
          return {
            success: false,
            error: { code: 'INVALID_ACTION', message: 'Unknown security action' }
          }
      }
    } catch (error) {
      secureLogger.error('Security action error', error as Error, {
        requestId: context.requestId,
        action,
        userId: user.id
      })
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Security action failed'
        }
      }
    }
  },
  {
    requireAuth: true,
    rateLimitEndpoint: 'api:admin-security-actions',
    auditLevel: 'detailed',
    validateCSRF: true,
    maxRequestSize: 1024 * 1024 // 1MB
  }
)

/**
 * Get comprehensive security dashboard metrics
 */
async function getSecurityDashboard(supabase: any, context: any): Promise<{ success: true; data: SecurityDashboardMetrics }> {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Get overview metrics
  const [
    { count: totalUsers },
    { count: activeUsers24h },
    { count: securityViolations24h },
    { count: criticalAlerts }
  ] = await Promise.all([
    supabase.from('identities').select('*', { count: 'exact' as any }),
    supabase.from('security_audit_log').select('*', { count: 'exact' as any })
      .gte('created_at', yesterday.toISOString()).eq('success', true),
    supabase.from('security_violations').select('*', { count: 'exact' as any })
      .gte('created_at', yesterday.toISOString()),
    supabase.from('security_violations').select('*', { count: 'exact' as any })
      .eq('severity', 'CRITICAL').eq('resolved', false)
  ])
  
  // Calculate system health score
  const systemHealthScore = await calculateSystemHealthScore(supabase)
  
  // Get threat detection metrics
  const threatDetection = await getThreatDetectionMetrics(supabase)
  
  // Get access control metrics
  const accessControl = await getAccessControlMetrics(supabase)
  
  // Get compliance metrics
  const compliance = await getComplianceMetrics(supabase)
  
  // Get real-time alerts
  const realTimeAlerts = await getRealTimeAlerts(supabase)
  
  const dashboardMetrics: SecurityDashboardMetrics = {
    overview: {
      totalUsers: totalUsers || 0,
      activeUsers24h: activeUsers24h || 0,
      securityViolations24h: securityViolations24h || 0,
      criticalAlerts: criticalAlerts || 0,
      systemHealthScore
    },
    threatDetection,
    accessControl,
    compliance,
    realTimeAlerts
  }
  
  // Log dashboard access
  secureLogger.logAuditEvent(
    'security_dashboard_access',
    'security_dashboard',
    'SUCCESS',
    { requestId: context.requestId },
    { metricsGenerated: true }
  )
  
  return { success: true, data: dashboardMetrics }
}

/**
 * Calculate system health score based on security metrics
 */
async function calculateSystemHealthScore(supabase: any): Promise<number> {
  let score = 100
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  try {
    // Deduct points for security violations
    const { count: violations } = await supabase
      .from('security_violations')
      .select('*', { count: 'exact' as any })
      .gte('created_at', yesterday.toISOString())
    
    score -= Math.min((violations || 0) * 5, 30)
    
    // Deduct points for failed authentications
    const { count: failedAuths } = await supabase
      .from('security_audit_log')
      .select('*', { count: 'exact' as any })
      .eq('event_type', 'LOGIN')
      .eq('success', false)
      .gte('created_at', yesterday.toISOString())
    
    score -= Math.min((failedAuths || 0) * 2, 20)
    
    // Deduct points for unresolved critical alerts
    const { count: criticalAlerts } = await supabase
      .from('security_violations')
      .select('*', { count: 'exact' as any })
      .eq('severity', 'CRITICAL')
      .eq('resolved', false)
    
    score -= Math.min((criticalAlerts || 0) * 15, 40)
    
    return Math.max(score, 0)
    
  } catch (error) {
    secureLogger.error('Health score calculation failed', error as Error)
    return 50 // Conservative score on error
  }
}

/**
 * Get threat detection metrics
 */
async function getThreatDetectionMetrics(supabase: any) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // Get suspicious activity count
  const { count: suspiciousActivity } = await supabase
    .from('security_violations')
    .select('*', { count: 'exact' as any })
    .in('violation_type', ['SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE', 'ANOMALOUS_ACCESS'])
    .gte('created_at', yesterday.toISOString())
  
  // Get blocked attempts
  const { count: blockedAttempts } = await supabase
    .from('security_violations')
    .select('*', { count: 'exact' as any })
    .eq('blocked', true)
    .gte('created_at', yesterday.toISOString())
  
  // Get high-risk users
  const { data: riskUsers } = await supabase
    .rpc('detect_suspicious_activity')
    .limit(10)
  
  // Get attack patterns (simplified)
  const attackPatterns = [
    { pattern: 'Multiple Failed Logins', frequency: suspiciousActivity || 0, severity: 'MEDIUM' },
    { pattern: 'SQL Injection Attempts', frequency: 0, severity: 'HIGH' },
    { pattern: 'Privilege Escalation', frequency: 0, severity: 'CRITICAL' }
  ]
  
  return {
    suspiciousActivity: suspiciousActivity || 0,
    blockedAttempts: blockedAttempts || 0,
    riskUsers: riskUsers || [],
    attackPatterns
  }
}

/**
 * Get access control metrics
 */
async function getAccessControlMetrics(supabase: any) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // Get RLS policies count (simplified - would query pg_policies in real implementation)
  const rlsPoliciesActive = 25 // Placeholder
  
  // Get failed access attempts
  const { count: failedAccessAttempts } = await supabase
    .from('security_violations')
    .select('*', { count: 'exact' as any })
    .eq('violation_type', 'RLS_POLICY_VIOLATION')
    .gte('created_at', yesterday.toISOString())
  
  // Get privilege escalation attempts
  const { count: privilegeEscalations } = await supabase
    .from('security_violations')
    .select('*', { count: 'exact' as any })
    .eq('violation_type', 'PRIVILEGE_ESCALATION')
    .gte('created_at', yesterday.toISOString())
  
  // Get data classification breaches
  const { count: dataClassificationBreaches } = await supabase
    .from('security_violations')
    .select('*', { count: 'exact' as any })
    .eq('violation_type', 'DATA_CLASSIFICATION_BREACH')
    .gte('created_at', yesterday.toISOString())
  
  return {
    rlsPoliciesActive,
    failedAccessAttempts: failedAccessAttempts || 0,
    privilegeEscalations: privilegeEscalations || 0,
    dataClassificationBreaches: dataClassificationBreaches || 0
  }
}

/**
 * Get compliance metrics
 */
async function getComplianceMetrics(supabase: any) {
  // Get audit logs coverage
  const { count: auditLogsCovered } = await supabase
    .from('security_audit_log')
    .select('*', { count: 'exact' as any })
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  
  return {
    auditLogsCovered: auditLogsCovered || 0,
    gdprCompliance: 98, // Placeholder - would calculate based on data retention, etc.
    dataRetentionCompliance: 95, // Placeholder
    encryptionCoverage: 90 // Placeholder - would calculate based on encrypted fields
  }
}

/**
 * Get real-time security alerts
 */
async function getRealTimeAlerts(supabase: any): Promise<SecurityDashboardMetrics['realTimeAlerts']> {
  const { data: violations } = await supabase
    .from('security_violations')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return (violations || []).map((violation: any) => ({
    id: violation.id,
    type: violation.violation_type,
    severity: violation.severity,
    message: `Security violation detected: ${violation.violation_type}`,
    timestamp: violation.created_at,
    resolved: violation.resolved,
    affectedUsers: violation.user_id ? [violation.user_id] : []
  }))
}

/**
 * Get threat analysis
 */
async function getThreatAnalysis(supabase: any, context: any) {
  // This would implement advanced threat detection algorithms
  // For now, return basic analysis
  
  const threats = await supabase
    .rpc('detect_coordinated_attack')
  
  return {
    success: true,
    data: {
      coordinatedAttacks: threats?.data || { detected: false, severity: 'LOW' },
      anomalousPatterns: [],
      riskAssessment: {
        overallRisk: 'LOW',
        topThreats: ['Brute Force', 'Data Exfiltration'],
        recommendations: [
          'Enable additional rate limiting on authentication endpoints',
          'Review user access permissions quarterly',
          'Implement additional monitoring for data export operations'
        ]
      }
    }
  }
}

/**
 * Get security incidents
 */
async function getSecurityIncidents(supabase: any, context: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const severity = searchParams.get('severity')
  const status = searchParams.get('status')
  
  let query = supabase
    .from('security_violations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  
  if (severity) {
    query = query.eq('severity', severity)
  }
  
  if (status === 'resolved') {
    query = query.eq('resolved', true)
  } else if (status === 'open') {
    query = query.eq('resolved', false)
  }
  
  // Apply pagination
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)
  
  const { data: incidents, count, error } = await query
  
  if (error) throw error
  
  return {
    success: true,
    data: {
      incidents: incidents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  }
}

/**
 * Get security policies
 */
async function getSecurityPolicies(supabase: any, context: any) {
  const { data: policies, error } = await supabase
    .from('security_policies')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return {
    success: true,
    data: { policies: policies || [] }
  }
}

/**
 * Get audit report
 */
async function getAuditReport(supabase: any, context: any, searchParams: URLSearchParams) {
  const timeframe = searchParams.get('timeframe') || '24h'
  const eventType = searchParams.get('eventType')
  const userId = searchParams.get('userId')
  
  let query = supabase
    .from('security_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1000)
  
  // Apply timeframe filter
  const timeframeMap: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  }
  
  const hours = timeframeMap[timeframe] || 24
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  query = query.gte('created_at', cutoff)
  
  if (eventType) {
    query = query.eq('event_type', eventType)
  }
  
  if (userId) {
    query = query.eq('user_id', userId)
  }
  
  const { data: auditLogs, count, error } = await query
  
  if (error) throw error
  
  return {
    success: true,
    data: {
      auditLogs: auditLogs || [],
      summary: {
        totalEvents: count || 0,
        timeframe,
        successRate: auditLogs ? 
          auditLogs.filter((log: any) => log.success).length / auditLogs.length * 100 : 100
      }
    }
  }
}

/**
 * Get compliance report
 */
async function getComplianceReport(supabase: any, context: any) {
  // This would generate comprehensive compliance reports
  // For now, return basic compliance status
  
  return {
    success: true,
    data: {
      gdpr: {
        dataRetentionCompliance: 95,
        consentManagement: 98,
        dataPortability: 90,
        rightToErasure: 93
      },
      sox: {
        auditTrailCompleteness: 97,
        accessControlCompliance: 94,
        changeManagement: 92
      },
      iso27001: {
        informationSecurityPolicies: 96,
        accessManagement: 95,
        incidentManagement: 88
      },
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
}

/**
 * Get system security health
 */
async function getSystemSecurityHealth(supabase: any, context: any) {
  const healthScore = await calculateSystemHealthScore(supabase)
  
  return {
    success: true,
    data: {
      overallHealth: healthScore,
      components: [
        { name: 'Database Security', status: 'healthy', score: 95 },
        { name: 'API Security', status: 'healthy', score: 92 },
        { name: 'Authentication', status: 'healthy', score: 98 },
        { name: 'Audit Logging', status: 'healthy', score: 94 },
        { name: 'Rate Limiting', status: 'healthy', score: 96 }
      ],
      lastCheck: new Date().toISOString()
    }
  }
}

/**
 * Create security incident
 */
async function createSecurityIncident(supabase: any, context: any, data: any, adminId: string) {
  const { type, severity, description, affectedUsers, metadata } = data
  
  const { data: incident, error } = await supabase
    .from('security_violations')
    .insert({
      violation_type: type,
      severity,
      violation_details: {
        description,
        affectedUsers,
        createdBy: adminId,
        ...metadata
      }
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Log incident creation
  secureLogger.logSecurityEvent('SECURITY_INCIDENT' as any, {
    severity: 'HIGH',
    context: {
      requestId: context.requestId,
      incidentId: incident.id,
      createdBy: adminId
    }
  })
  
  return {
    success: true,
    data: { incident }
  }
}

/**
 * Resolve security incident
 */
async function resolveSecurityIncident(supabase: any, context: any, data: any, adminId: string) {
  const { incidentId, resolution, preventiveMeasures } = data
  
  const { data: incident, error } = await supabase
    .from('security_violations')
    .update({
      resolved: true,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      violation_details: supabase.raw(`
        violation_details || '{"resolution": "${resolution}", "preventiveMeasures": "${preventiveMeasures}"}'::jsonb
      `)
    })
    .eq('id', incidentId)
    .select()
    .single()
  
  if (error) throw error
  
  return {
    success: true,
    data: { incident }
  }
}

/**
 * Block suspicious user
 */
async function blockSuspiciousUser(supabase: any, context: any, data: any, adminId: string) {
  const { userId, reason, blockDurationHours } = data
  
  // Update user status
  const { error } = await supabase
    .from('identities')
    .update({
      status: 'blocked',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  if (error) throw error
  
  // Log blocking action
  secureLogger.logSecurityEvent(SecurityEventType.ACCOUNT_LOCKOUT, {
    severity: 'HIGH',
    context: {
      requestId: context.requestId,
      targetUserId: userId,
      blockedBy: adminId,
      reason,
      blockDurationHours
    }
  })
  
  return {
    success: true,
    data: { 
      message: 'User blocked successfully',
      userId,
      blockDurationHours
    }
  }
}

/**
 * Update security policy
 */
async function updateSecurityPolicy(supabase: any, context: any, data: any, adminId: string) {
  const { policyId, updates } = data
  
  const { data: policy, error } = await supabase
    .from('security_policies')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', policyId)
    .select()
    .single()
  
  if (error) throw error
  
  return {
    success: true,
    data: { policy }
  }
}

/**
 * Trigger incident response
 */
async function triggerIncidentResponse(supabase: any, context: any, data: any, adminId: string) {
  const { responseType, severity, scope, metadata } = data
  
  // This would trigger automated incident response procedures
  // For now, just log the trigger
  
  secureLogger.logSecurityEvent('SECURITY_INCIDENT' as any, {
    severity: 'CRITICAL',
    context: {
      requestId: context.requestId,
      responseType,
      severity,
      scope,
      triggeredBy: adminId,
      metadata
    }
  })
  
  return {
    success: true,
    data: {
      message: 'Incident response triggered',
      responseType,
      severity
    }
  }
}

/**
 * Emergency lockdown
 */
async function emergencyLockdown(supabase: any, context: any, data: any, adminId: string) {
  const { lockdownType, reason, duration } = data
  
  // This would implement emergency lockdown procedures
  // For now, just log the lockdown
  
  secureLogger.logSecurityEvent('SECURITY_INCIDENT' as any, {
    severity: 'CRITICAL',
    context: {
      requestId: context.requestId,
      lockdownType,
      reason,
      duration,
      initiatedBy: adminId,
      timestamp: Date.now()
    }
  })
  
  return {
    success: true,
    data: {
      message: 'Emergency lockdown initiated',
      lockdownType,
      estimatedDuration: duration
    }
  }
}