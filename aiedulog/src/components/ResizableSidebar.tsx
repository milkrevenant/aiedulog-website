'use client'

/**
 * ResizableSidebar Component
 * 
 * A responsive sidebar component with drag-to-resize functionality.
 * 
 * Features:
 * - Drag handle on the right edge to resize
 * - Configurable min/max width constraints
 * - Persists width in localStorage
 * - Smooth visual feedback during resize
 * - Touch support for mobile devices
 * - Automatically hides resize handle on mobile
 * - Accessible cursor states
 * 
 * Usage:
 * <ResizableSidebar 
 *   defaultWidth={220} 
 *   minWidth={180} 
 *   maxWidth={400}
 *   storageKey="my-sidebar-width"
 * >
 *   {children}
 * </ResizableSidebar>
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, SxProps, Theme, useMediaQuery, useTheme } from '@mui/material'

interface ResizableSidebarProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  storageKey?: string
  sx?: SxProps<Theme>
  onWidthChange?: (width: number) => void
}

export default function ResizableSidebar({
  children,
  defaultWidth = 220,
  minWidth = 180,
  maxWidth = 400,
  storageKey = 'sidebar-width',
  sx,
  onWidthChange
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Load width from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10)
        if (parsedWidth >= minWidth && parsedWidth <= maxWidth) {
          setWidth(parsedWidth)
        }
      }
    }
  }, [storageKey, minWidth, maxWidth])

  // Save width to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString())
    }
    onWidthChange?.(width)
  }, [width, storageKey, onWidthChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(width)
    
    // Add cursor style to document
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    const deltaX = e.clientX - startX
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX))
    setWidth(newWidth)
  }, [isResizing, startX, startWidth, minWidth, maxWidth])

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return
    
    setIsResizing(false)
    
    // Remove cursor style from document
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [isResizing])

  // Add global mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Handle touch events for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsResizing(true)
    setStartX(touch.clientX)
    setStartWidth(width)
  }, [width])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing) return

    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touch.clientX - startX
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX))
    setWidth(newWidth)
  }, [isResizing, startX, startWidth, minWidth, maxWidth])

  const handleTouchEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isResizing, handleTouchMove, handleTouchEnd])

  return (
    <Box
      ref={sidebarRef}
      sx={{
        width,
        minWidth: width,
        maxWidth: width,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        transition: isResizing ? 'none' : 'width 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
        ...sx
      }}
    >
      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      
      {/* Resize handle - hidden on mobile */}
      {!isMobile && (
        <Box
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        sx={{
          position: 'absolute',
          top: 0,
          right: -2,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            '&::before': {
              opacity: 1,
              backgroundColor: 'primary.main'
            },
            '& .resize-grip': {
              opacity: 0.7
            }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 1,
            width: 2,
            backgroundColor: 'divider',
            opacity: 0,
            transition: 'all 0.2s ease'
          },
          ...(isResizing && {
            '&::before': {
              opacity: 1,
              backgroundColor: 'primary.main'
            }
          })
        }}
      >
        {/* Grip indicator */}
        <Box
          className="resize-grip"
          sx={{
            width: 4,
            height: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
            '&::before, &::after': {
              content: '""',
              width: 2,
              height: 2,
              backgroundColor: 'text.secondary',
              borderRadius: '50%'
            }
          }}
        />
        </Box>
      )}
      
      {/* Resize overlay (shows during resize) */}
      {isResizing && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'col-resize',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.01)'
          }}
        />
      )}
    </Box>
  )
}