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
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  
  Paper,
  IconButton,
  Divider,
  Rating,
  Breadcrumbs,
  Link,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  ArrowBack,
  Event,
  Schedule,
  Person,
  Star,
  VideoCall,
  LocationOn,
  Phone,
  AccessTime,
  CalendarToday,
  NavigateBefore,
  NavigateNext,
  Check,
  Info,
  Warning
} from '@mui/icons-material'
import { useRouter, useParams } from 'next/navigation'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isBefore,
  addWeeks,
  subWeeks,
  startOfDay
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { 
  InstructorProfile, 
  AppointmentType, 
  TimeSlot, 
  MeetingType,
  CreateAppointmentRequest 
} from '@/types/appointment-system'
import { useAppointments } from '@/hooks/useAppointments'

const steps = ['강사 선택', '서비스 선택', '날짜 & 시간', '정보 입력', '예약 확인']

interface BookingState {
  instructor?: InstructorProfile
  appointmentType?: AppointmentType
  selectedDate?: Date
  selectedTime?: string
  meetingType: MeetingType
  meetingLocation?: string
  notes?: string
  userDetails: {
    name: string
    email: string
    phone: string
  }
}

function TimeSlotGrid({ 
  slots, 
  selectedTime, 
  onTimeSelect 
}: { 
  slots: TimeSlot[]
  selectedTime?: string
  onTimeSelect: (time: string) => void 
}) {
  const availableSlots = slots.filter(slot => slot.available)
  
  if (availableSlots.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          선택한 날짜에 예약 가능한 시간이 없습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          다른 날짜를 선택해주세요
        </Typography>
      </Paper>
    )
  }

  return (
    <Grid container spacing={2}>
      {availableSlots.map((slot) => (
        <Grid
          key={slot.start_time}
          size={{
            xs: 6,
            sm: 4,
            md: 3
          }}>
          <Button
            variant={selectedTime === slot.start_time ? "contained" : "outlined"}
            fullWidth
            onClick={() => onTimeSelect(slot.start_time)}
            sx={{ 
              py: 1.5,
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            {slot.start_time}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}

function WeekCalendar({
  currentWeek,
  selectedDate,
  availabilityData,
  onDateSelect,
  onWeekChange
}: {
  currentWeek: Date
  selectedDate?: Date
  availabilityData: Record<string, TimeSlot[]>
  onDateSelect: (date: Date) => void
  onWeekChange: (direction: 'prev' | 'next') => void
}) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {format(weekStart, 'M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => onWeekChange('prev')}>
              <NavigateBefore />
            </IconButton>
            <IconButton onClick={() => onWeekChange('next')}>
              <NavigateNext />
            </IconButton>
          </Stack>
        </Stack>
        
        <Grid container spacing={1}>
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const daySlots = availabilityData[dateKey] || []
            const availableCount = daySlots.filter(slot => slot.available).length
            const isDisabled = isBefore(day, startOfDay(new Date())) || availableCount === 0
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            
            return (
              <Grid key={dateKey} size="grow">
                <Button
                  variant={isSelected ? "contained" : "outlined"}
                  fullWidth
                  disabled={isDisabled}
                  onClick={() => onDateSelect(day)}
                  sx={{
                    flexDirection: 'column',
                    py: 2,
                    opacity: isDisabled ? 0.3 : 1,
                    bgcolor: isToday(day) && !isSelected ? 'info.light' : 'inherit'
                  }}
                >
                  <Typography variant="caption" sx={{ mb: 0.5 }}>
                    {format(day, 'E', { locale: ko })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {format(day, 'd')}
                  </Typography>
                  {availableCount > 0 && (
                    <Typography variant="caption" color="success.main">
                      {availableCount}개 가능
                    </Typography>
                  )}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default function InstructorBookingPage() {
  const router = useRouter()
  const params = useParams()
  const instructorId = params.instructorId as string
  const { createAppointment } = useAppointments({ autoLoad: false })

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  
  const [bookingState, setBookingState] = useState<BookingState>({
    meetingType: MeetingType.ONLINE,
    userDetails: {
      name: '',
      email: '',
      phone: ''
    }
  })

  // Mock data - replace with API calls
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null)
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [availabilityData, setAvailabilityData] = useState<Record<string, TimeSlot[]>>({})

  useEffect(() => {
    loadInstructorData()
  }, [instructorId])

  useEffect(() => {
    if (bookingState.selectedDate) {
      loadAvailability(bookingState.selectedDate)
    }
  }, [bookingState.selectedDate])

  const loadInstructorData = async () => {
    try {
      setLoading(true)
      
      // Mock instructor data
      const mockInstructor: InstructorProfile = {
        id: instructorId,
        full_name: '박준형',
        email: 'park@example.com',
        bio: 'AI와 머신러닝 분야에서 5년 경력을 가진 전문가입니다. 실무 경험과 체계적인 교육을 통해 학생들의 성장을 돕고 있습니다.',
        profile_image_url: '',
        specializations: ['AI', '머신러닝', '파이썬', '데이터 사이언스'],
        rating: 4.8,
        total_appointments: 127,
        appointment_types: []
      }

      // Mock appointment types
      const mockAppointmentTypes: AppointmentType[] = [
        {
          id: '1',
          instructor_id: instructorId,
          type_name: 'AI 기초 상담',
          description: 'AI 분야 진로와 학습 방향에 대한 상담',
          duration_minutes: 60,
          price: 50000,
          is_active: true,
          booking_advance_days: 30,
          cancellation_hours: 24,
          color_hex: '#2E86AB',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          instructor_id: instructorId,
          type_name: '머신러닝 멘토링',
          description: '실무 머신러닝 프로젝트 멘토링 및 코드 리뷰',
          duration_minutes: 90,
          price: 80000,
          is_active: true,
          booking_advance_days: 30,
          cancellation_hours: 24,
          color_hex: '#A23B72',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          instructor_id: instructorId,
          type_name: '파이썬 프로그래밍',
          description: '파이썬 기초부터 실무 활용까지',
          duration_minutes: 60,
          price: 45000,
          is_active: true,
          booking_advance_days: 30,
          cancellation_hours: 24,
          color_hex: '#E6800F',
          created_at: new Date().toISOString()
        }
      ]

      setInstructor(mockInstructor)
      setAppointmentTypes(mockAppointmentTypes)
      setBookingState(prev => ({ ...prev, instructor: mockInstructor }))
      
    } catch (error) {
      console.error('Error loading instructor data:', error)
      setError('강사 정보를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailability = async (date: Date) => {
    try {
      const dateKey = format(date, 'yyyy-MM-dd')
      
      // Mock availability data
      const mockSlots: TimeSlot[] = [
        { start_time: '09:00', end_time: '10:00', available: true, buffer_before: 15, buffer_after: 15 },
        { start_time: '10:30', end_time: '11:30', available: true, buffer_before: 15, buffer_after: 15 },
        { start_time: '14:00', end_time: '15:00', available: false, buffer_before: 15, buffer_after: 15 },
        { start_time: '15:30', end_time: '16:30', available: true, buffer_before: 15, buffer_after: 15 },
        { start_time: '17:00', end_time: '18:00', available: true, buffer_before: 15, buffer_after: 15 }
      ]
      
      setAvailabilityData(prev => ({ ...prev, [dateKey]: mockSlots }))
      
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }

  const loadWeekAvailability = async (weekStart: Date) => {
    try {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
      
      const weekAvailability: Record<string, TimeSlot[]> = {}
      
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayOfWeek = day.getDay()
        
        // Mock different availability based on day of week
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend - limited availability
          weekAvailability[dateKey] = [
            { start_time: '10:00', end_time: '11:00', available: true, buffer_before: 15, buffer_after: 15 },
            { start_time: '14:00', end_time: '15:00', available: true, buffer_before: 15, buffer_after: 15 }
          ]
        } else {
          // Weekday - more availability
          weekAvailability[dateKey] = [
            { start_time: '09:00', end_time: '10:00', available: Math.random() > 0.3, buffer_before: 15, buffer_after: 15 },
            { start_time: '10:30', end_time: '11:30', available: Math.random() > 0.3, buffer_before: 15, buffer_after: 15 },
            { start_time: '14:00', end_time: '15:00', available: Math.random() > 0.3, buffer_before: 15, buffer_after: 15 },
            { start_time: '15:30', end_time: '16:30', available: Math.random() > 0.3, buffer_before: 15, buffer_after: 15 },
            { start_time: '17:00', end_time: '18:00', available: Math.random() > 0.3, buffer_before: 15, buffer_after: 15 }
          ]
        }
      })
      
      setAvailabilityData(prev => ({ ...prev, ...weekAvailability }))
      
    } catch (error) {
      console.error('Error loading week availability:', error)
    }
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
      setError(null)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Instructor selection - already selected
        return true
      case 1: // Service selection
        if (!bookingState.appointmentType) {
          setError('서비스를 선택해주세요.')
          return false
        }
        return true
      case 2: // Date & time selection
        if (!bookingState.selectedDate || !bookingState.selectedTime) {
          setError('날짜와 시간을 선택해주세요.')
          return false
        }
        return true
      case 3: // User details
        const { name, email, phone } = bookingState.userDetails
        if (!name || !email || !phone) {
          setError('모든 필수 정보를 입력해주세요.')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    try {
      setLoading(true)
      setError(null)

      const appointmentRequest: CreateAppointmentRequest = {
        instructor_id: instructorId,
        appointment_type_id: bookingState.appointmentType!.id,
        appointment_date: format(bookingState.selectedDate!, 'yyyy-MM-dd'),
        start_time: bookingState.selectedTime!,
        meeting_type: bookingState.meetingType,
        meeting_location: bookingState.meetingLocation,
        notes: bookingState.notes,
        user_details: bookingState.userDetails
      }

      const appointment = await createAppointment(appointmentRequest)
      
      if (appointment) {
        router.push(`/scheduling/confirmation/${appointment.id}`)
      } else {
        setError('예약 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      
    } catch (error) {
      console.error('Error creating appointment:', error)
      setError('예약 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'next' 
      ? addWeeks(currentWeek, 1) 
      : subWeeks(currentWeek, 1)
    
    setCurrentWeek(newWeek)
    loadWeekAvailability(startOfWeek(newWeek, { weekStartsOn: 1 }))
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                선택된 강사
              </Typography>
              {instructor && (
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar sx={{ width: 100, height: 100 }}>
                    {instructor.full_name.charAt(0)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {instructor.full_name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Rating value={instructor.rating} readOnly size="small" precision={0.1} />
                      <Typography variant="body2" color="text.secondary">
                        {instructor.rating} ({instructor.total_appointments}개 리뷰)
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {instructor.bio}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {instructor.specializations?.map((spec, index) => (
                        <Chip key={index} label={spec} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        )
      
      case 1:
        return (
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                서비스 선택
              </Typography>
              <Grid container spacing={3}>
                {appointmentTypes.map((type) => (
                  <Grid
                    key={type.id}
                    size={{
                      xs: 12,
                      md: 6
                    }}>
                    <Card 
                      variant={bookingState.appointmentType?.id === type.id ? "outlined" : "elevation"}
                      sx={{ 
                        cursor: 'pointer',
                        border: bookingState.appointmentType?.id === type.id ? 2 : 1,
                        borderColor: bookingState.appointmentType?.id === type.id ? 'primary.main' : 'divider',
                        transition: 'all 0.3s ease',
                        '&:hover': { boxShadow: 4 }
                      }}
                      onClick={() => setBookingState(prev => ({ ...prev, appointmentType: type }))}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography variant="h6" fontWeight="bold">
                            {type.type_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {type.description}
                          </Typography>
                          <Stack direction="row" justifyContent="between" alignItems="center">
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Chip 
                                icon={<AccessTime />}
                                label={`${type.duration_minutes}분`}
                                size="small"
                                color="info"
                              />
                            </Stack>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                              {type.price === 0 ? '무료' : `${type.price.toLocaleString()}원`}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              날짜 & 시간 선택
            </Typography>
            
            <WeekCalendar
              currentWeek={currentWeek}
              selectedDate={bookingState.selectedDate}
              availabilityData={availabilityData}
              onDateSelect={(date) => {
                setBookingState(prev => ({ ...prev, selectedDate: date, selectedTime: undefined }))
              }}
              onWeekChange={handleWeekChange}
            />

            {bookingState.selectedDate && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {format(bookingState.selectedDate, 'M월 d일 (E)', { locale: ko })} 예약 가능 시간
                  </Typography>
                  <TimeSlotGrid
                    slots={availabilityData[format(bookingState.selectedDate, 'yyyy-MM-dd')] || []}
                    selectedTime={bookingState.selectedTime}
                    onTimeSelect={(time) => setBookingState(prev => ({ ...prev, selectedTime: time }))}
                  />
                </CardContent>
              </Card>
            )}
          </Box>
        )
      
      case 3:
        return (
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                예약자 정보
              </Typography>
              
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    fullWidth
                    label="이름"
                    required
                    value={bookingState.userDetails.name}
                    onChange={(e) => setBookingState(prev => ({
                      ...prev,
                      userDetails: { ...prev.userDetails, name: e.target.value }
                    }))}
                  />
                </Grid>
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    fullWidth
                    label="이메일"
                    type="email"
                    required
                    value={bookingState.userDetails.email}
                    onChange={(e) => setBookingState(prev => ({
                      ...prev,
                      userDetails: { ...prev.userDetails, email: e.target.value }
                    }))}
                  />
                </Grid>
                
                <Grid
                  size={{
                    xs: 12,
                    sm: 6
                  }}>
                  <TextField
                    fullWidth
                    label="연락처"
                    required
                    value={bookingState.userDetails.phone}
                    onChange={(e) => setBookingState(prev => ({
                      ...prev,
                      userDetails: { ...prev.userDetails, phone: e.target.value }
                    }))}
                  />
                </Grid>
                
                <Grid size={12}>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      수업 방식
                    </Typography>
                    <RadioGroup
                      value={bookingState.meetingType}
                      onChange={(e) => setBookingState(prev => ({ 
                        ...prev, 
                        meetingType: e.target.value as MeetingType 
                      }))}
                    >
                      <FormControlLabel
                        value={MeetingType.ONLINE}
                        control={<Radio />}
                        label={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <VideoCall />
                            <Box>
                              <Typography variant="body2" fontWeight="500">온라인</Typography>
                              <Typography variant="caption" color="text.secondary">
                                화상 통화로 진행
                              </Typography>
                            </Box>
                          </Stack>
                        }
                      />
                      <FormControlLabel
                        value={MeetingType.OFFLINE}
                        control={<Radio />}
                        label={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LocationOn />
                            <Box>
                              <Typography variant="body2" fontWeight="500">오프라인</Typography>
                              <Typography variant="caption" color="text.secondary">
                                대면 수업
                              </Typography>
                            </Box>
                          </Stack>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {bookingState.meetingType === MeetingType.OFFLINE && (
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="만날 장소"
                      placeholder="구체적인 주소나 장소를 입력해주세요"
                      value={bookingState.meetingLocation || ''}
                      onChange={(e) => setBookingState(prev => ({ 
                        ...prev, 
                        meetingLocation: e.target.value 
                      }))}
                    />
                  </Grid>
                )}
                
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="메모 (선택사항)"
                    multiline
                    rows={3}
                    placeholder="강사에게 전달하고 싶은 내용이 있다면 입력해주세요"
                    value={bookingState.notes || ''}
                    onChange={(e) => setBookingState(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      
      case 4:
        return (
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                예약 확인
              </Typography>
              
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    강사 정보
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {instructor?.full_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="500">
                        {instructor?.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {instructor?.email}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    예약 상세
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">서비스</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.appointmentType?.type_name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">날짜</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.selectedDate && format(bookingState.selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">시간</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.selectedTime} ({bookingState.appointmentType?.duration_minutes}분)
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">수업 방식</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.meetingType === MeetingType.ONLINE ? '온라인' : '오프라인'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">가격</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {bookingState.appointmentType?.price === 0 ? '무료' : `${bookingState.appointmentType?.price.toLocaleString()}원`}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    예약자 정보
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">이름</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.userDetails.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">이메일</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.userDetails.email}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="between">
                      <Typography variant="body2">연락처</Typography>
                      <Typography variant="body2" fontWeight="500">
                        {bookingState.userDetails.phone}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                {bookingState.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        메모
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bookingState.notes}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        )
      
      default:
        return null
    }
  }

  if (loading && !instructor) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error && !instructor) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
          <Button variant="text" onClick={() => router.back()} sx={{ ml: 2 }}>
            뒤로 가기
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/scheduling" sx={{ textDecoration: 'none' }}>
            강사 목록
          </Link>
          <Typography color="text.primary">{instructor?.full_name}</Typography>
          <Typography color="text.primary">예약하기</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              예약하기
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {instructor?.full_name}님과의 수업 예약
            </Typography>
          </Box>
        </Stack>

        {/* Stepper */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stepper activeStep={currentStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        <Box sx={{ mb: 4 }}>
          {renderStepContent()}
        </Box>

        {/* Navigation Buttons */}
        <Stack direction="row" justifyContent="space-between">
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            이전
          </Button>
          
          <Button
            variant="contained"
            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : currentStep === steps.length - 1 ? <Check /> : undefined}
          >
            {loading ? '처리 중...' : currentStep === steps.length - 1 ? '예약 완료' : '다음'}
          </Button>
        </Stack>
      </Container>
    </LocalizationProvider>
  )
}