import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/rds-auth-helpers'
import {
  getFooterCategories,
  createFooterCategory,
  validateFooterCategoryData
} from '@/lib/footer-management'
import { FooterCategoryFormData } from '@/types/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// GET /api/admin/footer/categories - Get all footer categories
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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
const postHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
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

export const GET = withAdminSecurity(getHandler);
export const POST = withAdminSecurity(postHandler);
