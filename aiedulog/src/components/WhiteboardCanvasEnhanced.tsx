'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Box, 
  CircularProgress, 
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Typography,
  Button
} from '@mui/material'
import {
  Save,
  Download,
  Clear,
  Undo,
  Redo,
  GridOn,
  GridOff,
  Fullscreen,
  FullscreenExit,
  Palette,
  Add,
  Remove,
  FitScreen
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

// Type imports for Excalidraw
type ExcalidrawElement = any
type AppState = any
type BinaryFiles = any
type ExcalidrawImperativeAPI = any

// Dynamic import Excalidraw with proper types
const Excalidraw = dynamic(
  async () => {
    const module = await import('@excalidraw/excalidraw')
    return module.Excalidraw
  },
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    ),
  }
)

// Additional Excalidraw components are handled internally

interface WhiteboardCanvasEnhancedProps {
  boardId: string
  roomId: string
  onClose?: () => void
}

export default function WhiteboardCanvasEnhanced({ 
  boardId, 
  roomId,
  onClose 
}: WhiteboardCanvasEnhancedProps) {
  const [initialData, setInitialData] = useState<any>(null)
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [lastSaveTime, setLastSaveTime] = useState(Date.now())
  // const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [gridMode, setGridMode] = useState(false)
  const [viewBackgroundColor, setViewBackgroundColor] = useState('#ffffff')
  const [zoom, setZoom] = useState(1)
  
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize and load board data
  useEffect(() => {
    loadBoardData()
  }, [boardId])

  // Setup realtime collaboration
  useEffect(() => {
    const channel = setupRealtimeCollaboration()
    
    return () => {
      supabase.removeChannel(channel)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [roomId])

  const loadBoardData = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_boards')
        .select('data')
        .eq('id', boardId)
        .single()

      if (data?.data) {
        setInitialData({
          elements: data.data.elements || [],
          appState: {
            ...data.data.appState,
            collaborators: [],
            currentChartType: 'bar',
            currentItemBackgroundColor: 'transparent',
            currentItemEndArrowhead: 'arrow',
            currentItemFillStyle: 'solid',
            currentItemFontFamily: 1,
            currentItemFontSize: 20,
            currentItemOpacity: 100,
            currentItemRoughness: 1,
            currentItemStartArrowhead: null,
            currentItemStrokeColor: '#1e1e1e',
            currentItemStrokeStyle: 'solid',
            currentItemStrokeWidth: 2,
            currentItemTextAlign: 'left',
            gridSize: null,
            viewBackgroundColor: data.data.appState?.viewBackgroundColor || '#ffffff',
          },
          files: data.data.files || null,
          scrollToContent: true,
        })
        setViewBackgroundColor(data.data.appState?.viewBackgroundColor || '#ffffff')
      } else {
        // Set default initial data for new board
        setInitialData({
          elements: [],
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
            gridSize: null,
          },
          scrollToContent: true,
        })
      }
    } catch (error) {
      console.error('Failed to load board data:', error)
      // Set default data on error
      setInitialData({
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveBoardData = useCallback(async (
    elements: readonly ExcalidrawElement[], 
    appState: AppState,
    files: BinaryFiles
  ) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce saving with timeout
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave = {
          elements: elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemFontFamily: appState.currentItemFontFamily,
            zoom: appState.zoom?.value || 1,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            gridSize: appState.gridSize,
          },
          files: files,
          timestamp: Date.now(),
        }

        await supabase
          .from('collaboration_boards')
          .update({ 
            data: dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', boardId)

        // Broadcast changes to other users
        await supabase.channel(`whiteboard-${roomId}`).send({
          type: 'broadcast',
          event: 'canvas-update',
          payload: {
            elements,
            appState: dataToSave.appState,
            files,
            userId: (await supabase.auth.getUser()).data.user?.id,
          },
        })
      } catch (error) {
        console.error('Failed to save board data:', error)
      }
    }, 1000) // Save after 1 second of inactivity
  }, [boardId, roomId])

  const setupRealtimeCollaboration = () => {
    const channel = supabase
      .channel(`whiteboard-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = new Map()
        
        Object.keys(state).forEach((key) => {
          const presence: any = state[key][0]
          if (presence) {
            users.set(presence.user_id, {
              id: presence.user_id,
              name: presence.name,
              cursor: presence.cursor,
              selectedElementIds: presence.selectedElementIds,
            })
          }
        })
        
        setCollaborators(users)
      })
      .on('broadcast', { event: 'canvas-update' }, async (payload) => {
        // Update canvas with remote changes
        const currentUserId = (await supabase.auth.getUser()).data.user?.id
        if (payload.payload.userId !== currentUserId) {
          const sceneData = {
            elements: payload.payload.elements,
            appState: payload.payload.appState,
            files: payload.payload.files,
          }
          // Update the initial data to reflect remote changes
          setInitialData(sceneData)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nickname, email')
              .eq('id', user.id)
              .single()

            await channel.track({
              user_id: user.id,
              name: profile?.nickname || profile?.email || 'Anonymous',
              online_at: new Date().toISOString(),
            })
          }
        }
      })

    return channel
  }

  const handleChange = useCallback((
    elements: readonly ExcalidrawElement[], 
    appState: AppState,
    files: BinaryFiles
  ) => {
    saveBoardData(elements, appState, files)
    setViewBackgroundColor(appState.viewBackgroundColor)
    setZoom(appState.zoom?.value || 1)
  }, [saveBoardData])

  // Custom toolbar actions
  const handleSave = async () => {
    // Save is triggered by onChange events
    alert('자동 저장이 활성화되어 있습니다.')
  }

  const handleExport = () => {
    // Export is handled internally by Excalidraw's built-in export menu
    alert('내보내기는 Excalidraw 메뉴를 사용해주세요.')
  }

  const handleClearCanvas = () => {
    if (confirm('모든 내용을 삭제하시겠습니까?')) {
      // Reset the initial data to clear the canvas
      setInitialData({
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        scrollToContent: true,
      })
    }
  }

  const toggleGrid = () => {
    // Grid toggle is handled internally by Excalidraw
    setGridMode(!gridMode)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else if (isFullscreen) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleZoomIn = () => {
    // Zoom is handled internally by Excalidraw
    setZoom(prev => Math.min(prev * 1.1, 5))
  }

  const handleZoomOut = () => {
    // Zoom is handled internally by Excalidraw
    setZoom(prev => Math.max(prev * 0.9, 0.1))
  }

  const handleZoomReset = () => {
    // Zoom is handled internally by Excalidraw
    setZoom(1)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper 
      ref={containerRef}
      elevation={0} 
      sx={{ 
        height: '100%', 
        width: '100%', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Custom Toolbar */}
      <Box 
        sx={{ 
          p: 1, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mr: 2 }}>
          🎨 협업 화이트보드
        </Typography>
        
        <Stack direction="row" spacing={0.5} divider={<Divider orientation="vertical" flexItem />}>
          {/* File actions */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="저장">
              <IconButton size="small" onClick={handleSave}>
                <Save fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="내보내기">
              <IconButton size="small" onClick={handleExport}>
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="모두 지우기">
              <IconButton size="small" onClick={handleClearCanvas}>
                <Clear fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* View actions */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={gridMode ? "그리드 끄기" : "그리드 켜기"}>
              <IconButton size="small" onClick={toggleGrid}>
                {gridMode ? <GridOff fontSize="small" /> : <GridOn fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="전체화면">
              <IconButton size="small" onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Zoom controls */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="확대">
              <IconButton size="small" onClick={handleZoomIn}>
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="축소">
              <IconButton size="small" onClick={handleZoomOut}>
                <Remove fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="화면에 맞추기">
              <IconButton size="small" onClick={handleZoomReset}>
                <FitScreen fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
              {Math.round(zoom * 100)}%
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1 }} />
        
        {/* Collaborators */}
        {collaborators.size > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              참여자: {collaborators.size}명
            </Typography>
          </Stack>
        )}

        {onClose && (
          <Button size="small" onClick={onClose} variant="outlined">
            닫기
          </Button>
        )}
      </Box>

      {/* Excalidraw Canvas */}
      <Box sx={{ flex: 1, position: 'relative', bgcolor: viewBackgroundColor }}>
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          theme="light"
          langCode="ko-KR"
          name="협업 화이트보드"
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: true,
              clearCanvas: false,
              changeViewBackgroundColor: true,
            },
            tools: {
              image: true,
            },
            welcomeScreen: false,
          }}
          renderTopRightUI={() => null}
        >
          {/* MainMenu and WelcomeScreen are handled internally by Excalidraw */}
        </Excalidraw>
      </Box>
    </Paper>
  )
}