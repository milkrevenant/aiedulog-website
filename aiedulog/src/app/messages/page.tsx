'use client'

import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  GridLegacy as Grid,
  Fab,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Tab,
  Tabs,
  Badge,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Skeleton,
  Collapse,
  Paper,
} from '@mui/material'
import {
  Add,
  Search,
  Inbox,
  Send,
  Drafts,
  Archive,
  Star,
  StarBorder,
  Schedule,
  Person,
  Group,
  Campaign,
  Close,
  AttachFile,
  Send as SendIcon,
  ExpandLess,
  ExpandMore,
  Message,
  Notifications,
  School,
  AdminPanelSettings,
} from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AppHeader from '@/components/AppHeader'
import DynamicFooter from '@/components/DynamicFooter'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/hooks'
import { getUserIdentity } from '@/lib/identity/helpers'

interface Message {
  id: string
  subject: string
  content: string
  sender: {
    id: string
    name: string
    email: string
    avatar_url?: string
    role: 'admin' | 'teacher' | 'student'
  }
  recipients: {
    id: string
    name: string
    email: string
    read_at?: string
  }[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: 'announcement' | 'notification' | 'personal' | 'system'
  is_starred: boolean
  created_at: string
  scheduled_at?: string
  attachments?: {
    id: string
    name: string
    url: string
    size: number
  }[]
}

type MessageFilter = 'all' | 'inbox' | 'sent' | 'drafts' | 'starred' | 'archived'

export default function MessagesPage() {
  const theme = useTheme()
  const router = useRouter()
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const supabase = createClient()

  // State management
  const [messages, setMessages] = useState<Message[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [messageDetailOpen, setMessageDetailOpen] = useState(false)

  // Compose form state
  const [composeData, setComposeData] = useState({
    recipients: [],
    subject: '',
    content: '',
    priority: 'normal' as Message['priority'],
    category: 'personal' as Message['category'],
    schedule_send: false,
    scheduled_at: '',
  })

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Load messages
  useEffect(() => {
    if (user) {
      loadMessages()
    }
  }, [user])

  // Filter messages
  useEffect(() => {
    filterMessages()
  }, [messages, activeFilter, searchQuery])

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock data for demonstration
      const mockMessages: Message[] = [
        {
          id: '1',
          subject: '2025년 상반기 AI 교육연수 안내',
          content: '안녕하세요. 전남에듀테크교육연구회입니다. 2025년 상반기 AI 교육연수 일정을 안내드립니다.\n\n연수 일정: 2025년 3월 15일 (토) 오전 9시\n장소: 전남교육청 대회의실\n주제: MCP(Model Context Protocol) 활용 교육\n\n많은 참여 부탁드립니다.',
          sender: {
            id: 'admin-1',
            name: '전남에듀테크교육연구회',
            email: 'admin@aiedulog.org',
            avatar_url: undefined,
            role: 'admin'
          },
          recipients: [
            { id: user!.id, name: profile?.nickname || '사용자', email: user!.email || '' }
          ],
          priority: 'high',
          category: 'announcement',
          is_starred: true,
          created_at: '2025-01-15T09:00:00Z',
          attachments: [
            {
              id: 'att-1',
              name: '연수안내서.pdf',
              url: '/files/training-guide.pdf',
              size: 1024000
            }
          ]
        },
        {
          id: '2',
          subject: 'AI 도구 활용 수업 사례 공유',
          content: '안녕하세요. 곽수창입니다.\n\n최근 ChatGPT와 Claude를 활용한 수업 진행 사례를 공유드리고자 합니다. 특히 학생들의 창의적 사고력 향상에 도움이 되었습니다.\n\n자료는 첨부파일을 참고해주세요.',
          sender: {
            id: 'teacher-1',
            name: '곽수창',
            email: 'kwak@school.go.kr',
            role: 'teacher'
          },
          recipients: [
            { id: user!.id, name: profile?.nickname || '사용자', email: user!.email || '' }
          ],
          priority: 'normal',
          category: 'personal',
          is_starred: false,
          created_at: '2025-01-14T15:30:00Z'
        },
        {
          id: '3',
          subject: '학교 문화 혁신을 위한 AI 도구 제안',
          content: '동료 선생님들께,\n\n업무 효율성을 높이기 위한 AI 도구들을 소개하고자 합니다:\n\n1. 수업 계획 자동화 도구\n2. 학생 평가 보조 시스템\n3. 행정업무 간소화 솔루션\n\n관심 있으시면 연락 주세요.',
          sender: {
            id: 'teacher-2',
            name: '공지훈',
            email: 'gong@school.go.kr',
            role: 'teacher'
          },
          recipients: [
            { id: user!.id, name: profile?.nickname || '사용자', email: user!.email || '' }
          ],
          priority: 'normal',
          category: 'personal',
          is_starred: false,
          created_at: '2025-01-13T11:20:00Z'
        },
        {
          id: '4',
          subject: '[시스템] 새로운 기능 업데이트 알림',
          content: 'AIedulog 플랫폼에 새로운 기능이 추가되었습니다.\n\n✨ 새로운 기능:\n- 메시지 시스템 개선\n- 파일 첨부 기능 강화\n- 알림 설정 세분화\n\n업데이트된 기능들을 확인해보세요!',
          sender: {
            id: 'system',
            name: 'AIedulog System',
            email: 'system@aiedulog.org',
            role: 'admin'
          },
          recipients: [
            { id: user!.id, name: profile?.nickname || '사용자', email: user!.email || '' }
          ],
          priority: 'low',
          category: 'system',
          is_starred: false,
          created_at: '2025-01-12T08:00:00Z'
        }
      ]

      setMessages(mockMessages)
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('메시지를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filterMessages = () => {
    let filtered = messages

    // Apply filter
    switch (activeFilter) {
      case 'inbox':
        filtered = messages.filter(m => m.sender.id !== user?.id)
        break
      case 'sent':
        filtered = messages.filter(m => m.sender.id === user?.id)
        break
      case 'drafts':
        filtered = [] // TODO: Implement drafts
        break
      case 'starred':
        filtered = messages.filter(m => m.is_starred)
        break
      case 'archived':
        filtered = [] // TODO: Implement archived
        break
      default:
        filtered = messages
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredMessages(filtered)
  }

  const getPriorityColor = (priority: Message['priority']) => {
    switch (priority) {
      case 'urgent': return '#EF4444'
      case 'high': return '#F59E0B'
      case 'normal': return '#10B981'
      case 'low': return '#6B7280'
      default: return '#6B7280'
    }
  }

  const getCategoryIcon = (category: Message['category']) => {
    switch (category) {
      case 'announcement': return <Campaign />
      case 'notification': return <Notifications />
      case 'personal': return <Person />
      case 'system': return <AdminPanelSettings />
      default: return <Message />
    }
  }

  const getRoleColor = (role: Message['sender']['role']) => {
    switch (role) {
      case 'admin': return '#E6800F' // Orange (Tertiary)
      case 'teacher': return '#2E86AB' // Primary
      case 'student': return '#A23B72' // Secondary
      default: return '#6B7280'
    }
  }

  const formatTimestamp = (timestamp: string) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message)
    setMessageDetailOpen(true)
  }

  const handleStarToggle = (messageId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, is_starred: !m.is_starred } : m
    ))
  }

  if (authLoading) {
    return (
      <Box sx={{ bgcolor: '#FAFCFE', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={400} />
          </Stack>
        </Container>
      </Box>
    )
  }

  const tabLabels = [
    { value: 'inbox', label: '받은편지함', icon: <Inbox /> },
    { value: 'sent', label: '보낸편지함', icon: <Send /> },
    { value: 'drafts', label: '임시보관함', icon: <Drafts /> },
    { value: 'starred', label: '중요', icon: <Star /> },
  ]

  return (
    <Box sx={{ bgcolor: '#FAFCFE', minHeight: '100vh', fontFamily: 'Noto Sans KR, sans-serif' }}>
      <AppHeader user={user} profile={profile} />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, 
            ${alpha('#2E86AB', 0.1)} 0%, 
            ${alpha('#A23B72', 0.05)} 50%, 
            ${alpha('#E6800F', 0.1)} 100%)`,
          py: { xs: 4, md: 6 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    fontWeight: 700,
                    color: '#191C20',
                    mb: 2,
                    lineHeight: 1.2,
                  }}
                >
                  메시지 센터
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#41484D',
                    mb: 3,
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  교육 연구회의 소식과 동료들과의 소통을 한 곳에서 관리하세요
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Chip
                    icon={<Campaign />}
                    label={`공지사항 ${messages.filter(m => m.category === 'announcement').length}개`}
                    sx={{
                      bgcolor: alpha('#E6800F', 0.1),
                      color: '#E6800F',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    icon={<Message />}
                    label={`새 메시지 ${messages.filter(m => !m.recipients[0]?.read_at).length}개`}
                    sx={{
                      bgcolor: alpha('#2E86AB', 0.1),
                      color: '#2E86AB',
                      fontWeight: 500,
                    }}
                  />
                </Stack>
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Card
                  sx={{
                    p: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 3,
                    minWidth: 280,
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      빠른 액세스
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setComposeOpen(true)}
                      sx={{
                        bgcolor: '#2E86AB',
                        color: '#FFFFFF',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: '#204876',
                        },
                      }}
                    >
                      새 메시지 작성
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Star />}
                      sx={{
                        borderColor: '#A23B72',
                        color: '#A23B72',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          borderColor: '#7A2959',
                          bgcolor: alpha('#A23B72', 0.08),
                        },
                      }}
                    >
                      중요 메시지
                    </Button>
                  </Stack>
                </Card>
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Filter Tabs */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeFilter}
                  onChange={(_, newValue) => setActiveFilter(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      minHeight: 64,
                    },
                  }}
                >
                  {tabLabels.map((tab) => (
                    <Tab
                      key={tab.value}
                      value={tab.value}
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {tab.icon}
                          <span>{tab.label}</span>
                          {tab.value === 'inbox' && (
                            <Badge badgeContent={filteredMessages.length} color="primary" max={99} />
                          )}
                        </Stack>
                      }
                    />
                  ))}
                </Tabs>
              </Box>
              
              {/* Search Bar */}
              <Box sx={{ p: 2, bgcolor: '#F7F9FF' }}>
                <TextField
                  fullWidth
                  placeholder="메시지 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#41484D' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'white',
                    },
                  }}
                />
              </Box>
            </Card>
          </Grid>

          {/* Messages List */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {loading ? (
                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} variant="rectangular" height={80} />
                    ))}
                  </Stack>
                </Box>
              ) : error ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                  <Button variant="contained" onClick={loadMessages}>
                    다시 시도
                  </Button>
                </Box>
              ) : filteredMessages.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Message sx={{ fontSize: 64, color: '#C0C7CD', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    메시지가 없습니다
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeFilter === 'inbox' ? '받은 메시지가 없습니다' : 
                     activeFilter === 'sent' ? '보낸 메시지가 없습니다' :
                     activeFilter === 'starred' ? '중요 표시된 메시지가 없습니다' :
                     '해당하는 메시지가 없습니다'}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  <AnimatePresence>
                    {filteredMessages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => handleMessageClick(message)}
                            sx={{
                              py: 2,
                              px: 3,
                              borderBottom: '1px solid #F0F0F0',
                              '&:hover': {
                                bgcolor: alpha('#2E86AB', 0.04),
                              },
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar
                                src={message.sender.avatar_url}
                                sx={{
                                  bgcolor: getRoleColor(message.sender.role),
                                  width: 48,
                                  height: 48,
                                }}
                              >
                                {message.sender.name[0]}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                  <Typography fontWeight="bold" sx={{ flex: 1 }}>
                                    {message.sender.name}
                                  </Typography>
                                  {getCategoryIcon(message.category)}
                                  <Chip
                                    size="small"
                                    label={message.priority.toUpperCase()}
                                    sx={{
                                      bgcolor: alpha(getPriorityColor(message.priority), 0.1),
                                      color: getPriorityColor(message.priority),
                                      fontSize: '0.7rem',
                                      height: 20,
                                    }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTimestamp(message.created_at)}
                                  </Typography>
                                </Stack>
                              }
                              secondary={
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="medium"
                                    sx={{
                                      color: '#191C20',
                                      mb: 0.5,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {message.subject}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {message.content}
                                  </Typography>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                      <AttachFile sx={{ fontSize: 16, color: 'text.secondary' }} />
                                      <Typography variant="caption" color="text.secondary">
                                        첨부파일 {message.attachments.length}개
                                      </Typography>
                                    </Stack>
                                  )}
                                </Box>
                              }
                            />
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStarToggle(message.id)
                              }}
                              sx={{ ml: 1 }}
                            >
                              {message.is_starred ? (
                                <Star sx={{ color: '#F59E0B' }} />
                              ) : (
                                <StarBorder sx={{ color: '#C0C7CD' }} />
                              )}
                            </IconButton>
                          </ListItemButton>
                        </ListItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </List>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="compose"
        onClick={() => setComposeOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 32 },
          right: { xs: 16, md: 32 },
          bgcolor: '#2E86AB',
          '&:hover': {
            bgcolor: '#204876',
          },
        }}
      >
        <Add />
      </Fab>

      {/* Message Detail Dialog */}
      <Dialog
        open={messageDetailOpen}
        onClose={() => setMessageDetailOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        {selectedMessage && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={selectedMessage.sender.avatar_url}
                  sx={{
                    bgcolor: getRoleColor(selectedMessage.sender.role),
                  }}
                >
                  {selectedMessage.sender.name[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedMessage.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMessage.sender.name} • {formatTimestamp(selectedMessage.created_at)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => handleStarToggle(selectedMessage.id)}>
                    {selectedMessage.is_starred ? (
                      <Star sx={{ color: '#F59E0B' }} />
                    ) : (
                      <StarBorder />
                    )}
                  </IconButton>
                  <IconButton onClick={() => setMessageDetailOpen(false)}>
                    <Close />
                  </IconButton>
                </Stack>
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {selectedMessage.content}
              </Typography>
              
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                    첨부파일
                  </Typography>
                  <Stack spacing={1}>
                    {selectedMessage.attachments.map((attachment) => (
                      <Card key={attachment.id} sx={{ p: 2, bgcolor: '#F7F9FF' }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <AttachFile />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {attachment.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(attachment.size)}
                            </Typography>
                          </Box>
                          <Button size="small" variant="outlined">
                            다운로드
                          </Button>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Compose Dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight="bold">
              새 메시지 작성
            </Typography>
            <IconButton onClick={() => setComposeOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <Autocomplete
              multiple
              options={[]} // TODO: Load users from API
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="받는 사람"
                  placeholder="이메일을 입력하세요"
                  fullWidth
                />
              )}
            />
            
            <TextField
              label="제목"
              fullWidth
              value={composeData.subject}
              onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
            />
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={composeData.priority}
                  label="우선순위"
                  onChange={(e) => setComposeData(prev => ({ ...prev, priority: e.target.value as Message['priority'] }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="normal">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={composeData.category}
                  label="카테고리"
                  onChange={(e) => setComposeData(prev => ({ ...prev, category: e.target.value as Message['category'] }))}
                >
                  <MenuItem value="personal">개인</MenuItem>
                  <MenuItem value="announcement">공지사항</MenuItem>
                  <MenuItem value="notification">알림</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <TextField
              label="내용"
              multiline
              rows={8}
              fullWidth
              value={composeData.content}
              onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="메시지 내용을 입력하세요..."
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={composeData.schedule_send}
                  onChange={(e) => setComposeData(prev => ({ ...prev, schedule_send: e.target.checked }))}
                />
              }
              label="예약 발송"
            />
            
            {composeData.schedule_send && (
              <TextField
                label="발송 일시"
                type="datetime-local"
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                value={composeData.scheduled_at}
                onChange={(e) => setComposeData(prev => ({ ...prev, scheduled_at: e.target.value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => setComposeOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            sx={{
              bgcolor: '#2E86AB',
              color: '#FFFFFF',
              textTransform: 'none',
              borderRadius: '20px',
              px: 3,
              '&:hover': {
                bgcolor: '#204876',
              },
            }}
          >
            {composeData.schedule_send ? '예약 발송' : '발송'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dynamic Footer */}
      <DynamicFooter language="ko" />
    </Box>
  )
}