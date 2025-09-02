/**
 * Runtime Detection and Environment Abstraction Layer
 * Provides robust runtime detection without Node.js-specific APIs
 */

// Edge Runtime type declaration
declare const EdgeRuntime: string | undefined

// Runtime environment types
export type RuntimeEnvironment = 'edge' | 'node' | 'browser' | 'unknown'

/**
 * Detect the current runtime environment using safe checks
 */
export function detectRuntime(): RuntimeEnvironment {
  // Browser detection (most specific first)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser'
  }
  
  // Edge Runtime detection (Vercel/Next.js Edge)
  if (typeof EdgeRuntime !== 'undefined') {
    return 'edge'
  }
  
  // Node.js detection - use safe checks
  if (
    typeof globalThis !== 'undefined' &&
    typeof process !== 'undefined' &&
    typeof require !== 'undefined' &&
    typeof module !== 'undefined'
  ) {
    return 'node'
  }
  
  return 'unknown'
}

/**
 * Runtime feature detection
 */
export interface RuntimeFeatures {
  hasProcess: boolean
  hasSetInterval: boolean
  hasProcessOn: boolean
  hasConsole: boolean
  hasGlobalThis: boolean
  supportsTimers: boolean
  supportsProcessSignals: boolean
}

export function detectRuntimeFeatures(): RuntimeFeatures {
  const features: RuntimeFeatures = {
    hasProcess: typeof process !== 'undefined',
    hasSetInterval: typeof setInterval !== 'undefined',
    hasProcessOn: false,
    hasConsole: typeof console !== 'undefined',
    hasGlobalThis: typeof globalThis !== 'undefined',
    supportsTimers: false,
    supportsProcessSignals: false
  }

  // Safe check for process.on
  if (features.hasProcess) {
    try {
      features.hasProcessOn = typeof (process as any).on === 'function'
      features.supportsProcessSignals = features.hasProcessOn
    } catch {
      features.hasProcessOn = false
      features.supportsProcessSignals = false
    }
  }

  // Timer support check
  features.supportsTimers = features.hasSetInterval && (
    detectRuntime() === 'node' || 
    detectRuntime() === 'browser'
  )

  return features
}

/**
 * Safe environment variable access
 */
export function safeGetEnv(key: string, fallback?: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || fallback
    }
  } catch {
    // Silent fallback
  }
  return fallback
}

/**
 * Safe process information access
 */
export function safeGetProcessInfo(): {
  nodeVersion?: string
  platform?: string
  env?: string
} {
  try {
    if (typeof process !== 'undefined') {
      return {
        nodeVersion: process.versions?.node,
        platform: process.platform,
        env: process.env?.NODE_ENV
      }
    }
  } catch {
    // Silent fallback
  }
  return {}
}

/**
 * Runtime capability checker
 */
export class RuntimeCapabilities {
  private runtime: RuntimeEnvironment
  private features: RuntimeFeatures

  constructor() {
    this.runtime = detectRuntime()
    this.features = detectRuntimeFeatures()
  }

  getRuntime(): RuntimeEnvironment {
    return this.runtime
  }

  getFeatures(): RuntimeFeatures {
    return this.features
  }

  isEdgeRuntime(): boolean {
    return this.runtime === 'edge'
  }

  isNodeRuntime(): boolean {
    return this.runtime === 'node'
  }

  isBrowser(): boolean {
    return this.runtime === 'browser'
  }

  isServerSide(): boolean {
    return this.runtime === 'edge' || this.runtime === 'node'
  }

  isClientSide(): boolean {
    return this.runtime === 'browser'
  }

  canUseTimers(): boolean {
    return this.features.supportsTimers
  }

  canUseProcessSignals(): boolean {
    return this.features.supportsProcessSignals
  }

  canAccessFileSystem(): boolean {
    return this.runtime === 'node'
  }

  canUseProcessEnv(): boolean {
    return this.features.hasProcess
  }

  /**
   * Get runtime-appropriate console logging function
   */
  getLogger(): {
    log: (message: string, data?: any) => void
    error: (message: string, data?: any) => void
    warn: (message: string, data?: any) => void
  } {
    if (this.features.hasConsole) {
      return {
        log: (message: string, data?: any) => {
          try {
            if (data !== undefined) {
              console.log(message, data)
            } else {
              console.log(message)
            }
          } catch {
            // Silent fallback
          }
        },
        error: (message: string, data?: any) => {
          try {
            if (data !== undefined) {
              console.error(message, data)
            } else {
              console.error(message)
            }
          } catch {
            // Silent fallback
          }
        },
        warn: (message: string, data?: any) => {
          try {
            if (data !== undefined) {
              console.warn(message, data)
            } else {
              console.warn(message)
            }
          } catch {
            // Silent fallback
          }
        }
      }
    }

    // Fallback no-op logger
    return {
      log: () => {},
      error: () => {},
      warn: () => {}
    }
  }

  /**
   * Get runtime-appropriate timer functions
   */
  getTimers(): {
    setTimeout: typeof setTimeout | null
    setInterval: typeof setInterval | null
    clearTimeout: typeof clearTimeout | null
    clearInterval: typeof clearInterval | null
  } {
    if (this.canUseTimers()) {
      return {
        setTimeout: typeof setTimeout !== 'undefined' ? setTimeout : null,
        setInterval: typeof setInterval !== 'undefined' ? setInterval : null,
        clearTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout : null,
        clearInterval: typeof clearInterval !== 'undefined' ? clearInterval : null
      }
    }

    return {
      setTimeout: null,
      setInterval: null,
      clearTimeout: null,
      clearInterval: null
    }
  }
}

// Export singleton for consistent runtime detection
export const runtimeCapabilities = new RuntimeCapabilities()

// Export convenience functions
export const isEdgeRuntime = () => runtimeCapabilities.isEdgeRuntime()
export const isNodeRuntime = () => runtimeCapabilities.isNodeRuntime()
export const isBrowserRuntime = () => runtimeCapabilities.isBrowser()
export const isServerSide = () => runtimeCapabilities.isServerSide()
export const isClientSide = () => runtimeCapabilities.isClientSide()