import { NextRequest, NextResponse } from 'next/server'
import { getCompleteFooterData } from '@/lib/footer-management'

// GET /api/admin/footer - Get complete footer data for public use
// This endpoint is public as footer data needs to be accessible to all users
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const footerData = await getCompleteFooterData()
    return NextResponse.json({ 
      data: footerData,
      success: true 
    })
  } catch (error) {
    console.error('Error fetching complete footer data:', error)
    
    // Return fallback data instead of error
    const fallbackData = {
      categories: [],
      socialLinks: [],
      settings: {
        copyright: {
          id: 'copyright',
          setting_key: 'copyright',
          setting_value_ko: '© 2025 AIedulog',
          setting_value_en: '© 2025 AIedulog',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    }
    
    return NextResponse.json({ 
      data: fallbackData,
      success: true,
      fallback: true 
    })
  }
}