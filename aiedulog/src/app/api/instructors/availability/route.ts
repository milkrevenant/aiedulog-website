import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withUserSecurity, withAdminSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext, SecurityRole } from '@/lib/security/core-security';
import {
  InstructorAvailability,
  CreateAvailabilityRequest,
  ApiResponse,
  PaginatedResponse
} from '@/types/appointment-system';

/**
 * GET /api/instructors/availability - Get instructor availability rules
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Security: User can view their own rules, admins can view all
 * 
 * Query Parameters:
 * - instructor_id: string (optional) - Filter by instructor (admins only)
 * - day_of_week: number (optional) - Filter by day (0=Sunday, 6=Saturday)
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const rds = createRDSClient();
    
    const instructorId = searchParams.get('instructor_id');
    const dayOfWeek = searchParams.get('day_of_week');
    
    // Build query
    let query = rds
      .from('instructor_availability')
      .select(`
        *,
        instructor:identities!instructor_availability_instructor_id_fkey(
          id,
          full_name,
          email
        )
      `);
    
    // Apply access control
    if (context.userRole === SecurityRole.ADMIN || context.userRole === SecurityRole.SUPER_ADMIN) {
      // Admins can view all instructors
      if (instructorId) {
        query = query.eq('instructor_id', instructorId);
      }
    } else {
      // Users can only view their own availability
      query = query.eq('instructor_id', context.userId!);
    }
    
    // Apply filters
    if (dayOfWeek !== null) {
      const day = parseInt(dayOfWeek);
      if (!isNaN(day) && day >= 0 && day <= 6) {
        query = query.eq('day_of_week', day);
      }
    }
    
    // Order by day of week and start time
    query = query.order('day_of_week').order('start_time');
    
    const { data: availability, error } = await query;
    
    if (error) {
      console.error('Error fetching instructor availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch availability' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<InstructorAvailability[]> = {
      data: availability || []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in instructor availability GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * POST /api/instructors/availability - Create new availability rule
 * Security: User can create their own rules, admins can create for any instructor
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const body: CreateAvailabilityRequest = await request.json();
    const rds = createRDSClient();
    
    // Validate required fields
    if (!body.instructor_id || body.day_of_week === undefined || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: instructor_id, day_of_week, start_time, end_time' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate day_of_week range
    if (body.day_of_week < 0 || body.day_of_week > 6) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate time format and logic
    if (!isValidTimeFormat(body.start_time) || !isValidTimeFormat(body.end_time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:mm (24-hour format)' } as ApiResponse,
        { status: 400 }
      );
    }
    
    if (body.start_time >= body.end_time) {
      return NextResponse.json(
        { error: 'start_time must be before end_time' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Access control: users can only create their own availability
    if (context.userRole !== SecurityRole.ADMIN && 
        context.userRole !== SecurityRole.SUPER_ADMIN && 
        body.instructor_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied: Can only manage your own availability' } as ApiResponse,
        { status: 403 }
      );
    }
    
    // Verify instructor exists and is active
    const { data: instructor, error: instructorError } = await rds
      .from('identities')
      .select('id, role, status')
      .eq('id', body.instructor_id)
      .single();
    
    if (instructorError || !instructor) {
      return NextResponse.json(
        { error: 'Instructor not found' } as ApiResponse,
        { status: 404 }
      );
    }
    
    if (instructor.role !== 'instructor' && instructor.role !== 'admin') {
      return NextResponse.json(
        { error: 'User is not an instructor' } as ApiResponse,
        { status: 400 }
      );
    }
    
    if (instructor.status !== 'active') {
      return NextResponse.json(
        { error: 'Instructor account is not active' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Check for conflicting availability rules
    const { data: existingRules, error: conflictError } = await rds
      .from('instructor_availability')
      .select('id, start_time, end_time')
      .eq('instructor_id', body.instructor_id)
      .eq('day_of_week', body.day_of_week)
      .eq('is_available', true);
    
    if (conflictError) {
      console.error('Error checking for conflicts:', conflictError);
      return NextResponse.json(
        { error: 'Failed to validate availability rule' } as ApiResponse,
        { status: 500 }
      );
    }
    
    // Check for time overlaps
    if (existingRules) {
      const hasOverlap = existingRules.some((rule: any) =>
        (body.start_time < rule.end_time && body.end_time > rule.start_time)
      );
      
      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Availability rule overlaps with existing rule' } as ApiResponse,
          { status: 409 }
        );
      }
    }
    
    // Create availability rule
    const availabilityData = {
      instructor_id: body.instructor_id,
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      is_available: true,
      buffer_time_minutes: body.buffer_time_minutes || 15,
      max_bookings_per_day: body.max_bookings_per_day || 8
    };
    
    const { data: newAvailabilities, error: createError } = await rds
      .from('instructor_availability')
      .insert([availabilityData], {
        select: `
          *,
          instructor:identities!instructor_availability_instructor_id_fkey(
            id,
            full_name,
            email
          )
        `
      });

    const newAvailability = newAvailabilities?.[0] || null;
    
    if (createError) {
      console.error('Error creating availability rule:', createError);
      return NextResponse.json(
        { error: 'Failed to create availability rule' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<InstructorAvailability> = {
      data: newAvailability,
      message: 'Availability rule created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('Error in instructor availability POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * Helper function to validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export const GET = withUserSecurity(getHandler);
export const POST = withUserSecurity(postHandler);