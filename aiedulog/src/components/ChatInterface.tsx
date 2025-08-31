'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Stack,
  Avatar,
  Divider,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Slider,
  Popover,
} from '@mui/material'
import {
  Send,
  AttachFile,
  EmojiEmotions,
  MoreVert,
  Dashboard,
  Draw,
  Chat as ChatIcon,
  PersonAdd,
  Info,
  Add,
  TableChart,
  Poll,
  Image,
  VideoLibrary,
  Close,
  Search,
  Settings,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { 
  getCurrentChatUser, 
  sendChatMessage, 
  loadChatMessages,
  isMessageOwner,
  createChatRoom,
  getDisplayName,
  type ChatUser,
  type ChatMessage,
  type ChatRoom
} from '@/lib/chat/unified-system'
import InlineExpandableMessage from '@/components/InlineExpandableMessage'
import { initializeUnifiedSizing, useChatSizing } from '@/lib/utils/chat-sizing-integration'

// 통합 시스템의 타입들을 사용

interface ChatInterfaceProps {
  roomId: string
  user: User
  isNewChat?: boolean
}

export default function ChatInterface({ roomId, user, isNewChat = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  // Microsoft Loop style slash commands
  const slashCommands = [
    { id: 'whiteboard', icon: '🎨', label: 'Whiteboard', description: 'Create a collaborative whiteboard' },
    { id: 'kanban', icon: '📋', label: 'Kanban Board', description: 'Task management board' },
    { id: 'todo', icon: '✅', label: 'Todo List', description: 'Shared task list' },
    { id: 'poll', icon: '📊', label: 'Poll', description: 'Create a poll or survey' },
    { id: 'table', icon: '📝', label: 'Table', description: 'Structured data table' },
    { id: 'file', icon: '📁', label: 'File', description: 'Attach or embed file' }
  ]
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [toolMenuAnchor, setToolMenuAnchor] = useState<null | HTMLElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [chatTitle, setChatTitle] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteMenuAnchor, setInviteMenuAnchor] = useState<null | HTMLElement>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [presenceUsers, setPresenceUsers] = useState<Array<{id: string, name: string, cursor?: {x: number, y: number}}>>([])
  const [collaborationState, setCollaborationState] = useState<{editing: string[], conflicts: string[]}>({editing: [], conflicts: []})
  
  // Legacy sizing system removed - now using unified embed sizing
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  
  // Initialize unified sizing system with bubble sizing
  const {
    width: bubbleWidth,
    height: bubbleHeight,
    updateCustomSize: updateBubbleSize
  } = useChatSizing('default')
  
  const {
    width: whiteboardWidth,
    height: whiteboardHeight,
    updateCustomSize: updateWhiteboardSize
  } = useChatSizing('excalidraw')
  
  const [bubbleSettingsAnchor, setBubbleSettingsAnchor] = useState<null | HTMLElement>(null)
  
  // Microsoft Loop style slash command handling
  const [inputValue, setInputValue] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  
  useEffect(() => {
    initializeUnifiedSizing()
  }, [])

  const loadCurrentUserProfile = async () => {
    if (user?.id) {
      console.log('Loading chat user for:', user.id, user.email)
      const chatUserData = await getCurrentChatUser(user)
      console.log('Chat user data:', chatUserData)
      
      // DEBUG: Identity 시스템 상태 확인
      if (chatUserData) {
        console.log('✅ Identity System Connected:', {
          authUserId: chatUserData.authUserId,
          identityId: chatUserData.identityId,
          email: chatUserData.email
        })
      } else {
        console.error('❌ Identity System Failed')
      }
      
      setChatUser(chatUserData)
    }
  }

  useEffect(() => {
    if (!isNewChat && roomId && roomId !== 'new') {
      loadRoomData()
      loadMessages()
      setupRealtimeSubscription()
    } else {
      setLoading(false)
    }
  }, [roomId, isNewChat])

  // Load user profile when user changes
  useEffect(() => {
    loadCurrentUserProfile()
  }, [user?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 버블 크기 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatBubbleWidth', bubbleWidth.toString())
    }
  }, [bubbleWidth])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatBubbleHeight', bubbleHeight.toString())
    }
  }, [bubbleHeight])

  // 화이트보드 크기 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whiteboardWidth', whiteboardWidth.toString())
    }
  }, [whiteboardWidth])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whiteboardHeight', whiteboardHeight.toString())
    }
  }, [whiteboardHeight])

  const loadRoomData = async () => {
    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(
          userId,
          profiles!inner(
            id,
            nickname,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', roomId)
      .single()

    if (roomData) {
      setRoom({
        ...roomData,
        participants: roomData.chat_participants.map((p: any) => ({
          userId: p.userId,
          profile: p.profiles,
        })),
      })
      setChatTitle(roomData.name || '')
    }

    // 협업 보드 확인
    const { data: boardData } = await supabase
      .from('collaboration_boards')
      .select('id')
      .eq('room_id', roomId)
      .single()

    if (boardData) {
      setBoardId(boardData.id)
    } else {
      // 협업 보드 생성
      const { data: newBoard } = await supabase
        .from('collaboration_boards')
        .insert({
          room_id: roomId,
          title: '협업 보드',
          type: 'kanban',
          created_by: user.id,
        })
        .select()
        .single()

      if (newBoard) {
        setBoardId(newBoard.id)
      }
    }
  }

  const loadMessages = async () => {
    if (!roomId || roomId === 'new') {
      setLoading(false)
      return
    }
    
    const messagesData = await loadChatMessages(roomId)
    setMessages(messagesData)
    setLoading(false)
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:identities!chat_messages_sender_id_fkey(
                id,
                user_profiles!identities_user_profiles_identity_id_fkey(
                  id,
                  identity_id,
                  nickname,
                  email,
                  avatar_url
                )
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages((prev) => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !chatUser) return
    
    setSending(true)
    const messageContent = newMessage
    setNewMessage('')

    // 새 채팅인 경우 먼저 방 생성
    let actualRoomId = roomId
    if (roomId === 'new' || !roomId) {
      console.log('Creating new room...')
      const newRoomId = await createChatRoom(
        messageContent.substring(0, 50),
        'direct',
        chatUser
      )
      
      if (newRoomId) {
        actualRoomId = newRoomId
      } else {
        setSending(false)
        alert('채팅방 생성에 실패했습니다.')
        return
      }
    }

    // 통합 시스템을 통한 메시지 전송
    const success = await sendChatMessage(actualRoomId, messageContent, chatUser)
    
    if (!success) {
      alert('메시지 전송에 실패했습니다.')
    } else {
      // 채팅방 마지막 메시지 업데이트
      await supabase
        .from('chat_rooms')
        .update({
          last_message: messageContent,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', actualRoomId)
    }

    setSending(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getChatTitle = () => {
    if (isNewChat) return '새 채팅'
    if (!room) return '채팅'
    
    if (chatTitle) return chatTitle
    
    // Solo 채팅 (참가자가 나 혼자)
    if (room.participants && room.participants.length === 1 && room.participants[0].userId === user.id) {
      return room.name || '나만의 메모'
    }
    
    if (room.type === 'direct' && room.participants) {
      const otherUser = room.participants.find((p) => p.userId !== user.id)
      return otherUser?.profile.nickname || otherUser?.profile.email?.split('@')[0] || '채팅'
    }
    
    return room.name || '그룹 채팅'
  }

  const saveTitle = async () => {
    if (!roomId || roomId === 'new' || !chatTitle.trim()) {
      setIsEditingTitle(false)
      return
    }

    await supabase
      .from('chat_rooms')
      .update({ name: chatTitle.trim() })
      .eq('id', roomId)
    
    setIsEditingTitle(false)
  }

  // Microsoft Loop-style slash command handler
  const handleSlashCommand = (commandId: string) => {
    setNewMessage('')  // Clear the slash command
    
    switch (commandId) {
      case 'whiteboard':
        insertCollaborationTool('whiteboard')
        break
      case 'kanban':
        insertCollaborationTool('kanban')
        break
      case 'todo':
        insertCollaborationTool('todo')
        break
      case 'poll':
        insertCollaborationTool('poll')
        break
      case 'table':
        insertCollaborationTool('table')
        break
      case 'file':
        // Trigger file upload
        document.getElementById('file-upload')?.click()
        break
      default:
        console.log('Unknown slash command:', commandId)
    }
  }

  const insertCollaborationTool = async (toolType: 'kanban' | 'whiteboard' | 'todo' | 'poll' | 'table') => {
    if (!chatUser) {
      console.error('Chat user not available')
      return
    }

    // 현재 roomId 사용
    const actualRoomId = roomId
    if (roomId === 'new' || !roomId) {
      alert('채팅방을 먼저 생성해주세요.')
      return
    }

    // 도구 메시지를 인라인 확장 가능한 형태로 생성
    const toolMessage: ChatMessage = {
      id: `${toolType}-${Date.now()}`,
      roomId: actualRoomId,
      senderId: chatUser.identityId,
      message: toolType === 'kanban' 
        ? '📋 칸반보드를 생성했습니다'
        : toolType === 'whiteboard'
        ? '🎨 화이트보드를 생성했습니다'
        : toolType === 'table'
        ? '📝 테이블을 생성했습니다'
        : '✅ 할 일 목록을 생성했습니다',
      type: toolType === 'whiteboard' ? 'excalidraw' : toolType,
      attachments: {
        toolType: toolType === 'whiteboard' ? 'excalidraw' : toolType,
        data: null, // 초기 데이터는 비어있음
      },
      createdAt: new Date().toISOString(),
      sender: {
        identityId: chatUser.identityId,
        email: chatUser.email,
        nickname: chatUser.nickname,
        avatarUrl: chatUser.avatarUrl,
      },
    }

    // 메시지 목록에 추가
    setMessages(prev => [...prev, toolMessage])

    // DB에 저장
    await sendSimpleChatMessage(
      actualRoomId,
      toolMessage.message,
      chatUser,
      toolType === 'whiteboard' ? 'excalidraw' : toolType,
      toolMessage.attachments
    )

    setToolMenuAnchor(null)
  }


    // Simple message interface for backward compatibility
  interface SimpleChatMessage {
    id: string
    roomId: string
    senderId: string
    message: string
    type?: string
    attachments?: any
    createdAt: string
    sender?: {
      id: string
      email: string
      displayName: string
      avatarUrl?: string
    }
  }

  // Send simple message function
  const sendSimpleChatMessage = async (
    roomId: string,
    message: string,
    chatUser: ChatUser,
    type: string = 'text',
    attachments?: any
  ): Promise<boolean> => {
    return await sendChatMessage(roomId, message, chatUser, type, attachments)
  }

  // Main component return
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            {isEditingTitle ? (
              <TextField
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveTitle()
                  }
                }}
                placeholder="채팅 제목을 적으세요."
                size="small"
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                  },
                }}
              />
            ) : (
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    px: 1,
                  },
                }}
                onClick={() => !isNewChat && setIsEditingTitle(true)}
              >
                {getChatTitle()}
              </Typography>
            )}
            {room?.participants && room.participants.length > 2 && (
              <Chip
                size="small"
                label={`${room.participants.length}명`}
                variant="outlined"
              />
            )}
          </Stack>
          
          <Stack direction="row" spacing={1}>
            {/* 협업 도구 버튼들 */}
            <Tooltip title="Kanban 보드">
              <IconButton onClick={() => insertCollaborationTool('kanban')}>
                <Dashboard />
              </IconButton>
            </Tooltip>
            <Tooltip title="화이트보드 (Excalidraw)">
              <IconButton onClick={() => insertCollaborationTool('whiteboard')}>
                <Draw />
              </IconButton>
            </Tooltip>
            <Tooltip title="투표 생성">
              <IconButton onClick={() => insertCollaborationTool('poll')}>
                <Poll />
              </IconButton>
            </Tooltip>
            <Tooltip title="버블 크기 설정">
              <IconButton onClick={(e) => setBubbleSettingsAnchor(e.currentTarget)}>
                <Settings />
              </IconButton>
            </Tooltip>
            <Tooltip title="채팅 기록 검색">
              <IconButton onClick={() => setSearchOpen(!searchOpen)}>
                <Search />
              </IconButton>
            </Tooltip>
            <Tooltip title="참가자 추가">
              <IconButton onClick={(e) => setInviteMenuAnchor(e.currentTarget)}>
                <PersonAdd />
              </IconButton>
            </Tooltip>
            <Tooltip title="채팅 정보">
              <IconButton onClick={() => setInfoDialogOpen(true)}>
                <Info />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MoreVert />
            </IconButton>
          </Stack>
        </Stack>

      </Paper>

      {/* 채팅 콘텐츠 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
            {/* 메시지 목록 */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: 2,
                bgcolor: 'grey.50',
                minHeight: 0, // Important for flex child to scroll
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  bgcolor: 'grey.200',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'grey.400',
                  borderRadius: '4px',
                  '&:hover': {
                    bgcolor: 'grey.500',
                  },
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography color="text.secondary">
                    대화를 시작해보세요
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {messages.map((message) => {
                    // 통합 시스템을 통한 메시지 소유자 확인
                    const isOwn = chatUser ? isMessageOwner(message, chatUser) : false
                    
                    // Use new Microsoft Loop-style InlineExpandableMessage for all messages
                    // Only render if chatUser is available
                    if (!chatUser) {
                      return (
                        <Box key={message.id} sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Loading user data...
                          </Typography>
                        </Box>
                      )
                    }
                    
                    return (
                      <InlineExpandableMessage
                        key={message.id}
                        message={message}
                        currentUser={chatUser}
                        isOwn={isOwn}
                        maxWidth={bubbleWidth}
                        minHeight={bubbleHeight}
                        onReply={(parentId) => {
                          // TODO: Implement reply functionality
                          console.log('Reply to message:', parentId)
                        }}
                        onEdit={(messageId) => {
                          // TODO: Implement edit functionality
                          console.log('Edit message:', messageId)
                        }}
                        onReact={(messageId, emoji) => {
                          // TODO: Implement reaction functionality
                          console.log('React to message:', messageId, emoji)
                        }}
                      />
                    )
                  })}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>
            
            {/* Hidden file input for slash command file attachment */}
            <input
              id="file-upload"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                // Handle file upload
                if (e.target.files && e.target.files.length > 0) {
                  Array.from(e.target.files).forEach(file => {
                    console.log('File selected:', file.name)
                    // TODO: Implement file upload functionality
                  })
                }
              }}
            />

            {/* 메시지 입력 */}
            <Box 
              sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider', 
                bgcolor: 'background.paper',
                position: 'relative',
                zIndex: 1
              }}
              className="chat-input-container"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {/* 도구 추가 버튼 */}
                <IconButton 
                  onClick={(e) => setToolMenuAnchor(e.currentTarget)}
                  sx={{ 
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'primary.main'
                    }
                  }}
                >
                  <Add />
                </IconButton>
                <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="메시지를 입력하세요... (/ 를 입력하여 도구 삽입)"
                    value={newMessage}
                    inputRef={inputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !slashMenuOpen) {
                        e.preventDefault()
                        sendMessage()
                      } else if (e.key === 'Escape' && slashMenuOpen) {
                        setSlashMenuOpen(false)
                        setSelectedCommandIndex(0)
                      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        if (slashMenuOpen) {
                          e.preventDefault()
                          const direction = e.key === 'ArrowUp' ? -1 : 1
                          setSelectedCommandIndex(prev => {
                            const newIndex = prev + direction
                            if (newIndex < 0) return slashCommands.length - 1
                            if (newIndex >= slashCommands.length) return 0
                            return newIndex
                          })
                        }
                      } else if (e.key === 'Tab' && slashMenuOpen) {
                        e.preventDefault()
                        handleSlashCommand(slashCommands[selectedCommandIndex].id)
                        setSlashMenuOpen(false)
                        setSelectedCommandIndex(0)
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value
                      const position = e.target.selectionStart || 0
                      setNewMessage(value)
                      setCursorPosition(position)
                      
                      // Check for slash command
                      if (value.endsWith('/') && !slashMenuOpen) {
                        const rect = e.target.getBoundingClientRect()
                        const menuHeight = 420 // Slightly larger to account for padding
                        const menuWidth = 320
                        const viewportHeight = window.innerHeight
                        const viewportWidth = window.innerWidth
                        const headerHeight = 80 // Account for header
                        const bottomPadding = 20
                        const sidePadding = 16
                        const plusButtonWidth = 56 // Width of plus button + spacing
                        
                        // Smart positioning: prioritize showing above input
                        let menuY = rect.top - menuHeight - 12
                        let showAbove = true
                        
                        // If not enough space above, show below
                        if (menuY < headerHeight) {
                          menuY = rect.bottom + 8
                          showAbove = false
                        }
                        
                        // If still not enough space below, force above and adjust
                        if (!showAbove && menuY + menuHeight > viewportHeight - bottomPadding) {
                          menuY = Math.max(headerHeight, rect.top - menuHeight - 12)
                          showAbove = true
                        }
                        
                        // Horizontal positioning: start from left edge of input, offset for plus button
                        let menuX = rect.left + plusButtonWidth
                        
                        // Ensure menu doesn't go off right edge
                        if (menuX + menuWidth > viewportWidth - sidePadding) {
                          menuX = viewportWidth - menuWidth - sidePadding
                        }
                        
                        // Ensure menu doesn't overlap plus button (minimum offset)
                        menuX = Math.max(menuX, plusButtonWidth + sidePadding)
                        
                        // Final bounds check
                        menuX = Math.max(sidePadding, Math.min(menuX, viewportWidth - menuWidth - sidePadding))
                        menuY = Math.max(headerHeight, Math.min(menuY, viewportHeight - menuHeight - bottomPadding))
                        
                        setSlashMenuPosition({ x: menuX, y: menuY })
                        setSlashMenuOpen(true)
                        setSelectedCommandIndex(0)
                      } else if (slashMenuOpen && !value.includes('/')) {
                        setSlashMenuOpen(false)
                        setSelectedCommandIndex(0)
                      }
                    }}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        minHeight: 40,
                        alignItems: 'center',
                        bgcolor: 'background.default',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                        '&.Mui-focused': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: 2,
                          },
                        },
                      },
                      '& .MuiOutlinedInput-input': {
                        padding: '10px 14px',
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Add emoji">
                            <IconButton 
                              size="small"
                              sx={{ width: 32, height: 32 }}
                            >
                              <EmojiEmotions fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Tooltip title="Send message (Enter)">
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    sx={{ 
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      bgcolor: newMessage.trim() ? 'primary.main' : 'action.disabled',
                      color: newMessage.trim() ? 'primary.contrastText' : 'text.disabled',
                      '&:hover': {
                        bgcolor: newMessage.trim() ? 'primary.dark' : 'action.disabled',
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'action.disabled',
                        color: 'text.disabled',
                      }
                    }}
                  >
                    {sending ? <CircularProgress size={20} /> : <Send />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
        </Box>

      {/* Microsoft Loop Style Slash Menu */}
      {slashMenuOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <Box
            className="slash-menu-backdrop"
            onClick={() => {
              setSlashMenuOpen(false)
              setSelectedCommandIndex(0)
            }}
          />
          <Paper
            elevation={24}
            className="slash-menu-paper"
            sx={{
              left: slashMenuPosition.x,
              top: slashMenuPosition.y,
              width: { xs: 280, sm: 320 },
              maxHeight: { xs: 360, sm: 420 },
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.palette.mode === 'dark' 
                ? '0px 16px 70px -12px rgba(0, 0, 0, 0.8)'
                : '0px 16px 70px -12px rgba(0, 0, 0, 0.56)'
            }}
            style={{
              animation: 'slideInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
          <Box 
            className="slash-menu-header"
            sx={{ 
              p: 2, 
              color: 'text.primary',
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography sx={{ fontSize: '1.2em' }}>⚡</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Insert content
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.7, color: 'text.secondary' }}>
              Choose what to add to your message
            </Typography>
          </Box>
          <Box sx={{ 
            maxHeight: { xs: 280, sm: 320 }, 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'grey.100'
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.300',
              borderRadius: '3px',
              '&:hover': {
                bgcolor: 'grey.400'
              }
            }
          }}>
            {slashCommands.map((command, index) => (
              <Box
                key={command.id}
                component="button"
                className="slash-menu-item"
                onClick={() => {
                  handleSlashCommand(command.id)
                  setSlashMenuOpen(false)
                  setSelectedCommandIndex(0)
                }}
                sx={{
                  display: 'flex',
                  width: '100%',
                  p: 2,
                  border: 'none',
                  backgroundColor: index === selectedCommandIndex ? 'primary.main' : 'transparent',
                  color: index === selectedCommandIndex ? 'primary.contrastText' : 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderBottom: index < slashCommands.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    transform: 'translateX(4px)',
                    '& .command-description': {
                      color: 'primary.contrastText',
                      opacity: 0.9
                    }
                  },
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '-2px',
                    zIndex: 1
                  }
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ width: '100%' }}>
                  <Box sx={{ 
                    fontSize: '1.5em',
                    lineHeight: 1,
                    mt: 0.25
                  }}>
                    {command.icon}
                  </Box>
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 'bold',
                      color: 'text.primary'
                    }}>
                      {command.label}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      className="command-description"
                      sx={{
                        color: index === selectedCommandIndex ? 'primary.contrastText' : 'text.secondary',
                        fontSize: '0.75rem',
                        lineHeight: 1.3
                      }}
                    >
                      {command.description}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
          </Paper>
        </>
      )}

      {/* Collaboration Presence Indicators */}
      {presenceUsers.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1000
          }}
        >
          <Stack direction="row" spacing={1}>
            {presenceUsers.slice(0, 5).map((user) => (
              <Tooltip key={user.id} title={`${user.name} is here`}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  {user.name[0]}
                </Avatar>
              </Tooltip>
            ))}
            {presenceUsers.length > 5 && (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'text.secondary' }}>
                +{presenceUsers.length - 5}
              </Avatar>
            )}
          </Stack>
        </Box>
      )}

      {/* Real-time Collaboration Cursors */}
      {presenceUsers.map((user) => (
        user.cursor && (
          <Box
            key={`cursor-${user.id}`}
            sx={{
              position: 'fixed',
              left: user.cursor.x,
              top: user.cursor.y,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-2px, -2px)'
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                clipPath: 'polygon(0% 0%, 0% 80%, 25% 60%, 40% 100%, 50% 90%, 35% 50%, 100% 50%)',
                bgcolor: 'primary.main',
                position: 'relative'
              }}
            />
            <Chip
              label={user.name}
              size="small"
              sx={{
                position: 'absolute',
                top: 20,
                left: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.7rem',
                height: 20,
                '& .MuiChip-label': { px: 1 }
              }}
            />
          </Box>
        )
      ))}

      {/* 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null)
          setInfoDialogOpen(true)
        }}>채팅방 설정</MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null)
          alert('알림 설정 기능은 준비 중입니다.')
        }}>알림 설정</MenuItem>
        <Divider />
        <MenuItem 
          sx={{ color: 'error.main' }}
          onClick={async () => {
            if (confirm('정말로 채팅방을 나가시겠습니까?')) {
              await supabase
                .from('chat_participants')
                .update({ is_active: false })
                .eq('room_id', roomId)
                .eq('userId', user.id)
              
              window.location.href = '/chat'
            }
            setAnchorEl(null)
          }}
        >채팅방 나가기</MenuItem>
      </Menu>

      {/* 도구 메뉴 */}
      <Menu
        anchorEl={toolMenuAnchor}
        open={Boolean(toolMenuAnchor)}
        onClose={() => setToolMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => insertCollaborationTool('kanban')}>
          <Dashboard sx={{ mr: 1 }} /> Kanban 보드
        </MenuItem>
        <MenuItem onClick={() => insertCollaborationTool('whiteboard')}>
          <Draw sx={{ mr: 1 }} /> 화이트보드
        </MenuItem>
        <MenuItem onClick={() => insertCollaborationTool('todo')}>
          <TableChart sx={{ mr: 1 }} /> 할 일 목록
        </MenuItem>
        <MenuItem onClick={() => insertCollaborationTool('poll')}>
          <Poll sx={{ mr: 1 }} /> 투표
        </MenuItem>
        <MenuItem onClick={() => insertCollaborationTool('table')}>
          <TableChart sx={{ mr: 1 }} /> 테이블
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleSlashCommand('file')}>
          <AttachFile sx={{ mr: 1 }} /> 파일 첨부
        </MenuItem>
        <MenuItem>
          <Image sx={{ mr: 1 }} /> 이미지
        </MenuItem>
        <MenuItem>
          <VideoLibrary sx={{ mr: 1 }} /> 비디오 링크
        </MenuItem>
      </Menu>

      {/* 검색 바 */}
      {searchOpen && (
        <Paper
          sx={{
            position: 'absolute',
            top: 64,
            right: 16,
            width: 300,
            p: 2,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="메시지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchOpen(false)}>
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {searchQuery && (
            <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
              {messages
                .filter((msg) =>
                  msg.message?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((msg) => (
                  <Paper key={msg.id} sx={{ p: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(msg.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">{msg.message}</Typography>
                  </Paper>
                ))}
            </Box>
          )}
        </Paper>
      )}

      {/* 버블 크기 설정 팝오버 */}
      <Popover
        open={Boolean(bubbleSettingsAnchor)}
        anchorEl={bubbleSettingsAnchor}
        onClose={() => setBubbleSettingsAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ p: 3, minWidth: 300 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            💬 채팅 버블 크기 설정
          </Typography>
          
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                버블 최대 너비: {bubbleWidth}px
              </Typography>
              <Slider
                value={bubbleWidth}
                onChange={(_, value) => updateBubbleSize(value as number, bubbleHeight)}
                min={200}
                max={800}
                step={10}
                marks={[
                  { value: 200, label: '200px' },
                  { value: 400, label: '400px' },
                  { value: 600, label: '600px' },
                  { value: 800, label: '800px' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                버블 최소 높이: {bubbleHeight === 0 ? '자동' : `${bubbleHeight}px`}
              </Typography>
              <Slider
                value={bubbleHeight}
                onChange={(_, value) => updateBubbleSize(bubbleWidth, value as number)}
                min={0}
                max={200}
                step={10}
                marks={[
                  { value: 0, label: '자동' },
                  { value: 50, label: '50px' },
                  { value: 100, label: '100px' },
                  { value: 150, label: '150px' },
                  { value: 200, label: '200px' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => value === 0 ? '자동' : `${value}px`}
              />
            </Box>
            
            <Divider />
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                🎨 화이트보드(Excalidraw) 크기
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                화이트보드 너비: {whiteboardWidth}px
              </Typography>
              <Slider
                value={whiteboardWidth}
                onChange={(_, value) => updateWhiteboardSize(value as number, whiteboardHeight)}
                min={600}
                max={1600}
                step={50}
                marks={[
                  { value: 600, label: '600px' },
                  { value: 800, label: '800px' },
                  { value: 1200, label: '1200px' },
                  { value: 1600, label: '1600px' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                화이트보드 높이: {whiteboardHeight}px
              </Typography>
              <Slider
                value={whiteboardHeight}
                onChange={(_, value) => updateWhiteboardSize(whiteboardWidth, value as number)}
                min={300}
                max={1000}
                step={50}
                marks={[
                  { value: 300, label: '300px' },
                  { value: 400, label: '400px' },
                  { value: 600, label: '600px' },
                  { value: 800, label: '800px' },
                  { value: 1000, label: '1000px' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button 
                size="small" 
                onClick={() => {
                  updateBubbleSize(400, 0)
                  updateWhiteboardSize(1200, 600)
                }}
              >
                기본값 복원
              </Button>
              <Button 
                variant="contained" 
                size="small" 
                onClick={() => setBubbleSettingsAnchor(null)}
              >
                완료
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>

      {/* 참가자 초대 드롭다운 */}
      <Popover
        open={Boolean(inviteMenuAnchor)}
        anchorEl={inviteMenuAnchor}
        onClose={() => {
          setInviteMenuAnchor(null)
          setInviteEmail('')
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            참가자 초대
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="이메일 주소"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="example@email.com"
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button 
              size="small" 
              onClick={() => {
                setInviteMenuAnchor(null)
                setInviteEmail('')
              }}
            >
              취소
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={async () => {
                if (inviteEmail && roomId !== 'new') {
                  // 통합 Identity 시스템을 통한 사용자 찾기
                  const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('identity_id')
                    .eq('email', inviteEmail)
                    .single()

                  if (profileData?.identity_id) {
                    // 참가자 추가 - identity_id 사용
                    await supabase.from('chat_participants').insert({
                      room_id: roomId,
                      user_id: profileData.identity_id,
                      is_active: true,
                    })
                    setInviteMenuAnchor(null)
                    setInviteEmail('')
                    // 방 정보 새로고침
                    await loadRoomData()
                  } else {
                    console.error('User not found or not in identity system')
                  }
                }
              }}
              disabled={!inviteEmail.trim()}
            >
              초대
            </Button>
          </Stack>
          
          {/* 현재 참가자 목록 (최대 4명만 표시) */}
          {room?.participants && room.participants.length > 0 && (
            <Box sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                현재 참가자 ({room.participants.length}명)
              </Typography>
              <Stack spacing={1} sx={{ maxHeight: 160, overflow: 'auto' }}>
                {room.participants.slice(0, 4).map((participant: any) => (
                  <Box key={participant.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      src={participant.profile?.avatar_url} 
                      sx={{ width: 24, height: 24 }}
                    >
                      {participant.profile?.nickname?.[0] || participant.profile?.email?.[0]}
                    </Avatar>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {participant.profile?.nickname || participant.profile?.email?.split('@')[0]}
                    </Typography>
                  </Box>
                ))}
                {room.participants.length > 4 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                    +{room.participants.length - 4}명 더
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </Popover>

      {/* 채팅 정보 다이얼로그 */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>채팅방 정보</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                채팅방 이름
              </Typography>
              <Typography>{room?.name || '제목 없음'}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                생성일
              </Typography>
              <Typography>
                {room?.createdAt
                  ? new Date(room.createdAt).toLocaleDateString()
                  : '알 수 없음'}
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                참가자 ({room?.participants?.length || 0}명)
              </Typography>
              <List dense>
                {room?.participants?.map((participant: any) => (
                  <ListItem key={participant.id}>
                    <ListItemAvatar>
                      <Avatar src={participant.profile?.avatar_url}>
                        {participant.profile?.email?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        participant.profile?.nickname || participant.profile?.email
                      }
                      secondary={participant.role}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}