'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Box,
  Container,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  Divider,
  Badge,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  ArrowBack,
  Send,
  AttachFile,
  EmojiEmotions,
  MoreVert,
  Circle,
  Check,
  DoneAll,
  Person,
  Group,
} from '@mui/icons-material'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  type: 'text' | 'image' | 'file' | 'system'
  file_url?: string
  is_edited: boolean
  sender?: {
    id: string
    email: string
    nickname: string | null
    avatar_url: string | null
  }
  is_read?: boolean
}

interface ChatRoom {
  id: string
  name: string | null
  type: 'direct' | 'group'
  participants: Array<{
    user_id: string
    profile: {
      id: string
      email: string
      nickname: string | null
      avatar_url: string | null
      role: string
    }
  }>
}

export default function ChatRoomPage() {
  const params = useParams()
  const roomId = params.roomId as string

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // 프로필 정보 가져오기
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  useEffect(() => {
    if (user && roomId) {
      fetchRoomInfo()
      fetchMessages()
      setupRealtimeSubscription()
      markMessagesAsRead()
    }
  }, [user, roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchRoomInfo = async () => {
    // 채팅방 정보 가져오기
    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!roomData) {
      router.push('/chat')
      return
    }

    // 참가자 정보 가져오기
    const { data: participants } = await supabase
      .from('chat_participants')
      .select(
        `
        user_id,
        profiles!inner (
          id,
          email,
          nickname,
          avatar_url,
          role
        )
      `
      )
      .eq('room_id', roomId)
      .eq('is_active', true)

    setRoom({
      ...roomData,
      participants: participants || [],
    })
  }

  const fetchMessages = async () => {
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select(
        `
        *,
        profiles!chat_messages_sender_id_fkey (
          id,
          email,
          nickname,
          avatar_url
        )
      `
      )
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (messagesData) {
      const formattedMessages = messagesData.map((msg) => ({
        ...msg,
        sender: msg.profiles,
      }))
      setMessages(formattedMessages)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user || !roomId) return

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
          // 새 메시지가 도착하면 발신자 정보와 함께 추가
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, email, nickname, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMsg = {
            ...payload.new,
            sender: senderData,
          } as Message

          setMessages((prev) => [...prev, newMsg])

          // 내가 보낸 메시지가 아니면 읽음 처리
          if (payload.new.sender_id !== user?.id) {
            markMessagesAsRead()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user || !roomId) return

    // 마지막 읽은 시간 업데이트
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    const messageContent = newMessage
    setNewMessage('')

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: messageContent,
        type: 'text',
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // 실패시 메시지 복원
    }

    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getChatDisplayInfo = () => {
    if (!room) return { name: '', avatar: null }

    if (room.type === 'direct') {
      // DM인 경우 상대방 정보 표시
      const otherUser = room.participants.find((p) => p.user_id !== user?.id)
      return {
        name: otherUser?.profile.nickname || otherUser?.profile.email?.split('@')[0] || '사용자',
        avatar: otherUser?.profile.avatar_url,
        subtitle: otherUser?.profile.email,
      }
    } else {
      // 그룹 채팅
      return {
        name: room.name || '그룹 채팅',
        avatar: null,
        subtitle: `${room.participants.length}명 참여중`,
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const shouldShowDate = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true

    const currentDate = new Date(currentMsg.created_at).toDateString()
    const prevDate = new Date(prevMsg.created_at).toDateString()

    return currentDate !== prevDate
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  const chatInfo = getChatDisplayInfo()

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/chat')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>

          <Avatar src={chatInfo.avatar || undefined} sx={{ mr: 2 }}>
            {room?.type === 'direct' ? <Person /> : <Group />}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{chatInfo.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {chatInfo.subtitle}
            </Typography>
          </Box>

          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 메시지 영역 */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: 'grey.50',
          p: 2,
        }}
      >
        <Container maxWidth="md">
          {messages.map((message, index) => {
            const isMyMessage = message.sender_id === user?.id
            const prevMessage = index > 0 ? messages[index - 1] : null
            const showDate = shouldShowDate(message, prevMessage)

            return (
              <Box key={message.id}>
                {showDate && (
                  <Box sx={{ textAlign: 'center', my: 2 }}>
                    <Chip
                      label={formatDate(message.created_at)}
                      size="small"
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                    mb: 1,
                  }}
                >
                  {!isMyMessage && (
                    <Avatar
                      src={message.sender?.avatar_url || undefined}
                      sx={{
                        width: 32,
                        height: 32,
                        mr: 1,
                        mt: 0.5,
                      }}
                    >
                      {message.sender?.email?.[0]?.toUpperCase()}
                    </Avatar>
                  )}

                  <Box
                    sx={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isMyMessage && (
                      <Typography variant="caption" sx={{ px: 1, mb: 0.5 }}>
                        {message.sender?.nickname || message.sender?.email?.split('@')[0]}
                      </Typography>
                    )}

                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        bgcolor: isMyMessage ? 'primary.main' : 'background.paper',
                        color: isMyMessage ? 'white' : 'text.primary',
                        borderRadius: 2,
                        borderTopLeftRadius: isMyMessage ? 16 : 4,
                        borderTopRightRadius: isMyMessage ? 4 : 16,
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{
                          mt: 0.5,
                          opacity: 0.7,
                        }}
                      >
                        <Typography variant="caption">{formatTime(message.created_at)}</Typography>
                        {isMyMessage &&
                          (message.is_read ? (
                            <DoneAll fontSize="small" />
                          ) : (
                            <Check fontSize="small" />
                          ))}
                      </Stack>
                    </Paper>
                  </Box>
                </Box>
              </Box>
            )
          })}
          <div ref={messagesEndRef} />
        </Container>
      </Box>

      {/* 입력 영역 */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <IconButton>
              <AttachFile />
            </IconButton>

            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />

            <IconButton>
              <EmojiEmotions />
            </IconButton>

            <IconButton
              color="primary"
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Send />
            </IconButton>
          </Stack>
        </Container>
      </Paper>

      {/* 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => setAnchorEl(null)}>채팅방 정보</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>알림 끄기</MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            router.push('/chat')
          }}
        >
          채팅방 나가기
        </MenuItem>
      </Menu>
    </Box>
  )
}
