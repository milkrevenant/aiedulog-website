/**
 * Runtime Safe Security Module
 * Works in all environments: Edge Runtime, Node.js, Browser
 */

// Edge Runtime type declaration
declare const EdgeRuntime: string | undefined

export type SecurityRuntime = 'edge' | 'node' | 'browser' | 'unknown'

/**
 * Detect runtime environment safely
 */
export function detectRuntime(): SecurityRuntime {
  // Browser check
  if (typeof window !== 'undefined') {
    return 'browser'
  }

  // Edge Runtime check
  if (typeof EdgeRuntime !== 'undefined') {
    return 'edge'
  }

  // Node.js check without accessing process.versions
  if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    return 'node'
  }

  return 'unknown'
}

/**
 * Safe logger that works in all environments
 */
export class RuntimeSafeLogger {
  private runtime: SecurityRuntime

  constructor() {
    this.runtime = detectRuntime()
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${level}] ${timestamp} - ${message}`
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log(this.formatMessage('DEBUG', message), data || '')
      } catch {
        // Silent fallback
      }
    }
  }

  info(message: string, data?: any): void {
    try {
      console.log(this.formatMessage('INFO', message), data || '')
    } catch {
      // Silent fallback
    }
  }

  warn(message: string, data?: any): void {
    try {
      console.warn(this.formatMessage('WARN', message), data || '')
    } catch {
      try {
        console.log(this.formatMessage('WARN', message), data || '')
      } catch {
        // Silent fallback
      }
    }
  }

  error(message: string, error?: Error | any): void {
    try {
      console.error(this.formatMessage('ERROR', message), error || '')
    } catch {
      try {
        console.log(this.formatMessage('ERROR', message), error || '')
      } catch {
        // Silent fallback
      }
    }
  }

  security(message: string, data?: any): void {
    try {
      console.error(this.formatMessage('SECURITY', message), data || '')
    } catch {
      try {
        console.log(this.formatMessage('SECURITY', message), data || '')
      } catch {
        // Silent fallback
      }
    }
  }

  getRuntime(): SecurityRuntime {
    return this.runtime
  }
}

// Export singleton
export const runtimeSafeLogger = new RuntimeSafeLogger()

/**
 * Safe environment variable getter
 */
export function safeGetEnv(key: string, fallback?: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || fallback
    }
  } catch {
    // Environment not available
  }
  return fallback
}

/**
 * Check if we're in production safely
 */
export function isProductionRuntime(): boolean {
  return safeGetEnv('NODE_ENV') === 'production'
}

/**
 * Check if we're in server environment
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * Sanitize data for logging (removes sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data

  const sanitized = JSON.stringify(data)
    .replace(/("password"|"secret"|"token"|"key")[^,}]*/gi, '$1":"[REDACTED]"')
    .replace(/("email")[^,}]*@[^,}]*/gi, '$1":"[REDACTED]"')
    .replace(/(sb_|eyJ)[A-Za-z0-9_\-\.]+/gi, '[REDACTED]')

  try {
    return JSON.parse(sanitized)
  } catch {
    return sanitized
  }
}

/**
 * Runtime safe console wrapper
 */
export const safeConsole = {
  log: (message: string, ...args: any[]) => {
    try {
      console.log(message, ...args)
    } catch {
      // Silent fallback
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    try {
      console.warn(message, ...args)
    } catch {
      try {
        console.log(`[WARN] ${message}`, ...args)
      } catch {
        // Silent fallback
      }
    }
  },
  
  error: (message: string, ...args: any[]) => {
    try {
      console.error(message, ...args)
    } catch {
      try {
        console.log(`[ERROR] ${message}`, ...args)
      } catch {
        // Silent fallback
      }
    }
  }
}

export default {
  logger: runtimeSafeLogger,
  console: safeConsole,
  detectRuntime,
  safeGetEnv,
  isProduction: isProductionRuntime,
  isServerSide,
  sanitizeForLogging
}