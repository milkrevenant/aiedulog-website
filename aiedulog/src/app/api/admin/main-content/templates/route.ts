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

// GET - Fetch content templates
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('type')
  const category = searchParams.get('category')
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
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
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Get user identity for created_by field
    const { data: identity } = await supabase
      .from('identities')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    const { data: template, error } = await supabase
      .from('content_templates')
      .insert({
        ...body,
        created_by: identity?.id,
        updated_by: identity?.id
      })
      .select()
      .single()
    
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
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, action } = body
    
    if (action === 'increment_usage') {
      // Increment usage count
      const { data: template, error } = await supabase
        .from('content_templates')
        .select('usage_count')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      const { error: updateError } = await supabase
        .from('content_templates')
        .update({ 
          usage_count: (template.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
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