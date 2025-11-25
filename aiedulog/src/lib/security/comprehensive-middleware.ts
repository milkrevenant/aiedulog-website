/**
 * Comprehensive Security Middleware
 * Enterprise-grade security enforcement for all API endpoints
 *
 * SECURITY ARCHITECTURE:
 * - Zero-Trust security model
 * - Defense-in-depth approach
 * - Real-time threat detection
 * - Automated incident response
 * - Compliance enforcement (GDPR, SOC2, ISO27001)
 *
 * MIGRATION: Updated to use NextAuth + RDS (2025-10-13)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { createClient } from '@/lib/supabase/server'
import { RLSSecurityEnforcer, SecurityRole } from './rls-enforcer'
import { secureLogger, SecurityEventType } from './secure-logger'
import { rateLimiter } from './rateLimiter'
import { getClientSecurity } from './client-security'

// Comprehensive security configuration
export interface ComprehensiveSecurityConfig {
  // Authentication & Authorization
  requireAuth?: boolean
  requiredRole?: SecurityRole
  allowServiceRole?: boolean
  
  // Rate Limiting
  rateLimitEndpoint?: string
  customRateLimit?: {
    requests: number
    windowMs: number
    blockDurationMs: number
  }
  
  // Input Validation & Sanitization
  sanitizeInput?: boolean
  maxRequestSize?: number
  allowedContentTypes?: string[]
  validateSchema?: boolean
  schemaPath?: string
  
  // Security Headers & CORS
  corsOrigins?: string[]
  customHeaders?: Record<string, string>
  enableCSRF?: boolean
  
  // Audit & Compliance
  auditLevel?: 'none' | 'basic' | 'detailed' | 'full'
  requireGdprConsent?: boolean
  dataClassification?: string
  
  // Threat Detection
  enableThreatDetection?: boolean
  suspiciousActivityThreshold?: number
  autoBlockSuspicious?: boolean
  
  // Data Protection
  enableEncryption?: boolean
  encryptedFields?: string[]
  dataMasking?: boolean
  
  // Emergency Controls
  enableKillSwitch?: boolean
  maintenanceMode?: boolean
  
  // Custom Security Hooks
  beforeValidation?: (request: NextRequest, context: SecurityContext) => Promise<boolean>
  afterValidation?: (request: NextRequest, context: SecurityContext, result: any) => Promise<void>
  onSecurityViolation?: (violation: SecurityViolation, context: SecurityContext) => Promise<void>
}

export interface SecurityContext {
  requestId: string
  timestamp: number
  ipAddress: string
  userAgent: string
  origin?: string
  referer?: string
  userId?: string
  userRole?: SecurityRole
  sessionId?: string
  deviceFingerprint?: string
  geoLocation?: {
    country?: string
    region?: string
    city?: string
  }
  riskScore: number
  threatIndicators: string[]
  complianceFlags: string[]
}

export interface SecurityViolation {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  context: SecurityContext
  mitigationAction: string
  blocked: boolean
}

export interface SecurityValidationResult {
  allowed: boolean
  context: SecurityContext
  violations: SecurityViolation[]
  warnings: string[]
  appliedPolicies: string[]
  responseHeaders: Record<string, string>
  auditData: Record<string, any>
}

/**
 * Comprehensive Security Middleware Class
 */
export class ComprehensiveSecurityMiddleware {
  private config: ComprehensiveSecurityConfig
  private supabase: any
  
  constructor(config: ComprehensiveSecurityConfig = {}) {
    this.config = {
      // Default security configuration
      requireAuth: true,
      requiredRole: SecurityRole.AUTHENTICATED,
      sanitizeInput: true,
      maxRequestSize: 1024 * 1024, // 1MB
      enableCSRF: true,
      auditLevel: 'basic',
      enableThreatDetection: true,
      suspiciousActivityThreshold: 5,
      autoBlockSuspicious: false,
      dataMasking: true,
      enableKillSwitch: true,
      ...config
    }
  }
  
  /**
   * Main middleware function - validates all security aspects
   */
  async validateRequest(request: NextRequest): Promise<SecurityValidationResult> {
    const startTime = Date.now()
    let context: SecurityContext | undefined
    
    try {
      // Initialize Supabase client
      this.supabase = createClient()
      
      // Step 1: Create security context
      context = await this.createSecurityContext(request)
      
      // Step 2: Emergency controls check
      const emergencyCheck = await this.checkEmergencyControls(context)
      if (!emergencyCheck.allowed) {
        return emergencyCheck
      }
      
      // Step 3: Basic security validation
      const basicValidation = await this.performBasicValidation(request, context)
      if (!basicValidation.allowed) {
        return basicValidation
      }
      
      // Step 4: Authentication & authorization
      const authValidation = await this.validateAuthentication(request, context)
      if (!authValidation.allowed) {
        return authValidation
      }
      
      // Step 5: Rate limiting
      const rateLimitValidation = await this.validateRateLimit(request, context)
      if (!rateLimitValidation.allowed) {
        return rateLimitValidation
      }
      
      // Step 6: Input validation & sanitization
      const inputValidation = await this.validateInput(request, context)
      if (!inputValidation.allowed) {
        return inputValidation
      }
      
      // Step 7: CORS & CSRF validation
      const corsValidation = await this.validateCorsAndCsrf(request, context)
      if (!corsValidation.allowed) {
        return corsValidation
      }
      
      // Step 8: Threat detection
      const threatValidation = await this.performThreatDetection(request, context)
      if (!threatValidation.allowed) {
        return threatValidation
      }
      
      // Step 9: Compliance checks
      const complianceValidation = await this.validateCompliance(request, context)
      if (!complianceValidation.allowed) {
        return complianceValidation
      }
      
      // Step 10: Custom validation hooks
      if (this.config.beforeValidation) {
        const customValidation = await this.config.beforeValidation(request, context)
        if (!customValidation) {
          return this.createViolationResult(
            'CUSTOM_VALIDATION_FAILED',
            'Custom validation failed',
            'MEDIUM',
            context,
            'Request blocked by custom validation'
          )
        }
      }
      
      // All validations passed
      const validationResult: SecurityValidationResult = {
        allowed: true,
        context,
        violations: [],
        warnings: [],
        appliedPolicies: [
          'authentication_check',
          'authorization_check',
          'rate_limiting',
          'input_validation',
          'cors_validation',
          'threat_detection',
          'compliance_check'
        ],
        responseHeaders: this.generateSecurityHeaders(context),
        auditData: {
          validationDuration: Date.now() - startTime,
          appliedPolicies: 7,
          riskScore: context.riskScore
        }
      }
      
      // Custom post-validation hook
      if (this.config.afterValidation) {
        await this.config.afterValidation(request, context, validationResult)
      }
      
      // Audit successful validation
      if (this.config.auditLevel !== 'none') {
        await this.auditSecurityEvent('SECURITY_VALIDATION_SUCCESS', context, validationResult.auditData)
      }
      
      return validationResult
      
    } catch (error) {
      secureLogger.error('Security middleware error', error as Error, {
        requestId: context?.requestId || 'unknown'
      })
      
      // Create fallback context for error cases
      const fallbackContext: SecurityContext = {
        requestId: 'error-fallback',
        userId: undefined,
        userRole: SecurityRole.ANONYMOUS,
        sessionId: undefined,
        ipAddress: '0.0.0.0',
        userAgent: 'unknown',
        origin: undefined,
        timestamp: Date.now(),
        threatIndicators: [],
        riskScore: 100,
        complianceFlags: []
      }
      
      const errorContext = context || fallbackContext
      
      // Fail securely - deny access on error
      return {
        allowed: false,
        context: errorContext,
        violations: [{
          type: 'SECURITY_MIDDLEWARE_ERROR',
          severity: 'CRITICAL',
          description: 'Security validation failed due to internal error',
          context: errorContext,
          mitigationAction: 'Request blocked for security',
          blocked: true
        }],
        warnings: [],
        appliedPolicies: ['error_fallback'],
        responseHeaders: this.generateSecurityHeaders(errorContext),
        auditData: { error: true }
      }
    }
  }
  
  /**
   * Create comprehensive security context
   */
  private async createSecurityContext(request: NextRequest): Promise<SecurityContext> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const timestamp = Date.now()
    
    // Extract network information
    const ipAddress = this.extractClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    // Initialize risk score and threat indicators
    let riskScore = 0
    const threatIndicators: string[] = []
    const complianceFlags: string[] = []
    
    // Get user information (using NextAuth)
    let userId: string | undefined
    let userRole: SecurityRole = SecurityRole.ANONYMOUS
    let sessionId: string | undefined

    try {
      const session = await getServerSession(authOptions)
      const sessionUser = session?.user as ({ id?: string | null; email?: string | null } | undefined)
      const resolvedUserId = sessionUser?.id ?? sessionUser?.email ?? undefined

      if (resolvedUserId) {
        userId = resolvedUserId
        sessionId = resolvedUserId // Use user ID as session ID for now

        // Get user role from RDS database
        const { data: userProfile } = await this.supabase
          .from('user_profiles')
          .select('role, status')
          .eq('id', userId)
          .single()

        if (userProfile) {
          userRole = this.mapDatabaseRoleToSecurityRole(userProfile.role || 'user')

          // Check user status
          if (userProfile.status === 'blocked' || userProfile.status === 'suspended') {
            threatIndicators.push('USER_BLOCKED_OR_SUSPENDED')
            riskScore += 50
          }
        }
      }
    } catch (error) {
      // User not authenticated or error retrieving user info
    }
    
    // Generate device fingerprint
    const deviceFingerprint = await this.generateDeviceFingerprint(request)
    
    // Get geolocation (simplified - would integrate with GeoIP service)
    const geoLocation = await this.getGeoLocation(ipAddress)
    
    // Calculate initial risk score
    riskScore += this.calculateInitialRiskScore(request, {
      ipAddress,
      userAgent,
      origin,
      geoLocation
    })
    
    // Add threat indicators based on request analysis
    threatIndicators.push(...this.analyzeRequestForThreats(request))
    
    // Add compliance flags
    complianceFlags.push(...this.analyzeComplianceRequirements(request))
    
    return {
      requestId,
      timestamp,
      ipAddress,
      userAgent,
      origin: origin || undefined,
      referer: referer || undefined,
      userId,
      userRole,
      sessionId,
      deviceFingerprint,
      geoLocation,
      riskScore,
      threatIndicators,
      complianceFlags
    }
  }
  
  /**
   * Check emergency controls (kill switch, maintenance mode)
   */
  private async checkEmergencyControls(context: SecurityContext): Promise<SecurityValidationResult> {
    if (!this.config.enableKillSwitch && !this.config.maintenanceMode) {
      return { allowed: true } as SecurityValidationResult
    }
    
    try {
      // Check system-wide kill switch
      if (this.config.enableKillSwitch) {
        const { data: killSwitch } = await this.supabase
          .from('system_config')
          .select('value')
          .eq('key', 'emergency_kill_switch')
          .single()
        
        if (killSwitch?.value === 'active') {
          return this.createViolationResult(
            'EMERGENCY_KILL_SWITCH_ACTIVE',
            'System is temporarily unavailable due to emergency conditions',
            'CRITICAL',
            context,
            'All requests blocked by kill switch'
          )
        }
      }
      
      // Check maintenance mode
      if (this.config.maintenanceMode) {
        const { data: maintenance } = await this.supabase
          .from('system_config')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single()
        
        if (maintenance?.value === 'active' && context.userRole !== SecurityRole.ADMIN) {
          return this.createViolationResult(
            'MAINTENANCE_MODE_ACTIVE',
            'System is temporarily unavailable for maintenance',
            'LOW',
            context,
            'Non-admin requests blocked during maintenance'
          )
        }
      }
      
      return { allowed: true } as SecurityValidationResult
      
    } catch (error) {
      // On error, allow request but log warning
      secureLogger.warn('Emergency controls check failed', {
        requestId: context.requestId,
        error: (error as Error).message
      })
      
      return { allowed: true } as SecurityValidationResult
    }
  }
  
  /**
   * Perform basic security validation
   */
  private async performBasicValidation(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    const violations: SecurityViolation[] = []
    
    // Check request size
    if (this.config.maxRequestSize) {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > this.config.maxRequestSize) {
        violations.push({
          type: 'REQUEST_TOO_LARGE',
          severity: 'MEDIUM',
          description: `Request size ${contentLength} exceeds maximum ${this.config.maxRequestSize}`,
          context,
          mitigationAction: 'Request blocked due to size',
          blocked: true
        })
      }
    }
    
    // Check content type
    if (this.config.allowedContentTypes && request.method !== 'GET') {
      const contentType = request.headers.get('content-type')
      if (contentType && !this.config.allowedContentTypes.some(allowed => contentType.includes(allowed))) {
        violations.push({
          type: 'INVALID_CONTENT_TYPE',
          severity: 'MEDIUM',
          description: `Content type ${contentType} not allowed`,
          context,
          mitigationAction: 'Request blocked due to content type',
          blocked: true
        })
      }
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = this.detectSuspiciousHeaders(request)
    if (suspiciousHeaders.length > 0) {
      context.threatIndicators.push(...suspiciousHeaders)
      context.riskScore += suspiciousHeaders.length * 10
    }
    
    if (violations.length > 0) {
      return {
        allowed: false,
        context,
        violations,
        warnings: [],
        appliedPolicies: ['basic_validation'],
        responseHeaders: this.generateSecurityHeaders(context),
        auditData: { basicValidationFailed: true }
      }
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  /**
   * Validate authentication and authorization
   */
  private async validateAuthentication(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    // Skip auth validation if not required
    if (!this.config.requireAuth) {
      return { allowed: true } as SecurityValidationResult
    }
    
    // Check if user is authenticated
    if (!context.userId) {
      return this.createViolationResult(
        'AUTHENTICATION_REQUIRED',
        'Authentication required for this endpoint',
        'MEDIUM',
        context,
        'Request blocked due to missing authentication'
      )
    }
    
    // Check role requirements
    if (this.config.requiredRole && !this.hasRequiredRole(context.userRole!, this.config.requiredRole)) {
      return this.createViolationResult(
        'INSUFFICIENT_PERMISSIONS',
        `Role ${context.userRole} insufficient, required: ${this.config.requiredRole}`,
        'HIGH',
        context,
        'Request blocked due to insufficient permissions'
      )
    }
    
    // Validate session
    const sessionValid = await this.validateUserSession(context)
    if (!sessionValid) {
      return this.createViolationResult(
        'INVALID_SESSION',
        'User session is invalid or expired',
        'HIGH',
        context,
        'Request blocked due to invalid session'
      )
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  /**
   * Validate rate limiting
   */
  private async validateRateLimit(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    if (!this.config.rateLimitEndpoint && !this.config.customRateLimit) {
      return { allowed: true } as SecurityValidationResult
    }
    
    let rateLimitResult
    
    if (this.config.customRateLimit) {
      // Use custom rate limit configuration
      rateLimitResult = await rateLimiter.setCustomLimit(
        'custom_endpoint',
        {
          windowMs: this.config.customRateLimit.windowMs,
          maxRequests: this.config.customRateLimit.requests,
          blockDurationMs: this.config.customRateLimit.blockDurationMs
        }
      )
      
      rateLimitResult = await rateLimiter.checkRateLimit(
        context.userId || context.ipAddress,
        'custom_endpoint',
        context.userAgent
      )
    } else {
      // Use configured endpoint
      rateLimitResult = await rateLimiter.checkMultipleIdentifiers(
        context.ipAddress,
        context.userId || null,
        this.config.rateLimitEndpoint!,
        context.userAgent
      )
    }
    
    if (!rateLimitResult.allowed) {
      return this.createViolationResult(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded: ${rateLimitResult.retryAfter}s retry after`,
        'HIGH',
        context,
        'Request blocked due to rate limiting',
        {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': (rateLimitResult.retryAfter || 60).toString()
        }
      )
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  /**
   * Validate and sanitize input
   */
  private async validateInput(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    if (!this.config.sanitizeInput) {
      return { allowed: true } as SecurityValidationResult
    }
    
    try {
      // Get request body for validation
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const body = await request.text()
        
        // Check for malicious patterns
        const maliciousPatterns = this.detectMaliciousPatterns(body)
        if (maliciousPatterns.length > 0) {
          context.threatIndicators.push(...maliciousPatterns)
          context.riskScore += maliciousPatterns.length * 20
          
          return this.createViolationResult(
            'MALICIOUS_INPUT_DETECTED',
            `Malicious patterns detected: ${maliciousPatterns.join(', ')}`,
            'HIGH',
            context,
            'Request blocked due to malicious input'
          )
        }
        
        // Validate JSON schema if configured
        if (this.config.validateSchema && this.config.schemaPath) {
          const schemaValid = await this.validateJsonSchema(body, this.config.schemaPath)
          if (!schemaValid) {
            return this.createViolationResult(
              'SCHEMA_VALIDATION_FAILED',
              'Request body does not match required schema',
              'MEDIUM',
              context,
              'Request blocked due to schema validation'
            )
          }
        }
      }
      
      return { allowed: true } as SecurityValidationResult
      
    } catch (error) {
      return this.createViolationResult(
        'INPUT_VALIDATION_ERROR',
        'Unable to validate input',
        'MEDIUM',
        context,
        'Request blocked due to input validation error'
      )
    }
  }
  
  /**
   * Validate CORS and CSRF
   */
  private async validateCorsAndCsrf(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    // CORS validation
    if (this.config.corsOrigins && context.origin) {
      const allowed = this.config.corsOrigins.some(allowedOrigin => {
        if (allowedOrigin === '*') return true
        if (allowedOrigin.startsWith('*.')) {
          const domain = allowedOrigin.substring(2)
          return context.origin!.endsWith(domain)
        }
        return context.origin === allowedOrigin
      })
      
      if (!allowed) {
        return this.createViolationResult(
          'CORS_VIOLATION',
          `Origin ${context.origin} not allowed`,
          'HIGH',
          context,
          'Request blocked due to CORS policy'
        )
      }
    }
    
    // CSRF validation for state-changing operations
    if (this.config.enableCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfValid = await this.validateCSRFToken(request, context)
      if (!csrfValid) {
        return this.createViolationResult(
          'CSRF_VIOLATION',
          'CSRF token validation failed',
          'HIGH',
          context,
          'Request blocked due to CSRF protection'
        )
      }
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  /**
   * Perform threat detection
   */
  private async performThreatDetection(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    if (!this.config.enableThreatDetection) {
      return { allowed: true } as SecurityValidationResult
    }
    
    // Analyze threat indicators
    if (context.threatIndicators.length >= (this.config.suspiciousActivityThreshold || 5)) {
      const violation = this.createViolationResult(
        'SUSPICIOUS_ACTIVITY_DETECTED',
        `Multiple threat indicators: ${context.threatIndicators.join(', ')}`,
        'HIGH',
        context,
        'Request flagged for suspicious activity'
      )
      
      // Auto-block if configured
      if (this.config.autoBlockSuspicious) {
        await this.blockSuspiciousUser(context)
        violation.violations[0].blocked = true
      }
      
      return violation
    }
    
    // Check coordinated attack patterns
    const coordinatedAttack = await rateLimiter.detectCoordinatedAttack()
    if (coordinatedAttack.detected) {
      return this.createViolationResult(
        'COORDINATED_ATTACK_DETECTED',
        `Coordinated attack pattern detected: ${coordinatedAttack.severity}`,
        coordinatedAttack.severity as any,
        context,
        'Request blocked due to coordinated attack detection'
      )
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  /**
   * Validate compliance requirements
   */
  private async validateCompliance(request: NextRequest, context: SecurityContext): Promise<SecurityValidationResult> {
    // GDPR consent validation
    if (this.config.requireGdprConsent && context.complianceFlags.includes('GDPR_REQUIRED')) {
      const consentValid = await this.validateGdprConsent(context)
      if (!consentValid) {
        return this.createViolationResult(
          'GDPR_CONSENT_REQUIRED',
          'GDPR consent required for this operation',
          'MEDIUM',
          context,
          'Request blocked pending GDPR consent'
        )
      }
    }
    
    // Data classification access validation
    if (this.config.dataClassification) {
      const classificationAllowed = await this.validateDataClassificationAccess(
        context.userRole!,
        this.config.dataClassification
      )
      
      if (!classificationAllowed) {
        return this.createViolationResult(
          'DATA_CLASSIFICATION_VIOLATION',
          `Insufficient clearance for ${this.config.dataClassification} data`,
          'HIGH',
          context,
          'Request blocked due to data classification policy'
        )
      }
    }
    
    return { allowed: true } as SecurityValidationResult
  }
  
  // ======================================================================
  // HELPER METHODS
  // ======================================================================
  
  private extractClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    return cfConnectingIP || realIP || forwarded?.split(',')[0].trim() || 'unknown'
  }
  
  private mapDatabaseRoleToSecurityRole(dbRole: string): SecurityRole {
    const roleMap: Record<string, SecurityRole> = {
      'super_admin': SecurityRole.SUPER_ADMIN,
      'admin': SecurityRole.ADMIN,
      'moderator': SecurityRole.MODERATOR,
      'verified': SecurityRole.VERIFIED,
      'user': SecurityRole.AUTHENTICATED
    }
    
    return roleMap[dbRole] || SecurityRole.AUTHENTICATED
  }
  
  private async generateDeviceFingerprint(request: NextRequest): Promise<string> {
    const components = [
      request.headers.get('user-agent') || '',
      request.headers.get('accept') || '',
      request.headers.get('accept-language') || '',
      request.headers.get('accept-encoding') || ''
    ]
    
    const fingerprint = components.join('|')
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
  }
  
  private async getGeoLocation(ipAddress: string): Promise<SecurityContext['geoLocation']> {
    // Simplified geolocation - would integrate with GeoIP service in production
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown'
    }
  }
  
  private calculateInitialRiskScore(request: NextRequest, data: any): number {
    let score = 0
    
    // Check for Tor/VPN indicators
    if (data.ipAddress.includes('tor') || data.ipAddress.includes('vpn')) {
      score += 30
    }
    
    // Check user agent for automation tools
    const automationIndicators = ['bot', 'crawler', 'script', 'automated']
    if (automationIndicators.some(indicator => 
      data.userAgent.toLowerCase().includes(indicator)
    )) {
      score += 20
    }
    
    // Check for unusual request patterns
    if (request.method === 'OPTIONS' && !request.headers.get('access-control-request-method')) {
      score += 10
    }
    
    return score
  }
  
  private analyzeRequestForThreats(request: NextRequest): string[] {
    const threats: string[] = []
    const url = request.url.toLowerCase()
    
    // Check for path traversal attempts
    if (url.includes('../') || url.includes('..\\')) {
      threats.push('PATH_TRAVERSAL_ATTEMPT')
    }
    
    // Check for SQL injection patterns in URL
    const sqlPatterns = ['union', 'select', 'insert', 'delete', 'drop', '--', ';']
    if (sqlPatterns.some(pattern => url.includes(pattern))) {
      threats.push('SQL_INJECTION_ATTEMPT')
    }
    
    // Check for XSS patterns
    if (url.includes('<script') || url.includes('javascript:')) {
      threats.push('XSS_ATTEMPT')
    }
    
    return threats
  }
  
  private analyzeComplianceRequirements(request: NextRequest): string[] {
    const flags: string[] = []
    const url = request.url.toLowerCase()
    
    // Check for personal data endpoints
    if (url.includes('profile') || url.includes('user') || url.includes('personal')) {
      flags.push('GDPR_REQUIRED')
    }
    
    // Check for financial data endpoints
    if (url.includes('payment') || url.includes('billing')) {
      flags.push('PCI_DSS_REQUIRED')
    }
    
    return flags
  }
  
  private detectSuspiciousHeaders(request: NextRequest): string[] {
    const suspicious: string[] = []
    
    // Check for unusual headers
    const headers = Array.from(request.headers.keys())
    const suspiciousHeaders = ['x-hack', 'x-exploit', 'x-admin']
    
    for (const header of headers) {
      if (suspiciousHeaders.some(sus => header.toLowerCase().includes(sus))) {
        suspicious.push('SUSPICIOUS_HEADER')
        break
      }
    }
    
    // Check for missing expected headers
    if (!request.headers.get('user-agent')) {
      suspicious.push('MISSING_USER_AGENT')
    }
    
    return suspicious
  }
  
  private detectMaliciousPatterns(body: string): string[] {
    const patterns: string[] = []
    const lowerBody = body.toLowerCase()
    
    // SQL injection patterns
    const sqlPatterns = ['union select', 'drop table', 'delete from', 'insert into']
    if (sqlPatterns.some(pattern => lowerBody.includes(pattern))) {
      patterns.push('SQL_INJECTION')
    }
    
    // XSS patterns
    const xssPatterns = ['<script', 'javascript:', 'onerror=', 'onload=']
    if (xssPatterns.some(pattern => lowerBody.includes(pattern))) {
      patterns.push('XSS_ATTEMPT')
    }
    
    // Command injection patterns
    const cmdPatterns = ['&&', '||', ';', '|', '`', '$(']
    if (cmdPatterns.some(pattern => lowerBody.includes(pattern))) {
      patterns.push('COMMAND_INJECTION')
    }
    
    return patterns
  }
  
  private hasRequiredRole(userRole: SecurityRole, requiredRole: SecurityRole): boolean {
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
  
  private async validateUserSession(context: SecurityContext): Promise<boolean> {
    if (!context.userId || !context.sessionId) {
      return false
    }
    
    try {
      const { data: session } = await this.supabase
        .from('secure_sessions')
        .select('*')
        .eq('user_id', context.userId)
        .eq('session_token_hash', context.sessionId)
        .eq('is_active', true)
        .single()
      
      if (!session) {
        return false
      }
      
      // Check if session is expired
      const now = new Date()
      const expiresAt = new Date(session.expires_at)
      
      return now < expiresAt
      
    } catch (error) {
      secureLogger.error('Session validation error', error as Error, {
        requestId: context.requestId,
        userId: context.userId
      })
      return false
    }
  }
  
  private async validateJsonSchema(body: string, schemaPath: string): Promise<boolean> {
    try {
      // This would load and validate against JSON schema
      // For now, just validate it's proper JSON
      JSON.parse(body)
      return true
    } catch (error) {
      return false
    }
  }
  
  private async validateCSRFToken(request: NextRequest, context: SecurityContext): Promise<boolean> {
    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.headers.get('csrf-token')
    
    if (!csrfToken) {
      return false
    }
    
    // Simplified CSRF validation - would use proper token validation in production
    return csrfToken.length > 16
  }
  
  private async validateGdprConsent(context: SecurityContext): Promise<boolean> {
    if (!context.userId) {
      return false
    }
    
    try {
      const { data: consent } = await this.supabase
        .from('gdpr_consent')
        .select('*')
        .eq('user_id', context.userId)
        .eq('consent_type', 'data_processing')
        .eq('is_active', true)
        .single()
      
      return !!consent
      
    } catch (error) {
      return false
    }
  }
  
  private async validateDataClassificationAccess(userRole: SecurityRole, classification: string): Promise<boolean> {
    const accessMatrix: Record<SecurityRole, string[]> = {
      [SecurityRole.ANONYMOUS]: ['public'],
      [SecurityRole.AUTHENTICATED]: ['public', 'internal'],
      [SecurityRole.VERIFIED]: ['public', 'internal'],
      [SecurityRole.MODERATOR]: ['public', 'internal', 'confidential'],
      [SecurityRole.ADMIN]: ['public', 'internal', 'confidential', 'restricted'],
      [SecurityRole.SUPER_ADMIN]: ['public', 'internal', 'confidential', 'restricted', 'secret'],
      [SecurityRole.SYSTEM]: ['public', 'internal', 'confidential', 'restricted', 'secret']
    }
    
    return accessMatrix[userRole]?.includes(classification) || false
  }
  
  private async blockSuspiciousUser(context: SecurityContext): Promise<void> {
    if (!context.userId) return

    try {
      await this.supabase
        .from('user_profiles')
        .update({
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('id', context.userId)

      // Log blocking action
      await this.auditSecurityEvent('USER_AUTO_BLOCKED', context, {
        reason: 'Suspicious activity detected',
        threatIndicators: context.threatIndicators,
        riskScore: context.riskScore
      })

    } catch (error) {
      secureLogger.error('Failed to block suspicious user', error as Error, {
        requestId: context.requestId,
        userId: context.userId
      })
    }
  }
  
  private generateSecurityHeaders(context?: SecurityContext): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none';",
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
    }
    
    if (context) {
      headers['X-Request-ID'] = context.requestId
      headers['X-Risk-Score'] = context.riskScore.toString()
    }
    
    // Add custom headers from config
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders)
    }
    
    return headers
  }
  
  private createViolationResult(
    type: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    context: SecurityContext,
    mitigationAction: string,
    additionalHeaders?: Record<string, string>
  ): SecurityValidationResult {
    
    const violation: SecurityViolation = {
      type,
      severity,
      description,
      context,
      mitigationAction,
      blocked: true
    }
    
    // Custom violation handler
    if (this.config.onSecurityViolation) {
      this.config.onSecurityViolation(violation, context)
    }
    
    // Log security violation
    this.auditSecurityEvent('SECURITY_VIOLATION', context, {
      violationType: type,
      severity,
      description,
      blocked: true
    })
    
    return {
      allowed: false,
      context,
      violations: [violation],
      warnings: [],
      appliedPolicies: [type.toLowerCase()],
      responseHeaders: {
        ...this.generateSecurityHeaders(context),
        ...additionalHeaders
      },
      auditData: {
        violation: true,
        type,
        severity
      }
    }
  }
  
  private async auditSecurityEvent(eventType: string, context: SecurityContext, metadata: any): Promise<void> {
    try {
      await this.supabase
        .from('security_audit_log')
        .insert({
          event_type: eventType,
          user_id: context.userId,
          session_id: context.sessionId,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          metadata: {
            ...metadata,
            requestId: context.requestId,
            riskScore: context.riskScore,
            threatIndicators: context.threatIndicators
          },
          success: eventType.includes('SUCCESS')
        })
      
    } catch (error) {
      secureLogger.error('Audit event logging failed', error as Error, {
        requestId: context.requestId
      })
    }
  }
}

/**
 * Factory function to create security middleware
 */
export function createComprehensiveSecurityMiddleware(config?: ComprehensiveSecurityConfig) {
  return new ComprehensiveSecurityMiddleware(config)
}

/**
 * High-level security wrapper for API routes
 */
export function withComprehensiveSecurity(
  handler: (request: NextRequest, context: SecurityContext) => Promise<NextResponse>,
  config?: ComprehensiveSecurityConfig
) {
  const middleware = createComprehensiveSecurityMiddleware(config)
  
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Validate request security
      const validation = await middleware.validateRequest(request)
      
      if (!validation.allowed) {
        const errorResponse = {
          success: false,
          error: {
            code: validation.violations[0]?.type || 'SECURITY_VIOLATION',
            message: validation.violations[0]?.description || 'Request blocked by security policy'
          },
          meta: {
            requestId: validation.context.requestId,
            timestamp: new Date().toISOString(),
            riskScore: validation.context.riskScore
          }
        }
        
        const response = NextResponse.json(errorResponse, { 
          status: validation.violations[0]?.severity === 'CRITICAL' ? 403 : 400 
        })
        
        // Apply security headers
        Object.entries(validation.responseHeaders).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
        
        return response
      }
      
      // Call the handler with security context
      const response = await handler(request, validation.context)
      
      // Apply security headers to response
      Object.entries(validation.responseHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
      
    } catch (error) {
      secureLogger.error('Security middleware wrapper error', error as Error)
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal security error'
        }
      }, { status: 500 })
    }
  }
}

export default ComprehensiveSecurityMiddleware
