import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  AvailabilityResponse,
  TimeSlot,
  ApiResponse
} from '@/types/appointment-system';

/**
 * GET /api/booking/availability - Public availability checking for booking flow
 * Security: Public access with aggressive rate limiting
 * 
 * This endpoint is optimized for the booking flow and provides
 * simplified availability data with better caching.
 * 
 * Query Parameters:
 * - instructor_id: string (required)
 * - date: string (required) - ISO date (YYYY-MM-DD)
 * - duration_minutes: number (optional, default: 60)
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Parse and validate query parameters
    const instructorId = searchParams.get('instructor_id');
    const date = searchParams.get('date');
    const durationMinutes = parseInt(searchParams.get('duration_minutes') || '60');

    if (!instructorId || !date) {
      return NextResponse.json(
        { error: 'instructor_id and date parameters are required' } as ApiResponse,
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

    // Validate duration
    if (durationMinutes < 15 || durationMinutes > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 480 minutes' } as ApiResponse,
        { status: 400 }
      );
    }

    // Verify instructor exists and is active
    const { data: instructor, error: instructorError } = await supabase
      .from('identities')
      .select('id, full_name, status, role')
      .eq('id', instructorId)
      .single();

    if (instructorError || !instructor) {
      return NextResponse.json(
        { error: 'Instructor not found' } as ApiResponse,
        { status: 404 }
      );
    }

    if (instructor.status !== 'active') {
      return NextResponse.json(
        { error: 'Instructor is not available' } as ApiResponse,
        { status: 404 }
      );
    }

    if (instructor.role !== 'instructor' && instructor.role !== 'admin') {
      return NextResponse.json(
        { error: 'User is not an instructor' } as ApiResponse,
        { status: 404 }
      );
    }

    // Get availability data
    const availability = await getSimplifiedAvailability(
      supabase, 
      instructorId, 
      date, 
      durationMinutes
    );

    if (!availability) {
      return NextResponse.json(
        { error: 'Failed to retrieve availability' } as ApiResponse,
        { status: 500 }
      );
    }

    // Add caching headers for better performance
    const response = NextResponse.json({
      data: availability
    } as ApiResponse<AvailabilityResponse>);

    // Cache for 5 minutes (300 seconds)
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    response.headers.set('ETag', `W/"${instructorId}-${date}-${durationMinutes}"`);

    return response;

  } catch (error) {
    console.error('Error in booking availability handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Get simplified availability for booking flow (optimized for performance)
 */
async function getSimplifiedAvailability(
  supabase: any,
  instructorId: string,
  date: string,
  durationMinutes: number
): Promise<AvailabilityResponse | null> {
  try {
    // Get instructor name
    const { data: instructor, error: instructorError } = await supabase
      .from('identities')
      .select('full_name')
      .eq('id', instructorId)
      .single();

    if (instructorError) {
      throw new Error('Instructor not found');
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = new Date(date).getDay();

    // Get all data in parallel for better performance
    const [availabilityResult, appointmentsResult, blocksResult] = await Promise.all([
      // Get availability rules
      supabase
        .from('instructor_availability')
        .select('start_time, end_time, buffer_time_minutes')
        .eq('instructor_id', instructorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true),
      
      // Get existing appointments
      supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('instructor_id', instructorId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed']),
      
      // Get blocked periods
      supabase
        .from('time_blocks')
        .select('start_time, end_time, block_reason')
        .eq('instructor_id', instructorId)
        .eq('block_date', date)
        .eq('is_blocked', true)
    ]);

    // Check for errors
    if (availabilityResult.error) {
      throw new Error('Error fetching availability rules');
    }
    if (appointmentsResult.error) {
      throw new Error('Error fetching appointments');
    }
    if (blocksResult.error) {
      throw new Error('Error fetching blocked periods');
    }

    const availabilityRules = availabilityResult.data || [];
    const existingAppointments = appointmentsResult.data || [];
    const timeBlocks = blocksResult.data || [];

    // If no availability rules, instructor is not available this day
    if (availabilityRules.length === 0) {
      return {
        date,
        instructor_id: instructorId,
        instructor_name: instructor.full_name,
        slots: [],
        total_available: 0,
        working_hours: { start: '09:00', end: '17:00' }
      };
    }

    // Generate time slots for all availability periods
    const allSlots: TimeSlot[] = [];
    let earliestStart = '23:59';
    let latestEnd = '00:00';

    for (const rule of availabilityRules) {
      if (rule.start_time < earliestStart) earliestStart = rule.start_time;
      if (rule.end_time > latestEnd) latestEnd = rule.end_time;

      const ruleSlots = generateOptimizedTimeSlots(
        rule.start_time,
        rule.end_time,
        durationMinutes,
        rule.buffer_time_minutes || 15,
        existingAppointments,
        timeBlocks
      );

      allSlots.push(...ruleSlots);
    }

    // Sort and deduplicate slots
    const uniqueSlots = deduplicateSlots(allSlots);
    const availableCount = uniqueSlots.filter(slot => slot.available).length;

    // Prepare blocked periods for response
    const blockedPeriods = timeBlocks.length > 0 ? 
      timeBlocks.map((block: any) => ({
        start_time: block.start_time,
        end_time: block.end_time,
        reason: block.block_reason
      })) : undefined;

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
      blocked_periods: blockedPeriods
    };

  } catch (error) {
    console.error(`Error getting availability for instructor ${instructorId}:`, error);
    return null;
  }
}

/**
 * Generate time slots (optimized version)
 */
function generateOptimizedTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bufferMinutes: number,
  existingAppointments: any[],
  timeBlocks: any[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  let currentMinutes = startMinutes;
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);
    
    // Check conflicts more efficiently
    const hasConflict = hasTimeConflict(
      currentMinutes,
      currentMinutes + durationMinutes,
      existingAppointments,
      timeBlocks
    );
    
    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      available: !hasConflict,
      buffer_before: bufferMinutes,
      buffer_after: bufferMinutes
    });
    
    currentMinutes += durationMinutes + bufferMinutes;
  }
  
  return slots;
}

/**
 * Check for time conflicts efficiently
 */
function hasTimeConflict(
  slotStartMinutes: number,
  slotEndMinutes: number,
  appointments: any[],
  blocks: any[]
): boolean {
  // Check appointment conflicts
  for (const appointment of appointments) {
    const apptStart = timeToMinutes(appointment.start_time);
    const apptEnd = timeToMinutes(appointment.end_time);
    
    if (slotStartMinutes < apptEnd && slotEndMinutes > apptStart) {
      return true;
    }
  }
  
  // Check block conflicts
  for (const block of blocks) {
    const blockStart = timeToMinutes(block.start_time);
    const blockEnd = timeToMinutes(block.end_time);
    
    if (slotStartMinutes < blockEnd && slotEndMinutes > blockStart) {
      return true;
    }
  }
  
  return false;
}

/**
 * Remove duplicate time slots
 */
function deduplicateSlots(slots: TimeSlot[]): TimeSlot[] {
  const uniqueSlots: TimeSlot[] = [];
  const seenSlots = new Set<string>();

  // Sort slots by start time first
  slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  for (const slot of slots) {
    const slotKey = `${slot.start_time}-${slot.end_time}`;
    if (!seenSlots.has(slotKey)) {
      seenSlots.add(slotKey);
      uniqueSlots.push(slot);
    }
  }

  return uniqueSlots;
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