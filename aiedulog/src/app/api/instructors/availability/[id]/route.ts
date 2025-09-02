import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withUserSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext, SecurityRole } from '@/lib/security/core-security';
import {
  InstructorAvailability,
  ApiResponse
} from '@/types/appointment-system';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/instructors/availability/[id] - Get specific availability rule
 * Security: User can view their own rules, admins can view all
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const supabase = await createClient();
    
    const { data: availability, error } = await supabase
      .from('instructor_availability')
      .select(`
        *,
        instructor:identities!instructor_availability_instructor_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !availability) {
      return NextResponse.json(
        { error: 'Availability rule not found' } as ApiResponse,
        { status: 404 }
      );
    }
    
    // Access control
    if (context.userRole !== SecurityRole.ADMIN && 
        context.userRole !== SecurityRole.SUPER_ADMIN && 
        availability.instructor_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }
    
    const response: ApiResponse<InstructorAvailability> = {
      data: availability
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
 * PUT /api/instructors/availability/[id] - Update availability rule
 * Security: User can update their own rules, admins can update all
 */
const putHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const body = await request.json();
    const supabase = await createClient();
    
    // Get existing availability rule
    const { data: existingRule, error: fetchError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingRule) {
      return NextResponse.json(
        { error: 'Availability rule not found' } as ApiResponse,
        { status: 404 }
      );
    }
    
    // Access control
    if (context.userRole !== SecurityRole.ADMIN && 
        context.userRole !== SecurityRole.SUPER_ADMIN && 
        existingRule.instructor_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }
    
    // Validate time fields if provided
    if (body.start_time && !isValidTimeFormat(body.start_time)) {
      return NextResponse.json(
        { error: 'Invalid start_time format. Use HH:mm' } as ApiResponse,
        { status: 400 }
      );
    }
    
    if (body.end_time && !isValidTimeFormat(body.end_time)) {
      return NextResponse.json(
        { error: 'Invalid end_time format. Use HH:mm' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate time logic if both times are provided
    const newStartTime = body.start_time || existingRule.start_time;
    const newEndTime = body.end_time || existingRule.end_time;
    
    if (newStartTime >= newEndTime) {
      return NextResponse.json(
        { error: 'start_time must be before end_time' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate day_of_week if provided
    if (body.day_of_week !== undefined && (body.day_of_week < 0 || body.day_of_week > 6)) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Check for conflicts if day or times are being changed
    if (body.day_of_week !== undefined || body.start_time || body.end_time) {
      const checkDay = body.day_of_week !== undefined ? body.day_of_week : existingRule.day_of_week;
      
      const { data: conflictRules, error: conflictError } = await supabase
        .from('instructor_availability')
        .select('id, start_time, end_time')
        .eq('instructor_id', existingRule.instructor_id)
        .eq('day_of_week', checkDay)
        .eq('is_available', true)
        .neq('id', id); // Exclude current rule
      
      if (conflictError) {
        console.error('Error checking for conflicts:', conflictError);
        return NextResponse.json(
          { error: 'Failed to validate availability rule' } as ApiResponse,
          { status: 500 }
        );
      }
      
      // Check for time overlaps
      if (conflictRules) {
        const hasOverlap = conflictRules.some(rule => 
          (newStartTime < rule.end_time && newEndTime > rule.start_time)
        );
        
        if (hasOverlap) {
          return NextResponse.json(
            { error: 'Updated availability rule would overlap with existing rule' } as ApiResponse,
            { status: 409 }
          );
        }
      }
    }
    
    // Prepare update data
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };
    
    // Remove fields that shouldn't be updated
    delete updateData.instructor_id; // Prevent changing instructor
    delete updateData.id;
    delete updateData.created_at;
    
    // Update availability rule
    const { data: updatedRule, error: updateError } = await supabase
      .from('instructor_availability')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        instructor:identities!instructor_availability_instructor_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .single();
    
    if (updateError) {
      console.error('Error updating availability rule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update availability rule' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<InstructorAvailability> = {
      data: updatedRule,
      message: 'Availability rule updated successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in availability PUT handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/instructors/availability/[id] - Delete availability rule
 * Security: User can delete their own rules, admins can delete all
 */
const deleteHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { id } = params;
    const supabase = await createClient();
    
    // Get existing availability rule
    const { data: existingRule, error: fetchError } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingRule) {
      return NextResponse.json(
        { error: 'Availability rule not found' } as ApiResponse,
        { status: 404 }
      );
    }
    
    // Access control
    if (context.userRole !== SecurityRole.ADMIN && 
        context.userRole !== SecurityRole.SUPER_ADMIN && 
        existingRule.instructor_id !== context.userId) {
      return NextResponse.json(
        { error: 'Access denied' } as ApiResponse,
        { status: 403 }
      );
    }
    
    // Check if there are future appointments that depend on this availability
    const { data: futureAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time')
      .eq('instructor_id', existingRule.instructor_id)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed']);
    
    if (appointmentError) {
      console.error('Error checking future appointments:', appointmentError);
      return NextResponse.json(
        { error: 'Failed to validate deletion' } as ApiResponse,
        { status: 500 }
      );
    }
    
    // Check if any future appointments fall within this availability rule's time range
    if (futureAppointments && futureAppointments.length > 0) {
      const dayOfWeek = existingRule.day_of_week;
      
      const affectedAppointments = futureAppointments.filter(appointment => {
        const appointmentDay = new Date(appointment.appointment_date).getDay();
        return appointmentDay === dayOfWeek &&
               appointment.start_time >= existingRule.start_time &&
               appointment.start_time < existingRule.end_time;
      });
      
      if (affectedAppointments.length > 0) {
        return NextResponse.json(
          { 
            error: 'Cannot delete availability rule with future appointments',
            message: `${affectedAppointments.length} future appointment(s) depend on this availability rule`
          } as ApiResponse,
          { status: 409 }
        );
      }
    }
    
    // Delete the availability rule
    const { error: deleteError } = await supabase
      .from('instructor_availability')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting availability rule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete availability rule' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse = {
      message: 'Availability rule deleted successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in availability DELETE handler:', error);
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
export const PUT = withUserSecurity(putHandler);
export const DELETE = withUserSecurity(deleteHandler);