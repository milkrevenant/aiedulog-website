import { NextRequest, NextResponse } from 'next/server';
import { createRDSClient } from '@/lib/db/rds-client';
import { withPublicSecurity } from '@/lib/security/api-wrapper';
import { SecurityContext } from '@/lib/security/core-security';
import { SecureTokenGenerator } from '@/lib/security/secure-token-generator';
import {
  BookingSession,
  CreateBookingSessionRequest,
  UpdateBookingSessionRequest,
  BookingStepType,
  ApiResponse
} from '@/types/appointment-system';

/**
 * POST /api/booking/sessions - Create new booking session
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * Security: Public access to support anonymous bookings
 */
const postHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const body: CreateBookingSessionRequest = await request.json();
    const rds = createRDSClient();
    
    // 🔒 SECURITY FIX: Generate cryptographically secure session token
    // BEFORE (VULNERABLE): Math.random() + timestamp - predictable and weak
    // AFTER (SECURE): crypto.randomBytes with 256+ bits entropy
    const sessionToken = SecureTokenGenerator.generateBookingToken();
    
    // Calculate expiration (2 hours from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    // Create initial session data
    const sessionData = {
      instructor_id: body.instructor_id,
      appointment_type_id: body.appointment_type_id,
      completed_steps: []
    };
    
    // Create booking session
    const { data: sessions, error: createError } = await rds
      .from('booking_sessions')
      .insert({
        user_id: context.userId || null, // null for anonymous users
        session_token: sessionToken,
        current_step: body.initial_step || BookingStepType.INSTRUCTOR_SELECTION,
        data: sessionData,
        expires_at: expiresAt.toISOString()
      }, {
        select: '*'
      });

    const session = sessions?.[0] || null;
    
    if (createError) {
      console.error('Error creating booking session:', createError);
      return NextResponse.json(
        { error: 'Failed to create booking session' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<BookingSession> = {
      data: session,
      message: 'Booking session created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('Error in booking sessions POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

/**
 * GET /api/booking/sessions - Get active booking sessions for user
 * Security: Public access with session token validation
 * 
 * Query Parameters:
 * - session_token: string (required for anonymous users)
 */
const getHandler = async (
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');
    const rds = createRDSClient();
    
    let query = rds
      .from('booking_sessions')
      .select('*')
      .gt('expires_at', new Date().toISOString()); // Only non-expired sessions
    
    if (context.userId) {
      // Authenticated user - get their sessions
      query = query.eq('user_id', context.userId);
    } else {
      // Anonymous user - require session token with security validation
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Session token is required for anonymous access' } as ApiResponse,
          { status: 400 }
        );
      }

      // 🔒 SECURITY: Validate token format and detect tampering
      const tokenValidation = SecureTokenGenerator.validateTokenFormat(
        sessionToken, 
        'booking_', // Expected prefix
        2 // 2 hours max age
      );

      if (!tokenValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid session token format' } as ApiResponse,
          { status: 401 }
        );
      }

      if (tokenValidation.expired) {
        return NextResponse.json(
          { error: 'Session token has expired' } as ApiResponse,
          { status: 401 }
        );
      }

      query = query.eq('session_token', sessionToken).is('user_id', null);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('Error fetching booking sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch booking sessions' } as ApiResponse,
        { status: 500 }
      );
    }
    
    const response: ApiResponse<BookingSession[]> = {
      data: sessions || []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in booking sessions GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
};

// 🔒 SECURITY: Vulnerable function replaced with SecureTokenGenerator
// The old generateSessionToken() function has been removed and replaced with
// SecureTokenGenerator.generateBookingToken() which provides:
// - Cryptographically secure random generation
// - High entropy (256+ bits)
// - Unpredictable tokens that cannot be guessed
// - Protection against timing attacks
// - Proper token validation and expiry checking

export const GET = withPublicSecurity(getHandler);
export const POST = withPublicSecurity(postHandler);