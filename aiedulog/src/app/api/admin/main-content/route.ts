import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all content sections or specific section
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const sectionKey = searchParams.get('section')
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (sectionKey) {
      // Fetch specific section with its content blocks
      const { data: section, error: sectionError } = await supabase
        .from('main_content_sections')
        .select(`
          *,
          content_blocks (
            *,
            content_assets (*)
          )
        `)
        .eq('section_key', sectionKey)
        .single()
      
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
      const { data: sections, error: sectionsError } = await supabase
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
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // TODO: Check if user has admin/moderator role
    // const hasPermission = await checkAdminPermission(user.id, supabase)
    
    const body = await request.json()
    const { type, data } = body
    
    if (type === 'section') {
      // Create new section
      const { data: section, error } = await supabase
        .from('main_content_sections')
        .insert({
          ...data,
          created_by: user.id
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
      
      return NextResponse.json({ section })
    } else if (type === 'block') {
      // Create new content block
      const { data: block, error } = await supabase
        .from('content_blocks')
        .insert({
          ...data,
          created_by: user.id
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
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { type, id, data } = body
    
    if (type === 'section') {
      // Update section
      const { data: section, error } = await supabase
        .from('main_content_sections')
        .update({
          ...data,
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
      
      return NextResponse.json({ section })
    } else if (type === 'block') {
      // Update content block
      const { data: block, error } = await supabase
        .from('content_blocks')
        .update({
          ...data,
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
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get('id')
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!blockId) {
      return NextResponse.json({ error: 'Block ID required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('content_blocks')
      .delete()
      .eq('id', blockId)
    
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