import { NextResponse } from 'next/server'
import { getCompleteFooterData } from '@/lib/footer-management'

// GET /api/admin/footer - Get complete footer data for public use
export async function GET() {
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