/**
 * Training Programs Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { TrainingProgramsClient } from './TrainingProgramsClient'

interface TrainingProgram {
  id: string
  title: string
  subtitle?: string
  description?: string
  training_date: string
  start_time?: string
  end_time?: string
  duration_hours?: number
  location?: string
  online_link?: string
  instructor_name: string
  instructor_title?: string
  instructor_bio?: string
  instructor_image?: string
  program_content?: any
  materials_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  fee: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

async function getTrainingPrograms() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('training_programs')
      .select('*')
      .order('training_date', { ascending: true })

    if (error) {
      console.error('Error fetching training programs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getTrainingPrograms:', error)
    return []
  }
}

export default async function TrainingProgramsManagementPage() {
  const data = await getTrainingPrograms()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/training-programs')
  }

  return (
    <AuthGuard requireAdmin>
      <TrainingProgramsClient initialPrograms={data} />
    </AuthGuard>
  )
}
