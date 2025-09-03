'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity, searchUsers } from '@/lib/identity/helpers'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
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
  Autocomplete,
  useMediaQuery,
  useTheme,
  
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { Chat, Search, Add, Person, Group, MoreVert, Circle, Create, PersonAdd, Notes } from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'
import ChatInterface from '@/components/ChatInterface'
import ResizableSidebar from '@/components/ResizableSidebar'

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
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newChatDialog, setNewChatDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [creatingChat, setCreatingChat] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [isNewChat, setIsNewChat] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [participantSearchAnchor, setParticipantSearchAnchor] = useState<null | HTMLElement>(null)

  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTabletUp = useMediaQuery(theme.breakpoints.up('md'))  // 태블릿 이상에서 Split View

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      fetchChatRooms()
      setupRealtimeSubscription()
    }
  }, [user])

  const fetchChatRooms = async () => {
    try {
      if (!user) return
      
      // Secure logging: production-safe (no console output in production)

      // 채팅방 목록 가져오기 - 간단한 쿼리로 변경
      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('room_id, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (participantError) {
        // Secure logging: Only log errors in development
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error fetching participants:', {
            message: participantError.message || 'Unknown error',
            code: participantError.code || 'No code'
          })
        }
        setError(`채팅방 목록을 불러오는데 실패했습니다: ${participantError.message || '알 수 없는 오류'}`)
        return
      }
      
      if (!participantData || participantData.length === 0) {
        // Secure logging: production-safe (no console output in production)
        setChatRooms([])
        setLoading(false)
        return
      }
      
      // Secure logging: production-safe (no console output in production)
      
      // 각 room_id로 채팅방 정보 가져오기
      const roomIds = participantData.map(p => p.room_id).filter(id => id != null)
      
      if (roomIds.length === 0) {
        setChatRooms([])
        return
      }
      
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)

      if (error) {
        console.error('Error fetching chat rooms:', {
          message: error.message || 'Unknown error',
          details: error.details || 'No details',
          code: error.code || 'No code',
          fullError: JSON.stringify(error)
        })
        setError(`채팅방 정보를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`)
        return
      }

      // Secure logging: production-safe (no console output in production)

      if (rooms && rooms.length > 0) {
        // 각 채팅방의 참가자 정보와 안읽은 메시지 수 가져오기
        const roomsWithDetails = await Promise.all(
          rooms.map(async (room: any) => {
            // 해당 방의 last_read_at 찾기
            const participantInfo = participantData.find(p => p.room_id === room.id)
            
            // 참가자 정보 - Try new identity system first, fallback to legacy
            let participants = null
            try {
              const { data: identityParticipants, error: identityError } = await supabase
                .from('chat_participants')
                .select(`
                  user_id,
                  identities!chat_participants_user_id_fkey (
                    id,
                    status,
                    user_profiles!identities_user_profiles_user_id_fkey (
                      email,
                      nickname,
                      avatar_url,
                      role
                    )
                  )
                `)
                .eq('room_id', room.id)
                .eq('is_active', true)

              if (identityError) throw identityError
              
              participants = identityParticipants?.map((p: any) => ({
                user_id: p.user_id,
                profile: {
                  id: p.identities?.id,
                  email: p.identities?.user_profiles?.[0]?.email,
                  nickname: p.identities?.user_profiles?.[0]?.nickname,
                  avatar_url: p.identities?.user_profiles?.[0]?.avatar_url,
                  role: p.identities?.user_profiles?.[0]?.role
                }
              }))
            } catch (err) {
              // Fallback to legacy profiles query
              const { data: legacyParticipants } = await supabase
                .from('chat_participants')
                .select(`
                  user_id,
                  profiles:user_id (
                    id,
                    email,
                    nickname,
                    avatar_url,
                    role
                  )
                `)
                .eq('room_id', room.id)
                .eq('is_active', true)
              
              participants = legacyParticipants
            }

            // 안읽은 메시지 수
            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .neq('sender_id', user.id)
              .gt('created_at', participantInfo?.last_read_at || '1970-01-01')
            
            return {
              ...room,
              participants: participants || [],
              unread_count: unreadCount || 0,
            }
          })
        )

        // null 값 필터링
        const validRooms = roomsWithDetails.filter(room => room !== null)
        setChatRooms(validRooms)
      } else {
        setChatRooms([])
      }
    } catch (err) {
      console.error('Error in fetchChatRooms:', err)
      setError('채팅방을 불러오는데 실패했습니다.')
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
          table: 'chat_messages',
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
          table: 'chat_rooms',
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

    try {
      // 통합 identity 시스템을 통한 사용자 검색
      const currentIdentity = user ? await getUserIdentity(user, supabase) : null
      const currentIdentityId = currentIdentity?.user_id
      
      // 신규 통합 검색 헬퍼 사용
      const searchResults = await searchUsers(searchText, supabase, currentIdentityId, 10)
      
      // 호환성을 위해 기존 형식으로 매핑
      const mappedUsers = searchResults.map(profile => ({
        id: profile.user_id,
        email: profile.email,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        role: profile.role,
        full_name: profile.full_name
      }))

      setUsers(mappedUsers || [])
    } catch (err) {
      console.error('User search failed:', err)
      setUsers([])
    }
  }

  const createNewChat = async () => {
    if (!selectedUser || !user) return

    setCreatingChat(true)

    // Direct 채팅방 생성 또는 가져오기
    const { data: roomId, error } = await supabase.rpc('create_or_get_direct_chat', {
      user1_id: user.id,
      user2_id: selectedUser.id,
    })

    if (roomId) {
      if (isTabletUp) {
        // 태블릿/데스크탑에서는 오른쪽 패널에 표시
        const room = {
          id: roomId,
          name: selectedUser.nickname || selectedUser.email?.split('@')[0],
          type: 'direct' as const,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
          participants: [
            {
              user_id: selectedUser.id,
              profile: selectedUser,
            },
          ],
        }
        setSelectedRoom(room)
        await fetchChatRooms()
      } else {
        // 모바일에서는 페이지 이동
        router.push(`/chat/${roomId}`)
      }
    }

    setCreatingChat(false)
    setNewChatDialog(false)
    setIsNewChat(false)
  }

  const startNewChat = () => {
    // 선택된 방 해제하고 새 채팅 모드로
    setSelectedRoom(null)
    setIsNewChat(true)
    
    if (!isTabletUp) {
      // 모바일에서는 새 채팅 페이지로 이동
      router.push('/chat/new')
    }
  }

  const getChatDisplayInfo = (room: ChatRoom) => {
    // Solo 채팅 (참가자가 나 혼자)
    if (room.participants && room.participants.length === 1 && room.participants[0].user_id === user?.id) {
      return {
        name: room.name || '나만의 메모',
        avatar: null,
        isOnline: false,
        isSolo: true,
      }
    }
    
    if (room.type === 'direct' && room.participants) {
      // DM인 경우 상대방 정보 표시
      const otherUser = room.participants.find((p) => p.user_id !== user?.id)
      return {
        name: otherUser?.profile?.nickname || otherUser?.profile?.email?.split('@')[0] || room.name || '사용자',
        avatar: otherUser?.profile?.avatar_url,
        isOnline: false, // 온라인 상태는 추후 구현
        isSolo: false,
      }
    } else {
      // 그룹 채팅
      return {
        name: room.name || '그룹 채팅',
        avatar: null,
        isOnline: false,
        isSolo: false,
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
        minute: '2-digit',
      })
    } else if (days === 1) {
      return '어제'
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      })
    }
  }

  if (authLoading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="md" sx={{ pt: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            채팅을 불러오는 중...
          </Typography>
        </Container>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="md" sx={{ pt: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            오류가 발생했습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            새로고침
          </Button>
        </Container>
      </Box>
    )
  }

  // 채팅방 목록 컴포넌트
  const ChatRoomList = () => (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 데스크탑: 검색바만, 모바일: 헤더 + 검색바 */}
      {isTabletUp ? (
        // 데스크탑: 검색바를 최상단에 배치
        (<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="채팅방 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>)
      ) : (
        // 모바일: 헤더와 검색바 모두 표시
        (<>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">
                채팅
              </Typography>
              <IconButton onClick={startNewChat} color="primary">
                <Create />
              </IconButton>
            </Stack>
          </Box>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder="채팅방 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        </>)
      )}

      {/* 채팅방 목록 */}
      <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
        {chatRooms.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">아직 채팅방이 없습니다</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              새 채팅을 시작하려면 위의 + 버튼을 클릭하거나
            </Typography>
            <Typography variant="caption" color="text.secondary">
              오른쪽에서 메시지를 입력하세요
            </Typography>
          </Box>
        ) : (
          chatRooms
            .filter((room) => {
              if (!searchQuery) return true
              const info = getChatDisplayInfo(room)
              return info.name.toLowerCase().includes(searchQuery.toLowerCase())
            })
            .map((room) => {
              const info = getChatDisplayInfo(room)
              const isSelected = selectedRoom?.id === room.id
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
                        <Badge badgeContent={room.unread_count} color="error" max={99} />
                      )}
                    </Stack>
                  }
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => {
                      setSelectedRoom(room)
                      setIsNewChat(false)
                      if (!isTabletUp) {
                        router.push(`/chat/${room.id}`)
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        badgeContent={
                          info.isOnline ? (
                            <Circle
                              sx={{
                                color: 'success.main',
                                width: 12,
                                height: 12,
                              }}
                            />
                          ) : null
                        }
                      >
                        <Avatar src={info.avatar || undefined}>
                          {info.isSolo ? <Notes /> : room.type === 'direct' ? <Person /> : <Group />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography fontWeight="medium">{info.name}</Typography>}
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
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
  )

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <AppHeader user={user} profile={profile} />
      {isTabletUp ? (
        // 태블릿/데스크탑: Split View (Flexbox)
        (<Box sx={{ height: 'calc(100vh - 64px)', display: 'flex' }}>
          {/* 사이드바: 채팅 목록 (리사이징 가능) */}
          <ResizableSidebar
            defaultWidth={220}
            minWidth={180}
            maxWidth={400}
            storageKey="chat-sidebar-width"
          >
            <ChatRoomList />
          </ResizableSidebar>
          {/* 메인 패널: 채팅 뷰 (남은 공간 모두) */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <ChatInterface
              roomId={selectedRoom?.id || 'new'}
              user={user!}
              isNewChat={!selectedRoom}
            />
          </Box>
        </Box>)
      ) : (
        // 모바일: 채팅 목록만 표시
        (<Container maxWidth="md" sx={{ pt: 3 }}>
          <ChatRoomList />
        </Container>)
      )}
      {/* 새 채팅 다이얼로그 */}
      <Dialog open={newChatDialog} onClose={() => setNewChatDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 채팅 시작</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={users}
            getOptionLabel={(option) => option.nickname || option.email || ''}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar src={option.avatar_url} sx={{ mr: 2, width: 32, height: 32 }}>
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
          <Button onClick={() => setNewChatDialog(false)}>취소</Button>
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
  );
}
