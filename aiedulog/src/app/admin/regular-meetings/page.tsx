/**
 * Regular Meetings Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { RegularMeetingsClient } from './RegularMeetingsClient'

interface RegularMeeting {
  id: string
  title: string
  description?: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  online_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

async function getRegularMeetings() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('regular_meetings')
      .select('*')
      .order('meeting_date', { ascending: true })

    if (error) {
      console.error('Error fetching regular meetings:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getRegularMeetings:', error)
    return []
  }
}

export default async function RegularMeetingsManagementPage() {
  const data = await getRegularMeetings()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/regular-meetings')
  }

  return (
    <AuthGuard requireAdmin>
      <RegularMeetingsClient initialMeetings={data} />
    </AuthGuard>
  )
}
