/**
 * Client-Side Security System
 * 
 * This module contains security features that run in the browser environment only.
 * No server-side imports allowed here to prevent Next.js build errors.
 */

// Client-side security types
export interface ClientSecurityConfig {
  devToolsProtection: boolean
  consoleOverride: boolean
  debuggerProtection: boolean
  rightClickProtection: boolean
  textSelectionProtection: boolean
  viewSourceProtection: boolean
  localStorageEncryption: boolean
  sessionTimeout: number
  idleTimeout: number
}

export interface SecurityViolation {
  type: 'devtools' | 'console' | 'debugger' | 'rightclick' | 'selection' | 'idle'
  timestamp: number
  severity: 'low' | 'medium' | 'high'
  details: Record<string, any>
}

// Default client security configuration
const DEFAULT_CLIENT_CONFIG: ClientSecurityConfig = {
  devToolsProtection: true,
  consoleOverride: true,
  debuggerProtection: true,
  rightClickProtection: false, // Disabled by default for UX
  textSelectionProtection: false, // Disabled by default for UX
  viewSourceProtection: true,
  localStorageEncryption: true,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  idleTimeout: 30 * 60 * 1000, // 30 minutes
}

/**
 * Client-Side Security Monitor
 * Handles browser-specific security monitoring and protection
 */
export class ClientSecurityMonitor {
  private static instance: ClientSecurityMonitor
  private config: ClientSecurityConfig
  private violations: SecurityViolation[] = []
  private originalConsole: Console | null = null
  private devToolsDetected: boolean = false
  private lastActivity: number = Date.now()
  private activityTimer: NodeJS.Timeout | null = null
  private securityTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<ClientSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config }
    this.initialize()
  }

  public static getInstance(config?: Partial<ClientSecurityConfig>): ClientSecurityMonitor {
    if (!ClientSecurityMonitor.instance) {
      ClientSecurityMonitor.instance = new ClientSecurityMonitor(config)
    }
    return ClientSecurityMonitor.instance
  }

  private initialize(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    this.setupDevToolsDetection()
    this.setupConsoleOverride()
    this.setupDebuggerProtection()
    this.setupRightClickProtection()
    this.setupTextSelectionProtection()
    this.setupViewSourceProtection()
    this.setupActivityMonitoring()
    this.startSecurityMonitoring()
  }

  private setupDevToolsDetection(): void {
    if (!this.config.devToolsProtection) return

    // Method 1: Console timing detection
    let devtools = { open: false, orientation: null as string | null }
    
    const threshold = 160
    setInterval(() => {
      if (typeof window !== 'undefined') {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true
            devtools.orientation = (window.outerHeight - window.innerHeight > threshold) ? 'vertical' : 'horizontal'
            this.handleDevToolsDetected()
          }
        } else {
          if (devtools.open) {
            devtools.open = false
            devtools.orientation = null
          }
        }
      }
    }, 500)

    // Method 2: Console method redefinition detection
    let consoleCheckTimer: NodeJS.Timeout | null = null
    
    const checkConsole = () => {
      const before = Date.now()
      debugger // This will pause if devtools is open
      const after = Date.now()
      
      if (after - before > 100) { // Significant delay indicates devtools
        if (!this.devToolsDetected) {
          this.handleDevToolsDetected()
        }
      }
      
      consoleCheckTimer = setTimeout(checkConsole, 1000)
    }
    
    if (this.config.debuggerProtection) {
      checkConsole()
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (consoleCheckTimer) clearTimeout(consoleCheckTimer)
    })
  }

  private setupConsoleOverride(): void {
    if (!this.config.consoleOverride || typeof window === 'undefined') return

    // Store original console methods
    this.originalConsole = { ...console }

    // Override console methods in production
    if (process.env.NODE_ENV === 'production') {
      const noop = () => {}
      
      console.log = noop
      console.warn = noop
      console.error = noop
      console.info = noop
      console.debug = noop
      console.trace = noop
      console.table = noop
      console.group = noop
      console.groupEnd = noop
      console.time = noop
      console.timeEnd = noop
      console.count = noop
      console.clear = noop
    }

    // Override console.log to detect usage attempts
    const originalLog = console.log
    console.log = (...args: any[]) => {
      this.recordViolation('console', 'medium', { 
        method: 'log', 
        args: args.length 
      })
      
      // In development, still allow console.log
      if (process.env.NODE_ENV === 'development') {
        originalLog.apply(console, args)
      }
    }
  }

  private setupDebuggerProtection(): void {
    if (!this.config.debuggerProtection) return

    // Anti-debugging techniques
    const antiDebug = () => {
      if (typeof window !== 'undefined') {
        // Detect if debugger is attached
        let start = Date.now()
        debugger
        let end = Date.now()
        
        if (end - start > 100) {
          this.recordViolation('debugger', 'high', {
            delay: end - start
          })
          
          // Optional: Redirect or take action
          // window.location.href = 'about:blank'
        }
      }
      
      setTimeout(antiDebug, 1000)
    }
    
    // Start anti-debug monitoring
    setTimeout(antiDebug, 1000)
  }

  private setupRightClickProtection(): void {
    if (!this.config.rightClickProtection || typeof window === 'undefined') return

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.recordViolation('rightclick', 'low', {
        target: e.target ? (e.target as Element).tagName : 'unknown'
      })
      return false
    })
  }

  private setupTextSelectionProtection(): void {
    if (!this.config.textSelectionProtection || typeof window === 'undefined') return

    // Disable text selection
    document.addEventListener('selectstart', (e) => {
      e.preventDefault()
      this.recordViolation('selection', 'low', {
        target: e.target ? (e.target as Element).tagName : 'unknown'
      })
      return false
    })

    // Disable drag
    document.addEventListener('dragstart', (e) => {
      e.preventDefault()
      return false
    })
  }

  private setupViewSourceProtection(): void {
    if (!this.config.viewSourceProtection || typeof window === 'undefined') return

    // Detect common view source keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        this.recordViolation('console', 'medium', {
          action: 'view_source_attempt'
        })
        return false
      }
      
      // Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        this.recordViolation('devtools', 'high', {
          action: 'devtools_shortcut_attempt'
        })
        return false
      }
      
      // F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault()
        this.recordViolation('devtools', 'high', {
          action: 'f12_attempt'
        })
        return false
      }
      
      // Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        this.recordViolation('devtools', 'medium', {
          action: 'inspector_attempt'
        })
        return false
      }
    })
  }

  private setupActivityMonitoring(): void {
    if (typeof window === 'undefined') return

    const updateActivity = () => {
      this.lastActivity = Date.now()
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Check for idle timeout
    this.activityTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivity
      
      if (idleTime > this.config.idleTimeout) {
        this.recordViolation('idle', 'low', {
          idleTime,
          threshold: this.config.idleTimeout
        })
        
        // Optionally trigger session cleanup or warning
        this.handleIdleTimeout()
      }
    }, 60000) // Check every minute
  }

  private startSecurityMonitoring(): void {
    if (typeof window === 'undefined') return

    // Periodic security health check
    this.securityTimer = setInterval(() => {
      this.performSecurityCheck()
    }, 30000) // Every 30 seconds
  }

  private handleDevToolsDetected(): void {
    this.devToolsDetected = true
    this.recordViolation('devtools', 'high', {
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    })

    // Optional: Take action (redirect, alert, disable functionality)
    if (process.env.NODE_ENV === 'production') {
      // Example actions:
      // window.location.href = '/security-violation'
      // document.body.innerHTML = '<h1>Access Denied</h1>'
    }
  }

  private handleIdleTimeout(): void {
    // Emit event for session management
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('security:idle-timeout', {
        detail: { idleTime: Date.now() - this.lastActivity }
      }))
    }
  }

  private performSecurityCheck(): void {
    if (typeof window === 'undefined') return

    // Check for suspicious modifications
    if (this.originalConsole) {
      if (console.log !== this.originalConsole.log && process.env.NODE_ENV === 'production') {
        this.recordViolation('console', 'high', {
          action: 'console_method_modified'
        })
      }
    }

    // Check for suspicious global variables (common in debugging tools)
    const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', 'webpackJsonp', '__webpack_require__']
    for (const globalVar of suspiciousGlobals) {
      if ((window as any)[globalVar]) {
        this.recordViolation('devtools', 'medium', {
          action: 'suspicious_global_detected',
          global: globalVar
        })
      }
    }
  }

  private recordViolation(type: SecurityViolation['type'], severity: SecurityViolation['severity'], details: Record<string, any>): void {
    const violation: SecurityViolation = {
      type,
      severity,
      timestamp: Date.now(),
      details
    }

    this.violations.push(violation)

    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations = this.violations.slice(-100)
    }

    // Emit security event for external handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('security:violation', {
        detail: violation
      }))
    }
  }

  // Public API methods
  
  public getViolations(): SecurityViolation[] {
    return [...this.violations]
  }

  public getSecurityStatus(): {
    devToolsDetected: boolean
    violationCount: number
    lastActivity: number
    idleTime: number
    recentViolations: SecurityViolation[]
  } {
    return {
      devToolsDetected: this.devToolsDetected,
      violationCount: this.violations.length,
      lastActivity: this.lastActivity,
      idleTime: Date.now() - this.lastActivity,
      recentViolations: this.violations.slice(-10)
    }
  }

  public updateConfig(newConfig: Partial<ClientSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Reinitialize with new config if needed
    this.cleanup()
    this.initialize()
  }

  public cleanup(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
      this.activityTimer = null
    }
    
    if (this.securityTimer) {
      clearInterval(this.securityTimer)
      this.securityTimer = null
    }
    
    // Restore original console if overridden
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole)
    }
  }

  // Secure storage utilities for client-side data
  public encryptData(data: string, key: string = 'aiedulog-security'): string {
    // Simple XOR encryption for client-side data obfuscation
    // Note: This is not cryptographically secure, just obfuscation
    let encrypted = ''
    const keyLength = key.length
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      const keyChar = key.charCodeAt(i % keyLength)
      encrypted += String.fromCharCode(char ^ keyChar)
    }
    
    return btoa(encrypted)
  }

  public decryptData(encryptedData: string, key: string = 'aiedulog-security'): string {
    try {
      const data = atob(encryptedData)
      let decrypted = ''
      const keyLength = key.length
      
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i)
        const keyChar = key.charCodeAt(i % keyLength)
        decrypted += String.fromCharCode(char ^ keyChar)
      }
      
      return decrypted
    } catch {
      return ''
    }
  }

  public setSecureLocalStorage(key: string, value: any): void {
    if (typeof window === 'undefined' || !this.config.localStorageEncryption) return
    
    try {
      const stringValue = JSON.stringify(value)
      const encrypted = this.encryptData(stringValue)
      localStorage.setItem(`secure:${key}`, encrypted)
    } catch (error) {
      // Silently fail for security
    }
  }

  public getSecureLocalStorage(key: string): any {
    if (typeof window === 'undefined' || !this.config.localStorageEncryption) return null
    
    try {
      const encrypted = localStorage.getItem(`secure:${key}`)
      if (!encrypted) return null
      
      const decrypted = this.decryptData(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      // Remove corrupted data
      localStorage.removeItem(`secure:${key}`)
      return null
    }
  }

  public clearSecureLocalStorage(): void {
    if (typeof window === 'undefined') return
    
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('secure:')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Create default instance
let clientSecurity: ClientSecurityMonitor | null = null

/**
 * Get the client security monitor instance (browser only)
 */
export function getClientSecurity(config?: Partial<ClientSecurityConfig>): ClientSecurityMonitor | null {
  if (typeof window === 'undefined') {
    return null // Server-side, return null
  }
  
  if (!clientSecurity) {
    clientSecurity = ClientSecurityMonitor.getInstance(config)
  }
  
  return clientSecurity
}

/**
 * Initialize client security (call this in your app)
 */
export function initializeClientSecurity(config?: Partial<ClientSecurityConfig>): void {
  if (typeof window === 'undefined') return
  
  const security = getClientSecurity(config)
  
  if (security) {
    // Set up global error handling for security violations
    window.addEventListener('security:violation', ((event: CustomEvent) => {
      const violation = event.detail as SecurityViolation
      
      // Send to server for logging (if available)
      if (typeof fetch !== 'undefined') {
        fetch('/api/security/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(violation)
        }).catch(() => {}) // Silently fail
      }
    }) as EventListener)

    // Set up idle timeout handling
    window.addEventListener('security:idle-timeout', (() => {
      // Trigger session warning or cleanup
      window.dispatchEvent(new CustomEvent('auth:idle-warning'))
    }) as EventListener)
  }
}

// Export for use in components
export default {
  getClientSecurity,
  initializeClientSecurity,
  ClientSecurityMonitor
}