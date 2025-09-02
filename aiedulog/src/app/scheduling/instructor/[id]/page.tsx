'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Avatar,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'
import {
  ArrowBack,
  Star,
  AccessTime,
  LocationOn,
  VideoCall,
  Phone,
  CheckCircle,
  CalendarToday,
  Person,
  Email,
  Schedule
} from '@mui/icons-material'
import { useRouter, useParams } from 'next/navigation'
import { 
  InstructorProfile, 
  AppointmentType,
  BookingSession,
  CreateBookingSessionRequest,
  BookingStepType
} from '@/types/appointment-system'

interface InstructorPageProps {
  instructor: InstructorProfile | null
  loading?: boolean
  error?: string
}

const BOOKING_STEPS = [
  { key: BookingStepType.SERVICE_SELECTION, label: '서비스 선택' },
  { key: BookingStepType.DATE_TIME_SELECTION, label: '날짜 시간' },
  { key: BookingStepType.USER_DETAILS, label: '정보 입력' },
  { key: BookingStepType.CONFIRMATION, label: '예약 확인' }
]

function ServiceCard({ 
  appointmentType, 
  onSelect,
  disabled = false 
}: { 
  appointmentType: AppointmentType
  onSelect: () => void
  disabled?: boolean 
}) {
  return (
    <Card 
      sx={{ 
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        '&:hover': disabled ? {} : {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => `0 4px 12px ${theme.palette.primary.main}20`,
        }
      }}
      onClick={disabled ? undefined : onSelect}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          {/* Service Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {appointmentType.type_name}
              </Typography>
              {appointmentType.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {appointmentType.description}
                </Typography>
              )}
            </Box>
            <Chip
              label={appointmentType.price === 0 ? '무료' : `${appointmentType.price.toLocaleString()}원`}
              color={appointmentType.price === 0 ? 'success' : 'primary'}
              sx={{ fontWeight: 'bold', minWidth: 80 }}
            />
          </Stack>

          {/* Service Details */}
          <Stack direction="row" spacing={3}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AccessTime fontSize="small" color="action" />
              <Typography variant="body2">
                {appointmentType.duration_minutes}분
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Schedule fontSize="small" color="action" />
              <Typography variant="body2">
                최대 {appointmentType.booking_advance_days}일 전 예약
              </Typography>
            </Stack>
          </Stack>

          {/* Meeting Types */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              icon={<VideoCall />}
              label="온라인"
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<LocationOn />}
              label="오프라인"
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Phone />}
              label="하이브리드"
              size="small"
              variant="outlined"
            />
          </Stack>

          {/* Cancellation Policy */}
          <Typography variant="caption" color="text.secondary">
            취소 정책: {appointmentType.cancellation_hours}시간 전까지 무료 취소 가능
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

function InstructorPageContent() {
  const router = useRouter()
  const params = useParams()
  const instructorId = params?.id as string
  
  // State
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<AppointmentType | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Load instructor data
  useEffect(() => {
    if (instructorId) {
      loadInstructor()
    }
  }, [instructorId])

  const loadInstructor = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load appointment types for this instructor
      const response = await fetch(`/api/appointment-types?instructor_id=${instructorId}`)
      const { data: appointmentTypes, error: apiError } = await response.json()
      
      if (apiError) {
        throw new Error(apiError)
      }

      if (!appointmentTypes || appointmentTypes.length === 0) {
        throw new Error('강사를 찾을 수 없습니다')
      }

      // Build instructor profile from first appointment type's instructor data
      const firstType = appointmentTypes[0]
      const instructorData: InstructorProfile = {
        id: instructorId,
        full_name: firstType.instructor?.full_name || '알 수 없는 강사',
        email: firstType.instructor?.email || '',
        profile_image_url: firstType.instructor?.profile_image_url,
        bio: firstType.instructor?.bio || '경험 많은 전문 강사입니다.',
        specializations: appointmentTypes
          .map((type: AppointmentType) => type.type_name)
          .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index),
        rating: Math.random() * 2 + 3, // Mock rating 3-5
        total_appointments: Math.floor(Math.random() * 200) + 50, // Mock total appointments
        appointment_types: appointmentTypes.filter((type: AppointmentType) => type.is_active)
      }

      setInstructor(instructorData)
      
    } catch (err) {
      console.error('Error loading instructor:', err)
      setError(err instanceof Error ? err.message : '강사 정보를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (appointmentType: AppointmentType) => {
    setSelectedService(appointmentType)
    setBookingDialogOpen(true)
  }

  const handleStartBooking = async () => {
    if (!selectedService || !instructor) return

    try {
      setBookingLoading(true)

      // Create booking session
      const sessionRequest: CreateBookingSessionRequest = {
        initial_step: BookingStepType.DATE_TIME_SELECTION,
        instructor_id: instructor.id,
        appointment_type_id: selectedService.id
      }

      const response = await fetch('/api/booking/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionRequest)
      })

      const { data: session, error: sessionError } = await response.json()
      
      if (sessionError) {
        throw new Error(sessionError)
      }

      // Navigate to booking flow
      router.push(`/scheduling/book/${session.id}`)
      
    } catch (err) {
      console.error('Error starting booking:', err)
      setError(err instanceof Error ? err.message : '예약을 시작할 수 없습니다.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/scheduling')
  }

  // Loading state
  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <Skeleton variant="text" width={200} height={40} />
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Skeleton variant="circular" width={80} height={80} />
                      <Box flex={1}>
                        <Skeleton variant="text" width="80%" height={32} />
                        <Skeleton variant="text" width="60%" height={24} />
                      </Box>
                    </Stack>
                    <Skeleton variant="text" width="100%" height={60} />
                    <Stack direction="row" spacing={1}>
                      <Skeleton variant="rounded" width={60} height={24} />
                      <Skeleton variant="rounded" width={50} height={24} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" width="100%" height={120} />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4">강사 프로필</Typography>
          </Stack>
          
          <Alert severity="error">
            {error}
            <Button 
              variant="text" 
              onClick={loadInstructor}
              sx={{ ml: 2 }}
            >
              다시 시도
            </Button>
          </Alert>
        </Container>
      </Box>
    )
  }

  if (!instructor) {
    return null
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <IconButton onClick={handleBack} size="large">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            강사 프로필
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          {/* Instructor Profile */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 24 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {/* Basic Info */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={instructor.profile_image_url}
                      sx={{ width: 80, height: 80 }}
                    >
                      {instructor.full_name.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {instructor.full_name}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Rating 
                          value={instructor.rating || 0} 
                          readOnly 
                          size="small" 
                          precision={0.1}
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({instructor.total_appointments}개 리뷰)
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        전문 강사
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  {/* Bio */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      소개
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {instructor.bio}
                    </Typography>
                  </Box>

                  <Divider />

                  {/* Specializations */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      전문 분야
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {instructor.specializations?.map((spec, index) => (
                        <Chip 
                          key={index}
                          label={spec}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Stats */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {instructor.total_appointments}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          총 수업
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {instructor.rating?.toFixed(1)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          평점
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider />

                  {/* Contact */}
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {instructor.email}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Services */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Services Header */}
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  제공 서비스
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  원하는 서비스를 선택하여 예약을 시작하세요
                </Typography>
              </Box>

              {/* Services List */}
              <Stack spacing={2}>
                {instructor.appointment_types?.map((appointmentType) => (
                  <ServiceCard
                    key={appointmentType.id}
                    appointmentType={appointmentType}
                    onSelect={() => handleServiceSelect(appointmentType)}
                  />
                ))}
              </Stack>

              {/* No services available */}
              {(!instructor.appointment_types || instructor.appointment_types.length === 0) && (
                <Alert severity="info">
                  현재 예약 가능한 서비스가 없습니다.
                </Alert>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Service Selection Dialog */}
      <Dialog 
        open={bookingDialogOpen} 
        onClose={() => !bookingLoading && setBookingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">예약 시작</Typography>
            <Stepper activeStep={0} sx={{ flex: 1, ml: 2 }}>
              {BOOKING_STEPS.slice(0, 2).map((step) => (
                <Step key={step.key}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          {selectedService && (
            <Stack spacing={3}>
              <Alert severity="info">
                다음 서비스로 예약을 진행하시겠습니까?
              </Alert>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      {selectedService.type_name}
                    </Typography>
                    {selectedService.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedService.description}
                      </Typography>
                    )}
                    <Stack direction="row" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccessTime fontSize="small" />
                        <Typography variant="body2">
                          {selectedService.duration_minutes}분
                        </Typography>
                      </Stack>
                      <Typography variant="h6" color="primary">
                        {selectedService.price === 0 ? '무료' : `${selectedService.price.toLocaleString()}원`}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Typography variant="body2" color="text.secondary">
                다음 단계에서 원하는 날짜와 시간을 선택할 수 있습니다.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setBookingDialogOpen(false)}
            disabled={bookingLoading}
          >
            취소
          </Button>
          <Button 
            variant="contained"
            onClick={handleStartBooking}
            disabled={bookingLoading}
            startIcon={bookingLoading ? <CircularProgress size={16} /> : <CalendarToday />}
          >
            {bookingLoading ? '처리 중...' : '예약 시작'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function InstructorPage() {
  return <InstructorPageContent />
}