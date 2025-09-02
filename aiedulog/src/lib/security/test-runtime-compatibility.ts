/**
 * Runtime Compatibility Test
 * Tests the new security architecture across different runtime environments
 */

import { detectRuntime, runtimeCapabilities } from './runtime-detector'
import { edgeSafeLogger, SecurityEventType } from './edge-safe-logger'
import { RuntimeSafeFactory } from './runtime-safe-factory'
import { 
  initializeSecurity, 
  getSecurityHealth, 
  validateSecurityConfig,
  SECURITY_CONFIG 
} from './index'

/**
 * Test runtime detection
 */
function testRuntimeDetection(): {
  success: boolean
  runtime: string
  features: any
  errors: string[]
} {
  const errors: string[] = []
  
  try {
    const runtime = detectRuntime()
    const features = runtimeCapabilities.getFeatures()
    
    console.log(`Runtime detected: ${runtime}`)
    console.log('Runtime features:', features)
    
    // Validate runtime detection
    if (!runtime || runtime === 'unknown') {
      errors.push('Unable to detect runtime environment')
    }
    
    if (!features || typeof features !== 'object') {
      errors.push('Unable to detect runtime features')
    }
    
    return {
      success: errors.length === 0,
      runtime,
      features,
      errors
    }
  } catch (error) {
    errors.push(`Runtime detection failed: ${(error as Error).message}`)
    return {
      success: false,
      runtime: 'unknown',
      features: {},
      errors
    }
  }
}

/**
 * Test edge-safe logger
 */
function testEdgeSafeLogger(): {
  success: boolean
  stats: any
  errors: string[]
} {
  const errors: string[] = []
  
  try {
    // Test basic logging
    edgeSafeLogger.info('Test log message', { testData: 'test' })
    edgeSafeLogger.warn('Test warning message')
    edgeSafeLogger.error('Test error message', { testError: true })
    
    // Test security event logging
    edgeSafeLogger.logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, {
      severity: 'MEDIUM',
      context: { testEvent: true }
    })
    
    // Test audit logging
    edgeSafeLogger.logAuditEvent('test_action', 'test_resource', 'SUCCESS', { test: true })
    
    // Get stats
    const stats = edgeSafeLogger.getStats()
    
    if (!stats || typeof stats !== 'object') {
      errors.push('Unable to get logger statistics')
    }
    
    if (stats.bufferSize < 0) {
      errors.push('Invalid buffer size in logger stats')
    }
    
    return {
      success: errors.length === 0,
      stats,
      errors
    }
  } catch (error) {
    errors.push(`Logger test failed: ${(error as Error).message}`)
    return {
      success: false,
      stats: {},
      errors
    }
  }
}

/**
 * Test runtime-safe factory
 */
async function testRuntimeSafeFactory(): Promise<{
  success: boolean
  components: any
  health: any
  errors: string[]
}> {
  const errors: string[] = []
  
  try {
    // Initialize components
    const components = RuntimeSafeFactory.initialize()
    
    if (!components.logger) {
      errors.push('Failed to initialize logger component')
    }
    
    if (!components.monitor) {
      errors.push('Failed to initialize monitor component')
    }
    
    if (!components.rateLimiter) {
      errors.push('Failed to initialize rate limiter component')
    }
    
    // Test component functionality
    components.logger.info('Factory test message')
    components.monitor.recordSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, { test: true })
    
    // Test rate limiter
    const rateLimitResult = await components.rateLimiter.checkRateLimit('test-user', 'api:general')
    
    if (typeof rateLimitResult.allowed !== 'boolean') {
      errors.push('Rate limiter returned invalid result')
    }
    
    // Get health status
    const health = RuntimeSafeFactory.getHealthStatus()
    
    if (!health || typeof health !== 'object') {
      errors.push('Unable to get factory health status')
    }
    
    return {
      success: errors.length === 0,
      components: {
        logger: !!components.logger,
        monitor: !!components.monitor,
        rateLimiter: !!components.rateLimiter
      },
      health,
      errors
    }
  } catch (error) {
    errors.push(`Factory test failed: ${(error as Error).message}`)
    return {
      success: false,
      components: {},
      health: {},
      errors
    }
  }
}

/**
 * Test security system integration
 */
async function testSecuritySystemIntegration(): Promise<{
  success: boolean
  initialization: boolean
  health: any
  config: any
  errors: string[]
}> {
  const errors: string[] = []
  
  try {
    // Test initialization
    initializeSecurity()
    
    // Test health check
    const health = await getSecurityHealth()
    
    if (!health || typeof health !== 'object') {
      errors.push('Unable to get security health status')
    } else {
      if (!health.status) {
        errors.push('Health check returned no status')
      }
      
      if (!health.components || typeof health.components !== 'object') {
        errors.push('Health check returned no component status')
      }
      
      if (!health.runtime) {
        errors.push('Health check returned no runtime information')
      }
    }
    
    // Test configuration validation
    const configValidation = validateSecurityConfig()
    
    if (!configValidation || typeof configValidation !== 'object') {
      errors.push('Unable to validate security configuration')
    }
    
    return {
      success: errors.length === 0,
      initialization: true,
      health,
      config: {
        validation: configValidation,
        settings: {
          runtime: SECURITY_CONFIG.global.runtime,
          environment: SECURITY_CONFIG.global.environment,
          features: Object.keys(SECURITY_CONFIG)
        }
      },
      errors
    }
  } catch (error) {
    errors.push(`Integration test failed: ${(error as Error).message}`)
    return {
      success: false,
      initialization: false,
      health: {},
      config: {},
      errors
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<{
  success: boolean
  results: {
    runtimeDetection: any
    edgeSafeLogger: any
    runtimeSafeFactory: any
    securitySystemIntegration: any
  }
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    errors: string[]
  }
}> {
  console.log('🧪 Running Runtime Compatibility Tests...')
  
  const results = {
    runtimeDetection: testRuntimeDetection(),
    edgeSafeLogger: testEdgeSafeLogger(),
    runtimeSafeFactory: await testRuntimeSafeFactory(),
    securitySystemIntegration: await testSecuritySystemIntegration()
  }
  
  const totalTests = 4
  const passedTests = Object.values(results).filter(result => result.success).length
  const failedTests = totalTests - passedTests
  const allErrors = Object.values(results).flatMap(result => result.errors)
  
  const success = passedTests === totalTests
  
  console.log(`📊 Test Results:`)
  console.log(`   Total Tests: ${totalTests}`)
  console.log(`   Passed: ${passedTests}`)
  console.log(`   Failed: ${failedTests}`)
  
  if (allErrors.length > 0) {
    console.log(`   Errors:`)
    allErrors.forEach(error => console.log(`     - ${error}`))
  }
  
  if (success) {
    console.log('✅ All tests passed! Runtime-safe security system is working correctly.')
  } else {
    console.log('❌ Some tests failed. Please review the errors above.')
  }
  
  return {
    success,
    results,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      errors: allErrors
    }
  }
}

// Export individual test functions for targeted testing
export {
  testRuntimeDetection,
  testEdgeSafeLogger,
  testRuntimeSafeFactory,
  testSecuritySystemIntegration,
  runAllTests
}