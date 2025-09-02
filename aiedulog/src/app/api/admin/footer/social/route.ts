import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getFooterSocialLinks, 
  createFooterSocialLink, 
  validateFooterSocialLinkData 
} from '@/lib/footer-management'
import { FooterSocialLinkFormData } from '@/types/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// GET /api/admin/footer/social - Get all footer social links
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
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

    const socialLinks = await getFooterSocialLinks()
    return NextResponse.json({ data: socialLinks })
  } catch (error) {
    console.error('Error fetching footer social links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/footer/social - Create new footer social link
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
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

    const body: FooterSocialLinkFormData = await request.json()

    // Validate the data
    const errors = validateFooterSocialLinkData(body)
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const socialLink = await createFooterSocialLink(body)
    return NextResponse.json({ data: socialLink }, { status: 201 })
  } catch (error) {
    console.error('Error creating footer social link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);