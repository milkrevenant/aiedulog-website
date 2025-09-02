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

// GET - Fetch content assets
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get('blockId')
  const sectionId = searchParams.get('sectionId')
  const assetType = searchParams.get('type')
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
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
    
    const { data: asset, error } = await supabase
      .from('content_assets')
      .insert({
        ...body,
        created_by: identity?.id
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
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    const { data: asset, error } = await supabase
      .from('content_assets')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('content_assets')
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