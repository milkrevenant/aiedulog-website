'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Box, CircularProgress } from '@mui/material'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
// Type imports for Excalidraw - using any to avoid type import issues
type ExcalidrawElement = any
type AppState = any

// Excalidraw를 dynamic import로 로드 (SSR 비활성화)
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

interface WhiteboardCanvasProps {
  boardId: string
  roomId: string
}

export default function WhiteboardCanvas({ boardId, roomId }: WhiteboardCanvasProps) {
  const [initialData, setInitialData] = useState<any>(null)
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [lastSaveTime, setLastSaveTime] = useState(Date.now())
  
  const supabase = createClient()

  // 초기 데이터 로드
  useEffect(() => {
    loadBoardData()
  }, [boardId])

  // 실시간 협업 설정
  useEffect(() => {
    const channel = setupRealtimeCollaboration()
    
    return () => {
      supabase.removeChannel(channel)
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
          appState: data.data.appState || {},
          files: data.data.files || null,
        })
      }
    } catch (error) {
      console.error('Failed to load board data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveBoardData = useCallback(async (elements: readonly ExcalidrawElement[], appState: AppState) => {
    // 너무 자주 저장하지 않도록 디바운싱
    const now = Date.now()
    if (now - lastSaveTime < 2000) return
    
    setLastSaveTime(now)

    try {
      const dataToSave = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        timestamp: now,
      }

      await supabase
        .from('collaboration_boards')
        .update({ 
          data: dataToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', boardId)

      // 다른 사용자에게 변경사항 브로드캐스트
      await supabase.channel(`whiteboard-${roomId}`).send({
        type: 'broadcast',
        event: 'canvas-update',
        payload: {
          elements,
          appState: dataToSave.appState,
          userId: (await supabase.auth.getUser()).data.user?.id,
        },
      })
    } catch (error) {
      console.error('Failed to save board data:', error)
    }
  }, [boardId, roomId, lastSaveTime])

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
      .on('broadcast', { event: 'canvas-update' }, (payload) => {
        // 다른 사용자의 변경사항 적용
        // Note: Without API access, we can't update the scene dynamically
        // This would require a different approach or library update
      })
      .on('broadcast', { event: 'cursor-update' }, (payload) => {
        // 커서 위치 업데이트
        const userId = payload.payload.userId
        if (userId && collaborators.has(userId)) {
          setCollaborators((prev) => {
            const updated = new Map(prev)
            const user = updated.get(userId)
            if (user) {
              user.cursor = payload.payload.cursor
            }
            return updated
          })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Use identity helper for consistent user data retrieval
            const identity = await getUserIdentity(user)
            const profile = identity?.profile

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

  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    saveBoardData(elements, appState)
  }, [saveBoardData])

  const handlePointerUpdate = useCallback(async (payload: any) => {
    if (!roomId) return

    await supabase.channel(`whiteboard-${roomId}`).send({
      type: 'broadcast',
      event: 'cursor-update',
      payload: {
        userId: (await supabase.auth.getUser()).data.user?.id,
        cursor: {
          x: payload.pointer.x,
          y: payload.pointer.y,
        },
      },
    })
  }, [roomId])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        theme="light"
        langCode="ko-KR"
        UIOptions={{
          canvasActions: {
            saveToActiveFile: true,
            loadScene: true,
            export: {},
            toggleTheme: true,
            clearCanvas: true,
            changeViewBackgroundColor: true,
          },
          tools: {
            image: true,
          },
        }}
        name="협업 화이트보드"
        gridModeEnabled={false}
        viewModeEnabled={false}
        zenModeEnabled={false}
      />
      
      {/* 협업자 커서 표시 (옵션) */}
      {Array.from(collaborators.values()).map((user) => (
        user.cursor && (
          <Box
            key={user.id}
            sx={{
              position: 'absolute',
              left: user.cursor.x,
              top: user.cursor.y,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: 2,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: 0,
                bgcolor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </Box>
          </Box>
        )
      ))}
    </Box>
  )
}