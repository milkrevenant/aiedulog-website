'use client'

import React, { useState, useEffect, Suspense } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Avatar,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Skeleton,
  GridLegacy as Grid,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Badge,
  Fab,
  Link,
  Select,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  Event,
  Schedule,
  Cancel,
  CheckCircle,
  MoreVert,
  VideoCall,
  LocationOn,
  Phone,
  Download,
  Star,
  StarBorder,
  Edit,
  Delete,
  Refresh,
  FilterList,
  Add,
  EventAvailable,
  AccessTime,
  Person,
  CalendarToday,
  Notifications,
  Email,
  Info
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useAppointments } from '@/hooks/useAppointments'
import {
  AppointmentWithDetails,
  AppointmentStatus,
  MeetingType,
  AppointmentFilters
} from '@/types/appointment-system'
import { format, formatDistance, isPast, isToday, isTomorrow, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

function AppointmentCard({ appointment }: { appointment: AppointmentWithDetails }) {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [rescheduleDialog, setRescheduleDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const { cancelAppointment, downloadCalendar } = useAppointments({ autoLoad: false })

  const isUpcoming = new Date(`${appointment.appointment_date}T${appointment.start_time}`) > new Date()
  const isPastAppointment = isPast(new Date(`${appointment.appointment_date}T${appointment.start_time}`))
  const canCancel = isUpcoming && appointment.status !== 'cancelled'
  const canReschedule = isUpcoming && appointment.status !== 'cancelled'
  const canRate = appointment.status === 'completed' && !appointment.user_rating

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleCancelAppointment = async () => {
    if (!cancelReason.trim()) return
    
    const success = await cancelAppointment(appointment.id, cancelReason)
    if (success) {
      setCancelDialog(false)
      setCancelReason('')
    }
  }

  const handleDownloadCalendar = async () => {
    await downloadCalendar(appointment.id)
    handleMenuClose()
  }

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return 'success'
      case 'pending': return 'warning'
      case 'cancelled': return 'error'
      case 'completed': return 'info'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return '확정'
      case 'pending': return '대기'
      case 'cancelled': return '취소'
      case 'completed': return '완료'
      case 'no_show': return '불참'
      default: return status
    }
  }

  const getMeetingTypeIcon = (type: MeetingType) => {
    switch (type) {
      case 'online': return <VideoCall fontSize="small" />
      case 'offline': return <LocationOn fontSize="small" />
      case 'hybrid': return <Phone fontSize="small" />
      default: return <Event fontSize="small" />
    }
  }

  const getMeetingTypeLabel = (type: MeetingType) => {
    switch (type) {
      case 'online': return '온라인'
      case 'offline': return '오프라인'
      case 'hybrid': return '하이브리드'
      default: return type
    }
  }

  const formatAppointmentDate = (date: string, time: string) => {
    const appointmentDate = new Date(`${date}T${time}`)
    
    if (isToday(appointmentDate)) {
      return `오늘 ${format(appointmentDate, 'HH:mm', { locale: ko })}`
    } else if (isTomorrow(appointmentDate)) {
      return `내일 ${format(appointmentDate, 'HH:mm', { locale: ko })}`
    } else {
      return format(appointmentDate, 'M월 d일 (E) HH:mm', { locale: ko })
    }
  }

  return (
    <>
      <Card 
        sx={{ 
          mb: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4,
          }
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                <Avatar 
                  src={appointment.instructor?.profile_image_url}
                  sx={{ width: 56, height: 56 }}
                >
                  {appointment.instructor?.full_name?.charAt(0)}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {appointment.title}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Person fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {appointment.instructor?.full_name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {formatAppointmentDate(appointment.appointment_date, appointment.start_time)}
                      {' · '}
                      {appointment.duration_minutes}분
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label={getStatusLabel(appointment.status)}
                  color={getStatusColor(appointment.status)}
                  size="small"
                />
                <IconButton onClick={handleMenuOpen}>
                  <MoreVert />
                </IconButton>
              </Stack>
            </Stack>

            {/* Meeting Details */}
            <Stack direction="row" spacing={2} alignItems="center">
              {getMeetingTypeIcon(appointment.meeting_type)}
              <Typography variant="body2">
                {getMeetingTypeLabel(appointment.meeting_type)}
              </Typography>
              
              {appointment.meeting_type === 'online' && appointment.meeting_link && (
                <Link 
                  href={appointment.meeting_link} 
                  target="_blank"
                  sx={{ ml: 'auto', textDecoration: 'none' }}
                >
                  <Button variant="outlined" size="small" startIcon={<VideoCall />}>
                    미팅 참가
                  </Button>
                </Link>
              )}
              
              {appointment.meeting_type === 'offline' && appointment.meeting_location && (
                <Chip
                  icon={<LocationOn />}
                  label={appointment.meeting_location}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {/* Notes */}
            {appointment.notes && (
              <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>메모:</strong> {appointment.notes}
                </Typography>
              </Box>
            )}

            {/* Rating Section for Completed Appointments */}
            {appointment.status === 'completed' && !appointment.user_rating && (
              <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2">수업은 어떠셨나요?</Typography>
                <Stack direction="row" spacing={0.5}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <IconButton
                      key={star}
                      size="small"
                      onClick={() => setRating(star)}
                      sx={{ color: star <= rating ? 'warning.main' : 'grey.300' }}
                    >
                      <Star fontSize="small" />
                    </IconButton>
                  ))}
                </Stack>
                <Button variant="outlined" size="small">
                  후기 남기기
                </Button>
              </Stack>
            )}

            {/* Action Buttons for Upcoming Appointments */}
            {isUpcoming && appointment.status !== 'cancelled' && (
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {canReschedule && (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Edit />}
                    onClick={() => setRescheduleDialog(true)}
                  >
                    일정 변경
                  </Button>
                )}
                {canCancel && (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small" 
                    startIcon={<Cancel />}
                    onClick={() => setCancelDialog(true)}
                  >
                    취소
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDownloadCalendar}>
          <Download sx={{ mr: 1 }} fontSize="small" />
          캘린더 다운로드
        </MenuItem>
        <MenuItem onClick={() => router.push(`/appointments/${appointment.id}`)}>
          <Info sx={{ mr: 1 }} fontSize="small" />
          상세 정보
        </MenuItem>
        {appointment.instructor?.email && (
          <MenuItem onClick={() => window.open(`mailto:${appointment.instructor.email}`)}>
            <Email sx={{ mr: 1 }} fontSize="small" />
            강사에게 연락
          </MenuItem>
        )}
      </Menu>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>예약 취소</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            예약을 취소하는 이유를 알려주세요.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="취소 이유를 입력해주세요..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>
            닫기
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelAppointment}
            disabled={!cancelReason.trim()}
          >
            취소하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onClose={() => setRescheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>일정 변경 요청</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            새로운 일정을 요청하면 강사님께 알림이 전송됩니다.
          </Typography>
          {/* TODO: Add date/time picker components */}
          <Alert severity="info">
            일정 변경 기능은 현재 개발 중입니다. 강사님께 직접 연락해주세요.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleDialog(false)}>
            닫기
          </Button>
          <Button variant="contained" disabled>
            변경 요청
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function AppointmentCardSkeleton() {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={56} height={56} />
            <Box flex={1}>
              <Skeleton variant="text" width="70%" height={28} />
              <Skeleton variant="text" width="50%" height={20} />
              <Skeleton variant="text" width="60%" height={20} />
            </Box>
            <Skeleton variant="rounded" width={60} height={24} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width={120} height={20} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function AppointmentsPageContent() {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState(0)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus[]>([])

  // Tab-specific filters
  const tabFilters: Record<number, Partial<AppointmentFilters>> = {
    0: { status: ['pending', 'confirmed'] }, // Upcoming
    1: { status: ['completed'] }, // Past
    2: { status: ['pending'] }, // Pending
    3: { status: ['cancelled'] }, // Cancelled
    4: {} // All
  }

  const {
    appointments,
    loading,
    error,
    stats,
    refresh,
    setFilters
  } = useAppointments({
    filters: {
      ...tabFilters[currentTab],
      limit: 20,
      sort_by: 'date',
      sort_order: 'desc'
    },
    autoLoad: true,
    realtime: true
  })

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue)
    setFilters(tabFilters[newValue])
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            내 예약
          </Typography>
          <Typography variant="body1" color="text.secondary">
            예약한 수업을 관리하고 일정을 확인하세요
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="새로고침">
            <IconButton onClick={refresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/scheduling')}
          >
            새 예약
          </Button>
        </Stack>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventAvailable sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.confirmed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                확정된 예약
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                대기 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료된 수업
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Event sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 예약
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1 }}
        >
          <Tab 
            icon={<Badge badgeContent={stats.confirmed + stats.pending} color="primary"><EventAvailable /></Badge>} 
            label="다가오는 예약" 
            iconPosition="start"
          />
          <Tab 
            icon={<Badge badgeContent={stats.completed} color="info"><CheckCircle /></Badge>} 
            label="완료된 수업" 
            iconPosition="start"
          />
          <Tab 
            icon={<Badge badgeContent={stats.pending} color="warning"><Schedule /></Badge>} 
            label="대기 중" 
            iconPosition="start"
          />
          <Tab 
            icon={<Badge badgeContent={stats.cancelled} color="error"><Cancel /></Badge>} 
            label="취소된 예약" 
            iconPosition="start"
          />
          <Tab 
            icon={<Event />} 
            label="전체" 
            iconPosition="start"
          />
        </Tabs>
      </Card>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button variant="text" onClick={refresh} sx={{ ml: 2 }}>
            다시 시도
          </Button>
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <Box>
          {Array.from({ length: 3 }).map((_, index) => (
            <AppointmentCardSkeleton key={index} />
          ))}
        </Box>
      ) : (
        <TabPanel value={currentTab} index={currentTab}>
          {appointments.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {currentTab === 0 && '다가오는 예약이 없습니다'}
                  {currentTab === 1 && '완료된 수업이 없습니다'}
                  {currentTab === 2 && '대기 중인 예약이 없습니다'}
                  {currentTab === 3 && '취소된 예약이 없습니다'}
                  {currentTab === 4 && '예약 내역이 없습니다'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  전문가와 함께하는 맞춤형 학습을 시작해보세요
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => router.push('/scheduling')}
                >
                  첫 예약하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
              
              {/* Load More Button */}
              {appointments.length >= 20 && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button variant="outlined" onClick={() => {/* TODO: Load more */}}>
                    더 보기
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </TabPanel>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => router.push('/scheduling')}
      >
        <Add />
      </Fab>
    </Container>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    }>
      <AppointmentsPageContent />
    </Suspense>
  )
}