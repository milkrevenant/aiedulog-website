import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withPublicSecurity, withUserSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext, SecurityRole } from '@/lib/security/core-security';
import {
  AppointmentType,
  ApiResponse,
  PaginatedResponse
} from '@/types/appointment-system';

/**
 * GET /api/appointment-types - Get available appointment types
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Security: Public access for viewing active types, user access for all types
 * 
 * Query Parameters:
 * - instructor_id: string (optional) - Filter by instructor
 * - active_only: boolean (optional) - Show only active types (default: true for public, false for authenticated)
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const rds = createRDSClient();
    
    const instructorId = searchParams.get('instructor_id');
    const activeOnly = searchParams.get('active_only') === 'true' || 
                      (context.userRole === SecurityRole.ANONYMOUS && 
                       searchParams.get('active_only') !== 'false');
    
    // Build query
    let query = rds
      .from('appointment_types')
      .select(`
        *,
        instructor:profiles(
          id,
          full_name,
          email,
          avatar_url,
          bio
        )
      `);
    
    // Apply filters
    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    // Order by instructor name, then type name
    query = query.order('type_name');
    
    const { data: appointmentTypes, error } = await query;
    
    if (error) {
      console.error('Error fetching appointment types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointment types' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<AppointmentType[]> = {
      data: appointmentTypes || []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in appointment types GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * POST /api/appointment-types - Create new appointment type
 * Security: User can create types for themselves, admins can create for any instructor
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const body = await request.json();
    const rds = createRDSClient();
    
    // Validate required fields
    const requiredFields = ['instructor_id', 'type_name', 'duration_minutes'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate duration
    if (body.duration_minutes < 15 || body.duration_minutes > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 480 minutes' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate price if provided
    if (body.price && (body.price < 0 || body.price > 1000000)) {
      return NextResponse.json(
        { error: 'Price must be between 0 and 1,000,000' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate color hex if provided
    if (body.color_hex && !/^#[0-9A-F]{6}$/i.test(body.color_hex)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex code (e.g., #FF0000)' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Access control: users can only create types for themselves
    if (context.userRole !== SecurityRole.ADMIN && 
        context.userRole !== SecurityRole.SUPER_ADMIN && 
        body.instructor_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied: Can only create appointment types for yourself' } as ApiResponse,
        { status: 403 }
      );
    }
    
    // Verify instructor exists and is active
    const { data: instructor, error: instructorError } = await rds
      .from('user_profiles')
      .select('user_id, role, is_active')
      .eq('user_id', body.instructor_id)
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
    
    if (instructor.is_active !== true) {
      return NextResponse.json(
        { error: 'Instructor account is not active' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Check for duplicate type names for this instructor
    const { data: existingType, error: duplicateError } = await rds
      .from('appointment_types')
      .select('id')
      .eq('instructor_id', body.instructor_id)
      .eq('type_name', body.type_name)
      .single();
    
    if (duplicateError && duplicateError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for duplicate types:', duplicateError);
      return NextResponse.json(
        { error: 'Failed to validate appointment type' } as ApiResponse,
        { status: 500 }
      );
    }
    
    if (existingType) {
      return NextResponse.json(
        { error: 'Appointment type with this name already exists' } as ApiResponse,
        { status: 409 }
      );
    }
    
    // Create appointment type
    const typeData = {
      instructor_id: body.instructor_id,
      type_name: body.type_name,
      description: body.description || null,
      duration_minutes: body.duration_minutes,
      price: body.price || 0,
      is_active: body.is_active !== undefined ? body.is_active : true,
      booking_advance_days: body.booking_advance_days || 30,
      cancellation_hours: body.cancellation_hours || 24,
      color_hex: body.color_hex || '#2E86AB'
    };
    
    const { data: newType, error: createError } = await rds
      .from('appointment_types')
      .insert([typeData], {
        select: `
          *,
          instructor:user_profiles!appointment_types_instructor_id_fkey(
            user_id,
            full_name,
            email,
            avatar_url,
            bio
          )
        `
      })
      .then(result => ({
        data: result.data?.[0] || null,
        error: result.error
      }));
    
    if (createError) {
      console.error('Error creating appointment type:', createError);
      return NextResponse.json(
        { error: 'Failed to create appointment type' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<AppointmentType> = {
      data: newType,
      message: 'Appointment type created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('Error in appointment types POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

export const GET = withPublicSecurity(getHandler);
export const POST = withUserSecurity(postHandler);
