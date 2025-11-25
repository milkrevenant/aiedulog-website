import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlot,
  ApiResponse
} from '@/types/appointment-system';

/**
 * GET /api/appointments/availability - Get real-time availability for booking
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Security: Public access with rate limiting
 * 
 * Query Parameters:
 * - instructor_id: string (optional) - Specific instructor, or all if omitted
 * - date: string (required) - ISO date (YYYY-MM-DD)
 * - duration_minutes: number (optional) - Appointment duration
 * - appointment_type_id: string (optional) - Filter by appointment type
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const rds = createRDSClient();

    // Parse and validate query parameters
    const instructorId = searchParams.get('instructor_id');
    const date = searchParams.get('date');
    const durationMinutes = parseInt(searchParams.get('duration_minutes') || '60');
    const appointmentTypeId = searchParams.get('appointment_type_id');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate date format
    const requestDate = new Date(date);
    if (isNaN(requestDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' } as ApiResponse,
        { status: 400 }
      );
    }

    // Prevent booking in the past
    const now = new Date();
    const today = new Date(now.toDateString());
    if (requestDate < today) {
      return NextResponse.json(
        { error: 'Cannot check availability for past dates' } as ApiResponse,
        { status: 400 }
      );
    }

    let instructorIds: string[] = [];

    // Get instructor IDs to check
    if (instructorId) {
      // Single instructor
      instructorIds = [instructorId];
    } else {
      // Get all active instructors
      const { data: instructors, error: instructorError } = await rds
        .from('identities')
        .select('id')
        .eq('role', 'instructor')
        .eq('status', 'active');

      if (instructorError) {
        console.error('Error fetching instructors:', instructorError);
        return NextResponse.json(
          { error: 'Failed to fetch instructor list' } as ApiResponse,
          { status: 500 }
        );
      }

      instructorIds = instructors?.map((i: any) => i.id) || [];
    }

    if (instructorIds.length === 0) {
      return NextResponse.json(
        { 
          data: [],
          message: 'No active instructors found' 
        } as ApiResponse
      );
    }

    // Get availability for each instructor
    const availabilityPromises = instructorIds.map(id =>
      getInstructorAvailability(rds, id, date, durationMinutes, appointmentTypeId || undefined)
    );

    const availabilityResults = await Promise.allSettled(availabilityPromises);

    // Filter successful results
    const availabilityData: AvailabilityResponse[] = [];
    
    availabilityResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        availabilityData.push(result.value);
      } else {
        console.warn(`Failed to get availability for instructor ${instructorIds[index]}:`, 
          result.status === 'rejected' ? result.reason : 'No data returned'
        );
      }
    });

    // Sort by instructor name for consistent ordering
    availabilityData.sort((a, b) => a.instructor_name.localeCompare(b.instructor_name));

    const response = {
      data: availabilityData,
      meta: {
        total: availabilityData.length,
        date: date,
        duration_minutes: durationMinutes
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in availability GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Get availability for a specific instructor on a specific date
 */
async function getInstructorAvailability(
  rds: any,
  instructorId: string,
  date: string,
  durationMinutes: number,
  appointmentTypeId?: string
): Promise<AvailabilityResponse | null> {
  try {
    // Get instructor details
    const { data: instructor, error: instructorError } = await rds
      .from('profiles')
      .select('full_name')
      .eq('id', instructorId)
      .single();

    if (instructorError || !instructor) {
      throw new Error('Instructor not found');
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeekNumber = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dayOfWeekNumber];

    // Get instructor availability for this day
    const { data: availabilityRules, error: availError } = await rds
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (availError) {
      throw new Error('Error fetching availability rules');
    }

    if (!availabilityRules || availabilityRules.length === 0) {
      return {
        date,
        instructor_id: instructorId,
        instructor_name: instructor.full_name,
        slots: [],
        total_available: 0,
        working_hours: { start: '09:00', end: '17:00' }
      };
    }

    // Get existing appointments for this instructor on this date
    const { data: existingAppointments, error: appointmentError } = await rds
      .from('appointments')
      .select('start_time, end_time')
      .eq('instructor_id', instructorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);

    if (appointmentError) {
      throw new Error('Error fetching existing appointments');
    }

    // Get blocked time periods
    const { data: timeBlocks, error: blockError } = await rds
      .from('time_blocks')
      .select('start_time, end_time, block_reason')
      .eq('instructor_id', instructorId)
      .eq('block_date', date)
      .eq('is_blocked', true);

    if (blockError) {
      throw new Error('Error fetching time blocks');
    }

    // Filter appointment types if specified
    let appointmentTypes = null;
    if (appointmentTypeId) {
      const { data: typeData, error: typeError } = await rds
        .from('appointment_types')
        .select('duration_minutes')
        .eq('id', appointmentTypeId)
        .eq('instructor_id', instructorId)
        .eq('is_active', true)
        .single();

      if (typeError || !typeData) {
        throw new Error('Appointment type not found');
      }

      appointmentTypes = typeData;
      durationMinutes = typeData.duration_minutes; // Override duration with type duration
    }

    // Generate time slots
    const slots: TimeSlot[] = [];
    const blockedPeriods: { start_time: string; end_time: string; reason?: string }[] = 
      timeBlocks?.map((block: any) => ({
        start_time: block.start_time,
        end_time: block.end_time,
        reason: block.block_reason
      })) || [];

    let earliestStart = '23:59';
    let latestEnd = '00:00';

    // Process each availability rule
    for (const rule of availabilityRules) {
      if (rule.start_time < earliestStart) earliestStart = rule.start_time;
      if (rule.end_time > latestEnd) latestEnd = rule.end_time;

      const ruleSlots = generateTimeSlots(
        rule.start_time,
        rule.end_time,
        durationMinutes,
        rule.buffer_time_minutes,
        existingAppointments || [],
        timeBlocks || []
      );

      slots.push(...ruleSlots);
    }

    // Sort slots by time
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    // Remove duplicates (can happen if multiple availability rules overlap)
    const uniqueSlots: TimeSlot[] = [];
    const seenSlots = new Set<string>();

    for (const slot of slots) {
      const slotKey = `${slot.start_time}-${slot.end_time}`;
      if (!seenSlots.has(slotKey)) {
        seenSlots.add(slotKey);
        uniqueSlots.push(slot);
      }
    }

    const availableCount = uniqueSlots.filter(slot => slot.available).length;

    return {
      date,
      instructor_id: instructorId,
      instructor_name: instructor.full_name,
      slots: uniqueSlots,
      total_available: availableCount,
      working_hours: {
        start: earliestStart,
        end: latestEnd
      },
      blocked_periods: blockedPeriods.length > 0 ? blockedPeriods : undefined
    };

  } catch (error) {
    console.error(`Error getting availability for instructor ${instructorId}:`, error);
    return null;
  }
}

/**
 * Generate time slots for a given time range
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bufferMinutes: number,
  existingAppointments: any[],
  timeBlocks: any[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Convert times to minutes from midnight for easier calculation
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  let currentMinutes = startMinutes;
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);
    
    // Check if slot conflicts with existing appointments
    const hasAppointmentConflict = existingAppointments.some(appointment => {
      const apptStart = timeToMinutes(appointment.start_time);
      const apptEnd = timeToMinutes(appointment.end_time);
      
      return (currentMinutes < apptEnd && currentMinutes + durationMinutes > apptStart);
    });
    
    // Check if slot conflicts with blocked time
    const hasBlockConflict = timeBlocks.some(block => {
      const blockStart = timeToMinutes(block.start_time);
      const blockEnd = timeToMinutes(block.end_time);
      
      return (currentMinutes < blockEnd && currentMinutes + durationMinutes > blockStart);
    });
    
    // Find booking ID if slot is taken
    const conflictingAppointment = existingAppointments.find(appointment => {
      const apptStart = timeToMinutes(appointment.start_time);
      const apptEnd = timeToMinutes(appointment.end_time);
      
      return (currentMinutes < apptEnd && currentMinutes + durationMinutes > apptStart);
    });
    
    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      available: !hasAppointmentConflict && !hasBlockConflict,
      booking_id: conflictingAppointment?.id,
      buffer_before: bufferMinutes,
      buffer_after: bufferMinutes
    });
    
    // Move to next slot (including buffer time)
    currentMinutes += durationMinutes + bufferMinutes;
  }
  
  return slots;
}

/**
 * Convert time string (HH:mm) to minutes from midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export const GET = withPublicSecurity(getHandler);