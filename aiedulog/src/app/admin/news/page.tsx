/**
 * News Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { NewsClient } from './NewsClient'

interface NewsPost {
  id: string
  title: string
  content: string
  summary?: string
  thumbnail_image?: string
  category: 'news' | 'event' | 'achievement'
  author_id?: string
  view_count: number
  is_featured: boolean
  is_published: boolean
  published_at: string
  created_at: string
  updated_at: string
  author?: {
    name?: string
    nickname?: string
    email: string
  }
}

async function getNewsPosts() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('news_posts')
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
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching news posts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getNewsPosts:', error)
    return []
  }
}

export default async function NewsManagementPage() {
  const data = await getNewsPosts()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/news')
  }

  return (
    <AuthGuard requireAdmin>
      <NewsClient initialNewsPosts={data} />
    </AuthGuard>
  )
}
