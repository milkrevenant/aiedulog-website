/**
 * Security Monitoring & Alerting System
 * 
 * CRITICAL FEATURES:
 * - Real-time threat detection
 * - Attack pattern recognition
 * - Automated incident response
 * - Security metrics collection
 * - Alert escalation system
 * - Compliance monitoring
 */

import { secureLogger, SecurityEventType } from '@/lib/security/secure-logger'
import { rateLimiter } from '@/lib/security/rateLimiter'

// Threat levels and scoring
export enum ThreatLevel {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Security incident types
export enum IncidentType {
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  DDOS_ATTEMPT = 'ddos_attempt',
  SQL_INJECTION = 'sql_injection_attack',
  XSS_ATTACK = 'xss_attack',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_TAKEOVER = 'account_takeover',
  DATA_EXFILTRATION = 'data_exfiltration',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  API_ABUSE = 'api_abuse',
  UNAUTHORIZED_ACCESS = 'unauthorized_access'
}

// Security metrics
interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  rateLimitViolations: number
  authenticationFailures: number
  suspiciousActivities: number
  dataAccessViolations: number
  highRiskSessions: number
  activeThreats: number
  lastUpdated: number
}

// Threat intelligence
interface ThreatIntelligence {
  ipAddress: string
  riskScore: number
  classifications: string[]
  lastSeen: number
  violationCount: number
  blocklistStatus: 'none' | 'temporary' | 'permanent'
  notes: string[]
}

// Security incident
interface SecurityIncident {
  id: string
  type: IncidentType
  severity: ThreatLevel
  timestamp: number
  source: {
    ipAddress: string
    userAgent?: string
    userId?: string
    requestId?: string
  }
  details: {
    description: string
    evidence: any[]
    affectedResources: string[]
    potentialImpact: string
  }
  response: {
    automated: boolean
    actions: string[]
    status: 'open' | 'investigating' | 'contained' | 'resolved'
  }
  escalated: boolean
  assignedTo?: string
}

// Attack pattern detection
interface AttackPattern {
  name: string
  description: string
  indicators: {
    eventTypes: SecurityEventType[]
    threshold: number
    timeWindow: number // milliseconds
  }
  severity: ThreatLevel
  autoBlock: boolean
  alertTeam: boolean
}

// Built-in attack patterns
const ATTACK_PATTERNS: AttackPattern[] = [
  {
    name: 'Brute Force Login Attack',
    description: 'Multiple failed login attempts from same IP',
    indicators: {
      eventTypes: [SecurityEventType.AUTHENTICATION_FAILURE],
      threshold: 5,
      timeWindow: 300000 // 5 minutes
    },
    severity: ThreatLevel.HIGH,
    autoBlock: true,
    alertTeam: true
  },
  
  {
    name: 'SQL Injection Campaign',
    description: 'Multiple SQL injection attempts detected',
    indicators: {
      eventTypes: [SecurityEventType.SQL_INJECTION_ATTEMPT],
      threshold: 3,
      timeWindow: 600000 // 10 minutes
    },
    severity: ThreatLevel.CRITICAL,
    autoBlock: true,
    alertTeam: true
  },
  
  {
    name: 'Data Scraping Attack',
    description: 'Excessive data access patterns detected',
    indicators: {
      eventTypes: [SecurityEventType.DATA_ACCESS_VIOLATION],
      threshold: 10,
      timeWindow: 300000 // 5 minutes
    },
    severity: ThreatLevel.HIGH,
    autoBlock: true,
    alertTeam: true
  },
  
  {
    name: 'Privilege Escalation Attempt',
    description: 'Attempts to access restricted resources',
    indicators: {
      eventTypes: [SecurityEventType.PRIVILEGE_ESCALATION, SecurityEventType.AUTHORIZATION_FAILURE],
      threshold: 3,
      timeWindow: 900000 // 15 minutes
    },
    severity: ThreatLevel.CRITICAL,
    autoBlock: false,
    alertTeam: true
  },
  
  {
    name: 'Rate Limit Abuse',
    description: 'Persistent rate limit violations',
    indicators: {
      eventTypes: [SecurityEventType.RATE_LIMIT_EXCEEDED],
      threshold: 10,
      timeWindow: 600000 // 10 minutes
    },
    severity: ThreatLevel.MEDIUM,
    autoBlock: true,
    alertTeam: false
  },
  
  {
    name: 'Cross-Site Scripting Campaign',
    description: 'Multiple XSS attempts detected',
    indicators: {
      eventTypes: [SecurityEventType.XSS_ATTEMPT],
      threshold: 3,
      timeWindow: 600000 // 10 minutes
    },
    severity: ThreatLevel.HIGH,
    autoBlock: true,
    alertTeam: true
  }
]

/**
 * Security Monitoring Engine
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private eventBuffer: Array<{
    type: SecurityEventType
    timestamp: number
    source: string
    details: any
  }> = []
  
  private threatIntelDB: Map<string, ThreatIntelligence> = new Map()
  private activeIncidents: Map<string, SecurityIncident> = new Map()
  private securityMetrics: SecurityMetrics
  private isMonitoring: boolean = false
  
  constructor() {
    this.securityMetrics = {
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitViolations: 0,
      authenticationFailures: 0,
      suspiciousActivities: 0,
      dataAccessViolations: 0,
      highRiskSessions: 0,
      activeThreats: 0,
      lastUpdated: Date.now()
    }
    
    this.startMonitoring()
  }
  
  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Process events every 30 seconds
    setInterval(() => {
      this.processEventBuffer()
    }, 30000)
    
    // Update metrics every minute
    setInterval(() => {
      this.updateMetrics()
    }, 60000)
    
    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupOldData()
    }, 3600000)
    
    secureLogger.info('Security monitoring started', {
      component: 'SecurityMonitor',
      patterns: ATTACK_PATTERNS.length
    })
  }
  
  /**
   * Record security event for analysis
   */
  public recordSecurityEvent(
    eventType: SecurityEventType,
    source: { ipAddress: string; userAgent?: string; userId?: string; requestId?: string },
    details: any = {}
  ): void {
    
    this.eventBuffer.push({
      type: eventType,
      timestamp: Date.now(),
      source: source.ipAddress,
      details: {
        ...details,
        userAgent: source.userAgent,
        userId: source.userId,
        requestId: source.requestId
      }
    })
    
    // Update real-time metrics
    this.updateRealTimeMetrics(eventType)
    
    // Check for immediate threats (critical events)
    if (this.isCriticalEvent(eventType)) {
      this.handleCriticalEvent(eventType, source, details)
    }
  }
  
  /**
   * Process buffered events for pattern detection
   */
  private processEventBuffer(): void {
    if (this.eventBuffer.length === 0) return
    
    const now = Date.now()
    const events = [...this.eventBuffer]
    this.eventBuffer = []
    
    // Analyze events for each attack pattern
    for (const pattern of ATTACK_PATTERNS) {
      this.analyzePattern(pattern, events, now)
    }
    
    // Update threat intelligence
    this.updateThreatIntelligence(events)
    
    secureLogger.debug(`Processed ${events.length} security events`, {
      component: 'SecurityMonitor'
    })
  }
  
  /**
   * Analyze events for specific attack pattern
   */
  private analyzePattern(pattern: AttackPattern, events: any[], currentTime: number): void {
    const relevantEvents = events.filter(event => 
      pattern.indicators.eventTypes.includes(event.type) &&
      currentTime - event.timestamp <= pattern.indicators.timeWindow
    )
    
    // Group by source IP
    const eventsBySource = new Map<string, any[]>()
    for (const event of relevantEvents) {
      const source = event.source
      if (!eventsBySource.has(source)) {
        eventsBySource.set(source, [])
      }
      eventsBySource.get(source)!.push(event)
    }
    
    // Check if any source exceeds threshold
    for (const [source, sourceEvents] of eventsBySource) {
      if (sourceEvents.length >= pattern.indicators.threshold) {
        this.triggerIncident(pattern, source, sourceEvents)
      }
    }
  }
  
  /**
   * Trigger security incident
   */
  private triggerIncident(pattern: AttackPattern, source: string, events: any[]): void {
    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    const incident: SecurityIncident = {
      id: incidentId,
      type: this.getIncidentTypeForPattern(pattern.name),
      severity: pattern.severity,
      timestamp: Date.now(),
      source: {
        ipAddress: source,
        userAgent: events[0]?.details?.userAgent,
        userId: events[0]?.details?.userId,
        requestId: events[0]?.details?.requestId
      },
      details: {
        description: `${pattern.description} detected from ${source}`,
        evidence: events.map(e => ({
          timestamp: e.timestamp,
          type: e.type,
          details: e.details
        })),
        affectedResources: [...new Set(events.map(e => e.details?.resource || 'unknown'))],
        potentialImpact: this.assessPotentialImpact(pattern.severity)
      },
      response: {
        automated: true,
        actions: [],
        status: 'open'
      },
      escalated: false
    }
    
    // Store incident
    this.activeIncidents.set(incidentId, incident)
    
    // Automated response
    if (pattern.autoBlock) {
      this.executeAutomatedResponse(incident)
    }
    
    // Alert security team
    if (pattern.alertTeam) {
      this.alertSecurityTeam(incident)
    }
    
    // Log incident
    secureLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      severity: pattern.severity as any,
      context: {
        incidentId,
        pattern: pattern.name,
        source,
        eventCount: events.length
      }
    })
    
    secureLogger.warn(`🚨 Security incident detected: ${pattern.name}`, {
      incidentId,
      source,
      severity: pattern.severity,
      eventCount: events.length
    })
  }
  
  /**
   * Execute automated response to incident
   */
  private executeAutomatedResponse(incident: SecurityIncident): void {
    const actions: string[] = []
    
    // Temporarily block IP address
    if (incident.source.ipAddress && incident.source.ipAddress !== 'unknown') {
      this.temporaryBlockIP(incident.source.ipAddress, incident.severity)
      actions.push(`Temporarily blocked IP: ${incident.source.ipAddress}`)
    }
    
    // Suspend user account if severe
    if (incident.severity === ThreatLevel.CRITICAL && incident.source.userId) {
      // TODO: Implement user suspension
      actions.push(`Flagged user account: ${incident.source.userId}`)
    }
    
    // Trigger additional rate limiting
    if (incident.type === IncidentType.API_ABUSE || incident.type === IncidentType.DDOS_ATTEMPT) {
      // TODO: Implement dynamic rate limiting
      actions.push('Applied stricter rate limiting')
    }
    
    // Update incident with actions taken
    incident.response.actions = actions
    incident.response.status = 'contained'
    
    secureLogger.info('Automated incident response executed', {
      incidentId: incident.id,
      actions
    })
  }
  
  /**
   * Alert security team about critical incidents
   */
  private alertSecurityTeam(incident: SecurityIncident): void {
    // TODO: Integrate with alerting systems (Slack, PagerDuty, email, SMS)
    
    const alertMessage = {
      title: `🚨 Security Incident: ${incident.type}`,
      severity: incident.severity,
      details: {
        id: incident.id,
        source: incident.source.ipAddress,
        description: incident.details.description,
        timestamp: new Date(incident.timestamp).toISOString(),
        evidence: incident.details.evidence.length,
        impact: incident.details.potentialImpact
      },
      actions: incident.response.actions
    }
    
    // In production, this would send actual alerts
    console.error('🚨 SECURITY TEAM ALERT:', alertMessage)
    
    // Mark as escalated for high/critical incidents
    if (incident.severity === ThreatLevel.HIGH || incident.severity === ThreatLevel.CRITICAL) {
      incident.escalated = true
      incident.assignedTo = 'security-team'
    }
  }
  
  /**
   * Temporarily block IP address
   */
  private temporaryBlockIP(ipAddress: string, severity: ThreatLevel): void {
    const blockDuration = this.getBlockDuration(severity)
    
    // Update threat intelligence
    const threat = this.threatIntelDB.get(ipAddress) || {
      ipAddress,
      riskScore: 0,
      classifications: [],
      lastSeen: Date.now(),
      violationCount: 0,
      blocklistStatus: 'none',
      notes: []
    }
    
    threat.riskScore += this.getSeverityScore(severity)
    threat.violationCount += 1
    threat.blocklistStatus = blockDuration > 3600000 ? 'permanent' : 'temporary'
    threat.lastSeen = Date.now()
    threat.notes.push(`Blocked due to ${severity} incident at ${new Date().toISOString()}`)
    
    this.threatIntelDB.set(ipAddress, threat)
    
    // TODO: Implement actual IP blocking (firewall rules, WAF, etc.)
    secureLogger.warn(`IP address blocked temporarily: ${ipAddress.substring(0, 10)}...`, {
      duration: blockDuration,
      severity,
      riskScore: threat.riskScore
    })
  }
  
  /**
   * Update threat intelligence database
   */
  private updateThreatIntelligence(events: any[]): void {
    for (const event of events) {
      const ipAddress = event.source
      
      const threat = this.threatIntelDB.get(ipAddress) || {
        ipAddress,
        riskScore: 0,
        classifications: [],
        lastSeen: Date.now(),
        violationCount: 0,
        blocklistStatus: 'none',
        notes: []
      }
      
      // Update risk score based on event type
      threat.riskScore += this.getEventRiskScore(event.type)
      threat.lastSeen = event.timestamp
      
      // Add classification if not already present
      const classification = this.getClassificationForEvent(event.type)
      if (classification && !(threat.classifications as string[]).includes(classification)) {
        (threat.classifications as string[]).push(classification)
      }
      
      this.threatIntelDB.set(ipAddress, threat)
    }
  }
  
  /**
   * Update real-time security metrics
   */
  private updateRealTimeMetrics(eventType: SecurityEventType): void {
    this.securityMetrics.totalRequests += 1
    
    switch (eventType) {
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        this.securityMetrics.rateLimitViolations += 1
        this.securityMetrics.blockedRequests += 1
        break
      case SecurityEventType.AUTHENTICATION_FAILURE:
        this.securityMetrics.authenticationFailures += 1
        break
      case SecurityEventType.DATA_ACCESS_VIOLATION:
        this.securityMetrics.dataAccessViolations += 1
        break
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        this.securityMetrics.suspiciousActivities += 1
        break
    }
    
    this.securityMetrics.lastUpdated = Date.now()
  }
  
  /**
   * Update comprehensive metrics
   */
  private updateMetrics(): void {
    this.securityMetrics.activeThreats = this.activeIncidents.size
    this.securityMetrics.highRiskSessions = Array.from(this.threatIntelDB.values())
      .filter(threat => threat.riskScore > 50).length
    
    // TODO: Add more sophisticated metrics
    secureLogger.debug('Security metrics updated', this.securityMetrics)
  }
  
  /**
   * Cleanup old data to prevent memory issues
   */
  private cleanupOldData(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    // Cleanup old incidents
    for (const [id, incident] of this.activeIncidents) {
      if (now - incident.timestamp > maxAge && incident.response.status === 'resolved') {
        this.activeIncidents.delete(id)
      }
    }
    
    // Cleanup old threat intelligence
    for (const [ip, threat] of this.threatIntelDB) {
      if (now - threat.lastSeen > maxAge && threat.riskScore < 10) {
        this.threatIntelDB.delete(ip)
      }
    }
    
    secureLogger.debug('Security data cleanup completed', {
      activeIncidents: this.activeIncidents.size,
      trackedIPs: this.threatIntelDB.size
    })
  }
  
  // Helper methods
  
  private isCriticalEvent(eventType: SecurityEventType): boolean {
    const criticalEvents = [
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.DATA_EXFILTRATION_ATTEMPT,
      SecurityEventType.PRIVILEGE_ESCALATION
    ]
    return criticalEvents.includes(eventType)
  }
  
  private handleCriticalEvent(
    eventType: SecurityEventType,
    source: any,
    details: any
  ): void {
    // Immediate response to critical events
    secureLogger.logSecurityEvent(eventType, {
      severity: 'CRITICAL',
      context: { source, details, immediate: true }
    })
  }
  
  private getIncidentTypeForPattern(patternName: string): IncidentType {
    const mapping: Record<string, IncidentType> = {
      'Brute Force Login Attack': IncidentType.BRUTE_FORCE_ATTACK,
      'SQL Injection Campaign': IncidentType.SQL_INJECTION,
      'Data Scraping Attack': IncidentType.DATA_EXFILTRATION,
      'Privilege Escalation Attempt': IncidentType.PRIVILEGE_ESCALATION,
      'Rate Limit Abuse': IncidentType.API_ABUSE,
      'Cross-Site Scripting Campaign': IncidentType.XSS_ATTACK
    }
    return mapping[patternName] || IncidentType.SUSPICIOUS_ACTIVITY
  }
  
  private assessPotentialImpact(severity: ThreatLevel): string {
    switch (severity) {
      case ThreatLevel.CRITICAL:
        return 'Data breach, system compromise, or service disruption'
      case ThreatLevel.HIGH:
        return 'Unauthorized access or data exposure'
      case ThreatLevel.MEDIUM:
        return 'Service degradation or minor security violation'
      default:
        return 'Minimal impact expected'
    }
  }
  
  private getBlockDuration(severity: ThreatLevel): number {
    switch (severity) {
      case ThreatLevel.CRITICAL: return 24 * 60 * 60 * 1000 // 24 hours
      case ThreatLevel.HIGH: return 4 * 60 * 60 * 1000      // 4 hours
      case ThreatLevel.MEDIUM: return 60 * 60 * 1000         // 1 hour
      default: return 15 * 60 * 1000                         // 15 minutes
    }
  }
  
  private getSeverityScore(severity: ThreatLevel): number {
    switch (severity) {
      case ThreatLevel.CRITICAL: return 25
      case ThreatLevel.HIGH: return 15
      case ThreatLevel.MEDIUM: return 10
      case ThreatLevel.LOW: return 5
      default: return 1
    }
  }
  
  private getEventRiskScore(eventType: SecurityEventType): number {
    const scores: Partial<Record<SecurityEventType, number>> = {
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 20,
      [SecurityEventType.XSS_ATTEMPT]: 15,
      [SecurityEventType.PRIVILEGE_ESCALATION]: 25,
      [SecurityEventType.DATA_ACCESS_VIOLATION]: 10,
      [SecurityEventType.AUTHENTICATION_FAILURE]: 5,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 3
    }
    return scores[eventType] || 1
  }
  
  private getClassificationForEvent(eventType: SecurityEventType): string | null {
    const classifications: Partial<Record<SecurityEventType, string>> = {
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 'sql_injector',
      [SecurityEventType.XSS_ATTEMPT]: 'xss_attacker',
      [SecurityEventType.BRUTE_FORCE_DETECTED]: 'brute_forcer',
      [SecurityEventType.DATA_ACCESS_VIOLATION]: 'data_scraper'
    }
    return classifications[eventType] || null
  }
  
  // Public API methods
  
  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics }
  }
  
  public getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.activeIncidents.values())
  }
  
  public getThreatIntelligence(ipAddress?: string): ThreatIntelligence[] {
    if (ipAddress) {
      const threat = this.threatIntelDB.get(ipAddress)
      return threat ? [threat] : []
    }
    return Array.from(this.threatIntelDB.values())
  }
  
  public resolveIncident(incidentId: string, notes?: string): boolean {
    const incident = this.activeIncidents.get(incidentId)
    if (incident) {
      incident.response.status = 'resolved'
      if (notes) {
        incident.details.description += `\nResolution: ${notes}`
      }
      secureLogger.logAuditEvent('incident_resolved', incidentId, 'SUCCESS', {
        resolution: notes
      })
      return true
    }
    return false
  }
  
  public manualBlock(ipAddress: string, reason: string, duration: number = 3600000): void {
    this.temporaryBlockIP(ipAddress, ThreatLevel.HIGH)
    secureLogger.logAuditEvent('manual_ip_block', ipAddress, 'SUCCESS', {
      reason,
      duration
    })
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance()

export default securityMonitor