import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getFooterSettings, 
  updateFooterSetting 
} from '@/lib/footer-management'
import { FooterSettingFormData } from '@/types/footer-management'

// GET /api/admin/footer/settings - Get all footer settings
export async function GET() {
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

    const settings = await getFooterSettings()
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Error fetching footer settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/footer/settings - Update footer settings (bulk update)
export async function PUT(request: Request) {
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

    const body: Record<string, FooterSettingFormData> = await request.json()

    const updatedSettings = []
    for (const [key, data] of Object.entries(body)) {
      const setting = await updateFooterSetting(key, data)
      updatedSettings.push(setting)
    }

    return NextResponse.json({ data: updatedSettings })
  } catch (error) {
    console.error('Error updating footer settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}