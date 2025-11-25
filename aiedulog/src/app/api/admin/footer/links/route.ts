import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/rds-auth-helpers'
import {
  getFooterLinks,
  createFooterLink,
  validateFooterLinkData
} from '@/lib/footer-management'
import { FooterLinkFormData } from '@/types/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// GET /api/admin/footer/links - Get all footer links
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const url = new URL(request.url)
    const categoryId = url.searchParams.get('category_id')

    const links = await getFooterLinks(categoryId || undefined)
    return NextResponse.json({ data: links })
  } catch (error) {
    console.error('Error fetching footer links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/footer/links - Create new footer link
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body: FooterLinkFormData = await request.json()

    // Validate the data
    const errors = validateFooterLinkData(body)
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const link = await createFooterLink(body)
    return NextResponse.json({ data: link }, { status: 201 })
  } catch (error) {
    console.error('Error creating footer link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
