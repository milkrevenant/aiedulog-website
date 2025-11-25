/**
 * Announcements Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { AnnouncementsClient } from './AnnouncementsClient'

interface Announcement {
  id: string
  title: string
  content: string
  category: 'general' | 'urgent' | 'event' | 'maintenance'
  priority: number
  author_id?: string
  is_pinned: boolean
  is_published: boolean
  expires_at?: string
  created_at: string
  updated_at: string
  author?: {
    name?: string
    nickname?: string
    email: string
  }
}

async function getAnnouncements() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(
        `
        *,
        author:profiles!author_id (
          name,
          nickname,
          email
        )
      `
      )
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching announcements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAnnouncements:', error)
    return []
  }
}

export default async function AnnouncementsManagementPage() {
  const data = await getAnnouncements()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/announcements')
  }

  return (
    <AuthGuard requireAdmin>
      <AnnouncementsClient initialAnnouncements={data} />
    </AuthGuard>
  )
}
