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

type ContentAssetRow = TableRow<'content_assets'>
type IdentityRow = TableRow<'identities'>

// GET - Fetch content assets
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get('blockId')
  const sectionId = searchParams.get('sectionId')
  const assetType = searchParams.get('type')

  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()

    let query = rds
      .from('content_assets')
      .select('*')
      .order('created_at', { ascending: false })

    if (blockId) {
      query = query.eq('block_id', blockId)
    }

    if (sectionId) {
      query = query.eq('section_id', sectionId)
    }

    if (assetType) {
      query = query.eq('asset_type', assetType)
    }

    const { data: assets, error } = await query
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          message: 'Content management tables not yet created. Please apply migration first.',
          assets: [] 
        })
      }
      throw error
    }
    
    return NextResponse.json({ assets })
  } catch (error: any) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

// POST - Create new content asset
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
      .from('identities')
      .select('id')
      .eq('user_id', auth.user.id)

    const identity = identityRows?.[0]

    const { data: assetRows, error } = await rds
      .from('content_assets')
      .insert({
        ...body,
        created_by: identity?.id
      }, { select: '*' })

    const asset = assetRows?.[0]
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ asset })
  } catch (error: any) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create asset' },
      { status: 500 }
    )
  }
}

// PUT - Update content asset
const putHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rds = createRDSClient()
    const body = await request.json()
    const { id, ...updateData } = body

    const { data: assetRows, error } = await rds
      .from('content_assets')
      .eq('id', id)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      }, { select: '*' })

    const asset = assetRows?.[0]
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Content management tables not yet created. Please apply migration first.' 
        }, { status: 503 })
      }
      throw error
    }
    
    return NextResponse.json({ asset })
  } catch (error: any) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update asset' },
      { status: 500 }
    )
  }
}

// DELETE - Delete content asset
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
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    const { error } = await rds
      .from('content_assets')
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
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
