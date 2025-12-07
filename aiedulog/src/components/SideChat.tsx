'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
import { useRouter } from 'next/navigation'
import type { AppUser } from '@/lib/auth/types'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  Divider,
  Chip,
  Button,
  Collapse,
  CircularProgress,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Chat,
  Search,
  Send,
  Close,
  ExpandMore,
  ExpandLess,
  Person,
  Group,
  Circle,
  ArrowBack,
  Add,
} from '@mui/icons-material'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender?: {
    id: string
    email: string
    nickname: string | null
    avatar_url: string | null
  }
}

interface ChatRoom {
  id: string
  name: string | null
  type: 'direct' | 'group'
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  participants: Array<{
    user_id: string
    profile: {
      id: string
      email: string
      nickname: string | null
      avatar_url: string | null
    }
  }>
}

interface SideChatProps {
  user: AppUser | null
  open?: boolean
  onClose?: () => void
}

export default function SideChat({ user, open = true, onClose }: SideChatProps) {
  const [expanded, setExpanded] = useState(true)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    if (user) {
      fetchChatRooms()
      setupRealtimeSubscription()
    }
  }, [user])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages()
      markMessagesAsRead()
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChatRooms = async () => {
    if (!user) return
    setLoading(true)

    const { data: rooms } = await supabase
      .from('chat_participants')
      .select(
        `
        room_id,
        last_read_at,
        chat_rooms!inner (
          id,
          name,
          type,
          last_message,
          last_message_at
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('chat_rooms(last_message_at)', { ascending: false })
      .limit(5)

    if (rooms) {
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room: any) => {
          // Use integrated identity system for participant info
          const { data: participants } = await supabase
            .from('chat_participants')
            .select(
              `
              user_id,
              profile:user_profiles!chat_participants_user_id_fkey (
                user_id,
                email,
                nickname,
                avatar_url
              )
            `
            )
            .eq('room_id', room.chat_rooms.id)
            .eq('is_active', true)

          // Transform to expected format with fallback
          const transformedParticipants = participants?.map((p: any) => ({
            user_id: p.user_id,
            profile: {
              id: p.profile?.user_id || p.user_id,
              email: p.profile?.email || '',
              nickname: p.profile?.nickname,
              avatar_url: p.profile?.avatar_url
            }
          })) || []

          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.chat_rooms.id)
            .neq('sender_id', user.id)
            .gt('created_at', room.last_read_at || '1970-01-01')

          return {
            ...room.chat_rooms,
            participants: transformedParticipants,
            unread_count: unreadCount || 0,
          }
        })
      )

      setChatRooms(roomsWithDetails)
    }
    setLoading(false)
  }

  const fetchMessages = async () => {
    if (!selectedRoom) return

    // Use integrated identity system for message sender info
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select(
        `
        *,
        sender:user_profiles!chat_messages_sender_id_fkey (
          user_id,
          email,
          nickname,
          avatar_url
        )
      `
      )
      .eq('room_id', selectedRoom.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (messagesData) {
      const formattedMessages = messagesData.map((msg: any) => ({
        ...msg,
        sender: {
          id: msg.sender?.user_id || msg.sender_id,
          email: msg.sender?.email || '',
          nickname: msg.sender?.nickname,
          avatar_url: msg.sender?.avatar_url
        },
      }))
      setMessages(formattedMessages)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    const channel = supabase
      .channel('side-chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload: any) => {
          if (selectedRoom && payload.new.room_id === selectedRoom.id) {
            // Use getUserIdentity helper for consistent sender info retrieval
            let senderInfo = null
            try {
              // Create a minimal user object to use with getUserIdentity
              const senderUser: AppUser = { id: payload.new.sender_id }
              const senderIdentity = await getUserIdentity(senderUser, supabase)
              
              if (senderIdentity?.profile) {
                senderInfo = {
                  id: senderIdentity.user_id,
                  email: senderIdentity.profile.email,
                  nickname: senderIdentity.profile.nickname,
                  avatar_url: senderIdentity.profile.avatar_url
                }
              }
            } catch (error) {
              console.error('Failed to get sender identity in realtime:', error)
            }

            const newMsg = {
              ...payload.new,
              sender: senderInfo || {
                id: payload.new.sender_id,
                email: 'Unknown User',
                nickname: null,
                avatar_url: null
              },
            } as Message

            setMessages((prev) => [...prev, newMsg])

            if (payload.new.sender_id !== user?.id) {
              markMessagesAsRead()
            }
          }

          fetchChatRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user || !selectedRoom) return

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', selectedRoom.id)
      .eq('user_id', user.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedRoom || sending) return

    setSending(true)
    const messageContent = newMessage
    setNewMessage('')

    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: messageContent,
      type: 'text',
    })

    setSending(false)
  }

  const getChatDisplayInfo = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherUser = room.participants.find((p) => p.user_id !== user?.id)
      return {
        name: otherUser?.profile.nickname || otherUser?.profile.email?.split('@')[0] || '사용자',
        avatar: otherUser?.profile.avatar_url,
      }
    } else {
      return {
        name: room.name || '그룹 채팅',
        avatar: null,
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes < 1 ? '방금' : `${minutes}분 전`
    } else if (hours < 24) {
      return `${hours}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      })
    }
  }

  if (!user) return null

  const chatContent = (
    <Box
      sx={{
        height: isMobile ? '100vh' : 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          userSelect: 'none',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chat />
            <Typography variant="h6" fontWeight="bold">
              채팅
            </Typography>
            {chatRooms.reduce((sum, room) => sum + room.unread_count, 0) > 0 && (
              <Badge
                badgeContent={chatRooms.reduce((sum, room) => sum + room.unread_count, 0)}
                color="error"
                max={99}
              />
            )}
          </Stack>
          {onClose && (
            <Stack direction="row" spacing={0.5}>
              {/* Desktop/Tablet back button */}
              <IconButton 
                onClick={onClose} 
                size="small" 
                sx={{ 
                  color: 'white',
                  display: { xs: 'none', sm: 'flex' }
                }}
                title="닫기"
              >
                <ArrowBack />
              </IconButton>
              {/* Mobile X button */}
              <IconButton 
                onClick={onClose} 
                size="small" 
                sx={{ 
                  color: 'white',
                  display: { xs: 'flex', sm: 'none' }
                }}
              >
                <Close />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Box>

      {selectedRoom ? (
          // 채팅방 뷰
          (<>
            {/* 채팅방 헤더 */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton size="small" onClick={() => setSelectedRoom(null)}>
                  <ArrowBack />
                </IconButton>
                <Avatar
                  src={getChatDisplayInfo(selectedRoom).avatar || undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {selectedRoom.type === 'direct' ? <Person /> : <Group />}
                </Avatar>
                <Typography variant="subtitle2" fontWeight="medium" sx={{ flexGrow: 1 }}>
                  {getChatDisplayInfo(selectedRoom).name}
                </Typography>
              </Stack>
            </Box>
            {/* 메시지 영역 */}
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                p: 2,
                bgcolor: 'grey.50',
              }}
            >
              {messages.map((message) => {
                const isMyMessage = message.sender_id === user?.id
                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        maxWidth: '70%',
                        bgcolor: isMyMessage ? 'primary.main' : 'background.paper',
                        color: isMyMessage ? 'white' : 'text.primary',
                        borderRadius: 2,
                        border: isMyMessage ? 'none' : '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {!isMyMessage && (
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {message.sender?.nickname || message.sender?.email?.split('@')[0]}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          display: 'block',
                          textAlign: isMyMessage ? 'right' : 'left',
                          mt: 0.5,
                        }}
                      >
                        {formatTime(message.created_at)}
                      </Typography>
                    </Paper>
                  </Box>
                )
              })}
              <div ref={messagesEndRef} />
            </Box>
            {/* 입력 영역 */}
            <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="메시지 입력..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={sending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="small"
                >
                  <Send />
                </IconButton>
              </Stack>
            </Box>
          </>)
        ) : (
          // 채팅방 목록
          (<>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : chatRooms.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    채팅방이 없습니다
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Add />}
                    sx={{ mt: 1 }}
                    onClick={() => router.push('/chat')}
                  >
                    새 채팅 시작
                  </Button>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {chatRooms.map((room) => {
                    const info = getChatDisplayInfo(room)
                    return (
                      <ListItem
                        key={room.id}
                        disablePadding
                        secondaryAction={
                          room.unread_count > 0 && (
                            <Badge badgeContent={room.unread_count} color="error" sx={{ mr: 1 }} />
                          )
                        }
                      >
                        <ListItemButton onClick={() => setSelectedRoom(room)} sx={{ py: 1 }}>
                          <ListItemAvatar>
                            <Avatar src={info.avatar || undefined} sx={{ width: 36, height: 36 }}>
                              {room.type === 'direct' ? <Person /> : <Group />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight="medium">
                                {info.name}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {room.last_message || '대화를 시작해보세요'}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    )
                  })}
                </List>
              )}
            </Box>
            {/* 전체 채팅 보기 버튼 */}
            <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => router.push('/chat')}
              >
                전체 채팅 보기
              </Button>
            </Box>
          </>)
        )}
    </Box>
  )

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : 400,
          maxWidth: '100%',
        },
      }}
    >
      {chatContent}
    </Drawer>
  )
}
