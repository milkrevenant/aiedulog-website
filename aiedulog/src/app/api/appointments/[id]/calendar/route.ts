import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withUserSecurity } from '@/lib/security/api-wrapper'
import { SecurityContext } from '@/lib/security/core-security'
import { AppointmentWithDetails, ApiResponse } from '@/types/appointment-system'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/appointments/[id]/calendar - Generate and download calendar file (.ics) for appointment
 * Security: User can only access their own appointments or appointments they're instructing
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params
    const supabase = await createClient()

    // Get appointment details
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        instructor:identities!appointments_instructor_id_fkey(
          id,
          full_name,
          email,
          profile_image_url,
          bio
        ),
        user:identities!appointments_user_id_fkey(
          id,
          full_name,
          email
        ),
        appointment_type:appointment_types(*)
      `)
      .eq('id', id)
      .single()

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' } as ApiResponse,
        { status: 404 }
      )
    }

    // Check if user has permission to access this appointment
    const hasAccess = appointment.user_id === context.userId || 
                     appointment.instructor_id === context.userId

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      )
    }

    // Generate ICS content
    const icsContent = generateIcsFile(appointment as AppointmentWithDetails)

    // Return as downloadable file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="appointment-${id}.ics"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error generating calendar file:', error)
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    )
  }
}

/**
 * Generate ICS (iCalendar) file content for appointment
 */
function generateIcsFile(appointment: AppointmentWithDetails): string {
  const now = new Date()
  const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
  const endDateTime = new Date(`${appointment.appointment_date}T${appointment.end_time}`)
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatIcsDateTime = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const startIcs = formatIcsDateTime(startDateTime)
  const endIcs = formatIcsDateTime(endDateTime)
  const createdIcs = formatIcsDateTime(now)
  const uid = `appointment-${appointment.id}@aiedulog.com`

  // Build description
  let description = appointment.description || appointment.title
  if (appointment.notes) {
    description += `\n\n메모: ${appointment.notes}`
  }
  if (appointment.instructor) {
    description += `\n\n강사: ${appointment.instructor.full_name}`
    description += `\n이메일: ${appointment.instructor.email}`
  }
  if (appointment.meeting_location) {
    description += `\n\n장소: ${appointment.meeting_location}`
  }
  if (appointment.meeting_link) {
    description += `\n\n미팅 링크: ${appointment.meeting_link}`
  }

  // Build location
  let location = appointment.meeting_location || ''
  if (appointment.meeting_type === 'online' && appointment.meeting_link) {
    location = appointment.meeting_link
  }

  // Escape special characters for ICS format
  const escapeIcsText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
  }

  // Build ICS content
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIedulog//Appointment System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${createdIcs}`,
    `DTSTART:${startIcs}`,
    `DTEND:${endIcs}`,
    `SUMMARY:${escapeIcsText(appointment.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
  ]

  if (location) {
    icsLines.push(`LOCATION:${escapeIcsText(location)}`)
  }

  // Add organizer (instructor)
  if (appointment.instructor) {
    icsLines.push(`ORGANIZER;CN=${escapeIcsText(appointment.instructor.full_name)}:mailto:${appointment.instructor.email}`)
  }

  // Add attendee (user)
  if (appointment.user) {
    icsLines.push(`ATTENDEE;CN=${escapeIcsText(appointment.user.full_name)}:mailto:${appointment.user.email}`)
  }

  // Add status
  const icsStatus = {
    pending: 'TENTATIVE',
    confirmed: 'CONFIRMED',
    completed: 'CONFIRMED',
    cancelled: 'CANCELLED',
    no_show: 'CANCELLED'
  }[appointment.status] || 'TENTATIVE'
  
  icsLines.push(`STATUS:${icsStatus}`)

  // Add transparency (show as busy/free)
  icsLines.push('TRANSP:OPAQUE') // Show as busy

  // Add reminder (24 hours before)
  icsLines.push('BEGIN:VALARM')
  icsLines.push('ACTION:DISPLAY')
  icsLines.push(`DESCRIPTION:${escapeIcsText('예약 알림: ' + appointment.title)}`)
  icsLines.push('TRIGGER:-P1D') // 1 day before
  icsLines.push('END:VALARM')

  // Add another reminder (1 hour before)
  icsLines.push('BEGIN:VALARM')
  icsLines.push('ACTION:DISPLAY')
  icsLines.push(`DESCRIPTION:${escapeIcsText('예약 알림: ' + appointment.title)}`)
  icsLines.push('TRIGGER:-PT1H') // 1 hour before
  icsLines.push('END:VALARM')

  icsLines.push('END:VEVENT')
  icsLines.push('END:VCALENDAR')

  // Join lines with CRLF (required by ICS standard)
  return icsLines.join('\r\n') + '\r\n'
}

export const GET = withUserSecurity(getHandler)