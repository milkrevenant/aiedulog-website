'use client'
/**
 * Regular Meetings Management - Client Component
 * MIGRATION: Updated to Client Component with API routes (2025-10-14)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  Group as GroupIcon,
  VideoCall as VideoCallIcon,
  Event as EventIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { ko } from 'date-fns/locale'
import { usePermission } from '@/hooks/usePermission'

interface RegularMeeting {
  id: string
  title: string
  description?: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  online_link?: string
  max_participants?: number
  current_participants: number
  registration_deadline?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

interface RegularMeetingsClientProps {
  initialMeetings: RegularMeeting[]
}

export function RegularMeetingsClient({ initialMeetings }: RegularMeetingsClientProps) {
  const router = useRouter()
  const { can } = usePermission()
  const [meetings, setMeetings] = useState<RegularMeeting[]>(initialMeetings)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<RegularMeeting | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<Partial<RegularMeeting>>({
    title: '',
    description: '',
    meeting_date: new Date().toISOString(),
    location: '',
    online_link: '',
    max_participants: 30,
    current_participants: 0,
    status: 'scheduled',
  })

  const refreshMeetings = async () => {
    router.refresh()
    // Optionally fetch from API route if needed
  }

  const handleAdd = () => {
    setEditingMeeting({
      title: '',
      description: '',
      meeting_date: new Date().toISOString(),
      location: '',
      online_link: '',
      max_participants: 30,
      current_participants: 0,
      status: 'scheduled',
    })
    setSelectedMeeting(null)
    setDialogOpen(true)
  }

  const handleEdit = (meeting: RegularMeeting) => {
    setEditingMeeting(meeting)
    setSelectedMeeting(meeting)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedMeeting) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/regular-meetings/${selectedMeeting.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('삭제 실패')
      }

      await refreshMeetings()
      setDeleteDialogOpen(false)
      setSelectedMeeting(null)
    } catch (error) {
      console.error('모임 삭제 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      if (selectedMeeting) {
        // Update
        const res = await fetch(`/api/admin/regular-meetings/${selectedMeeting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMeeting),
        })

        if (!res.ok) {
          throw new Error('수정 실패')
        }
      } else {
        // Create
        const res = await fetch('/api/admin/regular-meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMeeting),
        })

        if (!res.ok) {
          throw new Error('추가 실패')
        }
      }

      await refreshMeetings()
      setDialogOpen(false)
      setEditingMeeting({})
      setSelectedMeeting(null)
    } catch (error) {
      console.error('모임 저장 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'success' | 'error' => {
    switch (status) {
      case 'scheduled':
        return 'primary'
      case 'ongoing':
        return 'success'
      case 'completed':
        return 'default'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '예정'
      case 'ongoing':
        return '진행중'
      case 'completed':
        return '완료'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  // 상태별로 모임 그룹화
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled')
  const ongoingMeetings = meetings.filter((m) => m.status === 'ongoing')
  const pastMeetings = meetings.filter(
    (m) => m.status === 'completed' || m.status === 'cancelled'
  )

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            정기 모임 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            전남에듀테크교육연구회 정기 모임 일정을 관리합니다
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          모임 추가
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <EventAvailableIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">{upcomingMeetings.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    예정된 모임
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <VideoCallIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">{ongoingMeetings.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    진행중 모임
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'grey.500' }}>
                  <EventIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">{pastMeetings.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    완료된 모임
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <GroupIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {meetings.reduce((acc, m) => acc + (m.current_participants || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 참가자
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 모임 목록 */}
      <Grid container spacing={3}>
        {/* 예정된 모임 */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <EventAvailableIcon color="primary" />
              예정된 모임
            </Typography>
            <List>
              {upcomingMeetings.map((meeting) => (
                <ListItem key={meeting.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CalendarIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.meeting_date).toLocaleDateString('ko-KR')}
                        </Typography>
                        {meeting.start_time && (
                          <Typography variant="caption" color="text.secondary">
                            {meeting.start_time} ~ {meeting.end_time}
                          </Typography>
                        )}
                        {meeting.location && (
                          <Typography variant="caption" color="text.secondary">
                            📍 {meeting.location}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleEdit(meeting)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedMeeting(meeting)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {upcomingMeetings.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="예정된 모임이 없습니다"
                    secondary="새로운 모임을 추가해주세요"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* 진행중 모임 */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <VideoCallIcon color="success" />
              진행중 모임
            </Typography>
            <List>
              {ongoingMeetings.map((meeting) => (
                <ListItem key={meeting.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <VideoCallIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.meeting_date).toLocaleDateString('ko-KR')}
                        </Typography>
                        {meeting.online_link && (
                          <Typography variant="caption" color="primary">
                            🔗 온라인 진행중
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          참가자: {meeting.current_participants || 0}명
                        </Typography>
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleEdit(meeting)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {ongoingMeetings.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="진행중인 모임이 없습니다"
                    secondary="현재 진행중인 모임이 없습니다"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* 지난 모임 */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <EventIcon color="action" />
              지난 모임
            </Typography>
            <List>
              {pastMeetings.slice(0, 5).map((meeting) => (
                <ListItem key={meeting.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {meeting.status === 'cancelled' ? (
                      <EventBusyIcon color="error" />
                    ) : (
                      <EventIcon color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.meeting_date).toLocaleDateString('ko-KR')}
                        </Typography>
                        <Chip
                          label={getStatusLabel(meeting.status)}
                          color={getStatusColor(meeting.status)}
                          size="small"
                          sx={{ width: 'fit-content' }}
                        />
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedMeeting(meeting)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {pastMeetings.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="지난 모임이 없습니다"
                    secondary="아직 완료된 모임이 없습니다"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* 모임 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedMeeting ? '정기 모임 수정' : '정기 모임 추가'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="모임 제목"
              fullWidth
              value={editingMeeting.title || ''}
              onChange={(e) => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
              required
            />

            <TextField
              label="설명"
              fullWidth
              multiline
              rows={3}
              value={editingMeeting.description || ''}
              onChange={(e) =>
                setEditingMeeting({ ...editingMeeting, description: e.target.value })
              }
            />

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
              <DatePicker
                label="모임 날짜"
                value={editingMeeting.meeting_date ? new Date(editingMeeting.meeting_date) : null}
                onChange={(date) => {
                  if (date) {
                    setEditingMeeting({ ...editingMeeting, meeting_date: date.toISOString() })
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>

            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="시작 시간"
                  fullWidth
                  value={editingMeeting.start_time || ''}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, start_time: e.target.value })
                  }
                  placeholder="14:00"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="종료 시간"
                  fullWidth
                  value={editingMeeting.end_time || ''}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, end_time: e.target.value })
                  }
                  placeholder="16:00"
                />
              </Grid>
            </Grid>

            <TextField
              label="장소"
              fullWidth
              value={editingMeeting.location || ''}
              onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
            />

            <TextField
              label="온라인 링크"
              fullWidth
              value={editingMeeting.online_link || ''}
              onChange={(e) =>
                setEditingMeeting({ ...editingMeeting, online_link: e.target.value })
              }
              placeholder="https://zoom.us/..."
            />

            <TextField
              label="최대 참가자"
              type="number"
              fullWidth
              value={editingMeeting.max_participants || ''}
              onChange={(e) =>
                setEditingMeeting({
                  ...editingMeeting,
                  max_participants: parseInt(e.target.value),
                })
              }
            />

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
              <DatePicker
                label="등록 마감일"
                value={
                  editingMeeting.registration_deadline
                    ? new Date(editingMeeting.registration_deadline)
                    : null
                }
                onChange={(date) => {
                  if (date) {
                    setEditingMeeting({
                      ...editingMeeting,
                      registration_deadline: date.toISOString(),
                    })
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>

            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={editingMeeting.status || 'scheduled'}
                onChange={(e) =>
                  setEditingMeeting({
                    ...editingMeeting,
                    status: e.target.value as RegularMeeting['status'],
                  })
                }
                label="상태"
              >
                <MenuItem value="scheduled">예정</MenuItem>
                <MenuItem value="ongoing">진행중</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {selectedMeeting ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>모임 삭제</DialogTitle>
        <DialogContent>
          <Typography>"{selectedMeeting?.title}" 모임을 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDelete} color="error" disabled={loading}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
