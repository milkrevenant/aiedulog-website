/**
 * Main Content Management - Server Component
 * MIGRATION: Updated to Server Component + Client Component architecture (2025-10-14)
 */

import { createClient } from '@/lib/supabase/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth-options'
import { redirect } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { MainContentClient } from './MainContentClient'

interface ContentSection {
  id: string
  section_key: string
  title: any
  slug: any
  description: any
  status: 'draft' | 'published' | 'archived' | 'scheduled'
  published_at?: string
  sort_order: number
  is_featured: boolean
  visibility: 'public' | 'members_only' | 'admin_only'
  settings: any
  template: string
  version_number: number
  last_published_version: number
  blocks?: any[]
  created_at: string
  updated_at: string
}

interface ContentTemplate {
  id: string
  template_key: string
  name: any
  description: any
  template_type: 'section' | 'block' | 'page'
  category: string
  template_data: any
  preview_image_url?: string
  is_public: boolean
  usage_count: number
}

async function getMainContentData() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const supabase = createClient()

  try {
    // Fetch sections
    const { data: sections, error: sectionsError } = await supabase
      .from('content_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError)
    }

    // Fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('content_templates')
      .select('*')
      .order('usage_count', { ascending: false })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
    }

    return {
      sections: sections || [],
      templates: templates || [],
    }
  } catch (error) {
    console.error('Error in getMainContentData:', error)
    return {
      sections: [],
      templates: [],
    }
  }
}

export default async function MainContentManagementPage() {
  const data = await getMainContentData()

  if (data === null) {
    redirect('/auth/login?callbackUrl=/admin/main-content')
  }

  return (
    <AuthGuard requireAdmin>
      <MainContentClient
        initialSections={data.sections}
        initialTemplates={data.templates}
      />
    </AuthGuard>
  )
}
