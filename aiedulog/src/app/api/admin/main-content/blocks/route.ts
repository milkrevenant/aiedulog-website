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

type ContentBlockRow = TableRow<'content_blocks'>
type UserProfileRow = TableRow<'user_profiles'>

// GET - Fetch content blocks for a section
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const sectionId = searchParams.get('sectionId')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()

    if (!sectionId) {
      return NextResponse.json({ error: 'Section ID required' }, { status: 400 })
    }

    const { data: blocks, error } = await rds
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

    const { data: blockRows, error } = await rds
      .from('content_blocks')
      .insert({
        ...body,
        created_by: identity?.user_id,
        updated_by: identity?.user_id
      }, {
        select: `
          *,
          content_assets (*)
        `
      })

    const block = blockRows?.[0]
    
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
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { id, ...updateData } = body

    // Get user identity for updated_by field
    const { data: identityRows } = await rds
      .from<UserProfileRow>('user_profiles')
      .select('user_id')
      .eq('user_id', auth.user.id)

    const identity = identityRows?.[0]

    const { data: blockRows, error } = await rds
      .from('content_blocks')
      .eq('id', id)
      .update({
        ...updateData,
        updated_by: identity?.user_id,
        updated_at: new Date().toISOString()
      }, {
        select: `
          *,
          content_assets (*)
        `
      })

    const block = blockRows?.[0]
    
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
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()

    if (!id) {
      return NextResponse.json({ error: 'Block ID required' }, { status: 400 })
    }

    const { error } = await rds
      .from('content_blocks')
      .eq('id', id)
      .delete()
    
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
