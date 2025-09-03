import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  updateFooterCategory, 
  deleteFooterCategory, 
  validateFooterCategoryData 
} from '@/lib/footer-management'
import { FooterCategoryFormData } from '@/types/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// PUT /api/admin/footer/categories/[id] - Update footer category
const putHandler = async (request: NextRequest, context: SecurityContext, { params }: { params: { id: string } }): Promise<NextResponse> => {
  const { id } = params;
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
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: Partial<FooterCategoryFormData> = await request.json()

    // Validate the data if it's a complete update
    if (body.title_ko) {
      const errors = validateFooterCategoryData(body as FooterCategoryFormData)
      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        )
      }
    }

    const category = await updateFooterCategory(id, body)
    return NextResponse.json({ data: category })
  } catch (error) {
    console.error('Error updating footer category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/footer/categories/[id] - Delete footer category
const deleteHandler = async (request: NextRequest, context: SecurityContext, { params }: { params: { id: string } }): Promise<NextResponse> => {
  const { id } = params;
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
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteFooterCategory(id)
    return NextResponse.json({ message: 'Footer category deleted successfully' })
  } catch (error) {
    console.error('Error deleting footer category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);