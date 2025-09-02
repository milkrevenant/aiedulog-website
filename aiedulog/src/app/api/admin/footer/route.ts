import { NextRequest, NextResponse } from 'next/server'
import { getCompleteFooterData } from '@/lib/footer-management'
import { withAdminSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'

// GET /api/admin/footer - Get complete footer data for public use
const getHandler = async (request: NextRequest, context: SecurityContext): Promise<NextResponse> => {
  try {
    const footerData = await getCompleteFooterData()
    return NextResponse.json({ data: footerData })
  } catch (error) {
    console.error('Error fetching complete footer data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminSecurity(getHandler);