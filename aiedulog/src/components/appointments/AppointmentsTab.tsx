'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  Fab,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Pagination,
  Snackbar,
  CircularProgress,
  Avatar,
  Divider,
  useTheme,
  alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Search,
  FilterList,
  CalendarToday,
  VideoCall,
  LocationOn,
  Phone,
  Cancel,
  Schedule,
  GetApp,
  Add,
  Event,
  AccessTime,
  PersonOutline,
  NotesOutlined,
  CheckCircleOutline,
  PendingActions,
  ErrorOutline,
  MoreVert,
  FileDownload,
  Email,
  Close,
  Refresh
} from '@mui/icons-material'
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '@/lib/auth/hooks'
import { useNotifications } from '@/hooks/useNotifications'
import {
  AppointmentWithDetails,
  AppointmentStatus,
  MeetingType,
  AppointmentFilters,
  PaginatedResponse,
  ApiResponse
} from '@/types/appointment-system'

// Appointment status configurations
const statusConfig = {
  pending: {
    label: '대기 중',
    color: 'warning' as const,
    icon: <PendingActions fontSize="small" />,
    description: '확인 대기 중'
  },
  confirmed: {
    label: '확인됨',
    color: 'success' as const,
    icon: <CheckCircleOutline fontSize="small" />,
    description: '예약 확정'
  },
  completed: {
    label: '완료',
    color: 'info' as const,
    icon: <CheckCircleOutline fontSize="small" />,
    description: '상담 완료'
  },
  cancelled: {
    label: '취소됨',
    color: 'error' as const,
    icon: <ErrorOutline fontSize="small" />,
    description: '예약 취소'
  },
  no_show: {
    label: '미참석',
    color: 'default' as const,
    icon: <ErrorOutline fontSize="small" />,
    description: '불참'
  }
}

// Meeting type configurations
const meetingTypeConfig = {
  online: {
    label: '온라인',
    icon: <VideoCall fontSize="small" />,
    color: 'primary'
  },
  offline: {
    label: '오프라인',
    icon: <LocationOn fontSize="small" />,
    color: 'secondary'
  },
  hybrid: {
    label: '하이브리드',
    icon: <Phone fontSize="small" />,
    color: 'info'
  }
}

interface AppointmentsTabProps {
  onNewAppointment?: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointments-tabpanel-${index}`}
      aria-labelledby={`appointments-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

interface AppointmentDetailsDialogProps {
  appointment: AppointmentWithDetails | null
  open: boolean
  onClose: () => void
  onCancel: (id: string, reason: string) => void
  onReschedule: (id: string, newDate: string, newTime: string) => void
  onDownloadIcs: (id: string) => void
}

function AppointmentDetailsDialog({
  appointment,
  open,
  onClose,
  onCancel,
  onReschedule,
  onDownloadIcs
}: AppointmentDetailsDialogProps) {
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const theme = useTheme()

  if (!appointment) return null

  const status = statusConfig[appointment.status as keyof typeof statusConfig]
  const meetingType = meetingTypeConfig[appointment.meeting_type as keyof typeof meetingTypeConfig]
  const canCancel = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status as AppointmentStatus)
  const canReschedule = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status as AppointmentStatus)

  const handleCancel = () => {
    if (cancelReason.trim()) {
      onCancel(appointment.id, cancelReason)
      setShowCancelDialog(false)
      setCancelReason('')
      onClose()
    }
  }

  const handleReschedule = () => {
    if (rescheduleDate && rescheduleTime) {
      onReschedule(appointment.id, rescheduleDate, rescheduleTime)
      setShowRescheduleDialog(false)
      setRescheduleDate('')
      setRescheduleTime('')
      onClose()
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              예약 상세 정보
            </Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* Status and Meeting Type */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={status.label}
                color={status.color}
                icon={status.icon}
                size="medium"
              />
              <Chip
                label={meetingType.label}
                variant="outlined"
                icon={meetingType.icon}
                size="medium"
              />
            </Stack>

            {/* Basic Info */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {appointment.title}
                </Typography>
                <Grid container spacing={2}>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarToday fontSize="small" color="action" />
                      <Typography variant="body2">
                        {format(parseISO(appointment.appointment_date), 'yyyy년 M월 d일')}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2">
                        {appointment.start_time} - {appointment.end_time}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({appointment.duration_minutes}분)
                        </Typography>
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Instructor Info */}
            {appointment.instructor && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    강사 정보
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={appointment.instructor.profile_image_url}
                      sx={{ width: 48, height: 48 }}
                    >
                      <PersonOutline />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {appointment.instructor.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appointment.instructor.email}
                      </Typography>
                    </Box>
                  </Stack>
                  {appointment.instructor.bio && (
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      {appointment.instructor.bio}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Meeting Details */}
            {(appointment.meeting_location || appointment.meeting_link) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    미팅 정보
                  </Typography>
                  {appointment.meeting_location && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {appointment.meeting_location}
                      </Typography>
                    </Stack>
                  )}
                  {appointment.meeting_link && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <VideoCall fontSize="small" color="action" />
                      <Typography
                        variant="body2"
                        component="a"
                        href={appointment.meeting_link}
                        target="_blank"
                        sx={{ color: 'primary.main', textDecoration: 'none' }}
                      >
                        미팅 참가하기
                      </Typography>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(appointment.notes || appointment.description) && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    메모
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {appointment.notes || appointment.description}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Cancellation Reason */}
            {appointment.status === 'cancelled' && appointment.cancellation_reason && (
              <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    취소 사유
                  </Typography>
                  <Typography variant="body2">
                    {appointment.cancellation_reason}
                  </Typography>
                  {appointment.cancelled_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      취소일: {format(parseISO(appointment.cancelled_at), 'yyyy년 M월 d일 HH:mm')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            startIcon={<FileDownload />}
            onClick={() => onDownloadIcs(appointment.id)}
          >
            캘린더 파일 다운로드
          </Button>
          
          {canReschedule && (
            <Button
              startIcon={<Schedule />}
              onClick={() => setShowRescheduleDialog(true)}
              color="info"
            >
              일정 변경
            </Button>
          )}
          
          {canCancel && (
            <Button
              startIcon={<Cancel />}
              onClick={() => setShowCancelDialog(true)}
              color="error"
            >
              예약 취소
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* Cancel Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>예약 취소</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            예약을 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="취소 사유"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소하는 이유를 입력해주세요"
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            닫기
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            disabled={!cancelReason.trim()}
          >
            취소하기
          </Button>
        </DialogActions>
      </Dialog>
      {/* Reschedule Dialog */}
      <Dialog
        open={showRescheduleDialog}
        onClose={() => setShowRescheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>일정 변경 요청</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            새로운 날짜와 시간을 선택해주세요.
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="새 날짜"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: format(new Date(), 'yyyy-MM-dd')
              }}
            />
            <TextField
              fullWidth
              type="time"
              label="새 시간"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <Alert severity="info" sx={{ mt: 2 }}>
            일정 변경은 강사의 승인이 필요합니다. 승인 결과는 알림으로 전송됩니다.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRescheduleDialog(false)}>
            닫기
          </Button>
          <Button
            onClick={handleReschedule}
            color="primary"
            disabled={!rescheduleDate || !rescheduleTime}
          >
            변경 요청
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function AppointmentsTab({ onNewAppointment }: AppointmentsTabProps) {
  const { user } = useAuth()
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(0)
  
  // State
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<MeetingType | 'all'>('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  })

  // Load appointments
  const loadAppointments = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const filters: AppointmentFilters = {
        limit: 10,
        offset: (pageNum - 1) * 10,
        sort_by: 'date',
        sort_order: 'desc'
      }

      if (statusFilter !== 'all') {
        filters.status = [statusFilter as AppointmentStatus]
      }

      if (meetingTypeFilter !== 'all') {
        filters.meeting_type = meetingTypeFilter as MeetingType
      }

      if (dateFromFilter) {
        filters.date_from = dateFromFilter
      }

      if (dateToFilter) {
        filters.date_to = dateToFilter
      }

      // Filter by current tab
      const now = new Date()
      if (activeTab === 0) { // Upcoming
        filters.date_from = format(now, 'yyyy-MM-dd')
        filters.status = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
      } else if (activeTab === 2) { // History
        filters.date_to = format(now, 'yyyy-MM-dd')
      }

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/appointments?${params}`)
      const data: PaginatedResponse<AppointmentWithDetails> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load appointments')
      }

      if (append) {
        setAppointments(prev => [...prev, ...(data.data || [])])
      } else {
        setAppointments(data.data || [])
      }

      setTotalPages(data.meta.total_pages)
      
      // Calculate stats
      const total = data.meta.total
      const statusCounts = (data.data || []).reduce((acc, apt) => {
        acc[apt.status as keyof typeof acc] = (acc[apt.status as keyof typeof acc] || 0) + 1
        return acc
      }, { pending: 0, confirmed: 0, completed: 0, cancelled: 0 })
      
      setStats({ total, ...statusCounts })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments'
      setError(errorMessage)
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, meetingTypeFilter, dateFromFilter, dateToFilter, activeTab])

  // Handle appointment actions
  const handleCancelAppointment = async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: reason
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel appointment')
      }

      // Refresh appointments
      await loadAppointments(page)
      setSnackbar({ open: true, message: '예약이 취소되었습니다.', severity: 'success' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel appointment'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    }
  }

  const handleRescheduleAppointment = async (id: string, newDate: string, newTime: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_date: newDate,
          new_time: newTime,
          reason: '사용자 요청에 의한 일정 변경'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to request reschedule')
      }

      setSnackbar({ open: true, message: '일정 변경 요청이 전송되었습니다.', severity: 'success' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request reschedule'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    }
  }

  const handleDownloadIcs = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}/calendar`)
      
      if (!response.ok) {
        throw new Error('Failed to generate calendar file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appointment-${id}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSnackbar({ open: true, message: '캘린더 파일이 다운로드되었습니다.', severity: 'success' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download calendar file'
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    }
  }

  // Effects
  useEffect(() => {
    loadAppointments(1)
  }, [loadAppointments])

  useEffect(() => {
    if (page > 1) {
      loadAppointments(page)
    }
  }, [page])

  // Filter appointments based on search term
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      appointment.title?.toLowerCase().includes(searchLower) ||
      appointment.instructor?.full_name?.toLowerCase().includes(searchLower) ||
      appointment.description?.toLowerCase().includes(searchLower) ||
      appointment.notes?.toLowerCase().includes(searchLower)
    )
  })

  // Render appointment card
  const renderAppointmentCard = (appointment: AppointmentWithDetails) => {
    const status = statusConfig[appointment.status as keyof typeof statusConfig]
    const meetingType = meetingTypeConfig[appointment.meeting_type as keyof typeof meetingTypeConfig]
    const isPast = isBefore(parseISO(appointment.appointment_date), startOfDay(new Date()))
    const isToday = format(parseISO(appointment.appointment_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    return (
      <Card
        key={appointment.id}
        sx={{
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: isToday ? `2px solid ${theme.palette.primary.main}` : '1px solid',
          borderColor: isToday ? 'primary.main' : 'divider',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4]
          }
        }}
        onClick={() => {
          setSelectedAppointment(appointment)
          setDetailsOpen(true)
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box flex={1}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Chip
                  label={status.label}
                  color={status.color}
                  icon={status.icon}
                  size="small"
                />
                <Chip
                  label={meetingType.label}
                  variant="outlined"
                  icon={meetingType.icon}
                  size="small"
                />
                {isToday && (
                  <Chip
                    label="오늘"
                    color="primary"
                    size="small"
                    variant="filled"
                  />
                )}
              </Stack>
              
              <Typography variant="h6" fontWeight="medium" gutterBottom>
                {appointment.title}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {format(parseISO(appointment.appointment_date), 'M월 d일 (E)', { locale: ko })}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {appointment.start_time} - {appointment.end_time}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
              
              {appointment.instructor && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    src={appointment.instructor.profile_image_url}
                    sx={{ width: 24, height: 24 }}
                  >
                    <PersonOutline fontSize="small" />
                  </Avatar>
                  <Typography variant="body2" color="text.secondary">
                    {appointment.instructor.full_name}
                  </Typography>
                </Stack>
              )}
              
              {appointment.notes && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {appointment.notes}
                </Typography>
              )}
            </Box>
            
            <IconButton size="small" onClick={(e) => e.stopPropagation()}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          예약 관리
        </Typography>
        {onNewAppointment && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onNewAppointment}
            size="large"
          >
            새 예약
          </Button>
        )}
      </Stack>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 2.4
          }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 예약
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 2.4
          }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                대기 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 2.4
          }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.confirmed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                확인됨
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 2.4
          }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 2.4
          }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {stats.cancelled}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                취소됨
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FilterList color="action" />
              <Typography variant="h6">필터</Typography>
            </Stack>
            
            <Grid container spacing={2}>
              <Grid
                size={{
                  xs: 12,
                  md: 3
                }}>
                <TextField
                  fullWidth
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  size="small"
                />
              </Grid>
              
              <Grid
                size={{
                  xs: 12,
                  md: 2
                }}>
                <FormControl fullWidth size="small">
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={statusFilter}
                    label="상태"
                    onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid
                size={{
                  xs: 12,
                  md: 2
                }}>
                <FormControl fullWidth size="small">
                  <InputLabel>미팅 유형</InputLabel>
                  <Select
                    value={meetingTypeFilter}
                    label="미팅 유형"
                    onChange={(e) => setMeetingTypeFilter(e.target.value as MeetingType | 'all')}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {Object.entries(meetingTypeConfig).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid
                size={{
                  xs: 12,
                  md: 2
                }}>
                <TextField
                  fullWidth
                  type="date"
                  label="시작일"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              
              <Grid
                size={{
                  xs: 12,
                  md: 2
                }}>
                <TextField
                  fullWidth
                  type="date"
                  label="종료일"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              
              <Grid
                size={{
                  xs: 12,
                  md: 1
                }}>
                <Button
                  variant="outlined"
                  onClick={() => loadAppointments(1)}
                  startIcon={<Refresh />}
                  size="small"
                  sx={{ height: '40px' }}
                >
                  새로고침
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue)
            setPage(1)
          }}
          variant="fullWidth"
        >
          <Tab label="예정된 예약" icon={<Event />} />
          <Tab label="모든 예약" icon={<CalendarToday />} />
          <Tab label="예약 기록" icon={<AccessTime />} />
        </Tabs>
      </Paper>
      {/* Content */}
      <TabPanel value={activeTab} index={0}>
        {/* Upcoming Appointments */}
        {loading && page === 1 ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={180} />
            ))}
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">오류 발생</Typography>
            <Typography variant="body2">{error}</Typography>
            <Button
              size="small"
              onClick={() => loadAppointments(1)}
              sx={{ mt: 1 }}
            >
              다시 시도
            </Button>
          </Alert>
        ) : filteredAppointments.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                예정된 예약이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                새로운 예약을 만들어보세요.
              </Typography>
              {onNewAppointment && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onNewAppointment}
                  sx={{ mt: 2 }}
                >
                  새 예약
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredAppointments.map(renderAppointmentCard)}
            {totalPages > 1 && (
              <Stack alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  size="large"
                />
              </Stack>
            )}
          </>
        )}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {/* All Appointments */}
        {loading && page === 1 ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={180} />
            ))}
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">오류 발생</Typography>
            <Typography variant="body2">{error}</Typography>
            <Button
              size="small"
              onClick={() => loadAppointments(1)}
              sx={{ mt: 1 }}
            >
              다시 시도
            </Button>
          </Alert>
        ) : filteredAppointments.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <CalendarToday sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                예약이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                첫 번째 예약을 만들어보세요.
              </Typography>
              {onNewAppointment && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onNewAppointment}
                  sx={{ mt: 2 }}
                >
                  새 예약
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredAppointments.map(renderAppointmentCard)}
            {totalPages > 1 && (
              <Stack alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  size="large"
                />
              </Stack>
            )}
          </>
        )}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {/* History */}
        {loading && page === 1 ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={180} />
            ))}
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">오류 발생</Typography>
            <Typography variant="body2">{error}</Typography>
            <Button
              size="small"
              onClick={() => loadAppointments(1)}
              sx={{ mt: 1 }}
            >
              다시 시도
            </Button>
          </Alert>
        ) : filteredAppointments.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <AccessTime sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                예약 기록이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료된 예약이 여기에 표시됩니다.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredAppointments.map(renderAppointmentCard)}
            {totalPages > 1 && (
              <Stack alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  size="large"
                />
              </Stack>
            )}
          </>
        )}
      </TabPanel>
      {/* Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedAppointment(null)
        }}
        onCancel={handleCancelAppointment}
        onReschedule={handleRescheduleAppointment}
        onDownloadIcs={handleDownloadIcs}
      />
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Floating Action Button for new appointment */}
      {onNewAppointment && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000
          }}
          onClick={onNewAppointment}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
}