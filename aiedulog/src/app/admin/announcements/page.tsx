'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
  PushPinOutlined as UnpinIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Campaign as CampaignIcon,
  Build as MaintenanceIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { usePermission } from '@/hooks/usePermission'
import AuthGuard from '@/components/AuthGuard'

interface Announcement {
  id: string
  title: string
  content: string
  category: 'general' | 'urgent' | 'event' | 'maintenance'
  priority: number // 0: normal, 1: important, 2: urgent
  author_id?: string
  is_pinned: boolean
  is_published: boolean
  expires_at?: string
  created_at: string
  updated_at: string
  author?: {
    name?: string
    nickname?: string
    email: string
  }
}

export default function AnnouncementsManagementPage() {
  const router = useRouter()
  const { can } = usePermission()
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    category: 'general',
    priority: 0,
    is_pinned: false,
    is_published: true,
    expires_at: undefined,
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(
          `
          *,
          author:profiles!author_id (
            name,
            nickname,
            email
          )
        `
        )
        .order('is_pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingAnnouncement({
      title: '',
      content: '',
      category: 'general',
      priority: 0,
      is_pinned: false,
      is_published: true,
      expires_at: undefined,
    })
    setSelectedAnnouncement(null)
    setDialogOpen(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setSelectedAnnouncement(announcement)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedAnnouncement) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', selectedAnnouncement.id)

      if (error) throw error
      await fetchAnnouncements()
      setDeleteDialogOpen(false)
      setSelectedAnnouncement(null)
    } catch (error) {
      console.error('공지사항 삭제 실패:', error)
    }
  }

  const handleSave = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (selectedAnnouncement) {
        // 수정
        const { error } = await supabase
          .from('announcements')
          .update({
            ...editingAnnouncement,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedAnnouncement.id)

        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase.from('announcements').insert([
          {
            ...editingAnnouncement,
            author_id: user?.id,
          },
        ])

        if (error) throw error
      }

      await fetchAnnouncements()
      setDialogOpen(false)
      setEditingAnnouncement({})
      setSelectedAnnouncement(null)
    } catch (error) {
      console.error('공지사항 저장 실패:', error)
    }
  }

  const togglePinned = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !announcement.is_pinned })
        .eq('id', announcement.id)

      if (error) throw error
      await fetchAnnouncements()
    } catch (error) {
      console.error('고정 상태 변경 실패:', error)
    }
  }

  const togglePublished = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_published: !announcement.is_published })
        .eq('id', announcement.id)

      if (error) throw error
      await fetchAnnouncements()
    } catch (error) {
      console.error('발행 상태 변경 실패:', error)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general':
        return <InfoIcon />
      case 'urgent':
        return <WarningIcon />
      case 'event':
        return <CampaignIcon />
      case 'maintenance':
        return <MaintenanceIcon />
      default:
        return <InfoIcon />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'general':
        return '일반'
      case 'urgent':
        return '긴급'
      case 'event':
        return '이벤트'
      case 'maintenance':
        return '점검'
      default:
        return category
    }
  }

  const getCategoryColor = (category: string): any => {
    switch (category) {
      case 'general':
        return 'info'
      case 'urgent':
        return 'error'
      case 'event':
        return 'secondary'
      case 'maintenance':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: number): any => {
    switch (priority) {
      case 0:
        return 'default'
      case 1:
        return 'warning'
      case 2:
        return 'error'
      default:
        return 'default'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 0:
        return '보통'
      case 1:
        return '중요'
      case 2:
        return '긴급'
      default:
        return '보통'
    }
  }

  // 고정 공지와 일반 공지 분리
  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned)
  const normalAnnouncements = announcements.filter((a) => !a.is_pinned)

  return (
    <AuthGuard requireAdmin>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              공지사항 관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              연구회 공지사항을 관리합니다
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            공지사항 작성
          </Button>
        </Box>

        {/* 고정 공지사항 */}
        {pinnedAnnouncements.length > 0 && (
          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PinIcon color="primary" />
              고정 공지사항
            </Typography>
            <List>
              {pinnedAnnouncements.map((announcement) => (
                <ListItem
                  key={announcement.id}
                  sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}
                >
                  <ListItemIcon>{getCategoryIcon(announcement.category)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{announcement.title}</Typography>
                        <Chip
                          label={getCategoryLabel(announcement.category)}
                          color={getCategoryColor(announcement.category)}
                          size="small"
                        />
                        {announcement.priority > 0 && (
                          <Chip
                            icon={<FlagIcon />}
                            label={getPriorityLabel(announcement.priority)}
                            color={getPriorityColor(announcement.priority)}
                            size="small"
                          />
                        )}
                        {!announcement.is_published && <Chip label="미발행" size="small" />}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {announcement.content.substring(0, 100)}...
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {announcement.author?.nickname || announcement.author?.name} ·{' '}
                          {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => togglePinned(announcement)}
                      color="primary"
                    >
                      <PinIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => togglePublished(announcement)}>
                      {announcement.is_published ? <ViewIcon /> : <HideIcon />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEdit(announcement)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedAnnouncement(announcement)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* 일반 공지사항 */}
        <Typography variant="h6" gutterBottom>
          일반 공지사항
        </Typography>
        <Grid container spacing={2}>
          {normalAnnouncements.map((announcement) => (
            <Grid size={{ xs: 12, md: 6 }} key={announcement.id}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={getCategoryIcon(announcement.category)}
                        label={getCategoryLabel(announcement.category)}
                        color={getCategoryColor(announcement.category)}
                        size="small"
                      />
                      {announcement.priority > 0 && (
                        <Chip
                          icon={<FlagIcon />}
                          label={getPriorityLabel(announcement.priority)}
                          color={getPriorityColor(announcement.priority)}
                          size="small"
                        />
                      )}
                      {announcement.expires_at && (
                        <Chip
                          icon={<ScheduleIcon />}
                          label={`만료: ${new Date(announcement.expires_at).toLocaleDateString('ko-KR')}`}
                          size="small"
                          color={
                            new Date(announcement.expires_at) < new Date() ? 'error' : 'default'
                          }
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => togglePublished(announcement)}
                      color={announcement.is_published ? 'primary' : 'default'}
                    >
                      {announcement.is_published ? <ViewIcon /> : <HideIcon />}
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {announcement.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {announcement.content.substring(0, 150)}
                    {announcement.content.length > 150 && '...'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {announcement.author?.nickname ||
                        announcement.author?.name ||
                        announcement.author?.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <IconButton size="small" onClick={() => togglePinned(announcement)}>
                    <UnpinIcon />
                  </IconButton>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(announcement)}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setSelectedAnnouncement(announcement)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    삭제
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {normalAnnouncements.length === 0 && !loading && (
            <Grid size={12}>
              <Alert severity="info">등록된 일반 공지사항이 없습니다</Alert>
            </Grid>
          )}
        </Grid>

        {/* 공지사항 추가/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedAnnouncement ? '공지사항 수정' : '공지사항 작성'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="제목"
                fullWidth
                value={editingAnnouncement.title || ''}
                onChange={(e) =>
                  setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                }
                required
              />

              <TextField
                label="내용"
                fullWidth
                multiline
                rows={6}
                value={editingAnnouncement.content || ''}
                onChange={(e) =>
                  setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
                }
                required
              />

              <Grid container spacing={2}>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>카테고리</InputLabel>
                    <Select
                      value={editingAnnouncement.category || 'general'}
                      onChange={(e) =>
                        setEditingAnnouncement({
                          ...editingAnnouncement,
                          category: e.target.value as any,
                        })
                      }
                      label="카테고리"
                    >
                      <MenuItem value="general">일반</MenuItem>
                      <MenuItem value="urgent">긴급</MenuItem>
                      <MenuItem value="event">이벤트</MenuItem>
                      <MenuItem value="maintenance">점검</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>우선순위</InputLabel>
                    <Select
                      value={editingAnnouncement.priority || 0}
                      onChange={(e) =>
                        setEditingAnnouncement({
                          ...editingAnnouncement,
                          priority: e.target.value as number,
                        })
                      }
                      label="우선순위"
                    >
                      <MenuItem value={0}>보통</MenuItem>
                      <MenuItem value={1}>중요</MenuItem>
                      <MenuItem value={2}>긴급</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                <DateTimePicker
                  label="만료 일시 (선택사항)"
                  value={
                    editingAnnouncement.expires_at ? new Date(editingAnnouncement.expires_at) : null
                  }
                  onChange={(date) => {
                    setEditingAnnouncement({
                      ...editingAnnouncement,
                      expires_at: date ? date.toISOString() : undefined,
                    })
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>

              <FormControlLabel
                control={
                  <Switch
                    checked={editingAnnouncement.is_pinned || false}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        is_pinned: e.target.checked,
                      })
                    }
                  />
                }
                label="상단 고정"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editingAnnouncement.is_published !== false}
                    onChange={(e) =>
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        is_published: e.target.checked,
                      })
                    }
                  />
                }
                label="바로 발행"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} variant="contained">
              {selectedAnnouncement ? '수정' : '작성'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>공지사항 삭제</DialogTitle>
          <DialogContent>
            <Typography>"{selectedAnnouncement?.title}" 공지사항을 삭제하시겠습니까?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
            <Button onClick={handleDelete} color="error">
              삭제
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  )
}
