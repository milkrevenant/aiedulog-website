import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/rds-auth-helpers'
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
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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
