import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  updateFooterSocialLink, 
  deleteFooterSocialLink, 
  validateFooterSocialLinkData 
} from '@/lib/footer-management'
import { FooterSocialLinkFormData } from '@/types/footer-management'

// PUT /api/admin/footer/social/[id] - Update footer social link
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const body: Partial<FooterSocialLinkFormData> = await request.json()

    // Validate the data if it's a complete update
    if (body.platform && body.icon_name && body.url) {
      const errors = validateFooterSocialLinkData(body as FooterSocialLinkFormData)
      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        )
      }
    }

    const socialLink = await updateFooterSocialLink(id, body)
    return NextResponse.json({ data: socialLink })
  } catch (error) {
    console.error('Error updating footer social link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/footer/social/[id] - Delete footer social link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    await deleteFooterSocialLink(id)
    return NextResponse.json({ message: 'Footer social link deleted successfully' })
  } catch (error) {
    console.error('Error deleting footer social link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}