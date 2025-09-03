'use client'

import React, { useState, useEffect } from 'react'
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
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  CheckCircle,
  CalendarToday,
  AccessTime,
  LocationOn,
  VideoCall,
  Phone,
  Person,
  Email,
  Notes,
  Download,
  Share,
  ArrowBack,
  Dashboard,
  Event,
  Notifications
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { useRouter, useParams } from 'next/navigation'
import { AppointmentWithDetails, MeetingType, AppointmentStatus } from '@/types/appointment-system'

function ConfirmationPageContent() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params?.appointmentId as string
  
  // State
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingCalendar, setDownloadingCalendar] = useState(false)

  // Load appointment data
  useEffect(() => {
    if (appointmentId) {
      loadAppointment()
    }
  }, [appointmentId])

  const loadAppointment = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/appointments/${appointmentId}`)
      const { data, error: apiError } = await response.json()
      
      if (apiError) {
        throw new Error(apiError)
      }

      setAppointment(data)
      
    } catch (err) {
      console.error('Error loading appointment:', err)
      setError(err instanceof Error ? err.message : '예약 정보를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCalendar = async () => {
    if (!appointment) return

    try {
      setDownloadingCalendar(true)

      const response = await fetch(`/api/appointments/${appointment.id}/calendar`)
      
      if (!response.ok) {
        throw new Error('캘린더 파일 생성에 실패했습니다')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `appointment-${appointment.id}.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Error downloading calendar:', err)
    } finally {
      setDownloadingCalendar(false)
    }
  }

  const handleShare = async () => {
    if (!appointment) return

    const shareData = {
      title: '예약 완료',
      text: `${appointment.instructor?.full_name} 강사와의 ${appointment.title} 예약이 완료되었습니다.`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('링크가 클립보드에 복사되었습니다')
      } catch (err) {
        console.error('Error copying to clipboard:', err)
      }
    }
  }

  const getMeetingTypeInfo = (meetingType: MeetingType) => {
    switch (meetingType) {
      case MeetingType.ONLINE:
        return { icon: VideoCall, label: '온라인 수업', color: 'info' as const }
      case MeetingType.OFFLINE:
        return { icon: LocationOn, label: '오프라인 수업', color: 'success' as const }
      case MeetingType.HYBRID:
        return { icon: Phone, label: '하이브리드', color: 'warning' as const }
      default:
        return { icon: VideoCall, label: '온라인 수업', color: 'info' as const }
    }
  }

  const getStatusInfo = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return { color: 'success' as const, label: '확인됨' }
      case AppointmentStatus.PENDING:
        return { color: 'warning' as const, label: '대기 중' }
      case AppointmentStatus.COMPLETED:
        return { color: 'info' as const, label: '완료됨' }
      case AppointmentStatus.CANCELLED:
        return { color: 'error' as const, label: '취소됨' }
      default:
        return { color: 'warning' as const, label: '대기 중' }
    }
  }

  // Loading state
  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Stack alignItems="center" spacing={4}>
            <CircularProgress size={60} />
            <Typography variant="h6">예약 정보를 확인하는 중...</Typography>
          </Stack>
        </Container>
      </Box>
    )
  }

  // Error state
  if (error || !appointment) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            {error || '예약 정보를 찾을 수 없습니다.'}
          </Alert>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => router.push('/scheduling')}
            >
              새 예약하기
            </Button>
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard')}
            >
              대시보드로 가기
            </Button>
          </Stack>
        </Container>
      </Box>
    )
  }

  const meetingInfo = getMeetingTypeInfo(appointment.meeting_type)
  const statusInfo = getStatusInfo(appointment.status)
  const MeetingIcon = meetingInfo.icon

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Success Header */}
      <Box 
        sx={{ 
          bgcolor: 'success.main',
          color: 'white',
          py: 6,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center">
            <CheckCircle sx={{ fontSize: 80, opacity: 0.9 }} />
            <Typography variant="h3" fontWeight="bold">
              예약 완료!
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              예약이 성공적으로 완료되었습니다
            </Typography>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Appointment Details */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={4}>
              {/* Header with Status */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {appointment.title}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={appointment.instructor?.profile_image_url}>
                      {appointment.instructor?.full_name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {appointment.instructor?.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        전문 강사
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                
                <Chip
                  label={statusInfo.label}
                  color={statusInfo.color}
                  sx={{ fontWeight: 'bold' }}
                />
              </Stack>

              <Divider />

              {/* Key Details */}
              <Grid container spacing={3}>
                {/* Date */}
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <CalendarToday color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        날짜
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {format(new Date(appointment.appointment_date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Time */}
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <AccessTime color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        시간
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {appointment.start_time} - {appointment.end_time}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({appointment.duration_minutes}분)
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Meeting Type */}
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <MeetingIcon color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        수업 방식
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {meetingInfo.label}
                      </Typography>
                      {appointment.meeting_location && (
                        <Typography variant="body2" color="text.secondary">
                          {appointment.meeting_location}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Grid>

                {/* Appointment ID */}
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Event color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        예약 번호
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        #{appointment.id.slice(-8).toUpperCase()}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              {/* Additional Notes */}
              {appointment.notes && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      추가 메모
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {appointment.notes}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Contact Info */}
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  강사 연락처
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">
                      {appointment.instructor?.email}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              다음 단계
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Notifications color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="확인 이메일 받기"
                  secondary="예약 확인 및 상세 정보가 이메일로 발송됩니다"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CalendarToday color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="캘린더에 일정 추가"
                  secondary="아래 버튼을 클릭하여 캘린더 앱에 일정을 추가하세요"
                />
              </ListItem>
              
              {appointment.meeting_type === MeetingType.ONLINE && (
                <ListItem>
                  <ListItemIcon>
                    <VideoCall color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="온라인 수업 준비"
                    secondary="수업 시간 전에 화상회의 링크가 이메일로 발송됩니다"
                  />
                </ListItem>
              )}
              
              <ListItem>
                <ListItemIcon>
                  <Person color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="강사와 연락"
                  secondary="궁금한 사항이 있으면 강사에게 직접 연락하실 수 있습니다"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Stack spacing={2}>
          {/* Primary Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={downloadingCalendar ? <CircularProgress size={16} /> : <Download />}
              onClick={handleDownloadCalendar}
              disabled={downloadingCalendar}
              sx={{ flex: 1 }}
            >
              {downloadingCalendar ? '생성 중...' : '캘린더에 추가'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<Share />}
              onClick={handleShare}
              sx={{ flex: 1 }}
            >
              공유하기
            </Button>
          </Stack>

          {/* Navigation Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Dashboard />}
              onClick={() => router.push('/dashboard')}
              sx={{ flex: 1 }}
            >
              대시보드로 가기
            </Button>
            
            <Button
              variant="text"
              size="large"
              onClick={() => router.push('/scheduling')}
              sx={{ flex: 1 }}
            >
              새 예약하기
            </Button>
          </Stack>
        </Stack>

        {/* Important Notice */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            중요 안내사항
          </Typography>
          <Typography variant="body2">
            • 예약 변경이나 취소는 수업 24시간 전까지 가능합니다<br />
            • 예약 관련 문의사항이 있으시면 대시보드의 예약 관리에서 확인하세요<br />
            • 수업 전날 리마인더 알림을 발송해드립니다
          </Typography>
        </Alert>
      </Container>
    </Box>
  );
}

export default function ConfirmationPage() {
  return <ConfirmationPageContent />
}