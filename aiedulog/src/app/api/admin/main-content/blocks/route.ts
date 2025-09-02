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

// GET - Fetch content blocks for a section
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const sectionId = searchParams.get('sectionId')
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 })
    }

    const { data: blocks, error } = await supabase
      .from('content_blocks')
      .select(`
        *,
        content_assets (*)
      `)
      .eq('section_id', sectionId)
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          message: 'Content management tables not yet created. Please apply migration first.',
          blocks: [] 
        })
      }
      throw error
    }
    
    return NextResponse.json({ blocks })
  } catch (error: any) {
    console.error('Error fetching blocks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blocks' },
      { status: 500 }
    )
  }
}

// POST - Create new content block
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
    
    const { data: block, error } = await supabase
      .from('content_blocks')
      .insert({
        ...body,
        created_by: identity?.id,
        updated_by: identity?.id
      })
      .select(`
        *,
        content_assets (*)
      `)
      .single()
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ block })
  } catch (error: any) {
    console.error('Error creating block:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create block' },
      { status: 500 }
    )
  }
}

// PUT - Update content block
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    // Get user identity for updated_by field
    const { data: identity } = await supabase
      .from('identities')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    const { data: block, error } = await supabase
      .from('content_blocks')
      .update({
        ...updateData,
        updated_by: identity?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        content_assets (*)
      `)
      .single()
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ block })
  } catch (error: any) {
    console.error('Error updating block:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update block' },
      { status: 500 }
    )
  }
}

// DELETE - Delete content block
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Block ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('content_blocks')
      .delete()
      .eq('id', id)
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting block:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete block' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);