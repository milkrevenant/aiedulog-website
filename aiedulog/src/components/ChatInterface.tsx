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
  Image,
  VideoLibrary,
  Close,
  Search,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import KanbanBoard from '@/components/KanbanBoard'
// import WhiteboardCanvas from '@/components/WhiteboardCanvas'
import WhiteboardCanvasEnhanced from '@/components/WhiteboardCanvasEnhanced'

interface Message {
  id: string
  room_id: string
  sender_id: string
  message: string // 'content'에서 'message'로 변경
  type?: 'text' | 'image' | 'file' | 'system' | 'kanban' | 'whiteboard' | 'todo'
  metadata?: any // 도구 관련 데이터
  attachments?: any
  created_at: string
  sender?: {
    id: string
    nickname?: string
    email: string
    avatar_url?: string
  }
}

interface ChatRoom {
  id: string
  name?: string
  type: 'direct' | 'group' | 'collaboration'
  created_at?: string
  participants?: Array<{
    user_id: string
    profile: {
      id: string
      nickname?: string
      email: string
      avatar_url?: string
    }
  }>
}

interface ChatInterfaceProps {
  roomId: string
  user: User
  isNewChat?: boolean
}

export default function ChatInterface({ roomId, user, isNewChat = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!isNewChat && roomId && roomId !== 'new') {
      loadRoomData()
      loadMessages()
      setupRealtimeSubscription()
    } else {
      setLoading(false)
    }
  }, [roomId, isNewChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadRoomData = async () => {
    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants!inner(
          user_id,
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
          user_id: p.user_id,
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
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(
          id,
          nickname,
          email,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
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
              sender:profiles!chat_messages_sender_id_fkey(
                id,
                nickname,
                email,
                avatar_url
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
    if (!newMessage.trim() || sending) return
    
    console.log('Sending message:', { roomId, user, newMessage })
    
    setSending(true)
    const messageContent = newMessage
    setNewMessage('')

    // 새 채팅인 경우 먼저 방 생성
    let actualRoomId = roomId
    if (roomId === 'new' || !roomId) {
      console.log('Creating new room...')
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'private',
          created_by: user.id,
          name: messageContent.substring(0, 50), // 첫 메시지를 제목으로
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (newRoom) {
        actualRoomId = newRoom.id
        
        // 참가자 추가
        await supabase
          .from('chat_participants')
          .insert({
            room_id: newRoom.id,
            user_id: user.id,
            is_active: true,
          })
        
        // 부모 컴포넌트에 새 방 알림 (나중에 구현)
        // window.dispatchEvent(new CustomEvent('newChatCreated', { detail: newRoom }))
      } else {
        setSending(false)
        return
      }
    }

    console.log('Inserting message:', {
      room_id: actualRoomId,
      sender_id: user.id,
      message: messageContent,
    })
    
    const { data: insertedMessage, error } = await supabase.from('chat_messages').insert({
      room_id: actualRoomId,
      sender_id: user.id,
      message: messageContent, // 'content' 대신 'message' 필드 사용
      created_at: new Date().toISOString(),
    })
    .select()

    if (error) {
      console.error('Error sending message:', error)
      alert(`메시지 전송 실패: ${error.message}`)
    } else {
      console.log('Message sent successfully:', insertedMessage)
      // 채팅방 마지막 메시지 업데이트
      await supabase
        .from('chat_rooms')
        .update({
          last_message: messageContent,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', actualRoomId) // roomId 대신 actualRoomId 사용
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
    if (room.participants && room.participants.length === 1 && room.participants[0].user_id === user.id) {
      return room.name || '나만의 메모'
    }
    
    if (room.type === 'direct' && room.participants) {
      const otherUser = room.participants.find((p) => p.user_id !== user.id)
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

  const insertCollaborationTool = async (toolType: 'kanban' | 'whiteboard' | 'todo') => {
    const messageContent = toolType === 'kanban' 
      ? '📋 Kanban 보드를 공유했습니다'
      : toolType === 'whiteboard'
      ? '🎨 화이트보드를 공유했습니다'
      : '✅ 할 일 목록을 공유했습니다'
    
    console.log(`Inserting ${toolType} tool...`)

    // 새 채팅인 경우 먼저 방 생성
    let actualRoomId = roomId
    if (roomId === 'new' || !roomId) {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'private',
          created_by: currentUser.id,
          name: messageContent,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (newRoom) {
        actualRoomId = newRoom.id
        
        // 참가자 추가
        await supabase
          .from('chat_participants')
          .insert({
            room_id: newRoom.id,
            user_id: currentUser.id,
            is_active: true,
          })
      } else {
        return
      }
    }

    // 협업 보드 생성
    const newBoardId = crypto.randomUUID()
    
    // collaboration_boards 테이블에 새 보드 생성
    await supabase.from('collaboration_boards').insert({
      id: newBoardId,
      room_id: actualRoomId,
      title: messageContent,
      type: toolType,
      data: {},
      created_by: user.id,
      created_at: new Date().toISOString(),
    })

    // 메시지 삽입
    await supabase.from('chat_messages').insert({
      room_id: actualRoomId,
      sender_id: user.id,
      message: messageContent,
      attachments: { type: toolType, boardId: newBoardId },
      created_at: new Date().toISOString()
    })

    setToolMenuAnchor(null)
    
    // 메시지 리로드
    if (actualRoomId !== roomId) {
      window.location.href = `/chat/${actualRoomId}`
    }
  }

  const renderChatContent = () => {
    return (
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
                    const isOwn = message.sender_id === user.id
                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Stack
                          direction={isOwn ? 'row-reverse' : 'row'}
                          spacing={1}
                          alignItems="flex-end"
                        >
                          {!isOwn && (
                            <Avatar
                              src={message.sender?.avatar_url || undefined}
                              sx={{ width: 32, height: 32 }}
                            >
                              {message.sender?.email?.[0]?.toUpperCase()}
                            </Avatar>
                          )}
                          <Box>
                            {!isOwn && (
                              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                {message.sender?.nickname || message.sender?.email?.split('@')[0]}
                              </Typography>
                            )}
                            <Paper
                              sx={{
                                p: 1.5,
                                bgcolor: isOwn ? 'primary.main' : 'background.paper',
                                color: isOwn ? 'primary.contrastText' : 'text.primary',
                                maxWidth: message.attachments?.type === 'kanban' || message.attachments?.type === 'whiteboard' ? '100%' : 400,
                                width: message.attachments?.type === 'kanban' ? 1200 : message.attachments?.type === 'whiteboard' ? 1000 : 'auto',
                              }}
                            >
                              {message.attachments?.type === 'kanban' ? (
                                <Box sx={{ width: '100%' }}>
                                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <Dashboard />
                                    <Typography variant="body2" fontWeight="bold">{message.message}</Typography>
                                  </Stack>
                                  <Box sx={{ 
                                    height: 400, 
                                    bgcolor: 'background.default',
                                    borderRadius: 1,
                                    overflow: 'hidden'
                                  }}>
                                    <KanbanBoard boardId={message.attachments?.boardId || message.id} />
                                  </Box>
                                </Box>
                              ) : message.attachments?.type === 'whiteboard' ? (
                                <Box sx={{ width: '100%' }}>
                                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                    <Draw />
                                    <Typography variant="body2" fontWeight="bold">{message.message}</Typography>
                                  </Stack>
                                  <Box sx={{ 
                                    height: 400,
                                    bgcolor: 'background.default', 
                                    borderRadius: 1,
                                    overflow: 'hidden'
                                  }}>
                                    <WhiteboardCanvasEnhanced 
                                      boardId={message.attachments?.boardId || message.id} 
                                      roomId={roomId}
                                    />
                                  </Box>
                                </Box>
                              ) : (
                                <Typography variant="body2">{message.message}</Typography>
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 0.5,
                                  opacity: 0.7,
                                }}
                              >
                                {formatTime(message.created_at)}
                              </Typography>
                            </Paper>
                          </Box>
                        </Stack>
                      </Box>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            {/* 메시지 입력 */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {/* 도구 추가 버튼 */}
                <IconButton 
                  onClick={(e) => setToolMenuAnchor(e.currentTarget)}
                  sx={{ 
                    width: 40,
                    height: 40,
                  }}
                >
                  <Add />
                </IconButton>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      minHeight: 40,
                      alignItems: 'center',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small"
                          sx={{ width: 32, height: 32 }}
                        >
                          <EmojiEmotions fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  sx={{ 
                    width: 40,
                    height: 40,
                  }}
                >
                  <Send />
                </IconButton>
              </Stack>
            </Box>
        </Box>
    )
  }

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
            <Tooltip title="채팅 기록 검색">
              <IconButton onClick={() => setSearchOpen(!searchOpen)}>
                <Search />
              </IconButton>
            </Tooltip>
            <Tooltip title="참가자 추가">
              <IconButton onClick={() => setInviteDialogOpen(true)}>
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
      {renderChatContent()}

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
                .eq('user_id', user.id)
              
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
        <Divider />
        <MenuItem>
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
                      {new Date(msg.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">{msg.message}</Typography>
                  </Paper>
                ))}
            </Box>
          )}
        </Paper>
      )}

      {/* 참가자 초대 다이얼로그 */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>참가자 초대</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="이메일 주소"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="example@email.com"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (inviteEmail && roomId !== 'new') {
                // 사용자 찾기
                const { data: profileData } = await supabase
                  .from('user_profiles')
                  .select('id')
                  .eq('email', inviteEmail)
                  .single()

                if (profileData) {
                  // 참가자 추가
                  await supabase.from('chat_participants').insert({
                    room_id: roomId,
                    user_id: profileData.id,
                    is_active: true,
                  })
                  setInviteEmail('')
                  setInviteDialogOpen(false)
                }
              }
            }}
          >
            초대
          </Button>
        </DialogActions>
      </Dialog>

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
                {room?.created_at
                  ? new Date(room.created_at).toLocaleDateString()
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