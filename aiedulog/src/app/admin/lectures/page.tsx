/**
 * Lectures Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { LecturesClient } from './LecturesClient'

interface Lecture {
  id: string
  title: string
  subtitle: string
  description: string
  instructor_name: string
  instructor_bio: string
  instructor_image: string
  category: string
  level: string
  duration: string
  price: number
  max_participants: number
  current_participants: number
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  schedule_details: string
  location_type: string
  location_address: string
  location_url: string
  thumbnail_image: string
  banner_image: string
  status: string
  registration_open: boolean
  featured: boolean
  created_at: string
  view_count: number
  tags: string[]
}

async function getLectures() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lectures:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getLectures:', error)
    return []
  }
}

export default async function LecturesManagementPage() {
  const data = await getLectures()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/lectures')
  }

  return (
    <AuthGuard requireAdmin>
      <LecturesClient initialLectures={data} />
    </AuthGuard>
  )
}
