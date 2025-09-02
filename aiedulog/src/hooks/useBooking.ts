import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  InstructorProfile,
  AppointmentType,
  BookingSession,
  CreateBookingSessionRequest,
  UpdateBookingSessionRequest,
  AvailabilityResponse,
  TimeSlot,
  CreateAppointmentRequest,
  MeetingType,
  BookingStepType,
  ApiResponse
} from '@/types/appointment-system'

export interface BookingState {
  // Data
  instructors: InstructorProfile[]
  appointmentTypes: AppointmentType[]
  availability: AvailabilityResponse | null
  bookingSession: BookingSession | null
  
  // Loading states
  loadingInstructors: boolean
  loadingAppointmentTypes: boolean
  loadingAvailability: boolean
  loadingSession: boolean
  
  // Error states
  error: string | null
  
  // Form data
  selectedInstructor: InstructorProfile | null
  selectedAppointmentType: AppointmentType | null
  selectedDate: Date | null
  selectedTimeSlot: TimeSlot | null
  meetingType: MeetingType
  userDetails: {
    full_name: string
    email: string
    phone: string
  }
  meetingLocation: string
  notes: string
}

export function useBooking() {
  const router = useRouter()
  
  const [state, setState] = useState<BookingState>({
    instructors: [],
    appointmentTypes: [],
    availability: null,
    bookingSession: null,
    loadingInstructors: false,
    loadingAppointmentTypes: false,
    loadingAvailability: false,
    loadingSession: false,
    error: null,
    selectedInstructor: null,
    selectedAppointmentType: null,
    selectedDate: null,
    selectedTimeSlot: null,
    meetingType: MeetingType.ONLINE,
    userDetails: {
      full_name: '',
      email: '',
      phone: ''
    },
    meetingLocation: '',
    notes: ''
  })

  // Load instructors
  const loadInstructors = async () => {
    setState(prev => ({ ...prev, loadingInstructors: true, error: null }))
    
    try {
      const response = await fetch('/api/appointment-types')
      const { data: appointmentTypes, error: apiError }: ApiResponse<AppointmentType[]> = await response.json()
      
      if (apiError) throw new Error(apiError)
      
      // Group appointment types by instructor
      const instructorMap = new Map<string, InstructorProfile>()
      
      appointmentTypes?.forEach((type: any) => {
        if (!type.instructor || !type.is_active) return
        
        const instructorId = type.instructor.id
        
        if (!instructorMap.has(instructorId)) {
          instructorMap.set(instructorId, {
            id: instructorId,
            full_name: type.instructor.full_name,
            email: type.instructor.email,
            profile_image_url: type.instructor.profile_image_url,
            bio: type.instructor.bio,
            specializations: [],
            rating: Math.random() * 2 + 3, // Mock rating
            total_appointments: Math.floor(Math.random() * 100) + 10,
            appointment_types: []
          })
        }
        
        const instructor = instructorMap.get(instructorId)!
        instructor.appointment_types!.push(type)
      })

      // Convert map to array and add specializations
      const instructorList = Array.from(instructorMap.values()).map(instructor => ({
        ...instructor,
        specializations: instructor.appointment_types
          ?.map(type => type.type_name)
          .filter((value, index, self) => self.indexOf(value) === index)
          .slice(0, 4) || []
      }))

      setState(prev => ({ 
        ...prev, 
        instructors: instructorList,
        appointmentTypes: appointmentTypes || [],
        loadingInstructors: false 
      }))
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '강사 정보를 불러오는 데 실패했습니다.',
        loadingInstructors: false 
      }))
    }
  }

  // Load appointment types for specific instructor
  const loadAppointmentTypes = async (instructorId: string) => {
    setState(prev => ({ ...prev, loadingAppointmentTypes: true, error: null }))
    
    try {
      const response = await fetch(`/api/appointment-types?instructor_id=${instructorId}`)
      const { data, error: apiError }: ApiResponse<AppointmentType[]> = await response.json()
      
      if (apiError) throw new Error(apiError)
      
      const activeTypes = data?.filter(type => type.is_active) || []
      
      setState(prev => ({ 
        ...prev, 
        appointmentTypes: activeTypes,
        loadingAppointmentTypes: false 
      }))
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '서비스 정보를 불러오는 데 실패했습니다.',
        loadingAppointmentTypes: false 
      }))
    }
  }

  // Load availability for specific instructor and date
  const loadAvailability = async (instructorId: string, date: Date, durationMinutes?: number, appointmentTypeId?: string) => {
    setState(prev => ({ ...prev, loadingAvailability: true, error: null }))
    
    try {
      const dateStr = date.toISOString().split('T')[0]
      const params = new URLSearchParams({
        instructor_id: instructorId,
        date: dateStr
      })
      
      if (durationMinutes) params.append('duration_minutes', durationMinutes.toString())
      if (appointmentTypeId) params.append('appointment_type_id', appointmentTypeId)

      const response = await fetch(`/api/appointments/availability?${params}`)
      const { data, error: apiError }: ApiResponse<AvailabilityResponse[]> = await response.json()
      
      if (apiError) throw new Error(apiError)
      
      setState(prev => ({ 
        ...prev, 
        availability: data?.[0] || null,
        loadingAvailability: false 
      }))
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '예약 가능 시간을 불러오는 데 실패했습니다.',
        loadingAvailability: false 
      }))
    }
  }

  // Create booking session
  const createBookingSession = async (
    instructorId?: string, 
    appointmentTypeId?: string,
    initialStep?: BookingStepType
  ) => {
    setState(prev => ({ ...prev, loadingSession: true, error: null }))
    
    try {
      const sessionRequest: CreateBookingSessionRequest = {
        initial_step: initialStep || BookingStepType.INSTRUCTOR_SELECTION,
        instructor_id: instructorId,
        appointment_type_id: appointmentTypeId
      }

      const response = await fetch('/api/booking/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionRequest)
      })

      const { data: session, error: sessionError }: ApiResponse<BookingSession> = await response.json()
      
      if (sessionError) throw new Error(sessionError)
      
      setState(prev => ({ 
        ...prev, 
        bookingSession: session || null,
        loadingSession: false 
      }))
      
      return session
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '예약 세션을 생성하는 데 실패했습니다.',
        loadingSession: false 
      }))
      return null
    }
  }

  // Load existing booking session
  const loadBookingSession = async (sessionId: string, sessionToken?: string) => {
    setState(prev => ({ ...prev, loadingSession: true, error: null }))
    
    try {
      const params = new URLSearchParams()
      if (sessionToken) params.append('session_token', sessionToken)

      const response = await fetch(`/api/booking/sessions/${sessionId}?${params}`)
      const { data: session, error: sessionError }: ApiResponse<BookingSession> = await response.json()
      
      if (sessionError) throw new Error(sessionError)
      
      setState(prev => ({ 
        ...prev, 
        bookingSession: session || null,
        loadingSession: false 
      }))
      
      return session
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '예약 세션을 불러오는 데 실패했습니다.',
        loadingSession: false 
      }))
      return null
    }
  }

  // Update booking session
  const updateBookingSession = async (sessionId: string, updateData: Partial<any>, completeStep = false, sessionToken?: string) => {
    try {
      const updateRequest: UpdateBookingSessionRequest = {
        step: state.bookingSession?.current_step || BookingStepType.INSTRUCTOR_SELECTION,
        data: updateData,
        complete_step: completeStep
      }

      const params = new URLSearchParams()
      if (sessionToken) params.append('session_token', sessionToken)

      const response = await fetch(`/api/booking/sessions/${sessionId}?${params}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest)
      })

      const { data: updatedSession, error }: ApiResponse<BookingSession> = await response.json()
      
      if (error) throw new Error(error)
      
      setState(prev => ({ ...prev, bookingSession: updatedSession ?? null }))
      
      return updatedSession
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '예약 정보 업데이트에 실패했습니다.'
      }))
      return null
    }
  }

  // Complete booking
  const completeBooking = async (sessionId: string, sessionToken?: string) => {
    setState(prev => ({ ...prev, loadingSession: true, error: null }))
    
    try {
      const params = new URLSearchParams()
      if (sessionToken) params.append('session_token', sessionToken)

      const response = await fetch(`/api/booking/sessions/${sessionId}/complete?${params}`, {
        method: 'POST'
      })

      const { data: appointment, error }: ApiResponse = await response.json()
      
      if (error) throw new Error(error)
      
      setState(prev => ({ ...prev, loadingSession: false }))
      
      return appointment
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '예약 완료 중 오류가 발생했습니다.',
        loadingSession: false 
      }))
      return null
    }
  }

  // Update state setters
  const setSelectedInstructor = (instructor: InstructorProfile | null) => {
    setState(prev => ({ ...prev, selectedInstructor: instructor }))
  }

  const setSelectedAppointmentType = (appointmentType: AppointmentType | null) => {
    setState(prev => ({ ...prev, selectedAppointmentType: appointmentType }))
  }

  const setSelectedDate = (date: Date | null) => {
    setState(prev => ({ ...prev, selectedDate: date, selectedTimeSlot: null }))
  }

  const setSelectedTimeSlot = (timeSlot: TimeSlot | null) => {
    setState(prev => ({ ...prev, selectedTimeSlot: timeSlot }))
  }

  const setMeetingType = (meetingType: MeetingType) => {
    setState(prev => ({ ...prev, meetingType }))
  }

  const setUserDetails = (userDetails: Partial<typeof state.userDetails>) => {
    setState(prev => ({ 
      ...prev, 
      userDetails: { ...prev.userDetails, ...userDetails } 
    }))
  }

  const setMeetingLocation = (location: string) => {
    setState(prev => ({ ...prev, meetingLocation: location }))
  }

  const setNotes = (notes: string) => {
    setState(prev => ({ ...prev, notes }))
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  // Navigate to booking flow
  const navigateToBooking = (instructorId: string, appointmentTypeId?: string) => {
    if (appointmentTypeId) {
      router.push(`/scheduling/instructor/${instructorId}`)
    } else {
      router.push('/scheduling')
    }
  }

  // Navigate to booking session
  const navigateToBookingSession = (sessionId: string) => {
    router.push(`/scheduling/book/${sessionId}`)
  }

  // Navigate to confirmation
  const navigateToConfirmation = (appointmentId: string) => {
    router.push(`/scheduling/confirmation/${appointmentId}`)
  }

  return {
    // State
    ...state,
    
    // Actions
    loadInstructors,
    loadAppointmentTypes,
    loadAvailability,
    createBookingSession,
    loadBookingSession,
    updateBookingSession,
    completeBooking,
    
    // Setters
    setSelectedInstructor,
    setSelectedAppointmentType,
    setSelectedDate,
    setSelectedTimeSlot,
    setMeetingType,
    setUserDetails,
    setMeetingLocation,
    setNotes,
    clearError,
    
    // Navigation
    navigateToBooking,
    navigateToBookingSession,
    navigateToConfirmation
  }
}

export default useBooking