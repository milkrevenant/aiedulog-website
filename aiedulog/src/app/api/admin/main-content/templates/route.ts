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
import { requireAdmin } from '@/lib/auth/rds-auth-helpers'
import { createRDSClient } from '@/lib/db/rds-client'
import { TableRow } from '@/lib/db/types'

type ContentTemplateRow = TableRow<'content_templates'>
type UserProfileRow = TableRow<'user_profiles'>

// GET - Fetch content templates
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('type')
  const category = searchParams.get('category')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()

    let query = rds
      .from('content_templates')
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false })

    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          message: 'Content management tables not yet created. Please apply migration first.',
          templates: [] 
        })
      }
      throw error
    }
    
    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create new template
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()

    // Get user identity for created_by field
    const { data: identityRows } = await rds
      .from<UserProfileRow>('user_profiles')
      .select('user_id')
      .eq('user_id', auth.user.id)

    const identity = identityRows?.[0]

    const { data: templateRows, error } = await rds
      .from('content_templates')
      .insert({
        ...body,
        created_by: identity?.user_id,
        updated_by: identity?.user_id
      }, { select: '*' })

    const template = templateRows?.[0]
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PUT - Update template usage count
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { id, action } = body

    if (action === 'increment_usage') {
      // Increment usage count
      const { data: templateRows, error } = await rds
        .from('content_templates')
        .select('usage_count')
        .eq('id', id)

      const template = templateRows?.[0]

      if (error) throw error

      const { error: updateError } = await rds
        .from('content_templates')
        .eq('id', id)
        .update({
          usage_count: (template?.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
