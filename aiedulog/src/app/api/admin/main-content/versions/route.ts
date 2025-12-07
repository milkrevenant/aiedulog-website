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

type MainContentVersionRow = TableRow<'main_content_versions'>
type UserProfileRow = TableRow<'user_profiles'>
type MainContentSectionRow = TableRow<'main_content_sections'>

// GET - Fetch content versions
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams} = new URL(request.url)
  const contentType = searchParams.get('contentType') // 'section' or 'block'
  const contentId = searchParams.get('contentId')
  const onlyPublished = searchParams.get('onlyPublished') === 'true'

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID are required' }, { status: 400 })
    }

    let query = rds
      .from('main_content_versions')
      .select(`
        *,
        created_by_identity:user_profiles!created_by (
          display_name:full_name,
          user_id
        ),
        approved_by_identity:user_profiles!approved_by (
          display_name:full_name,
          user_id
        )
      `)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('version_number', { ascending: false })

    if (onlyPublished) {
      query = query.eq('is_published', true)
    }

    const { data: versions, error } = await query
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          message: 'Content management tables not yet created. Please apply migration first.',
          versions: [] 
        })
      }
      throw error
    }
    
    return NextResponse.json({ versions })
  } catch (error: any) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

// POST - Create new content version
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { contentType, contentId, contentData, changeSummary, isMajor = false } = body

    if (!contentType || !contentId || !contentData) {
      return NextResponse.json({
        error: 'Content type, ID, and data are required'
      }, { status: 400 })
    }

    // Get user identity
    const { data: identityRows } = await rds
      .from<UserProfileRow>('user_profiles')
      .select('user_id')
      .eq('user_id', auth.user.id)

    const identity = identityRows?.[0]

    // Get next version number
    const { data: latestVersionRows } = await rds
      .from('main_content_versions')
      .select('version_number')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('version_number', { ascending: false })
      .limit(1)

    const latestVersion = latestVersionRows?.[0]
    const nextVersionNumber = (latestVersion?.version_number || 0) + 1

    const { data: versionRows, error } = await rds
      .from('main_content_versions')
      .insert({
        content_type: contentType,
        content_id: contentId,
        version_number: nextVersionNumber,
        content_data: contentData,
        change_summary: changeSummary,
        is_major_version: isMajor,
        change_type: 'update',
        created_by: identity?.user_id
      }, {
        select: `
          *,
          created_by_identity:user_profiles!created_by (
            display_name:full_name,
            user_id
          )
        `
      })

    const version = versionRows?.[0]
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ version })
  } catch (error: any) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create version' },
      { status: 500 }
    )
  }
}

// PUT - Publish version or update version info
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { id, action, approvalNotes } = body

    if (!id || !action) {
      return NextResponse.json({
        error: 'Version ID and action are required'
      }, { status: 400 })
    }

    // Get user identity
    const { data: identityRows } = await rds
      .from<UserProfileRow>('user_profiles')
      .select('user_id')
      .eq('user_id', auth.user.id)

    const identity = identityRows?.[0]

    if (action === 'publish') {
      // Get the version to publish
      const { data: versionToPublishRows } = await rds
        .from('main_content_versions')
        .select('*')
        .eq('id', id)

      const versionToPublish = versionToPublishRows?.[0]

      if (!versionToPublish) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 })
      }

      // Unpublish other versions of the same content
      await rds
        .from('main_content_versions')
        .eq('content_type', versionToPublish.content_type)
        .eq('content_id', versionToPublish.content_id)
        .neq('id', id)
        .update({ is_published: false })

      // Publish this version
      const { data: publishedVersionRows, error } = await rds
        .from('main_content_versions')
        .eq('id', id)
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          approved_by: identity?.user_id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
          change_type: 'publish'
        }, {
          select: `
            *,
            created_by_identity:user_profiles!created_by (
              display_name:full_name,
              user_id
            ),
            approved_by_identity:user_profiles!approved_by (
              display_name:full_name,
              user_id
            )
          `
        })

      const publishedVersion = publishedVersionRows?.[0]

      if (error) throw error

      // Update the main content table if it's a section
      if (versionToPublish.content_type === 'section') {
        await rds
          .from('main_content_sections')
          .eq('id', versionToPublish.content_id)
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            last_published_version: versionToPublish.version_number
          })
      }

      return NextResponse.json({ version: publishedVersion })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error updating version:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update version' },
      { status: 500 }
    )
  }
}

// DELETE - Delete version (admin only)
const deleteHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'User not found' }, { status: auth.status || 401 })
    }

    const rds = createRDSClient()

    if (!id) {
      return NextResponse.json({ error: 'Version ID required' }, { status: 400 })
    }

    // Check if this is a published version
    const { data: versionRows } = await rds
      .from('main_content_versions')
      .select('is_published')
      .eq('id', id)

    const version = versionRows?.[0]

    if (version?.is_published) {
      return NextResponse.json({
        error: 'Cannot delete published version'
      }, { status: 400 })
    }

    const { error } = await rds
      .from('main_content_versions')
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
    console.error('Error deleting version:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete version' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
