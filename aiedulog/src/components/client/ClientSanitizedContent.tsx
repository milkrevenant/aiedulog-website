'use client'

import { useState, useEffect } from 'react'
import { useSanitizedHTML, SANITIZE_OPTIONS } from '@/lib/utils/sanitize-html'

interface ClientSanitizedContentProps {
  html: string
  options?: keyof typeof SANITIZE_OPTIONS | Record<string, any>
  className?: string
  fallback?: React.ReactNode
  children?: (sanitizedHTML: string) => React.ReactNode
}

/**
 * Client-side component that safely renders sanitized HTML
 * Shows fallback during SSR, then hydrates with sanitized content
 */
export function ClientSanitizedContent({
  html,
  options = 'RICH_TEXT',
  className,
  fallback = null,
  children
}: ClientSanitizedContentProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  // Get sanitization options
  const sanitizeOptions = typeof options === 'string' 
    ? SANITIZE_OPTIONS[options as keyof typeof SANITIZE_OPTIONS] 
    : options

  const sanitizedHTML = useSanitizedHTML(html, sanitizeOptions)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show fallback during SSR
  if (!isMounted) {
    return fallback ? <>{fallback}</> : null
  }

  // Render sanitized content
  if (children) {
    return <>{children(sanitizedHTML)}</>
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  )
}