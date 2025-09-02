import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import {
  BookingSession,
  UpdateBookingSessionRequest,
  BookingStepType,
  ApiResponse,
  AppointmentStatus,
  NotificationType
} from '@/types/appointment-system';

interface RouteParams {
  params: {
    sessionId: string;
  };
}

/**
 * GET /api/booking/sessions/[sessionId] - Get specific booking session
 * Security: Public access with session ownership validation
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');
    const supabase = await createClient();
    
    // Build session query
    let query = supabase
      .from('booking_sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString());
    
    // Apply access control
    if (context.userId) {
      // Authenticated user
      query = query.eq('user_id', context.userId);
    } else {
      // Anonymous user - require session token
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Session token is required for anonymous access' } as ApiResponse,
          { status: 400 }
        );
      }
      query = query.eq('session_token', sessionToken).is('user_id', null);
    }
    
    const { data: session, error } = await query.single();
    
    if (error || !session) {
      return NextResponse.json(
        { error: 'Booking session not found or expired' } as ApiResponse,
        { status: 404 }
      );
    }
    
    const response: ApiResponse<BookingSession> = {
      data: session
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in booking session GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * PUT /api/booking/sessions/[sessionId] - Update booking session
 * Security: Public access with session ownership validation
 */
const putHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { sessionId } = params;
    const body: UpdateBookingSessionRequest = await request.json();
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');
    const supabase = await createClient();
    
    // Get existing session
    let sessionQuery = supabase
      .from('booking_sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString());
    
    // Apply access control
    if (context.userId) {
      sessionQuery = sessionQuery.eq('user_id', context.userId);
    } else {
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Session token is required for anonymous access' } as ApiResponse,
          { status: 400 }
        );
      }
      sessionQuery = sessionQuery.eq('session_token', sessionToken).is('user_id', null);
    }
    
    const { data: existingSession, error: fetchError } = await sessionQuery.single();
    
    if (fetchError || !existingSession) {
      return NextResponse.json(
        { error: 'Booking session not found or expired' } as ApiResponse,
        { status: 404 }
      );
    }
    
    // Merge session data
    const updatedData = {
      ...existingSession.data,
      ...body.data
    };
    
    // Update completed steps if requested
    let completedSteps = existingSession.data.completed_steps || [];
    if (body.complete_step && !completedSteps.includes(body.step)) {
      completedSteps.push(body.step);
      updatedData.completed_steps = completedSteps;
    }
    
    // Prepare update payload
    const updatePayload: any = {
      data: updatedData,
      updated_at: new Date().toISOString()
    };
    
    // Update current step if provided
    if (body.step) {
      updatePayload.current_step = body.step;
    }
    
    // Extend expiration when session is updated
    updatePayload.expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('booking_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating booking session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking session' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<BookingSession> = {
      data: updatedSession,
      message: 'Booking session updated successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in booking session PUT handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/booking/sessions/[sessionId] - Cancel/delete booking session
 * Security: Public access with session ownership validation
 */
const deleteHandler = async (
  request: NextRequest,
  context: SecurityContext,
  { params }: RouteParams
): Promise<NextResponse> => {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');
    const supabase = await createClient();
    
    // Build delete query
    let query = supabase
      .from('booking_sessions')
      .delete()
      .eq('id', sessionId);
    
    // Apply access control
    if (context.userId) {
      query = query.eq('user_id', context.userId);
    } else {
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Session token is required for anonymous access' } as ApiResponse,
          { status: 400 }
        );
      }
      query = query.eq('session_token', sessionToken).is('user_id', null);
    }
    
    const { error: deleteError } = await query;
    
    if (deleteError) {
      console.error('Error deleting booking session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete booking session' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse = {
      message: 'Booking session deleted successfully'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in booking session DELETE handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

export const GET = withPublicSecurity(getHandler);
export const PUT = withPublicSecurity(putHandler);
export const DELETE = withPublicSecurity(deleteHandler);