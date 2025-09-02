/**
 * Content Management System Client Utilities
 * Public content fetching functions for frontend pages
 */

import type {
  MainContentSection,
  ContentBlock,
  LanguageCode,
} from '@/types/content-management'

// ============================================================================
// PUBLIC CONTENT FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch a specific content section with its blocks (PUBLIC)
 */
export async function fetchContentSection(
  sectionKey: string,
  language: LanguageCode = 'ko'
): Promise<MainContentSection | null> {
  try {
    const response = await fetch(`/api/content/public?section=${encodeURIComponent(sectionKey)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
    })
    
    if (!response.ok) {
      console.error('Failed to fetch content section:', response.statusText)
      return null
    }
    
    const result = await response.json()
    return result.section || null
  } catch (error) {
    console.error('Error in fetchContentSection:', error)
    return null
  }
}

/**
 * Fetch all published content sections (PUBLIC)
 */
export async function fetchAllContentSections(
  language: LanguageCode = 'ko'
): Promise<MainContentSection[]> {
  try {
    const response = await fetch('/api/content/public', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.error('Failed to fetch content sections:', response.statusText)
      return []
    }
    
    const result = await response.json()
    return result.sections || []
  } catch (error) {
    console.error('Error in fetchAllContentSections:', error)
    return []
  }
}

/**
 * Fetch content blocks for a specific section (PUBLIC)
 */
export async function fetchContentBlocks(
  sectionId: string,
  language: LanguageCode = 'ko'
): Promise<ContentBlock[]> {
  try {
    const response = await fetch(`/api/content/public?blocks=${encodeURIComponent(sectionId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.error('Failed to fetch content blocks:', response.statusText)
      return []
    }
    
    const result = await response.json()
    return result.blocks || []
  } catch (error) {
    console.error('Error in fetchContentBlocks:', error)
    return []
  }
}

// ============================================================================
// CONTENT UTILITIES
// ============================================================================

/**
 * Get localized text from multilingual content
 */
export function getLocalizedText(
  content: { ko?: string; en?: string } | string | undefined | null,
  language: LanguageCode = 'ko',
  fallback: string = ''
): string {
  if (!content) return fallback
  
  if (typeof content === 'string') return content
  
  if (typeof content === 'object') {
    return content[language] || content.ko || content.en || fallback
  }
  
  return fallback
}

/**
 * Generate SEO metadata from content section
 */
export function generateSEOMetadata(
  section: MainContentSection,
  language: LanguageCode = 'ko'
) {
  return {
    title: getLocalizedText(section.meta_title || section.title, language),
    description: getLocalizedText(
      section.meta_description || section.description,
      language
    ),
    openGraph: {
      title: getLocalizedText(section.meta_title || section.title, language),
      description: getLocalizedText(
        section.meta_description || section.description,
        language
      ),
      images: section.og_image_url ? [section.og_image_url] : undefined,
    },
  }
}

/**
 * Check if content should be visible based on conditions
 */
export function shouldShowContent(
  block: ContentBlock,
  userContext?: {
    isLoggedIn?: boolean
    userRole?: string
    membershipLevel?: string
  }
): boolean {
  // Check visibility level
  if (block.visibility === 'admin_only') {
    return userContext?.userRole === 'admin'
  }
  
  if (block.visibility === 'members_only') {
    return userContext?.isLoggedIn === true
  }
  
  return block.is_active
}

/**
 * Track content interaction (fire and forget)
 */
export async function trackContentInteraction(
  contentType: 'section' | 'block',
  contentId: string,
  eventType: 'view' | 'click' | 'interaction' | 'share' | 'download',
  interactionData?: Record<string, any>
) {
  try {
    // Fire and forget - don't await or handle errors
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: contentType,
        content_id: contentId,
        event_type: eventType,
        interaction_data: interactionData,
        created_at: new Date().toISOString(),
        created_date: new Date().toISOString().split('T')[0],
      }),
    }).catch(() => {
      // Silently ignore analytics failures
    })
  } catch (error) {
    // Silently ignore analytics failures
  }
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Simple in-memory cache for content
 */
const contentCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached content or fetch if not cached
 */
export async function getCachedContent<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = contentCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T
  }
  
  const data = await fetchFn()
  contentCache.set(key, { data, timestamp: Date.now() })
  
  return data
}

/**
 * Clear content cache
 */
export function clearContentCache(key?: string) {
  if (key) {
    contentCache.delete(key)
  } else {
    contentCache.clear()
  }
}