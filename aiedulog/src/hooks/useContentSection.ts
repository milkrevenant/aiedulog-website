'use client'

import { useState, useEffect } from 'react'
import { fetchContentSection } from '@/lib/content-client'
import type { MainContentSection, LanguageCode } from '@/types/content-management'

interface UseContentSectionOptions {
  sectionKey: string
  language?: LanguageCode
  enabled?: boolean
}

interface UseContentSectionReturn {
  section: MainContentSection | null
  blocks: any[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useContentSection({ 
  sectionKey, 
  language = 'ko',
  enabled = true 
}: UseContentSectionOptions): UseContentSectionReturn {
  const [section, setSection] = useState<MainContentSection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)
      
      const contentSection = await fetchContentSection(sectionKey, language)
      setSection(contentSection)
    } catch (err: any) {
      setError(err.message || 'Failed to load content')
      console.error(`Error loading ${sectionKey} content:`, err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sectionKey, language, enabled])

  return {
    section,
    blocks: (section as any)?.content_blocks || [],
    loading,
    error,
    refetch: fetchData
  }
}