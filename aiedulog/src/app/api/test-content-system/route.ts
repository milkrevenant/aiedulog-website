import {
withSecurity, 
  withPublicSecurity,
  withUserSecurity, 
  withAdminSecurity, 
  withHighSecurity,
  withAuthSecurity,
  withUploadSecurity,
} from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { 
  createErrorResponse, 
  handleValidationError,
  handleUnexpectedError,
  ErrorType 
} from '@/lib/security/error-handler';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type MainContentSection = {
  section_key: string
  title: string | null
  status: string | null
}

/**
 * Test endpoint to verify Main Content Management System is working
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * This endpoint tests database connectivity and basic functionality
 */
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = createClient()
  
  try {
    console.log('🔍 Testing Main Content Management System...')
    
    // Test 1: Check if main tables exist
    console.log('Testing table existence...')
    const { data: sections, error: sectionsError } = await supabase
      .from('main_content_sections')
      .select('id, section_key, title, status')
      .limit(5)
    
    if (sectionsError) {
      if (sectionsError.code === '42P01') {
        return NextResponse.json({
          status: 'MIGRATION_REQUIRED',
          message: 'Content management tables do not exist. Please apply migration first.',
          error: sectionsError.message,
          instructions: {
            step1: 'Go to https://supabase.com/dashboard/project/njnrezduzotxfombfanu/sql/new',
            step2: 'Copy contents of /supabase/migrations/20250901_main_content_management_system.sql',
            step3: 'Paste into SQL editor and click Run',
            step4: 'Wait 1-2 minutes for completion',
            step5: 'Run this test again'
          }
        }, { status: 503 })
      }
      throw sectionsError
    }

    console.log(`✅ Found ${sections?.length} content sections`)
    
    // Test 2: Check content blocks table
    console.log('Testing content blocks...')
    const { data: blocks, error: blocksError } = await supabase
      .from('content_blocks')
      .select('id, section_id, block_type')
      .limit(3)
    
    if (blocksError && blocksError.code !== '42P01') {
      console.log('⚠️ Content blocks error:', blocksError.message)
    }

    // Test 3: Check if sample data exists
    const sampleSections = [
      'introduction',
      'vision', 
      'purpose',
      'news'
    ]
    
    const sectionsFound = sections?.filter((section: MainContentSection) => 
      sampleSections.includes(section.section_key)
    ) || []

    console.log(`✅ Found ${sectionsFound.length} expected sections`)
    
    // Test 4: Basic functionality test
    const systemHealth = {
      tablesExist: true,
      sampleDataLoaded: sections && sections.length > 0,
      expectedSectionsFound: sectionsFound.length,
      totalSections: sections?.length || 0,
      blocksTableExists: !blocksError || blocksError.code !== '42P01'
    }

    const overallHealth = systemHealth.tablesExist && 
                          systemHealth.sampleDataLoaded &&
                          systemHealth.expectedSectionsFound >= 2

    return NextResponse.json({
      status: overallHealth ? 'HEALTHY' : 'PARTIAL',
      timestamp: new Date().toISOString(),
      systemHealth,
      sampleSections: sections?.map((section: MainContentSection) => ({
        key: section.section_key,
        title: section.title,
        status: section.status
      })) || [],
      blocksCount: blocks?.length || 0,
      message: overallHealth 
        ? 'Main Content Management System is working correctly!'
        : 'System partially working - some components may need attention',
      nextSteps: overallHealth ? [
        '✅ System is ready for use',
        '🔗 Access admin at: http://localhost:3000/admin/main-content',
        '🧪 Test API at: http://localhost:3000/api/admin/main-content',
        '📖 Start Phase 2: Frontend Integration'
      ] : [
        '⚠️ Verify all migration tables created',
        '🔧 Check sample data population',
        '🔍 Review system logs for issues'
      ]
    })

  } catch (error: any) {
    console.error('❌ Content system test failed:', error)
    
    return NextResponse.json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred',
      details: error.code || 'No error code',
      message: 'Content management system test failed',
      troubleshooting: {
        commonIssues: [
          'Database migration not applied',
          'Supabase connection issues', 
          'Authentication problems',
          'Table permissions not set correctly'
        ],
        solutions: [
          'Apply migration: /supabase/migrations/20250901_main_content_management_system.sql',
          'Check .env.local for correct Supabase keys',
          'Verify project permissions in Supabase dashboard',
          'Review server logs for detailed error information'
        ]
      }
    }, { status: 500 })
  }
}

/**
 * Quick health check endpoint
 */
export async function HEAD() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('main_content_sections')
      .select('id')
      .limit(1)
    
    if (error?.code === '42P01') {
      return new NextResponse(null, { 
        status: 503,
        headers: { 'X-System-Status': 'MIGRATION_REQUIRED' }
      })
    }
    
    if (error) {
      return new NextResponse(null, { 
        status: 500,
        headers: { 'X-System-Status': 'ERROR' }
      })
    }
    
    return new NextResponse(null, { 
      status: 200,
      headers: { 'X-System-Status': 'HEALTHY' }
    })
  } catch {
    return new NextResponse(null, { 
      status: 500,
      headers: { 'X-System-Status': 'ERROR' }
    })
  }
}

export const GET = withPublicSecurity(getHandler);
