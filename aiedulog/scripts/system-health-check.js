#!/usr/bin/env node

/**
 * AIedulog System Health Check Script
 * 
 * This script performs a comprehensive health check of the AIedulog system
 * and provides specific recommendations for fixing any issues found.
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'

// Color output for better readability
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function colorLog(color, message) {
  console.log(color + message + colors.reset)
}

// Test API endpoint
function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIedulog-HealthCheck/1.0'
      }
    }

    const req = http.request(url, options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            data: parsed,
            error: null
          })
        } catch (e) {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            data: body,
            error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
          })
        }
      })
    })

    req.on('error', (err) => {
      resolve({
        success: false,
        status: 0,
        data: null,
        error: err.message
      })
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

async function main() {
  colorLog(colors.blue + colors.bold, '🔍 AIedulog System Health Check')
  console.log('═'.repeat(60))
  console.log()

  // Basic local checks (integrated from health-check)
  try {
    const projectRoot = path.resolve(__dirname, '..')
    colorLog(colors.bold, '🧭 BASIC FILE CHECKS')

    // next.config.ts
    const nextConfigPath = path.join(projectRoot, 'next.config.ts')
    if (fs.existsSync(nextConfigPath)) {
      colorLog(colors.green, '✓ next.config.ts exists')
    } else {
      colorLog(colors.red, '✗ next.config.ts missing')
    }

    // middleware.ts and static exclusions
    const mwPath = path.join(projectRoot, 'src/middleware.ts')
    if (fs.existsSync(mwPath)) {
      const mw = fs.readFileSync(mwPath, 'utf8')
      if (mw.includes('_next/static') && mw.includes('_next/image')) {
        colorLog(colors.green, '✓ middleware excludes Next static paths')
      } else {
        colorLog(colors.yellow, '⚠ middleware may not exclude all Next static paths')
      }
    } else {
      colorLog(colors.red, '✗ src/middleware.ts missing')
    }

    // .env.local and required vars
    const envPath = path.join(projectRoot, '.env.local')
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8')
      const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
      const missing = requiredVars.filter(v => !env.includes(v))
      if (missing.length === 0) {
        colorLog(colors.green, '✓ .env.local has required Supabase vars')
      } else {
        colorLog(colors.yellow, `⚠ .env.local missing vars: ${missing.join(', ')}`)
      }
    } else {
      colorLog(colors.yellow, '⚠ .env.local not found')
    }
  } catch (e) {
    colorLog(colors.yellow, `⚠ Basic checks error: ${e.message}`)
  }

  const tests = [
    {
      name: 'Footer API',
      path: '/api/admin/footer',
      critical: true,
      expectedData: ['categories', 'socialLinks', 'settings']
    },
    {
      name: 'Security Violations API',
      path: '/api/security/violations',
      method: 'POST',
      data: { type: 'health_check', severity: 'low', details: 'System health check' },
      critical: true,
      expectedData: ['success', 'requestId']
    },
    {
      name: 'Main Page Load',
      path: '/main',
      critical: true,
      checkContent: true
    },
    {
      name: 'Dashboard Page',
      path: '/dashboard',
      critical: false,
      allowRedirect: true
    },
    {
      name: 'Chat Page',
      path: '/chat',
      critical: false
    },
    {
      name: 'Admin Footer Management',
      path: '/admin/footer',
      critical: false,
      allowRedirect: true
    }
  ]

  let passedTests = 0
  let failedTests = 0
  let criticalFailures = 0

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `)
    
    const result = await testEndpoint(test.path, test.method, test.data)
    
    let passed = false
    let message = ''

    if (result.success) {
      if (test.expectedData && typeof result.data === 'object') {
        const hasAllData = test.expectedData.every(key => 
          result.data && (key in result.data || (result.data.data && key in result.data.data))
        )
        
        if (hasAllData) {
          passed = true
          message = `✅ OK (${result.status})`
        } else {
          message = `⚠️  PARTIAL (${result.status}) - Missing expected data keys`
        }
      } else if (test.allowRedirect && result.status >= 300 && result.status < 400) {
        passed = true
        message = `✅ OK (${result.status} Redirect)`
      } else {
        passed = true
        message = `✅ OK (${result.status})`
      }
    } else {
      message = `❌ FAILED (${result.status || 'ERROR'})`
      if (result.error) {
        message += ` - ${result.error}`
      }
    }

    if (passed) {
      colorLog(colors.green, message)
      passedTests++
    } else {
      colorLog(colors.red, message)
      failedTests++
      if (test.critical) {
        criticalFailures++
      }
    }
  }

  console.log()
  console.log('═'.repeat(60))
  
  // Summary
  colorLog(colors.bold, '📊 HEALTH CHECK SUMMARY')
  console.log(`Total Tests: ${tests.length}`)
  colorLog(colors.green, `✅ Passed: ${passedTests}`)
  colorLog(colors.red, `❌ Failed: ${failedTests}`)
  
  if (criticalFailures > 0) {
    colorLog(colors.red + colors.bold, `🚨 Critical Failures: ${criticalFailures}`)
  }

  console.log()

  // Recommendations
  if (criticalFailures > 0) {
    colorLog(colors.red + colors.bold, '🔧 CRITICAL ISSUES DETECTED')
    console.log()
    console.log('Recommended actions:')
    console.log('1. Check if the development server is running (npm run dev)')
    console.log('2. Verify database migration has been applied')
    console.log('3. Check console logs for specific errors')
    console.log('4. Review SYSTEM_FIX_INSTRUCTIONS.md for detailed steps')
  } else if (failedTests > 0) {
    colorLog(colors.yellow + colors.bold, '⚠️  MINOR ISSUES DETECTED')
    console.log()
    console.log('These are likely non-critical issues:')
    console.log('- Authentication redirects (normal behavior)')
    console.log('- Optional features not fully configured')
  } else {
    colorLog(colors.green + colors.bold, '🎉 ALL SYSTEMS OPERATIONAL!')
    console.log()
    console.log('Your AIedulog system is healthy and functioning properly.')
    console.log()
    console.log('Next steps:')
    console.log('1. Test user authentication flows')
    console.log('2. Verify admin functionality')
    console.log('3. Monitor system logs during normal usage')
  }

  console.log()
  
  // Database status check
  colorLog(colors.blue + colors.bold, '🗄️  DATABASE STATUS')
  console.log('To verify database health, run:')
  console.log('  node scripts/fix-system-issues.js')
  console.log()
  console.log('If you see "No profile found" errors, execute:')
  console.log('  Copy scripts/run-migration.sql into Supabase SQL Editor')
  
  console.log()
  colorLog(colors.blue, `Health check completed at ${new Date().toLocaleString()}`)
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testEndpoint, main }