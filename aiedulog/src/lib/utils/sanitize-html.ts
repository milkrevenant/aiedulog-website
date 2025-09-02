'use client'

import { useMemo } from 'react'

// Client-side DOMPurify wrapper that only runs in the browser
let DOMPurify: any = null
let isLoaded = false

const loadDOMPurify = async () => {
  if (typeof window !== 'undefined' && !isLoaded) {
    try {
      const module = await import('dompurify')
      DOMPurify = module.default
      isLoaded = true
    } catch (error) {
      console.warn('Failed to load DOMPurify:', error)
    }
  }
}

// Load DOMPurify when module loads
if (typeof window !== 'undefined') {
  loadDOMPurify()
}

interface SanitizeOptions {
  ALLOWED_TAGS?: readonly string[] | string[]
  ALLOWED_ATTR?: readonly string[] | string[]
  FORBID_TAGS?: readonly string[] | string[]
  FORBID_ATTR?: readonly string[] | string[]
  KEEP_CONTENT?: boolean
}

/**
 * Client-side HTML sanitization hook
 * Only sanitizes content in the browser, returns original content on server
 */
export function useSanitizedHTML(html: string, options?: SanitizeOptions) {
  return useMemo(() => {
    // During SSR, return unsanitized content (will be sanitized on hydration)
    if (typeof window === 'undefined' || !DOMPurify) {
      return html
    }

    // In browser, sanitize with DOMPurify
    return DOMPurify.sanitize(html, options)
  }, [html, options])
}

/**
 * Client-side sanitization function
 * Returns original content during SSR, sanitizes in browser
 */
export async function sanitizeHTML(html: string, options?: SanitizeOptions): Promise<string> {
  if (typeof window === 'undefined') {
    return html
  }
  
  if (!DOMPurify) {
    await loadDOMPurify()
  }
  
  if (!DOMPurify) {
    return html
  }
  
  return DOMPurify.sanitize(html, options)
}

/**
 * Default sanitization options for common use cases
 */
export const SANITIZE_OPTIONS = {
  // For rich text content
  RICH_TEXT: {
    ALLOWED_TAGS: [
      'p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 
      'a', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'hr'
    ] as string[],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 
      'class', 'id', 'style', 'target', 'rel'
    ] as string[],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'] as string[],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'] as string[]
  },
  
  // For FAQ answers
  FAQ: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li'] as string[],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'] as string[]
  },
  
  // For notification templates
  NOTIFICATION: {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'div', 'strong', 'b', 'em', 'i', 'a', 'br'] as string[],
    ALLOWED_ATTR: ['style', 'href', 'target', 'rel'] as string[]
  }
}