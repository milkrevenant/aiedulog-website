import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getFooterCategories, 
  createFooterCategory, 
  validateFooterCategoryData 
} from '@/lib/footer-management'
import { FooterCategoryFormData } from '@/types/footer-management'

// GET /api/admin/footer/categories - Get all footer categories
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('identity_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await getFooterCategories()
    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error('Error fetching footer categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/footer/categories - Create new footer category
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('identity_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: FooterCategoryFormData = await request.json()

    // Validate the data
    const errors = validateFooterCategoryData(body)
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const category = await createFooterCategory(body)
    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    console.error('Error creating footer category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}