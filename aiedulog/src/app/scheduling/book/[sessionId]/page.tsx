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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Alert,
  CircularProgress,
  Skeleton,
  IconButton,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  ArrowBack,
  CalendarToday,
  AccessTime,
  LocationOn,
  VideoCall,
  Phone,
  CheckCircle,
  Person,
  Email,
  Notes,
  Schedule,
  Payment
} from '@mui/icons-material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { ko } from 'date-fns/locale/ko'
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns'
import { useRouter, useParams } from 'next/navigation'
import { 
  BookingSession,
  BookingStepType,
  MeetingType,
  UpdateBookingSessionRequest,
  AvailabilityResponse,
  TimeSlot,
  CreateAppointmentRequest
} from '@/types/appointment-system'

const BOOKING_STEPS = [
  { key: BookingStepType.DATE_TIME_SELECTION, label: '날짜/시간 선택', description: '원하는 예약 날짜와 시간을 선택하세요' },
  { key: BookingStepType.USER_DETAILS, label: '정보 입력', description: '예약에 필요한 정보를 입력하세요' },
  { key: BookingStepType.CONFIRMATION, label: '예약 확인', description: '예약 정보를 확인하고 완료하세요' }
]

const MEETING_TYPE_OPTIONS = [
  { 
    value: MeetingType.ONLINE, 
    label: '온라인 수업', 
    icon: VideoCall, 
    description: 'Zoom, Google Meet 등을 통한 화상 수업' 
  },
  { 
    value: MeetingType.OFFLINE, 
    label: '오프라인 수업', 
    icon: LocationOn, 
    description: '직접 만나서 진행하는 대면 수업' 
  },
  { 
    value: MeetingType.HYBRID, 
    label: '하이브리드', 
    icon: Phone, 
    description: '상황에 따라 온라인/오프라인 병행' 
  }
]

function TimeSlotButton({ 
  slot, 
  selected, 
  onSelect 
}: { 
  slot: TimeSlot
  selected: boolean
  onSelect: () => void 
}) {
  return (
    <Button
      variant={selected ? 'contained' : 'outlined'}
      onClick={onSelect}
      disabled={!slot.available}
      sx={{
        minWidth: 120,
        justifyContent: 'center',
        fontWeight: selected ? 'bold' : 'normal'
      }}
    >
      {slot.start_time}
    </Button>
  )
}

function DateTimeSelection({ 
  session, 
  onUpdate, 
  onNext 
}: { 
  session: BookingSession
  onUpdate: (data: any) => void
  onNext: () => void 
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    session.data.appointment_date ? new Date(session.data.appointment_date) : null
  )
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(
    session.data.start_time || null
  )
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [meetingType, setMeetingType] = useState<MeetingType>(
    session.data.meeting_type || MeetingType.ONLINE
  )

  // Load availability when date changes
  useEffect(() => {
    if (selectedDate && session.data.instructor_id) {
      loadAvailability(selectedDate)
    }
  }, [selectedDate, session.data.instructor_id])

  const loadAvailability = async (date: Date) => {
    try {
      setLoadingAvailability(true)
      
      const dateStr = format(date, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        instructor_id: session.data.instructor_id!,
        date: dateStr,
        duration_minutes: session.data.duration_minutes?.toString() || '60',
        appointment_type_id: session.data.appointment_type_id || ''
      })

      const response = await fetch(`/api/appointments/availability?${params}`)
      const { data, error } = await response.json()
      
      if (error) throw new Error(error)
      
      setAvailability(data?.[0] || null)
      
    } catch (err) {
      console.error('Error loading availability:', err)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date)
    setSelectedTimeSlot(null)
    
    if (date) {
      onUpdate({
        appointment_date: format(date, 'yyyy-MM-dd'),
        start_time: null,
        end_time: null
      })
    }
  }

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot.start_time)
    onUpdate({
      start_time: slot.start_time,
      end_time: slot.end_time
    })
  }

  const handleMeetingTypeChange = (_: any, newType: MeetingType) => {
    if (newType) {
      setMeetingType(newType)
      onUpdate({ meeting_type: newType })
    }
  }

  const handleNext = () => {
    if (selectedDate && selectedTimeSlot) {
      onNext()
    }
  }

  const canProceed = selectedDate && selectedTimeSlot && !loadingAvailability

  return (
    <Stack spacing={4}>
      {/* Meeting Type Selection */}
      <Box>
        <Typography variant="h6" gutterBottom>
          수업 방식 선택
        </Typography>
        <ToggleButtonGroup
          value={meetingType}
          exclusive
          onChange={handleMeetingTypeChange}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {MEETING_TYPE_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              value={option.value}
              sx={{ 
                flex: '1 1 300px', 
                flexDirection: 'column',
                alignItems: 'center',
                p: 2,
                textAlign: 'center'
              }}
            >
              <option.icon sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight="bold">
                {option.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {/* Date Selection */}
      <Box>
        <Typography variant="h6" gutterBottom>
          날짜 선택
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
          <DatePicker
            label="예약 날짜"
            value={selectedDate}
            onChange={handleDateChange}
            shouldDisableDate={(date) => {
              const today = new Date()
              const maxDate = addDays(today, 30) // Limit to 30 days ahead
              return isBefore(date, today) || isAfter(date, maxDate)
            }}
            sx={{ width: '100%', maxWidth: 300 }}
          />
        </LocalizationProvider>
      </Box>

      {/* Time Selection */}
      {selectedDate && (
        <Box>
          <Typography variant="h6" gutterBottom>
            시간 선택
          </Typography>
          
          {loadingAvailability ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={120} height={36} />
              ))}
            </Stack>
          ) : availability ? (
            <>
              {availability.slots.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {availability.slots.map((slot, index) => (
                    <TimeSlotButton
                      key={`${slot.start_time}-${index}`}
                      slot={slot}
                      selected={selectedTimeSlot === slot.start_time}
                      onSelect={() => handleTimeSlotSelect(slot)}
                    />
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">
                  선택한 날짜에 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요.
                </Alert>
              )}
              
              {/* Working Hours Info */}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                강사 운영시간: {availability.working_hours.start} - {availability.working_hours.end}
              </Typography>
            </>
          ) : (
            <Alert severity="warning">
              날짜를 선택하면 예약 가능한 시간을 확인할 수 있습니다.
            </Alert>
          )}
        </Box>
      )}

      {/* Selected DateTime Summary */}
      {selectedDate && selectedTimeSlot && (
        <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                선택한 예약 정보
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarToday fontSize="small" />
                <Typography>
                  {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTime fontSize="small" />
                <Typography>
                  {selectedTimeSlot} ({session.data.duration_minutes}분)
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                {meetingType === MeetingType.ONLINE && <VideoCall fontSize="small" />}
                {meetingType === MeetingType.OFFLINE && <LocationOn fontSize="small" />}
                {meetingType === MeetingType.HYBRID && <Phone fontSize="small" />}
                <Typography>
                  {MEETING_TYPE_OPTIONS.find(opt => opt.value === meetingType)?.label}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Next Button */}
      <Box>
        <Button
          variant="contained"
          size="large"
          onClick={handleNext}
          disabled={!canProceed}
          startIcon={<Person />}
        >
          다음: 정보 입력
        </Button>
      </Box>
    </Stack>
  )
}

function UserDetailsForm({ 
  session, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  session: BookingSession
  onUpdate: (data: any) => void
  onNext: () => void
  onBack: () => void 
}) {
  const [formData, setFormData] = useState({
    full_name: session.data.user_details?.full_name || '',
    email: session.data.user_details?.email || '',
    phone: session.data.user_details?.phone || '',
    meeting_location: session.data.meeting_location || '',
    notes: session.data.notes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = '이름을 입력해주세요'
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '연락처를 입력해주세요'
    }

    if (session.data.meeting_type === MeetingType.OFFLINE && !formData.meeting_location.trim()) {
      newErrors.meeting_location = '오프라인 수업 장소를 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onUpdate({
        user_details: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        },
        meeting_location: formData.meeting_location,
        notes: formData.notes
      })
      onNext()
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h6">
        예약자 정보
      </Typography>

      {/* Personal Info */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="이름 *"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            error={!!errors.full_name}
            helperText={errors.full_name}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="이메일 *"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="연락처 *"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone}
            placeholder="010-0000-0000"
          />
        </Grid>
      </Grid>

      {/* Meeting Location for Offline */}
      {session.data.meeting_type === MeetingType.OFFLINE && (
        <TextField
          fullWidth
          label="수업 장소 *"
          value={formData.meeting_location}
          onChange={(e) => handleChange('meeting_location', e.target.value)}
          error={!!errors.meeting_location}
          helperText={errors.meeting_location || '직접 만날 장소를 입력해주세요'}
          placeholder="예: 서울시 강남구 역삼동 카페"
        />
      )}

      {/* Notes */}
      <TextField
        fullWidth
        label="추가 메모 (선택사항)"
        multiline
        rows={3}
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        helperText="강사에게 전달할 메시지나 특별한 요청사항이 있으시면 작성해주세요"
      />

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBack />}
        >
          이전
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          startIcon={<CheckCircle />}
        >
          다음: 예약 확인
        </Button>
      </Stack>
    </Stack>
  )
}

function BookingConfirmation({ 
  session, 
  instructorName, 
  serviceName, 
  onBack, 
  onConfirm,
  loading 
}: { 
  session: BookingSession
  instructorName: string
  serviceName: string
  onBack: () => void
  onConfirm: () => void
  loading: boolean 
}) {
  const meetingTypeLabel = MEETING_TYPE_OPTIONS.find(
    opt => opt.value === session.data.meeting_type
  )?.label || '온라인 수업'

  const MeetingIcon = MEETING_TYPE_OPTIONS.find(
    opt => opt.value === session.data.meeting_type
  )?.icon || VideoCall

  return (
    <Stack spacing={4}>
      <Typography variant="h6">
        예약 정보 확인
      </Typography>

      <Alert severity="info">
        아래 정보를 확인한 후 예약을 완료해주세요. 예약 완료 후 변경이 어려울 수 있습니다.
      </Alert>

      {/* Booking Summary */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                {serviceName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                강사: {instructorName}
              </Typography>
            </Box>

            <Divider />

            {/* Date & Time */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarToday fontSize="small" color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      날짜
                    </Typography>
                    <Typography fontWeight="bold">
                      {session.data.appointment_date && 
                        format(new Date(session.data.appointment_date), 'yyyy년 MM월 dd일 (E)', { locale: ko })
                      }
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTime fontSize="small" color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      시간
                    </Typography>
                    <Typography fontWeight="bold">
                      {session.data.start_time} ({session.data.duration_minutes}분)
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            {/* Meeting Type */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <MeetingIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  수업 방식
                </Typography>
                <Typography fontWeight="bold">
                  {meetingTypeLabel}
                </Typography>
                {session.data.meeting_type === MeetingType.OFFLINE && session.data.meeting_location && (
                  <Typography variant="body2" color="text.secondary">
                    장소: {session.data.meeting_location}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Divider />

            {/* User Details */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                예약자 정보
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Person fontSize="small" color="action" />
                  <Typography>{session.data.user_details?.full_name}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Email fontSize="small" color="action" />
                  <Typography>{session.data.user_details?.email}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Phone fontSize="small" color="action" />
                  <Typography>{session.data.user_details?.phone}</Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Notes */}
            {session.data.notes && (
              <>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    추가 메모
                  </Typography>
                  <Typography variant="body2">
                    {session.data.notes}
                  </Typography>
                </Box>
              </>
            )}

            {/* Price */}
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                수업료
              </Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {session.data.pricing?.total === 0 ? '무료' : `${session.data.pricing?.total?.toLocaleString()}원`}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Alert severity="warning">
        <Typography variant="body2">
          <strong>취소 및 변경 정책:</strong><br />
          - 수업 24시간 전까지 무료 취소 가능<br />
          - 24시간 이내 취소 시 취소 수수료 발생 가능<br />
          - 무단 결석 시 환불 불가
        </Typography>
      </Alert>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={loading}
          startIcon={<ArrowBack />}
        >
          이전
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
        >
          {loading ? '예약 처리 중...' : '예약 완료'}
        </Button>
      </Stack>
    </Stack>
  )
}

function BookingFlowContent() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params?.sessionId as string
  
  // State
  const [session, setSession] = useState<BookingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  
  // Additional data
  const [instructorName, setInstructorName] = useState('')
  const [serviceName, setServiceName] = useState('')

  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSession()
    }
  }, [sessionId])

  const loadSession = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/booking/sessions/${sessionId}`)
      const { data: sessionData, error: apiError } = await response.json()
      
      if (apiError) {
        throw new Error(apiError)
      }

      setSession(sessionData)
      
      // Load additional data
      if (sessionData.data.instructor_id) {
        await loadInstructorInfo(sessionData.data.instructor_id)
      }
      
      if (sessionData.data.appointment_type_id) {
        await loadServiceInfo(sessionData.data.appointment_type_id)
      }
      
      // Set current step based on session state
      const stepIndex = BOOKING_STEPS.findIndex(step => step.key === sessionData.current_step)
      setCurrentStep(stepIndex >= 0 ? stepIndex : 0)
      
    } catch (err) {
      console.error('Error loading session:', err)
      setError(err instanceof Error ? err.message : '예약 세션을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadInstructorInfo = async (instructorId: string) => {
    try {
      const response = await fetch(`/api/appointment-types?instructor_id=${instructorId}`)
      const { data } = await response.json()
      
      if (data && data.length > 0) {
        setInstructorName(data[0].instructor?.full_name || '알 수 없는 강사')
      }
    } catch (err) {
      console.error('Error loading instructor info:', err)
    }
  }

  const loadServiceInfo = async (appointmentTypeId: string) => {
    try {
      const response = await fetch('/api/appointment-types')
      const { data } = await response.json()
      
      const service = data?.find((type: any) => type.id === appointmentTypeId)
      if (service) {
        setServiceName(service.type_name)
      }
    } catch (err) {
      console.error('Error loading service info:', err)
    }
  }

  const updateSession = async (data: any) => {
    if (!session) return

    try {
      const updateRequest: UpdateBookingSessionRequest = {
        step: session.current_step,
        data,
        complete_step: false
      }

      const response = await fetch(`/api/booking/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest)
      })

      const { data: updatedSession, error } = await response.json()
      
      if (error) throw new Error(error)
      
      setSession(updatedSession)
      
    } catch (err) {
      console.error('Error updating session:', err)
    }
  }

  const moveToNextStep = async () => {
    if (!session) return

    const nextStepIndex = currentStep + 1
    const nextStep = BOOKING_STEPS[nextStepIndex]
    
    if (nextStep) {
      try {
        const updateRequest: UpdateBookingSessionRequest = {
          step: nextStep.key,
          data: {},
          complete_step: true
        }

        const response = await fetch(`/api/booking/sessions/${session.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateRequest)
        })

        const { data: updatedSession, error } = await response.json()
        
        if (error) throw new Error(error)
        
        setSession(updatedSession)
        setCurrentStep(nextStepIndex)
        
      } catch (err) {
        console.error('Error moving to next step:', err)
      }
    }
  }

  const moveToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeBooking = async () => {
    if (!session) return

    try {
      setSubmitting(true)

      // Create the appointment
      const appointmentRequest: CreateAppointmentRequest = {
        instructor_id: session.data.instructor_id!,
        appointment_type_id: session.data.appointment_type_id!,
        appointment_date: session.data.appointment_date!,
        start_time: session.data.start_time!,
        meeting_type: session.data.meeting_type!,
        meeting_location: session.data.meeting_location,
        notes: session.data.notes,
        user_details: session.data.user_details
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentRequest)
      })

      const { data: appointment, error } = await response.json()
      
      if (error) throw new Error(error)
      
      // Mark session as completed
      await fetch(`/api/booking/sessions/${session.id}/complete`, {
        method: 'POST'
      })
      
      // Redirect to confirmation page
      router.push(`/scheduling/confirmation/${appointment.id}`)
      
    } catch (err) {
      console.error('Error completing booking:', err)
      setError(err instanceof Error ? err.message : '예약 완료 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push('/scheduling')
  }

  // Loading state
  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Stack spacing={4}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="rounded" width="100%" height={60} />
            <Skeleton variant="rounded" width="100%" height={400} />
          </Stack>
        </Container>
      </Box>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4">예약하기</Typography>
          </Stack>
          
          <Alert severity="error">
            {error || '예약 세션을 찾을 수 없습니다.'}
            <Button 
              variant="text" 
              onClick={() => router.push('/scheduling')}
              sx={{ ml: 2 }}
            >
              다시 시작
            </Button>
          </Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <IconButton onClick={handleBack} size="large">
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              예약하기
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {instructorName && `${instructorName} • `}{serviceName}
            </Typography>
          </Box>
        </Stack>

        {/* Progress Stepper */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stepper activeStep={currentStep} alternativeLabel>
              {BOOKING_STEPS.map((step) => (
                <Step key={step.key}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent sx={{ p: 4 }}>
            {currentStep === 0 && (
              <DateTimeSelection
                session={session}
                onUpdate={updateSession}
                onNext={moveToNextStep}
              />
            )}
            
            {currentStep === 1 && (
              <UserDetailsForm
                session={session}
                onUpdate={updateSession}
                onNext={moveToNextStep}
                onBack={moveToPreviousStep}
              />
            )}
            
            {currentStep === 2 && (
              <BookingConfirmation
                session={session}
                instructorName={instructorName}
                serviceName={serviceName}
                onBack={moveToPreviousStep}
                onConfirm={completeBooking}
                loading={submitting}
              />
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default function BookingFlowPage() {
  return <BookingFlowContent />
}