'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  Box,
  Container,
  Card,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Typography,
  Stack,
  Divider,
  Fab,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material'
import {
  Chat,
  Search,
  Add,
  Person,
  Group,
  MoreVert,
  Circle
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

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
      role: string
    }
  }>
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newChatDialog, setNewChatDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [creatingChat, setCreatingChat] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
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
    if (user) {
      fetchChatRooms()
      setupRealtimeSubscription()
    }
  }, [user])

  const fetchChatRooms = async () => {
    if (!user) return

    // 채팅방 목록 가져오기
    const { data: rooms, error } = await supabase
      .from('chat_participants')
      .select(`
        room_id,
        chat_rooms!inner (
          id,
          name,
          type,
          last_message,
          last_message_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('chat_rooms(last_message_at)', { ascending: false })

    if (rooms) {
      // 각 채팅방의 참가자 정보와 안읽은 메시지 수 가져오기
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room: any) => {
          // 참가자 정보
          const { data: participants } = await supabase
            .from('chat_participants')
            .select(`
              user_id,
              profiles!inner (
                id,
                email,
                nickname,
                avatar_url,
                role
              )
            `)
            .eq('room_id', room.chat_rooms.id)
            .eq('is_active', true)

          // 안읽은 메시지 수
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.chat_rooms.id)
            .neq('sender_id', user.id)
            .gt('created_at', room.last_read_at || '1970-01-01')

          return {
            ...room.chat_rooms,
            participants: participants || [],
            unread_count: unreadCount || 0
          }
        })
      )

      setChatRooms(roomsWithDetails)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    // 새 메시지 실시간 구독
    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // 채팅방 목록 새로고침
          fetchChatRooms()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms'
        },
        (payload) => {
          // 채팅방 업데이트
          fetchChatRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const fetchUsers = async (searchText: string) => {
    if (!searchText) {
      setUsers([])
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${searchText}%,nickname.ilike.%${searchText}%`)
      .neq('id', user?.id)
      .limit(10)

    if (data) {
      setUsers(data)
    }
  }

  const createNewChat = async () => {
    if (!selectedUser || !user) return

    setCreatingChat(true)

    // Direct 채팅방 생성 또는 가져오기
    const { data: roomId, error } = await supabase
      .rpc('create_or_get_direct_chat', {
        user1_id: user.id,
        user2_id: selectedUser.id
      })

    if (roomId) {
      router.push(`/chat/${roomId}`)
    }

    setCreatingChat(false)
    setNewChatDialog(false)
  }

  const getChatDisplayInfo = (room: ChatRoom) => {
    if (room.type === 'direct') {
      // DM인 경우 상대방 정보 표시
      const otherUser = room.participants.find(p => p.user_id !== user?.id)
      return {
        name: otherUser?.profile.nickname || otherUser?.profile.email?.split('@')[0] || '사용자',
        avatar: otherUser?.profile.avatar_url,
        isOnline: false // 온라인 상태는 추후 구현
      }
    } else {
      // 그룹 채팅
      return {
        name: room.name || '그룹 채팅',
        avatar: null,
        isOnline: false
      }
    }
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (days === 1) {
      return '어제'
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'numeric', 
        day: 'numeric' 
      })
    }
  }

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="md" sx={{ pt: 3 }}>
          <CircularProgress />
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      <AppHeader user={user} profile={profile} />

      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* 헤더 */}
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Chat />
              <Typography variant="h5" fontWeight="bold">
                채팅
              </Typography>
            </Stack>
          </Box>

          {/* 검색 바 */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder="채팅방 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>

          {/* 채팅방 목록 */}
          <List sx={{ p: 0 }}>
            {chatRooms.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  아직 채팅방이 없습니다
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  sx={{ mt: 2 }}
                  onClick={() => setNewChatDialog(true)}
                >
                  새 채팅 시작하기
                </Button>
              </Box>
            ) : (
              chatRooms
                .filter(room => {
                  if (!searchQuery) return true
                  const info = getChatDisplayInfo(room)
                  return info.name.toLowerCase().includes(searchQuery.toLowerCase())
                })
                .map((room) => {
                  const info = getChatDisplayInfo(room)
                  return (
                    <ListItem
                      key={room.id}
                      disablePadding
                      secondaryAction={
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(room.last_message_at)}
                          </Typography>
                          {room.unread_count > 0 && (
                            <Badge
                              badgeContent={room.unread_count}
                              color="error"
                              max={99}
                            />
                          )}
                        </Stack>
                      }
                    >
                      <ListItemButton
                        onClick={() => router.push(`/chat/${room.id}`)}
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ 
                              vertical: 'bottom', 
                              horizontal: 'right' 
                            }}
                            badgeContent={
                              info.isOnline ? (
                                <Circle 
                                  sx={{ 
                                    color: 'success.main',
                                    width: 12,
                                    height: 12
                                  }} 
                                />
                              ) : null
                            }
                          >
                            <Avatar src={info.avatar || undefined}>
                              {room.type === 'direct' ? <Person /> : <Group />}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography fontWeight="medium">
                              {info.name}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {room.last_message || '대화를 시작해보세요'}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  )
                })
            )}
          </List>
        </Paper>
      </Container>

      {/* 새 채팅 FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16
        }}
        onClick={() => setNewChatDialog(true)}
      >
        <Add />
      </Fab>

      {/* 새 채팅 다이얼로그 */}
      <Dialog
        open={newChatDialog}
        onClose={() => setNewChatDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>새 채팅 시작</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={users}
            getOptionLabel={(option) => 
              option.nickname || option.email || ''
            }
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar
                  src={option.avatar_url}
                  sx={{ mr: 2, width: 32, height: 32 }}
                >
                  {option.email?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body1">
                    {option.nickname || option.email?.split('@')[0]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email}
                  </Typography>
                </Box>
              </Box>
            )}
            onInputChange={(event, value) => {
              fetchUsers(value)
            }}
            onChange={(event, value) => {
              setSelectedUser(value)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="사용자 검색 (이메일 또는 닉네임)"
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={createNewChat}
            disabled={!selectedUser || creatingChat}
          >
            {creatingChat ? '생성 중...' : '채팅 시작'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}