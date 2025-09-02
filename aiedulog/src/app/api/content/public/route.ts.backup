import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Public content fetching (no auth required)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const sectionKey = searchParams.get('section')
  const blocksForSection = searchParams.get('blocks')
  
  try {
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
        .eq('status', 'published')
        .eq('visibility', 'public')
        .single()
      
      if (sectionError) {
        console.error('Error fetching content section:', sectionError)
        // Return null for section not found rather than error
        return NextResponse.json({ section: null })
      }
      
      // Filter active blocks
      if (section && section.content_blocks) {
        section.content_blocks = section.content_blocks
          .filter((block: any) => block.is_active && block.visibility === 'public')
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
      }
      
      return NextResponse.json({ section })
    } 
    
    else if (blocksForSection) {
      // Fetch content blocks for a specific section
      const { data: blocks, error: blocksError } = await supabase
        .from('content_blocks')
        .select(`
          *,
          content_assets (*)
        `)
        .eq('section_id', blocksForSection)
        .eq('is_active', true)
        .eq('visibility', 'public')
        .order('sort_order', { ascending: true })
      
      if (blocksError) {
        console.error('Error fetching content blocks:', blocksError)
        return NextResponse.json({ blocks: [] })
      }
      
      return NextResponse.json({ blocks: blocks || [] })
    } 
    
    else {
      // Fetch all published sections (without blocks for performance)
      const { data: sections, error: sectionsError } = await supabase
        .from('main_content_sections')
        .select('*')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('sort_order', { ascending: true })
      
      if (sectionsError) {
        console.error('Error fetching content sections:', sectionsError)
        return NextResponse.json({ sections: [] })
      }
      
      return NextResponse.json({ sections: sections || [] })
    }
  } catch (error: any) {
    console.error('Error in public content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}