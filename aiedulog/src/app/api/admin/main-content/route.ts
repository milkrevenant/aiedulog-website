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

type MainContentSectionRow = TableRow<'main_content_sections'>
type ContentBlockRow = TableRow<'content_blocks'>

// GET - Fetch all content sections or specific section
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const sectionKey = searchParams.get('section')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()

    if (sectionKey) {
      // Fetch specific section with its content blocks
      const { data: sectionRows, error: sectionError } = await rds
        .from('main_content_sections')
        .select(`
          *,
          content_blocks (
            *,
            content_assets (*)
          )
        `)
        .eq('section_key', sectionKey)

      const section = sectionRows?.[0]
      
      if (sectionError) {
        // If table doesn't exist yet, return empty data
        if (sectionError.code === '42P01') {
          return NextResponse.json({ 
            message: 'Content management tables not yet created. Please apply migration first.',
            section: null 
          })
        }
        throw sectionError
      }
      
      return NextResponse.json({ section })
    } else {
      // Fetch all sections
      const { data: sections, error: sectionsError } = await rds
        .from('main_content_sections')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (sectionsError) {
        // If table doesn't exist yet, return empty array
        if (sectionsError.code === '42P01') {
          return NextResponse.json({ 
            message: 'Content management tables not yet created. Please apply migration first.',
            sections: [] 
          })
        }
        throw sectionsError
      }
      
      return NextResponse.json({ sections })
    }
  } catch (error: any) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// POST - Create new content section or content block
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { type, data } = body

    if (type === 'section') {
      // Create new section
      const { data: sectionRows, error } = await rds
        .from('main_content_sections')
        .insert({
          ...data,
          created_by: auth.user.id
        }, { select: '*' })

      const section = sectionRows?.[0]

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({
            error: 'Content management tables not yet created. Please apply migration first.'
          }, { status: 503 })
        }
        throw error
      }

      return NextResponse.json({ section })
    } else if (type === 'block') {
      // Create new content block
      const { data: blockRows, error } = await rds
        .from('content_blocks')
        .insert({
          ...data,
          created_by: auth.user.id
        }, { select: '*' })

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
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create content' },
      { status: 500 }
    )
  }
}

// PUT - Update content section or block
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { type, id, data } = body

    if (type === 'section') {
      // Update section
      const { data: sectionRows, error } = await rds
        .from('main_content_sections')
        .eq('id', id)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        }, { select: '*' })

      const section = sectionRows?.[0]

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({
            error: 'Content management tables not yet created. Please apply migration first.'
          }, { status: 503 })
        }
        throw error
      }

      return NextResponse.json({ section })
    } else if (type === 'block') {
      // Update content block
      const { data: blockRows, error } = await rds
        .from('content_blocks')
        .eq('id', id)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        }, { select: '*' })

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
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update content' },
      { status: 500 }
    )
  }
}

// DELETE - Delete content block
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get('id')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID required' }, { status: 400 })
    }

    const { error } = await rds
      .from('content_blocks')
      .eq('id', blockId)
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
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete content' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
