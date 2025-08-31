'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Typography, Paper, CircularProgress } from '@mui/material'

interface ExcalidrawObsidianStyleProps {
  boardId?: string
  roomId?: string
  onChange?: (elements: any[], appState: any) => void
  height?: string | number
}

/**
 * Excalidraw component inspired by Obsidian plugin implementation
 * This approach directly manipulates React elements to avoid readonly property issues
 */
export default function ExcalidrawObsidianStyle({ 
  boardId,
  roomId,
  onChange,
  height = '100%'
}: ExcalidrawObsidianStyleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const excalidrawRootRef = useRef<any>(null)
  const excalidrawAPIRef = useRef<any>(null)

  useEffect(() => {
    let isMounted = true

    const initExcalidraw = async () => {
      try {
        // Guard against SSR
        if (typeof window === 'undefined' || !containerRef.current) {
          return
        }

        // Clear any existing content
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Import necessary modules - following Obsidian's pattern
        const [
          { default: React },
          { createRoot },
          excalidrawModule
        ] = await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('@excalidraw/excalidraw')
        ])

        if (!isMounted || !containerRef.current) return

        const { Excalidraw } = excalidrawModule

        // Create a wrapper function to capture the API - similar to Obsidian's setExcalidrawAPI
        const setExcalidrawAPI = (api: any) => {
          excalidrawAPIRef.current = api
          console.log('Excalidraw API initialized:', api)
        }

        // Build props object - avoid spreading to prevent readonly issues
        const excalidrawProps: any = {
          excalidrawAPI: setExcalidrawAPI,
          theme: 'light',
          langCode: 'ko-KR',
          gridModeEnabled: false,
          viewModeEnabled: false,
          zenModeEnabled: false,
        }

        // Only add onChange if provided and wrap it to handle readonly issues
        if (onChange) {
          excalidrawProps.onChange = (
            elements: readonly any[],
            appState: any,
            files: any
          ) => {
            try {
              // Create mutable copies to avoid readonly issues
              const elementsCopy = elements ? JSON.parse(JSON.stringify(elements)) : []
              const appStateCopy = appState ? { ...appState } : {}
              onChange(elementsCopy, appStateCopy)
            } catch (err) {
              console.error('onChange error:', err)
            }
          }
        }

        // Add UI options
        excalidrawProps.UIOptions = {
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: true,
            loadScene: true,
            saveToActiveFile: true,
            toggleTheme: true,
          },
        }

        // Create React element using createElement (Obsidian's approach)
        const excalidrawElement = React.createElement(Excalidraw, excalidrawProps)

        // Create root and render
        const root = createRoot(containerRef.current)
        excalidrawRootRef.current = root
        
        root.render(excalidrawElement)

        if (isMounted) {
          setIsLoading(false)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          setError(`Failed to initialize Excalidraw: ${errorMsg}`)
          setIsLoading(false)
          console.error('Excalidraw initialization error:', err)
        }
      }
    }

    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(initExcalidraw, 100)

    return () => {
      isMounted = false
      clearTimeout(timer)
      
      // Cleanup
      if (excalidrawRootRef.current) {
        try {
          excalidrawRootRef.current.unmount()
        } catch (err) {
          console.error('Unmount error:', err)
        }
      }
    }
  }, [onChange])

  if (error) {
    return (
      <Paper sx={{ p: 3, height }}>
        <Typography color="error" variant="h6">
          오류 발생
        </Typography>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ height, width: '100%', position: 'relative' }}>
      {isLoading && (
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Excalidraw 로딩 중...</Typography>
        </Box>
      )}
      <Box 
        ref={containerRef}
        sx={{ 
          height: '100%',
          width: '100%',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          '& .excalidraw': {
            height: '100%',
            width: '100%'
          },
          '& .excalidraw .Island button svg': {
            width: '16px !important',
            height: '16px !important',
          }
        }}
      />
    </Box>
  )
}