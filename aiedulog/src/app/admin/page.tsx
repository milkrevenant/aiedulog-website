/**
 * Admin Dashboard - Server Component
 * MIGRATION: Updated to use Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getUserIdentity, getUserStats } from '@/lib/identity/helpers'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { AdminDashboardClient } from './AdminDashboardClient'

interface Statistics {
  totalUsers: number
  newUsersToday: number
  totalPosts: number
  totalComments: number
  activeUsers: number
  verifiedTeachers: number
}

async function getAdminData() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()
  const authUser = session.user as any

  try {
    // Get user profile via identity system
    const identity = await getUserIdentity(authUser, supabase)
    const profile = identity?.profile || null

    // Get statistics
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    // Get user statistics from identity system
    const userStats = await getUserStats(supabase)

    const stats: Statistics = {
      totalUsers: userStats.totalUsers,
      newUsersToday: userStats.newUsersToday,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      activeUsers: userStats.activeUsers,
      verifiedTeachers: userStats.verifiedTeachers,
    }

    // Get recent activities
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, created_at, author')
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      profile,
      stats,
      recentActivities: recentPosts || [],
    }
  } catch (error) {
    console.error('Error fetching admin data:', error)
    return {
      profile: null,
      stats: {
        totalUsers: 0,
        newUsersToday: 0,
        totalPosts: 0,
        totalComments: 0,
        activeUsers: 0,
        verifiedTeachers: 0,
      },
      recentActivities: [],
    }
  }
}

export default async function AdminDashboard() {
  const data = await getAdminData()

  if (!data) {
    redirect('/auth/login?callbackUrl=/admin')
  }

  return (
    <AuthGuard requireAuth requireModerator>
      <AdminDashboardClient
        initialStats={data.stats}
        recentActivities={data.recentActivities}
        userProfile={data.profile}
      />
    </AuthGuard>
  )
}
