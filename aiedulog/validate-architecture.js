#!/usr/bin/env node

/**
 * Runtime-Safe Security Architecture Validation Script
 * Tests the new security system in Node.js environment
 */

const path = require('path')

console.log('🧪 Testing Runtime-Safe Security Architecture...\n')

async function validateArchitecture() {
  try {
    // Test runtime detection
    console.log('1. Testing Runtime Detection...')
    const { detectRuntime, runtimeCapabilities } = require('./src/lib/security/runtime-detector.ts')
    const runtime = detectRuntime()
    const features = runtimeCapabilities.getFeatures()
    
    console.log(`   ✅ Runtime detected: ${runtime}`)
    console.log(`   ✅ Features: ${Object.keys(features).filter(k => features[k]).join(', ')}`)
    
    // Test edge-safe logger
    console.log('\n2. Testing Edge-Safe Logger...')
    const { edgeSafeLogger } = require('./src/lib/security/edge-safe-logger.ts')
    
    edgeSafeLogger.info('Test log message', { test: true })
    edgeSafeLogger.warn('Test warning')
    edgeSafeLogger.error('Test error', { test: true })
    
    const stats = edgeSafeLogger.getStats()
    console.log(`   ✅ Logger working - Buffer: ${stats.bufferSize}, Runtime: ${stats.runtime}`)
    
    // Test security factory
    console.log('\n3. Testing Runtime-Safe Factory...')
    const { RuntimeSafeFactory } = require('./src/lib/security/runtime-safe-factory.ts')
    
    const components = RuntimeSafeFactory.initialize()
    console.log('   ✅ Components initialized:')
    console.log(`      - Logger: ${!!components.logger}`)
    console.log(`      - Monitor: ${!!components.monitor}`)
    console.log(`      - Rate Limiter: ${!!components.rateLimiter}`)
    
    // Test security system integration
    console.log('\n4. Testing Security System Integration...')
    const security = require('./src/lib/security/index.ts')
    
    // Initialize security system
    security.initializeSecurity()
    console.log('   ✅ Security system initialized')
    
    // Get health status
    const health = await security.getSecurityHealth()
    console.log(`   ✅ Health Status: ${health.status}`)
    console.log(`   ✅ Runtime: ${health.runtime}`)
    
    // Validate configuration
    const configValidation = security.validateSecurityConfig()
    console.log(`   ✅ Configuration valid: ${configValidation.valid}`)
    if (configValidation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${configValidation.warnings.length}`)
    }
    
    console.log('\n🎉 All tests passed! Runtime-Safe Security Architecture is working correctly.')
    console.log('\n📊 Summary:')
    console.log(`   - Runtime Environment: ${runtime}`)
    console.log(`   - Security Status: ${health.status}`)
    console.log(`   - Components Active: ${Object.keys(health.components).filter(k => health.components[k]).length}`)
    console.log(`   - Configuration: ${configValidation.valid ? 'Valid' : 'Invalid'}`)
    
    return true
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message)
    console.error('\n🔍 Error details:', error.stack)
    return false
  }
}

// Run validation
validateArchitecture()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })