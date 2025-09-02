/**
 * Validation utilities for the booking system
 */

export interface ValidationError {
  field: string
  message: string
}

export interface BookingValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Validate user details for booking
 */
export function validateUserDetails(userDetails: {
  full_name?: string
  email?: string
  phone?: string
}): BookingValidationResult {
  const errors: ValidationError[] = []

  // Validate full name
  if (!userDetails.full_name || userDetails.full_name.trim().length < 2) {
    errors.push({
      field: 'full_name',
      message: '이름은 2글자 이상 입력해주세요'
    })
  }

  // Validate email
  if (!userDetails.email || userDetails.email.trim().length === 0) {
    errors.push({
      field: 'email',
      message: '이메일을 입력해주세요'
    })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userDetails.email)) {
    errors.push({
      field: 'email',
      message: '올바른 이메일 형식을 입력해주세요'
    })
  }

  // Validate phone
  if (!userDetails.phone || userDetails.phone.trim().length === 0) {
    errors.push({
      field: 'phone',
      message: '연락처를 입력해주세요'
    })
  } else if (!/^[0-9\-\+\(\)\s]+$/.test(userDetails.phone)) {
    errors.push({
      field: 'phone',
      message: '올바른 연락처 형식을 입력해주세요'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate booking session completeness
 */
export function validateBookingSession(sessionData: any): BookingValidationResult {
  const errors: ValidationError[] = []

  // Required fields
  const requiredFields = [
    { key: 'instructor_id', name: '강사' },
    { key: 'appointment_type_id', name: '서비스 유형' },
    { key: 'appointment_date', name: '예약 날짜' },
    { key: 'start_time', name: '시작 시간' },
    { key: 'end_time', name: '종료 시간' },
    { key: 'meeting_type', name: '수업 방식' },
    { key: 'duration_minutes', name: '수업 시간' }
  ]

  requiredFields.forEach(field => {
    if (!sessionData[field.key]) {
      errors.push({
        field: field.key,
        message: `${field.name}을(를) 선택해주세요`
      })
    }
  })

  // Validate user details if present
  if (sessionData.user_details) {
    const userValidation = validateUserDetails(sessionData.user_details)
    errors.push(...userValidation.errors)
  }

  // Validate meeting location for offline meetings
  if (sessionData.meeting_type === 'offline' && !sessionData.meeting_location) {
    errors.push({
      field: 'meeting_location',
      message: '오프라인 수업 장소를 입력해주세요'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate time slot selection
 */
export function validateTimeSlot(
  selectedDate: Date | null,
  selectedTimeSlot: string | null,
  availableSlots: any[] = []
): BookingValidationResult {
  const errors: ValidationError[] = []

  if (!selectedDate) {
    errors.push({
      field: 'date',
      message: '예약 날짜를 선택해주세요'
    })
  }

  if (!selectedTimeSlot) {
    errors.push({
      field: 'time',
      message: '예약 시간을 선택해주세요'
    })
  }

  // Validate that selected time is still available
  if (selectedTimeSlot && availableSlots.length > 0) {
    const slot = availableSlots.find(s => s.start_time === selectedTimeSlot)
    if (!slot || !slot.available) {
      errors.push({
        field: 'time',
        message: '선택한 시간이 더 이상 예약 가능하지 않습니다'
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0].message
  
  return `다음 항목을 확인해주세요:\n${errors.map(e => `• ${e.message}`).join('\n')}`
}

/**
 * Check if booking is within allowed time limits
 */
export function validateBookingTimeConstraints(
  bookingDate: Date,
  appointmentType: any
): BookingValidationResult {
  const errors: ValidationError[] = []
  const now = new Date()
  const timeDiff = bookingDate.getTime() - now.getTime()
  const daysDiff = timeDiff / (1000 * 3600 * 24)

  // Check minimum advance booking time (usually 1 hour)
  if (timeDiff < 3600000) { // 1 hour in milliseconds
    errors.push({
      field: 'date',
      message: '예약은 최소 1시간 전에 해주세요'
    })
  }

  // Check maximum advance booking time
  if (appointmentType?.booking_advance_days && daysDiff > appointmentType.booking_advance_days) {
    errors.push({
      field: 'date',
      message: `예약은 최대 ${appointmentType.booking_advance_days}일 전까지 가능합니다`
    })
  }

  // Check if booking is in the past
  if (bookingDate < now) {
    errors.push({
      field: 'date',
      message: '과거 날짜는 예약할 수 없습니다'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate phone number format (supports various formats)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters except + at the start
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Korean phone number patterns
  const koreanPatterns = [
    /^01[016789]\d{7,8}$/, // Mobile
    /^02\d{7,8}$/, // Seoul landline
    /^0[3-6][1-5]\d{6,7}$/, // Regional landline
    /^070\d{8}$/, // Internet phone
    /^\+8201[016789]\d{7,8}$/, // International mobile
    /^\+8202\d{7,8}$/ // International landline
  ]
  
  return koreanPatterns.some(pattern => pattern.test(cleaned))
}

/**
 * Generate booking reference number
 */
export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return `BK${timestamp}${randomPart}`.toUpperCase()
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'KRW'): string {
  if (price === 0) return '무료'
  
  if (currency === 'KRW') {
    return `${price.toLocaleString('ko-KR')}원`
  }
  
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency
  }).format(price)
}

/**
 * Check if two time periods overlap
 */
export function timePeriodsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [h1, m1] = start1.split(':').map(Number)
  const [h2, m2] = end1.split(':').map(Number)
  const [h3, m3] = start2.split(':').map(Number)
  const [h4, m4] = end2.split(':').map(Number)
  
  const minutes1Start = h1 * 60 + m1
  const minutes1End = h2 * 60 + m2
  const minutes2Start = h3 * 60 + m3
  const minutes2End = h4 * 60 + m4
  
  return minutes1Start < minutes2End && minutes2Start < minutes1End
}