import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/rds-auth-helpers'
import {
  updateFooterSocialLink,
  deleteFooterSocialLink,
  validateFooterSocialLinkData
} from '@/lib/footer-management'
import { FooterSocialLinkFormData } from '@/types/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// PUT /api/admin/footer/social/[id] - Update footer social link
const putHandler = async (request: NextRequest, context: SecurityContext, { params }: { params: { id: string } }): Promise<NextResponse> => {
  const { id } = params;
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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
const deleteHandler = async (request: NextRequest, context: SecurityContext, { params }: { params: { id: string } }): Promise<NextResponse> => {
  const { id } = params;
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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

export const PUT = withAdminSecurity(putHandler);
export const DELETE = withAdminSecurity(deleteHandler);
