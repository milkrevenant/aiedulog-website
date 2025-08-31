/**
 * Static Security Monitor - Production Ready
 * 
 * Provides security monitoring without dynamic imports.
 * Uses static exports only for build stability.
 */

import { SecurityEventType, staticSecurityLogger } from './static-logger'

interface ThreatPattern {
  pattern: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  lastDetected?: Date
  count: number
}

interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  suspiciousActivities: number
  activeThreats: number
  lastUpdated: string
}

interface SecurityIncident {
  id: string
  type: SecurityEventType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  timestamp: string
  resolved: boolean
  escalated: boolean
  metadata?: any
}

interface ThreatIntelligence {
  ipAddress: string
  riskScore: number
  knownThreats: string[]
  lastActivity: string
  blocked: boolean
}

class StaticSecurityMonitor {
  private metrics: SecurityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousActivities: 0,
    activeThreats: 0,
    lastUpdated: new Date().toISOString()
  }

  private incidents: SecurityIncident[] = []
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map()
  private threatPatterns: ThreatPattern[] = []
  private alertThresholds = {
    suspiciousActivity: 10,
    rateLimitViolations: 50,
    failedLogins: 15,
    dataAccessViolations: 5
  }

  constructor() {
    this.initializeThreatPatterns()
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        pattern: 'sql_injection',
        severity: 'CRITICAL',
        description: 'SQL injection attempt detected',
        count: 0
      },
      {
        pattern: 'xss_attempt',
        severity: 'HIGH',
        description: 'Cross-site scripting attempt',
        count: 0
      },
      {
        pattern: 'brute_force',
        severity: 'HIGH',
        description: 'Brute force attack pattern',
        count: 0
      },
      {
        pattern: 'unusual_access_pattern',
        severity: 'MEDIUM',
        description: 'Unusual access pattern detected',
        count: 0
      },
      {
        pattern: 'rate_limit_abuse',
        severity: 'MEDIUM',
        description: 'Rate limiting violations',
        count: 0
      }
    ]
  }

  private secureLog(level: 'log' | 'warn' | 'error', message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      const logFn = console[level]
      if (data) {
        logFn(message, data)
      } else {
        logFn(message)
      }
    }
  }

  private generateIncidentId(): string {
    return `INC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  private updateMetrics(): void {
    this.metrics.lastUpdated = new Date().toISOString()
    this.metrics.activeThreats = this.incidents.filter(i => !i.resolved && i.severity === 'CRITICAL').length
  }

  // Record security events
  recordSecurityEvent(
    eventType: SecurityEventType,
    context: {
      ipAddress?: string
      userAgent?: string
      userId?: string
      requestId?: string
      [key: string]: any
    },
    metadata?: any
  ): void {
    this.metrics.totalRequests++

    // Analyze for threat patterns
    const threatDetected = this.analyzeThreatPatterns(eventType, context, metadata)
    
    if (threatDetected) {
      this.metrics.suspiciousActivities++
      
      // Create incident for significant threats
      if (threatDetected.severity === 'CRITICAL' || threatDetected.severity === 'HIGH') {
        this.createIncident(eventType, threatDetected.severity, threatDetected.description, {
          ...context,
          ...metadata,
          pattern: threatDetected.pattern
        })
      }
    }

    // Update IP threat intelligence
    if (context.ipAddress) {
      this.updateThreatIntelligence(context.ipAddress, eventType, metadata)
    }

    // Log the event
    staticSecurityLogger.logSecurityEvent(eventType, {
      severity: threatDetected?.severity || 'LOW',
      ...context,
      ...metadata
    })

    this.updateMetrics()
  }

  private analyzeThreatPatterns(
    eventType: SecurityEventType,
    context: any,
    metadata: any
  ): ThreatPattern | null {
    // SQL Injection detection
    if (this.detectSqlInjection(context, metadata)) {
      return this.updateThreatPattern('sql_injection')
    }

    // XSS detection
    if (this.detectXss(context, metadata)) {
      return this.updateThreatPattern('xss_attempt')
    }

    // Brute force detection
    if (eventType === SecurityEventType.AUTHENTICATION_FAILURE) {
      const pattern = this.updateThreatPattern('brute_force')
      if (pattern.count > 5) {
        pattern.severity = 'HIGH'
      }
      return pattern
    }

    // Rate limit abuse
    if (eventType === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      return this.updateThreatPattern('rate_limit_abuse')
    }

    return null
  }

  private detectSqlInjection(context: any, metadata: any): boolean {
    const sqlPatterns = [
      /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
      /(\bdrop\b.*\btable\b)|(\btable\b.*\bdrop\b)/i,
      /(\binsert\b.*\binto\b)|(\binto\b.*\binsert\b)/i,
      /'.*(\bor\b|\band\b).*'/i,
      /\b(exec|execute)\b.*\(/i
    ]

    const testString = JSON.stringify({ context, metadata }).toLowerCase()
    return sqlPatterns.some(pattern => pattern.test(testString))
  }

  private detectXss(context: any, metadata: any): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i,
      /\beval\s*\(/i
    ]

    const testString = JSON.stringify({ context, metadata })
    return xssPatterns.some(pattern => pattern.test(testString))
  }

  private updateThreatPattern(pattern: string): ThreatPattern {
    const threat = this.threatPatterns.find(t => t.pattern === pattern)
    if (threat) {
      threat.count++
      threat.lastDetected = new Date()
      return threat
    }

    // Return default pattern if not found
    return {
      pattern,
      severity: 'MEDIUM',
      description: `Threat pattern: ${pattern}`,
      count: 1
    }
  }

  private updateThreatIntelligence(
    ipAddress: string,
    eventType: SecurityEventType,
    metadata: any
  ): void {
    const existing = this.threatIntelligence.get(ipAddress)
    
    if (existing) {
      existing.lastActivity = new Date().toISOString()
      
      // Increase risk score for suspicious activities
      if (eventType === SecurityEventType.SUSPICIOUS_ACTIVITY || 
          eventType === SecurityEventType.SECURITY_VIOLATION) {
        existing.riskScore = Math.min(existing.riskScore + 10, 100)
      }

      // Add to known threats
      if (!existing.knownThreats.includes(eventType)) {
        existing.knownThreats.push(eventType)
      }

      // Auto-block high risk IPs
      if (existing.riskScore >= 80) {
        existing.blocked = true
        this.secureLog('warn', `🚨 Auto-blocked high-risk IP: ${ipAddress}`)
      }
    } else {
      this.threatIntelligence.set(ipAddress, {
        ipAddress,
        riskScore: eventType === SecurityEventType.SUSPICIOUS_ACTIVITY ? 20 : 5,
        knownThreats: [eventType],
        lastActivity: new Date().toISOString(),
        blocked: false
      })
    }
  }

  private createIncident(
    type: SecurityEventType,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    metadata?: any
  ): void {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      type,
      severity,
      description,
      timestamp: new Date().toISOString(),
      resolved: false,
      escalated: severity === 'CRITICAL',
      metadata
    }

    this.incidents.push(incident)

    // Keep only recent incidents
    if (this.incidents.length > 1000) {
      this.incidents = this.incidents.slice(-1000)
    }

    // Auto-escalate critical incidents
    if (severity === 'CRITICAL') {
      this.secureLog('error', `🚨 CRITICAL SECURITY INCIDENT: ${description}`, metadata)
    }
  }

  // Public methods for getting data
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics }
  }

  getActiveIncidents(): SecurityIncident[] {
    return this.incidents.filter(i => !i.resolved)
  }

  getAllIncidents(): SecurityIncident[] {
    return [...this.incidents]
  }

  getThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values())
  }

  getHighRiskIPs(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values())
      .filter(intel => intel.riskScore >= 60)
      .sort((a, b) => b.riskScore - a.riskScore)
  }

  // Incident management
  resolveIncident(incidentId: string): boolean {
    const incident = this.incidents.find(i => i.id === incidentId)
    if (incident) {
      incident.resolved = true
      this.updateMetrics()
      return true
    }
    return false
  }

  escalateIncident(incidentId: string): boolean {
    const incident = this.incidents.find(i => i.id === incidentId)
    if (incident) {
      incident.escalated = true
      this.secureLog('warn', `🚨 Incident escalated: ${incident.description}`)
      return true
    }
    return false
  }

  // Threat intelligence management
  blockIP(ipAddress: string, reason: string): void {
    const intel = this.threatIntelligence.get(ipAddress)
    if (intel) {
      intel.blocked = true
      intel.riskScore = 100
    } else {
      this.threatIntelligence.set(ipAddress, {
        ipAddress,
        riskScore: 100,
        knownThreats: ['manual_block'],
        lastActivity: new Date().toISOString(),
        blocked: true
      })
    }

    staticSecurityLogger.logSecurityEvent(SecurityEventType.SYSTEM_EVENT, {
      severity: 'HIGH',
      action: 'ip_blocked',
      ipAddress,
      reason
    })
  }

  unblockIP(ipAddress: string): void {
    const intel = this.threatIntelligence.get(ipAddress)
    if (intel) {
      intel.blocked = false
      intel.riskScore = Math.max(intel.riskScore - 50, 0)
      
      staticSecurityLogger.logSecurityEvent(SecurityEventType.SYSTEM_EVENT, {
        severity: 'MEDIUM',
        action: 'ip_unblocked',
        ipAddress
      })
    }
  }

  // Statistics and monitoring
  getStatistics() {
    const totalIncidents = this.incidents.length
    const resolvedIncidents = this.incidents.filter(i => i.resolved).length
    const criticalIncidents = this.incidents.filter(i => i.severity === 'CRITICAL').length
    const blockedIPs = Array.from(this.threatIntelligence.values()).filter(i => i.blocked).length

    return {
      incidents: {
        total: totalIncidents,
        resolved: resolvedIncidents,
        active: totalIncidents - resolvedIncidents,
        critical: criticalIncidents
      },
      threatIntelligence: {
        totalIPs: this.threatIntelligence.size,
        blockedIPs,
        highRiskIPs: this.getHighRiskIPs().length
      },
      threatPatterns: this.threatPatterns.map(p => ({
        pattern: p.pattern,
        count: p.count,
        severity: p.severity
      })),
      metrics: this.metrics
    }
  }

  // Clear data (for testing)
  clear(): void {
    this.incidents = []
    this.threatIntelligence.clear()
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousActivities: 0,
      activeThreats: 0,
      lastUpdated: new Date().toISOString()
    }
    this.initializeThreatPatterns()
  }
}

// Create singleton instance
export const staticSecurityMonitor = new StaticSecurityMonitor()

// Named exports for compatibility
export const securityMonitor = staticSecurityMonitor

// Default export
export default staticSecurityMonitor